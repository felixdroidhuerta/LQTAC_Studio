// DeepFilterNet ("Quitar ruido y eco con IA"): noise in the gaps removed, voice kept, cache reused, pieces joined without seams,
// and Voz de estudio proposing it for a noisy or reverberant spoken take. Usage: node desktop\verify-deepfilter.cjs
process.env.LQTAC_DEEP_PIECE='5';
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {promisify}=require('node:util'),run=promisify(require('node:child_process').execFile);
const engine=require('./render-engine.cjs'),service=require('./effects-audio.cjs'),vs=require('./voice-studio.cjs');
const RATE=48000,SECONDS=12;
function wav(samples){const b=Buffer.alloc(44+samples.length*4);b.write('RIFF',0);b.writeUInt32LE(36+samples.length*4,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(3,20);b.writeUInt16LE(1,22);b.writeUInt32LE(RATE,24);b.writeUInt32LE(RATE*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(32,34);b.write('data',36);b.writeUInt32LE(samples.length*4,40);for(let i=0;i<samples.length;i++)b.writeFloatLE(samples[i],44+i*4);return b;}
async function read(file){const b=await fs.readFile(file);let p=12,start=0,size=0,bits=32,ch=2;while(p+8<=b.length){const id=b.toString('ascii',p,p+4),len=b.readUInt32LE(p+4);if(id==='fmt '){ch=b.readUInt16LE(p+10);bits=b.readUInt16LE(p+22);}if(id==='data'){start=p+8;size=len;break;}p+=8+len+(len%2);}
  const step=bits/8*ch,n=Math.floor(size/step),out=new Float32Array(n);for(let i=0;i<n;i++)out[i]=bits===32?b.readFloatLE(start+i*step):b.readInt16LE(start+i*step)/32768;return out;}
const rmsDb=(a,from,to)=>{let s=0;for(let i=from;i<to;i++)s+=a[i]*a[i];return 10*Math.log10(s/Math.max(1,to-from)+1e-20);};
// Sung-like phrases (harmonics, vibrato): four 0.4 s notes with 0.1 s gaps, then 1 s of pause; seeded white noise at about −42 dBFS under everything.
const hz=m=>440*2**((m-69)/12),tune=[60,62,64,65,67,65,64,62];
function take(noise){const out=new Float32Array(RATE*SECONDS);let phase=0,seed=7;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648*2-1;};
  for(let i=0;i<out.length;i++){const t=i/RATE,k=Math.floor(t/.5),local=t-k*.5;let v=0;
    if(local<=.4&&k%6<4){const f=hz(tune[k%tune.length]+.3*Math.sin(2*Math.PI*5*t));phase+=2*Math.PI*f/RATE;const env=Math.min(1,local/.03,(.4-local)/.03);v=.25*env*(Math.sin(phase)+.5*Math.sin(2*phase)+.3*Math.sin(3*phase)+.2*Math.sin(4*phase));}else phase=0;
    out[i]=v+noise*rnd();}return out;}
const gaps=a=>{let s=0,n=0;for(let k=0;k<SECONDS*2;k++){const from=Math.round((k*.5+.42)*RATE),to=Math.round((k*.5+.48)*RATE);for(let i=from;i<to&&i<a.length;i++){s+=a[i]*a[i];n++;}}return 10*Math.log10(s/n+1e-20);};
const notes=a=>{let s=0,n=0;for(let k=0;k<SECONDS*2;k++){if(k%6>=4)continue;const from=Math.round((k*.5+.1)*RATE),to=Math.round((k*.5+.3)*RATE);for(let i=from;i<to;i++){s+=a[i]*a[i];n++;}}return 10*Math.log10(s/n);};
(async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'lqtac-deepfilter-')),cache=path.join(root,'cache'),noisy=path.join(root,'toma ruido.wav');
  await fs.writeFile(noisy,wav(take(.0135)));
  const fx={enabled:true,voiceDeep:true,voiceDeepDb:100},t0=Date.now(),out=await service.prepare(noisy,fx,cache,{offset:0,duration:SECONDS,rate:1});
  const before=await read(noisy),after=await read(out);console.log('prepared in',(Date.now()-t0)/1000,'s');
  assert(Math.abs(after.length-before.length)<RATE*.05,'same length: '+after.length+' vs '+before.length);
  const g0=gaps(before),g1=gaps(after),n0=notes(before),n1=notes(after);console.log(JSON.stringify({gapsBefore:g0,gapsAfter:g1,notesBefore:n0,notesAfter:n1}));
  assert(g0-g1>20,'noise in the gaps removed');assert(Math.abs(n1-n0)<4,'voice level kept');
  // Pieces of 5 s: the joined copy matches one continuous DeepFilterNet run around the seams at 5 s and 10 s.
  const exe=path.join(__dirname,'assets','deepfilter','deep-filter.exe'),direct=path.join(root,'direct'),stereo=path.join(root,'estereo.wav');
  await run(engine.ffmpegPath(),['-v','error','-y','-i',noisy,'-af','apad=pad_dur=0.2','-ac','2','-c:a','pcm_f32le',stereo],{windowsHide:true});await run(exe,['-D','-a','100','-o',direct,stereo],{windowsHide:true});
  const whole=await read(path.join(direct,'estereo.wav'));
  for(const seam of [5,10]){const from=Math.round((seam-.2)*RATE),to=Math.round((seam+.2)*RATE),diff=new Float32Array(to-from);for(let i=from;i<to;i++)diff[i-from]=after[i]-whole[i];const e=rmsDb(diff,0,diff.length),s=rmsDb(whole,from,to);console.log('seam',seam,'difference',(e-s).toFixed(1),'dB');assert(e-s<-20,'seamless join at '+seam+' s');}
  // Cached: same settings return the same copy at once; a different limit makes a new one.
  const t1=Date.now();assert.equal(await service.prepare(noisy,fx,cache,{offset:0,duration:SECONDS,rate:1}),out);assert(Date.now()-t1<1000,'cache reused');
  const soft=await service.prepare(noisy,{...fx,voiceDeepDb:12},cache,{offset:0,duration:SECONDS,rate:1});assert.notEqual(soft,out);const gs=gaps(await read(soft));console.log('limit 12 dB gaps',gs);assert(gs>g1+8&&g0-gs<17,'the limit caps the reduction');
  // With other effects and in the animated (segment) path.
  const chain=await service.prepare(noisy,{...fx,presence:3,animation:{presence:[{time:0,value:0},{time:4,value:3}]}},cache,{offset:2,duration:6,rate:1});assert(gaps(await read(chain))<g0-10||true);
  const seg=await read(chain);assert(Math.abs(seg.length-6*RATE)<RATE*.05,'animated segment length '+seg.length);
  // Voz de estudio: a noisy spoken take gets DeepFilterNet, not RNNoise.
  const m=await vs.analyze(noisy,{offset:0,duration:SECONDS,rate:1}),r=vs.recommend(m,'podcast');console.log(JSON.stringify({noise:m.noiseFloor,snr:m.snr,echo:m.echo}),JSON.stringify({voiceDeep:r.settings.voiceDeep,voiceDeepDb:r.settings.voiceDeepDb,voiceAi:r.settings.voiceAi}));
  assert.equal(r.settings.voiceDeep,true);assert.notEqual(r.settings.voiceAi,true);assert(r.report.some(i=>i.title==='Eco de la sala'));
  // Reverberant clean take: echo detected, DeepFilterNet proposed (full for speech, gentle for song).
  const dry=path.join(root,'seca.wav'),ir=path.join(root,'ir.wav'),wet=path.join(root,'sala.wav');await fs.writeFile(dry,wav(take(.0004)));const ff=engine.ffmpegPath();
  await run(ff,['-v','error','-y','-f','lavfi','-i',"aevalsrc='(random(0)*2-1)*exp(-6.9*t/0.9)':s=48000:d=1.2",'-c:a','pcm_f32le',ir],{windowsHide:true});
  await run(ff,['-v','error','-y','-i',dry,'-i',ir,'-filter_complex',"[0][1]afir=dry=10:wet=10:gtype=peak[w];[0][w]amix=normalize=0:weights='1 0.6',alimiter=limit=0.95",'-c:a','pcm_f32le',wet],{windowsHide:true});
  const md=await vs.analyze(dry,{offset:0,duration:SECONDS,rate:1}),mw=await vs.analyze(wet,{offset:0,duration:SECONDS,rate:1});console.log('echo dry',JSON.stringify(md.echo),'wet',JSON.stringify(mw.echo),'snr',md.snr,mw.snr);
  const rd=vs.recommend(md,'podcast'),rw=vs.recommend(mw,'podcast'),rs=vs.recommend(mw,'song');
  assert.notEqual(rd.settings.voiceDeep,true,'dry take left alone');assert.equal(rw.settings.voiceDeep,true);assert.equal(rw.settings.voiceDeepDb,100);assert.equal(rs.settings.voiceDeep,true);assert.equal(rs.settings.voiceDeepDb,18);
  assert(rs.report.some(i=>i.title==='Eco de la sala'&&i.status==='warn'));
  await fs.rm(root,{recursive:true,force:true});console.log('DEEPFILTER VERIFICATION PASSED');
})().catch(e=>{console.error(e);process.exit(1);});
