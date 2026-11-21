// Ver / Opciones menus, grouped Herramientas, monitor buttons (safe areas, quality, full screen), timeline settings,
// preferences, audio cache dialog, real save status and autosave. Usage: desktop\node_modules\.bin\electron.cmd desktop\verify-app-options.cjs
const {app,BrowserWindow,dialog}=require('electron'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {promisify}=require('node:util'),run=promisify(require('node:child_process').execFile);
const root=path.join(app.getPath('temp'),'lqtac-app-options-test-'+process.pid);app.setPath('userData',path.join(root,'profile'));
require('./main.cjs');
app.whenReady().then(async()=>{const timeout=setTimeout(()=>app.exit(1),180000);timeout.unref();try{
  await fs.mkdir(root,{recursive:true});const ff=require('./render-engine.cjs').ffmpegPath(),mp4=path.join(root,'plano.mp4'),wav=path.join(root,'voz.wav'),saved=path.join(root,'opciones.LQTS');
  await run(ff,['-v','error','-y','-f','lavfi','-i','testsrc2=s=320x180:d=6:r=25','-pix_fmt','yuv420p',mp4],{windowsHide:true});
  await run(ff,['-v','error','-y','-f','lavfi','-i','sine=f=220:d=6','-ar','48000','-ac','1',wav],{windowsHide:true});
  dialog.showSaveDialog=async()=>({canceled:false,filePath:saved});
  const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));const js=c=>win.webContents.executeJavaScript(c,true);await js('demoReady');
  const wait=(cond,ms=30000)=>js(`(async()=>{const end=Date.now()+${ms};while(Date.now()<end){if(${cond})return true;await new Promise(r=>setTimeout(r,100));}return false;})()`);
  await js(`(async()=>{await restoreProject({format:'LQTAC Studio',version:1,name:'Opciones',library:[],tracks:[]});resetEditHistory();
    const v=createTimelineClip(addTimelineTrack('video'),{kind:'video',name:'plano.mp4',filePath:${JSON.stringify(mp4)},durationSeconds:6,sourceDurationSeconds:6,sourceOffsetSeconds:0},0);
    v.dataset.videoFx=JSON.stringify({...LQTACEffects.videoDefaults,enabled:true,blur:6,glow:1});
    createTimelineClip(addTimelineTrack('audio'),{kind:'audio',name:'voz.wav',filePath:${JSON.stringify(wav)},durationSeconds:6,sourceDurationSeconds:6,sourceOffsetSeconds:0},0);refreshTimelineScale();await renderTimelineAt(1);})()`);
  // Menus: Ver and Opciones open; Herramientas grouped; moved commands in their new menus.
  const menus=JSON.parse(await js(`(()=>{const text=m=>[...m.children].map(n=>n.classList.contains('menu-heading')?'# '+n.textContent:n.classList.contains('menu-divider')?'--':n.matches('button')?n.firstChild.textContent.replace(/^✓ /,''):null).filter(Boolean);
    const open=name=>{const b=$$('.menu-item').find(x=>x.textContent.trim()===name);b.click();const id=b.getAttribute('aria-controls');const m=document.getElementById(id);const r={open:m.classList.contains('open'),items:text(m)};document.body.click();return r;};
    return JSON.stringify({ver:open('Ver'),opciones:open('Opciones'),herramientas:open('Herramientas'),editar:[...editMenu.querySelectorAll('button')].map(b=>b.textContent),archivo:open('Archivo')});})()`));
  console.log(JSON.stringify(menus.herramientas.items),JSON.stringify(menus.opciones.items));
  assert(menus.ver.open&&menus.opciones.open,'Ver and Opciones open');
  assert.deepEqual(menus.herramientas.items.filter(i=>i.startsWith('#')),['# Efectos','# Voz y audio','# Subtítulos']);
  const tools=menus.herramientas.items;assert(tools.indexOf('Separar instrumentos…')===tools.indexOf('Voz de estudio… (clip de audio seleccionado)')+1,'stems next to voice studio');
  assert(!tools.some(i=>/Separar clip|Control MCP|Paquetes|Importar subtítulos|Panel de subtítulos/.test(i)),'moved items left Herramientas');
  assert(menus.editar.some(t=>t.startsWith('Separar clip')),'split in Editar');assert(menus.archivo.items.includes('Importar subtítulos SRT…'),'SRT import in Archivo');
  assert.deepEqual(menus.opciones.items.slice(0,3),['# Programa','Preferencias…','Caché de audio procesado…']);assert(menus.opciones.items.includes('Paquetes…')&&menus.opciones.items.includes('Control MCP local…'),'extensions in Opciones');
  assert(['# Espacio de trabajo','# Monitor','# Línea de tiempo','# Paneles'].every(h=>menus.ver.items.includes(h)),'Ver groups');
  // Voz de estudio from Herramientas with the audio clip selected.
  const voice=JSON.parse(await js(`(async()=>{try{const audio=timelineClips().find(c=>c.dataset.kind==='audio');applyTimelineSelection([audio]);const b=toolsMenu.querySelector('[data-tool=voice-studio]');studioRefresh(toolsMenu);const enabled=!b.disabled;b.click();await new Promise(r=>setTimeout(r,400));const open=$('#voiceStudioDialog').open;$('#vsClose').click();applyTimelineSelection([]);studioRefresh(toolsMenu);return JSON.stringify({enabled,open,disabledWithout:b.disabled});}catch(e){return JSON.stringify({error:e.message+" "+e.stack});}})()`));console.log(JSON.stringify(voice));
  assert.deepEqual(voice,{enabled:true,open:true,disabledWithout:true});
  // Monitor: safe areas, quality (GPU effects at ½), full screen.
  const monitor=JSON.parse(await js(`(async()=>{$('#monitorSafe').click();const safe=getComputedStyle($('.safe-overlay')).display;$('#monitorQuality').click();const menuOpen=$('#monitorQualityMenu').classList.contains('open');$$('#monitorQualityMenu button')[1].click();
    await renderTimelineAt(2);const scale=window.LQTACPreviewScale,label=$('#monitorQuality').textContent,canvas=$$('.monitor-screen canvas.preview-media').find(c=>c.style.display==='block');
    return JSON.stringify({safe,menuOpen,scale,label,drawn:!!canvas});})()`));
  console.log(JSON.stringify(monitor));assert.deepEqual(monitor,{safe:'flex',menuOpen:true,scale:.5,label:'Calidad ½ ▾',drawn:true});
  await win.webContents.capturePage().then(i=>fs.writeFile(path.join(root,'monitor.png'),i.toPNG()));
  const full=await js(`(async()=>{$('#monitorFull').click();await new Promise(r=>setTimeout(r,600));const on=document.fullscreenElement===$('.monitor');await document.exitFullscreen().catch(()=>{});await new Promise(r=>setTimeout(r,300));return on&&!document.fullscreenElement;})()`);
  assert.equal(full,true,'monitor full screen and back');
  // ⚙ timeline settings: only the timeline section; track size, visuals, time format.
  const timeline=JSON.parse(await js(`(async()=>{$('#timelineSettingsButton').click();const d=$('#prefsDialog'),title=$('#prefsTitle').textContent,shown=$$('#prefsDialog fieldset').filter(f=>!f.hidden).length;
    const pick=(id,v)=>{const e=$(id);if(e.type==='checkbox')e.checked=v;else e.value=v;e.dispatchEvent(new Event('change'));};
    pick('#prefTrackSize','large');pick('#prefVisuals',false);pick('#prefTimeFormat','seconds');await renderTimelineAt(2.5);await new Promise(r=>setTimeout(r,300));
    const r={open:d.open,title,shown,height:$('.track').getBoundingClientRect().height,visuals:$$('.clip.media-visual').length,time:$('#timecode').textContent};$('#prefsClose').click();
    r.stored=JSON.parse(localStorage.getItem('lqtac.prefs'));return JSON.stringify(r);})()`));
  console.log(JSON.stringify(timeline));
  assert.equal(timeline.open,true);assert.equal(timeline.title,'Ajustes de la línea de tiempo');assert.equal(timeline.shown,1);assert(Math.abs(timeline.height-88)<2,'large tracks');
  assert.equal(timeline.visuals,0,'visuals off');assert.match(timeline.time,/^00:02\.50$/);assert.equal(timeline.stored.trackSize,'large');assert.equal(timeline.stored.previewScale,.5);
  await js(`(()=>{LQTACAppOptions.set('trackSize','compact');LQTACAppOptions.set('visuals',true);})()`);assert(await wait(`Math.abs($('.track').getBoundingClientRect().height-46)<2&&$$('.clip.media-visual').length===2`,10000),'compact tracks and visuals back');
  // Preferences dialog shows every section; reset restores defaults.
  const prefs=JSON.parse(await js(`(()=>{LQTACAppOptions.openPrefs();const r={shown:$$('#prefsDialog fieldset').filter(f=>!f.hidden).length,title:$('#prefsTitle').textContent};$('#prefsReset').click();$('#prefsClose').click();r.after={...LQTACAppOptions.prefs};r.timecode=$('#timecode').textContent;return JSON.stringify(r);})()`));
  assert.equal(prefs.shown,4);assert.equal(prefs.title,'Preferencias');assert.deepEqual([prefs.after.previewScale,prefs.after.trackSize,prefs.after.timeFormat,prefs.after.safeAreas],[1,'normal','timecode',false]);assert.match(prefs.timecode,/^00:\d\d:\d\d:\d\d$/);
  assert.equal(await js(`(()=>{$('#railPreferences').click();const r=$('#prefsDialog').open&&$('#prefsTitle').textContent==='Preferencias';$('#prefsClose').click();return r;})()`),true,'rail gear opens preferences');
  // Audio cache dialog.
  const cache=JSON.parse(await js(`(async()=>{optionsMenu.querySelector('[data-options=cache]').click();await new Promise(r=>setTimeout(r,500));const r={open:$('#cacheDialog').open,info:$('#cacheInfo').textContent,folder:$('#cacheFolder').textContent};$('#cacheClose').click();return JSON.stringify(r);})()`));
  assert.equal(cache.open,true);assert(/effects-cache/.test(cache.folder),'cache folder shown');console.log(JSON.stringify(cache));
  // Save status and autosave.
  await js(`window.dispatchEvent(new Event('lqtac-project-restored'))`);assert(await wait(`LQTACAppOptions.status==='Proyecto sin guardar'`,10000),'unsaved project: '+await js('LQTACAppOptions.status'));
  assert.equal(await js(`saveLqts()`),true);assert(await wait(`/^Guardado hace/.test(LQTACAppOptions.status)`,10000),'saved: '+await js('LQTACAppOptions.status'));
  await js(`(()=>{LQTACAppOptions.set('autosave',1);addTimelineTrack('audio');})()`);await js(`LQTACAppOptions.check()`);
  assert(/^Cambios sin guardar · autoguardado en 1 min$/.test(await js('LQTACAppOptions.status')),'dirty: '+await js('LQTACAppOptions.status'));
  await js(`(async()=>{LQTACAppOptions.backdate(61000);await LQTACAppOptions.check();})()`);
  assert(/^Guardado automáticamente hace/.test(await js('LQTACAppOptions.status')),'autosaved: '+await js('LQTACAppOptions.status'));
  const file=JSON.parse(await fs.readFile(saved,'utf8'));console.log('tracks',JSON.stringify(file.tracks.map(t=>[t.id,t.kind,t.clips.length])));assert.equal(file.tracks.length,3,'autosave wrote the new track');
  await js(`LQTACAppOptions.set('autosave',0)`);
  // Imán: a moved clip lands exactly on the neighbour's end; Alt bypasses it; a trimmed edge lands on the playhead; ⌗ switches it off.
  const snap=JSON.parse(await js(`(async()=>{const a=timelineClips().find(c=>c.dataset.kind==='video'),track=a.closest('.track'),T=()=>timelineDurationSeconds;
    const b=createTimelineClip(track,{kind:'video',name:'b.mp4',filePath:${JSON.stringify(mp4)},durationSeconds:3,sourceDurationSeconds:6,sourceOffsetSeconds:0},10/T()*100);b.dataset.startSeconds='10';refreshTimelineScale();await renderTimelineAt(20);
    const pps=()=>track.getBoundingClientRect().width/T(),wait=()=>new Promise(r=>setTimeout(r,30));
    const drag=async(node,fromX,dx,alt=false)=>{const r=node.getBoundingClientRect(),y=r.top+r.height/2;node.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,button:0,clientX:fromX,clientY:y,pointerId:1}));await wait();
      for(const f of [.5,1])window.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:fromX+dx*f,clientY:y,altKey:alt,pointerId:1}));await wait();const shown=$('.snap-guide')?.style.display;window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:fromX+dx,clientY:y,pointerId:1}));await wait();return shown;};
    const mid=n=>{const r=n.getBoundingClientRect();return r.left+r.width/2;};
    const guide=await drag(b,mid(b),-(4*pps())+3);const snapped=clipTiming(b).startSeconds;
    await drag(b,mid(b),3,true);const free=clipTiming(b).startSeconds;
    await renderTimelineAt(4);const ar=a.getBoundingClientRect();await drag(a,ar.right-2,-(2*pps())+3);const trimmed=clipTiming(a).startSeconds+clipTiming(a).durationSeconds;
    $('#snapButton').click();const off={pressed:$('#snapButton').getAttribute('aria-pressed'),status:$('#timelineStatusSnap').textContent};await drag(b,mid(b),40);await drag(b,mid(b),-(clipTiming(b).startSeconds-6)*pps()+3);const unsnapped=clipTiming(b).startSeconds;$('#snapButton').click();
    return JSON.stringify({guide,snapped,free,trimmed,off,unsnapped,pps:pps()});})()`));
  console.log(JSON.stringify(snap));
  assert.equal(snap.guide,'block','guide line shown');assert(Math.abs(snap.snapped-6)<.002,'moved clip snaps to the neighbour end');assert(snap.free-6>2.5/snap.pps,'Alt bypasses the magnet');
  assert(Math.abs(snap.trimmed-4)<.002,'trimmed edge snaps to the playhead');assert.deepEqual(snap.off,{pressed:'false',status:'Imán: desactivado'});assert(Math.abs(snap.unsnapped-6)>2/snap.pps,'no snapping when off');
  // Tema claro: interface light, monitor and clips untouched, inline dialog colours remapped; back to dark restores everything; remembered after reload.
  const colours=`(()=>{const lum=c=>{const m=c.match(/[\\d.]+/g).map(Number);return (0.2126*m[0]+0.7152*m[1]+0.0722*m[2])/255;};const bg=s=>getComputedStyle(document.querySelector(s)).backgroundColor;
    return JSON.stringify({body:bg('body'),panel:bg('.monitor'),text:getComputedStyle(document.body).color,screen:bg('.monitor-screen'),clip:bg('.clip'),render:renderDialog.style.background,lum:{body:lum(bg('body')),text:lum(getComputedStyle(document.body).color),screen:lum(bg('.monitor-screen'))},theme:document.documentElement.dataset.theme});})()`;
  const dark=JSON.parse(await js(colours));await js(`LQTACAppOptions.set('theme','light')`);await new Promise(r=>setTimeout(r,200));const lightTheme=JSON.parse(await js(colours));
  console.log(JSON.stringify({dark:dark.lum,light:lightTheme.lum}));
  assert.equal(lightTheme.theme,'light');assert(lightTheme.lum.body>.8&&lightTheme.lum.text<.25,'light background, dark text');assert.equal(lightTheme.screen,dark.screen,'monitor stays dark');assert.equal(lightTheme.clip,dark.clip,'clips keep their colours');assert.notEqual(lightTheme.render,dark.render,'inline dialog colours remapped');
  await js(`LQTACAppOptions.set('theme','dark')`);const back=JSON.parse(await js(colours));assert.deepEqual(back,dark,'dark theme restored exactly');
  await js(`LQTACAppOptions.set('theme','light')`);win.webContents.reload();await new Promise(r=>win.webContents.once('did-finish-load',r));await js('demoReady');
  assert.equal(await js(`document.documentElement.dataset.theme+'|'+$('#prefTheme').value`),'light|light','light theme remembered after reload');
  assert(JSON.parse(await js(colours)).lum.body>.8,'light theme applied on load');await js(`LQTACAppOptions.set('theme','dark')`);
  console.log('APP OPTIONS VERIFICATION PASSED',root);app.exit(0);
}catch(error){console.error(error);app.exit(1);}});
