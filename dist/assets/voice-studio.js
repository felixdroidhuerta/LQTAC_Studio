// "Voz de estudio": analyse an audio clip, show what the voice needs and apply the matching settings to its audio effects.
window.LQTACVoiceStudio=(()=>{
  const dialog=document.createElement('dialog');dialog.id='voiceStudioDialog';dialog.className='work-dialog';dialog.style.width='min(640px,94vw)';document.body.append(dialog);
  const style=document.createElement('style');style.textContent='#voiceStudioDialog ul{list-style:none;padding:0;margin:10px 0;display:grid;gap:6px;max-height:34vh;overflow:auto}#voiceStudioDialog fieldset{margin:8px 0;padding:6px 10px;border:1px solid rgba(255,255,255,.14);border-radius:6px}#voiceStudioDialog fieldset label{margin-right:12px}#vsTracks{display:flex;flex-wrap:wrap;gap:4px 14px;max-height:84px;overflow:auto;margin:4px 0}#vsTracks label{margin:0}#voiceStudioDialog label:has(>input[type=checkbox]){display:flex;justify-content:flex-start;align-items:center;gap:8px;width:auto}#vsCutRow[hidden]{display:none}#vsRefName{margin-right:8px}#voiceStudioDialog li{display:grid;grid-template-columns:22px 1fr;gap:6px;padding:6px 8px;border-radius:6px;background:rgba(255,255,255,.04)}#voiceStudioDialog li b{display:block}#voiceStudioDialog li span{color:var(--muted);font-size:12px}#voiceStudioDialog .vs-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}#voiceStudioDialog [role=status]{min-height:1.5em}#voiceStudioDialog select{min-width:210px}';document.head.append(style);
  const icons={ok:'✔',fix:'🔧',warn:'⚠',info:'ℹ'};
  let session=null;
  function close(){if(!session)return;session.closed=true;session.media.pause();session.media.removeAttribute('src');void window.lqtacDesktop.cancelVoiceStudio?.();session=null;if(dialog.open)dialog.close();}
  dialog.addEventListener('close',()=>{if(session)close();});
  // Audio events of a track under the voice clip, in voice-clip seconds, with track × clip gain (muted events and tracks are left out).
  function backingPieces(clip,trackId){const track=$$('.track').find(t=>t.dataset.track===trackId);if(!track||track.dataset.mute==='true')return [];const v=clipTiming(clip),v0=v.startSeconds,v1=v0+v.durationSeconds,tg=Number(track.dataset.gain??1),pieces=[];
    for(const c of timelineClips().filter(c=>c.parentElement===track&&c!==clip&&(c.dataset.kind||track.dataset.kind)==='audio'&&c.dataset.filePath&&c.dataset.mute!=='true')){const t=clipTiming(c),c0=t.startSeconds,c1=c0+t.durationSeconds,a=Math.max(v0,c0),b=Math.min(v1,c1);if(!(b-a>.01))continue;
      pieces.push({clip:c,filePath:c.dataset.filePath,at:a-v0,skip:a-c0,duration:b-a,offset:Number(c.dataset.sourceOffsetSeconds)||0,clipDuration:t.durationSeconds,rate:Number(c.dataset.playbackRate)||1,reverse:c.dataset.reverse==='true',gain:tg*Number(c.dataset.gain??1)});}
    return pieces;}
  const forIpc=pieces=>pieces.map(({clip,...p})=>p);
  // Optional cut of the voice's clarity zone in the backing events: presence EQ added to their own effects (curves on presence are left alone).
  function backingFx(c,cut){const cur=clipEffectsState(c,'audio');if(cur.animation?.presence)return null;const next=cur.enabled?{...LQTACEffects.audioDefaults,...cur,presence:Math.max(-18,Math.min(18,(cur.presence||0)+cut))}:{...LQTACEffects.audioDefaults,enabled:true,presence:cut,animation:{}};LQTACEffects.validate(next,'audio');return next;}
  function proposed(clip,settings){const current=clipEffectsState(clip,'audio'),animation={...(current.animation||{})};for(const key of Object.keys(settings))delete animation[key];const next={...LQTACEffects.audioDefaults,...current,...settings,enabled:true,animation};LQTACEffects.validate(next,'audio');return next;}
  function open(clip){
    if(!clip?.isConnected||clip.dataset.kind!=='audio'||!clip.dataset.filePath||!window.lqtacDesktop?.analyzeVoice)return;
    if(dialog.open||effectsBusy||historyBusy||exporting)return;
    stopTimelinePlayback();const media=document.createElement('audio');media.preload='auto';
    session={clip,media,result:null,measurements:null,closed:false,busy:false,reference:'',analyzedTracks:[]};const s=session;
    dialog.innerHTML=`<h2>Voz de estudio</h2><p id="vsName"></p><label>Destino <select id="vsProfile"><option value="podcast">Podcast / locución</option><option value="video">Vídeo / redes</option><option value="song">Canción</option></select></label><fieldset><legend>Encajar con la música (opcional)</legend><div id="vsTracks" aria-label="Pistas de la base"></div><label>Voz en la mezcla <select id="vsStyle"><option value="front">Delante (balada, voz protagonista)</option><option value="balanced" selected>Equilibrada (como un disco pop)</option><option value="blend">Integrada (rock)</option></select></label><label><input type="checkbox" id="vsTune"> Afinar la voz según la música (autotune)</label></fieldset><fieldset><legend>Voz de referencia (opcional)</legend><span id="vsRefName">Ninguna</span> <button id="vsRefPick" type="button">Elegir archivo…</button> <button id="vsRefClear" type="button" hidden>Quitar</button><p class="audio-note">Un archivo con una voz cuyo sonido te guste (podcast, voz sola…): se iguala su tono, sus eses y su volumen.</p></fieldset><div class="vs-actions"><button id="vsAnalyze" type="button">Analizar la voz</button></div><p id="vsStatus" role="status"></p><ul id="vsReport" aria-label="Lo que necesita la voz"></ul><label id="vsCutRow" hidden><input type="checkbox" id="vsCut"> <span id="vsCutText"></span></label><div class="vs-actions"><button id="vsOriginal" type="button" disabled>▶ Original</button><button id="vsStudio" type="button" disabled>▶ Voz de estudio</button><button id="vsApply" type="button" disabled>Aplicar al clip</button><button id="vsClose" type="button">Cerrar</button></div><p class="audio-note">Ajusta los efectos de audio del clip (reparar saturación, filtro de graves, ruido, ecualizador, de-esser, compresor, volumen y limitador). El resto de efectos se conserva y todo se puede retocar después en Efectos o deshacer con Ctrl+Z.</p>`;
    $('#vsName',dialog).textContent=clip.firstChild?.textContent?.trim()||'Audio';
    const trackBox=$('#vsTracks',dialog),tracks=audioGuideTracks(clip);
    if(!tracks.length)trackBox.textContent='No hay otras pistas de audio.';
    for(const t of tracks){const label=document.createElement('label'),box=document.createElement('input'),count=backingPieces(clip,t.id).length;box.type='checkbox';box.value=t.id;box.dataset.label=t.label;box.disabled=!count;label.append(box,' '+t.label+(count?'':' (sin audio bajo la voz)'));trackBox.append(label);}
    const chosenTracks=()=>$$('#vsTracks input:checked',dialog).map(b=>({id:b.value,label:b.dataset.label}));
    const stale=()=>{if(!s.measurements)return;s.measurements=null;s.result=null;buttons(false);$('#vsReport',dialog).replaceChildren();$('#vsCutRow',dialog).hidden=true;status('Has cambiado las opciones: vuelve a pulsar «Analizar la voz».');};
    trackBox.onchange=()=>stale();$('#vsTune',dialog).onchange=()=>stale();
    $('#vsRefPick',dialog).onclick=async()=>{const file=await window.lqtacDesktop.pickVoiceReference?.();if(!file||s.closed)return;s.reference=file;$('#vsRefName',dialog).textContent=file.split(/[\\/]/).pop();$('#vsRefClear',dialog).hidden=false;stale();};
    $('#vsRefClear',dialog).onclick=()=>{s.reference='';$('#vsRefName',dialog).textContent='Ninguna';$('#vsRefClear',dialog).hidden=true;stale();};
    const status=text=>{$('#vsStatus',dialog).textContent=text;},buttons=on=>{for(const id of ['vsOriginal','vsStudio','vsApply'])$('#'+id,dialog).disabled=!on;};
    const showReport=()=>{const list=$('#vsReport',dialog);list.replaceChildren();for(const item of s.result.report){const li=document.createElement('li');li.dataset.status=item.status;const icon=document.createElement('div');icon.textContent=icons[item.status]||'•';const text=document.createElement('div');const b=document.createElement('b');b.textContent=item.title;const span=document.createElement('span');span.textContent=item.detail;text.append(b,span);li.append(icon,text);list.append(li);}};
    const recommend=async()=>{s.result=await window.lqtacDesktop.recommendVoice(s.measurements,$('#vsProfile',dialog).value,{style:$('#vsStyle',dialog).value});if(s.closed)return;showReport();
      const cut=s.result.backingCut||0;$('#vsCutRow',dialog).hidden=!(cut<0);$('#vsCut',dialog).checked=false;$('#vsCutText',dialog).textContent=`Recortar también ${cut} dB la zona 2,5–5 kHz en la base (${s.analyzedTracks.map(t=>t.label).join(', ')})`;buttons(true);};
    $('#vsProfile',dialog).onchange=$('#vsStyle',dialog).onchange=()=>{if(s.measurements)void recommend().catch(e=>status(e.message));};
    $('#vsAnalyze',dialog).onclick=async()=>{if(s.busy)return;s.busy=true;buttons(false);$('#vsAnalyze',dialog).disabled=true;status('Analizando la voz…');
      try{const chosen=chosenTracks(),tune=$('#vsTune',dialog).checked;if(tune&&!chosen.length)throw Error('Para afinar según la música marca al menos una pista de la base.');
        if(chosen.length||tune||s.reference)status(`Analizando la voz${chosen.length?' y la base':''}${tune?' (la afinación tarda unos segundos por minuto)':''}…`);
        const voiceTrack=clip.parentElement,voiceGain=Number(clip.dataset.gain??1)*Number(voiceTrack?.dataset.gain??1);
        const options={tracks:chosen.map(t=>({...t,pieces:forIpc(backingPieces(clip,t.id))})),voiceGain,tuning:tune,reference:s.reference};
        s.measurements=await window.lqtacDesktop.analyzeVoice(clip.dataset.filePath,audioFxSegment(clip,{}),options);s.analyzedTracks=chosen;if(s.closed)return;await recommend();if(s.closed)return;const m=s.measurements;
        status(`Analizados ${m.seconds.toFixed(1)} s (${m.speechSeconds.toFixed(1)} s de voz)${m.backing?` junto a ${chosen.length} pista${chosen.length>1?'s':''} de base`:''}. Escucha el antes y el después y aplica si te gusta.`);}
      catch(e){if(!s.closed)status(e.message);}finally{s.busy=false;if(!s.closed)$('#vsAnalyze',dialog).disabled=false;}};
    let stopAt=Infinity;media.ontimeupdate=()=>{if(media.currentTime>=stopAt)media.pause();};
    const play=async(studio)=>{if(s.busy)return;media.pause();const button=$(studio?'#vsStudio':'#vsOriginal',dialog);s.busy=true;buttons(false);
      try{const segment=audioFxSegment(clip),duration=segment.duration;let path,offset=clipPlaybackOffset(clip),rate=segment.rate;
        if(studio){status('Preparando la versión de estudio…');const fx=proposed(clip,s.result.settings);path=await window.lqtacDesktop.prepareAudioEffects(clip.dataset.filePath,fx,audioFxSegment(clip,fx));effectAudioCache.set(audioFxCacheKey(clip,fx),Promise.resolve(path));if(LQTACEffects.animatedAudio(fx)){offset=0;rate=1;}}
        else path=await clipPlaybackPath(clip);
        if(s.closed)return;media.src=await mediaUrlForTimeline(path);media.playbackRate=rate;await new Promise((resolve,reject)=>{media.onloadedmetadata=resolve;media.onerror=()=>reject(Error('No se pudo cargar el audio'));media.load();});
        media.currentTime=offset;stopAt=offset+duration*rate;await media.play();status(studio?'Escuchando la voz de estudio.':'Escuchando el original.');}
      catch(e){if(!s.closed)status(e.message);}finally{s.busy=false;if(!s.closed){buttons(true);button.focus();}}};
    $('#vsOriginal',dialog).onclick=()=>void play(false);$('#vsStudio',dialog).onclick=()=>void play(true);
    $('#vsApply',dialog).onclick=async()=>{if(s.busy||!s.result)return;media.pause();s.busy=true;buttons(false);status('Preparando el audio…');
      try{const fx=proposed(clip,s.result.settings),prepared=await window.lqtacDesktop.prepareAudioEffects(clip.dataset.filePath,fx,audioFxSegment(clip,fx));if(s.closed)return;if(!clip.isConnected)throw Error('El clip ya no existe');
        effectAudioCache.set(audioFxCacheKey(clip,fx),Promise.resolve(prepared));
        // Optional backing cut: every event of the analysed tracks under the voice, prepared before the single history step.
        const cuts=[],cut=s.result.backingCut||0;
        if(cut<0&&$('#vsCut',dialog).checked){const list=[...new Set(s.analyzedTracks.flatMap(t=>backingPieces(clip,t.id).map(p=>p.clip)))];
          for(const [i,c] of list.entries()){const next=backingFx(c,cut);if(!next)continue;status(`Preparando la base ${i+1}/${list.length}…`);const path=await window.lqtacDesktop.prepareAudioEffects(c.dataset.filePath,next,audioFxSegment(c,next));if(s.closed)return;effectAudioCache.set(audioFxCacheKey(c,next),Promise.resolve(path));cuts.push([c,next]);}}
        if(!clip.isConnected)throw Error('El clip ya no existe');
        historyCheckpoint();clip.dataset.audioFx=JSON.stringify(fx);for(const [c,next] of cuts)if(c.isConnected)c.dataset.audioFx=JSON.stringify(next);await renderTimelineAt(timelineTime);toast(`Voz de estudio aplicada${cuts.length?` (y ${cuts.length} evento${cuts.length>1?'s':''} de la base)`:''} · Ctrl+Z para deshacer`);close();}
      catch(e){if(!s.closed){status('No se pudo aplicar: '+e.message);s.busy=false;buttons(true);}}};
    $('#vsClose',dialog).onclick=close;
    dialog.showModal();
  }
  return {open,close,proposed,backingPieces,get session(){return session;}};
})();
