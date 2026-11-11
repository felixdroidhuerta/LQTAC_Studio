const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {audioFilters,animatedAudio,audioDefaults}=require('../dist/assets/effects-model.js');
const pending=new Map(),children=new Set();let cancelEpoch=0;
// Decodes audio through an FFmpeg filter chain to 16 kHz mono float samples (pitch analysis input).
const ANALYSIS_RATE=16000;
function decode(filePath,chain,epoch){
  return new Promise((resolve,reject)=>{
    const child=spawn(require('./render-engine.cjs').ffmpegPath(),['-v','error','-i',filePath,'-map','0:a:0','-vn','-af',chain+',highpass=f=60','-ac','1','-ar',String(ANALYSIS_RATE),'-f','f32le','pipe:1'],{windowsHide:true,stdio:['ignore','pipe','pipe']});children.add(child);
    const chunks=[];let error='';child.stdout.on('data',b=>chunks.push(b));child.stderr.on('data',b=>{error=(error+b).slice(-3000);});child.once('error',reject);
    child.once('close',code=>{children.delete(child);if(code!==0||epoch!==cancelEpoch)return reject(Error(epoch!==cancelEpoch?'Preparación cancelada':'No se pudo analizar el tono: '+error));const b=Buffer.concat(chunks),out=new Float32Array(Math.floor(b.length/4));for(let i=0;i<out.length;i++)out[i]=b.readFloatLE(i*4);resolve(out);});
  });
}
// Guide track: every overlapping guide event decoded on its own timeline (offset, reverse, speed) and laid out in voice-event seconds.
async function guideSamples(pieces,duration,epoch){
  const n=require('./audio-automation.cjs').n,out=new Float32Array(Math.ceil(duration*ANALYSIS_RATE)+1);
  for(const p of pieces){
    const tempo=[];let rate=p.rate;while(rate>2){tempo.push('atempo=2');rate/=2;}while(rate<.5){tempo.push('atempo=0.5');rate/=.5;}tempo.push('atempo='+n(rate));
    const chain=`atrim=start=${n(p.offset)}:duration=${n(p.clipDuration*p.rate)},asetpts=PTS-STARTPTS,${p.reverse?'areverse,':''}${tempo.join(',')},atrim=start=${n(p.skip)}:duration=${n(p.duration)},asetpts=PTS-STARTPTS`;
    const data=await decode(p.filePath,chain,epoch),first=Math.round(p.at*ANALYSIS_RATE);for(let i=0;i<data.length&&first+i<out.length;i++)out[first+i]+=data[i];
  }
  return out;
}
function checkGuide(pieces){if(!Array.isArray(pieces)||pieces.length>200||pieces.some(p=>!p||typeof p.filePath!=='string'||!p.filePath||!['at','skip','duration','offset','clipDuration','rate'].every(k=>Number.isFinite(p[k]))||p.at<0||p.skip<0||p.duration<=0||p.offset<0||p.clipDuration<=0||p.rate<.25||p.rate>4))throw Error('Pista guía no válida');}
// YIN costs ~1 s per minute of audio: analysis runs in a worker thread so the main process stays responsive.
function inWorker(data,epoch){
  const script=`const {workerData:w,parentPort}=require('node:worker_threads');const core=require(w.core),{valueAt}=require(w.model),f=w.f;
    const guide=w.guide?core.melody(w.guide,w.rate,w.duration):w.guided?[]:null;
    if(!w.voice)parentPort.postMessage({guide});
    else parentPort.postMessage({guide,curve:core.analyze(w.voice,w.rate,w.duration,t=>({key:f.autotuneKey,scale:f.autotuneScale,range:f.autotuneRange,guideMode:f.autotuneGuideMode,fallback:f.autotuneGuideFallback,guideOffset:f.autotuneGuideOffset,speed:valueAt(f.animation.autotuneSpeed,t,f.autotuneSpeed),amount:valueAt(f.animation.autotuneAmount,t,f.autotuneAmount)}),guide)});`;
  return new Promise((resolve,reject)=>{const {Worker}=require('node:worker_threads'),worker=new Worker(script,{eval:true,workerData:{core:require.resolve('../dist/assets/autotune-core.js'),model:require.resolve('../dist/assets/effects-model.js'),rate:ANALYSIS_RATE,...data}});children.add(worker);
    worker.once('message',resolve);worker.once('error',reject);worker.once('exit',code=>{children.delete(worker);if(epoch!==cancelEpoch)reject(Error('Preparación cancelada'));else if(code!==0)reject(Error('Falló el análisis de tono'));});});
}
// Autotune: decode the event (same trim/speed as the render) and build the correction curve with the shared core.
async function autotuneCurve(filePath,fx,segment,epoch){
  const core=require('../dist/assets/autotune-core.js'),f={...audioDefaults,...fx},guided=!!f.autotuneGuideTrack,pieces=guided?segment.guide||[]:[];if(guided)checkGuide(pieces);
  const voice=await decode(filePath,require('./audio-automation.cjs').baseChain(segment),epoch),guide=pieces.length?await guideSamples(pieces,segment.duration,epoch):null;
  const result=await inWorker({f,voice,guide,guided,duration:segment.duration},epoch);
  if(epoch!==cancelEpoch)throw Error('Preparación cancelada');
  return {autotuneCurve:result.curve,autotuneHop:core.HOP};
}
// Guide melody alone (live listening in the editor): MIDI per HOP in voice-event seconds, cached in memory.
const melodyCache=new Map();
async function guideMelody(pieces,duration){
  checkGuide(pieces);if(!Number.isFinite(duration)||duration<=0||duration>604800)throw Error('Duración no válida');
  const stats=await Promise.all(pieces.map(p=>fs.stat(p.filePath).then(x=>[x.size,x.mtimeMs])));const key=JSON.stringify({pieces,duration,stats});
  if(melodyCache.has(key))return melodyCache.get(key);
  const epoch=cancelEpoch,core=require('../dist/assets/autotune-core.js');
  const melody=pieces.length?(await inWorker({f:audioDefaults,guide:await guideSamples(pieces,duration,epoch),duration},epoch)).guide:[];
  const result={melody,hop:core.HOP};melodyCache.set(key,result);if(melodyCache.size>8)melodyCache.delete(melodyCache.keys().next().value);return result;
}
async function prepare(filePath,fx,directory,segment){
  const epoch=cancelEpoch;
  const animated=animatedAudio(fx),filters=audioFilters(fx);if(!filters.length&&!animated)return filePath;
  if(animated)require('./audio-automation.cjs').checkSegment(segment);
  const stat=await fs.stat(filePath),guideStats=animated&&fx.autotune&&fx.autotuneGuideTrack&&Array.isArray(segment?.guide)?await Promise.all(segment.guide.map(p=>fs.stat(String(p?.filePath)).then(x=>[x.size,x.mtimeMs]).catch(()=>null))):null,hash=crypto.createHash('sha256').update(JSON.stringify({filePath,size:stat.size,mtime:stat.mtimeMs,filters,animation:animated?fx.animation:null,segment:animated?segment:null,guideStats,version:2,...(animated?{settings:{...audioDefaults,...fx}}:{})})).digest('hex');
  await fs.mkdir(directory,{recursive:true});const output=path.join(directory,hash+'.wav');
  if(await fs.stat(output).catch(()=>null))return output;
  if(pending.has(hash))return pending.get(hash);
  const operation=(async()=>{
    const temporary=output+'.'+process.pid+'.tmp.wav';
    const generated=[];
    try{
      let filterArgs=['-af',filters.join(',')];if(animated){const extra=fx.autotune?await autotuneCurve(filePath,fx,segment,epoch):{};const built=require('./audio-automation.cjs').build(fx,segment,hash,extra);for(const file of built.files){const target=path.join(directory,file.name);await fs.writeFile(target,file.content,'utf8');generated.push(target);}const graphFile=path.join(directory,hash+'-graph.txt');await fs.writeFile(graphFile,built.graph,'utf8');generated.push(graphFile);filterArgs=['-filter_complex_script',path.basename(graphFile),'-map','[out]'];}
      if(epoch!==cancelEpoch)throw Error('Preparación cancelada');
      await new Promise((resolve,reject)=>{
        const child=spawn(require('./render-engine.cjs').ffmpegPath(),['-v','error','-y','-i',filePath,...(animated?[]:['-map','0:a:0']),'-vn',...filterArgs,'-ar','48000','-ac','2','-c:a','pcm_f32le',temporary],{windowsHide:true,cwd:directory,stdio:['ignore','ignore','pipe']});children.add(child);let error='';
        child.stderr.on('data',b=>{error=(error+b).slice(-5000);});child.once('error',reject);child.once('close',code=>{children.delete(child);code===0&&epoch===cancelEpoch?resolve():reject(Error(epoch!==cancelEpoch?'Preparación cancelada':'No se pudo preparar el audio: '+error));});
      });
      await fs.rename(temporary,output);return output;
    }finally{await fs.rm(temporary,{force:true}).catch(()=>{});for(const file of generated)await fs.rm(file,{force:true}).catch(()=>{});}
  })();pending.set(hash,operation);try{return await operation;}finally{pending.delete(hash);}
}
function cancel(){cancelEpoch++;for(const child of children)child.terminate?void child.terminate():child.kill();}
async function waveform(filePath,segment){
  const handle=await fs.open(filePath,'r');let start=0,size=0,channels=0,sampleRate=0,bits=0,format=0;
  try{const header=Buffer.alloc(65536),{bytesRead}=await handle.read(header,0,header.length,0);if(header.toString('ascii',0,4)!=='RIFF')return [];for(let p=12;p+8<=bytesRead;){const name=header.toString('ascii',p,p+4),length=header.readUInt32LE(p+4);if(name==='fmt '&&p+24<=bytesRead){format=header.readUInt16LE(p+8);channels=header.readUInt16LE(p+10);sampleRate=header.readUInt32LE(p+12);bits=header.readUInt16LE(p+22);if(format===65534&&p+34<=bytesRead)format=header.readUInt16LE(p+32);}if(name==='data'){start=p+8;size=length;break;}p+=8+length+(length%2);}}finally{await handle.close();}
  if(!start||format!==3||bits!==32||channels!==2||sampleRate!==48000)return [];
  const first=Math.max(0,Math.floor((segment?.offset||0)*48000)),frames=Math.min(Math.floor((segment?.duration||size/8/48000)*(segment?.rate||1)*48000),Math.floor(size/8)-first);if(frames<=0)return [];
  const peaks=new Array(900).fill(0);let index=0;for await(const chunk of require('node:fs').createReadStream(filePath,{start:start+first*8,end:start+(first+frames)*8-1,highWaterMark:65536})){for(let p=0;p+7<chunk.length;p+=8){const bin=Math.min(899,Math.floor(index++/frames*900));peaks[bin]=Math.max(peaks[bin],Math.abs(chunk.readFloatLE(p)),Math.abs(chunk.readFloatLE(p+4)));}}return peaks.map(x=>Number(x.toFixed(5)));
}
module.exports={prepare,cancel,waveform,guideMelody};
