const LQTACScreenCapture={
  async prepare({source,systemAudio,microphone,microphoneId,height,cameraMode='none',cameraId='default',position='bottom-right',size=25}){
    let display=null,mic=null,camera=null,context=null,stream=null,cameraStream=null,timer=null;
    const videos=[],channels={};
    const state={microphoneMuted:false,systemMuted:false,cameraMuted:false,position,size};
    const dispose=async()=>{
      clearInterval(timer);const cancel=window.lqtacDesktop.screenCaptureCancel().catch(()=>{});
      for(const v of videos){v.pause();v.srcObject=null;}
      for(const s of [display,mic,camera,stream,cameraStream])s?.getTracks().forEach(t=>{t.onended=null;t.stop();});
      if(context&&context.state!=='closed')await context.close().catch(()=>{});await cancel;
    };
    async function videoFor(s){const v=document.createElement('video');v.muted=true;v.playsInline=true;v.srcObject=s;videos.push(v);await v.play();return v;}
    function canvasFor(width,height){const c=document.createElement('canvas');c.width=width;c.height=height;return c;}
    try{
      await window.lqtacDesktop.screenCaptureSelect(source,systemAudio);
      display=await navigator.mediaDevices.getDisplayMedia({video:{height:{ideal:height},frameRate:{ideal:30,max:30}},audio:systemAudio});
      if(systemAudio&&!display.getAudioTracks().length)throw Error('Windows no ha entregado audio del sistema. Desmarca esa opción para grabar sin él.');
      if(microphone)mic=await navigator.mediaDevices.getUserMedia({video:false,audio:{...(microphoneId==='default'?{}:{deviceId:{exact:microphoneId}}),echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
      if(cameraMode!=='none')camera=await navigator.mediaDevices.getUserMedia({video:{...(cameraId==='default'?{}:{deviceId:{exact:cameraId}}),width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:30}},audio:false});
      const audioInputs=[['system',display.getAudioTracks()],['microphone',mic?.getAudioTracks()||[]]].filter(([,tracks])=>tracks.length);
      let audioTracks=[];
      if(audioInputs.length){
        context=new AudioContext({sampleRate:48000});const destination=context.createMediaStreamDestination();
        for(const [id,tracks] of audioInputs){
          const input=context.createMediaStreamSource(new MediaStream(tracks)),gain=context.createGain(),analyser=context.createAnalyser();
          analyser.fftSize=256;gain.gain.value=1/audioInputs.length;input.connect(gain).connect(analyser).connect(destination);
          channels[id]={gain,analyser,samples:new Float32Array(analyser.fftSize),volume:1/audioInputs.length};
        }
        await context.resume();audioTracks=destination.stream.getAudioTracks();
      }
      const displayVideo=await videoFor(display),cameraVideo=camera?await videoFor(camera):null;
      const width=displayVideo.videoWidth,h=displayVideo.videoHeight;
      const snapshotCanvas=canvasFor(width,h),snapshotContext=snapshotCanvas.getContext('2d',{alpha:false});
      const cameraCanvas=cameraVideo?canvasFor(cameraVideo.videoWidth,cameraVideo.videoHeight):null;
      const cameraContext=cameraCanvas?.getContext('2d',{alpha:false});
      const thumbnail=cameraVideo?canvasFor(192,108):null;
      function draw(){
        if(displayVideo.readyState<2)return;
        snapshotContext.drawImage(displayVideo,0,0,width,h);
        if(cameraVideo&&cameraVideo.readyState>=2){
          cameraContext.fillStyle='#000';cameraContext.fillRect(0,0,cameraCanvas.width,cameraCanvas.height);
          if(!state.cameraMuted)cameraContext.drawImage(cameraVideo,0,0,cameraCanvas.width,cameraCanvas.height);
          if(cameraMode==='embedded'&&!state.cameraMuted){
            let w=width*state.size/100,hh=w*cameraCanvas.height/cameraCanvas.width;
            if(hh>h*.7){w*=h*.7/hh;hh=h*.7;}
            const margin=Math.max(8,Math.round(width*.012));
            const [vertical,horizontal]=state.position.split('-');
            const x=horizontal==='right'?width-w-margin:horizontal==='center'?(width-w)/2:margin;
            const y=vertical==='bottom'?h-hh-margin:vertical==='center'?(h-hh)/2:margin;
            snapshotContext.drawImage(cameraCanvas,x,y,w,hh);
          }
        }
      }
      draw();timer=setInterval(draw,1000/30);
      // The camera overlay is composed explicitly; the Toolbox is never a video layer.
      // Keep submitting frames even for a completely static source window.
      stream=new MediaStream([...snapshotCanvas.captureStream(30).getVideoTracks(),...audioTracks]);
      if(cameraMode==='separate')cameraStream=cameraCanvas.captureStream(30);
      return {
        stream,cameraStream,dispose,state,cameraMode,
        sourceTracks:[...display.getTracks(),...(mic?.getTracks()||[]),...(camera?.getTracks()||[])],
        audioLabel:systemAudio?(microphone?'sistema + micrófono':'audio del sistema'):(microphone?'micrófono':'sin audio'),
        setMuted(id,muted){if(!['microphone','system','camera'].includes(id))return;state[id+'Muted']=muted;if(id==='camera')camera?.getVideoTracks().forEach(t=>t.enabled=!muted);const channel=channels[id];if(channel)channel.gain.gain.setValueAtTime(muted?0:channel.volume,context.currentTime);draw();},
        setPosition(value){state.position=value;draw();},setSize(value){state.size=value;draw();},
        levels(){return Object.fromEntries(Object.entries(channels).map(([id,c])=>{c.analyser.getFloatTimeDomainData(c.samples);return [id,Math.min(1,Math.sqrt(c.samples.reduce((n,x)=>n+x*x,0)/c.samples.length)*4)];}));},
        cameraPreview(){if(!thumbnail||state.cameraMuted)return null;thumbnail.getContext('2d').drawImage(cameraVideo,0,0,192,108);return thumbnail.toDataURL('image/jpeg',.6);},
        snapshot(){draw();const scale=Math.min(1,3840/width,2160/h),c=document.createElement('canvas');c.width=Math.max(1,Math.round(width*scale));c.height=Math.max(1,Math.round(h*scale));c.getContext('2d').drawImage(snapshotCanvas,0,0,c.width,c.height);return c.toDataURL('image/png').split(',')[1];},
        microphoneAvailable:!!mic,systemAvailable:!!display.getAudioTracks().length,cameraAvailable:!!camera
      };
    }catch(e){await dispose();throw e;}
  }
};
function openScreenRecorder(){return openCameraRecorder('screen');}
const screenDock=document.createElement('button');screenDock.type='button';screenDock.className='dock-panel-item';screenDock.innerHTML='<span>▤</span><strong>Grabar pantalla</strong>';screenDock.onclick=()=>void openScreenRecorder();$('.dock-panel-list').append(screenDock);
fileMenu.insertAdjacentHTML('beforeend','<button type="button" data-file="screen">Grabar pantalla o ventana…</button>');fileMenu.addEventListener('click',event=>{if(event.target.closest('[data-file="screen"]'))void openScreenRecorder();});
