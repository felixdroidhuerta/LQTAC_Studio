const {app,BrowserWindow}=require('electron');
const path=require('node:path');
const assert=require('node:assert/strict');
const portable=process.argv[2]?path.resolve(process.argv[2]):null;
const runtimeDesktop=portable?path.join(portable,'resources','app','desktop'):__dirname;

app.setPath('userData',path.join(app.getPath('temp'),'cinema-studio-envelope-menu-'+process.pid));
app.on('browser-window-created',(_event,window)=>{window.hide();window.webContents.setBackgroundThrottling(false);});
require(path.join(runtimeDesktop,'main.cjs'));

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>app.exit(1),90000);timeout.unref();
  try{
    const window=BrowserWindow.getAllWindows()[0];
    window.setContentSize(1500,950);
    if(window.webContents.isLoading())await new Promise(resolve=>window.webContents.once('did-finish-load',resolve));
    const js=source=>window.webContents.executeJavaScript(source,true);
    await js('demoReady');
    await js(`restoreProject({format:'LQTAC Studio',version:1,name:'Envolventes',library:[],tracks:[
      {id:'V1',name:'Vídeo',kind:'video',role:'video',envelope:[],clips:[{name:'Plano',kind:'video',startSeconds:0,durationSeconds:5}]},
      {id:'A1',name:'Audio',kind:'audio',role:'music',envelope:[],clips:[{name:'Voz',kind:'audio',startSeconds:0,durationSeconds:5}]},
      {id:'S1',name:'Subtítulos',kind:'subtitle',role:'subtitle',envelope:[],clips:[{name:'Texto',kind:'subtitle',subtitleText:'Texto',startSeconds:0,durationSeconds:5}]}
    ]})`);

    async function toggleFromClip(kind,expected){
      await js(`(()=>{const clip=timelineClips().find(item=>item.dataset.kind===${JSON.stringify(kind)});clip.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:500,clientY:600}));})()`);
      await wait(30);
      const menu=await js(`(()=>{const button=$('[data-action="toggle-envelope"]',clipContextMenu);return {open:clipContextMenu.classList.contains('open'),visible:getComputedStyle(button).display!=='none',text:button.textContent,contextKind:contextTrack?.dataset.kind,hasClip:!!contextClip};})()`);
      assert(menu.open&&menu.visible&&menu.hasClip);
      assert.equal(menu.contextKind,kind);
      assert.match(menu.text,expected);
      await js(`$('[data-action="toggle-envelope"]',clipContextMenu).click()`);
      assert(await js(`$$('.track').find(track=>track.dataset.kind===${JSON.stringify(kind)}).classList.contains('envelope-visible')`));
    }

    await toggleFromClip('video',/Añadir línea de transparencia/);
    await toggleFromClip('audio',/Añadir línea de volumen/);

    async function physicalEdit(kind){
      const before=await js(`(()=>{const track=$$('.track').find(item=>item.dataset.kind===${JSON.stringify(kind)}),svg=$('svg',$('.envelope-layer',track)),rect=svg.getBoundingClientRect();return {count:getEnvelopePoints(track).length,x:Math.round(rect.left+rect.width*.2),y:Math.round(rect.top+4)};})()`);
      window.webContents.sendInputEvent({type:'mouseMove',x:before.x,y:before.y});
      window.webContents.sendInputEvent({type:'mouseDown',x:before.x,y:before.y,button:'right',clickCount:1});
      window.webContents.sendInputEvent({type:'mouseUp',x:before.x,y:before.y,button:'right',clickCount:1});
      await wait(50);
      const added=await js(`(()=>{const track=$$('.track').find(item=>item.dataset.kind===${JSON.stringify(kind)}),points=getEnvelopePoints(track),handle=$('[data-point="0"]',$('.envelope-layer',track)),rect=handle?.getBoundingClientRect();return {count:points.length,point:{...points[0]},x:Math.round(rect?.left+rect?.width/2),y:Math.round(rect?.top+rect?.height/2)};})()`);
      assert.equal(added.count,before.count+1);
      window.webContents.sendInputEvent({type:'mouseMove',x:added.x,y:added.y});
      window.webContents.sendInputEvent({type:'mouseDown',x:added.x,y:added.y,button:'left',clickCount:1});
      window.webContents.sendInputEvent({type:'mouseMove',x:added.x+35,y:added.y+12,button:'left'});
      window.webContents.sendInputEvent({type:'mouseUp',x:added.x+35,y:added.y+12,button:'left',clickCount:1});
      await wait(50);
      const moved=await js(`(()=>{const track=$$('.track').find(item=>item.dataset.kind===${JSON.stringify(kind)});return {...getEnvelopePoints(track)[0]};})()`);
      assert(moved.time>added.point.time&&moved.value<added.point.value);
    }

    await physicalEdit('video');
    await physicalEdit('audio');

    async function addFromTrack(kind,ratio,label){
      const before=await js(`(()=>{const track=$$('.track').find(item=>item.dataset.kind===${JSON.stringify(kind)}),rect=track.getBoundingClientRect();return {count:getEnvelopePoints(track).length,x:Math.round(rect.left+rect.width*${ratio}),y:Math.round(rect.top+7),duration:timelineDurationSeconds};})()`);
      window.webContents.sendInputEvent({type:'mouseMove',x:before.x,y:before.y});
      window.webContents.sendInputEvent({type:'mouseDown',x:before.x,y:before.y,button:'right',clickCount:1});
      window.webContents.sendInputEvent({type:'mouseUp',x:before.x,y:before.y,button:'right',clickCount:1});
      await wait(50);
      const menu=await js(`(()=>{const button=$('[data-action="add-envelope-point"]',clipContextMenu);return {open:clipContextMenu.classList.contains('open'),visible:getComputedStyle(button).display!=='none',text:button.textContent};})()`);
      assert(menu.open&&menu.visible);assert.match(menu.text,label);
      await js(`$('[data-action="add-envelope-point"]',clipContextMenu).click()`);
      const result=await js(`(()=>{const track=$$('.track').find(item=>item.dataset.kind===${JSON.stringify(kind)}),points=getEnvelopePoints(track),point=points.find(item=>Math.abs(item.time-timelineDurationSeconds*${ratio})<.1),layer=$('.envelope-layer',track),hit=$('.envelope-handle-hit',layer),visible=$('.envelope-handle',layer);return {count:points.length,found:!!point,lineVisible:track.classList.contains('envelope-visible'),hitRadius:hit?.getAttribute('r'),visibleRadius:visible?.getAttribute('r'),cursor:getComputedStyle($('.envelope-line-hit',layer)).cursor};})()`);
      assert.equal(result.count,before.count+1);assert(result.found&&result.lineVisible);assert.equal(result.hitRadius,'8');assert.equal(result.visibleRadius,'3');assert.match(result.cursor,/data:image\/svg\+xml/);
    }

    await addFromTrack('video',.58,/transparencia/);
    await addFromTrack('audio',.72,/volumen/);
    const hover=await js(`(()=>{const track=$$('.track').find(item=>item.dataset.kind==='audio'),layer=$('.envelope-layer',track),svg=$('svg',layer),rect=svg.getBoundingClientRect(),time=timelineDurationSeconds*.5,value=envelopeValue(track,time);return {x:Math.round(rect.left+rect.width*.5),y:Math.round(rect.top+(4+(1-value)*38)/46*rect.height)};})()`);
    window.webContents.sendInputEvent({type:'mouseMove',x:hover.x,y:hover.y});await wait(50);
    assert.equal(await js(`getComputedStyle($('.envelope-line',$$('.track').find(item=>item.dataset.kind==='audio'))).stroke`),'rgb(255, 224, 138)');

    async function editEnvelope(kind){
      const result=await js(`(()=>{try{
        const track=$$('.track').find(item=>item.dataset.kind===${JSON.stringify(kind)});
        const layer=$('.envelope-layer',track),svg=$('svg',layer),rect=svg.getBoundingClientRect();
        const before=getEnvelopePoints(track).length;
        for(const ratio of [.1,.35,.7])$('.envelope-line',layer).dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:rect.left+rect.width*ratio,clientY:rect.top+4}));
        const points=getEnvelopePoints(track),added=points.length===before+3,index=1;
        const handle=$('[data-point="'+index+'"]',layer),original={...points[index]};
        handle.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,button:0,clientX:rect.left+rect.width*.35,clientY:rect.top+4}));
        window.dispatchEvent(new PointerEvent('pointermove',{clientX:rect.left+rect.width*.45,clientY:rect.top+rect.height*.55}));
        window.dispatchEvent(new PointerEvent('pointerup'));
        const moved={...points[index]};
        const segment=$('[data-segment="0"]',layer),beforeSegment=points.slice(0,2).map(point=>point.value);
        segment.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,button:0,clientX:rect.left,clientY:rect.top+rect.height*.5}));
        window.dispatchEvent(new PointerEvent('pointermove',{clientX:rect.left,clientY:rect.top+rect.height*.65}));
        window.dispatchEvent(new PointerEvent('pointerup'));
        return {added,original,moved,segmentMoved:points[0].value!==beforeSegment[0]&&points[1].value!==beforeSegment[1],count:points.length};
      }catch(error){return {error:error.stack||error.message};}})()`);
      if(result.error)throw Error(result.error);
      assert(result.added&&result.count>=3);
      assert(result.moved.time>result.original.time);
      assert(result.moved.value<result.original.value);
      assert(result.segmentMoved);
    }

    await editEnvelope('video');
    await editEnvelope('audio');

    await js(`(()=>{const clip=timelineClips().find(item=>item.dataset.kind==='subtitle');clip.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:500,clientY:600}));})()`);
    assert(await js(`getComputedStyle($('[data-action="toggle-envelope"]',clipContextMenu)).display==='none'`));

    await js(`(()=>{const video=$$('.track').find(track=>track.dataset.kind==='video');showTrackContextMenu({clientX:450,clientY:500},video);})()`);
    assert.match(await js(`$('[data-action="toggle-envelope"]',clipContextMenu).textContent`),/Ocultar línea de transparencia/);
    await js(`$('[data-action="toggle-envelope"]',clipContextMenu).click()`);
    assert(!(await js(`$$('.track').find(track=>track.dataset.kind==='video').classList.contains('envelope-visible')`)));

    const snapshot=await js('projectSnapshot()');
    assert.equal(snapshot.tracks[0].envelopeVisible,false);
    assert(snapshot.tracks[0].envelope.length>=4);
    assert.equal(snapshot.tracks[1].envelopeVisible,true);
    assert(snapshot.tracks[1].envelope.length>=4);

    console.log(`PASS ${portable?'portable':'source'} easy track-menu point insertion, compact handles, cyan line cursor/highlight, point/segment drag and persistence.`);
    app.exit(0);
  }catch(error){console.error(error.stack);app.exit(1);}
});
