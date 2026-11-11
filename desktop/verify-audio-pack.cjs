// Audio pack: every new filter runs in the static and the animated (segment) FFmpeg paths, with measurable effects.
// Usage: node verify-audio-pack.cjs
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {promisify}=require('node:util'),run=promisify(require('node:child_process').execFile);
const engine=require('./render-engine.cjs'),service=require('./effects-audio.cjs'),model=require('../dist/assets/effects-model.js');
async function samples(file){const b=await fs.readFile(file);let p=12,start=0,size=0;while(p+8<=b.length){const id=b.toString('ascii',p,p+4),len=b.readUInt32LE(p+4);if(id==='data'){start=p+8;size=len;break;}p+=8+len+(len%2);}
  const n=Math.floor(size/8),L=new Float32Array(n),R=new Float32Array(n);for(let i=0;i<n;i++){L[i]=b.readFloatLE(start+i*8);R[i]=b.readFloatLE(start+i*8+4);}return {L,R,rate:48000};}
const rms=(a,from=0,to=a.length)=>{let s=0;for(let i=from;i<to;i++)s+=a[i]*a[i];return Math.sqrt(s/Math.max(1,to-from));};
const freq=(a,from,to,rate)=>{let z=0;for(let i=from+1;i<to;i++)if(a[i-1]<=0&&a[i]>0)z++;return z/((to-from)/rate);};
(async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'lqtac-audio-pack-')),cache=path.join(root,'cache'),ff=engine.ffmpegPath();
  // 440 Hz tone for 1.5 s, then quiet noise for 1.5 s (gate / reverb tail), slightly different L/R (width).
  const source=path.join(root,'source.wav');
  await run(ff,['-v','error','-y','-f','lavfi','-i','sine=frequency=440:duration=1.5:sample_rate=48000','-f','lavfi','-i','anoisesrc=d=1.5:c=white:a=0.004:r=48000:seed=7','-f','lavfi','-i','sine=frequency=660:duration=3:sample_rate=48000',
    '-filter_complex','[0][1]concat=n=2:v=0:a=1,volume=0.5[m];[2]volume=0.08[s];[m][s]join=inputs=2:channel_layout=stereo[o]','-map','[o]','-c:a','pcm_f32le',source],{windowsHide:true});
  const base=await samples(await service.prepare(source,{...model.audioDefaults,enabled:true,bass:.001},cache));
  const segment={offset:0,duration:3,rate:1},on=extra=>({...model.audioDefaults,enabled:true,...extra});
  const cases={
    highpass:on({highpass:true,highpassHz:1000}),lowpass:on({lowpass:true,lowpassHz:500}),gate:on({gate:true,gateDb:-30}),deesser:on({deesser:true,deesserAmount:1}),
    pitch:on({pitch:true,pitchSemitones:12}),pitchShifted:on({pitch:true,pitchSemitones:-5,pitchFormant:false}),chorus:on({chorus:true,chorusDepth:1,chorusMix:1}),tremolo:on({tremolo:true,tremoloHz:8,tremoloDepth:1}),
    lofi:on({lofi:true,lofiAmount:.8}),widen:on({widen:true,widenAmount:3}),conv:on({convReverb:true,convSize:1.2,convMix:.8})
  };
  const out={};
  for(const [name,fx] of Object.entries(cases)){const file=await service.prepare(source,fx,cache,model.animatedAudio(fx)?segment:undefined);out[name]=await samples(file);assert(out[name].L.length>48000*2.9,name+' too short');}
  const tone=[4800,4800*14],tail=[48000*1.6,48000*2.9];
  const r={baseTone:rms(base.L,...tone),hp:rms(out.highpass.L,...tone),lp:rms(out.lowpass.L,...tone),gateNoise:rms(out.gate.L,...tail),baseNoise:rms(base.L,...tail),
    pitchHz:freq(out.pitch.L,...tone,48000),pitchShiftedHz:freq(out.pitchShifted.L,...tone,48000),tremolo:[rms(out.tremolo.L,4800,4800+3000),rms(out.tremolo.L,4800+3000,4800+6000)],
    lofiDiff:rms(out.lofi.L.map((v,i)=>v-base.L[i]),...tone),baseSide:rms(base.L.map((v,i)=>v-base.R[i]),...tone),wideSide:rms(out.widen.L.map((v,i)=>v-out.widen.R[i]),...tone),
    convTail:rms(out.conv.L,48000*1.52,48000*1.9),baseTail:rms(base.L,48000*1.52,48000*1.9),chorusDiff:rms(out.chorus.L.map((v,i)=>v-base.L[i]),...tone)};
  console.log(JSON.stringify(r,null,1));
  assert(r.hp<r.baseTone*.2,'high-pass did not attenuate 440 Hz');assert(r.lp<r.baseTone*.98,'low-pass changed nothing');
  assert(r.gateNoise<r.baseNoise*.3,'gate did not close on noise');assert(Math.abs(r.pitchHz-880)<25,'pitch +12 not at 880 Hz');assert(Math.abs(r.pitchShiftedHz-330)<15,'pitch -5 not at 330 Hz');
  assert(Math.abs(r.tremolo[0]-r.tremolo[1])>.02,'tremolo did not modulate');assert(r.lofiDiff>.005,'lo-fi did not quantize');assert(r.wideSide>r.baseSide*1.5,'widen did not widen');
  assert(r.convTail>r.baseTail*2&&r.convTail<r.baseTone*2,'convolution reverb tail missing or too loud');assert(r.chorusDiff>.01,'chorus changed nothing');const hiss=path.join(root,'hiss.wav');await run(ff,['-v','error','-y','-f','lavfi','-i','anoisesrc=d=2:c=white:a=0.3:r=48000:seed=5','-af','aformat=channel_layouts=stereo','-c:a','pcm_f32le',hiss],{windowsHide:true});
  const hp=async fx=>{const all={...model.audioDefaults,enabled:true,highpass:true,highpassHz:1000,...fx},f=await service.prepare(hiss,all,cache,model.animatedAudio(all)?{offset:0,duration:2,rate:1}:undefined);const s=await samples(f);return rms(s.L,4800,90000);};
  r.deessHiss=(await hp({deesser:true,deesserAmount:1}))/(await hp({}));console.log('de-esser on loud hiss',r.deessHiss.toFixed(3));assert(r.deessHiss<.8,'de-esser did not act on hiss');
  console.log('Static and segment paths for all new filters OK');
  // Animated curves for every animatable new parameter.
  const animated=on({highpass:true,lowpass:true,gate:true,pitch:true,lofi:true,widen:true,convReverb:true,animation:{highpassHz:[{time:0,value:20},{time:3,value:600}],lowpassHz:[{time:0,value:20000},{time:3,value:800}],gateDb:[{time:0,value:-80},{time:3,value:-30}],pitchSemitones:[{time:0,value:0},{time:3,value:7}],lofiAmount:[{time:0,value:0},{time:3,value:1}],widenAmount:[{time:0,value:1},{time:3,value:3}],convMix:[{time:0,value:0},{time:3,value:1}]}});
  model.validate(animated,'audio');const anim=await samples(await service.prepare(source,animated,cache,segment));assert(anim.L.length>48000*2.9);
  console.log('Animated graph with highpass/lowpass/gate/pitch/lofi/widen/convolution curves OK');
  // Pan, and the formerly fixed de-esser / chorus / tremolo parameters, now follow curves.
  const prep=async fx=>{model.validate(fx,'audio');return samples(await service.prepare(source,fx,cache,model.animatedAudio(fx)?segment:undefined));},early=[4800,4800*6],late=[4800*9,4800*14];
  const panL=await prep(on({pan:true,panPosition:-1})),panMove=await prep(on({pan:true,animation:{panPosition:[{time:0,value:-1},{time:1.5,value:1}]}}));
  r.pan={staticR:rms(panL.R,...tone),staticL:rms(panL.L,...tone),earlyR:rms(panMove.R,0,2400),lateL:rms(panMove.L,48000*1.45,48000*1.5)};
  console.log(JSON.stringify(r.pan));assert(r.pan.staticR<.001&&r.pan.staticL>r.baseTone*.9,'static pan left failed');assert(r.pan.earlyR<.01&&r.pan.lateL<.05,'animated pan did not travel');
  const env=s=>{const w=480,o=[];for(let i=4800;i+w<48000*1.45;i+=w)o.push(rms(s.L,i,i+w));return o;},swing=(a,from,to)=>{const p=a.slice(from,to);return Math.max(...p)-Math.min(...p);};
  const tremDepth=env(await prep(on({tremolo:true,tremoloHz:6,animation:{tremoloDepth:[{time:0,value:0},{time:1.5,value:1}]}}))),tremSpeed=await prep(on({tremolo:true,tremoloDepth:1,animation:{tremoloHz:[{time:0,value:2},{time:1.5,value:15}]}}));
  r.tremoloAnim={earlySwing:swing(tremDepth,0,30),lateSwing:swing(tremDepth,tremDepth.length-30,tremDepth.length),finite:tremSpeed.L.every(Number.isFinite)};
  assert(r.tremoloAnim.lateSwing>r.tremoloAnim.earlySwing*3&&r.tremoloAnim.finite,'animated tremolo depth/speed failed');
  const chorusMove=await prep(on({chorus:true,chorusDepth:.8,animation:{chorusMix:[{time:0,value:0},{time:1.5,value:1}]}})),chorusDeep=await prep(on({chorus:true,chorusMix:1,animation:{chorusDepth:[{time:0,value:0},{time:1.5,value:1}]}}));
  const diff=(s,a,b)=>rms(s.L.map((v,i)=>v-base.L[i]),a,b);r.chorusAnim={early:diff(chorusMove,...early),late:diff(chorusMove,...late),deep:chorusDeep.L.every(Number.isFinite)&&diff(chorusDeep,...late)>.01};
  assert(r.chorusAnim.late>r.chorusAnim.early*2&&r.chorusAnim.deep,'animated chorus failed');
  const dess=async fx=>{const all={...model.audioDefaults,enabled:true,...fx};model.validate(all,'audio');return samples(await service.prepare(hiss,all,cache,{offset:0,duration:2,rate:1}));};
  const dry=await dess({}),dessMove=await dess({deesser:true,animation:{deesserAmount:[{time:0,value:0},{time:2,value:1}]}});
  r.deesserAnim={early:rms(dessMove.L,0,9600)/rms(dry.L,0,9600),late:rms(dessMove.L,86400,96000)/rms(dry.L,86400,96000)};
  assert(r.deesserAnim.early>.9&&r.deesserAnim.late<.8,'animated de-esser failed');
  console.log(JSON.stringify({pan:r.pan,tremolo:r.tremoloAnim,chorus:r.chorusAnim,deesser:r.deesserAnim}));console.log('Pan and animated de-esser/chorus/tremolo OK');
  await fs.rm(root,{recursive:true,force:true});console.log('AUDIO PACK VERIFICATION PASSED');
})().catch(e=>{console.error(e);process.exit(1);});
