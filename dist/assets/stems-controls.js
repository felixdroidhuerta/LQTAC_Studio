(function(){
const dialog=document.createElement('dialog');dialog.id='stemsDialog';dialog.className='work-dialog';dialog.style.width='min(760px,94vw)';document.body.append(dialog);let session=null;
dialog.addEventListener('keydown',event=>event.stopPropagation());
const style=document.createElement('style');style.textContent='#stemsDialog footer{position:sticky;bottom:-22px;padding:10px 0;background:#102747}#stemsPreviewGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}#stemsPreviewGrid p{margin:0 0 5px}#stemsPreviewGrid audio{width:100%;height:40px;color-scheme:dark}@media(max-width:550px){#stemsPreviewGrid{grid-template-columns:1fr}}';document.head.append(style);
const labels={vocals:'Voz',drums:'Batería',bass:'Bajo',other:'Otros instrumentos'};
function target(){const clip=selectedTimelineClip;if(clip?.dataset.kind==='audio'&&clip.dataset.filePath)return clip;if(clip?.dataset.kind==='video'&&clip.dataset.groupId)return groupMembers(clip).find(c=>c.dataset.kind==='audio'&&c.dataset.filePath);return null;}
function insert(result,original,mute){
 if(!original?.isConnected)throw Error('El evento original ya no está en el proyecto');if($$('.track').length+4>200)throw Error('No hay espacio para cuatro pistas nuevas (máximo 200). Los WAV se conservan en el destino.');
 historyCheckpoint();historyMuted++;try{
  const groupId='stems-'+crypto.randomUUID();const created=[];
  for(const stem of ['vocals','drums','bass','other']){
   const file=result.files.find(f=>f.stem===stem),name=result.sourceName+' · '+labels[stem];
   const card=addImportedCard({name:name+'.wav',filePath:file.filePath},'wav','audio');$('span',card).textContent='Demucs · WAV 24 bits · estéreo · 44,1 kHz';
   const track=addTimelineTrack('audio');$$('#trackLabels .track-label strong').at(-1).textContent=track.dataset.track+' · '+labels[stem];track.dataset.role='stems';
   const clip=createTimelineClip(track,{name,kind:'audio',filePath:file.filePath,startSeconds:result.startSeconds,durationSeconds:result.durationSeconds,sourceOffsetSeconds:0,sourceDurationSeconds:result.frames/result.sampleRate},result.startSeconds/timelineDurationSeconds*100);clip.dataset.groupId=groupId;clip.dataset.groupType='stems';clip.classList.add('grouped');created.push(clip);
  }
  if(mute)original.dataset.mute='true';$('#mediaCount').textContent=$$('.media-card').length+' elementos';refreshTimelineScale();syncTrackHeaders();applyTimelineSelection(created);void renderTimelineAt(result.startSeconds);
 }finally{historyMuted--;}
}
async function open(){
 if(exporting||historyBusy||effectsBusy||dialog.open)return;const preferred=target();stopTimelinePlayback();
 const source=projectSnapshot(),refs=$$('.track').map(track=>timelineClips().filter(c=>c.parentElement===track)),s={clip:null,source,refs,row:null,index:null,choices:[],loaded:false,busy:false,closed:false,folder:null,off:null,inserted:false};session=s;
 dialog.innerHTML='<h2>Separar instrumentos · prueba local</h2><p id="stemsSource"></p><p>Demucs genera Voz, Batería, Bajo y Otros instrumentos. Procesa el evento tal como está editado: recorte, velocidad, fundidos, FX y ajustes de su pista. No modifica el archivo original.</p><p>Motor CPU, sin conexión. Puede tardar varios minutos y la calidad depende de la mezcla; pueden quedar restos entre instrumentos. Máximo 30 minutos por evento en esta prueba.</p><label>Destino<button type="button" id="stemsFolder">Elegir carpeta…</button><span id="stemsPath" style="display:block;overflow-wrap:anywhere"></span></label><label style="display:block;margin:14px 0"><input type="checkbox" id="stemsMute" checked> Silenciar el evento original al insertar las pistas</label><progress id="stemsProgress" max="1" value="0" style="width:100%"></progress><p id="stemsStatus" role="status">Comprobando motor local…</p><div id="stemsResult"></div><footer><button type="button" id="stemsClose">Cerrar</button><button type="button" id="stemsRun" disabled>Separar e insertar cuatro pistas</button></footer>';
 $('#stemsSource').insertAdjacentHTML('beforebegin','<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px"><label style="display:flex;flex-direction:column;align-items:stretch">Pista a procesar<select id="stemsTrack" style="width:100%" disabled></select></label><label style="display:flex;flex-direction:column;align-items:stretch">Evento de audio<select id="stemsClip" style="width:100%" disabled></select></label></div><p>Solo se muestran eventos de audio disponibles de hasta 30 minutos. Si una pista tiene varios eventos, elige el que quieras separar.</p>');
 $('#stemsStatus').textContent='Buscando pistas de audio disponibles…';dialog.showModal();
 function ui(){const locked=s.busy||s.inserted;for(const id of ['stemsFolder','stemsMute','stemsTrack','stemsClip'])$('#'+id).disabled=locked||!s.clip;$('#stemsRun').disabled=locked||!s.clip||!s.folder||!s.ready;$('#stemsRun').textContent=s.inserted?'Separación completada':'Separar e insertar cuatro pistas';$('#stemsClose').textContent=s.busy?'Cancelar separación':'Cerrar';}
 const status=msg=>$('#stemsStatus').textContent=msg;
 function selectClip(){const track=s.choices.find(t=>t.trackIndex===Number($('#stemsTrack').value)),clip=track?.clips.find(c=>c.clipIndex===Number($('#stemsClip').value));s.row=track?.trackIndex??null;s.index=clip?.clipIndex??null;s.clip=track&&clip?s.refs[s.row]?.[s.index]:null;$('#stemsSource').textContent=clip?clip.name+' · '+clip.durationSeconds.toFixed(2)+' s · inicio '+clip.startSeconds.toFixed(2)+' s':'';status(!s.choices.length?'Aún no hay pistas a procesar en este proyecto':s.ready?'Motor local listo. Elige dónde guardar los resultados.':'Falta el motor Demucs o su modelo local; esta herramienta no descarga nada al usarse.');ui();}
 function selectTrack(preferredClip){const track=s.choices.find(t=>t.trackIndex===Number($('#stemsTrack').value)),list=$('#stemsClip');list.replaceChildren();if(!track)list.append(new Option('Sin eventos disponibles',''));for(const clip of track?.clips||[]){const option=document.createElement('option');option.value=clip.clipIndex;option.textContent=clip.name+' · '+clip.durationSeconds.toFixed(2)+' s';list.append(option);if(s.refs[track.trackIndex]?.[clip.clipIndex]===preferredClip)list.value=String(clip.clipIndex);}selectClip();}
 $('#stemsTrack').onchange=()=>selectTrack();$('#stemsClip').onchange=selectClip;ui();
 $('#stemsFolder').onclick=async()=>{try{const p=await lqtacDesktop.stemsOutputFolder();if(p&&!s.closed){s.folder=p;$('#stemsPath').textContent=p;ui();}}catch(e){status(e.message);}};
 s.off=lqtacDesktop.onStemsProgress(p=>{if(!s.closed&&s.busy){status(p.stage);$('#stemsProgress').value=p.progress;}});
 function close(){if(s.busy){$('#stemsClose').disabled=true;status('Cancelando… Espera a que se detenga el motor.');void lqtacDesktop.stemsCancel();return;}dialog.close();cleanup();}
 function cleanup(){if(s.closed)return;s.closed=true;s.off?.();for(const a of dialog.querySelectorAll('audio'))a.pause();if(session===s)session=null;}
 $('#stemsClose').onclick=close;dialog.oncancel=e=>{e.preventDefault();close();};dialog.onclose=cleanup;
 $('#stemsRun').onclick=async()=>{
  if(s.busy||!s.ready||!s.folder||s.inserted||!s.clip)return;s.busy=true;ui();$('#stemsProgress').value=0;
  try{
   const mute=$('#stemsMute').checked,result=await lqtacDesktop.stemsSeparate({project:s.source,trackIndex:s.row,clipIndex:s.index,outputDirectory:s.folder});
   insert(result,s.clip,mute);s.inserted=true;$('#stemsProgress').value=1;status('Cuatro pistas insertadas y agrupadas. Guarda el proyecto LQTS.');
   const box=$('#stemsResult');box.replaceChildren();const p=document.createElement('p');p.textContent='Guardado en '+result.folder+' · '+result.seconds.toFixed(1)+' s de proceso'+(result.gain<1?' · Atenuación común '+Math.round(result.gain*100)+'% para evitar saturación':'');p.style.overflowWrap='anywhere';box.append(p);
   const grid=document.createElement('div');grid.id='stemsPreviewGrid';box.append(grid);for(const stem of ['vocals','drums','bass','other']){const f=result.files.find(f=>f.stem===stem),item=document.createElement('section'),label=document.createElement('p');label.textContent=labels[f.stem];const audio=document.createElement('audio');audio.controls=true;audio.preload='metadata';audio.onplay=()=>box.querySelectorAll('audio').forEach(other=>{if(other!==audio)other.pause();});audio.src=await mediaUrlForTimeline(f.filePath);item.append(label,audio);grid.append(item);}
  }catch(e){status(e.message);}finally{s.busy=false;$('#stemsClose').disabled=false;ui();}
 };
 try{const [state,choices]=await Promise.all([lqtacDesktop.stemsStatus(),lqtacDesktop.stemsSources(source)]);if(s.closed)return;s.ready=state.ready;s.choices=choices;s.loaded=true;const list=$('#stemsTrack');list.replaceChildren();for(const track of choices){const option=document.createElement('option');option.value=track.trackIndex;option.textContent=track.name+' · '+track.clips.length+' evento'+(track.clips.length===1?'':'s');list.append(option);if(track.clips.some(c=>s.refs[track.trackIndex]?.[c.clipIndex]===preferred))list.value=String(track.trackIndex);}if(!choices.length){list.append(new Option('Sin pistas válidas',''));$('#stemsClip').append(new Option('Sin eventos disponibles',''));}selectTrack(preferred);}catch(e){if(!s.closed)status(e.message);}
}
const command=studioCommand('Separar instrumentos…',open,studioReady,'',{'data-tool':'stems'});toolsMenu.append(command);
const audioButton=document.createElement('button');audioButton.type='button';audioButton.textContent='Separar instrumentos…';audioButton.id='workspaceStems';audioButton.onclick=open;$('#audioWorkspacePanel .task-toolbar').append(audioButton);
const dockButton=document.createElement('button');dockButton.type='button';dockButton.id='stemsDock';dockButton.className='dock-panel-item';dockButton.innerHTML='<span aria-hidden="true">≋</span><strong>Separar instrumentos</strong>';dockButton.title='Elegir una pista para separar Voz, Batería, Bajo y Otros instrumentos';
// Opening a modal must not hide the panel that was already being used.
dockButton.onclick=event=>{event.stopPropagation();void open();};subtitleDock.after(dockButton);const section=subtitleDock.closest('details');if(section)section.open=true;
window.LQTACStems={open,target,insert,get busy(){return !!session?.busy;}};
})();
