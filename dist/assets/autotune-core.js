// Autotune core shared by the FFmpeg render (Node) and the live audition worklet.
// Pitch detection: YIN (de Cheveigné & Kawahara, 2002) on a mono signal around 16 kHz.
// Correction: nearest note of the chosen key/scale with hysteresis, smoothed by the retune speed.
(function(root){
  const scales={chromatic:[0,1,2,3,4,5,6,7,8,9,10,11],major:[0,2,4,5,7,9,11],minor:[0,2,3,5,7,8,10],harmonicMinor:[0,2,3,5,7,8,11],pentatonicMajor:[0,2,4,7,9],pentatonicMinor:[0,3,5,7,10],blues:[0,3,5,6,7,10]};
  const scaleNames=Object.keys(scales);
  const scaleLabels={chromatic:'Cromática (todas las notas)',major:'Mayor',minor:'Menor natural',harmonicMinor:'Menor armónica',pentatonicMajor:'Pentatónica mayor',pentatonicMinor:'Pentatónica menor',blues:'Blues'};
  const keyNames=['Do','Do♯ / Re♭','Re','Re♯ / Mi♭','Mi','Fa','Fa♯ / Sol♭','Sol','Sol♯ / La♭','La','La♯ / Si♭','Si'];
  const HOP=0.01,MIN_HZ=65,MAX_HZ=1100,MAX_SHIFT=2.5;
  function notes(key,scale){const k=((Math.round(key)%12)+12)%12;return (scales[scale]||scales.chromatic).map(n=>(n+k)%12);}
  function nearest(midi,pcs){let best=Math.round(midi),distance=Infinity;for(let n=Math.floor(midi)-3;n<=Math.ceil(midi)+3;n++){if(!pcs.includes(((n%12)+12)%12))continue;const d=Math.abs(n-midi);if(d<distance){distance=d;best=n;}}return best;}
  // Detector over a mono buffer: returns the fundamental in Hz, or 0 when silent/unvoiced.
  function detector(rate){
    const W=Math.round(rate*.032),tauMin=Math.max(2,Math.floor(rate/MAX_HZ)),tauMax=Math.ceil(rate/MIN_HZ),d=new Float64Array(tauMax+2);
    return {span:W+tauMax+2,detect(x,start){
      let energy=0;for(let j=0;j<W;j++){const v=x[start+j];energy+=v*v;}if(energy/W<2e-5)return 0;
      let sum=0;d[0]=1;for(let tau=1;tau<=tauMax+1;tau++){let s=0;for(let j=0;j<W;j++){const v=x[start+j]-x[start+j+tau];s+=v*v;}sum+=s;d[tau]=sum>0?s*tau/sum:1;}
      let best=-1;for(let tau=tauMin;tau<=tauMax;tau++){if(d[tau]<.15){while(tau<tauMax&&d[tau+1]<d[tau])tau++;best=tau;break;}}
      if(best<0)return 0;const a=d[best-1],b=d[best],c=d[best+1],den=a+c-2*b,period=best+(den>0?.5*(a-c)/den:0);return rate/period;}};
  }
  // Corrector: one step per HOP seconds. speed 0 = instant (robotic), 1 = slow and natural. Returns semitones to shift.
  // o.guide (MIDI note, 0 = guide silent) switches the target to the guide melody; without it the nearest scale note is used.
  // o.guideMode: 'notes' rounds the guide to whole notes, 'contour' copies its exact pitch (slides, vibrato).
  // o.fallback: 'scale' corrects by scale where the guide is silent, 'none' leaves the voice alone there. o.range: max shift (st).
  function corrector(){
    let shift=0,target=null,silent=0;
    return {step(freq,o){
      let goal;const range=o.range>0?o.range:MAX_SHIFT,guided=o.guide!==undefined&&o.guide!==null;
      if(freq>0){silent=0;const midi=69+12*Math.log2(freq/440);
        if(guided&&o.guide>0){let wanted=o.guideMode==='contour'?o.guide:Math.round(o.guide);wanted+=12*Math.round((midi-wanted)/12);target=null;goal=Math.max(-range,Math.min(range,wanted-midi));}
        else if(guided&&o.fallback==='none'){target=null;goal=0;}
        else{const candidate=nearest(midi,o.notes);if(target===null||Math.abs(midi-target)>Math.abs(midi-candidate)+.15)target=candidate;goal=Math.max(-range,Math.min(range,target-midi));}}
      else{silent+=HOP;if(silent>.08){target=null;goal=0;}else goal=shift;}
      const tau=Math.max(0,o.speed)*.3,alpha=tau<=0?1:1-Math.exp(-HOP/tau);shift+=(goal-shift)*alpha;return shift*o.amount;}};
  }
  // Guide melody: one MIDI value per HOP (0 = silent / unvoiced), median-filtered so single octave errors and blips disappear.
  function melody(samples,rate,duration){
    const det=detector(rate),steps=Math.max(1,Math.ceil(duration/HOP)+1),raw=new Float64Array(steps),out=new Array(steps).fill(0);
    for(let i=0;i<steps;i++){const start=Math.round(i*HOP*rate)-(det.span>>1),f=start>=0&&start+det.span<samples.length?det.detect(samples,start):0;raw[i]=f>0?69+12*Math.log2(f/440):0;}
    for(let i=0;i<steps;i++){if(!raw[i])continue;const near=[];for(let k=Math.max(0,i-2);k<=Math.min(steps-1,i+2);k++)if(raw[k])near.push(raw[k]);if(near.length<3)continue;near.sort((a,b)=>a-b);out[i]=Number(near[near.length>>1].toFixed(4));}
    return out;
  }
  // Guide pieces under a voice event: the guide-track events that overlap it, in voice-event seconds.
  // voice: {startSeconds,durationSeconds}; clips: [{filePath,startSeconds,durationSeconds,sourceOffsetSeconds,playbackRate,reverse}].
  function guidePieces(voice,clips){
    const v0=voice.startSeconds,v1=v0+voice.durationSeconds,pieces=[];
    for(const c of clips){const c0=c.startSeconds,c1=c0+c.durationSeconds,a=Math.max(v0,c0),b=Math.min(v1,c1);if(!c.filePath||!(b-a>.01))continue;
      pieces.push({filePath:c.filePath,at:a-v0,skip:a-c0,duration:b-a,offset:c.sourceOffsetSeconds||0,clipDuration:c.durationSeconds,rate:c.playbackRate||1,reverse:!!c.reverse});}
    return pieces.sort((x,y)=>x.at-y.at).slice(0,200);
  }
  // Offline curve: settingsAt(t) -> {key,scale,speed,amount,range,guideMode,fallback,guideOffset}. guide: melody() output or null.
  // Returns one shift (semitones) per HOP from t=0.
  function analyze(samples,rate,duration,settingsAt,guide=null){
    const det=detector(rate),cor=corrector(),out=[],steps=Math.max(1,Math.ceil(duration/HOP)+1);let cache='',pcs=null;
    for(let i=0;i<steps;i++){const t=i*HOP,s=settingsAt(t),sig=s.key+'|'+s.scale;if(sig!==cache){cache=sig;pcs=notes(s.key,s.scale);}
      const start=Math.round(t*rate)-(det.span>>1);const freq=start>=0&&start+det.span<samples.length?det.detect(samples,start):0;
      let g;if(guide){const index=i-Math.round((s.guideOffset||0)/HOP);g=index>=0&&index<guide.length?guide[index]:0;}
      out.push(cor.step(freq,{notes:pcs,speed:s.speed,amount:s.amount,range:s.range,guide:g,guideMode:s.guideMode,fallback:s.fallback}));}
    return out;
  }
  const guideModes=['notes','contour'],guideFallbacks=['scale','none'];
  const api={scales,scaleNames,scaleLabels,keyNames,notes,nearest,detector,corrector,melody,guidePieces,analyze,guideModes,guideFallbacks,HOP,MAX_SHIFT};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.LQTACAutotune=api;
})(typeof globalThis!=='undefined'?globalThis:this);
