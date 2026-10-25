const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const pending=new Map(),children=new Set();let queue=Promise.resolve(),epoch=0;
function cancel(){epoch++;for(const child of children)child.kill();}
function processFile(args,version){
  return new Promise((resolve,reject)=>{
    if(version!==epoch)return reject(Error('Inversión cancelada'));
    const child=spawn(require('./render-engine.cjs').ffmpegPath(),['-hide_banner','-nostdin',...args],{windowsHide:true,stdio:['ignore','ignore','pipe']});children.add(child);let stderr='';
    child.stderr.on('data',data=>stderr=(stderr+data).slice(-16000));child.once('error',error=>{children.delete(child);reject(error);});
    child.once('close',code=>{children.delete(child);if(version!==epoch)reject(Error('Inversión cancelada'));else if(code!==0)reject(Error(stderr||'No se pudo invertir el medio'));else resolve(stderr);});
  });
}
function request(options){
  if(!options||!['video','audio'].includes(options.kind)||typeof options.filePath!=='string'||!path.isAbsolute(options.filePath)||!Number.isFinite(options.offset)||options.offset<0||!Number.isFinite(options.duration)||options.duration<=0||options.duration>2419200)throw Error('Fragmento para inversión no válido');
  return {...options,offset:Number(options.offset.toFixed(6)),duration:Number(options.duration.toFixed(6))};
}
async function prepare(options,directory,progress=()=>{}){
  options=request(options);const stat=await fs.stat(options.filePath);if(!stat.isFile())throw Error('El medio no es un archivo');
  if(options.kind==='video'&&/\.(png|jpe?g|webp|bmp|tiff?)$/i.test(options.filePath))return options.filePath;
  const version=epoch,key=crypto.createHash('sha256').update(JSON.stringify({file:options.filePath,size:stat.size,mtime:stat.mtimeMs,kind:options.kind,offset:options.offset,duration:options.duration,version:2})).digest('hex');
  await fs.mkdir(directory,{recursive:true});const output=path.join(directory,key+(options.kind==='video'?'.mp4':'.wav'));
  if((await fs.stat(output).catch(()=>null))?.size>0)return output;
  if(pending.has(key))return pending.get(key);
  const task=queue.catch(()=>{}).then(async()=>{
    if(version!==epoch)throw Error('Inversión cancelada');
    const temp=await fs.mkdtemp(path.join(path.resolve(directory),'.reverse-'));
    try{
      let fps=30,step=15,mediaStart=options.offset,mediaEnd=options.offset+options.duration;
      if(options.kind==='video'){
        const info=await processFile(['-v','info','-i',options.filePath,'-map','0:v:0','-vf','showinfo','-frames:v','1','-an','-f','null','-'],version);
        const match=info.match(/frame_rate:\s*(\d+)\/(\d+)/);if(match&&Number(match[2])&&Number(match[1])/Number(match[2])>0)fps=Number(match[1])/Number(match[2]);
        fps=Math.max(1,Math.min(120,fps));step=Math.max(1,Math.round(fps*.5))/fps;
        mediaStart=Math.floor(options.offset*fps+1e-7)/fps;mediaEnd=Math.ceil((options.offset+options.duration)*fps-1e-7)/fps;
      }
      const count=Math.max(1,Math.ceil((mediaEnd-mediaStart)/step-1e-8)),names=[],lengths=[];let silent=false;
      for(let i=0;i<count;i++){
        const end=mediaEnd-i*step,start=Math.max(mediaStart,end-step),length=end-start;
        const name='part-'+String(i).padStart(7,'0')+(options.kind==='video'?'.mp4':'.wav');names.push(name);lengths.push(length);
        const args=['-v','error','-y','-ss',start.toFixed(6),'-t',length.toFixed(6),'-i',options.filePath];
        if(options.kind==='video')args.push('-map','0:v:0','-an','-vf','fps='+fps+',reverse,setpts=PTS-STARTPTS,pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libx264','-threads','2','-preset','fast','-crf','16','-pix_fmt','yuv420p');
        else args.push('-map','0:a:0','-vn','-af','areverse,asetpts=PTS-STARTPTS','-ar','48000','-ac','2','-c:a','pcm_f32le');
        try{if(silent)throw Error('matches no streams');await processFile([...args,path.join(temp,name)],version);
          if(options.kind==='video'&&(await fs.stat(path.join(temp,name))).size<500){const fallback=[...args];fallback[4]=Math.max(0,start-1/fps).toFixed(6);fallback[6]=(1/fps).toFixed(6);await processFile([...fallback,path.join(temp,name)],version);}
        }
        catch(error){if(options.kind!=='audio'||!/matches no streams|does not contain any stream/.test(error.message))throw error;silent=true;await processFile(['-v','error','-y','-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-t',length.toFixed(6),'-c:a','pcm_f32le',path.join(temp,name)],version);}
        progress({fraction:(i+1)/count*.95,kind:options.kind});
      }
      const list=path.join(temp,'list.txt');await fs.writeFile(list,names.map((name,i)=>"file '"+name+"'"+(options.kind==='video'?'\nduration '+lengths[i].toFixed(9):'')).join('\n'),'utf8');
      const merged=path.join(temp,options.kind==='video'?'result.mp4':'result.wav');
      await processFile(['-v','error','-y','-f','concat','-safe','1','-i',list,'-c','copy',...(options.kind==='video'?['-movflags','+faststart']:[]),merged],version);
      const check=await fs.stat(options.filePath);if(check.size!==stat.size||check.mtimeMs!==stat.mtimeMs)throw Error('El archivo cambió durante la inversión');
      if(version!==epoch)throw Error('Inversión cancelada');await fs.rename(merged,output);progress({fraction:1,kind:options.kind});return output;
    }finally{
      if(path.dirname(temp)===path.resolve(directory)&&path.basename(temp).startsWith('.reverse-'))await fs.rm(temp,{recursive:true,force:true}).catch(()=>{});
    }
  });
  pending.set(key,task);queue=task;try{return await task;}finally{if(pending.get(key)===task)pending.delete(key);}
}
module.exports={prepare,cancel,request};
