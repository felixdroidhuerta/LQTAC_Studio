// Project files retain the original media path. Derived files are regenerable local caches.
window.LQTACReverse=(()=>{
  const cache=new Map();
  function options(clip){return {filePath:clip.dataset.filePath,kind:clip.dataset.kind,offset:Number(clip.dataset.sourceOffsetSeconds)||0,duration:clipTiming(clip).durationSeconds*Number(clip.dataset.playbackRate||1)};}
  function path(clip){
    const value=options(clip),key=JSON.stringify({...value,offset:Number(value.offset.toFixed(6)),duration:Number(value.duration.toFixed(6))});
    if(!cache.has(key)){const task=window.lqtacDesktop.prepareReverse(value);cache.set(key,task);task.catch(()=>cache.delete(key));}
    return cache.get(key);
  }
  async function invert(clip,wholeGroup=false){
    if(!clip?.isConnected||historyBusy||exporting||document.querySelector('dialog[open]'))return false;
    const targets=wholeGroup?groupMembers(clip):[clip],media=targets.filter(c=>c.dataset.kind!=='subtitle');if(!media.length)return false;
    hideClipContextMenu();stopTimelinePlayback();historyBusy=true;updateHistoryButtons();
    const previousInert=$('.workspace').inert;$('.workspace').inert=true;
    const dialog=document.createElement('dialog');dialog.className='work-dialog';dialog.id='reverseDialog';dialog.style.width='min(460px,90vw)';dialog.innerHTML='<h2>Preparando reproducción invertida</h2><p>Se conserva el archivo original. La preparación es local.</p><progress max="1" value="0" style="width:100%"></progress><p role="status"></p><footer><button type="button">Cancelar</button></footer>';document.body.append(dialog);dialog.showModal();
    let cancelled=false,index=0,committed=false;const jobs=media.filter(c=>c.dataset.reverse!=='true');
    const previous=targets.map(c=>({clip:c,start:c.dataset.startSeconds,reverse:c.dataset.reverse})),oldUndo=[...undoHistory],oldRedo=[...redoHistory];
    const cancel=()=>{cancelled=true;dialog.querySelector('button').disabled=true;dialog.querySelector('[role=status]').textContent='Cancelando…';void window.lqtacDesktop.cancelReverse();};
    dialog.querySelector('button').onclick=cancel;dialog.oncancel=e=>{e.preventDefault();cancel();};
    const unsubscribe=window.lqtacDesktop.onReverseProgress(p=>{dialog.querySelector('progress').value=(index+Math.max(0,Math.min(1,p.fraction||0)))/Math.max(1,jobs.length);});
    try{
      for(const c of jobs){if(cancelled)break;dialog.querySelector('[role=status]').textContent=`${index+1} / ${jobs.length} · ${c.firstChild?.textContent||'Medio'}`;await path(c);index++;}
      if(cancelled)return false;
      const left=Math.min(...targets.map(c=>clipTiming(c).startSeconds)),right=Math.max(...targets.map(c=>{const t=clipTiming(c);return t.startSeconds+t.durationSeconds;}));
      historyBusy=false;historyCheckpoint();historyBusy=true;committed=true;
      for(const c of targets){const t=clipTiming(c);if(wholeGroup)c.dataset.startSeconds=String(Math.max(0,left+right-t.startSeconds-t.durationSeconds));if(c.dataset.kind!=='subtitle')c.dataset.reverse=String(c.dataset.reverse!=='true');}
      refreshTimelineScale();$$('.track').forEach(updateTrackTransitions);applyTimelineSelection(targets);await renderTimelineAt(timelineTime);
      toast(wholeGroup?'Grupo invertido · orden temporal y medios invertidos':'Dirección del clip cambiada · original intacto');return true;
    }catch(error){if(committed){for(const p of previous){if(p.start===undefined)delete p.clip.dataset.startSeconds;else p.clip.dataset.startSeconds=p.start;if(p.reverse===undefined)delete p.clip.dataset.reverse;else p.clip.dataset.reverse=p.reverse;}undoHistory.splice(0,undoHistory.length,...oldUndo);redoHistory.splice(0,redoHistory.length,...oldRedo);refreshTimelineScale();$$('.track').forEach(updateTrackTransitions);}if(!cancelled)alert('No se pudo invertir el medio. El proyecto conserva sus ajustes anteriores.\n'+error.message);return false;}
    finally{unsubscribe();dialog.close();dialog.remove();historyBusy=false;$('.workspace').inert=previousInert;updateHistoryButtons();}
  }
  return {path,options,invert};
})();
