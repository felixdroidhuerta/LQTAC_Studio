const effectsDialog=document.createElement('dialog');effectsDialog.id='effectsDialog';effectsDialog.className='work-dialog';effectsDialog.style.maxHeight='85vh';effectsDialog.style.overflow='auto';document.body.append(effectsDialog);
const effectsStyle=document.createElement('style');effectsStyle.textContent='#effectsDialog input[type=file]{width:100%;box-sizing:border-box}#effectsDialog footer{position:sticky;bottom:-22px;background:#0d2343;padding:12px 0;margin-bottom:-12px;z-index:2}';document.head.append(effectsStyle);
const effectsButton=document.createElement('button');effectsButton.id='openClipEffects';effectsButton.className='solid-btn';effectsButton.style.marginBottom='12px';effectsButton.textContent='Efectos de vídeo / audio';$('#openEventWork').parentElement.prepend(effectsButton);
effectsButton.onclick=()=>{const clip=selectedTimelineClips.find(c=>c.dataset.kind==='video')||selectedTimelineClip;if(clip)openClipEffects(clip);else toast('Selecciona un clip');};
const effectsPanel=document.createElement('section');effectsPanel.id='effectsPanel';effectsPanel.hidden=true;$('.side-panel').append(effectsPanel);
effectsPanel.innerHTML='<div class="eyebrow">EFECTOS · LOCALES</div><h2>Efectos de vídeo y audio</h2><p>Selecciona un clip de la timeline y elige un efecto. En la ventana de configuración marca «Activar efectos de este clip» y pulsa Aplicar.</p><p id="effectsSelection" role="status"></p><div id="effectsCatalog"></div>';
const effectsCatalog={video:[['brightness','Brillo y contraste'],['saturation','Saturación'],['temperature','Temperatura de color'],['blur','Desenfoque'],['sharpen','Enfoque'],['vignette','Viñeta'],['chroma','Croma / fondo transparente'],['lut','LUT 3D .cube']],audio:[['bass','Ecualizador'],['compressor','Compresor'],['limiter','Limitador'],['denoise','Reducción de ruido'],['normalize','Normalización'],['echo','Eco'],['reverb','Ambiente / reverberación corta']]};
effectsCatalog.video.push(...LQTACEffects.creative.map(([key,name])=>[key,name]));
const effectsPanelStyle=document.createElement('style');effectsPanelStyle.textContent='#effectsPanel{padding:0 4px}#effectsPanel p{font-size:12px;color:var(--muted);line-height:1.5}#effectsCatalog .fx-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:12px 0 20px}#effectsCatalog button{background:#142c4c;color:var(--text);border:1px solid var(--line);border-radius:8px;padding:16px;text-align:left;cursor:pointer}#effectsCatalog button:hover{border-color:var(--accent-2)}';document.head.append(effectsPanelStyle);
function effectsTarget(kind){return selectedTimelineClips.find(c=>c.isConnected&&c.dataset.kind===kind)||timelineClips().find(c=>c.classList.contains('selected')&&c.dataset.kind===kind);}
for(const [kind,items] of Object.entries(effectsCatalog)){
  const heading=document.createElement('h3');heading.textContent=kind==='video'?'Vídeo':'Audio';const grid=document.createElement('div');grid.className='fx-grid';
  for(const [key,name] of items){const button=document.createElement('button');button.type='button';button.textContent=name;button.dataset.fxKind=kind;button.dataset.fxKey=key;button.onclick=()=>{const target=effectsTarget(kind);if(!target){$('#effectsSelection').textContent=`Selecciona primero un clip de ${kind==='video'?'vídeo':'audio'} en la timeline.`;toast($('#effectsSelection').textContent);return;}openClipEffects(target);const field=key==='lut'?$('#fxLut',effectsDialog):$('#fx-'+key,effectsDialog);field?.focus();field?.scrollIntoView({block:'center'});};grid.append(button);}
  $('#effectsCatalog').append(heading,grid);
}
function openEffectsPanel(){stopTransitionPreview();[...$('.side-panel').children].forEach(child=>child.hidden=child!==effectsPanel);$('#effectsSelection').textContent=selectedTimelineClips.length?`${selectedTimelineClips.length} eventos seleccionados. Los ajustes se aplican al clip del tipo elegido.`:'Selecciona un clip de la timeline para configurar sus efectos.';}
$$('.dock-panel-item').forEach(button=>button.addEventListener('click',()=>{if($('strong',button)?.textContent.trim()==='FX')openEffectsPanel();else effectsPanel.hidden=true;}));
let effectsBusy=false;
function openClipEffects(clip){
  if(exporting||historyBusy||effectsBusy||!clip?.isConnected)return;stopTimelinePlayback();
  const group=groupMembers(clip),video=group.find(c=>c.dataset.kind==='video'),audio=group.find(c=>c.dataset.kind==='audio');
  let kind=clip.dataset.kind,target=clip,lut=null;
  const check=(key,label,value)=>`<label><input type="checkbox" id="fx-${key}" ${value?'checked':''}> ${label}</label>`;
  const numeric=(key,label,value,range)=>`<label>${label}<input id="fx-${key}" type="number" step="any" min="${range[0]}" max="${range[1]}" value="${value}" required></label>`;
  const render=()=>{
    const value={...(kind==='video'?LQTACEffects.videoDefaults:LQTACEffects.audioDefaults),...clipEffectsState(target,kind)};lut=value.lut||null;
    effectsDialog.innerHTML=`<form><h2>Efectos del clip · ${kind==='video'?'vídeo':'audio'}</h2><p id="fxName"></p>${video&&audio?'<p><button type="button" id="fxVideo">Vídeo del grupo</button> <button type="button" id="fxAudio">Audio del grupo</button></p>':''}${check('enabled','Activar efectos de este clip',value.enabled)}<div id="fxFields"></div><p id="fxStatus" role="status"></p><footer><button type="button" id="fxReset">Restablecer</button><button type="button" id="fxClose">Cerrar</button><button type="submit" id="fxApply">Aplicar</button></footer></form>`;
    $('#fxName',effectsDialog).textContent=target.firstChild?.textContent||'Evento';
    const fields=$('#fxFields',effectsDialog),ranges=LQTACEffects.ranges[kind];
    if(kind==='video'){
      fields.innerHTML=[['brightness','Brillo'],['contrast','Contraste (1 = original)'],['saturation','Saturación (1 = original)'],['temperature','Temperatura (− frío / + cálido)'],['blur','Desenfoque (px de fuente)'],['sharpen','Enfoque'],['vignette','Viñeta']].map(([k,label])=>numeric(k,label,value[k],ranges[k])).join('')+`<fieldset><legend>Croma</legend>${check('chroma','Eliminar un color',value.chroma)}<label>Color<input type="color" id="fx-chromaColor" value="${value.chromaColor}"></label>${numeric('chromaTolerance','Tolerancia',value.chromaTolerance,ranges.chromaTolerance)}${numeric('chromaSoftness','Suavidad',value.chromaSoftness,ranges.chromaSoftness)}</fieldset><fieldset><legend>LUT 3D .cube</legend><input id="fxLut" type="file" accept=".cube"><p id="fxLutName"></p><button id="fxLutClear" type="button">Quitar LUT</button><p>2–65 puntos por eje; dominio 0–1. La tabla queda integrada en el LQTS.</p></fieldset>`;
      for(const [,name,items] of LQTACEffects.creative){const group=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent=name;group.append(legend);group.insertAdjacentHTML('beforeend',items.map(([p,label])=>numeric(p,label,value[p],ranges[p])).join(''));fields.append(group);}
      const refresh=()=>{$('#fxLutName',effectsDialog).textContent=lut?.name||'Sin LUT';};refresh();
      $('#fxLut',effectsDialog).onchange=async event=>{try{const file=event.target.files[0];if(file){if(file.size>16*1024*1024)throw Error('La LUT supera 16 MB');lut=LQTACEffects.parseCube(await file.text(),file.name);refresh();}}catch(error){$('#fxStatus',effectsDialog).textContent=error.message;}};
      $('#fxLutClear',effectsDialog).onclick=()=>{lut=null;refresh();};
    }else{
      fields.innerHTML='<p>Se prepara una copia de audio local; no se modifica el original. Puede tardar en archivos largos.</p>'+[['bass','Graves · 120 Hz (dB)'],['mid','Medios · 1 kHz (dB)'],['treble','Agudos · 8 kHz (dB)']].map(([k,label])=>numeric(k,label,value[k],ranges[k])).join('')+check('compressor','Compresor',value.compressor)+numeric('thresholdDb','Umbral (dB)',value.thresholdDb,ranges.thresholdDb)+numeric('ratio','Ratio de compresión',value.ratio,ranges.ratio)+check('denoise','Reducción de ruido FFT',value.denoise)+numeric('denoiseDb','Reducción (dB)',value.denoiseDb,ranges.denoiseDb)+check('echo','Eco',value.echo)+numeric('echoMs','Retardo (ms)',value.echoMs,ranges.echoMs)+numeric('echoMix','Intensidad del eco',value.echoMix,ranges.echoMix)+check('reverb','Ambiente / reverberación corta por multieco',value.reverb)+numeric('reverbMix','Intensidad del ambiente',value.reverbMix,ranges.reverbMix)+check('normalize','Normalización de sonoridad (una pasada sobre la fuente completa)',value.normalize)+numeric('targetLufs','Objetivo aproximado (LUFS)',value.targetLufs,ranges.targetLufs)+check('limiter','Limitador de seguridad',value.limiter);
    }
    if(kind==='audio')fields.insertAdjacentHTML('beforeend',numeric('limiterCeiling','Techo del limitador (1 = 0 dBFS)',value.limiterCeiling,ranges.limiterCeiling));
    $('#fxReset',effectsDialog).onclick=()=>{for(const [key,val] of Object.entries(kind==='video'?LQTACEffects.videoDefaults:LQTACEffects.audioDefaults)){const field=$('#fx-'+key,effectsDialog);if(field){if(field.type==='checkbox')field.checked=val;else field.value=val;}}lut=null;if(kind==='video')$('#fxLutName',effectsDialog).textContent='Sin LUT';};
    $('#fxClose',effectsDialog).onclick=()=>{if(effectsBusy){void window.lqtacDesktop.cancelAudioEffects();$('#fxStatus',effectsDialog).textContent='Cancelando…';}else effectsDialog.close();};
    for(const [id,node] of [['fxVideo',video],['fxAudio',audio]]){const button=$('#'+id,effectsDialog);if(button)button.onclick=()=>{target=node;kind=node.dataset.kind;render();};}
    $('form',effectsDialog).onsubmit=async event=>{
      event.preventDefault();if(effectsBusy)return;
      const next={};for(const [key,def] of Object.entries(kind==='video'?LQTACEffects.videoDefaults:LQTACEffects.audioDefaults)){const field=$('#fx-'+key,effectsDialog);next[key]=key==='animation'?clipEffectsState(target,kind).animation||{}:key==='lut'?lut:typeof def==='boolean'?field.checked:typeof def==='number'?Number(field.value):field.value;}
      try{
        LQTACEffects.validate(next,kind);effectsBusy=true;$('#fxApply',effectsDialog).disabled=true;$('#fxClose',effectsDialog).textContent='Cancelar';
        $$('input,button',effectsDialog).forEach(e=>{if(e.id!=='fxClose')e.disabled=true;});$('#fxStatus',effectsDialog).textContent=kind==='audio'&&next.enabled?'Preparando la caché de audio. Espera o cancela…':'Aplicando…';
        if(kind==='audio'&&next.enabled){const key=audioFxCacheKey(target,next),prepared=await window.lqtacDesktop.prepareAudioEffects(target.dataset.filePath,next,audioFxSegment(target));effectAudioCache.set(key,Promise.resolve(prepared));}
        if(!target.isConnected)throw Error('El evento ya no existe');historyCheckpoint();target.dataset[kind+'Fx']=JSON.stringify(next);await renderTimelineAt(timelineTime);effectsDialog.close();toast('Efectos aplicados al clip');
      }catch(error){$('#fxStatus',effectsDialog).textContent=error.message;}
      finally{effectsBusy=false;$$('input,button',effectsDialog).forEach(e=>e.disabled=false);$('#fxClose',effectsDialog).textContent='Cerrar';}
    };
  };
  render();effectsDialog.showModal();
}
effectsDialog.addEventListener('cancel',event=>{if(effectsBusy){event.preventDefault();void window.lqtacDesktop.cancelAudioEffects();}});
