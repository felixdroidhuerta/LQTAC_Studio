// Shared export bounds. Timeline/source times stay absolute throughout composition.
(function(root){
  function bounds(project,selection){
    const tracks=project.tracks||[],enabled=root.LQTACWork?.enabled || (typeof module==='object'?require('./work-model.js').enabled:null);
    const active=tracks.filter(t=>enabled(t,tracks)).flatMap(t=>t.clips.filter(c=>!c.mute));
    if(!active.length)throw Error('No hay clips activos que renderizar.');
    let start=Math.min(...active.map(c=>c.startSeconds)),end=Math.max(...active.map(c=>c.startSeconds+c.durationSeconds));
    if(selection!=null){validate(selection);start=selection.start;end=selection.end;}
    const visible=active.filter(c=>c.startSeconds<end&&c.startSeconds+c.durationSeconds>start);
    if(!visible.length)throw Error('El tramo elegido no contiene clips activos.');
    return {start,end,duration:end-start};
  }
  function validate(range){if(!range||!Number.isFinite(range.start)||!Number.isFinite(range.end)||range.start<0||range.end<=range.start||range.end>604800)throw Error('El tramo de renderizado debe tener un inicio y fin válidos (en segundos).');return range;}
  const api={bounds,validate};if(typeof module==='object'&&module.exports)module.exports=api;else root.LQTACRenderRange=api;
})(typeof globalThis==='object'?globalThis:this);
