window.LQTACTimelineVisuals=(()=>{
  const style=document.createElement('style');style.textContent=`
    .clip.wave{background-image:none}
    .clip.media-visual{height:54px;top:4px;display:block;padding:1px 0;text-indent:15px;line-height:13px;white-space:nowrap;color:#eef6ff;background:#10223a;text-shadow:0 1px 2px #000}
    .clip.media-visual>*{text-indent:0}
    .clip.media-visual.video{background:#10223a}
    .clip.media-visual.audio,.clip.media-visual.wave{background:#102b3d}
    .clip-visual-canvas{position:absolute;top:14px;pointer-events:none;z-index:0}
    .clip-visual-status{position:absolute;right:4px;top:1px;max-width:75%;overflow:hidden;text-overflow:ellipsis;font-size:8px;line-height:12px;font-weight:400;background:#10223a;pointer-events:none;color:#acbfdc;z-index:1}
    .clip[data-visual-state=error] .clip-visual-status{color:#ffcc91}
  `;document.head.append(style);
  const states=new WeakMap(),dataCache=new Map(),imageCache=new Map(),jobs=[];
  const requestPrefix=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  let visible=new Set(),workers=0,painting=0,timer=0,serial=0;
  const cancelled=()=>Object.assign(Error('Vista sustituida'),{obsolete:true});
  const current=(state,token)=>state.token===token&&state.clip.isConnected;
  function cancelState(state){if(state.requestId){void window.lqtacDesktop.cancelTimelineVisual(state.requestId).catch(()=>{});state.requestId=null;}}
  function remember(map,key,value,max){map.delete(key);map.set(key,value);while(map.size>max)map.delete(map.keys().next().value);return value;}
  function drain(){while(workers<2&&jobs.length){const job=jobs.shift();if(!current(job.state,job.token)){job.reject(cancelled());continue;}workers++;Promise.resolve().then(job.operation).then(job.resolve,job.reject).finally(()=>{workers--;drain();});}}
  function work(state,token,key,operation){if(dataCache.has(key))return Promise.resolve(remember(dataCache,key,dataCache.get(key),256));return new Promise((resolve,reject)=>{jobs.push({state,token,resolve,reject,operation:async()=>remember(dataCache,key,await operation(),256)});drain();});}
  function imageFor(url){if(imageCache.has(url))return Promise.resolve(remember(imageCache,url,imageCache.get(url),192));return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(remember(imageCache,url,img,192));img.onerror=()=>reject(Error('Miniatura no disponible'));img.src=url;});}
  function status(state,value,message=''){state.status=value;state.clip.dataset.visualState=value;state.label.textContent=message;state.label.hidden=!message;}
  function fitCanvas(state,left,width,height){
    let canvas=state.clip.querySelector('.clip-visual-canvas');if(!canvas){canvas=document.createElement('canvas');canvas.className='clip-visual-canvas';canvas.setAttribute('aria-hidden','true');state.clip.append(canvas);}
    const ratio=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.max(1,Math.ceil(width*ratio));canvas.height=Math.max(1,Math.ceil(height*ratio));canvas.style.cssText=`left:${left}px;width:${width}px;height:${height}px`;
    const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle='#061329';ctx.fillRect(0,0,width,height);state.canvas=canvas;return ctx;
  }
  function model(clip){return {filePath:clip.dataset.filePath,kind:clip.dataset.kind,durationSeconds:clipTiming(clip).durationSeconds,sourceOffsetSeconds:Number(clip.dataset.sourceOffsetSeconds)||0,playbackRate:Number(clip.dataset.playbackRate)||1,reverse:clip.dataset.reverse==='true'};}
  async function draw(state,geometry){
    const {clip}=state,m=model(clip),{left,width,fullWidth,height}=geometry;
    const key=JSON.stringify([m,Math.round(left*10),Math.round(width*10),Math.round(fullWidth*10),height]);
    if(state.key===key&&state.canvas?.isConnected&&['loading','ready'].includes(state.status))return;
    state.key=key;cancelState(state);state.wave=null;state.samples=[];const token=++state.token,ctx=fitCanvas(state,left,width,height);status(state,'loading',m.kind==='audio'?'Analizando audio…':'Cargando fotogramas…');painting++;
    try{
      if(m.kind==='audio'){
        const from=left/fullWidth*m.durationSeconds,to=Math.min(m.durationSeconds,(left+width)/fullWidth*m.durationSeconds),range=LQTACTimelineVisualModel.sourceWindow(m,from,to),bins=Math.max(1,Math.min(2048,Math.ceil(width)));
        if(range.end<=range.start)return;
        const options={filePath:m.filePath,start:range.start,end:range.end,bins},data=await work(state,token,'wave:'+JSON.stringify(options),async()=>{const id=requestPrefix+'-'+state.id+'-'+token;state.requestId=id;try{const result=await window.lqtacDesktop.timelineWaveform({...options,requestId:id});if(result.cancelled)throw cancelled();return result;}finally{if(state.requestId===id)state.requestId=null;}});if(!current(state,token))return;
        const music=clip.parentElement.dataset.role==='music';ctx.fillStyle=music?'#2a2738':'#0b3040';ctx.fillRect(0,0,width,height);ctx.strokeStyle='rgba(144,205,222,.2)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,height/2);ctx.lineTo(width,height/2);ctx.stroke();
        const amplitude=value=>Math.sign(value)*Math.sqrt(Math.min(1,Math.abs(value)));ctx.strokeStyle=music?'#ffcc80':'#79e5f5';ctx.lineWidth=Math.max(1,width/bins);ctx.beginPath();
        for(let i=0;i<bins;i++){const j=range.reverse?bins-1-i:i,x=(i+.5)/bins*width;if(Math.abs(data.min[j])+Math.abs(data.max[j])<.00001)continue;ctx.moveTo(x,height/2-amplitude(data.max[j])*height*.46);ctx.lineTo(x,height/2-amplitude(data.min[j])*height*.46);}ctx.stroke();
        state.wave={min:data.min,max:data.max,reverse:range.reverse,start:range.start,end:range.end};status(state,'ready',data.hasAudio?'':'Sin audio');
      }else{
        const cell=Math.max(48,Math.round(height*16/9)),first=Math.floor(left/cell),last=Math.ceil((left+width)/cell);state.samples=[];
        for(let i=first;i<last;i++){
          if(!current(state,token))throw cancelled();
          const sample=(Math.max(0,i*cell)+Math.min(fullWidth,(i+1)*cell))/2,local=sample/fullWidth*m.durationSeconds;
          const time=Number(LQTACTimelineVisualModel.sourceTime(m,local).toFixed(6)),options={filePath:m.filePath,time,before:m.reverse};
          const frame=await work(state,token,'frame:'+JSON.stringify(options),()=>window.lqtacDesktop.timelineFrame(options)),img=await imageFor(frame.dataUrl);if(!current(state,token))throw cancelled();
          const x=i*cell-left;ctx.drawImage(img,x,0,cell,height);ctx.fillStyle='rgba(145,185,240,.2)';ctx.fillRect(x,0,1,height);state.samples.push({time,x,width:cell});
        }
        status(state,'ready');
      }
    }catch(error){if(current(state,token)&&!error.obsolete)status(state,'error','No se pudo analizar');}
    finally{painting--;}
  }
  function scan(){
    clearTimeout(timer);timer=0;if(!window.lqtacDesktop?.timelineFrame)return;
    const body=document.querySelector('.timeline-body'),labels=document.querySelector('#trackLabels');if(!body||!labels)return;
    const view=body.getBoundingClientRect(),viewLeft=Math.max(view.left,labels.getBoundingClientRect().right),viewRight=view.left+body.clientWidth,next=new Set();
    for(const clip of timelineClips()){
      if(!clip.dataset.filePath||!['video','audio'].includes(clip.dataset.kind)){clip.classList.remove('media-visual');continue;}
      clip.classList.add('media-visual');const r=clip.getBoundingClientRect();
      if(r.width<1||r.right<=viewLeft||r.left>=viewRight||r.bottom<=view.top||r.top>=view.bottom)continue;
      let state=states.get(clip);if(!state){let label=clip.querySelector('.clip-visual-status');if(!label){label=document.createElement('span');label.className='clip-visual-status';clip.append(label);}state={clip,label,token:0,id:++serial};states.set(clip,state);}
      next.add(state);const css=getComputedStyle(clip),borderLeft=parseFloat(css.borderLeftWidth)||0,borderRight=parseFloat(css.borderRightWidth)||0,fullWidth=Math.max(1,r.width-borderLeft-borderRight),origin=r.left+borderLeft;
      const left=Math.max(0,viewLeft-origin),right=Math.min(fullWidth,viewRight-origin),height=Math.max(8,r.height-16);
      void draw(state,{left,width:Math.max(1,right-left),fullWidth,height});
    }
    for(const state of visible)if(!next.has(state)){cancelState(state);state.token++;state.key='';state.canvas?.remove();state.canvas=null;}
    visible=next;drain();
  }
  function refresh(){if(!timer)timer=setTimeout(scan,90);}
  const observer=new MutationObserver(records=>{if(records.some(r=>r.type==='attributes'?r.target.matches?.('.clip'):Array.from(r.addedNodes).concat(Array.from(r.removedNodes)).some(n=>n.nodeType===1&&(n.matches('.clip,.track')||n.querySelector?.('.clip')))))refresh();});
  const tracks=document.querySelector('#tracks');observer.observe(tracks,{subtree:true,childList:true,attributes:true,attributeFilter:['style','data-file-path','data-kind','data-start-seconds','data-duration-seconds','data-source-offset-seconds','data-playback-rate','data-reverse']});
  const resize=new ResizeObserver(refresh);resize.observe(tracks);resize.observe(document.querySelector('.timeline-body'));document.querySelector('.timeline-body').addEventListener('scroll',refresh,{passive:true});
  function invalidate(){dataCache.clear();imageCache.clear();for(const state of visible){cancelState(state);state.key='';state.token++;}refresh();}
  window.addEventListener('focus',invalidate);refresh();
  async function whenIdle(timeout=45000){const start=performance.now();let stable=0;while(performance.now()-start<timeout){await new Promise(r=>setTimeout(r,50));if(!timer&&!workers&&!jobs.length&&!painting){if(++stable>=2)return;}else stable=0;}throw Error('Las vistas del timeline no han terminado');}
  return {refresh,invalidate,whenIdle,state:clip=>states.get(clip)};
})();
