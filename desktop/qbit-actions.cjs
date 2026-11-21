// Qbit assistant: closed action vocabulary. The local model may only answer with the JSON schema built here;
// every action is validated and converted to cinema_edit operations by plain code (the model never edits the project).
const fx=require('../dist/assets/effects-model.js');

const VIDEO_BASIC={brightness:'Brillo',contrast:'Contraste',saturation:'Saturación',temperature:'Temperatura de color (− frío · + cálido)',blur:'Desenfoque',sharpen:'Nitidez',vignette:'Viñeta'};
const AUDIO={
 bass:'Graves (dB)',lowMid:'Medios-graves (dB)',mid:'Medios (dB)',presence:'Presencia (dB)',treble:'Agudos (dB)',
 compressor:'Compresor',thresholdDb:'Umbral del compresor (dB)',ratio:'Ratio del compresor',limiter:'Limitador',
 denoise:'Reducción de ruido',denoiseDb:'Cantidad de reducción de ruido (dB)',voiceAi:'Limpieza de voz IA',declip:'Reparar saturación',
 normalize:'Normalizar volumen',targetLufs:'Volumen objetivo (LUFS)',
 echo:'Eco',echoMs:'Retardo del eco (ms)',echoMix:'Mezcla del eco',reverb:'Reverberación',reverbMix:'Mezcla de reverberación',
 highpass:'Filtro paso alto (quita graves)',highpassHz:'Corte paso alto (Hz)',lowpass:'Filtro paso bajo (quita agudos)',lowpassHz:'Corte paso bajo (Hz)',
 gate:'Puerta de ruido',gateDb:'Umbral de la puerta (dB)',deesser:'De-esser (suaviza las eses)',
 pitch:'Cambio de tono',pitchSemitones:'Semitonos',chorus:'Coro',chorusMix:'Mezcla de coro',tremolo:'Trémolo',
 lofi:'Lo-fi',lofiAmount:'Cantidad lo-fi',widen:'Ampliar estéreo',widenAmount:'Anchura estéreo',pan:'Panorama',panPosition:'Posición (− izquierda · + derecha)'
};

// key → {kind,label,min,max,bool,integer,options,owner}
function buildCatalog(){
 const video={},audio={};
 for(const [k,label] of Object.entries(VIDEO_BASIC)){const [min,max]=fx.ranges.video[k];video[k]={kind:'video',label,min,max,neutral:fx.videoDefaults[k]};}
 for(const [, group,fields] of fx.creative)for(const [k,label,min,max,value,options] of fields)video[k]={kind:'video',label:k===fields[0][0]?group:group+' · '+label,min,max,neutral:value,integer:Array.isArray(options),options:Array.isArray(options)?options:undefined};
 const bools=Object.keys(AUDIO).filter(k=>typeof fx.audioDefaults[k]==='boolean');
 for(const [k,label] of Object.entries(AUDIO)){
  if(typeof fx.audioDefaults[k]==='boolean'){audio[k]={kind:'audio',label,bool:true};continue;}
  const [min,max]=fx.ranges.audio[k];
  // A parameter switches on the effect it belongs to (reverbMix → reverb); EQ bands have no switch.
  const owner=bools.filter(b=>k.startsWith(b)).sort((a,b)=>b.length-a.length)[0];
  audio[k]={kind:'audio',label,min,max,neutral:fx.audioDefaults[k],owner};
 }
 if(audio.thresholdDb)audio.thresholdDb.owner='compressor';if(audio.ratio)audio.ratio.owner='compressor';
 return {video,audio,all:{...video,...audio}};
}
const catalog=buildCatalog();
const ACTION_TYPES=['transition','video_effect','audio_effect','fade_in','fade_out','remove_effects','undo','redo'];

const round=v=>Math.round(v*100)/100;
const end=c=>c.startSeconds+c.durationSeconds;
function clipList(project){
 const out=[];let n=0;
 for(const t of project.tracks)t.clips.forEach((c,i)=>{n++;out.push({ref:t.id+':'+i,number:n,trackId:t.id,trackName:t.name,trackKind:t.kind,clip:c});});
 return out;
}
const clipLabel=x=>`clip ${x.number} «${x.clip.name}»`;

