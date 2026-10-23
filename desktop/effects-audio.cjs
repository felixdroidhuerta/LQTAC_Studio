const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {audioFilters,animatedAudio}=require('../dist/assets/effects-model.js');
const pending=new Map(),children=new Set();let cancelEpoch=0;
async function prepare(filePath,fx,directory,segment){
  const epoch=cancelEpoch;
  const animated=animatedAudio(fx),filters=audioFilters(fx);if(!filters.length&&!animated)return filePath;
  if(animated)require('./audio-automation.cjs').checkSegment(segment);
  const stat=await fs.stat(filePath),hash=crypto.createHash('sha256').update(JSON.stringify({filePath,size:stat.size,mtime:stat.mtimeMs,filters,animation:animated?fx.animation:null,segment:animated?segment:null,version:2})).digest('hex');
  await fs.mkdir(directory,{recursive:true});const output=path.join(directory,hash+'.wav');
  if(await fs.stat(output).catch(()=>null))return output;
  if(pending.has(hash))return pending.get(hash);
  const operation=(async()=>{
    const temporary=output+'.'+process.pid+'.tmp.wav';
    const generated=[];
    try{
      let filterArgs=['-af',filters.join(',')];if(animated){const built=require('./audio-automation.cjs').build(fx,segment,hash);for(const file of built.files){const target=path.join(directory,file.name);await fs.writeFile(target,file.content,'utf8');generated.push(target);}const graphFile=path.join(directory,hash+'-graph.txt');await fs.writeFile(graphFile,built.graph,'utf8');generated.push(graphFile);filterArgs=['-filter_complex_script',path.basename(graphFile),'-map','[out]'];}
      if(epoch!==cancelEpoch)throw Error('Preparación cancelada');
      await new Promise((resolve,reject)=>{
        const child=spawn(require('./render-engine.cjs').ffmpegPath(),['-v','error','-y','-i',filePath,...(animated?[]:['-map','0:a:0']),'-vn',...filterArgs,'-ar','48000','-ac','2','-c:a','pcm_f32le',temporary],{windowsHide:true,cwd:directory,stdio:['ignore','ignore','pipe']});children.add(child);let error='';
        child.stderr.on('data',b=>{error=(error+b).slice(-5000);});child.once('error',reject);child.once('close',code=>{children.delete(child);code===0&&epoch===cancelEpoch?resolve():reject(Error(epoch!==cancelEpoch?'Preparación cancelada':'No se pudo preparar el audio: '+error));});
      });
      await fs.rename(temporary,output);return output;
    }finally{await fs.rm(temporary,{force:true}).catch(()=>{});for(const file of generated)await fs.rm(file,{force:true}).catch(()=>{});}
  })();pending.set(hash,operation);try{return await operation;}finally{pending.delete(hash);}
}
function cancel(){cancelEpoch++;for(const child of children)child.kill();}
async function waveform(filePath,segment){
  const handle=await fs.open(filePath,'r');let start=0,size=0,channels=0,sampleRate=0,bits=0,format=0;
  try{const header=Buffer.alloc(65536),{bytesRead}=await handle.read(header,0,header.length,0);if(header.toString('ascii',0,4)!=='RIFF')return [];for(let p=12;p+8<=bytesRead;){const name=header.toString('ascii',p,p+4),length=header.readUInt32LE(p+4);if(name==='fmt '&&p+24<=bytesRead){format=header.readUInt16LE(p+8);channels=header.readUInt16LE(p+10);sampleRate=header.readUInt32LE(p+12);bits=header.readUInt16LE(p+22);if(format===65534&&p+34<=bytesRead)format=header.readUInt16LE(p+32);}if(name==='data'){start=p+8;size=length;break;}p+=8+length+(length%2);}}finally{await handle.close();}
  if(!start||format!==3||bits!==32||channels!==2||sampleRate!==48000)return [];
  const first=Math.max(0,Math.floor((segment?.offset||0)*48000)),frames=Math.min(Math.floor((segment?.duration||size/8/48000)*(segment?.rate||1)*48000),Math.floor(size/8)-first);if(frames<=0)return [];
  const peaks=new Array(900).fill(0);let index=0;for await(const chunk of require('node:fs').createReadStream(filePath,{start:start+first*8,end:start+(first+frames)*8-1,highWaterMark:65536})){for(let p=0;p+7<chunk.length;p+=8){const bin=Math.min(899,Math.floor(index++/frames*900));peaks[bin]=Math.max(peaks[bin],Math.abs(chunk.readFloatLE(p)),Math.abs(chunk.readFloatLE(p+4)));}}return peaks.map(x=>Number(x.toFixed(5)));
}
module.exports={prepare,cancel,waveform};
