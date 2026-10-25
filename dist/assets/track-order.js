// Reorder paired headers/rows on drop; clips and their group identities stay intact.
(function(){
const labels=$('#trackLabels'),body=$('.timeline-body');
const style=document.createElement('style');style.textContent=`
#trackLabels .track-label-title strong{cursor:grab;touch-action:none;user-select:none}
#trackLabels .track-label.reordering{opacity:.45!important}
body.reordering-track,body.reordering-track *{cursor:grabbing!important;user-select:none!important}
.track-order-indicator{position:fixed;height:2px;background:var(--cyan);box-shadow:0 0 7px #79e5f566;pointer-events:none;z-index:10020}
.track-order-ghost{position:fixed;max-width:240px;padding:9px 14px;background:#102747;border:1px solid var(--cyan);border-radius:6px;color:var(--text);font-size:12px;pointer-events:none;z-index:10021;box-shadow:0 6px 20px #0006;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
`;document.head.append(style);
const available=()=>!exporting&&!historyBusy&&!effectsBusy&&!document.querySelector('dialog[open]')&&!modal.classList.contains('open')&&!compatModal.classList.contains('open');
const headers=()=>[...labels.children].filter(n=>n.classList.contains('track-label'));
const titles=()=>headers().forEach(h=>{const t=$('strong',h);if(t)t.title='Arrastra hacia arriba o abajo para cambiar la posición de la pista';});
new MutationObserver(titles).observe(labels,{childList:true});titles();
let gesture=null;
labels.addEventListener('pointerdown',event=>{
 const title=event.target.closest('.track-label-title strong');
 if(!title||event.button!==0||gesture||!available())return;
 const original=headers(),header=title.closest('.track-label'),from=original.indexOf(header),rows=$$('.track'),track=rows[from];
 if(!track||original.length<2)return;
 event.preventDefault();event.stopPropagation();
 const id=event.pointerId,startY=event.clientY,others=original.filter(h=>h!==header);
 let active=false,slot=from,lastY=startY,lastX=event.clientX,frame=0,lastTick=0,indicator,ghost;
 const session={cancel:()=>finish(false)};gesture=session;
 try{title.setPointerCapture(id);}catch{}
 function clean(){
  cancelAnimationFrame(frame);window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',cancel,true);window.removeEventListener('keydown',key,true);window.removeEventListener('blur',cancel);title.removeEventListener('lostpointercapture',lost);
  try{if(title.hasPointerCapture(id))title.releasePointerCapture(id);}catch{}
  indicator?.remove();ghost?.remove();header.classList.remove('reordering');document.body.classList.remove('reordering-track');if(gesture===session)gesture=null;
 }
 function finish(commit){
  const valid=active&&commit&&available()&&track.isConnected&&original.every((h,i)=>headers()[i]===h)&&rows.every((r,i)=>$$('.track')[i]===r);
  clean();if(!valid||slot===from)return;
  historyCheckpoint();const before=others[slot]||null,reference=before?rows[original.indexOf(before)]:null;
  labels.insertBefore(header,before);$('#tracks').insertBefore(track,reference);
  syncTrackHeaders();void renderTimelineAt(timelineTime);toast('Pista reordenada · Ctrl+Z para deshacer');
 }
 function paint(){
  slot=others.filter(h=>lastY>h.getBoundingClientRect().top+h.getBoundingClientRect().height/2).length;
  const area=body.getBoundingClientRect(),before=others[slot],edge=before?before.getBoundingClientRect().top:others.at(-1).getBoundingClientRect().bottom;
  indicator.hidden=slot===from||edge<area.top+24||edge>area.top+body.clientHeight;
  Object.assign(indicator.style,{left:area.left+'px',top:(edge-1)+'px',width:body.clientWidth+'px'});
  Object.assign(ghost.style,{left:Math.max(4,Math.min(innerWidth-260,lastX+16))+'px',top:Math.max(4,Math.min(innerHeight-45,lastY+14))+'px'});
 }
 function tick(now){
  if(!active)return;if(!available()||!track.isConnected){finish(false);return;}
  const r=body.getBoundingClientRect(),top=r.top+24,bottom=r.top+body.clientHeight,margin=35;
  const speed=lastY<top+margin?-Math.min(1,(top+margin-lastY)/margin):lastY>bottom-margin?Math.min(1,(lastY-bottom+margin)/margin):0;
  const dt=lastTick?Math.min(40,now-lastTick):16;lastTick=now;body.scrollTop+=speed*dt*.65;paint();frame=requestAnimationFrame(tick);
 }
 function move(e){
  if(e.pointerId!==id)return;lastY=e.clientY;lastX=e.clientX;
  if(!active&&Math.abs(lastY-startY)<5)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(!active){active=true;stopTimelinePlayback();hideClipContextMenu();window.getSelection()?.removeAllRanges();header.classList.add('reordering');document.body.classList.add('reordering-track');indicator=document.createElement('div');indicator.className='track-order-indicator';ghost=document.createElement('div');ghost.className='track-order-ghost';ghost.textContent=title.textContent;document.body.append(indicator,ghost);frame=requestAnimationFrame(tick);}
  paint();
 }
 function up(e){if(e.pointerId!==id)return;if(active){move(e);e.preventDefault();e.stopImmediatePropagation();}finish(true);}
 function cancel(e){if(e?.pointerId!==undefined&&e.pointerId!==id)return;finish(false);}
 function lost(e){if(e.pointerId===id)finish(false);}
 function key(e){if(e.key==='Escape'||((e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase()))){e.preventDefault();e.stopImmediatePropagation();finish(false);}else if(active){e.preventDefault();e.stopImmediatePropagation();}}
 window.addEventListener('pointermove',move,{capture:true,passive:false});window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',cancel,true);window.addEventListener('keydown',key,true);window.addEventListener('blur',cancel);title.addEventListener('lostpointercapture',lost);
},true);
})();