// Text the model sees: only what it needs to pick refs and values.
function describeProject(project,selection=[]){
 const clips=clipList(project).filter(x=>x.trackKind!=='subtitle');
 if(!clips.length)return 'El proyecto no tiene clips en la línea de tiempo.';
 return clips.map(x=>{
  const c=x.clip,on=[];
  if(c.videoFx?.enabled)for(const k of Object.keys(catalog.video))if(c.videoFx[k]!==undefined&&c.videoFx[k]!==catalog.video[k].neutral)on.push(k+'='+round(c.videoFx[k]));
  if(c.audioFx?.enabled)for(const k of Object.keys(catalog.audio))if(c.audioFx[k]===true||(!catalog.audio[k].bool&&c.audioFx[k]!==undefined&&c.audioFx[k]!==catalog.audio[k].neutral&&c.audioFx[catalog.audio[k].owner]!==false))on.push(k+'='+(c.audioFx[k]===true?'sí':round(c.audioFx[k])));
  return `- ref ${x.ref} · clip ${x.number} · pista «${x.trackName}» (${x.trackKind}) · «${c.name}» · de ${round(c.startSeconds)} a ${round(end(c))} s`+(c.transition&&c.transition!=='fade'?' · transición '+c.transition:'')+(c.fadeInSeconds?' · fundido entrada '+round(c.fadeInSeconds)+' s':'')+(c.fadeOutSeconds?' · fundido salida '+round(c.fadeOutSeconds)+' s':'')+(on.length?' · efectos: '+on.join(', '):'')+(selection.includes(x.ref)?' · SELECCIONADO':'');
 }).join('\n');
}
// Compact catalog: key + short name + range. The model sees it once per conversation (prompt cache).
function describeCatalog(transitions){
 const short=e=>e.label.split(' (')[0];
 const range=e=>e.bool?'sí/no':e.options?e.options.map((o,i)=>i+'='+o).join('/'):`${e.min}…${e.max}`;
 const groups=Object.entries(catalog.video).filter(([k])=>!k.match(/[A-Z]/)||VIDEO_BASIC[k]);
 return 'TRANSICIONES: '+transitions.filter(t=>t.id!=='lumaMask').map(t=>`${t.id}=${t.name}`).join(', ')+
 '\nVÍDEO: '+groups.map(([k,e])=>`${k}=${short(e)} ${range(e)}`).join('; ')+
 '\nAUDIO: '+Object.entries(catalog.audio).map(([k,e])=>`${k}=${short(e)} ${range(e)}`).join('; ');
}
const SYSTEM=transitions=>`Eres Qbit, el asistente de Cinema Studio (editor de vídeo). Hablas en español, en una o dos frases cortas.
Solo ayudas con Cinema Studio. intent: "editar" si piden cambiar el proyecto; "pregunta" si preguntan cómo se hace algo en el programa (explícalo, sin acciones); "aclarar" si falta saber qué clip o qué efecto (pregunta, sin acciones); "fuera_de_tema" para cualquier cosa ajena a Cinema Studio (sin acciones).
Acciones: transition (clip = el que ENTRA, se une con el anterior de su pista; transition; seconds) · video_effect (clip, effect, value) · audio_effect (clip, effect, value; los sí/no se activan con 1 y se quitan con 0) · fade_in / fade_out (clip, seconds; 0 lo quita) · remove_effects (clip, kind video/audio/all: borra TODOS los efectos) · undo · redo.
Elige la transición por su nombre en la lista (pixelado → pixelize, zoom → crosswarp, círculo → circleopen). «Fundido de entrada/salida» de UN clip es fade_in/fade_out; «fundido ENTRE dos clips» es transition fade.
«Quitar ruido», «limpiar voz», «normalizar» son audio_effect con value 1, no remove_effects. «Clip 2» es el número de clip. «Este» o «el seleccionado» es el marcado SELECCIONADO. Sin cifra, usa valores moderados (blur 4, vignette 0.5, saturation 1.3, temperature 0.3, film 0.6). En reply describe lo que PROPONES («Te propongo…»), nunca digas que ya está hecho.
Palabras habituales: cálido/frío → temperature (+/−); más color → saturation; blanco y negro → saturation 0; más luz/oscuro → brightness; antiguo/vintage → film; tele vieja → crt; nieve/lluvia/confeti → particles.
GUÍA DEL PROGRAMA (para «pregunta»; no inventes menús que no estén aquí, y si no lo sabes remite a Ayuda → Manual de usuario):
- Transiciones: solapa dos clips de vídeo en la misma pista, haz clic en la zona de solapamiento y elige la transición en el panel Transiciones (barra lateral) o con el botón Transición de la línea de tiempo. La duración es la del solapamiento.
- Efectos: selecciona el clip y abre FX → Vídeo o FX → Audio; activa la tarjeta del efecto y ajusta sus deslizadores (admiten curvas para animarlos). También hay presets de efectos.
- Deshacer Ctrl+Z, rehacer Ctrl+Y. Separar un clip: comando Separar clip. Exportar: Archivo → Renderizar vídeo o audio…. Subtítulos: Generar subtítulos automáticos…. Encuadre y movimiento: Pan/Crop.
${describeCatalog(transitions)}`;
// Few-shot turns on a fixed example project teach the format far better than rules alone.
const EXAMPLE_PROJECT='- ref v1:0 · clip 1 · pista «Vídeo 1» (video) · «a.mp4» · de 0 a 5 s\n- ref v1:1 · clip 2 · pista «Vídeo 1» (video) · «b.mp4» · de 5 a 9 s · SELECCIONADO\n- ref a1:0 · clip 3 · pista «Audio 1» (audio) · «a.mp4 · audio» · de 0 a 5 s';
const EXAMPLES=[
 ['pon una transición de barrido de 1,5 s entre el 1 y el 2',{intent:'editar',reply:'Te propongo un barrido a la derecha de 1,5 s entre a.mp4 y b.mp4.',actions:[{type:'transition',clip:'v1:1',transition:'wipeRight',seconds:1.5}]}],
 ['mete una apertura circular entre a y b',{intent:'editar',reply:'Te propongo una apertura circular entre a.mp4 y b.mp4.',actions:[{type:'transition',clip:'v1:1',transition:'circleopen'}]}],
 ['fundido de salida de 3 s al clip 2',{intent:'editar',reply:'Te propongo un fundido de salida de 3 s en b.mp4.',actions:[{type:'fade_out',clip:'v1:1',seconds:3}]}],
 ['quita el ruido del audio del clip 3',{intent:'editar',reply:'Te propongo activar la reducción de ruido en el audio del clip 3.',actions:[{type:'audio_effect',clip:'a1:0',effect:'denoise',value:1}]}],
 ['desenfoca un poco este',{intent:'editar',reply:'Te propongo un desenfoque suave en b.mp4.',actions:[{type:'video_effect',clip:'v1:1',effect:'blur',value:4}]}],
 ['quítale todos los efectos al clip 1',{intent:'editar',reply:'Te propongo quitar todos los efectos de a.mp4.',actions:[{type:'remove_effects',clip:'v1:0',kind:'all'}]}],
 ['¿cómo aplico un efecto a mano?',{intent:'pregunta',reply:'Selecciona el clip, abre el panel Efectos y activa el que quieras; los deslizadores ajustan la intensidad.',actions:[]}],
 ['cuéntame un chiste',{intent:'fuera_de_tema',reply:'Solo puedo ayudarte con Cinema Studio.',actions:[]}],
 ['ponle un efecto',{intent:'aclarar',reply:'¿Qué efecto te gustaría? Por ejemplo, película antigua, desenfoque o viñeta.',actions:[]}],
 ['deshaz eso',{intent:'editar',reply:'Te propongo deshacer el último cambio.',actions:[{type:'undo'}]}]
];
function buildMessages({project,selection=[],transitions,question,history=[]}){
 const messages=[{role:'system',content:SYSTEM(transitions)}];
 messages.push({role:'user',content:'CLIPS:\n'+EXAMPLE_PROJECT+'\n\nPETICIÓN: '+EXAMPLES[0][0]},{role:'assistant',content:JSON.stringify(EXAMPLES[0][1])});
 for(const [q,a] of EXAMPLES.slice(1))messages.push({role:'user',content:'PETICIÓN: '+q},{role:'assistant',content:JSON.stringify(a)});
 for(const h of history.slice(-4))messages.push({role:h.role,content:h.content});
 messages.push({role:'user',content:'CLIPS (proyecto real, usa SOLO estos refs):\n'+describeProject(project,selection)+'\n\nPETICIÓN: '+question});
 return messages;
}
function systemPrompt(o){return buildMessages({...o,question:''}).map(m=>m.content).join('\n');}
const OFF_TOPIC='Solo puedo ayudarte con Cinema Studio: efectos, transiciones, fundidos y dudas sobre el programa.';

