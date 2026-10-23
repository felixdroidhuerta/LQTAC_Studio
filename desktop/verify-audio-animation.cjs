const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {promisify}=require('node:util'),run=promisify(require('node:child_process').execFile);
const model=require('../dist/assets/effects-model.js'),engine=require('./render-engine.cjs'),service=require('./effects-audio.cjs');
(async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'lqtac-audio-animation-')),source=path.join(root,'source.wav'),segment={offset:.25,duration:2,rate:1};
  await run(engine.ffmpegPath(),['-v','error','-y','-f','lavfi','-i','sine=frequency=120:duration=4','-ac','2',source],{windowsHide:true});
  const fx={...model.audioDefaults,enabled:true,animation:{bass:[{time:0,value:-12},{time:2,value:12}]}};
  const out=await service.prepare(source,fx,path.join(root,'cache'),segment);
  const {stdout}=await run(engine.ffmpegPath(),['-v','error','-i',out,'-ar','48000','-ac','1','-f','f32le','pipe:1'],{windowsHide:true,encoding:'buffer',maxBuffer:2*1024*1024});
  const rms=(a,b)=>{let sum=0,n=0;for(let i=Math.floor(a*48000);i<Math.min(stdout.length/4,b*48000);i++){const v=stdout.readFloatLE(i*4);sum+=v*v;n++;}return Math.sqrt(sum/n);};
  assert(stdout.length/4/48000>1.99&&stdout.length/4/48000<2.01);assert(rms(1.5,1.9)>rms(.1,.5)*3,'Animated EQ did not grow');console.log('EQ curve measured, event offset and exact duration OK');
  for(const [key,values,toggle] of [['thresholdDb',[-35,-6],'compressor'],['ratio',[1,8],'compressor'],['denoiseDb',[2,20],'denoise'],['echoMs',[50,200],'echo'],['echoMix',[0,.6],'echo'],['reverbMix',[0,.6],'reverb'],['targetLufs',[-24,-12],'normalize']]){
    const params={...model.audioDefaults,enabled:true,[toggle]:true,animation:{[key]:[{time:0,value:values[0]},{time:2,value:values[1]}]}};
    const file=await service.prepare(source,params,path.join(root,'cache'),segment);await run(engine.ffmpegPath(),['-v','error','-i',file,'-f','null','-'],{windowsHide:true});console.log('Animated '+key+' decoded OK');
  }
  console.log('ALL AUDIO ANIMATION TESTS PASSED '+root);
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
