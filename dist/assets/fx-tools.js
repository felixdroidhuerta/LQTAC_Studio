// Analysis-based video tools: stabilization (cached vid.stab copy) and motion tracking (applied to effect positions,
// drawn masks or titles). Opened from the FX catalog cards; each change is one undo step.
window.LQTACFxTools=window.LQTACFxTools||{};
(()=>{
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const decimate=(list,max=900)=>{if(list.length<=max)return list;const step=Math.ceil(list.length/max);return list.filter((_,i)=>i%step===0||i===list.length-1);};
  function usable(clip,what){if(!clip?.isConnected||clip.dataset.kind!=='video'||!clip.dataset.filePath||clip.dataset.generator||LQTACStillImages.isClip(clip)){toast(what+' necesita un clip de vídeo (no títulos ni imágenes fijas).');return false;}if(exporting||historyBusy||document.querySelector('dialog[open]'))return false;return true;}
  function saveFx(clip,fx){LQTACEffects.validate(fx,'video');historyCheckpoint();clip.dataset.videoFx=JSON.stringify(fx);return renderTimelineAt(timelineTime);}
  const currentFx=clip=>structuredClone({...LQTACEffects.videoDefaults,...clipEffectsState(clip,'video')});
  // A clip frame source for dialogs: loads the playback media and seeks in clip-local seconds.
  function frameSource(clip){
    const video=document.createElement('video');video.muted=true;video.preload='auto';let closed=false;
    const ready=clipPlaybackPath(clip).then(mediaUrlForTimeline).then(url=>{video.src=url;video.load();return waitMedia(video,()=>video.readyState>=2);});
    return {video,ready,async seek(t){await ready;if(closed)return;const target=clamp(clipPlaybackOffset(clip)+t*Number(clip.dataset.playbackRate||1),0,video.duration-.001);if(Math.abs(video.currentTime-target)>1e-5){video.currentTime=target;await waitMedia(video,()=>video.readyState>=2&&!video.seeking);}},close(){closed=true;video.removeAttribute('src');video.load();}};
  }
  // Letterboxed frame rectangle inside a canvas (normalised frame coordinates <-> canvas pixels).
  function fit(video,W,H){const vw=video.videoWidth||16,vh=video.videoHeight||9,k=Math.min(W/vw,H/vh),w=vw*k,h=vh*k;return {x:(W-w)/2,y:(H-h)/2,w,h};}
  window.LQTACFxTools.frameSource=frameSource;window.LQTACFxTools.fit=fit;window.LQTACFxTools.decimate=decimate;window.LQTACFxTools.saveFx=saveFx;window.LQTACFxTools.currentFx=currentFx;

  // ---------- Stabilization ----------
  const stabCache=new Map();
  window.LQTACStabilize={
    path(clip){const st=clipEffectsState(clip,'video').stabilize,options={filePath:clip.dataset.filePath,smoothing:st.smoothing,crop:st.crop},key=JSON.stringify(options);
      if(!stabCache.has(key)){toast('Preparando la imagen estabilizada…');const task=window.lqtacDesktop.prepareStabilize(options);stabCache.set(key,task);task.catch(()=>stabCache.delete(key));}return stabCache.get(key);},
    active(clip){if(clip.dataset.kind!=='video'||!clip.dataset.filePath||clip.dataset.generator||clip.dataset.reverse==='true'||LQTACStillImages.isClip(clip))return false;try{const fx=clipEffectsState(clip,'video');return !!(fx.enabled&&fx.stabilize);}catch{return false;}}
  };
  window.LQTACFxTools.stabilize=clip=>{
    if(!usable(clip,'Estabilizar'))return;if(clip.dataset.reverse==='true'){toast('Restaura la dirección del clip antes de estabilizarlo.');return;}
    const fx=currentFx(clip),st=fx.stabilize||{smoothing:30,crop:'zoom'},dialog=document.createElement('dialog');dialog.className='work-dialog';dialog.id='stabilizeDialog';dialog.style.width='min(520px,92vw)';
    dialog.innerHTML=`<h2>Estabilizar imagen</h2><p>Analiza el movimiento de la cámara y lo suaviza. Se prepara una copia local estabilizada de todo el archivo; el original no cambia y los recortes del clip se conservan.</p>
      <label>Suavizado (fotogramas · más = más estable)<input id="stabSmoothing" type="number" min="1" max="100" step="1" value="${st.smoothing}"></label>
      <label>Bordes<select id="stabCrop"><option value="zoom" ${st.crop==='zoom'?'selected':''}>Ampliar para ocultar los bordes</option><option value="borders" ${st.crop==='borders'?'selected':''}>Mantener el encuadre (bordes negros)</option></select></label>
      <progress id="stabProgress" max="1" value="0" style="width:100%" hidden></progress><p id="stabStatus" role="status">${fx.stabilize?'Este clip ya está estabilizado.':''}</p>
      <footer><button type="button" id="stabRemove" ${fx.stabilize?'':'disabled'}>Quitar estabilización</button><button type="button" id="stabClose">Cerrar</button><button type="button" id="stabGo">Estabilizar</button></footer>`;
    document.body.append(dialog);const q=id=>dialog.querySelector('#'+id);let running=false;const unsubscribe=window.lqtacDesktop.onStabilizeProgress(p=>{q('stabProgress').value=p.fraction||0;if(p.stage)q('stabStatus').textContent=p.stage+'… '+Math.round((p.fraction||0)*100)+' %';});
    const close=()=>{if(running){void window.lqtacDesktop.cancelStabilize();return;}unsubscribe();dialog.close();dialog.remove();};
    q('stabClose').onclick=close;dialog.oncancel=e=>{e.preventDefault();close();};
    q('stabRemove').onclick=async()=>{const next=currentFx(clip);next.stabilize=null;await saveFx(clip,next);toast('Estabilización quitada');close();};
    q('stabGo').onclick=async()=>{const smoothing=Math.round(clamp(Number(q('stabSmoothing').value)||30,1,100)),crop=q('stabCrop').value;running=true;q('stabGo').disabled=true;q('stabRemove').disabled=true;q('stabClose').textContent='Cancelar';q('stabProgress').hidden=false;
      try{const file=await window.lqtacDesktop.prepareStabilize({filePath:clip.dataset.filePath,smoothing,crop});stabCache.set(JSON.stringify({filePath:clip.dataset.filePath,smoothing,crop}),Promise.resolve(file));const next=currentFx(clip);next.enabled=true;next.stabilize={smoothing,crop};running=false;await saveFx(clip,next);toast('Clip estabilizado · original intacto');close();}
      catch(error){running=false;q('stabStatus').textContent=error.message;q('stabGo').disabled=false;q('stabRemove').disabled=!currentFx(clip).stabilize;q('stabClose').textContent='Cerrar';}};
    dialog.showModal();
  };

  // ---------- Motion tracking ----------
  const effectTargets=[['flare','Destello de lente','flareX','flareY',1],['rays','Rayos de luz (origen)','raysX','raysY',1],['ripple','Ondas de agua (centro)','rippleX','rippleY',.6],['swirl','Remolino (centro)','swirlX','swirlY',.8]];
  // Track -> effect position curves (normalised 0–1, clip-local seconds). Before the first and after the last point the curve holds.
  function effectCurves(fx,points,duration,[key,,kx,ky,def]){const pts=decimate(points.filter(p=>p.time<=duration+1e-6));fx.enabled=true;if(!fx[key])fx[key]=def;fx.animation={...fx.animation,[kx]:pts.map(p=>({time:p.time,value:clamp(p.x,0,1)})),[ky]:pts.map(p=>({time:p.time,value:clamp(p.y,0,1)}))};return fx;}
  function applyToEffect(clip,points,target){return saveFx(clip,effectCurves(currentFx(clip),points,clipTiming(clip).durationSeconds,target));}
  // Track -> title composition keyframes: the title moves by the tracked displacement (1920×1080 composition).
  function titleKeys(clip,points,title){const g=JSON.parse(title.dataset.generator),ct=clipTiming(clip),tt=clipTiming(title),rate=Number(title.dataset.playbackRate||1),offset=Number(title.dataset.sourceOffsetSeconds)||0,flat={...g,keys:[]};
    const inside=points.map(p=>({p,local:ct.startSeconds+p.time-tt.startSeconds})).filter(x=>x.local>=0&&x.local<=tt.durationSeconds);if(inside.length<2)throw Error('El título no coincide en el tiempo con el tramo seguido');
    const p0=inside[0].p,keys=decimate(inside).map(({p,local})=>{const t=Math.min(g.duration,offset+local*rate),b=LQTACGenerators.state(flat,t);return {time:+t.toFixed(4),x:+(b.x+(p.x-p0.x)*1920).toFixed(2),y:+(b.y+(p.y-p0.y)*1080).toFixed(2),scale:b.scale,opacity:b.opacity};}).filter((k,i,a)=>i===0||k.time>a[i-1].time);
    return {...g,keys};}
  window.LQTACFxTools.titleKeys=titleKeys;window.LQTACFxTools.applyToEffect=applyToEffect;
  // Destination ids stored in fx.tracking.applied: 'fx:<effect>', 'mask', 'title:<start seconds>:<name>'.
  const overlaps=(a,b)=>{const x=clipTiming(a),y=clipTiming(b);return x.startSeconds<y.startSeconds+y.durationSeconds&&y.startSeconds<x.startSeconds+x.durationSeconds;};
  const titleId=t=>'title:'+clipTiming(t).startSeconds.toFixed(3)+':'+(t.firstChild?.textContent||'Título');
  function destinations(clip){const fx=currentFx(clip),titles=timelineClips().filter(c=>c.dataset.generator&&c.parentElement!==clip.parentElement&&c.dataset.reverse!=='true'&&overlaps(c,clip));
    return [...effectTargets.map(t=>({id:'fx:'+t[0],label:t[1],target:t})),...(fx.shapeMask?[{id:'mask',label:'Máscara dibujada del clip'}]:[]),...titles.map(t=>({id:titleId(t),label:'Título · '+(t.firstChild?.textContent||'Título'),title:t}))];}
  const labelOf=(clip,id)=>destinations(clip).find(d=>d.id===id)?.label||(id.startsWith('title:')?'Título · '+id.split(':').slice(2).join(':'):id);
  window.LQTACFxTools.tracking=clip=>{
    if(!usable(clip,'El seguimiento'))return;const duration=clipTiming(clip).durationSeconds,source=frameSource(clip),saved=currentFx(clip).tracking,dialog=document.createElement('dialog');dialog.className='work-dialog';dialog.id='trackingDialog';dialog.style.width='min(820px,95vw)';
    dialog.innerHTML=`<h2>Seguimiento de movimiento</h2>
      <canvas id="trkView" width="720" height="405" style="display:block;margin:0 auto;width:auto;height:auto;max-width:100%;max-height:42vh;background:#050e20;cursor:crosshair;touch-action:none"></canvas>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button type="button" id="trkPlay">▶ Reproducir tramo</button><input id="trkTime" type="range" min="0" max="${duration}" step="0.001" value="0" style="flex:1;min-width:200px"><span id="trkTimeLabel" style="min-width:130px"></span><span style="display:inline-flex;gap:6px;align-items:center"><input id="trkWithFx" type="checkbox" style="width:auto"> Ver con los efectos del clip</span></div>
      <ol class="trk-steps" style="display:grid;gap:10px;padding-left:22px;margin:12px 0">
        <li><strong>Tramo.</strong> <span style="display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap">Inicio <input id="trkStart" type="number" min="0" max="${duration}" step="0.01" style="width:90px"> s <button type="button" id="trkMarkStart">Marcar inicio aquí</button> · Fin <input id="trkEnd" type="number" min="0" max="${duration}" step="0.01" style="width:90px"> s <button type="button" id="trkMarkEnd">Marcar fin aquí</button></span> <span id="trkRangeState"></span></li>
        <li><strong>Zona.</strong> En el instante de inicio, arrastra un rectángulo sobre algo con detalle (un ojo, una esquina, un logotipo). <span id="trkBoxState"></span></li>
        <li><strong>Analizar.</strong> <button type="button" id="trkAnalyze" disabled>Analizar el tramo</button> <progress id="trkProgress" max="1" value="0" hidden></progress> <span id="trkAnalysisState"></span></li>
        <li><strong>Aplicar.</strong> <span style="display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap"><select id="trkTarget" style="min-width:260px"></select><button type="button" id="trkApply" disabled>Aplicar</button></span>
          <div id="trkAppliedBox" style="margin-top:6px"><span>Seguimiento aplicado a:</span><ul id="trkApplied" style="margin:4px 0;padding-left:18px"></ul></div></li>
      </ol>
      <p id="trkStatus" role="status">Cargando vídeo…</p><footer><button type="button" id="trkClose">Cerrar</button></footer>`;
    document.body.append(dialog);const q=id=>dialog.querySelector('#'+id),canvas=q('trkView'),ctx=canvas.getContext('2d');
    let time=0,start=saved?.start??0,end=saved?.end??duration,box=saved?.box||null,points=saved?.points?.length?saved.points:null,applied=[...(saved?.applied||[])],running=false,closed=false,playing=false,raf=0;
    const ok='✓ ',wait='○ ',fmt=t=>t.toFixed(2)+' s';
    function states(){q('trkStart').value=start.toFixed(2);q('trkEnd').value=end.toFixed(2);q('trkRangeState').textContent=ok+fmt(start)+' → '+fmt(end)+' ('+fmt(end-start)+')';
      q('trkBoxState').textContent=box?ok+'Zona marcada.':wait+'Falta marcar la zona.';q('trkAnalyze').disabled=!box||running;
      q('trkAnalysisState').textContent=points?ok+`Analizado: ${points.length} posiciones entre ${fmt(points[0].time)} y ${fmt(points.at(-1).time)}.`:wait+'Sin analizar.';q('trkApply').disabled=!points||running;
      const list=q('trkApplied');list.replaceChildren(...applied.map(id=>{const li=document.createElement('li');li.dataset.id=id;li.append(ok+labelOf(clip,id)+' ');const b=document.createElement('button');b.type='button';b.textContent='Quitar';b.onclick=()=>void remove(id);li.append(b);return li;}));
      if(!applied.length){const li=document.createElement('li');li.textContent='Todavía a ningún destino.';li.style.opacity='.7';list.append(li);}
      q('trkTarget').replaceChildren(...destinations(clip).map(d=>new Option((applied.includes(d.id)?'✓ ':'')+d.label,d.id)));}
    function draw(){if(closed)return;ctx.fillStyle='#050e20';ctx.fillRect(0,0,720,405);const v=source.video;if(v.readyState<2)return;const r=fit(v,720,405),X=x=>r.x+x*r.w,Y=y=>r.y+y*r.h;
      let image=v;if(q('trkWithFx').checked){try{image=LQTACVideoEffects.draw(v,clipEffectsState(clip,'video'),time);}catch(e){q('trkStatus').textContent=e.message;}}if(image!==v){ctx.fillStyle='#2a3448';for(let y=0;y<405;y+=20)for(let x=(y/20)%2*20;x<720;x+=40)ctx.fillRect(x,y,20,20);}ctx.drawImage(image,r.x,r.y,r.w,r.h);
      if(points){ctx.strokeStyle='rgba(255,204,112,.85)';ctx.lineWidth=2;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(X(p.x),Y(p.y)):ctx.moveTo(X(p.x),Y(p.y)));ctx.stroke();const inside=time>=points[0].time-1e-6&&time<=points.at(-1).time+1e-6,now=points.reduce((a,p)=>p.time<=time+1e-6?p:a,points[0]);ctx.fillStyle=inside?'#ffcc70':'rgba(255,204,112,.45)';ctx.beginPath();ctx.arc(X(now.x),Y(now.y),7,0,Math.PI*2);ctx.fill();}
      if(box&&(!points||Math.abs(time-start)<.02)){ctx.strokeStyle='#69dcf0';ctx.lineWidth=2;ctx.strokeRect(X(box.x),Y(box.y),box.w*r.w,box.h*r.h);}}
    async function seek(t){time=clamp(t,0,duration);q('trkTime').value=String(time);q('trkTimeLabel').textContent=fmt(time)+' / '+fmt(duration)+(time<start-1e-6||time>end+1e-6?' · fuera del tramo':'');try{await source.seek(time);draw();}catch(e){q('trkStatus').textContent=e.message;}}
    function stop(){playing=false;cancelAnimationFrame(raf);source.video.pause();q('trkPlay').textContent='▶ Reproducir tramo';}
    function setRange(s,e,{keepBox=false}={}){const ns=clamp(s,0,duration-.05),ne=clamp(e,ns+.05,duration);if(Math.abs(ns-start)>1e-6&&!keepBox){box=null;}start=ns;end=ne;states();draw();}
    q('trkTime').oninput=()=>{stop();void seek(Number(q('trkTime').value));};
    q('trkMarkStart').onclick=()=>{setRange(time,Math.max(end,time+.05));q('trkStatus').textContent='Inicio en '+fmt(start)+'. Ahora marca la zona en este instante.';};
    q('trkMarkEnd').onclick=()=>{if(time<=start+.05){q('trkStatus').textContent='El fin debe ser posterior al inicio.';return;}setRange(start,time,{keepBox:true});q('trkStatus').textContent='Fin en '+fmt(end)+'.';};
    q('trkStart').onchange=async()=>{setRange(Number(q('trkStart').value)||0,end);await seek(start);};q('trkEnd').onchange=()=>setRange(start,Number(q('trkEnd').value)||duration,{keepBox:true});
    q('trkWithFx').onchange=draw;
    q('trkPlay').onclick=async()=>{if(playing){stop();return;}await seek(time>=start&&time<end-.02?time:start);playing=true;q('trkPlay').textContent='❚❚ Pausar';const v=source.video,rate=Number(clip.dataset.playbackRate||1),offset=clipPlaybackOffset(clip);v.playbackRate=rate;await v.play().catch(()=>{});
      const tick=()=>{if(!playing||closed)return;time=clamp((v.currentTime-offset)/rate,0,duration);q('trkTime').value=String(time);q('trkTimeLabel').textContent=fmt(time)+' / '+fmt(duration);draw();if(time>=end-1e-3)stop();else raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);};
    canvas.onpointerdown=async e=>{if(running||source.video.readyState<2)return;stop();if(Math.abs(time-start)>.02){setRange(time,Math.max(end,time+.05));q('trkStatus').textContent='El inicio se ha movido al instante actual ('+fmt(start)+'), donde marcas la zona.';}
      const rect=canvas.getBoundingClientRect(),r=fit(source.video,720,405),toFrame=ev=>({x:clamp(((ev.clientX-rect.left)*720/rect.width-r.x)/r.w,0,1),y:clamp(((ev.clientY-rect.top)*405/rect.height-r.y)/r.h,0,1)}),a=toFrame(e);
      const move=ev=>{const b=toFrame(ev);box={x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(b.x-a.x),h:Math.abs(b.y-a.y)};if(!(box.w>.01&&box.h>.01))box=null;states();draw();};
      const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);if(box)q('trkStatus').textContent='Zona marcada. Pulsa «Analizar el tramo».';};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);};
    const unsubscribe=window.lqtacDesktop.onTrackProgress(p=>{if(!running)return;q('trkProgress').value=p.fraction||0;q('trkAnalysisState').textContent='Analizando… '+Math.round((p.fraction||0)*100)+' %';});
    // The analysis is stored in the clip (one undo step) so it can be reapplied or removed later without analysing again.
    async function analyze(){if(!box||running)return;running=true;states();q('trkProgress').hidden=false;q('trkClose').textContent='Cancelar análisis';
      try{const result=await window.lqtacDesktop.trackMotion({filePath:await clipPlaybackPath(clip),offset:clipPlaybackOffset(clip),duration,rate:Number(clip.dataset.playbackRate||1),start,end,box});points=result.points;
        const fx=currentFx(clip);fx.tracking={start,end,box,points,applied};await saveFx(clip,fx);q('trkStatus').textContent='Análisis listo y guardado en el clip. Elige un destino en el paso 4 y pulsa «Aplicar».';}
      catch(e){q('trkStatus').textContent=e.message;}finally{running=false;q('trkProgress').hidden=true;q('trkClose').textContent='Cerrar';states();draw();}}
    q('trkAnalyze').onclick=()=>void analyze();
    // Apply / remove: destination change and the updated list are one undo step.
    async function commit(change){historyCheckpoint();const fx=currentFx(clip);change(fx);fx.tracking={start,end,box,points,applied};LQTACEffects.validate(fx,'video');clip.dataset.videoFx=JSON.stringify(fx);await renderTimelineAt(timelineTime);states();draw();}
    async function apply(id){if(!points)return;const d=destinations(clip).find(x=>x.id===id);if(!d)throw Error('Destino no disponible');
      let titleData=null;if(d.title){titleData=titleKeys(clip,points,d.title);LQTACGeneratorModel.validate(titleData);}
      await commit(fx=>{if(d.target)effectCurves(fx,points,duration,d.target);else if(id==='mask'){if(!fx.shapeMask)throw Error('El clip no tiene máscara dibujada');fx.shapeMask=LQTACMask.trackedMask(fx.shapeMask,points,duration);fx.enabled=true;}else d.title.dataset.generator=JSON.stringify(titleData);if(!applied.includes(id))applied=[...applied,id];});
      q('trkWithFx').checked=!d.title;draw();toast('Seguimiento aplicado a '+d.label);q('trkStatus').textContent='✓ Aplicado a «'+d.label+'». Reproduce el tramo con «Ver con los efectos del clip» para comprobarlo, o aplícalo a otro destino.';}
    async function remove(id){const d=destinations(clip).find(x=>x.id===id);
      await commit(fx=>{if(id.startsWith('fx:')){const t=effectTargets.find(x=>'fx:'+x[0]===id);const anim={...fx.animation};delete anim[t[2]];delete anim[t[3]];fx.animation=anim;}else if(id==='mask'&&fx.shapeMask){const k=fx.shapeMask.keys[0];fx.shapeMask={...fx.shapeMask,keys:[{time:k.time,points:k.points}]};}else if(d?.title){const g=JSON.parse(d.title.dataset.generator);g.keys=[];d.title.dataset.generator=JSON.stringify(g);}applied=applied.filter(x=>x!==id);});
      toast('Seguimiento quitado de '+labelOf(clip,id));q('trkStatus').textContent='Seguimiento quitado de «'+labelOf(clip,id)+'».';}
    q('trkApply').onclick=()=>apply(q('trkTarget').value).catch(e=>q('trkStatus').textContent=e.message);
    const close=()=>{if(running){void window.lqtacDesktop.cancelTrack();return;}stop();closed=true;unsubscribe();source.close();dialog.close();dialog.remove();};q('trkClose').onclick=close;dialog.oncancel=e=>{e.preventDefault();close();};
    window.trackingSession={dialog,get points(){return points;},get applied(){return applied;},get range(){return [start,end];},setRange:(s,e)=>setRange(s,e,{keepBox:true}),setBox:b=>{box=b;states();draw();},seek,analyze,apply,remove};
    dialog.showModal();states();source.ready.then(async()=>{await seek(start);q('trkStatus').textContent=points?'Hay un análisis guardado en este clip: puedes aplicarlo a otro destino, quitarlo o repetir el análisis.':'Paso 1: elige el tramo. Paso 2: marca la zona en el instante de inicio.';}).catch(e=>q('trkStatus').textContent=e.message);
  };
})();
