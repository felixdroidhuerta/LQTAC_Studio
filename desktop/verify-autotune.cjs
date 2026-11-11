// Autotune: shared YIN core and FFmpeg render path, measured on detuned test tones.
// Usage: node verify-autotune.cjs
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {promisify}=require('node:util'),run=promisify(require('node:child_process').execFile);
const engine=require('./render-engine.cjs'),service=require('./effects-audio.cjs'),model=require('../dist/assets/effects-model.js'),core=require('../dist/assets/autotune-core.js');
async function samples(file){const b=await fs.readFile(file);let p=12,start=0,size=0;while(p+8<=b.length){const id=b.toString('ascii',p,p+4),len=b.readUInt32LE(p+4);if(id==='data'){start=p+8;size=len;break;}p+=8+len+(len%2);}
  const n=Math.floor(size/8),L=new Float32Array(n);for(let i=0;i<n;i++)L[i]=b.readFloatLE(start+i*8);return L;}
const freq=(a,from,to)=>{let z=0,first=-1,last=-1;for(let i=from+1;i<to;i++)if(a[i-1]<=0&&a[i]>0){if(first<0)first=i-a[i]/(a[i]-a[i-1]);last=i-a[i]/(a[i]-a[i-1]);z++;}return (z-1)/((last-first)/48000);};
(async()=>{
  // Core alone: detection of a 220 Hz sawtooth-like tone at 16 kHz, and the nearest-note logic.
  const rate=16000,tone=new Float32Array(rate);for(let i=0;i<rate;i++){const t=i/rate;tone[i]=.4*Math.sin(2*Math.PI*220*t)+.2*Math.sin(2*Math.PI*440*t)+.1*Math.sin(2*Math.PI*660*t);}
  const det=core.detector(rate),f0=det.detect(tone,4000);assert(Math.abs(f0-220)<1,'YIN detected '+f0);
  assert.equal(core.nearest(70.14,core.notes(0,'major')),71);assert.equal(core.nearest(70.14,core.notes(0,'chromatic')),70);assert.equal(det.detect(new Float32Array(rate),0),0);
  console.log('YIN core OK',f0.toFixed(2));
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'lqtac-autotune-')),cache=path.join(root,'cache'),ff=engine.ffmpegPath(),source=path.join(root,'source.wav');
  // 450 Hz (A4 +0.39 st) for 1.5 s, then 470 Hz (A#4 +0.14 st) for 1.5 s.
  await run(ff,['-v','error','-y','-f','lavfi','-i','sine=frequency=450:duration=1.5:sample_rate=48000','-f','lavfi','-i','sine=frequency=470:duration=1.5:sample_rate=48000','-filter_complex','[0][1]concat=n=2:v=0:a=1,volume=0.5,aformat=channel_layouts=stereo[o]','-map','[o]','-c:a','pcm_f32le',source],{windowsHide:true});
  const segment={offset:0,duration:3,rate:1},on=extra=>({...model.audioDefaults,enabled:true,autotune:true,...extra});
  const render=async fx=>{model.validate(fx,'audio');assert(model.animatedAudio(fx));return samples(await service.prepare(source,fx,cache,segment));};
  const A=[48000*.5,48000*1.3],B=[48000*2,48000*2.8],r={};
  const chromatic=await render(on({autotuneSpeed:0}));r.chromatic=[freq(chromatic,...A),freq(chromatic,...B)];
  const major=await render(on({autotuneSpeed:0,autotuneScale:'major',autotuneKey:0}));r.major=[freq(major,...A),freq(major,...B)];
  const off=await render(on({autotuneAmount:0}));r.amount0=[freq(off,...A),freq(off,...B)];
  const half=await render(on({autotuneSpeed:0,animation:{autotuneAmount:[{time:0,value:0},{time:1.5,value:0},{time:1.6,value:1},{time:3,value:1}]}}));r.animated=[freq(half,...A),freq(half,...B)];
  console.log(JSON.stringify(r));
  const near=(v,target,tol)=>Math.abs(v-target)<tol;
  assert(near(r.chromatic[0],440,2.5)&&near(r.chromatic[1],466.16,2.5),'chromatic correction');
  assert(near(r.major[0],440,2.5)&&near(r.major[1],493.88,3),'C major correction');
  assert(near(r.amount0[0],450,2)&&near(r.amount0[1],470,2),'amount 0 must not change pitch');
  assert(near(r.animated[0],450,2)&&near(r.animated[1],466.16,2.5),'animated amount');
  assert.throws(()=>model.validate(on({autotuneScale:'dorian'}),'audio'));assert.throws(()=>model.validate(on({animation:{autotuneKey:[{time:0,value:1}]}}),'audio'));
  // Guide track. Core: guide note wins over the scale, folded to the voice octave; contour keeps the guide's exact pitch.
  {const c=core.corrector(),o={notes:core.notes(0,'chromatic'),speed:0,amount:1,range:7};
    assert(Math.abs(c.step(450,{...o,guide:72})-(72-(69+12*Math.log2(450/440))))<1e-9,'guide note');
    assert(Math.abs(core.corrector().step(450,{...o,guide:60})-(72-(69+12*Math.log2(450/440))))<1e-9,'octave folding');
    assert(Math.abs(core.corrector().step(450,{...o,guide:69.3,guideMode:'contour'})-(69.3-(69+12*Math.log2(450/440))))<1e-9,'contour');
    assert.equal(core.corrector().step(450,{...o,guide:0,fallback:'none'}),0);assert(Math.abs(core.corrector().step(450,{...o,guide:0,fallback:'scale'})+.3905)<.01,'scale fallback');
    assert(Math.abs(core.corrector().step(450,{...o,range:2.5,guide:73})-2.5)<1e-9,'range clamp');
    const pieces=core.guidePieces({startSeconds:10,durationSeconds:3},[{filePath:'g.wav',startSeconds:9,durationSeconds:2,sourceOffsetSeconds:4,playbackRate:1},{filePath:'h.wav',startSeconds:12.5,durationSeconds:5},{filePath:'x.wav',startSeconds:20,durationSeconds:1}]);
    assert.deepEqual(pieces,[{filePath:'g.wav',at:0,skip:1,duration:1,offset:4,clipDuration:2,rate:1,reverse:false},{filePath:'h.wav',at:2.5,skip:0,duration:.5,offset:0,clipDuration:5,rate:1,reverse:false}]);
    console.log('Guide core OK');}
  // Render: the 450/470 Hz voice follows a C5 / G4 guide (3 s, one file) and a guide event placed only under the second half.
  const guideFile=path.join(root,'guide.wav'),late=path.join(root,'late.wav'),contourFile=path.join(root,'contour.wav');
  await run(ff,['-v','error','-y','-f','lavfi','-i','sine=frequency=523.25:duration=1.5:sample_rate=48000','-f','lavfi','-i','sine=frequency=392:duration=1.5:sample_rate=48000','-filter_complex','[0][1]concat=n=2:v=0:a=1,volume=0.5[o]','-map','[o]',guideFile],{windowsHide:true});
  await run(ff,['-v','error','-y','-f','lavfi','-i','sine=frequency=392:duration=4:sample_rate=48000','-af','volume=0.5',late],{windowsHide:true});
  await run(ff,['-v','error','-y','-f','lavfi','-i','sine=frequency=445:duration=3:sample_rate=48000','-af','volume=0.5',contourFile],{windowsHide:true});
  const guided=(fx,guide)=>{const f=on({autotuneSpeed:0,autotuneRange:7,autotuneGuideTrack:'A2',...fx});model.validate(f,'audio');return service.prepare(source,f,cache,{...segment,guide}).then(samples);};
  const whole=[{filePath:guideFile,at:0,skip:0,duration:3,offset:0,clipDuration:3,rate:1,reverse:false}];
  const g1=await guided({},whole);r.guideNotes=[freq(g1,...A),freq(g1,...B)];
  const g2=await guided({autotuneGuideFallback:'none'},[{filePath:late,at:1.5,skip:.5,duration:1.5,offset:1,clipDuration:3,rate:1,reverse:false}]);r.guideLate=[freq(g2,...A),freq(g2,...B)];
  const g3=await guided({autotuneGuideMode:'contour'},[{filePath:contourFile,at:0,skip:0,duration:3,offset:0,clipDuration:3,rate:1,reverse:false}]);r.contour=[freq(g3,...A)];
  const g4=await guided({},[{filePath:contourFile,at:0,skip:0,duration:3,offset:0,clipDuration:3,rate:1,reverse:false}]);r.contourAsNotes=[freq(g4,...A)];
  const g5=await guided({autotuneRange:2.5},whole);r.clamped=[freq(g5,...A)];
  const live=await service.guideMelody(whole,3);r.melody=[live.melody[100],live.melody[220]];
  console.log(JSON.stringify(r));
  assert(near(r.guideNotes[0],523.25,3)&&near(r.guideNotes[1],392,2.5),'guide notes');
  assert(near(r.guideLate[0],450,2)&&near(r.guideLate[1],392,2.5),'guide placed under second half, no correction elsewhere');
  assert(near(r.contour[0],445,2.5)&&near(r.contourAsNotes[0],440,2.5),'contour vs notes');
  assert(near(r.clamped[0],450*2**(2.5/12),3),'range clamp in render');
  assert(Math.abs(r.melody[0]-72)<.05&&Math.abs(r.melody[1]-67)<.05,'guide melody for live listening');
  assert.throws(()=>model.validate(on({autotuneGuideMode:'free'}),'audio'));assert.throws(()=>model.validate(on({autotuneGuideTrack:'<x>'}),'audio'));
  await assert.rejects(service.prepare(source,on({autotuneGuideTrack:'A2',autotuneSpeed:.01}),cache,{...segment,guide:[{filePath:guideFile,at:-1}]}),/Pista guía no válida/);
  console.log('Guide track render OK');
  // Project export: the guide lives on a muted event of another track and is resolved by the render engine (not heard, still guiding).
  {const clip=(filePath,extra)=>({name:path.basename(filePath),kind:'audio',filePath,startSeconds:0,durationSeconds:3,sourceOffsetSeconds:0,playbackRate:1,gain:1,mute:false,fadeInSeconds:0,fadeOutSeconds:0,...extra});
    const project={format:'LQTAC Studio',version:1,name:'guide',fps:24,library:[],tracks:[
      {id:'A1',name:'Voz',kind:'audio',envelope:[],clips:[clip(source,{audioFx:on({autotuneSpeed:0,autotuneRange:7,autotuneGuideTrack:'A2'})})]},
      {id:'A2',name:'Guía',kind:'audio',envelope:[],clips:[clip(guideFile,{mute:true})]}]};
    const output=path.join(root,'export.wav');await(await engine.startRender({project,profile:'wav',output,effectsDirectory:cache})).finish();
    const mono=path.join(root,'export-f32.wav');await run(ff,['-v','error','-y','-i',output,'-ar','48000','-ac','2','-c:a','pcm_f32le',mono],{windowsHide:true});
    const e=await samples(mono);r.exported=[freq(e,...A),freq(e,...B)];console.log(JSON.stringify(r.exported));
    assert(near(r.exported[0],523.25,3)&&near(r.exported[1],392,2.5),'export follows the muted guide track');console.log('Guide track project export OK');}
  await fs.rm(root,{recursive:true,force:true});console.log('AUTOTUNE VERIFICATION PASSED');
})().catch(e=>{console.error(e);process.exit(1);});
