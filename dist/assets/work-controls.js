// Track/event controls. The editor's global bindings are shared with this script.
function syncTrackHeaders(){
  $$('#trackLabels .track-label').forEach((label,i)=>{
    const track=$$('.track')[i];if(!track)return;
    const buttons=$$('.track-header-buttons button',label);
    buttons.forEach(b=>{if(b.dataset.trackAction==='karaoke'){window.LQTACSubtitles?.syncTrackKaraoke(track,b);return;}const key=b.textContent==='M'?'mute':b.textContent==='S'?'solo':null;if(key){b.classList.toggle('active',track.dataset[key]==='true');b.setAttribute('aria-pressed',String(track.dataset[key]==='true'));b.title=key==='mute'?'Silenciar pista':'Solo (mismo tipo de pista)';}else{b.textContent='⚙';b.title='Propiedades de pista';}});
    label.style.opacity=trackIsEnabled(track)?'1':'.55';
  });
}
const workDialog=document.createElement('dialog');workDialog.id='workDialog';workDialog.className='work-dialog';document.body.append(workDialog);
let workTarget;
const workNumber=(id,label,value,min,max,step='.01')=>`<label>${label}<input id="${id}" type="number" min="${min}" max="${max}" step="${step}" value="${value}" required></label>`;
function openWorkControls(track,clip=null){
  if(exporting||historyBusy)return;stopTimelinePlayback();workTarget={track,clip};
  const state=trackWorkState(track),audio=track.dataset.kind==='audio',frames=clip?clipCropFrames(clip):[],duration=clip?clipTiming(clip).durationSeconds:0;
  const time=clip?Math.max(0,Math.min(duration,timelineTime-clipTiming(clip).startSeconds)):0,crop=LQTACWork.cropAt(frames,time);
  workDialog.innerHTML=`<form><h2>${clip?'Propiedades del evento':'Propiedades de pista'}</h2><label>Nombre<input id="workName" maxlength="200"></label>
    <label><input id="workMute" type="checkbox" ${clip?clip.dataset.mute==='true'?'checked':'':state.mute?'checked':''}> Silenciar</label>
    ${clip?'':`<label><input id="workSolo" type="checkbox" ${state.solo?'checked':''}> Solo entre pistas de ${audio?'audio':'vídeo'}</label>`}
    ${workNumber('workGain',audio?'Ganancia (1 = original, 0 = silencio)':'Opacidad (1 = 100 %)',clip?Number(clip.dataset.gain??1):state.gain,0,audio?4:1)}
    ${audio&&!clip?workNumber('workPan','Balance estéreo (−1 izquierda, 0 centro, +1 derecha)',state.pan,-1,1):''}
    ${clip?workNumber('workRate','Velocidad (conserva la duración del evento)',Number(clip.dataset.playbackRate||1),.25,4):''}
    ${clip&&!audio?`<fieldset><legend>Pan/Crop · fotogramas clave lineales</legend><p>Centro y tamaño en proporción de la fuente. 0,5 / 0,5 centra el encuadre; tamaño 1 / 1 muestra la fuente completa.</p>
      ${workNumber('cropTime','Tiempo del fotograma dentro del evento (s)',time,0,duration)}
      ${workNumber('cropX','Centro X',crop.x,-10,10)}${workNumber('cropY','Centro Y',crop.y,-10,10)}
      ${workNumber('cropWidth','Ancho del encuadre',crop.width,.01,10)}${workNumber('cropHeight','Alto del encuadre',crop.height,.01,10)}
      ${workNumber('cropRotation','Rotación (grados)',crop.rotation,-3600,3600)}
      <label>Fotogramas existentes<select id="cropFrames"><option value="">Elegir…</option>${frames.map((f,i)=>`<option value="${i}">${f.time.toFixed(3)} s</option>`).join('')}</select></label>
      <label><input id="cropDelete" type="checkbox"> Eliminar el fotograma en el tiempo indicado</label><label><input id="cropReset" type="checkbox"> Restablecer todo el Pan/Crop</label></fieldset>`:''}
    <p id="workError" role="alert"></p><footer>${clip?'':'<button type="button" id="trackUp">Subir pista</button><button type="button" id="trackDown">Bajar pista</button>'}<button type="button" id="workCancel">Cancelar</button><button type="submit">Aplicar</button></footer></form>`;
  $('#workName',workDialog).value=clip?clip.firstChild.textContent:$$('#trackLabels .track-label strong')[$$('.track').indexOf(track)].textContent;
  $('#workCancel',workDialog).onclick=()=>workDialog.close();
  if(!clip){for(const [id,delta] of [['trackUp',-1],['trackDown',1]])$('#'+id,workDialog).onclick=()=>{
    const rows=$$('.track'),i=rows.indexOf(track),peer=rows[i+delta];if(!peer)return;
    historyCheckpoint();const labels=$$('#trackLabels .track-label'),label=labels[i];
    if(delta<0){peer.before(track);labels[i+delta].before(label);}else{peer.after(track);labels[i+delta].after(label);}
    syncTrackHeaders();void renderTimelineAt(timelineTime);workDialog.close();
  };}
  $('#cropFrames',workDialog)?.addEventListener('change',e=>{if(e.target.value==='')return;const f=frames[Number(e.target.value)];for(const [id,key] of [['cropTime','time'],['cropX','x'],['cropY','y'],['cropWidth','width'],['cropHeight','height'],['cropRotation','rotation']])$('#'+id,workDialog).value=f[key];});
  $('form',workDialog).onsubmit=event=>{
    event.preventDefault();const value=id=>Number($('#'+id,workDialog).value),name=$('#workName',workDialog).value.trim();
    const rate=clip?value('workRate'):1;
    if(clip){const source=Number(clip.dataset.sourceDurationSeconds),offset=Number(clip.dataset.sourceOffsetSeconds||0);if(source&&offset+duration*rate>source+.002){$('#workError',workDialog).textContent='La velocidad pide más material del disponible. Recorta el evento o reduce la velocidad.';return;}}
    historyCheckpoint();const target=clip||track;target.dataset.gain=String(value('workGain'));target.dataset.mute=String($('#workMute',workDialog).checked);
    if(clip){clip.firstChild.textContent=name||'Evento';clip.dataset.playbackRate=String(rate);
      if(!audio&&!$('fieldset',workDialog)?.hidden){let next=[...frames];const time=value('cropTime');if($('#cropReset',workDialog).checked)next=[];else{next=next.filter(f=>Math.abs(f.time-time)>.000001);if(!$('#cropDelete',workDialog).checked)next.push({time,x:value('cropX'),y:value('cropY'),width:value('cropWidth'),height:value('cropHeight'),rotation:value('cropRotation')});next.sort((a,b)=>a.time-b.time);}clip.dataset.panCrop=JSON.stringify(next);}
    }else{track.dataset.solo=String($('#workSolo',workDialog).checked);if(audio)track.dataset.pan=String(value('workPan'));$$('#trackLabels .track-label strong')[$$('.track').indexOf(track)].textContent=name||track.dataset.track;}
    syncTrackHeaders();workDialog.close();void renderTimelineAt(timelineTime);
  };
  workDialog.showModal();
}
document.addEventListener('dblclick',e=>{const clip=e.target.closest('.clip');if(clip&&!e.target.closest('.clip-fade-handle,.clip-trim-handle')){if(clip.dataset.kind==='subtitle')openSubtitleEditor(clip);else if(clip.dataset.kind==='video')openPanCropEditor(clip);else openWorkControls(clip.parentElement,clip);}});
document.addEventListener('dblclick',e=>{const label=e.target.closest('.track-label-title');if(label){const i=$$('#trackLabels .track-label').indexOf(label.closest('.track-label'));openWorkControls($$('.track')[i]);}});
demoReady.then(syncTrackHeaders);
const transformCard=$('#scaleRange').closest('.inspector-card');
transformCard.innerHTML='<h3>Edición del evento</h3><p>Ganancia, silencio y velocidad. En vídeo: Pan/Crop con centro, tamaño, rotación y fotogramas clave.</p><button type="button" id="openEventWork" class="solid-btn">Propiedades / Pan-Crop</button><p>Doble clic en un evento para editarlo. Usa ⚙ en la cabecera para volumen, paneo y orden de pistas.</p>';
$('#openEventWork').onclick=()=>{if(selectedTimelineClip?.isConnected)openWorkControls(selectedTimelineClip.parentElement,selectedTimelineClip);else toast('Selecciona un evento de la timeline');};
transformCard.insertAdjacentHTML('beforeend','<button type="button" id="openVegasReport" class="ghost-btn">Informe de importación VEGAS</button>');
$('#openVegasReport').onclick=()=>{
  const report=window.vegasCompatibility;if(!report){toast('Este montaje no procede del puente VEGAS');return;}
  $('#compatTitle').textContent='Informe de importación VEGAS';$('#compatFileName').textContent=$('#projectName').textContent;
  $('#compatMessage').textContent=`${report.mapping.length} eventos mapeados · ${report.vegasVersion}. Comparación audiovisual completa pendiente.`;
  $('#compatDetails').textContent=report.warnings.map(w=>w.scope+' · '+w.code+' · '+(typeof w.detail==='object'?JSON.stringify(w.detail):w.detail)).join('\n');
  $('#bridgeCompat').textContent='Guardar como LQTS';compatModal.classList.add('open');
};
