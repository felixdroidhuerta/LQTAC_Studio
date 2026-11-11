// FFmpeg command graphs. Curves use event-local seconds, never project positions.
const {audioDefaults,validate,valueAt,creativeAudio}=require('../dist/assets/effects-model.js');
const n=value=>Number(value).toFixed(9);
function checkSegment(segment){if(!segment||!Number.isFinite(segment.offset)||segment.offset<0||!Number.isFinite(segment.duration)||segment.duration<=0||segment.duration>604800||!Number.isFinite(segment.rate)||segment.rate<.25||segment.rate>4)throw Error('Fragmento de audio animado no válido');}
// Per-sample tremolo with animated speed/depth. The phase is the exact integral of the linear speed curve, so speed changes never jump;
// intervals are looked up with a balanced if() tree to keep the expression shallow.
function tremoloExpression(f,d){
  const hz=f.animation.tremoloHz,depth=f.animation.tremoloDepth,times=[...new Set([0,...[...(hz||[]),...(depth||[])].map(p=>Math.min(d,p.time)).filter(t=>t>0&&t<d),d])].sort((a,b)=>a-b),pieces=[];
  let phase=0;
  for(let i=0;i<times.length-1;i++){const a=times[i],b=times[i+1],f0=valueAt(hz,a,f.tremoloHz),f1=valueAt(hz,b,f.tremoloHz),d0=valueAt(depth,a,f.tremoloDepth),d1=valueAt(depth,b,f.tremoloDepth),u=`(t-${n(a)})`;
    pieces.push({end:b,expr:`(1-(${n(d0)}+${n((d1-d0)/(b-a))}*${u})*(0.5-0.5*sin(${n(phase)}+${n(2*Math.PI*f0)}*${u}+${n(Math.PI*(f1-f0)/(b-a))}*${u}*${u})))`});phase+=Math.PI*(f0+f1)*(b-a);}
  const tree=(lo,hi)=>lo===hi?pieces[lo].expr:(m=>`if(lt(t,${n(pieces[m].end)}),${tree(lo,m)},${tree(m+1,hi)})`)((lo+hi)>>1);
  const gain=tree(0,pieces.length-1);return `aeval=exprs='val(0)*${gain}|val(1)*${gain}':c=same`;
}
// Source → event-local timeline (offset, speed via pitch-preserving atempo), shared with the autotune analysis.
function baseChain(segment){const tempo=[];let rate=segment.rate;while(rate>2){tempo.push('atempo=2');rate/=2;}while(rate<.5){tempo.push('atempo=0.5');rate/=.5;}tempo.push('atempo='+n(rate));return `atrim=start=${n(segment.offset)}:duration=${n(segment.duration*segment.rate)},asetpts=PTS-STARTPTS,${tempo.join(',')}`;}
function build(fx,segment,prefix,extra={}){
  validate(fx,'audio');checkSegment(segment);const f={...audioDefaults,...fx},d=segment.duration,files=[],graph=[];
  for(const points of Object.values(f.animation))if(points.at(-1).time>d+.002)throw Error('La curva excede el clip de audio');
  let serial=0,current='base';
  graph.push(`[0:a:0]${baseChain(segment)},aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,apad,atrim=duration=${n(d)}[base]`);
  const initial=key=>valueAt(f.animation[key],0,f[key]);
  function controller(key,target,command,transform=x=>x){
    const points=f.animation[key];if(!points?.length)return '';
    const times=[...new Set([0,...points.map(p=>Math.min(d,p.time)).filter(t=>t>0&&t<d),d])].sort((a,b)=>a-b),lines=[];
    for(let i=0;i<times.length-1;i++){const a=times[i],b=times[i+1],v0=valueAt(points,a,f[key]),v1=valueAt(points,b,f[key]),expr=transform(`(${n(v0)}+(${n(v1-v0)})*TI)`);lines.push(`${n(a)}-${n(b)} [expr] ${target} ${command} '${expr}';`);}
    const name=prefix+'-cmd'+files.length+'.txt';files.push({name,content:lines.join('\n')});return `asetnsamples=n=256:p=0,asendcmd=f='${name}',`;
  }
  function stage(filters){const next='stage'+serial++;graph.push(`[${current}]${filters}[${next}]`);current=next;}
  if(f.highpass)stage(controller('highpassHz','highpass@hp','frequency')+`highpass@hp=f=${n(initial('highpassHz'))}:poles=2`);
  if(f.lowpass)stage(controller('lowpassHz','lowpass@lp','frequency')+`lowpass@lp=f=${n(initial('lowpassHz'))}:poles=2`);
  if(f.gate)stage(controller('gateDb','agate@gate','threshold',x=>`pow(10,${x}/20)`)+`agate@gate=threshold=${n(10**(initial('gateDb')/20))}:range=0.01:ratio=4:attack=5:release=150`);
  if(f.denoise)stage(controller('denoiseDb','afftdn@noise','nr',x=>`max(0.01,${x})`)+`afftdn@noise=nr=${n(Math.max(.01,initial('denoiseDb')))}`);
  for(const [key,hz] of [['bass',120],['mid',1000],['treble',8000]])if(f[key]||f.animation[key])stage(controller(key,'equalizer@'+key,'gain')+`equalizer@${key}=f=${hz}:t=q:w=1:g=${n(initial(key))}`);
  if(f.deesser&&(f.deesserAmount||f.animation.deesserAmount)){
    // Dry / fully de-essed crossfade: the amount becomes a linear, animatable mix (FFmpeg's deesser has no runtime commands).
    const s=serial++;graph.push(`[${current}]asplit=2[dsd${s}][dsi${s}]`);
    graph.push(`[dsd${s}]${controller('deesserAmount','volume@dsDry','volume',x=>`(1-(${x}))`)}volume@dsDry=${n(1-initial('deesserAmount'))}[dso${s}]`);
    graph.push(`[dsi${s}]deesser=i=1:m=0.5:f=0.5:s=o,${controller('deesserAmount','volume@dsWet','volume')}volume@dsWet=${n(initial('deesserAmount'))}[dsw${s}]`);
    graph.push(`[dso${s}][dsw${s}]amix=inputs=2:normalize=0:duration=first[ds${s}]`);current='ds'+s;
  }
  if(f.compressor){const control=controller('thresholdDb','acompressor@comp','threshold',x=>`pow(10,${x}/20)`)+controller('ratio','acompressor@comp','ratio');stage(control+`acompressor@comp=threshold=${n(10**(initial('thresholdDb')/20))}:ratio=${n(initial('ratio'))}:attack=10:release=150:makeup=1`);}
  if(f.autotune){
    // Correction curve (semitones every HOP s) computed beforehand from the source; merged into linear pieces for the command file.
    const curve=extra.autotuneCurve,hop=extra.autotuneHop||.01;if(!curve?.length)throw Error('Falta el análisis de tono del autotune');
    const keep=[0];for(let i=1;i<curve.length-1;i++){const last=keep.at(-1),span=i+1-last,expected=curve[last]+(curve[i+1]-curve[last])*(i-last)/span;if(Math.abs(curve[i]-expected)>.02||i-last>=50)keep.push(i);}keep.push(curve.length-1);
    const lines=[];for(let k=0;k<keep.length-1;k++){const a=Math.min(d,keep[k]*hop),b=Math.min(d,keep[k+1]*hop);if(b<=a)continue;const v0=curve[keep[k]],v1=curve[keep[k+1]];lines.push(`${n(a)}-${n(b)} [expr] rubberband@tune pitch 'pow(2,(${n(v0)}+(${n(v1-v0)})*TI)/12)';`);}
    const name=prefix+'-cmd'+files.length+'.txt';files.push({name,content:lines.join('\n')});
    stage(`asetnsamples=n=256:p=0,asendcmd=f='${name}',rubberband@tune=pitch=${n(2**(curve[0]/12))}:formant=preserved:pitchq=quality:window=short`);
  }
  // Creative stages: same static text as the simple chain; animatable ones get a named instance and a command file.
  if(f.pitch)stage(controller('pitchSemitones','rubberband@pitch','pitch',x=>`pow(2,${x}/12)`)+`rubberband@pitch=pitch=${n(2**(initial('pitchSemitones')/12))}:formant=${f.pitchFormant?'preserved':'shifted'}:pitchq=quality`);
  const chorusAnimated=f.chorus&&!!(f.animation.chorusDepth||f.animation.chorusMix),tremoloAnimated=f.tremolo&&!!(f.animation.tremoloHz||f.animation.tremoloDepth);
  if(chorusAnimated){
    // Same levels as the static chorus (dry .9/(1+.7·mix), wet .9·mix); an animated depth crossfades a shallow and a deep chorus.
    const s=serial++,chorus=depth=>`chorus=0:0.9:45|62:0.45|0.35:0.25|0.4:${n(depth)}|${n(depth*1.3)}`;
    graph.push(`[${current}]asplit=2[chd${s}][chi${s}]`);
    graph.push(`[chd${s}]${controller('chorusMix','volume@chDry','volume',x=>`(0.9/(1+0.7*(${x})))`)}volume@chDry=${n(.9/(1+.7*initial('chorusMix')))}[cho${s}]`);
    if(f.animation.chorusDepth){graph.push(`[chi${s}]asplit=2[cha${s}][chb${s}]`);graph.push(`[cha${s}]${chorus(1)},${controller('chorusDepth','volume@chA','volume',x=>`(1-(${x}))`)}volume@chA=${n(1-initial('chorusDepth'))}[chao${s}]`);graph.push(`[chb${s}]${chorus(4)},${controller('chorusDepth','volume@chB','volume')}volume@chB=${n(initial('chorusDepth'))}[chbo${s}]`);graph.push(`[chao${s}][chbo${s}]amix=inputs=2:normalize=0:duration=first[chm${s}]`);}
    else graph.push(`[chi${s}]${chorus(1+3*f.chorusDepth)}[chm${s}]`);
    graph.push(`[chm${s}]${controller('chorusMix','volume@chWet','volume')}volume@chWet=${n(initial('chorusMix'))}[chw${s}]`);
    graph.push(`[cho${s}][chw${s}]amix=inputs=2:normalize=0:duration=first[chorus${s}]`);current='chorus'+s;
  }
  for(const filter of creativeAudio({...f,pitch:false,lofi:false,widen:false,pan:false,chorus:f.chorus&&!chorusAnimated,tremolo:f.tremolo&&!tremoloAnimated}))stage(filter);
  if(tremoloAnimated)stage(tremoloExpression(f,d));
  if(f.lofi)stage(controller('lofiAmount','acrusher@crush','samples',x=>`(1+19*${x})`)+`acrusher@crush=samples=${n(1+19*initial('lofiAmount'))}:mix=1:aa=0.5`);
  if(f.widen)stage(controller('widenAmount','extrastereo@wide','m')+`extrastereo@wide=m=${n(initial('widenAmount'))}:c=false`);
  if(f.pan)stage(controller('panPosition','stereotools@pan','balance_out')+`stereotools@pan=balance_out=${n(initial('panPosition'))}`);
  if(f.echo){
    const suffix=serial++,dry='edry'+suffix,wet='ewet'+suffix,signal='esignal'+suffix,next='echo'+suffix;
    graph.push(`[${current}]asplit=2[${dry}][${signal}]`);
    graph.push(`[${signal}]${controller('echoMs','adelay@echoDelay','delays')}adelay@echoDelay=delays=${n(initial('echoMs'))}:all=1,${controller('echoMix','volume@echoWet','volume')}volume@echoWet=${n(initial('echoMix'))}[${wet}]`);
    graph.push(`[${dry}][${wet}]amix=inputs=2:normalize=0:duration=first[${next}]`);current=next;
  }
  if(f.reverb){
    const suffix=serial++,dry='rdry'+suffix,wet='rwet'+suffix,next='reverb'+suffix,taps=[29,43,71,113,173,251],coefficients=[.55,.45,.35,.25,.18,.1];
    graph.push(`[${current}]asplit=7[${dry}]${taps.map((_,i)=>`[ri${suffix}_${i}]`).join('')}`);
    taps.forEach((delay,i)=>graph.push(`[ri${suffix}_${i}]adelay=${delay}:all=1,volume=${coefficients[i]}[ro${suffix}_${i}]`));
    graph.push(`${taps.map((_,i)=>`[ro${suffix}_${i}]`).join('')}amix=inputs=6:normalize=0,${controller('reverbMix','volume@reverbWet','volume')}volume@reverbWet=${n(initial('reverbMix'))}[${wet}]`);
    graph.push(`[${dry}][${wet}]amix=inputs=2:normalize=0:duration=first[${next}]`);current=next;
  }
  if(f.convReverb){
    // Synthetic room response generated inside the graph: no IR files, deterministic seed.
    const s=serial++,size=f.convSize;
    // afir RMS auto-gain grows with the room size; measured on pink noise: ≈ 8.8·size^0.22. Keeps mix 1 near the dry level.
    const comp=1/(8.8*Math.pow(size,.22));
    graph.push(`aevalsrc=exprs='(random(0)*2-1)*exp(-6.9*t/${n(size)})':d=${n(size)}:s=48000,lowpass=f=7000,adelay=12:all=1[cir${s}]`);
    graph.push(`[${current}]asplit=2[cdry${s}][cin${s}]`);
    graph.push(`[cin${s}][cir${s}]afir=dry=1:wet=1:irfmt=mono:gtype=rms:maxir=${n(size+.1)},${controller('convMix','volume@convWet','volume',x=>`(${x})*${n(comp)}`)}volume@convWet=${n(initial('convMix')*comp)}[cwet${s}]`);
    graph.push(`[cdry${s}][cwet${s}]amix=inputs=2:normalize=0:duration=first[conv${s}]`);current='conv'+s;
  }
  if(f.normalize){stage(`loudnorm=I=${n(f.targetLufs)}:TP=-1:LRA=11,aresample=48000`);stage(controller('targetLufs','volume@lufs','volume',x=>`pow(10,(${x}-${n(f.targetLufs)})/20)`)+`volume@lufs=${n(10**((initial('targetLufs')-f.targetLufs)/20))}`);}
  if(f.limiter)stage(controller('limiterCeiling','alimiter@limit','limit')+`alimiter@limit=limit=${n(initial('limiterCeiling'))}:level=false:latency=true`);
  graph.push(`[${current}]aresample=48000,apad,atrim=duration=${n(d)},asetpts=PTS-STARTPTS[out]`);
  return {graph:graph.join(';\n'),files};
}
module.exports={build,checkSegment,baseChain,n};
