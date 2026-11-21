// Qbit panel inside the real editor: Ayuda menu entry, avatar sprite, a real request to the local engine,
// Aplicar through the validated bridge path and Ctrl+Z undo. Needs the dev module in <repo>/qbit.
// Usage: desktop\node_modules\.bin\electron.cmd desktop\verify-qbit-ui.cjs
const {app,BrowserWindow}=require('electron'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {promisify}=require('node:util'),run=promisify(require('node:child_process').execFile);
const root=path.join(app.getPath('temp'),'lqtac-qbit-ui-test-'+process.pid);app.setPath('userData',path.join(root,'profile'));
require('./main.cjs');
app.whenReady().then(async()=>{const timeout=setTimeout(()=>{console.error('✗ tiempo agotado');app.exit(1);},400000);timeout.unref();try{
  await fs.mkdir(root,{recursive:true});const ff=require('./render-engine.cjs').ffmpegPath(),files=[];
  for(const [name,src] of [['playa','testsrc2'],['montaña','smptebars'],['ciudad','rgbtestsrc']]){const f=path.join(root,name+'.mp4');files.push(f);await run(ff,['-v','error','-y','-f','lavfi','-i',src+'=s=320x180:d=6:r=25','-pix_fmt','yuv420p',f],{windowsHide:true});}
  const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));const js=c=>win.webContents.executeJavaScript(c,true);await js('demoReady');
  const wait=async(cond,ms=30000)=>{const ok=await js(`(async()=>{const end=Date.now()+${ms};while(Date.now()<end){if(${cond})return true;await new Promise(r=>setTimeout(r,200));}return false;})()`);assert(ok,'espera: '+cond);};
  await js(`(async()=>{await restoreProject({format:'LQTAC Studio',version:1,name:'Qbit',library:[],tracks:[]});resetEditHistory();const t=addTimelineTrack('video');
    ${JSON.stringify(files)}.forEach((f,i)=>createTimelineClip(t,{kind:'video',name:f.split(/[\\\\/]/).pop(),filePath:f,durationSeconds:6,sourceDurationSeconds:6,sourceOffsetSeconds:0},i*6));refreshTimelineScale();await renderTimelineAt(1);})()`);
  // Menu entry and avatar.
  const entry=await js(`(()=>{const b=helpMenu.querySelector('[data-help=qbit]');return b&&b.firstChild.textContent;})()`);assert.equal(entry,'Asistente Qbit…');
  await js(`helpMenu.querySelector('[data-help=qbit]').click()`);
  await wait(`$('#qbitPanel').classList.contains('open')`,5000);
  const sprite=await js(`(async()=>{const u=getComputedStyle($('#qbitAvatar')).backgroundImage.match(/url\\("(.+)"\\)/)?.[1];if(!u)return 'sin imagen';const i=new Image();i.src=u;try{await i.decode();return i.naturalWidth+'x'+i.naturalHeight;}catch{return 'no carga '+u;}})()`);
  assert.equal(sprite,'1536x2288','sprite de Qbit');console.log('✓ menú Ayuda → Asistente Qbit… y avatar ('+sprite+')');
  // Side-rail shortcut: right above the manual (?) button, same size as its neighbours, marked active while the panel is open, toggles it.
  const rail=JSON.parse(await js(`(async()=>{const b=$('.rail .qbit-rail'),img=b?.querySelector('img');if(!b)return '{}';await img.decode().catch(()=>{});const r=b.getBoundingClientRect(),n=b.nextElementSibling.getBoundingClientRect(),i=img.getBoundingClientRect();
    return JSON.stringify({next:b.nextElementSibling.title,size:[r.width,r.height],neighbour:[n.width,n.height],img:[i.width,i.height,img.naturalWidth],active:b.classList.contains('active')});})()`));
  console.log('  barra lateral:',JSON.stringify(rail));
  assert.equal(rail.next,'Manual de usuario');assert.deepEqual(rail.size,rail.neighbour);assert.deepEqual(rail.img,[28,28,112]);assert.equal(rail.active,true);
  const shot=async name=>{const img=await win.webContents.capturePage();await fs.writeFile(path.join(root,name),img.toPNG());};
  await shot('qbit-barra-abierto.png');
  await js(`$('.rail .qbit-rail').click()`);assert.equal(await js(`$('#qbitPanel').classList.contains('open')||$('.rail .qbit-rail').classList.contains('active')`),false,'el botón cierra el panel');
  await shot('qbit-barra-cerrado.png');
  await js(`$('.rail .qbit-rail').click()`);await wait(`$('#qbitPanel').classList.contains('open')&&$('.rail .qbit-rail').classList.contains('active')`,5000);console.log('✓ botón de la barra lateral: abre y cierra Qbit');
  let t=Date.now();await wait(`!$('#qbitInput').disabled&&$('#qbitState').textContent==='Asistente de Cinema Studio'`,180000);console.log(`✓ motor listo en ${((Date.now()-t)/1000).toFixed(1)} s`);
  // A request; the proposal must be shown before anything changes. (New clips may already overlap by the editor's default.)
  const before=JSON.parse(await js(`JSON.stringify(projectSnapshot().tracks[0].clips.map(c=>c.startSeconds))`)),delta=5-before[1];
  t=Date.now();
  await js(`(()=>{$('#qbitInput').value='pon un fundido de 1 segundo entre el clip 1 y el 2';$('#qbitForm').requestSubmit();})()`);
  await wait(`$('#qbitLog .proposal')||$('#qbitLog .bot.error')`,120000);
  const card=JSON.parse(await js(`JSON.stringify({steps:$$('#qbitLog .proposal li').map(l=>l.textContent),error:$('#qbitLog .bot.error')?.textContent||null})`));
  console.log(`  respuesta en ${((Date.now()-t)/1000).toFixed(1)} s:`,JSON.stringify(card));assert.equal(card.error,null);
  assert.equal(card.steps.length,1,'solo la transición pedida');assert.match(card.steps[0],/^Fundido de 1 s entre «playa\.mp4» y clip 2 «montaña\.mp4»/);
  assert.deepEqual(JSON.parse(await js(`JSON.stringify(projectSnapshot().tracks[0].clips.map(c=>c.startSeconds))`)),before,'nada cambia antes de Aplicar');
  await win.webContents.capturePage().then(i=>fs.writeFile(path.join(root,'qbit-propuesta.png'),i.toPNG()));
  // Aplicar.
  await js(`[...$$('#qbitLog .proposal button')].find(b=>b.textContent==='Aplicar').click()`);
  await wait(`$('#qbitLog .proposal .done')||$('#qbitLog .proposal .warn:not(:first-of-type)')`,20000);
  const applied=JSON.parse(await js(`JSON.stringify({done:$('#qbitLog .proposal .done')?.textContent||null,clips:projectSnapshot().tracks[0].clips.map(c=>[c.startSeconds,c.transition||null])})`));
  console.log('  aplicado:',JSON.stringify(applied));assert.equal(applied.done,'✓ Aplicado · Ctrl+Z lo deshace');
  assert.deepEqual(applied.clips.map(c=>c[0]),[0,5,before[2]+delta]);assert.equal(applied.clips[1][1],'fade');console.log('✓ la propuesta se aplica en la línea de tiempo');
  await win.webContents.capturePage().then(i=>fs.writeFile(path.join(root,'qbit-aplicado.png'),i.toPNG()));
  // Ctrl+Z with the focus still in Qbit's text box (where the user left it) must undo the edit.
  assert.equal(await js(`document.activeElement.id`),'qbitInput');
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'Z',modifiers:['control']});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Z',modifiers:['control']});
  await wait(`projectSnapshot().tracks[0].clips[1].startSeconds===${before[1]}`,10000);
  assert.deepEqual(JSON.parse(await js(`JSON.stringify(projectSnapshot().tracks[0].clips.map(c=>c.startSeconds))`)),before);console.log('✓ Ctrl+Z lo deshace');
  // Off-topic stays refused inside the app too.
  const bots=await js(`$$('#qbitLog .bot').length`);
  await js(`(()=>{$('#qbitInput').value='¿quién ganó el mundial de 2010?';$('#qbitForm').requestSubmit();})()`);
  await wait(`$$('#qbitLog .bot').length>${bots}&&!$('#qbitInput').disabled`,120000);
  assert.match(await js(`$$('#qbitLog .bot').at(-1).textContent`),/Solo puedo ayudarte con Cinema Studio/);console.log('✓ fuera de tema rechazado');
  await js(`$('#qbitClose').click()`);assert.equal(await js(`$('#qbitPanel').classList.contains('open')`),false);
  console.log('\nQbit en el editor correcto · capturas en '+root);
  clearTimeout(timeout);app.quit();// quit (not exit) runs before-quit, which stops the engine
 }catch(e){console.error('✗',e.stack||e.message);const w=BrowserWindow.getAllWindows()[0];if(w)await w.webContents.capturePage().then(i=>fs.writeFile(path.join(root,'qbit-fallo.png'),i.toPNG())).catch(()=>{});console.error('captura: '+root);app.exit(1);}});
