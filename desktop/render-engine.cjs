const fs = require('node:fs');
const path = require('node:path');
const {spawn,execFile} = require('node:child_process');
const {promisify} = require('node:util');
const {validateProject} = require('./project-io.cjs');
const {enabled,balance,calibrated} = require('../dist/assets/work-model.js');
const presets = {
  mp4:{label:'Vídeo MP4 · H.264 + AAC',video:true,args:['-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart']},
  webm:{label:'Vídeo WebM · VP9 + Opus',video:true,args:['-c:v','libvpx-vp9','-crf','32','-b:v','0','-deadline','realtime','-cpu-used','6','-pix_fmt','yuv420p','-c:a','libopus','-b:a','160k']},
  wav:{label:'Audio WAV · PCM 24 bits',args:['-c:a','pcm_s24le']},
  mp3:{label:'Audio MP3 · 320 kb/s',args:['-c:a','libmp3lame','-b:a','320k']},
  flac:{label:'Audio FLAC · sin pérdida',args:['-c:a','flac']},
  m4a:{label:'Audio M4A · AAC 256 kb/s',args:['-c:a','aac','-b:a','256k']}
};
function ffmpegPath() {
  const bundled=path.join(__dirname,'codecs','ffmpeg.exe');
  if(fs.existsSync(bundled)) return bundled;
  try {return require('ffmpeg-static');} catch {throw new Error('Falta el motor de exportación local. Utiliza el paquete portable completo.');}
}
const number = n => Number(n).toFixed(6);
function envelopeExpression(points) {
  if (!points.length) return '1';
  let expression=number(points.at(-1).value);
  for(let i=points.length-2;i>=0;i--) {
    const a=points[i],b=points[i+1], delta=b.time-a.time;
    const segment=delta>0?`${number(a.value)}+(t-${number(a.time)})*${number((b.value-a.value)/delta)}`:number(b.value);
    expression=`if(lt(t,${number(b.time)}),${segment},${expression})`;
  }
  return `if(lt(t,${number(points[0].time)}),${number(points[0].value)},${expression})`;
}
function curveExpression(type,tables,p){
  const samples=tables?.[type];if(!samples?.length)return `clip(${p},0,1)`;
  if(calibrated(type,samples)){const x=`clip(${p},0,1)`;return {Linear:x,Fast:`1-pow(1-${x},2)`,Slow:`pow(${x},2)`,Smooth:`pow(${x},2)*(3-2*${x})`,Sharp:`(pow(2*${x}-1,3)+1)/2`,None:`gte(${x},1)`}[type];}
  const n=samples.length-1;let expression=number(samples[n]);
  for(let i=n-1;i>=0;i--){const a=i/n,b=(i+1)/n;expression=`if(lt(${p},${number(b)}),${number(samples[i])}+(${p}-${number(a)})*${number((samples[i+1]-samples[i])*n)},${expression})`;}
  return `if(lte(${p},0),${number(samples[0])},${expression})`;
}
async function hasAudio(filePath) {
  try {await promisify(execFile)(ffmpegPath(),['-hide_banner','-i',filePath],{windowsHide:true,maxBuffer:1024*1024});return false;}
  catch(error) {return /Stream .*Audio:/.test(error.stderr||'');}
}
async function startRender({project,profile,width=1280,height=720,fps=24,output},progress=()=>{}) {
  validateProject(project);
  const preset=presets[profile];
  if(!preset || ![24,25,30].includes(fps) || ![640,1280,1920].includes(width) || ![360,720,1080].includes(height)) throw new Error('Formato de exportación no válido.');
  const clips=project.tracks.flatMap(t=>t.clips);
  if(!clips.length) throw new Error('El proyecto no tiene eventos que exportar.');
  if(clips.some(c=>path.resolve(c.filePath).toLowerCase()===path.resolve(output).toLowerCase())) throw new Error('El destino no puede sobrescribir un medio del proyecto.');
  for(const c of clips) if(!c.filePath || !fs.existsSync(c.filePath)) throw new Error('Medio no encontrado: '+c.filePath);
  const duration=Math.max(...clips.map(c=>c.startSeconds+c.durationSeconds));
  const temporary=path.join(path.dirname(output),`.lqtac-render-${process.pid}-${Date.now()}.${profile}`);
  const args=['-hide_banner','-y'];
  let input=0;
  if(preset.video) {args.push('-f','image2pipe','-framerate',String(fps),'-vcodec','png','-i','pipe:0');input++;}
  const audioPaths=[...new Set(clips.filter(c=>c.kind==='audio').map(c=>c.filePath))];
  const available=new Map(await Promise.all(audioPaths.map(async p=>[p,await hasAudio(p)])));
  const filters=[],labels=[];
  for(const track of project.tracks.filter(t=>enabled(t,project.tracks))) for(const clip of track.clips.filter(c=>!c.mute&&c.kind==='audio'&&available.get(c.filePath))) {
    args.push('-i',clip.filePath);
    let gain=envelopeExpression(track.envelope).replace(/\bt\b/g,`(t+${number(clip.startSeconds)})`);
    gain+=`*${number((track.gain??1)*(clip.gain??1))}`;
    if(clip.fadeInSeconds>0)gain+=`*(${curveExpression(clip.fadeInCurve,clip.vegasCurves,`t/${number(clip.fadeInSeconds)}`)})`;
    if(clip.fadeOutSeconds>0)gain+=`*(1-(${curveExpression(clip.fadeOutCurve,clip.vegasCurves,`(t-${number(clip.durationSeconds-clip.fadeOutSeconds)})/${number(clip.fadeOutSeconds)}`)}))`;
    for(const peer of track.clips.filter(c=>clip.autoCrossfade!==false&&c!==clip&&!c.mute&&c.kind==='audio')) {
      const left=Math.max(clip.startSeconds,peer.startSeconds),right=Math.min(clip.startSeconds+clip.durationSeconds,peer.startSeconds+peer.durationSeconds);
      if(right<=left) continue;
      const p=`((t+${number(clip.startSeconds)}-${number(left)})/${number(right-left)})`;
      gain+=`*if(between(t+${number(clip.startSeconds)},${number(left)},${number(right)}),${clip.startSeconds>peer.startSeconds?p:`1-${p}`},1)`;
    }
    const label='a'+labels.length;
    let rate=clip.playbackRate??1;const tempo=[];while(rate>2){tempo.push('atempo=2');rate/=2;}while(rate<.5){tempo.push('atempo=0.5');rate/=.5;}tempo.push('atempo='+number(rate));
    const pan=balance(track.pan||0);
    filters.push(`[${input++}:a]atrim=start=${number(clip.sourceOffsetSeconds||0)}:duration=${number(clip.durationSeconds*(clip.playbackRate??1))},asetpts=PTS-STARTPTS,${tempo.join(',')},aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,pan=stereo|c0=${number(pan.left)}*c0|c1=${number(pan.right)}*c1,aeval=exprs='val(0)*(${gain})|val(1)*(${gain})':c=stereo,aformat=channel_layouts=stereo,adelay=${Math.round(clip.startSeconds*48000)}S:all=1[${label}]`);
    labels.push(`[${label}]`);
  }
  if(labels.length) filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0,apad${project.compatibility?'':',alimiter=limit=0.98:level=false'}[aout]`);
  else {args.push('-f','lavfi','-i','anullsrc=r=48000:cl=stereo');filters.push(`[${input}:a]anull[aout]`);}
  const filterFile=temporary+'.filters.txt';await fs.promises.writeFile(filterFile,filters.join(';'),'utf8');args.push('-filter_complex_script',filterFile);
  if(preset.video) args.push('-map','0:v');
  args.push('-map','[aout]','-t',number(duration),...preset.args,'-progress','pipe:1','-nostats',temporary);
  const child=spawn(ffmpegPath(),args,{windowsHide:true,stdio:['pipe','pipe','pipe']});
  let stderr='',cancelled=false,settled=false,frames=0;
  child.stderr.on('data',data=>{stderr=(stderr+data).slice(-10000);});
  child.stdout.on('data',data=>{const match=String(data).match(/out_time_us=(\d+)/);if(match)progress(Math.min(1,Number(match[1])/1e6/duration));});
  child.stdin.on('error',()=>{});
  const done=new Promise((resolve,reject)=>{
    child.once('error',error=>{void fs.promises.rm(filterFile,{force:true});reject(error);});
    child.once('close',async code=>{
      settled=true;
      try {
        if(cancelled)throw new Error('Exportación cancelada.');
        if(code!==0)throw new Error('No se pudo exportar: '+stderr);
        await fs.promises.rename(temporary,output);resolve({output,duration,frames});
      }catch(error){await fs.promises.rm(temporary,{force:true}).catch(()=>{});reject(error);}finally{await fs.promises.rm(filterFile,{force:true}).catch(()=>{});}
    });
  });
  done.catch(()=>{});
  return {duration,video:!!preset.video,done,
    async frame(base64){if(settled||cancelled)throw new Error('La exportación se ha detenido.');const bytes=Buffer.from(base64,'base64');if(bytes.length>32*1024*1024)throw new Error('Fotograma demasiado grande.');await new Promise((resolve,reject)=>child.stdin.write(bytes,error=>error?reject(error):resolve()));frames++;},
    finish(){child.stdin.end();return done;},
    cancel(){cancelled=true;child.kill();}
  };
}
module.exports={presets,ffmpegPath,startRender,envelopeExpression};
