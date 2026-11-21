// Qbit assistant checks. Plain Node: node desktop/verify-qbit.cjs [--model]
// Without --model: deterministic checks of the action vocabulary (no engine needed).
// With --model: also starts the local engine from <repo>/qbit and evaluates a set of requests.
const assert=require('node:assert/strict'),path=require('node:path');
const A=require('./qbit-actions.cjs'),io=require('./project-io.cjs'),edit=require('./mcp-edit.cjs');
const transitions=[['fade','Fundido'],['wipeLeft','Barrido izquierda'],['wipeRight','Barrido derecha'],['circleopen','Apertura circular'],['pixelize','Pixelado'],['crosswarp','Zoom deformado'],['lumaMask','Máscara personalizada']].map(([id,name])=>({id,name}));
const clip=(name,s,d,extra={})=>({kind:'video',name,filePath:'C:/m/'+name,startSeconds:s,durationSeconds:d,sourceOffsetSeconds:0,playbackRate:1,gain:1,fadeInSeconds:0,fadeOutSeconds:0,...extra});
const project=()=>({format:'LQTAC Studio',version:1,name:'Prueba',library:[],tracks:[
 {id:'v1',kind:'video',name:'Vídeo 1',envelope:[],clips:[clip('playa.mp4',0,6,{groupId:'g1'}),clip('montaña.mp4',6,8,{groupId:'g2'}),clip('ciudad.mp4',14,5,{groupId:'g3'})]},
 {id:'a1',kind:'audio',name:'Audio 1',envelope:[],clips:[clip('playa.mp4 · audio',0,6,{kind:'audio',groupId:'g1'}),clip('montaña.mp4 · audio',6,8,{kind:'audio',groupId:'g2'}),clip('ciudad.mp4 · audio',14,5,{kind:'audio',groupId:'g3'})]}]});
const run=async(p,ops)=>edit.edit(p,ops,async()=>{throw Error('sin probe');});
let passed=0;const check=async(name,fn)=>{await fn();passed++;console.log('✓',name);};

