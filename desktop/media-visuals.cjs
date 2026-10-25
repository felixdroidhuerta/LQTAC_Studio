const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const RATE=1000,TILE=15,pending=new Map(),children=new Set(),waiting=[],requests=new Map();let running=0,epoch=0,suspended=false;
function drain(){if(suspended)return;while(running<2&&waiting.length){const item=waiting.shift();running++;Promise.resolve().then(item.operation).then(item.resolve,item.reject).finally(()=>{running--;drain();});}}
function limited(operation){return new Promise((resolve,reject)=>{waiting.push({operation,resolve,reject});drain();});}
function cancel(){epoch++;for(const c of children)c.kill();for(const r of requests.values())r.cancelled=true;suspended=false;drain();}
function setSuspended(value){suspended=!!value;if(!suspended)drain();}
async function quiesce(){const until=Date.now()+1500;while(running&&Date.now()<until)await new Promise(resolve=>setTimeout(resolve,20));}
function cancelRequest(id){if(typeof id==='string') {const r=requests.get(id);if(r)r.cancelled=true;}}
function processMedia(args,onData,version){return limited(()=>new Promise((resolve,reject)=>{
  if(version!==epoch)return reject(Error('Análisis cancelado'));
  const c=spawn(require('./render-engine.cjs').ffmpegPath(),['-hide_banner','-nostdin','-v','error',...args],{windowsHide:true,stdio:['ignore','pipe','pipe']});children.add(c);let error='';
  c.stdout.on('data',bytes=>{try{onData?.(bytes);}catch(e){error=e.message;c.kill();}});c.stderr.on('data',bytes=>error=(error+bytes).slice(-5000));
  c.once('error',e=>{children.delete(c);reject(e);});c.once('close',code=>{children.delete(c);version!==epoch?reject(Error('Análisis cancelado')):code?reject(Error(error||'No se pudo analizar el medio')):resolve();});
}));}
async function source(filePath){if(typeof filePath!=='string'||!path.isAbsolute(filePath))throw Error('Medio local no válido');const s=await fs.stat(filePath);if(!s.isFile())throw Error('El medio no es un archivo');return {filePath,size:s.size,mtime:s.mtimeMs};}
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function shared(key,operation){if(!pending.has(key)){const job=operation();pending.set(key,job);job.finally(()=>{if(pending.get(key)===job)pending.delete(key);}).catch(()=>{});}return pending.get(key);}
async function frame(options,directory){
  if(!options||!Number.isFinite(options.time)||options.time<0||options.time>2419200)throw Error('Tiempo de fotograma no válido');
  if(options.before!==undefined&&typeof options.before!=='boolean')throw Error('Sentido de muestreo no válido');
  const input=await source(options.filePath),still=/\.(png|jpe?g|webp|bmp|tiff?)$/i.test(input.filePath),time=still?0:Number(options.time.toFixed(6)),before=!still&&!!options.before,version=epoch;
  await fs.mkdir(directory,{recursive:true});const output=path.join(directory,hash({input,time,before,version:2})+'.jpg');
  const make=()=>shared(output,async()=>{
    if((await fs.stat(output).catch(()=>null))?.size>0)return;
    const temp=output+'.'+crypto.randomUUID()+'.tmp.jpg';
    try{
      // Keep pre-roll timestamps, select frames up to the requested instant and overwrite
      // one temporary JPEG. The final image is the held frame, with no reverse buffer.
      const args=(at,exclusive)=>['-y','-threads','1','-ss',String(at),...(still?[]:['-noaccurate_seek','-t','0.25']),'-i',input.filePath,'-map','0:v:0','-an','-sn','-dn','-vf',
        'scale=160:90:force_original_aspect_ratio=decrease,'+(still?'':"select='"+(exclusive?'lt':'lte')+'(t,'+(time-at+(exclusive?-.0000001:.000001)).toFixed(9)+")',setpts=PTS-STARTPTS,")+'pad=160:90:(ow-iw)/2:(oh-ih)/2',
        '-c:v','mjpeg','-threads','1','-q:v','3',...(still?['-frames:v','1']:['-fps_mode','passthrough','-update','1']),temp];
      await processMedia(args(time,before),null,version);
      if(!(await fs.stat(temp).catch(()=>null))?.size)await processMedia(args(Math.max(0,time-.15),before&&time>.15),null,version);
      if(!(await fs.stat(temp).catch(()=>null))?.size)throw Error('No se pudo obtener un fotograma');
      if(version!==epoch)throw Error('Análisis cancelado');await fs.rename(temp,output);
    }finally{await fs.rm(temp,{force:true}).catch(()=>{});}
  });
  await make();return {time,width:160,height:90,dataUrl:'data:image/jpeg;base64,'+(await fs.readFile(output)).toString('base64')};
}
async function tile(input,index,directory){
  const version=epoch,key=path.join(directory,hash({input,index,rate:RATE,version:1})),dataFile=key+'.peaks',metaFile=key+'.json';
  return shared(key,async()=>{
    try{const meta=JSON.parse(await fs.readFile(metaFile,'utf8')),stat=await fs.stat(dataFile);if(meta.rate===RATE&&Number.isInteger(meta.count)&&meta.count>=0&&meta.count<=TILE*RATE&&stat.size===meta.count*8)return {meta,data:await fs.readFile(dataFile)};}catch{}
    const mins=new Float32Array(TILE*RATE),maxs=new Float32Array(TILE*RATE);let frames=0,leftover=Buffer.alloc(0),hasAudio=true;
    try{await processMedia(['-threads','1','-ss',String(index*TILE),'-t',String(TILE),'-i',input.filePath,'-map','0:a:0','-vn','-sn','-dn','-ar','48000','-ac','2','-c:a','pcm_f32le','-f','f32le','pipe:1'],bytes=>{
      const data=leftover.length?Buffer.concat([leftover,bytes]):bytes,limit=data.length-data.length%8;
      for(let p=0;p<limit;p+=8){const bin=Math.floor(frames/48);frames++;if(bin>=mins.length)continue;let a=data.readFloatLE(p),b=data.readFloatLE(p+4);if(!Number.isFinite(a))a=0;if(!Number.isFinite(b))b=0;mins[bin]=Math.max(-1,Math.min(mins[bin],a,b));maxs[bin]=Math.min(1,Math.max(maxs[bin],a,b));}leftover=Buffer.from(data.subarray(limit));
    },version);}catch(e){if(/matches no streams|does not contain any stream/.test(e.message))hasAudio=false;else throw e;}
    if(version!==epoch)throw Error('Análisis cancelado');
    const count=Math.min(mins.length,Math.ceil(frames/48)),data=Buffer.alloc(count*8);for(let i=0;i<count;i++){data.writeFloatLE(mins[i],i*8);data.writeFloatLE(maxs[i],i*8+4);}
    const meta={rate:RATE,count,hasAudio},suffix='.'+crypto.randomUUID()+'.tmp';
    try{await fs.writeFile(dataFile+suffix,data);await fs.writeFile(metaFile+suffix,JSON.stringify(meta),'utf8');await fs.rename(dataFile+suffix,dataFile);await fs.rename(metaFile+suffix,metaFile);}finally{await Promise.all([dataFile+suffix,metaFile+suffix].map(p=>fs.rm(p,{force:true}).catch(()=>{})));}
    return {meta,data};
  });
}
async function waveform(options,directory){
  if(!options||!Number.isFinite(options.start)||options.start<0||!Number.isFinite(options.end)||options.end<=options.start||options.end>2419200||!Number.isInteger(options.bins)||options.bins<1||options.bins>2048)throw Error('Rango de onda no válido');
  if(options.requestId!==undefined&&(typeof options.requestId!=='string'||options.requestId.length>128))throw Error('Petición de onda no válida');
  const request={cancelled:false},id=options.requestId;if(id)requests.set(id,request);
  try{
  const input=await source(options.filePath),version=epoch;await fs.mkdir(directory,{recursive:true});const mins=new Float32Array(options.bins),maxs=new Float32Array(options.bins);let hasAudio=false;
  for(let index=Math.floor(options.start/TILE);index<=Math.floor((options.end-1e-9)/TILE);index++){
    if(request.cancelled)return {cancelled:true};
    if(version!==epoch)throw Error('Análisis cancelado');const result=await tile(input,index,directory);hasAudio ||= result.meta.hasAudio;
    const first=Math.max(0,Math.floor((options.start-index*TILE)*RATE)),last=Math.min(result.meta.count,Math.ceil((options.end-index*TILE)*RATE));
    for(let i=first;i<last;i++){const time=index*TILE+i/RATE,bin=Math.max(0,Math.min(options.bins-1,Math.floor((time-options.start)/(options.end-options.start)*options.bins)));mins[bin]=Math.min(mins[bin],result.data.readFloatLE(i*8));maxs[bin]=Math.max(maxs[bin],result.data.readFloatLE(i*8+4));}
  }
  if(request.cancelled)return {cancelled:true};
  return {min:Array.from(mins),max:Array.from(maxs),hasAudio,resolutionSeconds:1/RATE};
  }finally{if(id&&requests.get(id)===request)requests.delete(id);}
}
module.exports={frame,waveform,cancel,cancelRequest,setSuspended,quiesce};
