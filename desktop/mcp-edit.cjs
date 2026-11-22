const crypto=require('node:crypto');
const io=require('./project-io.cjs');
const generators=require('../dist/assets/generator-model.js');
const revision=p=>crypto.createHash('sha256').update(JSON.stringify({...p,time:0,zoom:0,zoomStart:0})).digest('hex');
const uid=prefix=>prefix+'-'+crypto.randomUUID();
const clipKeys=new Set(['name','startSeconds','durationSeconds','sourceOffsetSeconds','playbackRate','gain','mute','fadeInSeconds','fadeOutSeconds','videoFx','audioFx','panCrop','motionPath','transition','reverse','loop','subtitleText','subtitleStyle']);
function describe(project){return {revision:revision(project),project,references:project.tracks.flatMap(t=>t.clips.map((c,i)=>({ref:t.id+':'+i,trackId:t.id,name:c.name,groupId:c.groupId||''})))};}
async function edit(project,operations,probe){
 const p=structuredClone(project),refs=new Map(p.tracks.flatMap(t=>t.clips.map((c,i)=>[t.id+':'+i,c])));
 const track=id=>{const t=p.tracks.find(t=>t.id===id);if(!t)throw Error('No existe la pista '+id);return t;};
 const clip=ref=>{const c=refs.get(ref);if(!c||!p.tracks.some(t=>t.clips.includes(c)))throw Error('Referencia de clip no válida: '+ref);return c;};
 const group=(c,include)=>include&&c.groupId?p.tracks.flatMap(t=>t.clips).filter(x=>x.groupId===c.groupId):[c];
 const addTrack=(kind,name,id=uid('track'))=>{if(p.tracks.some(t=>t.id===id)||!/^[A-Za-z0-9_ .·-]{1,64}$/.test(id))throw Error('ID de pista no válido o duplicado');const t={id,kind,name:name||kind,envelope:[],clips:[],gain:1,pan:0,mute:false,solo:false};p.tracks.push(t);return t;};
 for(const o of operations){
  if(o.op==='addTrack')addTrack(o.kind||'video',o.name,o.id);
  else if(o.op==='insertClip'){
   const t=track(o.trackId),m=await probe(o.path);if(t.kind==='subtitle'||t.kind==='audio'&&!m.hasAudio||t.kind==='video'&&m.kind==='audio')throw Error('El medio no es compatible con la pista');
   const rate=1,offset=o.offset??0,duration=o.duration??(m.kind==='image'?5:m.duration-offset),start=o.start??0;
   const c={kind:t.kind,filePath:m.path,name:m.name,startSeconds:start,durationSeconds:duration,sourceOffsetSeconds:offset,playbackRate:rate,gain:1,fadeInSeconds:0,fadeOutSeconds:0};
   if(m.kind!=='image')c.sourceDurationSeconds=m.duration;
   t.clips.push(c);
   if(!p.library.some(x=>x.filePath===m.path))p.library.push({name:m.name,kind:m.kind==='audio'?'audio':'video',filePath:m.path});
   if(t.kind==='video'&&m.hasAudio&&o.splitAudio!==false){const a=o.audioTrackId?track(o.audioTrackId):addTrack('audio','Audio · '+m.name);if(a.kind!=='audio')throw Error('La pista asociada debe ser de audio');const id=uid('group');Object.assign(c,{groupId:id,groupType:'av'});a.clips.push({...structuredClone(c),kind:'audio',name:m.name+' · audio'});}
  }else if(o.op==='updateClip'){
   const c=clip(o.ref),patch=o.patch||{};if(Object.keys(patch).some(k=>!clipKeys.has(k)))throw Error('Propiedad de clip no admitida');
   const members=group(c,o.includeGroup!==false),delta=patch.startSeconds===undefined?0:patch.startSeconds-c.startSeconds;
   // Time edits propagate to grouped audio; kind-specific FX stay on the requested event.
   for(const member of members){const change=member===c?patch:Object.fromEntries(Object.entries(patch).filter(([k])=>['startSeconds','durationSeconds','sourceOffsetSeconds','playbackRate','reverse'].includes(k)));if(change.startSeconds!==undefined)member.startSeconds+=delta;Object.assign(member,Object.fromEntries(Object.entries(change).filter(([k])=>k!=='startSeconds')));}
  }else if(o.op==='removeClip'){const members=group(clip(o.ref),o.includeGroup!==false);for(const t of p.tracks)t.clips=t.clips.filter(c=>!members.includes(c));}
  else if(o.op==='removeTrack'){track(o.trackId);p.tracks=p.tracks.filter(t=>t.id!==o.trackId);}
  else if(o.op==='reorderTrack'){const t=track(o.trackId);p.tracks=p.tracks.filter(x=>x!==t);p.tracks.splice(Math.min(o.index??0,p.tracks.length),0,t);}
  else if(o.op==='updateTrack'){const patch=o.patch||{};if(Object.keys(patch).some(k=>!['name','gain','pan','mute','solo'].includes(k)))throw Error('Propiedad de pista no admitida');Object.assign(track(o.trackId),patch);}
  else if(o.op==='envelope'){const t=track(o.trackId);if(t.kind==='subtitle')throw Error('Subtítulos sin envolvente');t.envelope=o.points||[];t.envelopeVisible=true;}
  else if(o.op==='subtitle'){const t=track(o.trackId);if(t.kind!=='subtitle')throw Error('Selecciona una pista de subtítulos');t.clips.push({kind:'subtitle',filePath:'',name:o.text,subtitleText:o.text,subtitleStyle:o.style||{},startSeconds:o.start??0,durationSeconds:o.duration??3});}
  else if(o.op==='title'){const t=track(o.trackId);if(t.kind!=='video')throw Error('Los títulos requieren una pista de vídeo');const g=generators.create(o.titleType||'title');g.duration=o.duration??5;const texts=g.objects?.filter(x=>x.type==='textbox');if(texts?.length){texts[0].text=o.text||'Título';for(const extra of texts.slice(1))extra.text='';}t.clips.push({kind:'video',filePath:'',name:o.text||'Título',generator:g,startSeconds:o.start??0,durationSeconds:g.duration,sourceOffsetSeconds:0});p.library.push({name:o.text||'Título',kind:'video',filePath:'',generator:g});}
  else if(o.op==='group'){const id=uid('group');for(const ref of o.refs||[])Object.assign(clip(ref),{groupId:id,groupType:'custom'});}
  else if(o.op==='ungroup'){for(const c of group(clip(o.ref),true)){c.groupId='';c.groupType='';}}
 }
 io.validateProject(p);
 return p;
}
module.exports={edit,revision,describe};
