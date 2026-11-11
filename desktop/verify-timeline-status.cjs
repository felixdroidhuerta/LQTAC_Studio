const {app,BrowserWindow}=require('electron');
const path=require('node:path');
const fs=require('node:fs/promises');
const assert=require('node:assert/strict');
const portable=process.argv[2]?path.resolve(process.argv[2]):null;
const runtimeDesktop=portable?path.join(portable,'resources','app','desktop'):__dirname;
const profile=path.join(app.getPath('temp'),'cinema-studio-status-'+process.pid);

app.setPath('userData',profile);
app.on('browser-window-created',(_event,window)=>{window.hide();window.webContents.setBackgroundThrottling(false);});
require(path.join(runtimeDesktop,'main.cjs'));

app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>app.exit(1),60000);timeout.unref();
  try{
    const window=BrowserWindow.getAllWindows()[0];
    window.setContentSize(1500,950);
    if(window.webContents.isLoading())await new Promise(resolve=>window.webContents.once('did-finish-load',resolve));
    const js=source=>window.webContents.executeJavaScript(source,true);
    await js('demoReady');
    await js(`restoreProject({format:'LQTAC Studio',version:1,name:'Estado timeline',time:0,zoom:1,zoomStart:0,library:[],tracks:[{id:'V1',name:'Vídeo',kind:'video',role:'video',envelope:[],clips:[{name:'Plano',kind:'video',startSeconds:3,durationSeconds:12}]}]})`);
    assert.equal(await js("$('#timelineStatusTime').textContent"),'Posición: 00:00:00:00');
    assert.equal(await js("$('#timelineStatusSelection').textContent"),'Selección: —');
    assert.equal(await js("$('#timelineStatusZoom').textContent"),'Zoom: 100%');

    await js('renderTimelineAt(5.25)');
    assert.equal(await js("$('#timelineStatusTime').textContent"),'Posición: 00:00:05:06');
    await js("selectTimelineClip(timelineClips()[0])");
    assert.equal(await js("$('#timelineStatusSelection').textContent"),'Selección: 00:12.00');

    await js("$('.timeline-navigation [data-zoom=\"in\"]').click()");
    assert.equal(await js("$('#timelineStatusZoom').textContent"),'Zoom: 150%');
    await js('updateTimelineViewport(2.25,.1)');
    assert.equal(await js("$('#timelineStatusZoom').textContent"),'Zoom: 225%');

    await js('LQTACTimelineTools.setRange({start:2,end:8.5})');
    assert.equal(await js("$('#timelineStatusSelection').textContent"),'Tramo: 00:06.50');
    await js('LQTACTimelineTools.clearRange()');
    assert.equal(await js("$('#timelineStatusSelection').textContent"),'Selección: 00:12.00');

    await js("$$('.edit-tool').find(button=>button.title==='Snap').click()");
    assert.equal(await js("$('#timelineStatusSnap').textContent"),'Snap: desactivado');
    await js("$$('.edit-tool').find(button=>button.title==='Snap').click()");
    assert.equal(await js("$('#timelineStatusSnap').textContent"),'Snap: activado');

    await js("$('#nextButton').click()");
    await new Promise(resolve=>setTimeout(resolve,40));
    assert.equal(await js("$('#timelineStatusTime').textContent"),'Posición: 00:00:06:06');

    await js(`(()=>{LQTACTimelineTools.clearRange();void renderTimelineAt(10);const ruler=$('.ruler'),rect=$('#tracks').getBoundingClientRect(),x=time=>rect.left+time/timelineDurationSeconds*rect.width,y=ruler.getBoundingClientRect().top+10;ruler.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,button:0,pointerId:91,clientX:x(4),clientY:y}));window.dispatchEvent(new PointerEvent('pointermove',{pointerId:91,clientX:x(9),clientY:y}));window.dispatchEvent(new PointerEvent('pointerup',{pointerId:91,clientX:x(9),clientY:y}));})()`);
    assert(Math.abs(await js('lqtacRenderRange.start')-4)<.001&&Math.abs(await js('lqtacRenderRange.end')-9)<.001);
    assert(Math.abs(await js('timelineTime')-4)<.001);
    assert(await js("!!$('#rangeEndPlayhead')&&$('.range-playhead-time').textContent==='00:00:09:00'"));
    assert.equal(await js("$('#renderUseRange').checked"),true);

    await js(`(()=>{const grip=$('.range-playhead-grip'),rect=$('#tracks').getBoundingClientRect(),x=time=>rect.left+time/timelineDurationSeconds*rect.width,y=grip.getBoundingClientRect().top+4;grip.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,button:0,pointerId:93,clientX:x(9),clientY:y}));window.dispatchEvent(new PointerEvent('pointermove',{pointerId:93,clientX:x(11),clientY:y}));window.dispatchEvent(new PointerEvent('pointerup',{pointerId:93,clientX:x(11),clientY:y}));})()`);
    assert(Math.abs(await js('lqtacRenderRange.end')-11)<.001);
    assert.equal(await js("$('.range-playhead-time').textContent"),'00:00:11:00');
    await js('startTimelinePlayback(true)');
    await new Promise(resolve=>setTimeout(resolve,40));
    const started=await js('({time:timelineTime,playing})');
    assert(started.playing&&started.time>=4&&started.time<4.3);
    await js('stopTimelinePlayback()');
    const ended=await js(`(async()=>{timelineTime=10.99;playing=true;lastPlaybackTick=performance.now()-1000;await advanceTimeline(performance.now());return {time:timelineTime,playing};})()`);
    assert.equal(ended.playing,false);assert(Math.abs(ended.time-11)<.001);
    await fs.mkdir(profile,{recursive:true});await fs.writeFile(path.join(profile,'range-head.png'),(await window.webContents.capturePage()).toPNG());

    await js(`(()=>{LQTACTimelineTools.clearRange();const ruler=$('.ruler'),rect=$('#tracks').getBoundingClientRect(),x=rect.left+7/timelineDurationSeconds*rect.width,y=ruler.getBoundingClientRect().top+10;ruler.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,button:0,pointerId:92,clientX:x,clientY:y}));window.dispatchEvent(new PointerEvent('pointerup',{pointerId:92,clientX:x,clientY:y}));})()`);
    await new Promise(resolve=>setTimeout(resolve,40));
    assert(Math.abs(await js('timelineTime')-7)<.001&&await js('lqtacRenderRange')===null);
    assert.match(await js("$('.ruler').title"),/Arrastrar: seleccionar tramo/);
    assert.equal(await js("$('#rangeEndPlayhead')"),null);
    console.log(`PASS ${portable?'portable':'source'} live status, amber range head, ruler selection and playback/render range. ${path.join(profile,'range-head.png')}`);
    app.exit(0);
  }catch(error){console.error(error.stack);app.exit(1);}
});
