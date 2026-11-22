// Visual editor for «Trayectoria» (motion path). The canvas shows the real project frame (captureProjectFrame)
// with the draft path applied through window.motionPathDraft, so what you see is what export renders.
const motionDialog=document.createElement('dialog');motionDialog.id='motionPathDialog';motionDialog.className='work-dialog';motionDialog.style.width='min(1280px,96vw)';document.body.append(motionDialog);
const motionStyle=document.createElement('style');motionStyle.textContent='#motionPathDialog .mp-columns{display:grid;grid-template-columns:minmax(360px,2.6fr) minmax(240px,1fr);gap:16px}#motionPathDialog p{margin:6px 0}#mpCanvas{width:100%;aspect-ratio:16/9;background:#26364b;touch-action:none;cursor:crosshair;display:block}#motionPathDialog .mp-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px}#motionPathDialog .mp-fields label,#motionPathDialog .mp-side>label{display:flex;flex-direction:column;align-items:stretch;gap:4px;margin:4px 0}#motionPathDialog input[type=number],#motionPathDialog select{width:100%;box-sizing:border-box}#motionPathDialog input[type=range]{width:100%}#motionPathDialog .mp-mode button[aria-pressed=true]{outline:2px solid #ffd18a}#motionPathDialog footer{position:sticky;bottom:-22px;background:#102747;padding:10px 0;z-index:2}#motionPathDialog [role=status]{min-height:1.5em}#motionPathDialog label:has(>input[type=checkbox]){display:flex;flex-direction:row;justify-content:flex-start;align-items:center;gap:8px;margin:4px 0}#motionPathDialog .mp-mode{display:flex;gap:8px;align-items:center;flex-wrap:wrap}#mpHelp{font-size:.9em;opacity:.85}@media(max-width:820px){#motionPathDialog .mp-columns{grid-template-columns:1fr}}';document.head.append(motionStyle);
motionDialog.addEventListener('keydown',e=>e.stopPropagation());
let motionPathSession=null;
function openMotionPathEditor(clip){
  if(!clip?.isConnected||clip.dataset.kind!=='video'||motionDialog.open||exporting||historyBusy||effectsBusy)return;
  stopTimelinePlayback();
  const timing=clipTiming(clip),duration=timing.durationSeconds,savedTime=timelineTime,CW=1200,CH=675,F={ox:120,oy:67.5,w:960,h:540};
  const stored=clipMotionPath(clip),m=stored?structuredClone(LQTACMotion.normalize(stored)):{...structuredClone(LQTACMotion.defaults),orient:'flip',start:0,end:Math.max(.05,duration)};
  let time=Math.max(0,Math.min(duration,timelineTime-timing.startSeconds)),mode=m.nodes.length?'route':'anchor',closed=false,playing=false,bg=null,ghost=null,rendering=false,dirty=false,drag=null;
  motionDialog.innerHTML='<h2>Trayectoria · ruta de movimiento</h2><p id="mpName"></p><div class="mp-columns"><section><p class="mp-mode"><button id="mpModeAnchor" type="button">⊕ Zona de peso</button> <button id="mpModeRoute" type="button">✎ Dibujar ruta</button> <label><input id="mpGhosts" type="checkbox" checked> Ver fantasmas</label></p><canvas id="mpCanvas" width="1200" height="675" aria-label="Lienzo de trayectoria: zona de peso y ruta"></canvas><p><button id="mpPlay" type="button">▶ Reproducir</button> <span id="mpTimeLabel"></span></p><label>Tiempo del clip<input id="mpTime" type="range" min="0" step="0.001"></label><p id="mpHelp"></p></section><section class="mp-side"><details open><summary>Tiempo</summary><div class="mp-fields"><label>Inicio (s)<input id="mpStart" type="number" step="0.01"></label><label>Fin (s)<input id="mpEnd" type="number" step="0.01"></label></div><p><button id="mpStartHere" type="button">Inicio aquí</button> <button id="mpEndHere" type="button">Fin aquí</button> <button id="mpWhole" type="button">Usar todo el clip</button></p><label>Aceleración<select id="mpEasing"><option value="Linear">Lineal</option><option value="Smooth">Suave</option><option value="Fast">Rápida al principio</option><option value="Slow">Lenta al principio</option><option value="Sharp">Brusca</option></select></label><label><input id="mpLoop" type="checkbox"> Repetir en bucle</label></details><details open><summary>Orientación y tamaño</summary><label>Orientación<select id="mpOrient"><option value="flip">Voltear al cambiar de sentido</option><option value="path">Girar con la ruta</option><option value="none">Sin giro</option></select></label><label>Mira hacia (°)<input id="mpForward" type="number" min="-360" max="360" step="1"></label><p><button id="mpFaceRight" type="button">Mira a la derecha</button> <button id="mpFaceLeft" type="button">Mira a la izquierda</button></p><label>Inercia del cuerpo (rígido ↔ suave)<input id="mpInertia" type="range" min="0" max="1" step="0.01"></label><label>Cabeceo extra (°)<input id="mpOffset" type="range" min="-180" max="180" step="1"></label><div class="mp-fields"><label>Tamaño inicial<input id="mpScale" type="number" min="0.01" max="10" step="0.01"></label><label>Tamaño final<input id="mpScaleEnd" type="number" min="0.01" max="10" step="0.01"></label></div><label><input id="mpScaleSame" type="checkbox"> Mismo tamaño en toda la ruta</label></details><p><button id="mpClear" type="button">Borrar ruta</button></p><p id="mpStatus" role="status"></p></section></div><footer><button id="mpCancel" type="button">Cancelar</button> <button id="mpRemove" type="button">Quitar trayectoria</button> <button id="mpApply" type="button">Aplicar al clip</button></footer>';
  $('#mpName').textContent=clip.firstChild?.textContent||'Vídeo';$('#mpTime').max=String(duration);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),canvas=$('#mpCanvas'),ctx=canvas.getContext('2d');
  const toC=p=>({x:F.ox+p.x*F.w,y:F.oy+p.y*F.h}),fromC=p=>({x:clamp((p.x-F.ox)/F.w,-2,3),y:clamp((p.y-F.oy)/F.h,-2,3)});
  const status=t=>{if(!closed)$('#mpStatus').textContent=t;};
  function valid(){try{LQTACMotion.validate(m);return true;}catch{return false;}}
  // Draft seen by the compositor: at rest while marking the weight zone, the path otherwise.
  const publish=()=>{window.motionPathDraft={clip,motion:mode==='anchor'||!valid()?null:structuredClone(m)};};
  async function refresh(){dirty=true;if(rendering)return;rendering=true;try{while(dirty&&!closed){dirty=false;publish();const b64=await captureProjectFrame(timing.startSeconds+time,F.w,F.h);const img=new Image();img.src='data:image/png;base64,'+b64;await img.decode();if(closed)break;bg=img;ghost=objectLayer();paint();}}catch(e){status(e.message);}finally{rendering=false;}}
  // The clip's own frame (effects + Pan/Crop, no path) for the ghost poses.
  function objectLayer(){const media=typeof videoPool!=='undefined'&&videoPool.get(clip);if(!media||media.readyState<2)return null;const c=document.createElement('canvas');c.width=F.w;c.height=F.h;LQTACWork.drawCrop(c.getContext('2d'),LQTACVideoEffects.draw(media,clipEffectsState(clip,'video'),time),F.w,F.h,LQTACWork.cropAt(clipCropFrames(clip),time));return c;}
  function paint(){
    if(closed)return;ctx.fillStyle='#26364b';ctx.fillRect(0,0,CW,CH);if(bg)ctx.drawImage(bg,F.ox,F.oy,F.w,F.h);ctx.strokeStyle='#9fb4cc';ctx.lineWidth=1;ctx.strokeRect(F.ox,F.oy,F.w,F.h);
    if(mode==='anchor'){const a=toC(m.anchor),r=m.forward*Math.PI/180,tip={x:a.x+Math.cos(r)*70,y:a.y+Math.sin(r)*70};for(const [c,lw] of [['#0b1a2e',6],['#ffd18a',3]]){ctx.strokeStyle=c;ctx.lineWidth=lw;ctx.beginPath();ctx.arc(a.x,a.y,12,0,Math.PI*2);ctx.moveTo(a.x-20,a.y);ctx.lineTo(a.x+20,a.y);ctx.moveTo(a.x,a.y-20);ctx.lineTo(a.x,a.y+20);ctx.moveTo(a.x,a.y);ctx.lineTo(tip.x,tip.y);ctx.stroke();}ctx.font='bold 15px sans-serif';ctx.beginPath();ctx.moveTo(tip.x,tip.y);ctx.lineTo(tip.x-Math.cos(r-.45)*14,tip.y-Math.sin(r-.45)*14);ctx.lineTo(tip.x-Math.cos(r+.45)*14,tip.y-Math.sin(r+.45)*14);ctx.closePath();ctx.fillStyle='#ffd18a';ctx.fill();return;}
    if(ghost&&$('#mpGhosts').checked&&valid()){ctx.save();ctx.translate(F.ox,F.oy);ctx.globalAlpha=.3;for(let i=0;i<6;i++)LQTACMotion.draw(ctx,ghost,F.w,F.h,m,m.start+(m.end-m.start)*(i+.5)/6);ctx.restore();}
    const n=m.nodes.map(p=>({p:toC(p),i:p.in&&toC(p.in),o:p.out&&toC(p.out)}));
    if(n.length>1){ctx.strokeStyle='#ffd18a';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(n[0].p.x,n[0].p.y);for(let k=1;k<n.length;k++){const a=n[k-1],b=n[k],c1=a.o||a.p,c2=b.i||b.p;ctx.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,b.p.x,b.p.y);}ctx.stroke();}
    ctx.lineWidth=1;for(const [k,q] of n.entries()){ctx.strokeStyle='#8fd3ff';for(const h of [q.i,q.o])if(h){ctx.beginPath();ctx.moveTo(q.p.x,q.p.y);ctx.lineTo(h.x,h.y);ctx.stroke();ctx.beginPath();ctx.arc(h.x,h.y,5,0,Math.PI*2);ctx.fillStyle='#8fd3ff';ctx.fill();}ctx.fillStyle=k===0?'#6ee38a':k===n.length-1?'#ff7a7a':'#edf8ff';ctx.fillRect(q.p.x-6,q.p.y-6,12,12);ctx.strokeStyle='#102747';ctx.strokeRect(q.p.x-6,q.p.y-6,12,12);}
    if(valid()){const s=LQTACMotion.at(m,time,F.w,F.h);ctx.strokeStyle='#ffd18a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(F.ox+s.x,F.oy+s.y,9,0,Math.PI*2);ctx.stroke();}
  }
  function sync(){
    if(closed)return;$('#mpModeAnchor').setAttribute('aria-pressed',String(mode==='anchor'));$('#mpModeRoute').setAttribute('aria-pressed',String(mode==='route'));
    $('#mpHelp').textContent=mode==='anchor'?'Haz clic sobre el objeto para marcar la zona de peso (por ejemplo, la cabeza). La flecha indica hacia dónde mira.':'Clic: añade un nodo al final; arrastra al crearlo para curvar. Arrastra nodos y tiradores; Alt rompe la simetría. Mayús + clic añade un nodo aunque haya otro debajo (para cerrar un rizo). Doble clic borra un nodo; Ctrl + clic sobre la línea inserta uno. La zona gris queda fuera de cuadro.';
    const set=(id,v)=>{const el=$(id);if(document.activeElement!==el)el.value=String(v);};
    set('#mpTime',time);$('#mpTimeLabel').textContent=`${time.toFixed(2)} s / ${duration.toFixed(2)} s`;set('#mpStart',Number(m.start.toFixed(3)));set('#mpEnd',Number(m.end.toFixed(3)));$('#mpEasing').value=m.easing;$('#mpLoop').checked=m.loop;$('#mpOrient').value=m.orient;set('#mpForward',m.forward);set('#mpInertia',m.inertia);set('#mpOffset',m.angleOffset);set('#mpScale',m.scale);$('#mpScaleSame').checked=m.scaleEnd==null;$('#mpScaleEnd').disabled=m.scaleEnd==null;set('#mpScaleEnd',m.scaleEnd??m.scale);
    paint();void refresh();
  }
  const change=fn=>e=>{fn(e);sync();};
  const num=(id,a,b,fn)=>{$(id).oninput=e=>{const v=Number(e.target.value);if(e.target.value!==''&&Number.isFinite(v)&&v>=a&&v<=b){fn(v);sync();}};};
  num('#mpStart',-604800,604800,v=>m.start=v);num('#mpEnd',-604800,604800,v=>m.end=v);num('#mpForward',-360,360,v=>m.forward=v);num('#mpInertia',0,1,v=>m.inertia=v);num('#mpOffset',-180,180,v=>m.angleOffset=v);num('#mpScale',.01,10,v=>m.scale=v);num('#mpScaleEnd',.01,10,v=>m.scaleEnd=v);
  $('#mpTime').oninput=e=>{stop();time=Number(e.target.value);sync();};
  $('#mpEasing').onchange=change(e=>m.easing=e.target.value);$('#mpLoop').onchange=change(e=>m.loop=e.target.checked);$('#mpOrient').onchange=change(e=>m.orient=e.target.value);$('#mpGhosts').onchange=paint;
  $('#mpScaleSame').onchange=change(e=>m.scaleEnd=e.target.checked?null:m.scale);
  $('#mpFaceRight').onclick=change(()=>m.forward=0);$('#mpFaceLeft').onclick=change(()=>m.forward=180);
  $('#mpStartHere').onclick=change(()=>m.start=time);$('#mpEndHere').onclick=change(()=>m.end=time);$('#mpWhole').onclick=change(()=>{m.start=0;m.end=Math.max(.05,duration);});
  $('#mpModeAnchor').onclick=change(()=>{stop();mode='anchor';});$('#mpModeRoute').onclick=change(()=>mode='route');
  $('#mpClear').onclick=change(()=>{stop();m.nodes=[];mode='route';});
  const pointer=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*CW,y:(e.clientY-r.top)/r.height*CH};};
  function hit(p){for(const [k,n] of m.nodes.entries()){if(Math.hypot(toC(n).x-p.x,toC(n).y-p.y)<10)return {k,part:'node'};}for(const [k,n] of m.nodes.entries())for(const part of ['in','out'])if(n[part]){const h=toC(n[part]);if(Math.hypot(h.x-p.x,h.y-p.y)<9)return {k,part};}return null;}
  // Nearest point on the drawn route (canvas px) as segment index + Bézier parameter.
  function nearest(p){let best=null;for(let i=0;i<m.nodes.length-1;i++){const a=m.nodes[i],b=m.nodes[i+1],P=[a,a.out||a,b.in||b,b].map(toC);for(let s=0;s<=1;s+=1/60){const r=1-s,x=r*r*r*P[0].x+3*r*r*s*P[1].x+3*r*s*s*P[2].x+s*s*s*P[3].x,y=r*r*r*P[0].y+3*r*r*s*P[1].y+3*r*s*s*P[2].y+s*s*s*P[3].y,d=Math.hypot(x-p.x,y-p.y);if(!best||d<best.d)best={d,i,s};}}return best;}
  function insert(i,s){const a=m.nodes[i],b=m.nodes[i+1],L=(p,q)=>({x:p.x+(q.x-p.x)*s,y:p.y+(q.y-p.y)*s}),P0=a,P1=a.out||a,P2=b.in||b,P3=b,A=L(P0,P1),B=L(P1,P2),C=L(P2,P3),D=L(A,B),E=L(B,C),X=L(D,E);if(a.out)a.out={x:A.x,y:A.y};if(b.in)b.in={x:C.x,y:C.y};m.nodes.splice(i+1,0,{x:X.x,y:X.y,...(a.out||b.in?{in:{x:D.x,y:D.y},out:{x:E.x,y:E.y}}:{})});}
  canvas.onpointerdown=e=>{
    if(e.button!==0||closed)return;e.preventDefault();stop();const p=pointer(e);
    if(mode==='anchor'){m.anchor=(q=>({x:clamp(q.x,0,1),y:clamp(q.y,0,1)}))(fromC(p));sync();return;}
    if(m.nodes.length>=200){status('Máximo de 200 nodos.');return;}
    const h=e.shiftKey?null:hit(p);
    if(!h&&e.ctrlKey){const n=nearest(p);if(n&&n.d<12){insert(n.i,n.s);sync();}return;}
    if(h)drag={...h,start:p,node:structuredClone(m.nodes[h.k])};else{m.nodes.push(fromC(p));drag={k:m.nodes.length-1,part:'new',start:p};}
    try{canvas.setPointerCapture(e.pointerId);}catch{}sync();
  };
  canvas.onpointermove=e=>{
    if(!drag||closed)return;const p=pointer(e),q=fromC(p),n=m.nodes[drag.k];if(!n)return;
    if(drag.part==='node'){const dx=q.x-drag.node.x,dy=q.y-drag.node.y,mv=v=>v&&{x:v.x+dx,y:v.y+dy};Object.assign(n,{x:q.x,y:q.y});if(drag.node.in)n.in=mv(drag.node.in);if(drag.node.out)n.out=mv(drag.node.out);}
    else if(drag.part==='new'){if(Math.hypot(p.x-drag.start.x,p.y-drag.start.y)<4)return;n.out=q;n.in={x:2*n.x-q.x,y:2*n.y-q.y};}
    else{n[drag.part]=q;if(e.altKey)n.mode='corner';const other=drag.part==='in'?'out':'in';if(n.mode!=='corner'&&n[other]){const len=Math.hypot(n[other].x-n.x,n[other].y-n.y),dx=n.x-q.x,dy=n.y-q.y,d=Math.hypot(dx,dy)||1;n[other]={x:n.x+dx/d*len,y:n.y+dy/d*len};}}
    paint();void refresh();
  };
  canvas.onpointerup=canvas.onpointercancel=()=>{drag=null;sync();};
  canvas.ondblclick=e=>{if(mode!=='route')return;const h=hit(pointer(e));if(h?.part==='node'){m.nodes.splice(h.k,1);sync();}};
  function stop(){playing=false;if(!closed)$('#mpPlay').textContent='▶ Reproducir';}
  $('#mpPlay').onclick=async()=>{if(playing){stop();return;}if(!valid()){status('Dibuja una ruta de al menos dos nodos.');return;}mode='route';playing=true;$('#mpPlay').textContent='❚❚ Pausar';const from=clamp(m.start,0,duration),to=clamp(m.end,0,duration);if(time>=to-.01||time<from)time=from;const t0=performance.now(),base=time;
    while(playing&&!closed){time=Math.min(to,base+(performance.now()-t0)/1000);sync();await new Promise(r=>requestAnimationFrame(r));while(rendering&&!closed)await new Promise(r=>requestAnimationFrame(r));if(time>=to)break;}stop();};
  const finish=()=>{if(!clip.isConnected)throw Error('El evento ya no existe');historyCheckpoint();};
  $('#mpApply').onclick=async()=>{try{if(m.nodes.length<2)throw Error('Dibuja una ruta de al menos dos nodos.');LQTACMotion.validate(m);finish();const {version,enabled,...rest}=m;clip.dataset.motionPath=JSON.stringify({version:1,enabled:true,...rest});motionDialog.close();toast('Trayectoria aplicada al clip');}catch(e){status(e.message);}};
  $('#mpRemove').onclick=()=>{try{finish();delete clip.dataset.motionPath;motionDialog.close();toast('Trayectoria quitada del clip');}catch(e){status(e.message);}};
  $('#mpCancel').onclick=()=>motionDialog.close();
  motionDialog.onclose=()=>{stop();closed=true;delete window.motionPathDraft;if(motionPathSession===session)motionPathSession=null;void renderTimelineAt(savedTime);};
  const session={clip,model:m,get time(){return time},setTime:t=>{time=clamp(t,0,duration);sync();},setMode:v=>{mode=v;sync();},pointer:(x,y)=>({x:F.ox+x*F.w,y:F.oy+y*F.h}),rendered:async()=>{while((rendering||dirty)&&!closed)await new Promise(r=>setTimeout(r,20));},canvas};motionPathSession=session;
  motionDialog.showModal();status('Los cambios solo se guardan al aplicar.');sync();
}
const motionPathButton=document.createElement('button');motionPathButton.id='openMotionPath';motionPathButton.type='button';motionPathButton.className='solid-btn';motionPathButton.textContent='Trayectoria · ruta';$('#openVisualCrop').after(motionPathButton);
motionPathButton.onclick=()=>{const clip=selectedTimelineClips.find(c=>c.dataset.kind==='video')||selectedTimelineClip;if(clip?.dataset.kind==='video')openMotionPathEditor(clip);else toast('Selecciona un evento de vídeo');};
