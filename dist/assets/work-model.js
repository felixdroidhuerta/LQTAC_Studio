// Shared editing semantics used by preview, persistence and FFmpeg export.
(function(root){
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const defaults={x:.5,y:.5,width:1,height:1,rotation:0};
  function enabled(track,tracks){return !track.mute&&(!tracks.some(t=>t.kind===track.kind&&t.solo&&!t.mute)||!!track.solo);}
  function cropAt(frames,time){
    if(!frames?.length)return {...defaults};
    const b=frames.find(f=>f.time>time),a=[...frames].reverse().find(f=>f.time<=time)||frames[0];
    const p=b&&b.time>a.time?clamp((time-a.time)/(b.time-a.time),0,1):0;
    return Object.fromEntries(Object.keys(defaults).map(k=>[k,a[k]+((b||a)[k]-a[k])*p]));
  }
  function drawCrop(ctx,source,width,height,crop){
    const sw=source.videoWidth||source.width,sh=source.videoHeight||source.height;
    if(!sw||!sh)return;
    const cw=sw*crop.width,ch=sh*crop.height,scale=Math.min(width/cw,height/ch);
    ctx.save();ctx.beginPath();ctx.rect((width-cw*scale)/2,(height-ch*scale)/2,cw*scale,ch*scale);ctx.clip();
    ctx.translate(width/2,height/2);ctx.rotate(-crop.rotation*Math.PI/180);ctx.scale(scale,scale);
    ctx.drawImage(source,-crop.x*sw,-crop.y*sh,sw,sh);ctx.restore();
  }
  // Stereo balance: center leaves both channels unchanged; endpoints silence one.
  function balance(pan){return {left:pan>0?1-pan:1,right:pan<0?1+pan:1};}
  function curveFormula(type,p){p=clamp(p,0,1);switch(type){case 'Linear':return p;case 'Fast':return 1-(1-p)**2;case 'Slow':return p*p;case 'Smooth':return p*p*(3-2*p);case 'Sharp':return ((2*p-1)**3+1)/2;case 'None':return p>=1?1:0;default:return null;}}
  function calibrated(type,table){return curveFormula(type,.5)!==null&&Array.isArray(table)&&table.length>=2&&table.every((v,i)=>Number.isFinite(v)&&Math.abs(v-curveFormula(type,i/(table.length-1)))<=.000002);}
  function curveAt(type,p,tables){
    p=clamp(p,0,1);const table=tables?.[type];if(!table?.length)return p;
    if(calibrated(type,table))return curveFormula(type,p);
    const x=p*(table.length-1),i=Math.floor(x),j=Math.min(i+1,table.length-1);return table[i]+(table[j]-table[i])*(x-i);
  }
  function fadeGain(clip,local){
    const fi=clip.fadeInSeconds||0,fo=clip.fadeOutSeconds||0;
    return (fi>0?curveAt(clip.fadeInCurve,local/fi,clip.vegasCurves):1)*(fo>0?1-curveAt(clip.fadeOutCurve,(local-clip.durationSeconds+fo)/fo,clip.vegasCurves):1);
  }
  const api={enabled,cropAt,drawCrop,balance,defaults,curveAt,fadeGain,curveFormula,calibrated};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.LQTACWork=api;
})(typeof window==='undefined'?globalThis:window);
