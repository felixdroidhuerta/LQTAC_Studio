// "Voz de estudio" against the music: backing mix comparison, reference voice, key/tuning detection and autotune proposal.
// Synthetic song in G major: chords, a melody track and a sung line 25 cents sharp with vibrato. Usage: node desktop\verify-voice-match.cjs
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const vs=require('./voice-studio.cjs');
const RATE=48000,SECONDS=12;
function wav(samples){const b=Buffer.alloc(44+samples.length*4);b.write('RIFF',0);b.writeUInt32LE(36+samples.length*4,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(3,20);b.writeUInt16LE(1,22);b.writeUInt32LE(RATE,24);b.writeUInt32LE(RATE*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(32,34);b.write('data',36);b.writeUInt32LE(samples.length*4,40);for(let i=0;i<samples.length;i++)b.writeFloatLE(samples[i],44+i*4);return b;}
const hz=midi=>440*2**((midi-69)/12);
// G major progression G–C–D–Em (2 s each, repeated), organ-like tones with harmonics. cents shifts the whole band.
function chords(cents=0){const prog=[[55,59,62,67],[48,60,64,67],[50,57,62,66],[52,59,64,67]],out=new Float32Array(RATE*SECONDS);
  for(let i=0;i<out.length;i++){const t=i/RATE,ch=prog[Math.floor(t/2)%4];let v=0;for(const n of ch){const f=hz(n+cents/100);for(let h=1;h<=4;h++)v+=Math.sin(2*Math.PI*f*h*t)/(h*h);}out[i]=v*.06;}return out;}
// Melody in G major: 0.5 s notes with 0.1 s gaps.
const tune=[67,69,71,72,74,72,71,69,67,71,74,79,78,76,74,72,71,69,67,66,67,69,71,67];
function line(cents,vibrato,amp){const out=new Float32Array(RATE*SECONDS);let phase=0;
  for(let i=0;i<out.length;i++){const t=i/RATE,k=Math.floor(t/.5),local=t-k*.5;if(local>.4||k>=tune.length){phase=0;continue;}
    const f=hz(tune[k]+cents/100+vibrato*Math.sin(2*Math.PI*5.5*t));phase+=2*Math.PI*f/RATE;const env=Math.min(1,local/.03,(.4-local)/.03);out[i]=amp*env*(Math.sin(phase)+.4*Math.sin(2*phase)+.2*Math.sin(3*phase));}return out;}
(async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'lqtac-voice-match-'));
  const files={voice:path.join(root,'voz.wav'),chords:path.join(root,'acordes.wav'),melody:path.join(root,'melodia.wav'),sharp:path.join(root,'acordes+40.wav')};
  await fs.writeFile(files.voice,wav(line(25,.25,.25)));await fs.writeFile(files.chords,wav(chords()));await fs.writeFile(files.melody,wav(line(0,0,.12)));await fs.writeFile(files.sharp,wav(chords(40)));
  const segment={offset:0,duration:SECONDS,rate:1},piece=f=>({filePath:f,at:0,skip:0,duration:SECONDS,offset:0,clipDuration:SECONDS,rate:1,gain:1,reverse:false});
  // Unit checks: key detection and note statistics.
  const ch=chords(),h=vs.harmony(Float32Array.from({length:16000*SECONDS},(_,i)=>ch[i*3]||0));const key=vs.detectKey(h.chroma);
  assert.equal(key.key,7);assert.equal(key.scale,'major');assert(Math.abs(h.tuningCents)<6,'tuning '+h.tuningCents);console.log('Key G major, tuning',h.tuningCents,'cents OK');
  // Chords only: key from the backing, scale correction.
  const a=await vs.analyze(files.voice,segment,{tracks:[{id:'A2',label:'Acordes',pieces:[piece(files.chords)]}],tuning:true,voiceGain:1});
  console.log(JSON.stringify({backing:a.backing,tuning:a.tuning}));
  assert(a.backing&&!a.backing.silent,'backing measured');assert.equal(a.tuning.key.key,7);assert.equal(a.tuning.key.scale,'major');
  assert(a.tuning.medianCents>15&&a.tuning.medianCents<35,'sharp voice measured: '+a.tuning.medianCents);
  const r1=vs.recommend(a,'song',{style:'front'});
  assert.equal(r1.settings.autotune,true);assert.equal(r1.settings.autotuneKey,7);assert.equal(r1.settings.autotuneScale,'major');assert.equal(r1.settings.autotuneGuideTrack,'');
  assert(r1.report.some(i=>i.title==='Tonalidad de la base'&&/Sol mayor/.test(i.detail)));
  const r2=vs.recommend(a,'song',{style:'blend'});assert(r1.settings.targetLufs-r2.settings.targetLufs===3||r1.settings.targetLufs===-10,'style moves the voice level');
  console.log('Scale autotune, key report and mix-style level OK',r1.settings.targetLufs,r2.settings.targetLufs);
  // Melody track present: it becomes the guide.
  const b=await vs.analyze(files.voice,segment,{tracks:[{id:'A2',label:'Acordes',pieces:[piece(files.chords)]},{id:'A3',label:'Melodía',pieces:[piece(files.melody)]}],tuning:true});
  const g=b.tuning.guides.find(x=>x.id==='A3'),c=b.tuning.guides.find(x=>x.id==='A2');console.log(JSON.stringify(b.tuning.guides));
  assert(g.score>=.5&&g.agreement>=.7,'melody track found');const r3=vs.recommend(b,'song');assert.equal(r3.settings.autotuneGuideTrack,'A3');assert.equal(r3.settings.autotuneRange,2.5);
  console.log('Guide track detection OK',g.score,c.score);
  // Backing tuned +40 cents: autotune is not proposed.
  const s=await vs.analyze(files.voice,segment,{tracks:[{id:'A2',label:'Acordes',pieces:[piece(files.sharp)]}],tuning:true});
  assert(s.tuning.tuningCents>25,'detuned backing '+s.tuning.tuningCents);const r4=vs.recommend(s,'song');assert.equal(r4.settings.autotune,undefined);assert(r4.report.some(i=>i.title==='Base con otra afinación'));
  console.log('Detuned backing warning OK',s.tuning.tuningCents);
  // No tuning requested: autotune keys untouched; reference voice used as tonal target.
  const n=await vs.analyze(files.voice,segment,{tracks:[{id:'A2',label:'Acordes',pieces:[piece(files.chords)]}],reference:files.voice});
  const r5=vs.recommend(n,'podcast');assert.equal(n.tuning,undefined);assert(!('autotune' in r5.settings));assert(n.reference&&n.reference.name==='voz.wav');
  assert(r5.report.some(i=>i.title==='Voz de referencia'));assert(!r5.report.some(i=>i.title==='Voz embarrada'||i.title==='Claridad'&&i.status==='fix'),'reference tone matches itself');console.log('Reference voice and untouched autotune OK');
  // Silent backing under the voice.
  const q=await vs.analyze(files.voice,segment,{tracks:[{id:'A2',label:'Acordes',pieces:[{...piece(files.chords),at:11.5,duration:.5}]}]});assert.equal(q.backing.silent,true);
  await assert.rejects(vs.analyze(files.voice,segment,{tracks:[{id:'<x>',label:'x',pieces:[]}]}),/no válidas/);
  await fs.rm(root,{recursive:true,force:true});console.log('VOICE MATCH VERIFICATION PASSED');
})().catch(e=>{console.error(e);process.exit(1);});
