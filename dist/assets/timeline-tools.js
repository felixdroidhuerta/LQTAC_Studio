// Timeline navigation, export region and grouped dock navigation.
(function(){
const style=document.createElement('style');style.textContent=`
.ruler{position:sticky;top:0;z-index:12;background:#0c203c;touch-action:none;user-select:none}
.track-labels{z-index:13}.ruler .ruler-tick{position:absolute;top:6px;z-index:3;pointer-events:none;white-space:nowrap}.timeline-playhead::before{display:none}#rulerPlayhead{position:absolute;top:24px;width:2px;z-index:6;pointer-events:none}
#rulerPlayhead::before{content:"";position:absolute;top:-6px;left:-4px;width:10px;height:8px;background:var(--accent-2);clip-path:polygon(0 0,100% 0,50% 100%)}
#rulerPlayhead .timeline-playhead-time{max-width:110px}#rulerPlayhead.edge .timeline-playhead-time{left:auto;right:7px}
.render-region{position:absolute;top:0;bottom:0;background:rgba(121,229,245,.18);border-inline:2px solid var(--cyan);pointer-events:none;z-index:2}
.render-region-handle{position:absolute;top:0;bottom:0;width:9px;cursor:ew-resize;pointer-events:auto;touch-action:none;background:rgba(121,229,245,.3)}
.render-region-handle.start{left:-3px}.render-region-handle.end{right:-3px}
#tracks.range-highlight-active > .track::after{content:"";position:absolute;top:0;bottom:0;left:var(--render-range-left);width:var(--render-range-width);background:rgba(121,229,245,.20);border-inline:2px solid rgba(121,229,245,.85);pointer-events:none;z-index:5}
.dock-panel-list details{border-bottom:1px solid var(--line);padding-bottom:5px}.dock-panel-list summary{cursor:pointer;padding:9px 4px;color:var(--muted);font-size:10px;letter-spacing:.08em;text-transform:uppercase}.dock-panel-list details .dock-panel-item{width:100%}
.render-range-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}.render-range-fields input{width:100%;background:#081a32;color:var(--text);border:1px solid var(--line);padding:8px;border-radius:6px}
`;document.head.append(style);
const ready=()=>!exporting&&!historyBusy&&!document.querySelector('dialog[open]')&&!modal.classList.contains('open')&&!compatModal.classList.contains('open');
const actions=$('.timeline-actions');
const controls=document.createElement('span');controls.innerHTML='<button class="timeline-tool" data-range="in" title="Marcar inicio en el cabezal · I">Inicio I</button> <button class="timeline-tool" data-range="out" title="Marcar fin en el cabezal · O">Fin O</button> <button class="timeline-tool" data-range="clear" title="Renderizar todos los clips activos">Todo</button>';actions.prepend(controls);
function refreshRange(){
 const tracks=$('#tracks'),ruler=$('.ruler');if(!ruler)return;let region=$('.render-region',ruler);const range=window.lqtacRenderRange;
 tracks.classList.toggle('range-highlight-active',!!range);
 if(!range){region?.remove();tracks.style.removeProperty('--render-range-left');tracks.style.removeProperty('--render-range-width');return;}
 tracks.style.setProperty('--render-range-left',range.start/timelineDurationSeconds*100+'%');tracks.style.setProperty('--render-range-width',(range.end-range.start)/timelineDurationSeconds*100+'%');
 if(!region){region=document.createElement('div');region.className='render-region';region.innerHTML='<span class="render-region-handle start" data-bound="start" title="Inicio del tramo"></span><span class="render-region-handle end" data-bound="end" title="Fin del tramo"></span>';ruler.append(region);}
 region.style.left=range.start/timelineDurationSeconds*100+'%';region.style.width=(range.end-range.start)/timelineDurationSeconds*100+'%';region.title=`Renderizar ${range.start.toFixed(3)} – ${range.end.toFixed(3)} s`;
}
let cancelRangeDrag=null;
function setRange(range){window.lqtacRenderRange=range;refreshRange();syncRangeFields();}
const rangeMenu=document.createElement('div');rangeMenu.id='renderRangeMenu';rangeMenu.className='clip-context-menu';rangeMenu.setAttribute('role','menu');rangeMenu.innerHTML='<button type="button" role="menuitem">Quitar selección <span style="float:right;margin-left:24px;color:var(--muted)">Ctrl+Supr</span></button>';document.body.append(rangeMenu);
const hideRangeMenu=()=>rangeMenu.classList.remove('open');
function clearRange(){cancelRangeDrag?.();setRange(null);hideRangeMenu();toast('Selección de render quitada · se renderizarán todos los clips activos');}
rangeMenu.querySelector('button').onclick=clearRange;
$('#tracks').addEventListener('contextmenu',event=>{const range=window.lqtacRenderRange;if(!range||!ready()||!event.target.closest('.ruler'))return;const rect=$('#tracks').getBoundingClientRect(),time=(event.clientX-rect.left)/rect.width*timelineDurationSeconds;if(time<range.start-0.001||time>range.end+0.001)return;event.preventDefault();event.stopImmediatePropagation();hideClipContextMenu();rangeMenu.classList.add('open');rangeMenu.style.left=Math.max(4,Math.min(event.clientX,innerWidth-rangeMenu.offsetWidth-8))+'px';rangeMenu.style.top=Math.max(4,Math.min(event.clientY,innerHeight-rangeMenu.offsetHeight-8))+'px';rangeMenu.querySelector('button').focus();},true);
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#renderRangeMenu'))hideRangeMenu();});timelineBody.addEventListener('scroll',hideRangeMenu);window.addEventListener('resize',hideRangeMenu);
window.addEventListener('keydown',event=>{
 if(event.key!=='Escape'&&event.key!=='Delete')return;
 const otherDialog=[...document.querySelectorAll('dialog[open]')].some(d=>d!==renderDialog);
 const typing=event.target.closest?.('input,textarea,select,[contenteditable=true]')||document.activeElement?.isContentEditable;
 if(event.key==='Delete'&&event.ctrlKey&&(!typing||renderDialog.open)&&!event.altKey&&!event.metaKey&&!exporting&&!historyBusy&&!otherDialog&&!modal.classList.contains('open')&&!compatModal.classList.contains('open')){event.preventDefault();event.stopImmediatePropagation();clearRange();return;}
 if(event.key==='Escape'&&rangeMenu.classList.contains('open')){event.preventDefault();event.stopImmediatePropagation();hideRangeMenu();}
},true);
function mark(which){if(!ready())return;let range=window.lqtacRenderRange;
 if(which==='clear'){clearRange();return;}
 if(!range){try{const b=LQTACRenderRange.bounds(projectSnapshot(),null);range={start:b.start,end:b.end};}catch{range={start:0,end:timelineDurationSeconds};}}
 const t=timelineTime,step=1/24;if(which==='in'){range={start:t,end:Math.max(range.end,t+step)};}else range={start:Math.min(range.start,Math.max(0,t-step)),end:t};
 if(range.end<=range.start){toast('El fin debe estar después del inicio');return;}setRange(range);
}
controls.onclick=e=>{const value=e.target.closest('[data-range]')?.dataset.range;if(value)mark(value);};
$('#tracks').addEventListener('pointerdown',event=>{
 const handle=event.target.closest('[data-bound]');if(event.button!==0||!ready()||!event.target.closest('.ruler')||(!event.shiftKey&&!handle))return;
 event.preventDefault();event.stopImmediatePropagation();stopTimelinePlayback();const previous=window.lqtacRenderRange?{...window.lqtacRenderRange}:null;
 const at=e=>{const r=$('#tracks').getBoundingClientRect();return Math.max(0,Math.min(timelineDurationSeconds,(e.clientX-r.left)/r.width*timelineDurationSeconds));};
 const anchor=at(event),bound=handle?.dataset.bound;let end=anchor;
 const move=e=>{if(e.pointerId!==event.pointerId)return;end=at(e);const r=bound?{...previous,[bound]:end}:{start:Math.min(anchor,end),end:Math.max(anchor,end)};if(r.end-r.start>=1/240)setRange(r);};
 const finish=e=>{if(e?.pointerId!==undefined&&e.pointerId!==event.pointerId)return;if(e?.type==='pointerup')move(e);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',cancel);window.removeEventListener('keydown',escape);cancelRangeDrag=null;};
 const cancel=e=>{finish(e);setRange(previous);};const escape=e=>{if(e.key==='Escape')cancel();};cancelRangeDrag=()=>cancel();window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',cancel);window.addEventListener('keydown',escape);
},true);
const fields=document.createElement('div');fields.innerHTML='<label><input type="checkbox" id="renderUseRange"> Renderizar solo el tramo elegido</label><div class="render-range-fields"><label>Inicio (s)<input id="renderRangeStart" type="number" min="0" step="0.001"></label><label>Fin (s)<input id="renderRangeEnd" type="number" min="0" step="0.001"></label></div><p id="renderRangeInfo" role="status"></p>';
$('#renderStatus').before(fields);
function syncRangeFields(){const r=window.lqtacRenderRange;$('#renderUseRange').checked=!!r;let b;try{b=LQTACRenderRange.bounds(projectSnapshot(),r);}catch{}$('#renderRangeStart').value=(r?.start??b?.start??0).toFixed(3);$('#renderRangeEnd').value=(r?.end??b?.end??0).toFixed(3);$('#renderRangeInfo').textContent=b?`${b.start.toFixed(3)} – ${b.end.toFixed(3)} s · ${b.duration.toFixed(3)} s · se respetan Mute y Solo`:'No hay clips activos que renderizar.';}
fields.addEventListener('change',event=>{if(exporting)return;try{if(event.target.id==='renderUseRange'&&!event.target.checked){setRange(null);return;}const r={start:Number($('#renderRangeStart').value),end:Number($('#renderRangeEnd').value)};LQTACRenderRange.validate(r);setRange(r);}catch(error){$('#renderRangeInfo').textContent=error.message;}});
function exportRange(){const r=$('#renderUseRange').checked?{start:Number($('#renderRangeStart').value),end:Number($('#renderRangeEnd').value)}:null;LQTACRenderRange.bounds(projectSnapshot(),r);if(r)setRange(r);return r;}
// Validate before entering the existing asynchronous export handler.
$('#renderGo').addEventListener('click',event=>{try{exportRange();}catch(error){event.preventDefault();event.stopImmediatePropagation();$('#renderStatus').textContent=error.message;}},true);
new MutationObserver(()=>{if(renderDialog.open&&!exporting)syncRangeFields();fields.querySelectorAll('input').forEach(i=>i.disabled=exporting);}).observe(renderDialog,{attributes:true,attributeFilter:['open']});new MutationObserver(()=>{fields.querySelectorAll('input').forEach(i=>i.disabled=$('#renderGo').disabled);}).observe($('#renderGo'),{attributes:true,attributeFilter:['disabled']});
// A track deletion removes only that row and its events, never the media files.
const deleteTrack=document.createElement('button');deleteTrack.type='button';deleteTrack.dataset.action='delete-track';deleteTrack.textContent='Eliminar pista';deleteTrack.style.display='none';clipContextMenu.append(deleteTrack);
new MutationObserver(()=>{deleteTrack.style.display=contextTrack&&!contextClip?'block':'none';if(clipContextMenu.classList.contains('open')&&contextTrack){clipContextMenu.style.top=Math.max(4,Math.min(parseFloat(clipContextMenu.style.top)||0,innerHeight-clipContextMenu.offsetHeight-8))+'px';}}).observe(clipContextMenu,{attributes:true,attributeFilter:['class']});
function removeTrack(track){if(!ready()||!track?.isConnected)return;historyCheckpoint();stopTimelinePlayback();const index=$$('.track').indexOf(track),label=$$('#trackLabels .track-label')[index];track.remove();label?.remove();applyTimelineSelection([]);selectedTransitionPair=null;selectedEnvelopePoint=null;hideClipContextMenu();refreshTimelineScale();syncTrackHeaders();void renderTimelineAt(timelineTime);toast('Pista eliminada · Ctrl+Z para recuperarla');}
deleteTrack.onclick=()=>removeTrack(contextTrack);
$('#trackLabels').addEventListener('contextmenu',event=>{const label=event.target.closest('.track-label');if(!label||!ready())return;const track=$$('.track')[$$('#trackLabels .track-label').indexOf(label)];if(track){event.preventDefault();event.stopPropagation();showTrackContextMenu(event,track);deleteTrack.style.display='block';clipContextMenu.style.top=Math.max(4,Math.min(event.clientY,innerHeight-clipContextMenu.offsetHeight-8))+'px';}});
// Collapsible sections retain the original command buttons and their handlers.
const list=$('.dock-panel-list'),buttons=[...list.querySelectorAll('.dock-panel-item')];
for(const [title,names] of [['Medios',['Project Media','Explorer']],['Edición',['Transiciones','FX','Generadores','Notas']],['Proyecto',['Subtítulos','Proyecto']]]){const section=document.createElement('details');section.open=title==='Medios'||title==='Edición';const summary=document.createElement('summary');summary.textContent=title;section.append(summary);for(const button of buttons)if(names.includes($('strong',button)?.textContent.trim()))section.append(button);list.append(section);}
const capture=document.createElement('details');capture.open=false;capture.innerHTML='<summary>Grabaciones</summary>';for(const b of [micDock,cameraDock,screenDock])capture.append(b);list.append(capture);
$('#gifNotice').textContent=$('#gifNotice').textContent.replace('Se exporta todo el proyecto.','Se respeta el tramo elegido y Mute/Solo.');
document.addEventListener('keydown',event=>{if(!ready()||event.ctrlKey||event.metaKey||event.altKey||event.target.closest?.('input,textarea,select,[contenteditable=true]')||document.activeElement?.isContentEditable)return;
 if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();stopTimelinePlayback();const delta=(event.shiftKey?1:1/24)*(event.key==='ArrowLeft'?-1:1);const time=Math.max(0,Math.min(timelineDurationSeconds,timelineTime+delta));const x=time/timelineDurationSeconds*$('#tracks').offsetWidth,left=timelineBody.scrollLeft,width=timelineBody.clientWidth-250;if(x<left||x>left+width)timelineBody.scrollLeft=Math.max(0,x-width/2);void renderTimelineAt(time);}
 else if(!event.shiftKey&&['i','o'].includes(event.key.toLowerCase())){event.preventDefault();mark(event.key.toLowerCase()==='i'?'in':'out');}
});
window.LQTACTimelineTools={refreshRange,setRange,exportRange,removeTrack,clearRange};
const observer=new MutationObserver(()=>{const head=$('#rulerPlayhead');if(head)head.classList.toggle('edge',timelineTime/timelineDurationSeconds>.85);});observer.observe($('#tracks'),{subtree:true,attributes:true,attributeFilter:['style'],childList:true});
demoReady.then(()=>{refreshRange();syncRangeFields();});
})();
