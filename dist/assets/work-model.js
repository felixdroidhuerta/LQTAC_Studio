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
  function stretchClips(clips,index,edge,delta){
    const ref=clips[index];if(!ref||!['start','end'].includes(edge)||!Number.isFinite(delta)||clips.some(c=>!Number.isFinite(c.startSeconds)||!(c.durationSeconds>0)||!Number.isFinite(c.durationSeconds)))throw Error('Estiramiento no válido');
    const anchor=ref.startSeconds+(edge==='start'?ref.durationSeconds:0);
    let low=0,high=Infinity;
    for(const c of clips){
      const rate=c.playbackRate??1;
      low=Math.max(low,1/24/c.durationSeconds,rate/4);high=Math.min(high,rate/.25);
      const left=c.startSeconds-anchor,right=c.startSeconds+c.durationSeconds-anchor;
      if(left<0)high=Math.min(high,anchor/-left);
      if(right>0)high=Math.min(high,(604800-anchor)/right);
    }
    const scale=clamp(1+(edge==='end'?delta:-delta)/ref.durationSeconds,low,high);
    const fx=input=>input?{...input,animation:Object.fromEntries(Object.entries(input.animation||{}).map(([key,points])=>[key,points.map(p=>({...p,time:p.time*scale}))]))}:input;
    const marks=list=>list?.map(p=>({...p,start:p.start*scale,end:p.end*scale}));
    return {scale,anchor,clips:clips.map(c=>{
      let subtitleStyle=c.subtitleStyle;
      if(subtitleStyle?.karaoke){subtitleStyle=structuredClone(subtitleStyle);const k=subtitleStyle.karaoke;k.offset=(k.offset||0)*scale;k.words=marks(k.words);if(k.syncMarks)k.syncMarks=marks(k.syncMarks);if(k.syllables)k.syllables.marks=marks(k.syllables.marks);}
      return {...c,startSeconds:Math.max(0,anchor+(c.startSeconds-anchor)*scale),durationSeconds:c.durationSeconds*scale,
        playbackRate:c.kind==='subtitle'?(c.playbackRate??1):(c.playbackRate??1)/scale,
        fadeInSeconds:(c.fadeInSeconds||0)*scale,fadeOutSeconds:(c.fadeOutSeconds||0)*scale,
        panCrop:c.panCrop?.map(f=>({...f,time:f.time*scale})),videoFx:fx(c.videoFx),audioFx:fx(c.audioFx),subtitleStyle};
    })};
  }
  function repeatRanges(state,edge,delta){
    const {startSeconds,durationSeconds,offset,source,rate}=state;
    const start=startSeconds+(edge==='start'?delta:0),duration=durationSeconds+(edge==='start'?-delta:delta);
    if(!['start','end'].includes(edge)||![start,duration,offset,source,rate,delta].every(Number.isFinite)||start<-.000001||duration<=0||source<=0||rate<=0)throw Error('Repetición no válida');
    let position=offset+(edge==='start'?delta*rate:0),elapsed=0;const result=[];
    while(elapsed<duration-.0000001){
      if(result.length>=10000)throw Error('El proyecto admite como máximo 10000 eventos');
      let phase=((position%source)+source)%source;if(phase<.0000001||source-phase<.0000001)phase=0;
      const length=Math.min(duration-elapsed,(source-phase)/rate);
      result.push({startSeconds:Math.max(0,start+elapsed),durationSeconds:length,sourceOffsetSeconds:phase,localOffset:result.length?0:position<0?phase/rate:edge==='start'?delta:0});
      elapsed+=length;position+=length*rate;
    }
    return result;
  }
  const api={enabled,cropAt,drawCrop,balance,defaults,curveAt,fadeGain,curveFormula,calibrated,stretchClips,repeatRanges};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.LQTACWork=api;
})(typeof window==='undefined'?globalThis:window);
