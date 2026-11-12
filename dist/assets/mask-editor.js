// Drawn mask (rotoscoping): polygon keyframes over the clip, linear interpolation, feathered edge.
// Modes: cut the clip to the mask (transparent outside) or apply the clip's effects only inside it. Invert swaps inside/outside.
window.LQTACFxTools=window.LQTACFxTools||{};
window.LQTACMask=(()=>{
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  // Tracking -> mask: the polygon at the first tracked time moves with the tracked displacement.
  function trackedMask(mask,points,duration){const base=LQTACEffects.maskAt(mask,points[0].time),p0=points[0],pts=LQTACFxTools.decimate(points.filter(p=>p.time<=duration+1e-6),480);
    const keys=pts.map(p=>({time:+p.time.toFixed(4),points:base.map(([x,y])=>[+clamp(x+p.x-p0.x,-.5,1.5).toFixed(5),+clamp(y+p.y-p0.y,-.5,1.5).toFixed(5)])})).filter((k,i,a)=>i===0||k.time>a[i-1].time);
    return {...mask,keys};}
  async function applyTrack(clip,points){const fx=LQTACFxTools.currentFx(clip);if(!fx.shapeMask)throw Error('El clip no tiene máscara dibujada');fx.shapeMask=trackedMask(fx.shapeMask,points,clipTiming(clip).durationSeconds);fx.enabled=true;await LQTACFxTools.saveFx(clip,fx);}
  function open(clip){
    if(!clip?.isConnected||clip.dataset.kind!=='video'||!clip.dataset.filePath||clip.dataset.generator||LQTACStillImages.isClip(clip)){toast('La máscara dibujada necesita un clip de vídeo.');return;}if(exporting||historyBusy||document.querySelector('dialog[open]'))return;
    const duration=clipTiming(clip).durationSeconds,source=LQTACFxTools.frameSource(clip),draft=LQTACFxTools.currentFx(clip);draft.enabled=true;let mask=draft.shapeMask?structuredClone(draft.shapeMask):null,drawing=[],time=0,closed=false,dragging=null;
    const dialog=document.createElement('dialog');dialog.className='work-dialog';dialog.id='maskDialog';dialog.style.width='min(820px,95vw)';
    dialog.innerHTML=`<h2>Máscara dibujada (rotoscopia)</h2><p id="mskHelp"></p>
      <canvas id="mskView" width="720" height="405" style="width:100%;background:#050e20;cursor:crosshair;touch-action:none"></canvas>
      <label>Tiempo del clip<input id="mskTime" type="range" min="0" max="${duration}" step="0.001" value="0" style="width:100%"></label><p id="mskTimeLabel"></p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button type="button" id="mskNew">Nueva máscara</button><button type="button" id="mskKey">Fijar fotograma clave aquí</button><button type="button" id="mskDelKey">Eliminar fotograma clave</button><select id="mskKeys" aria-label="Fotogramas clave"></select></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;margin-top:8px"><label>Uso<select id="mskMode"><option value="cut">Recortar el clip a la máscara</option><option value="effects">Efectos solo dentro de la máscara</option></select></label>
      <label>Suavizado del borde (% de la altura)<input id="mskFeather" type="number" min="0" max="20" step="0.5"></label><label style="display:flex;gap:8px;align-items:center"><input id="mskInvert" type="checkbox" style="width:auto"> Invertir (actúa fuera)</label><label style="display:flex;gap:8px;align-items:center"><input id="mskResult" type="checkbox" checked style="width:auto"> Ver resultado</label></div>
      <p id="mskStatus" role="status"></p><footer><button type="button" id="mskRemove">Quitar máscara</button><button type="button" id="mskCancel">Cancelar</button><button type="button" id="mskApply">Aplicar al clip</button></footer>`;
    document.body.append(dialog);const q=id=>dialog.querySelector('#'+id),canvas=q('mskView'),ctx=canvas.getContext('2d');
    q('mskMode').value=mask?.mode||'cut';q('mskFeather').value=String(+((mask?.feather??.01)*100).toFixed(2));q('mskInvert').checked=!!mask?.invert;
    const polygon=()=>mask?LQTACEffects.maskAt(mask,time):null,settings=()=>({mode:q('mskMode').value,invert:q('mskInvert').checked,feather:clamp((Number(q('mskFeather').value)||0)/100,0,.2)});
    function help(){q('mskHelp').textContent=mask?'Arrastra los puntos para ajustar la forma en este instante (se crea o actualiza un fotograma clave). Mayúsculas + arrastrar dentro mueve toda la máscara. Entre fotogramas clave la forma se interpola.':'Haz clic para añadir puntos alrededor de la zona; pulsa el primer punto (o doble clic) para cerrar la forma. Mínimo 3 puntos.';}
    function setKey(points){const k={time:+time.toFixed(4),points:points.map(([x,y])=>[+clamp(x,-.5,1.5).toFixed(5),+clamp(y,-.5,1.5).toFixed(5)])};mask.keys=[...mask.keys.filter(x=>Math.abs(x.time-k.time)>1e-3),k].sort((a,b)=>a.time-b.time);}
    function keys(){q('mskKeys').replaceChildren(new Option(mask?`${mask.keys.length} fotograma(s) clave`:'Sin máscara',''),...(mask?.keys||[]).map(k=>new Option(k.time.toFixed(3)+' s',String(k.time))));}
    function draw(){if(closed)return;ctx.fillStyle='#050e20';ctx.fillRect(0,0,720,405);const v=source.video;if(v.readyState<2)return;const r=LQTACFxTools.fit(v,720,405),X=x=>r.x+x*r.w,Y=y=>r.y+y*r.h;
      let image=v;if(mask&&q('mskResult').checked){try{image=LQTACVideoEffects.draw(v,{...draft,shapeMask:{...mask,...settings()}},time);}catch(e){q('mskStatus').textContent=e.message;}}
      if(image!==v){ctx.fillStyle='#2a3448';for(let y=0;y<405;y+=20)for(let x=(y/20)%2*20;x<720;x+=40)ctx.fillRect(x,y,20,20);}ctx.drawImage(image,r.x,r.y,r.w,r.h);
      const pts=mask?polygon():drawing;ctx.strokeStyle='#ffcc70';ctx.lineWidth=2;ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(X(x),Y(y)):ctx.moveTo(X(x),Y(y)));if(mask)ctx.closePath();ctx.stroke();
      const onKey=mask?.keys.some(k=>Math.abs(k.time-time)<1e-3);for(const [x,y] of pts){ctx.fillStyle=onKey?'#ffcc70':'#eaf6ff';ctx.beginPath();ctx.arc(X(x),Y(y),5,0,Math.PI*2);ctx.fill();}}
    async function seek(t){time=clamp(t,0,duration);q('mskTime').value=String(time);q('mskTimeLabel').textContent=time.toFixed(3)+' s / '+duration.toFixed(3)+' s';try{await source.seek(time);}catch(e){q('mskStatus').textContent=e.message;}draw();}
    const toFrame=e=>{const rect=canvas.getBoundingClientRect(),r=LQTACFxTools.fit(source.video,720,405);return [((e.clientX-rect.left)*720/rect.width-r.x)/r.w,((e.clientY-rect.top)*405/rect.height-r.y)/r.h];};
    const near=(a,b)=>{const r=LQTACFxTools.fit(source.video,720,405);return Math.hypot((a[0]-b[0])*r.w,(a[1]-b[1])*r.h)<9;};
    function closeShape(){if(drawing.length<3){q('mskStatus').textContent='Hacen falta al menos 3 puntos.';return;}mask={...settings(),keys:[]};setKey(drawing);drawing=[];help();keys();draw();q('mskStatus').textContent='Máscara creada. Muévete en el tiempo y ajusta los puntos para seguir la forma.';}
    canvas.onpointerdown=e=>{if(source.video.readyState<2)return;const p=toFrame(e);
      if(!mask){if(drawing.length>=3&&near(p,drawing[0])){closeShape();return;}if(drawing.length<64)drawing.push(p);draw();return;}
      const pts=polygon(),hit=pts.findIndex(x=>near(x,p));if(hit<0&&!e.shiftKey)return;const start=p,initial=pts.map(x=>[...x]);
      const move=ev=>{const c=toFrame(ev);const next=hit>=0?initial.map((x,i)=>i===hit?c:x):initial.map(([x,y])=>[x+c[0]-start[0],y+c[1]-start[1]]);setKey(next);draw();};
      const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);keys();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);};
    canvas.ondblclick=()=>{if(!mask)closeShape();};
    q('mskTime').oninput=()=>void seek(Number(q('mskTime').value));q('mskKeys').onchange=()=>{if(q('mskKeys').value!=='')void seek(Number(q('mskKeys').value));};
    q('mskNew').onclick=()=>{mask=null;drawing=[];help();keys();draw();};q('mskKey').onclick=()=>{if(mask){setKey(polygon());keys();draw();}};
    q('mskDelKey').onclick=()=>{if(!mask)return;const rest=mask.keys.filter(k=>Math.abs(k.time-time)>1e-3);if(!rest.length){q('mskStatus').textContent='La máscara necesita al menos un fotograma clave.';return;}mask.keys=rest;keys();draw();};
    for(const id of ['mskMode','mskFeather','mskInvert','mskResult'])q(id).oninput=draw;
    const finish=()=>{closed=true;source.close();dialog.close();dialog.remove();};
    q('mskCancel').onclick=finish;dialog.oncancel=e=>{e.preventDefault();finish();};
    q('mskRemove').onclick=async()=>{const fx=LQTACFxTools.currentFx(clip);fx.shapeMask=null;await LQTACFxTools.saveFx(clip,fx);toast('Máscara quitada');finish();};
    q('mskApply').onclick=async()=>{try{if(!mask)throw Error('Dibuja primero la máscara');const fx=LQTACFxTools.currentFx(clip);fx.enabled=true;fx.shapeMask={...mask,...settings()};await LQTACFxTools.saveFx(clip,fx);toast('Máscara aplicada al clip');finish();}catch(e){q('mskStatus').textContent=e.message;}};
    window.maskSession={dialog,get mask(){return mask;},click:(x,y)=>{if(mask)return;if(drawing.length>=3&&near([x,y],drawing[0]))closeShape();else{drawing.push([x,y]);draw();}},close:closeShape,seek,setKey:pts=>{setKey(pts);keys();draw();},apply:()=>q('mskApply').onclick()};
    help();keys();dialog.showModal();source.ready.then(()=>seek(0)).catch(e=>q('mskStatus').textContent=e.message);
  }
  window.LQTACFxTools.shapeMask=open;
  return {open,applyTrack,trackedMask};
})();
