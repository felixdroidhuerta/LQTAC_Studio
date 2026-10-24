const LQTACScreenCapture={
  async prepare({source,systemAudio,microphone,microphoneId,height}){
    let display=null,mic=null,context=null;
    const dispose=async()=>{const cancel=window.lqtacDesktop.screenCaptureCancel().catch(()=>{});display?.getTracks().forEach(t=>{t.onended=null;t.stop();});mic?.getTracks().forEach(t=>{t.onended=null;t.stop();});if(context&&context.state!=='closed')await context.close().catch(()=>{});await cancel;};
    try{
      await window.lqtacDesktop.screenCaptureSelect(source,systemAudio);
      display=await navigator.mediaDevices.getDisplayMedia({video:{height:{ideal:height},frameRate:{ideal:30,max:30}},audio:systemAudio});
      if(systemAudio&&!display.getAudioTracks().length)throw Error('Windows no ha entregado audio del sistema. Desmarca esa opción para grabar sin él.');
      if(microphone)mic=await navigator.mediaDevices.getUserMedia({video:false,audio:{...(microphoneId==='default'?{}:{deviceId:{exact:microphoneId}}),echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
      const audios=[...display.getAudioTracks(),...(mic?.getAudioTracks()||[])];let stream;
      if(audios.length>1){context=new AudioContext({sampleRate:48000});const destination=context.createMediaStreamDestination();for(const track of audios){const gain=context.createGain();gain.gain.value=1/audios.length;context.createMediaStreamSource(new MediaStream([track])).connect(gain).connect(destination);}await context.resume();stream=new MediaStream([...display.getVideoTracks(),...destination.stream.getAudioTracks()]);}
      else stream=new MediaStream([...display.getVideoTracks(),...audios]);
      return {stream,dispose,sourceTracks:[...display.getTracks(),...(mic?.getTracks()||[])],audioLabel:systemAudio?(microphone?'sistema + micrófono':'audio del sistema'):(microphone?'micrófono':'sin audio')};
    }catch(e){await dispose();throw e;}
  }
};
function openScreenRecorder(){return openCameraRecorder('screen');}
const screenDock=document.createElement('button');screenDock.type='button';screenDock.className='dock-panel-item';screenDock.innerHTML='<span>▤</span><strong>Grabar pantalla</strong>';screenDock.onclick=()=>void openScreenRecorder();$('.dock-panel-list').append(screenDock);
fileMenu.insertAdjacentHTML('beforeend','<button type="button" data-file="screen">Grabar pantalla o ventana…</button>');fileMenu.addEventListener('click',event=>{if(event.target.closest('[data-file="screen"]'))void openScreenRecorder();});
