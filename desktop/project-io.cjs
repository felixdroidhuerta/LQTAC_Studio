const fs = require('node:fs/promises');
const path = require('node:path');
const {calibrated}=require('../dist/assets/work-model.js');

function validateProject(data) {
  if (!data || data.format !== 'LQTAC Studio' || data.version !== 1 || !Array.isArray(data.tracks) || data.tracks.length > 200 || !Array.isArray(data.library)) throw new Error('No es un proyecto LQTS compatible (versión 1).');
  if(data.renderRange!==undefined&&data.renderRange!==null)require('../dist/assets/render-range-model.js').validate(data.renderRange);
  for(const item of data.library)if(item.generator)require('../dist/assets/generator-model.js').validate(item.generator);
  let count = 0;
  for (const track of data.tracks) {
    for(const key of ['mute','solo'])if(track[key]!==undefined&&typeof track[key]!=='boolean')throw new Error('Estado de pista no válido.');
    if(track.vegasMix!==undefined&&typeof track.vegasMix!=='boolean')throw new Error('Modo de mezcla no válido.');
    if(track.karaokeEnabled!==undefined&&(typeof track.karaokeEnabled!=='boolean'||track.kind!=='subtitle'))throw new Error('Estado karaoke de pista no válido.');
    if(track.karaokeSync!==undefined){if(track.kind!=='subtitle')throw Error('Progreso karaoke en pista no válida');require('../dist/assets/karaoke-sync-model.js').validateCheckpoint(track.karaokeSync);}
    if(track.gain!==undefined&&(!Number.isFinite(track.gain)||track.gain<0||track.gain>4))throw new Error('Ganancia de pista no válida.');
    if(track.pan!==undefined&&(!Number.isFinite(track.pan)||Math.abs(track.pan)>1))throw new Error('Pan de pista no válido.');
    if (!['video','audio','subtitle'].includes(track.kind) || !Array.isArray(track.clips) || !Array.isArray(track.envelope)) throw new Error('Pista LQTS no válida.');
    for (const p of track.envelope) if (!Number.isFinite(p.time) || p.time < 0 || !Number.isFinite(p.value) || p.value < 0 || p.value > 1) throw new Error('Envolvente no válida.');
    track.envelope.sort((a,b)=>a.time-b.time);
    for (const clip of track.clips) {
      if(clip.generator){if(clip.kind!=='video'||track.kind!=='video'||clip.filePath)throw Error('Pista de generador no válida');require('../dist/assets/generator-model.js').validate(clip.generator);if((clip.sourceOffsetSeconds||0)+clip.durationSeconds*(clip.playbackRate||1)>clip.generator.duration+.002)throw Error('El generador no cubre el clip');}
      if(clip.kind==='subtitle'){if(track.kind!=='subtitle'||clip.filePath)throw Error('Pista de subtítulos no válida');require('../dist/assets/subtitle-model.js').validate(clip);}else if(track.kind==='subtitle')throw Error('Una pista de subtítulos no admite medios');
      const effects=require('../dist/assets/effects-model.js');effects.validate(clip.videoFx,'video');effects.validate(clip.audioFx,'audio');
      for(const points of Object.values(clip.videoFx?.animation||{}))if(points.at(-1).time>clip.durationSeconds+.002)throw Error('La animación FX excede la duración del evento');
      for(const points of Object.values(clip.audioFx?.animation||{}))if(points.at(-1).time>clip.durationSeconds+.002)throw Error('La animación de audio excede la duración del evento');
      if(clip.autoCrossfade!==undefined&&typeof clip.autoCrossfade!=='boolean')throw new Error('Modo de fundido no válido.');
      for(const k of ['fadeInCurve','fadeOutCurve','fadeInReciprocalCurve','fadeOutReciprocalCurve'])if(clip[k]!==undefined&&!['Linear','Fast','Slow','Smooth','Sharp','None'].includes(clip[k]))throw new Error('Curva no válida.');
      if(clip.vegasCurves!==undefined){if(!clip.vegasCurves||typeof clip.vegasCurves!=='object'||Array.isArray(clip.vegasCurves)||Object.keys(clip.vegasCurves).length>6)throw new Error('Calibración no válida.');for(const [type,table] of Object.entries(clip.vegasCurves))if(!Array.isArray(table)||table.length>4097||!calibrated(type,table))throw new Error('Curva no calibrada para este motor.');}
      if(clip.mute!==undefined&&typeof clip.mute!=='boolean')throw new Error('Mute de evento no válido.');
      if(clip.reverse!==undefined&&(typeof clip.reverse!=='boolean'||clip.reverse&&clip.kind==='subtitle'))throw Error('Dirección de reproducción no válida.');
      if(clip.gain!==undefined&&(!Number.isFinite(clip.gain)||clip.gain<0||clip.gain>4))throw new Error('Ganancia de evento no válida.');
      if(clip.playbackRate!==undefined&&(!Number.isFinite(clip.playbackRate)||clip.playbackRate<.25||clip.playbackRate>4))throw new Error('Velocidad fuera del rango 0.25–4.');
      if(clip.repeatIndex!==undefined&&(!Number.isSafeInteger(clip.repeatIndex)||clip.repeatIndex<1))throw Error('Índice de repetición no válido.');
      if(clip.panCrop!==undefined){
        if(!Array.isArray(clip.panCrop)||clip.panCrop.length>1000)throw new Error('Pan/Crop no válido.');
        let previous=-1;for(const f of clip.panCrop){if(!Number.isFinite(f.time)||f.time<0||f.time<=previous||f.time>clip.durationSeconds+.002||!Number.isFinite(f.x)||Math.abs(f.x)>10||!Number.isFinite(f.y)||Math.abs(f.y)>10||!Number.isFinite(f.width)||f.width<.01||f.width>10||!Number.isFinite(f.height)||f.height<.01||f.height>10||!Number.isFinite(f.rotation)||Math.abs(f.rotation)>3600)throw new Error('Fotograma clave Pan/Crop no válido.');previous=f.time;}
      }
      for(const key of ['fadeInSeconds','fadeOutSeconds'])if(clip[key]!==undefined&&(!Number.isFinite(clip[key])||clip[key]<0||clip[key]>clip.durationSeconds+.002))throw new Error('Duración de fade no válida.');
      if(clip.sourceOffsetSeconds!==undefined&&(!Number.isFinite(clip.sourceOffsetSeconds)||clip.sourceOffsetSeconds<0))throw new Error('Inicio del medio no válido.');
      if(clip.sourceDurationSeconds!==undefined&&(!Number.isFinite(clip.sourceDurationSeconds)||clip.sourceDurationSeconds<=0||(clip.sourceOffsetSeconds||0)+clip.durationSeconds*(clip.playbackRate??1)>clip.sourceDurationSeconds+.002))throw new Error('Recorte fuera de los límites del medio.');
      if (++count > 10000 || !['video','audio','subtitle'].includes(clip.kind) || typeof clip.filePath !== 'string' || !Number.isFinite(clip.startSeconds) || clip.startSeconds < 0 || !Number.isFinite(clip.durationSeconds) || clip.durationSeconds <= 0 || clip.startSeconds + clip.durationSeconds > 604800) throw new Error('Evento LQTS no válido.');
      if (clip.mask && (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(clip.mask.dataUrl || '') || clip.mask.dataUrl.length > 24*1024*1024)) throw new Error('Máscara LQTS no válida.');
    }
  }
  return data;
}
function references(data) { return [...data.library, ...data.tracks.flatMap(t=>t.clips)]; }
async function saveProject(filePath, data) {
  data = validateProject(structuredClone(data));
  for (const item of references(data)) if (item.filePath) {
    item.originalPath = path.resolve(item.filePath);
    item.filePath = path.relative(path.dirname(filePath),item.originalPath);
  }
  const temporary = filePath + '.' + process.pid + '.tmp';
  try { await fs.writeFile(temporary,JSON.stringify(data,null,2),'utf8'); await fs.rename(temporary,filePath); }
  finally { await fs.rm(temporary,{force:true}).catch(()=>{}); }
}
async function openProject(filePath) {
  if ((await fs.stat(filePath)).size > 100*1024*1024) throw new Error('El proyecto supera 100 MB.');
  const project = validateProject(JSON.parse(await fs.readFile(filePath,'utf8')));
  const missing = new Set();
  for (const item of references(project)) if (item.filePath) {
    const relative = path.resolve(path.dirname(filePath),item.filePath);
    const exists = async p => !!p && !!(await fs.stat(p).catch(()=>null));
    item.filePath = await exists(relative) ? relative : await exists(item.originalPath) ? item.originalPath : relative;
    if (!await exists(item.filePath)) missing.add(item.filePath);
  }
  return {project,missing:[...missing]};
}
module.exports = {validateProject,saveProject,openProject};
