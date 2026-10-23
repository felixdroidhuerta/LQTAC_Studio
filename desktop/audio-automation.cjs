// FFmpeg command graphs. Curves use event-local seconds, never project positions.
const {audioDefaults,validate,valueAt}=require('../dist/assets/effects-model.js');
const n=value=>Number(value).toFixed(9);
function checkSegment(segment){if(!segment||!Number.isFinite(segment.offset)||segment.offset<0||!Number.isFinite(segment.duration)||segment.duration<=0||segment.duration>604800||!Number.isFinite(segment.rate)||segment.rate<.25||segment.rate>4)throw Error('Fragmento de audio animado no válido');}
function build(fx,segment,prefix){
  validate(fx,'audio');checkSegment(segment);const f={...audioDefaults,...fx},d=segment.duration,files=[],graph=[];
  for(const points of Object.values(f.animation))if(points.at(-1).time>d+.002)throw Error('La curva excede el clip de audio');
  let serial=0,current='base';
  const tempo=[];let rate=segment.rate;while(rate>2){tempo.push('atempo=2');rate/=2;}while(rate<.5){tempo.push('atempo=0.5');rate/=.5;}tempo.push('atempo='+n(rate));
  graph.push(`[0:a:0]atrim=start=${n(segment.offset)}:duration=${n(d*segment.rate)},asetpts=PTS-STARTPTS,${tempo.join(',')},aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,apad,atrim=duration=${n(d)}[base]`);
  const initial=key=>valueAt(f.animation[key],0,f[key]);
  function controller(key,target,command,transform=x=>x){
    const points=f.animation[key];if(!points?.length)return '';
    const times=[...new Set([0,...points.map(p=>Math.min(d,p.time)).filter(t=>t>0&&t<d),d])].sort((a,b)=>a-b),lines=[];
    for(let i=0;i<times.length-1;i++){const a=times[i],b=times[i+1],v0=valueAt(points,a,f[key]),v1=valueAt(points,b,f[key]),expr=transform(`(${n(v0)}+(${n(v1-v0)})*TI)`);lines.push(`${n(a)}-${n(b)} [expr] ${target} ${command} '${expr}';`);}
    const name=prefix+'-cmd'+files.length+'.txt';files.push({name,content:lines.join('\n')});return `asetnsamples=n=256:p=0,asendcmd=f='${name}',`;
  }
  function stage(filters){const next='stage'+serial++;graph.push(`[${current}]${filters}[${next}]`);current=next;}
  if(f.denoise)stage(controller('denoiseDb','afftdn@noise','nr',x=>`max(0.01,${x})`)+`afftdn@noise=nr=${n(Math.max(.01,initial('denoiseDb')))}`);
  for(const [key,hz] of [['bass',120],['mid',1000],['treble',8000]])if(f[key]||f.animation[key])stage(controller(key,'equalizer@'+key,'gain')+`equalizer@${key}=f=${hz}:t=q:w=1:g=${n(initial(key))}`);
  if(f.compressor){const control=controller('thresholdDb','acompressor@comp','threshold',x=>`pow(10,${x}/20)`)+controller('ratio','acompressor@comp','ratio');stage(control+`acompressor@comp=threshold=${n(10**(initial('thresholdDb')/20))}:ratio=${n(initial('ratio'))}:attack=10:release=150:makeup=1`);}
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
  if(f.normalize){stage(`loudnorm=I=${n(f.targetLufs)}:TP=-1:LRA=11,aresample=48000`);stage(controller('targetLufs','volume@lufs','volume',x=>`pow(10,(${x}-${n(f.targetLufs)})/20)`)+`volume@lufs=${n(10**((initial('targetLufs')-f.targetLufs)/20))}`);}
  if(f.limiter)stage(controller('limiterCeiling','alimiter@limit','limit')+`alimiter@limit=limit=${n(initial('limiterCeiling'))}:level=false:latency=true`);
  graph.push(`[${current}]aresample=48000,apad,atrim=duration=${n(d)},asetpts=PTS-STARTPTS[out]`);
  return {graph:graph.join(';\n'),files};
}
module.exports={build,checkSegment};