// Grammar-constrained answer: refs, effects and transitions are closed lists, so the model cannot invent them.
function responseSchema({project,transitions}){
 const refs=clipList(project).filter(x=>x.trackKind!=='subtitle').map(x=>x.ref);
 const action={type:'object',properties:{
  type:{type:'string',enum:ACTION_TYPES},
  ...(refs.length?{clip:{type:'string',enum:refs}}:{}),
  transition:{type:'string',enum:transitions.map(t=>t.id).filter(id=>id!=='lumaMask')},
  effect:{type:'string',enum:Object.keys(catalog.all)},
  value:{type:'number'},seconds:{type:'number'},kind:{type:'string',enum:['video','audio','all']}
 },required:['type'],additionalProperties:false};
 return {type:'object',properties:{intent:{type:'string',enum:['editar','pregunta','aclarar','fuera_de_tema']},reply:{type:'string',maxLength:400},actions:{type:'array',maxItems:6,items:action}},required:['intent','reply','actions'],additionalProperties:false};
}
// Code has the last word on scope: only "editar" may carry actions.
function interpret(answer){
 const intent=answer?.intent;
 if(intent==='fuera_de_tema')return {intent,reply:OFF_TOPIC,actions:[]};
 return {intent,reply:String(answer?.reply||'').trim(),actions:intent==='editar'&&Array.isArray(answer.actions)?answer.actions:[]};
}