(async()=>{
 await check('transición: solapa el clip que entra y desplaza lo posterior con su audio',async()=>{
  const p=project(),r=A.plan(p,[{type:'transition',clip:'v1:1',transition:'wipeLeft',seconds:2}],{transitions});
  assert.deepEqual(r.errors,[]);const out=await run(p,r.operations);
  const v=out.tracks[0].clips,a=out.tracks[1].clips;
  assert.equal(v[1].startSeconds,4);assert.equal(v[1].transition,'wipeLeft');assert.equal(v[2].startSeconds,12);
  assert.equal(a[1].startSeconds,4);assert.equal(a[2].startSeconds,12);assert.equal(v[0].startSeconds,0);
  io.validateProject(out);
 });
 await check('transición: el primer clip y duraciones imposibles se rechazan',async()=>{
  assert.match(A.plan(project(),[{type:'transition',clip:'v1:0',transition:'fade'}],{transitions}).errors[0],/primero/);
  assert.match(A.plan(project(),[{type:'transition',clip:'v1:2',transition:'fade',seconds:9}],{transitions}).errors[0],/menos/);
  assert.match(A.plan(project(),[{type:'transition',clip:'v1:1',transition:'lumaMask'}],{transitions}).errors[0],/no disponible/);
 });
 await check('dos transiciones en la misma respuesta usan posiciones actualizadas',async()=>{
  const p=project(),r=A.plan(p,[{type:'transition',clip:'v1:1',transition:'fade',seconds:1},{type:'transition',clip:'v1:2',transition:'pixelize',seconds:1}],{transitions});
  assert.deepEqual(r.errors,[]);const v=(await run(p,r.operations)).tracks[0].clips;
  assert.deepEqual(v.map(c=>c.startSeconds),[0,5,12]);assert.equal(v[2].transition,'pixelize');
 });
 await check('efecto de vídeo: activa FX, conserva valores y valida rangos',async()=>{
  const p=project(),r=A.plan(p,[{type:'video_effect',clip:'v1:1',effect:'film',value:.6},{type:'video_effect',clip:'v1:1',effect:'blur',value:4}],{transitions});
  assert.equal(r.operations.length,1);const c=(await run(p,r.operations)).tracks[0].clips[1];
  assert.equal(c.videoFx.enabled,true);assert.equal(c.videoFx.film,.6);assert.equal(c.videoFx.blur,4);
  assert.match(A.plan(project(),[{type:'video_effect',clip:'v1:1',effect:'blur',value:99}],{transitions}).errors[0],/entre 0 y 20/);
  assert.match(A.plan(project(),[{type:'video_effect',clip:'a1:1',effect:'blur',value:2}],{transitions}).errors[0],/no es de vídeo/);
 });
 await check('efecto de audio en un clip de vídeo va a su audio agrupado y enciende el efecto dueño',async()=>{
  const p=project(),r=A.plan(p,[{type:'audio_effect',clip:'v1:2',effect:'denoise',value:1},{type:'audio_effect',clip:'v1:2',effect:'reverbMix',value:.3}],{transitions});
  assert.deepEqual(r.errors,[]);const out=await run(p,r.operations),a=out.tracks[1].clips[2];
  assert.equal(a.audioFx.denoise,true);assert.equal(a.audioFx.reverb,true);assert.equal(a.audioFx.reverbMix,.3);assert.equal(out.tracks[0].clips[2].audioFx,undefined);
 });
 await check('fundidos y quitar efectos',async()=>{
  const p=project();p.tracks[0].clips[0].videoFx={enabled:true,blur:3};
  const r=A.plan(p,[{type:'fade_in',clip:'v1:0',seconds:1.5},{type:'remove_effects',clip:'v1:0',kind:'video'}],{transitions});
  const c=(await run(p,r.operations)).tracks[0].clips[0];assert.equal(c.fadeInSeconds,1.5);assert.equal(c.videoFx.enabled,false);
  assert.match(A.plan(project(),[{type:'fade_out',clip:'v1:2',seconds:30}],{transitions}).errors[0],/más que el clip/);
 });
 await check('deshacer va solo y fuera de tema nunca lleva acciones',async()=>{
  assert.equal(A.plan(project(),[{type:'undo'}],{transitions}).history,'undo');
  const off=A.interpret({intent:'fuera_de_tema',reply:'París',actions:[{type:'undo'}]});assert.equal(off.reply,A.OFF_TOPIC);assert.deepEqual(off.actions,[]);
  assert.deepEqual(A.interpret({intent:'pregunta',reply:'x',actions:[{type:'undo'}]}).actions,[]);
 });
 await check('«entre X y Y» fija el clip que entra y el nombre fija la transición',async()=>{
  const n=(q,acts)=>A.normalize({question:q,project:project(),actions:acts,transitions});
  assert.deepEqual(n('mete un pixelado entre la montaña y la ciudad',[{type:'transition',clip:'v1:1',transition:'wipeRight',seconds:.5}]),[{type:'transition',clip:'v1:2',transition:'pixelize',seconds:.5}]);
  assert.deepEqual(n('pon un fundido de 2 segundos entre el clip 1 y el 2',[{type:'fade_out',clip:'v1:0',seconds:2},{type:'fade_in',clip:'v1:1',seconds:2}]),[{type:'transition',clip:'v1:1',transition:'fade',seconds:2}]);
  assert.deepEqual(n('barrido a la izquierda entre el 3 y el 2',[{type:'transition',clip:'v1:1',transition:'fade'}]),[{type:'transition',clip:'v1:2',transition:'wipeLeft'}]);
  assert.deepEqual(n('fundido de 1 s entre el clip 1 y el 2',[{type:'transition',clip:'v1:1',transition:'fade',seconds:1},{type:'remove_effects',clip:'v1:2',kind:'all'}]),[{type:'transition',clip:'v1:1',transition:'fade',seconds:1}],'acciones ajenas fuera');
  const same=[{type:'transition',clip:'v1:1',transition:'fade'}];
  assert.equal(n('fundido entre la playa y la ciudad',same),same,'no consecutivos: no se toca');
  assert.equal(n('fundido de salida en la montaña',same),same,'sin «entre»: no se toca');
 });
 await check('el esquema solo admite refs, efectos y transiciones existentes',async()=>{
  const s=A.responseSchema({project:project(),transitions}).properties.actions.items.properties;
  assert.deepEqual(s.clip.enum,['v1:0','v1:1','v1:2','a1:0','a1:1','a1:2']);assert.ok(!s.transition.enum.includes('lumaMask'));assert.ok(s.effect.enum.includes('denoise')&&s.effect.enum.includes('film'));
  const prompt=A.systemPrompt({project:project(),selection:['v1:1'],transitions});assert.match(prompt,/SELECCIONADO/);assert.ok(prompt.length<12000,'prompt '+prompt.length);
 });
 console.log(`\n${passed} comprobaciones del vocabulario de acciones correctas`);

 if(!process.argv.includes('--model'))return;
 // --- Model evaluation: requests → expected action (type, clip, effect/transition). ---------------------------
 const {createQbitService}=require('./qbit-service.cjs');
 let current=project();
 const bridge={call:async(name,a)=>{if(name==='cinema_project')return {project:current,revision:edit.revision(current)};if(name==='cinema_effects')return {transitions};if(name==='cinema_edit'){current=await run(current,a.operations);return {};}if(name==='cinema_history')return {};throw Error(name);}};
 const service=createQbitService({root:path.join(__dirname,'..'),bridge});
 const cases=[
  ['pon un fundido de 2 segundos entre el clip 1 y el 2',{type:'transition',clip:'v1:1',transition:'fade'}],
  ['mete un pixelado entre la montaña y la ciudad',{type:'transition',clip:'v1:2',transition:'pixelize'}],
  ['dale un aire de película antigua al clip de la montaña',{type:'video_effect',clip:'v1:1',effect:'film'}],
  ['quita el ruido del audio del clip 3',{type:'audio_effect',effect:'denoise'}],
  ['desenfoca un poco el seleccionado',{type:'video_effect',clip:'v1:1',effect:'blur'}],
  ['haz que la ciudad se vea más cálida',{type:'video_effect',clip:'v1:2',effect:'temperature'}],
  ['pon la playa en blanco y negro',{type:'video_effect',clip:'v1:0',effect:'saturation'}],
  ['añade un fundido de salida de 2 segundos al último clip',{type:'fade_out',clip:'v1:2'}],
  ['ponle eco a la voz del clip 2',{type:'audio_effect',effect:'echo'}],
  ['quítale todos los efectos a la montaña',{type:'remove_effects',clip:'v1:1'}],
  ['deshaz lo último',{type:'undo'}],
  ['¿cuál es la capital de Francia?',{intent:'fuera_de_tema'}],
  ['escríbeme un script en python',{intent:'fuera_de_tema'}],
  ['¿cómo pongo una transición a mano?',{intent:'pregunta'}],
  ['ponle un efecto',{intent:'aclarar'}]
 ];
 await service.start();let ok=0;const t0=Date.now();
 for(const [q,want] of cases){
  current=project();const s=Date.now();let r;try{r=await service.ask({question:q,selection:['v1:1']});}catch(e){r={error:e.message};}service.reset();
  // The service only exposes the human-readable steps, so expectations are checked against them.
  const acts=r.id?r.steps:[];let good;
  if(want.intent)good=r.intent===want.intent&&!r.id;
  else good=!!r.id&&r.errors.length===0&&matches(r,want);
  if(good)ok++;
  console.log(`${good?'✓':'✗'} [${((Date.now()-s)/1000).toFixed(1)} s] ${q}\n    ${r.error||`(${r.intent}) ${r.reply}${acts.length?' → '+acts.join(' | '):''}${r.errors?.length?' ✗ '+r.errors.join(' | '):''}`}`);
 }
 service.stop();
 console.log(`\nModelo: ${ok}/${cases.length} peticiones correctas · media ${((Date.now()-t0)/cases.length/1000).toFixed(1)} s`);
 function matches(r,want){
  const text=r.steps.join(' ');
  const names={'v1:0':'playa.mp4','v1:1':'montaña.mp4','v1:2':'ciudad.mp4'};
  const labels={film:'Película antigua',blur:'Desenfoque',temperature:'Temperatura',saturation:'Saturación',denoise:'Reducción de ruido',echo:'Eco'};
  const kinds={transition:/ entre /,fade_out:/Fundido de salida/,remove_effects:/Quitar los efectos/,undo:/Deshacer/};
  if(want.type==='undo')return /Deshacer/.test(text);
  if(want.clip&&!text.includes(names[want.clip]))return false;
  if(want.effect&&!text.includes(labels[want.effect]))return false;
  if(want.transition&&!text.includes(transitions.find(t=>t.id===want.transition).name))return false;
  if(kinds[want.type]&&!kinds[want.type].test(text))return false;
  return true;
 }
})().catch(e=>{console.error('✗',e.stack||e.message);process.exitCode=1;});
