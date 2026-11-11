// Chroma zone selector shared by the FX editor and the general effects form.
// all = whole frame · people = IA rápida (local, live) · pro = IA precisa (optional module, pre-analysis).
(function(){
  const style=document.createElement('style');style.textContent=`
  .chroma-zone{border:1px solid var(--line,#24456b);border-radius:8px;padding:10px 12px;margin:10px 0}
  .chroma-zone legend{padding:0 6px}
  .chroma-zone .cz-option{display:grid!important;grid-template-columns:20px minmax(0,1fr) auto;align-items:center;gap:10px;padding:6px 0;margin:0;text-align:left}
  .chroma-zone .cz-option input[type=radio]{width:16px!important;height:16px;margin:0;justify-self:start}
  .chroma-zone .cz-option>span:first-of-type{text-align:left}
  .chroma-zone .cz-sub label{display:grid!important;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:10px}
  .chroma-zone .cz-sub select{width:100%;min-width:0}
  .chroma-zone .cz-pro-state{display:inline-flex;align-items:center;gap:6px}
  .chroma-zone input[type=radio]:disabled+span{opacity:.6}
  .chroma-zone .cz-option small{display:block;color:var(--muted,#8aa4c4);font-size:11px;line-height:1.4}
  .chroma-zone .cz-badge{font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid var(--line,#24456b);white-space:nowrap}
  .chroma-zone .cz-badge.ok{border-color:#2f9e6b;color:#7be0b0}
  .chroma-zone .cz-download{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;padding:0;border-radius:6px;cursor:pointer}
  .chroma-zone .cz-download svg{width:16px;height:16px}
  .chroma-zone .cz-sub{margin:2px 0 6px 28px;display:grid;gap:6px}
  .chroma-zone .cz-warning{margin:2px 0 6px 28px;font-size:11px;color:#ffcc70;line-height:1.45}
  .chroma-zone .cz-status{font-size:11px;color:var(--muted,#8aa4c4);margin:0}
  #aiProDialog{width:min(560px,92vw)}#aiProDialog progress{width:100%}#aiProDialog p,#aiProDialog ul{font-size:13px;line-height:1.5}#aiProDialog ul{padding-left:18px}#aiProDialog .warn{color:#ffcc70}#aiProDialog button:disabled{opacity:.45;cursor:not-allowed}`;
  document.head.append(style);
  const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';
  let proStatus={installed:false,version:null},proListeners=new Set();
  async function refreshPro(){try{proStatus=await window.lqtacDesktop.aiProStatus();}catch{}for(const l of proListeners)l(proStatus);return proStatus;}
  const mb=bytes=>(bytes/1e6).toLocaleString('es-ES',{maximumFractionDigits:0})+' MB';

  // Install dialog for the optional module.
  const dialog=document.createElement('dialog');dialog.id='aiProDialog';dialog.className='work-dialog';document.body.append(dialog);
  async function openInstaller(){
    if(dialog.open)return;
    dialog.innerHTML=`<h2>IA precisa · módulo opcional</h2>
      <p>Permite marcar con clics cualquier objeto o personaje y seguirlo durante todo el clip para que el croma actúe solo sobre el fondo.</p>
      <ul class="warn"><li><strong>No es un filtro en directo:</strong> necesita analizar el clip antes de usarse.</li><li><strong>Alto consumo:</strong> usa intensivamente CPU y gráfica; en este equipo puede tardar del orden de una hora por cada 5 minutos de vídeo en 1080p.</li><li>Durante el análisis conviene no usar otras aplicaciones pesadas. Se puede cancelar y el resultado se guarda para no repetirlo.</li></ul>
      <p id="aiProInfo" role="status">Consultando GitHub…</p><progress id="aiProProgress" max="1" value="0" hidden></progress>
      <footer><button type="button" id="aiProUninstall" hidden>Desinstalar</button><button type="button" id="aiProClose">Cerrar</button><button type="button" id="aiProGo" class="solid-btn" disabled>Descargar e instalar</button></footer>`;
    const info=dialog.querySelector('#aiProInfo'),go=dialog.querySelector('#aiProGo'),close=dialog.querySelector('#aiProClose'),bar=dialog.querySelector('#aiProProgress'),remove=dialog.querySelector('#aiProUninstall');
    let busy=false;const status=await refreshPro();remove.hidden=!status.installed;
    dialog.showModal();
    try{
      const release=await window.lqtacDesktop.aiProCheck();if(!dialog.open)return;
      if(!release.available){info.textContent=release.reason;}
      else if(!release.compatible){info.textContent=`La versión ${release.version} del módulo necesita Cinema Studio ${release.minAppVersion} o superior.`;}
      else{info.textContent=(status.installed&&status.version===release.version?`Instalada la versión ${release.version}. Puedes reinstalarla`:`Disponible la versión ${release.version}`)+` · descarga de ${mb(release.size)} desde GitHub · se verifica con SHA-256.`;go.disabled=false;go.textContent=status.installed?'Reinstalar':'Descargar e instalar';}
    }catch(error){info.textContent='No se pudo consultar GitHub: '+error.message;}
    go.onclick=async()=>{
      busy=true;go.disabled=true;remove.disabled=true;close.textContent='Cancelar';bar.hidden=false;bar.removeAttribute('value');
      const off=window.lqtacDesktop.onAiProProgress(p=>{if(p.phase==='download'){bar.value=p.received/p.total;info.textContent=`Descargando · ${mb(p.received)} de ${mb(p.total)}`;}else info.textContent={check:'Comprobando la release…',extract:'Descomprimiendo…',activate:'Activando el módulo…',done:'Instalación completada.'}[p.phase]||info.textContent;});
      try{const s=await window.lqtacDesktop.aiProInstall();info.textContent=`Módulo IA pro ${s.version} instalado.`;bar.value=1;await refreshPro();}
      catch(error){info.textContent=error.message;bar.hidden=true;go.disabled=false;}
      finally{off();busy=false;remove.disabled=false;close.textContent='Cerrar';remove.hidden=!proStatus.installed;}
    };
    remove.onclick=async()=>{if(!confirm('¿Eliminar el módulo IA pro de este equipo? Podrás volver a descargarlo.'))return;try{await window.lqtacDesktop.aiProUninstall();info.textContent='Módulo eliminado.';await refreshPro();remove.hidden=true;go.disabled=false;go.textContent='Descargar e instalar';}catch(error){info.textContent=error.message;}};
    close.onclick=()=>{if(busy)void window.lqtacDesktop.aiProCancel();else dialog.close();};
    dialog.oncancel=event=>{if(busy){event.preventDefault();void window.lqtacDesktop.aiProCancel();}};
  }

  // ---- IA pro analysis: mark points on the clip, run the module, store {id,fps,frames} in the effect.
  const analysisDialog=document.createElement('dialog');analysisDialog.id='aiProAnalysis';analysisDialog.className='work-dialog';analysisDialog.style.width='min(980px,95vw)';document.body.append(analysisDialog);
  const analysisStyle=document.createElement('style');analysisStyle.textContent='#aiProAnalysis canvas{width:100%;aspect-ratio:16/9;background:#050e20;cursor:crosshair;border-radius:6px}#aiProAnalysis .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}#aiProAnalysis p,#aiProAnalysis li{font-size:13px;line-height:1.45}#aiProAnalysis progress{width:100%}#aiProAnalysis .warn{color:#ffcc70}#aiProAnalysis input[type=range]{flex:1}';document.head.append(analysisStyle);
  let secondsPerFrame=Number(localStorage.getItem('lqtacAiProSpf'))||1.2;
  const colors=['#3ddc84','#4fc3f7','#ffb74d','#f06292'];
  async function openAnalysis(options,sync){
    const clip=options.clip;if(!clip||analysisDialog.open)return;
    if(clip.dataset.generator||LQTACStillImages.isClip(clip)){toast('La IA precisa analiza clips de vídeo, no generadores ni imágenes fijas');return;}
    const duration=clipTiming(clip).durationSeconds,source=options.getSource?.();let time=options.getTime?.()||0,points=[],busy=false;
    analysisDialog.innerHTML=`<h2>IA precisa · marcar y analizar</h2>
      <p><strong>Clic izquierdo</strong> sobre lo que debe conservarse (personaje u objeto) · <strong>clic derecho</strong> sobre fondo que no debe incluirse. Puedes marcar en varios instantes y hasta 4 objetos.</p>
      <canvas width="960" height="540"></canvas>
      <div class="row"><label>Tiempo <input type="range" class="aa-time" min="0" max="${duration}" step="0.001"></label><span class="aa-label"></span></div>
      <div class="row"><label>Objeto <select class="aa-object">${colors.map((c,i)=>`<option value="${i}">Objeto ${i+1}</option>`).join('')}</select></label><button type="button" class="aa-undo">Deshacer punto</button><button type="button" class="aa-clear">Borrar puntos</button>
      <label>Precisión temporal <select class="aa-fps"><option value="8">8 fps · más rápido</option><option value="12" selected>12 fps · recomendado</option><option value="24">24 fps · máximo detalle</option></select></label></div>
      <p class="aa-estimate warn"></p><progress class="aa-progress" max="1" value="0" hidden></progress><p class="aa-status" role="status"></p>
      <footer><button type="button" class="aa-close">Cerrar</button><button type="button" class="aa-go solid-btn">Analizar</button></footer>`;
    const q=s=>analysisDialog.querySelector(s),canvas=q('canvas'),ctx=canvas.getContext('2d'),slider=q('.aa-time'),fpsSelect=q('.aa-fps'),go=q('.aa-go'),close=q('.aa-close'),bar=q('.aa-progress'),statusLine=q('.aa-status');
    const fmt=s=>s>=3600?`${Math.floor(s/3600)} h ${Math.round(s%3600/60)} min`:s>=60?`${Math.round(s/60)} min`:`${Math.max(1,Math.round(s))} s`;
    const estimate=()=>{const frames=Math.round(duration*Number(fpsSelect.value));q('.aa-estimate').textContent=`⚠ ${frames} fotogramas · estimación en este equipo: ${fmt(frames*secondsPerFrame)} de uso intenso de CPU. No es un filtro en directo; puedes cancelar.`;};
    function paint(){const w=canvas.width,h=canvas.height;ctx.fillStyle='#050e20';ctx.fillRect(0,0,w,h);if(source&&(source.readyState===undefined||source.readyState>=2)){const sw=source.videoWidth||source.width,sh=source.videoHeight||source.height,s=Math.min(w/sw,h/sh);ctx.drawImage(source,(w-sw*s)/2,(h-sh*s)/2,sw*s,sh*s);}
      for(const p of points){const near=Math.abs(p.time-time)<.25;ctx.globalAlpha=near?1:.35;ctx.beginPath();ctx.arc(p.cx*w,p.cy*h,9,0,Math.PI*2);ctx.fillStyle=p.label?colors[p.object]:'#ff5252';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#fff';ctx.stroke();if(!p.label){ctx.beginPath();ctx.moveTo(p.cx*w-5,p.cy*h);ctx.lineTo(p.cx*w+5,p.cy*h);ctx.stroke();}}
      ctx.globalAlpha=1;q('.aa-label').textContent=`${time.toFixed(2)} s / ${duration.toFixed(2)} s · ${points.length} puntos`;go.disabled=busy||!points.some(p=>p.label);}
    // Map a click on the letterboxed canvas to normalized source coordinates.
    function toSource(event){const r=canvas.getBoundingClientRect(),cx=(event.clientX-r.left)/r.width,cy=(event.clientY-r.top)/r.height,sw=source?.videoWidth||source?.width||16,sh=source?.videoHeight||source?.height||9,s=Math.min(canvas.width/sw,canvas.height/sh),ox=(canvas.width-sw*s)/2/canvas.width,oy=(canvas.height-sh*s)/2/canvas.height,x=(cx-ox)/(1-2*ox),y=(cy-oy)/(1-2*oy);return x<0||x>1||y<0||y>1?null:{x,y,cx,cy};}
    canvas.oncontextmenu=event=>event.preventDefault();
    canvas.onpointerdown=event=>{if(busy||(event.button!==0&&event.button!==2))return;const p=toSource(event);if(!p)return;points.push({...p,time,label:event.button===0&&!event.altKey,object:Number(q('.aa-object').value)});paint();};
    slider.value=String(time);slider.oninput=()=>{time=Number(slider.value);options.setTime?.(time);};
    q('.aa-undo').onclick=()=>{points.pop();paint();};q('.aa-clear').onclick=()=>{points=[];paint();};fpsSelect.onchange=estimate;
    const timer=setInterval(()=>{if(!analysisDialog.open)return clearInterval(timer);time=options.getTime?.()??time;if(document.activeElement!==slider)slider.value=String(time);paint();},120);
    close.onclick=()=>{if(busy)void window.lqtacDesktop.aiProAnalyzeCancel();else analysisDialog.close();};
    analysisDialog.oncancel=event=>{if(busy){event.preventDefault();void window.lqtacDesktop.aiProAnalyzeCancel();}};
    go.onclick=async()=>{
      busy=true;go.disabled=true;close.textContent='Cancelar';bar.hidden=false;bar.removeAttribute('value');statusLine.textContent='Preparando fotogramas del clip…';const started=performance.now();
      const off=window.lqtacDesktop.onAiProAnalyzeProgress(p=>{if(p.phase==='track'){bar.value=p.progress;statusLine.textContent=`Analizando · ${p.done}/${p.total} fotogramas`+(p.remaining!=null?` · quedan unos ${fmt(p.remaining)}`:'');}else if(p.phase==='load')statusLine.textContent='Cargando el modelo SAM 2…';else if(p.phase==='prompt')statusLine.textContent='Aplicando tus puntos…';});
      try{
        const objects=colors.map((_,i)=>({points:points.filter(p=>p.object===i).map(p=>({time:p.time,x:p.x,y:p.y,label:p.label}))})).filter(o=>o.points.length);
        const fps=Number(fpsSelect.value),result=await window.lqtacDesktop.aiProAnalyze({filePath:await clipPlaybackPath(clip),offset:clipPlaybackOffset(clip),rate:Number(clip.dataset.playbackRate||1),duration,fps,objects});
        if(!result.cached&&result.frames){secondsPerFrame=Math.max(.05,(performance.now()-started)/1000/result.frames);try{localStorage.setItem('lqtacAiProSpf',String(secondsPerFrame));}catch{}}
        LQTACAiMatte.clearProInfo(result.id);options.set({chromaZone:'pro',chromaProMatte:{id:result.id,fps:result.fps,frames:result.frames}});
        statusLine.textContent=result.cached?'Análisis recuperado de la caché.':`Análisis completado en ${fmt((performance.now()-started)/1000)}.`;bar.value=1;sync();setTimeout(()=>analysisDialog.close(),900);
      }catch(error){statusLine.textContent=error.message;bar.hidden=true;}
      finally{off();busy=false;close.textContent='Cerrar';paint();}
    };
    estimate();paint();analysisDialog.showModal();
  }

  // options: {get():fx, set(patch), params:[nodes shown only for IA zones], clip?, getSource?(), getTime?(), setTime?(t)}
  function mount(container,options){
    const box=document.createElement('fieldset');box.className='chroma-zone';
    box.innerHTML=`<legend>Zona donde actúa el croma</legend>
      <label class="cz-option"><input type="radio" name="chromaZone" value="all"><span>Todo el fotograma<small>Comportamiento clásico · en directo</small></span><span></span></label>
      <label class="cz-option"><input type="radio" name="chromaZone" value="people"><span>IA rápida · proteger personas<small>Detecta personas y solo elimina el color fuera de ellas · en directo · incluida</small></span><span class="cz-badge ok">Incluida</span></label>
      <div class="cz-sub" data-zone="people"><label>Modelo<select class="cz-model"><option value="fast">Rápido · planos medios y primeros planos</option><option value="detail">Detallado · cuerpo, pelo y ropa (algo más pesado)</option></select></label><p class="cz-status" role="status"></p></div>
      <label class="cz-option"><input type="radio" name="chromaZone" value="pro"><span>IA precisa · cualquier objeto<small>Marca personajes u objetos con clics y los sigue en todo el clip</small></span><span class="cz-pro-state"></span></label>
      <p class="cz-warning" data-zone="pro">⚠ No es un filtro en directo: requiere analizar el clip antes y consume mucha CPU y gráfica.</p>
      <div class="cz-sub" data-zone="pro"><p class="cz-status cz-pro-analysis" role="status"></p><button type="button" class="cz-analyze">Marcar y analizar…</button></div>`;
    container.append(box);
    const radios=[...box.querySelectorAll('input[name=chromaZone]')],model=box.querySelector('.cz-model'),statusLine=box.querySelector('.cz-status'),proState=box.querySelector('.cz-pro-state'),proRadio=radios.find(r=>r.value==='pro');
    const params=options.params||[];
    function sync(){
      const fx=options.get(),zone=fx.chromaZone||'all';
      for(const r of radios)r.checked=r.value===zone;model.value=fx.chromaMatteModel||'fast';
      for(const node of box.querySelectorAll('[data-zone]'))node.hidden=node.dataset.zone!==zone;
      for(const node of params)if(node)node.hidden=zone!=='people'&&zone!=='pro';
      const analysis=fx.chromaProMatte,analyze=box.querySelector('.cz-analyze'),proLine=box.querySelector('.cz-pro-analysis');
      analyze.disabled=!proStatus.installed||!options.clip;analyze.textContent=analysis?'Volver a marcar y analizar…':'Marcar y analizar…';
      proLine.textContent=!proStatus.installed?'Instala el módulo con el botón de descarga para usar esta opción.':!options.clip?'Para analizar, abre FX → Croma con el clip seleccionado.':LQTACAiMatte.proError()?LQTACAiMatte.proError():analysis?`Analizado · ${analysis.frames} fotogramas a ${analysis.fps} fps. Se usa en vista previa y exportación.`:'Sin analizar: hasta entonces el croma actúa en todo el fotograma.';
      const s=LQTACAiMatte.status(model.value);statusLine.textContent=zone!=='people'?'':s==='ready'?'IA local lista.':s==='loading'?'Cargando la IA local…':s==='error'?'Error de la IA local: '+LQTACAiMatte.error(model.value):'La IA local se cargará al usarla.';
      proRadio.disabled=!proStatus.installed&&zone!=='pro';
      proState.innerHTML=proStatus.installed?`<span class="cz-badge ok">Instalada${proStatus.version?' · v'+proStatus.version:''}</span>`:`<span class="cz-badge">No instalada</span> <button type="button" class="cz-download" title="Descargar e instalar desde GitHub" aria-label="Descargar e instalar IA precisa">${icon}</button>`;
      proState.querySelector('.cz-download')?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();void openInstaller();});
    }
    for(const r of radios)r.onchange=()=>{if(!r.checked)return;options.set({chromaZone:r.value});if(r.value==='people')void LQTACAiMatte.ensure(model.value).catch(()=>{});sync();};
    box.querySelector('.cz-analyze').onclick=()=>void openAnalysis(options,sync);
    model.onchange=()=>{options.set({chromaMatteModel:model.value});void LQTACAiMatte.ensure(model.value).catch(()=>{});sync();};
    const offMatte=LQTACAiMatte.onChange(sync),onPro=()=>sync();proListeners.add(onPro);
    const observer=new MutationObserver(()=>{if(!box.isConnected){offMatte();proListeners.delete(onPro);observer.disconnect();}});observer.observe(document.body,{childList:true,subtree:true});
    sync();void refreshPro();
    if((options.get().chromaZone||'all')==='people')void LQTACAiMatte.ensure(options.get().chromaMatteModel||'fast').catch(()=>{});
    return {sync,element:box};
  }
  window.LQTACChromaZone={mount,openInstaller,refreshPro,get proStatus(){return proStatus;}};
})();