// --- Wording the code can resolve better than a small model -------------------------------------------------
// "entre X y Y" fixes which clip enters, and a named transition fixes its id. Only applied when unambiguous.
const fold=s=>String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const TRANSITION_WORDS=[[/pixel/,'pixelize'],[/barrido.*izquierda|izquierda.*barrido/,'wipeLeft'],[/barrido/,'wipeRight'],[/circul|circulo/,'circleopen'],[/zoom|deform/,'crosswarp'],[/fundido|disolv|encadenado/,'fade']];
function normalize({question,project,actions,transitions=[]}){
 const q=fold(question),video=clipList(project).filter(x=>x.trackKind==='video');
 if(!/\bentre\b/.test(q)||!actions.length)return actions;
 // Clips named in the request, in order: "clip N" (global number), bare numbers after "entre", or the file name stem.
 const found=[];const add=(x,at)=>{if(x&&!found.some(f=>f.x===x))found.push({x,at});};
 for(const m of q.matchAll(/\b(?:clip\s+|el\s+)(\d+)\b/g))add(video.find(x=>x.number===Number(m[1])),m.index);
 const between=q.match(/entre\s+(?:el\s+)?(?:clip\s+)?(\d+)\s+y\s+(?:el\s+)?(?:clip\s+)?(\d+)/);
 if(between)for(const n of [between[1],between[2]])add(video.find(x=>x.number===Number(n)),q.indexOf(n));
 for(const x of video){const stem=fold(x.clip.name).replace(/\.[a-z0-9]{2,4}$/,'').trim();if(stem.length>=3){const at=q.indexOf(stem);if(at>=0)add(x,at);}}
 if(found.length!==2||found[0].x.trackId!==found[1].x.trackId)return actions;
 const [a,b]=found.map(f=>f.x).sort((m,n)=>m.clip.startSeconds-n.clip.startSeconds);
 const track=project.tracks.find(t=>t.id===a.trackId),prev=track.clips.filter(c=>c!==b.clip&&c.startSeconds<b.clip.startSeconds).sort((m,n)=>n.startSeconds-m.startSeconds)[0];
 if(prev!==a.clip)return actions;
 const named=TRANSITION_WORDS.filter(([re,id])=>re.test(q)&&transitions.some(t=>t.id===id)).map(([,id])=>id);
 const id=named.includes('wipeLeft')?'wipeLeft':named[0];
 let out=actions.map(x=>x.type==='transition'?{...x,clip:b.ref,...(id?{transition:id}:{})}:x);
 // A request "between two clips" is about that join only: extra actions the model adds elsewhere are dropped.
 if(out.some(x=>x.type==='transition'))return out.filter(x=>x.type==='transition');
 // "fundido entre dos clips" read as fade-out + fade-in: that is a transition.
 if(!out.some(x=>x.type==='transition')&&!/entrada|salida/.test(q)&&out.some(x=>x.type==='fade_in'||x.type==='fade_out')){
  const fades=out.filter(x=>x.type==='fade_in'||x.type==='fade_out'),seconds=Math.max(...fades.map(x=>Number(x.seconds)||0))||undefined;
  out=[...out.filter(x=>!fades.includes(x)),{type:'transition',clip:b.ref,transition:id||'fade',...(seconds?{seconds}:{})}];
 }
 return out;
}

