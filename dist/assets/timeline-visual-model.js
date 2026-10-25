(function(root){
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function sourceTime(clip,local){const rate=clip.playbackRate??1,offset=clip.sourceOffsetSeconds||0;return Math.max(0,offset+(clip.reverse?clip.durationSeconds-clamp(local,0,clip.durationSeconds):clamp(local,0,clip.durationSeconds))*rate);}
  function sourceWindow(clip,from,to){const a=sourceTime(clip,from),b=sourceTime(clip,to);return {start:Math.min(a,b),end:Math.max(a,b),reverse:!!clip.reverse};}
  const api={sourceTime,sourceWindow};if(typeof module==='object'&&module.exports)module.exports=api;else root.LQTACTimelineVisualModel=api;
})(typeof window==='undefined'?globalThis:window);
