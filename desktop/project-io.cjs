const fs = require('node:fs/promises');
const path = require('node:path');

function validateProject(data) {
  if (!data || data.format !== 'LQTAC Studio' || data.version !== 1 || !Array.isArray(data.tracks) || data.tracks.length > 200 || !Array.isArray(data.library)) throw new Error('No es un proyecto LQTS compatible (versión 1).');
  let count = 0;
  for (const track of data.tracks) {
    if (!['video','audio'].includes(track.kind) || !Array.isArray(track.clips) || !Array.isArray(track.envelope)) throw new Error('Pista LQTS no válida.');
    for (const p of track.envelope) if (!Number.isFinite(p.time) || p.time < 0 || !Number.isFinite(p.value) || p.value < 0 || p.value > 1) throw new Error('Envolvente no válida.');
    track.envelope.sort((a,b)=>a.time-b.time);
    for (const clip of track.clips) {
      for(const key of ['fadeInSeconds','fadeOutSeconds'])if(clip[key]!==undefined&&(!Number.isFinite(clip[key])||clip[key]<0||clip[key]>clip.durationSeconds+.002))throw new Error('Duración de fade no válida.');
      if(clip.sourceOffsetSeconds!==undefined&&(!Number.isFinite(clip.sourceOffsetSeconds)||clip.sourceOffsetSeconds<0))throw new Error('Inicio del medio no válido.');
      if(clip.sourceDurationSeconds!==undefined&&(!Number.isFinite(clip.sourceDurationSeconds)||clip.sourceDurationSeconds<=0||clip.sourceOffsetSeconds+clip.durationSeconds>clip.sourceDurationSeconds+.002))throw new Error('Recorte fuera de los límites del medio.');
      if (++count > 10000 || !['video','audio'].includes(clip.kind) || typeof clip.filePath !== 'string' || !Number.isFinite(clip.startSeconds) || clip.startSeconds < 0 || !Number.isFinite(clip.durationSeconds) || clip.durationSeconds <= 0 || clip.startSeconds + clip.durationSeconds > 604800) throw new Error('Evento LQTS no válido.');
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
