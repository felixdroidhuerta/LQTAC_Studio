const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {validateProject}=require('./project-io.cjs');
const close=(a,b,tolerance=1e-6)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tolerance;
function convertBridge(d){
  if(d?.format!=='LQTAC VEGAS bridge'||d.version!==1||!Array.isArray(d.tracks)||d.tracks.length>200||d.tracks.some(t=>!Array.isArray(t.events))||d.tracks.reduce((n,t)=>n+t.events.length,0)>10000||!Array.isArray(d.readErrors))throw Error('No es un puente VEGAS compatible.');
  const report={format:'LQTAC VEGAS compatibility',version:1,vegasVersion:d.vegasVersion,exporterVersion:d.exporterVersion,sourceSha256:d.sourceSha256,sourceProject:d.project?.FilePath,sourceVideo:d.video,sourceAudio:d.audio,createdUtc:new Date().toISOString(),errors:[],warnings:[],mapping:[],exactAudiovisualMatch:false};
  const fail=(scope,code,detail)=>report.errors.push({scope,code,detail});
  const warn=(scope,code,detail)=>report.warnings.push({scope,code,detail});
  report.curveCalibration=Object.entries(d.nativeCurves||{}).map(([type,table])=>({type,samples:table.length,maxError:Math.max(...table.map((v,i)=>Math.abs(v-require('../dist/assets/work-model.js').curveFormula(type,i/(table.length-1)))))}));
  if(d.readErrors.length)fail('project','API_READ_ERRORS',d.readErrors);
  if(d.modifiedBefore||d.modifiedAfter)fail('project','UNSAVED_PROJECT','Exporta una sesión guardada.');
  if(!close(d.video?.FrameRate,24)||!close(d.video?.PixelAspectRatio,1)||d.video?.FieldOrder!=='ProgressiveScan')fail('project','PROJECT_VIDEO','Inicialmente se admite 24 fps progresivo, píxel cuadrado.');
  if(d.audio?.MasterBusMode!=='Stereo')fail('project','SURROUND','No se admite mezcla surround.');
  const ignoreEffects=(scope,fx)=>{for(const f of fx||[])if(!f.Bypass)warn(scope,'OMITTED_PLUGIN',f.plugin?.Name||'Plugin sin nombre');};
  ignoreEffects('videoBus',d.videoBusEffects);ignoreEffects('masterBus',d.masterBusEffects);
  for(const b of d.buses||[]){ignoreEffects('bus:'+b.Name,b.effects);if(b.envelopes?.length||b.Mute||b.Solo)fail('bus:'+b.Name,'BUS_AUTOMATION','Bus con mute/solo o automatización no representable.');}
  const project={format:'LQTAC Studio',version:1,name:path.win32.basename(d.project?.FilePath||'VEGAS','.veg'),fps:24,video:{width:d.video?.Width||1280,height:d.video?.Height||720,pixelAspectRatio:1},time:0,zoom:1,zoomStart:0,library:[],tracks:[],compatibility:report};
  const library=new Map();
  for(const t of d.tracks){
    const kind=t.MediaType==='Audio'?'audio':t.MediaType==='Video'?'video':null;
    if(!kind){fail(t.id,'TRACK_TYPE',t.MediaType);continue;}
    ignoreEffects(t.id,t.effects);
    if(t.IsAdjustmentTrack||t.CompositeNestingLevel>0||t.motion?.HasMotionData||t.motion?.HasShadowData||t.motion?.HasGlowData)fail(t.id,'TRACK_COMPOSITING','Movimiento/jerarquía de pista no representable.');
    if(kind==='video'&&t.CompositeMode!=='SrcAlpha')fail(t.id,'COMPOSITE_MODE',t.CompositeMode);
    if(t.InvertPhase)fail(t.id,'INVERT_PHASE',true);
    const pan=t.PanX||0;
    if(pan!==0&&t.bus?.PanType!=='Balance')fail(t.id,'PAN_LAW','Paneo '+t.bus?.PanType+' pendiente de validación; no se sustituye por balance.');
    if(kind==='audio'&&t.bus?.Name!=='Master')fail(t.id,'BUS_ROUTING',t.bus?.Name);
    const track={id:t.id,name:t.Name||`${kind==='audio'?'Audio':'Vídeo'} ${t.Index+1}`,kind,role:kind,mute:!!t.Mute,solo:!!t.Solo,gain:kind==='audio'?t.Volume:t.CompositeLevel,pan,envelopeVisible:!!t.envelopes?.length,envelope:[],clips:[],vegasMix:kind==='video'};
    for(const env of t.envelopes||[]){
      if(!['Volume','Composite'].includes(env.Type)){fail(t.id,'ENVELOPE_TYPE',env.Type);continue;}
      if(track.envelope.length){fail(t.id,'MULTIPLE_ENVELOPES',env.Type);continue;}
      for(const p of env.points){if(!['Linear','None'].includes(p.Curve)||p.Y<0||p.Y>1)fail(t.id,'ENVELOPE_CURVE_OR_GAIN',p);track.envelope.push({time:p.X,value:p.Y});}
    }
    for(const e of t.events){
      const scope=e.id,take=e.takes?.find(t=>t.IsActive);
      if(!take){fail(scope,'ACTIVE_TAKE','No hay toma activa.');continue;}
      if(e.takes.length!==1)fail(scope,'MULTIPLE_TAKES','Varias tomas no representadas.');
      const media=take.media,stream=take.stream;
      if(!media||media.IsOffline||!media.fileExists||media.IsGenerated||media.IsSubclip)fail(scope,'MEDIA_UNAVAILABLE_OR_SPECIAL',take.MediaPath);
      if(!Number.isFinite(e.PlaybackRate)||e.PlaybackRate<.25||e.PlaybackRate>4)fail(scope,'PLAYBACK_RATE',e.PlaybackRate);
      if((take.Offset||0)+e.Length*e.PlaybackRate>media.Length+.002)fail(scope,'LOOP_OR_SOURCE_OVERRUN',{offset:take.Offset,length:e.Length,rate:e.PlaybackRate,source:media.Length});
      if(e.IsAdjustmentEvent||e.Normalize||e.InvertPhase||e.PitchSemis)fail(scope,'EVENT_AUDIO_OR_ADJUSTMENT','Normalización/fase/tono/ajuste no representable.');
      if(e.envelopes?.length)fail(scope,'EVENT_ENVELOPES',e.envelopes.map(x=>x.Type));
      if(e.MediaType!==t.MediaType||stream?.MediaType!==t.MediaType)fail(scope,'STREAM_TYPE','Tipo de toma distinto de pista.');
      const sameStreams=media.streams?.filter(s=>s.MediaType===e.MediaType)||[];
      if(sameStreams.length!==1||stream?.Index!==sameStreams[0]?.Index)fail(scope,'STREAM_SELECTION','Selección de streams no representable.');
      if(kind==='audio'&&(take.FirstAudioChannelIndex!==0||take.AudioChannelCount>2||!['None','Both'].includes(e.Channels)))fail(scope,'CHANNEL_MAPPING',{first:take.FirstAudioChannelIndex,count:take.AudioChannelCount,mode:e.Channels});
      if(kind==='audio'&&e.PlaybackRate!==1&&!e.PitchLock)fail(scope,'PITCH_CHANGE','Velocidad de audio sin conservar tono no implementada.');
      ignoreEffects(scope,e.effects);ignoreEffects(scope+':media',media.effects);
      if(!close(e.fadeIn.Gain,e.fadeOut.Gain))fail(scope,'ASYMMETRIC_GAIN','Ganancia distinta en ambos extremos.');
      if(e.fadeIn.transition||e.fadeOut.transition)fail(scope,'TRANSITION_PLUGIN','Transición externa no representable.');
      const fade={};for(const side of ['fadeIn','fadeOut']){
        const f=e[side];fade[side+'Seconds']=f.Length;
        for(const [field,key] of [['Curve',side+'Curve'],['ReciprocalCurve',side+'ReciprocalCurve']]){
          if(f.Length>0&&!Array.isArray(d.nativeCurves?.[f[field]])&&f[field]!=='Linear')fail(scope,'UNMEASURED_CURVE',f[field]);
          fade[key]=f[field];
        }
      }
      const clip={name:e.Name||take.Name||path.win32.basename(take.MediaPath),kind,filePath:take.MediaPath,startSeconds:e.Start,durationSeconds:e.Length,sourceOffsetSeconds:take.Offset,sourceDurationSeconds:media.Length,playbackRate:e.PlaybackRate,mute:!!e.Mute,gain:e.fadeIn.Gain,groupId:e.groupId||'',groupType:e.groupId?'vegas':'',transition:'fade',autoCrossfade:false,...fade,panCrop:[],vegasCurves:d.nativeCurves};
      if(kind==='video'){
        if(e.PlaybackRate!==1||!close(stream.FrameRate,d.video.FrameRate))warn(scope,'RESAMPLING_NOT_CERTIFIED',{eventMode:e.ResampleMode??null,sourceFps:stream.FrameRate??null,projectFps:d.video.FrameRate,rate:e.PlaybackRate});
        if(e.UnderSampleRate!==undefined&&!close(e.UnderSampleRate,1))fail(scope,'UNDERSAMPLE','Submuestreo no implementado.');
        if(!e.MaintainAspectRatio||!close(stream.PixelAspectRatio,1))fail(scope,'ASPECT_RATIO','Aspecto no representable.');
        const frames=e.motion?.keyframes||[];if(!frames.length)fail(scope,'PAN_CROP_MISSING','No hay datos Pan/Crop.');
        for(const f of frames){
          const b=f.bounds,w=stream.Width,h=stream.Height;
          if(!b||!w||!h){fail(scope,'PAN_CROP_BOUNDS','Dimensiones ausentes.');continue;}
          if(frames.length>1&&(f.Type!=='Linear'||f.Smoothness!==0))fail(scope,'PAN_CROP_INTERPOLATION',f.Type);
          if(!close(f.Rotation,0))fail(scope,'PAN_CROP_ROTATION_UNVERIFIED','Rotación pendiente de validar frente a VEGAS.');
          if(!close(b.TopLeft.Y,b.TopRight.Y)||!close(b.TopLeft.X,b.BottomLeft.X)||!close(b.TopRight.X,b.BottomRight.X)||!close(b.BottomLeft.Y,b.BottomRight.Y))fail(scope,'PAN_CROP_POLYGON','Cuadrilátero no rectangular.');
          const cw=b.TopRight.X-b.TopLeft.X,ch=b.BottomLeft.Y-b.TopLeft.Y;
          if(cw<=0||ch<=0)fail(scope,'PAN_CROP_FLIP','Reflejo o tamaño negativo.');
          clip.panCrop.push({time:f.Position,x:(b.TopLeft.X+b.TopRight.X)/2/w,y:(b.TopLeft.Y+b.BottomLeft.Y)/2/h,width:cw/w,height:ch/h,rotation:0});
        }
      }
      track.clips.push(clip);report.mapping.push({sourceTrack:t.id,sourceEvent:e.id,targetTrack:track.id,targetEventIndex:track.clips.length-1,start:e.Start,length:e.Length,offset:take.Offset,rate:e.PlaybackRate,streamIndex:stream?.Index});
      const key=kind+'|'+take.MediaPath;if(!library.has(key))library.set(key,{name:path.win32.basename(take.MediaPath),kind,filePath:take.MediaPath});
    }
    const ordered=[...track.clips].sort((a,b)=>a.startSeconds-b.startSeconds);
    for(const top of ordered){
      const active=ordered.filter(c=>c.startSeconds<=top.startSeconds&&c.startSeconds+c.durationSeconds>top.startSeconds+1e-7);
      if(active.length>2)fail(t.id,'MULTIPLE_OVERLAP','Más de dos eventos simultáneos en una pista.');
      const previous=ordered.slice(0,ordered.indexOf(top)).filter(c=>c.startSeconds+c.durationSeconds>top.startSeconds+1e-7).at(-1);
      if(previous&&top.fadeInSeconds>0){const overlap=previous.startSeconds+previous.durationSeconds-top.startSeconds;
        if(!close(overlap,top.fadeInSeconds,.000002))fail(t.id,'COMPLEX_CROSSFADE','El solapamiento no coincide con el fade de entrada.');
        if(kind==='audio'){previous.fadeOutSeconds=top.fadeInSeconds;previous.fadeOutCurve=top.fadeInReciprocalCurve;}
      }
    }
    project.tracks.push(track);
  }
  project.library=[...library.values()];
  if(!report.errors.length){try{validateProject(project);}catch(e){fail('project','LQTS_VALIDATION',e.message);}}
  report.status=report.errors.length?'blocked':'mapped-unverified';
  // Precise structure does not imply a certified colour/audio/render match.
  report.warnings.push({scope:'project',code:'AUDIOVISUAL_VALIDATION_PENDING',detail:'Estructura y curvas calibradas; composición, color y audio pendientes de contraste perceptual con render VEGAS.'});
  return {project:report.errors.length?null:project,report};
}
async function readBridge(bridgePath,vegPath){
  if((await fs.stat(bridgePath)).size>100*1024*1024)throw Error('El puente supera 100 MB.');
  const d=JSON.parse(await fs.readFile(bridgePath,'utf8'));
  if(vegPath){if((await fs.stat(vegPath)).size>100*1024*1024)throw Error('El VEG supera 100 MB.');const sha=crypto.createHash('sha256').update(await fs.readFile(vegPath)).digest('hex');if(sha!==d.sourceSha256)throw Error('El puente no corresponde al VEG actual. Vuelve a exportarlo desde VEGAS.');}
  const result=convertBridge(d);return {...result,bridgePath,sourcePath:vegPath||d.project?.FilePath};
}
async function openVegas(vegPath){
  const prefix=path.basename(vegPath)+'.',directory=path.dirname(vegPath);
  const candidates=(await fs.readdir(directory)).filter(n=>n.startsWith(prefix)&&n.endsWith('.lqtac.json')).sort().reverse();
  if(!candidates.length)throw Error('Este VEG necesita su puente estructural. Abre el proyecto en VEGAS y ejecuta tools/vegas/ExportLqtac.cs; después vuelve a elegir el .veg en LQTAC.');
  return readBridge(path.join(directory,candidates[0]),vegPath);
}
module.exports={convertBridge,readBridge,openVegas};
