// Local person matte for chroma zones ("IA rápida").
// MediaPipe Tasks Vision (Apache-2.0) runs offline from dist/assets/vendor/mediapipe; nothing is downloaded at runtime.
(function(){
  const base=new URL('vendor/mediapipe/',document.currentScript.src).href;
  const models={fast:'selfie_segmenter_landscape.tflite',detail:'selfie_multiclass_256x256.tflite'};
  const segmenters={},loading={},errors={},delegates={},listeners=new Set(),cache=new WeakMap();
  const work=document.createElement('canvas'),workContext=work.getContext('2d',{willReadFrequently:true});
  let scriptLoad=null;
  function notify(){for(const listener of listeners){try{listener(status());}catch{}}}
  function status(model){if(model)return segmenters[model]?'ready':loading[model]?'loading':errors[model]?'error':'idle';return Object.fromEntries(Object.keys(models).map(k=>[k,status(k)]));}
  function loadScript(src){return scriptLoad||=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>{scriptLoad=null;reject(Error('No se pudo cargar el motor de IA local'));};document.head.append(s);});}
  async function bytes(url){const r=await fetch(url);if(!r.ok)throw Error('No se pudo leer el modelo local de IA');return new Uint8Array(await r.arrayBuffer());}
  function ensure(model='fast'){
    if(!models[model])return Promise.reject(Error('Modelo de IA no válido'));
    if(segmenters[model])return Promise.resolve(segmenters[model]);
    if(loading[model])return loading[model];
    delete errors[model];
    loading[model]=(async()=>{
      if(!window.Vision)await loadScript(base+'vision_bundle.js');
      const fileset={wasmLoaderPath:base+'vision_wasm_internal.js',wasmBinaryPath:base+'vision_wasm_internal.wasm'};
      const buffer=await bytes(base+'models/'+models[model]),create=delegate=>window.Vision.ImageSegmenter.createFromOptions(fileset,{baseOptions:{modelAssetBuffer:buffer,delegate},runningMode:'IMAGE',outputCategoryMask:false,outputConfidenceMasks:true});
      // GPU first (integrated graphics are enough); CPU fallback keeps it working on any machine.
      let segmenter;if(window.LQTAC_AI_DELEGATE!=='CPU'){try{segmenter=await create('GPU');delegates[model]='GPU';}catch{}}
      if(!segmenter){segmenter=await create('CPU');delegates[model]='CPU';}
      segmenters[model]=segmenter;return segmenter;
    })().catch(error=>{errors[model]=error;throw error;}).finally(()=>{delete loading[model];notify();});
    notify();return loading[model];
  }
  function refreshViews(){try{if(typeof exporting!=='undefined'&&exporting)return;effectEditorSession?.render?.();if(typeof renderTimelineAt==='function'&&typeof timelineTime!=='undefined'&&!(typeof playing!=='undefined'&&playing))void renderTimelineAt(timelineTime);}catch{}}
  // Returns {data,width,height,key} with person confidence 0..255 (rows top to bottom), or null while the model is loading.
  function personMask(source,time=0,model='fast'){
    const segmenter=segmenters[model];
    if(!segmenter){if(!errors[model])ensure(model).then(refreshViews,()=>{});return null;}
    const w=source.videoWidth||source.width,h=source.videoHeight||source.height;if(!w||!h)return null;
    const isVideo=source instanceof HTMLVideoElement,key=isVideo?`${model}:${source.currentSrc}:${source.currentTime.toFixed(4)}:${w}x${h}`:null;
    const cached=cache.get(source);if(key&&cached?.key===key)return cached;
    const scale=Math.min(1,256/Math.max(w,h));work.width=Math.max(16,Math.round(w*scale));work.height=Math.max(16,Math.round(h*scale));
    workContext.clearRect(0,0,work.width,work.height);workContext.drawImage(source,0,0,work.width,work.height);
    const result=segmenter.segment(work);
    try{
      const masks=result.confidenceMasks||[];if(!masks.length)return null;
      const values=masks[0].getAsFloat32Array(),person=masks.length>1,data=new Uint8Array(values.length);
      // Multiclass model: index 0 is background; one-class selfie model: confidence of the person.
      for(let i=0;i<values.length;i++)data[i]=Math.max(0,Math.min(255,Math.round((person?1-values[i]:values[i])*255)));
      const entry={key,data,width:masks[0].width,height:masks[0].height,time};if(key)cache.set(source,entry);return entry;
    }finally{result.close();}
  }
  // ---- IA pro: masks precomputed by the optional module (one PNG per analysed frame).
  const proInfo=new Map(),proFrames=new Map(),proPending=new Map(),PRO_CACHE=240;
  const decodeCanvas=document.createElement('canvas'),decodeContext=decodeCanvas.getContext('2d',{willReadFrequently:true});
  function proFrameIndex(meta,time){return Math.max(0,Math.min(meta.frames-1,Math.round(time*meta.fps)));}
  async function info(id){if(!proInfo.has(id))proInfo.set(id,window.lqtacDesktop.aiProMaskInfo(id).catch(error=>{proInfo.delete(id);throw error;}));return proInfo.get(id);}
  function loadProFrame(meta,index){
    const key=meta.id+':'+index;if(proFrames.has(key))return Promise.resolve(proFrames.get(key));if(proPending.has(key))return proPending.get(key);
    const job=(async()=>{const i=await info(meta.id);if(!i.available)throw Error('Falta el análisis IA pro de este clip en este equipo. Vuelve a analizarlo.');
      const response=await fetch(i.url+String(index).padStart(5,'0')+'.png');if(!response.ok)throw Error('Falta una máscara del análisis IA pro');
      const bitmap=await createImageBitmap(await response.blob());decodeCanvas.width=bitmap.width;decodeCanvas.height=bitmap.height;decodeContext.drawImage(bitmap,0,0);bitmap.close?.();
      const rgba=decodeContext.getImageData(0,0,decodeCanvas.width,decodeCanvas.height).data,data=new Uint8Array(rgba.length/4);for(let p=0;p<data.length;p++)data[p]=rgba[p*4];
      const entry={data,width:decodeCanvas.width,height:decodeCanvas.height};proFrames.set(key,entry);if(proFrames.size>PRO_CACHE)proFrames.delete(proFrames.keys().next().value);return entry;
    })().finally(()=>proPending.delete(key));
    proPending.set(key,job);return job;
  }
  let proError='';
  function proMask(fx,time=0){
    const meta=fx?.chromaProMatte;if(!meta)return null;const index=proFrameIndex(meta,time),entry=proFrames.get(meta.id+':'+index);
    if(entry)return entry;loadProFrame(meta,index).then(()=>{proError='';refreshViews();},error=>{proError=error.message;notify();});
    // While loading, reuse the nearest frame already in memory to avoid flashing.
    for(let d=1;d<6;d++){const near=proFrames.get(meta.id+':'+(index-d))||proFrames.get(meta.id+':'+(index+d));if(near)return near;}
    return null;
  }
  // Export: make sure the exact mask of every active clip is loaded before capturing a frame.
  async function prepareFrame(projectTime){
    try{for(const clip of timelineClips()){if(clip.dataset.kind!=='video')continue;const fx=clipEffectsState(clip,'video');if(!fx?.enabled||!fx.chroma||fx.chromaZone!=='pro'||!fx.chromaProMatte)continue;const timing=clipTiming(clip),local=projectTime-timing.startSeconds;if(local<0||local>timing.durationSeconds)continue;await loadProFrame(fx.chromaProMatte,proFrameIndex(fx.chromaProMatte,local));}}
    catch(error){throw Error('IA pro: '+error.message);}
  }
  function usesPeople(fx){return !!(fx?.enabled&&fx.chroma&&fx.chromaZone==='people');}
  // Exports must wait for the model so the first frames are not keyed over the whole picture.
  async function prepareForProject(){
    const needed=new Set();
    try{for(const clip of timelineClips())if(clip.dataset.kind==='video'){const fx=clipEffectsState(clip,'video');if(usesPeople(fx))needed.add(fx.chromaMatteModel||'fast');}}catch{}
    for(const model of needed)await ensure(model);
    return [...needed];
  }
  window.LQTACAiMatte={models:Object.keys(models),delegate:model=>delegates[model]||null,status,ensure,personMask,proMask,prepareFrame,proError:()=>proError,clearProInfo:id=>proInfo.delete(id),prepareForProject,usesPeople,error:model=>errors[model]?.message||'',onChange(listener){listeners.add(listener);return ()=>listeners.delete(listener);}};
})();