// --- Deterministic conversion -------------------------------------------------------------------------------
function plan(project,actions,{transitions=[]}={}){
 const p=structuredClone(project),list=clipList(p),byRef=new Map(list.map(x=>[x.ref,x]));
 const steps=[],operations=[],errors=[];let history=null;
 const need=(a,field)=>{if(a[field]===undefined)throw Error(`falta «${field}»`);return a[field];};
 const target=a=>{const x=byRef.get(need(a,'clip'));if(!x)throw Error('el clip '+a.clip+' no existe');return x;};
 const fxPatch=(x,kind,changes)=>{const key=kind==='video'?'videoFx':'audioFx';x.clip[key]={...(x.clip[key]||{}),enabled:true,...changes};operations.push({op:'updateClip',ref:x.ref,includeGroup:false,patch:{[key]:x.clip[key]}});};
 // Audio of a video clip lives on its grouped audio event.
 const audioTarget=x=>{if(x.trackKind==='audio')return x;const pair=x.clip.groupId&&list.find(y=>y.trackKind==='audio'&&y.clip.groupId===x.clip.groupId);if(!pair)throw Error(clipLabel(x)+' no tiene audio');return pair;};
 for(const a of actions){
  try{
   if(a.type==='undo'||a.type==='redo'){if(actions.length>1)throw Error('deshacer/rehacer va solo');history=a.type;steps.push(a.type==='undo'?'Deshacer el último cambio':'Rehacer el último cambio');continue;}
   const x=target(a);
   if(a.type==='video_effect'){
    const e=catalog.video[need(a,'effect')];if(!e)throw Error(`«${a.effect}» no es un efecto de vídeo`);if(x.trackKind!=='video')throw Error(clipLabel(x)+' no es de vídeo');
    let v=Number(need(a,'value'));if(e.integer)v=Math.round(v);if(!Number.isFinite(v)||v<e.min||v>e.max)throw Error(`${e.label}: el valor debe estar entre ${e.min} y ${e.max}`);
    fxPatch(x,'video',{[a.effect]:v});steps.push(`${e.label} = ${e.options?e.options[v]:round(v)} en ${clipLabel(x)}`);
   }else if(a.type==='audio_effect'){
    const e=catalog.audio[need(a,'effect')];if(!e)throw Error(`«${a.effect}» no es un efecto de audio`);const y=audioTarget(x);
    if(e.bool){const on=Number(a.value??1)>0;fxPatch(y,'audio',{[a.effect]:on});steps.push(`${on?'Activar':'Quitar'} ${e.label} en ${clipLabel(y)}`);}
    else{const v=Number(need(a,'value'));if(!Number.isFinite(v)||v<e.min||v>e.max)throw Error(`${e.label}: el valor debe estar entre ${e.min} y ${e.max}`);fxPatch(y,'audio',{[a.effect]:v,...(e.owner?{[e.owner]:true}:{})});steps.push(`${e.label} = ${round(v)} en ${clipLabel(y)}`);}
   }else if(a.type==='fade_in'||a.type==='fade_out'){
    const s=Number(a.seconds??1),key=a.type==='fade_in'?'fadeInSeconds':'fadeOutSeconds';if(!(s>=0)||s>x.clip.durationSeconds)throw Error('el fundido no puede durar más que el clip');
    x.clip[key]=s;operations.push({op:'updateClip',ref:x.ref,patch:{[key]:s}});steps.push(s?`Fundido de ${a.type==='fade_in'?'entrada':'salida'} de ${round(s)} s en ${clipLabel(x)}`:`Quitar el fundido de ${a.type==='fade_in'?'entrada':'salida'} de ${clipLabel(x)}`);
   }else if(a.type==='remove_effects'){
    const kind=a.kind||'all';
    if(kind!=='audio'&&x.trackKind==='video'){x.clip.videoFx={enabled:false};operations.push({op:'updateClip',ref:x.ref,includeGroup:false,patch:{videoFx:{enabled:false}}});}
    if(kind!=='video'){const y=x.trackKind==='audio'?x:list.find(z=>z.trackKind==='audio'&&x.clip.groupId&&z.clip.groupId===x.clip.groupId);if(y){y.clip.audioFx={enabled:false};operations.push({op:'updateClip',ref:y.ref,includeGroup:false,patch:{audioFx:{enabled:false}}});}}
    steps.push(`Quitar los efectos ${kind==='video'?'de vídeo ':kind==='audio'?'de audio ':''}de ${clipLabel(x)}`);
   }else if(a.type==='transition'){
    if(x.trackKind!=='video')throw Error('las transiciones son entre clips de vídeo');
    const id=need(a,'transition'),info=transitions.find(t=>t.id===id);if(!info||id==='lumaMask')throw Error('transición no disponible: '+id);
    const track=p.tracks.find(t=>t.id===x.trackId),prev=track.clips.filter(c=>c!==x.clip&&c.startSeconds<x.clip.startSeconds).sort((m,n)=>n.startSeconds-m.startSeconds)[0];
    if(!prev)throw Error(clipLabel(x)+' es el primero de su pista: no hay clip anterior con el que hacer la transición');
    const overlap=end(prev)-x.clip.startSeconds,s=a.seconds===undefined?(overlap>0?overlap:1):Number(a.seconds);
    if(!(s>0)||s>=Math.min(prev.durationSeconds,x.clip.durationSeconds))throw Error('la transición debe durar menos que los dos clips');
    // Overlap the incoming clip by s seconds; later clips on the same track move with it so nothing gets covered.
    const delta=round(end(prev)-s-x.clip.startSeconds);
    if(Math.abs(delta)>1e-6){const from=x.clip.startSeconds-1e-6;track.clips.forEach((c,i)=>{if(c.startSeconds>=from){const ref=track.id+':'+i;operations.push({op:'updateClip',ref,includeGroup:true,patch:{startSeconds:round(c.startSeconds+delta)}});}});
     // Keep the working copy in sync so a second action in the same answer sees the new positions.
     const moved=new Set(track.clips.filter(c=>c.startSeconds>=from).flatMap(c=>c.groupId?list.filter(y=>y.clip.groupId===c.groupId).map(y=>y.clip):[c]));for(const c of moved)c.startSeconds=round(c.startSeconds+delta);}
    operations.push({op:'updateClip',ref:x.ref,patch:{transition:id}});
    steps.push(`${info.name} de ${round(s)} s entre «${prev.name}» y ${clipLabel(x)}`+(delta<-1e-6?` (se adelanta ${round(-delta)} s lo que viene después en esa pista)`:delta>1e-6?` (se retrasa ${round(delta)} s lo que viene después)`:''));
   }else throw Error('acción desconocida '+a.type);
  }catch(e){errors.push(e.message);}
 }
 // Several patches on one clip: keep them in order but merge into one updateClip each.
 const merged=[];for(const o of operations){const last=merged.find(m=>m.ref===o.ref&&m.includeGroup===o.includeGroup);if(last)Object.assign(last.patch,o.patch);else merged.push({...o,patch:{...o.patch}});}
 return {steps,operations:merged,errors,history};
}

module.exports={catalog,ACTION_TYPES,clipList,describeProject,systemPrompt,buildMessages,responseSchema,interpret,normalize,plan,OFF_TOPIC};
