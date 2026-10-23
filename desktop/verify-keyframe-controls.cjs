const {app,BrowserWindow}=require('electron'),fs=require('node:fs/promises'),path=require('node:path');
const {promisify}=require('node:util'),run=promisify(require('node:child_process').execFile);
const root=path.join(app.getPath('temp'),'lqtac-point-test-'+process.pid);app.setPath('userData',path.join(root,'profile'));
app.on('browser-window-created',(_e,w)=>w.webContents.setBackgroundThrottling(false));require('./main.cjs');
app.whenReady().then(async()=>{
  const timer=setTimeout(()=>{console.error('Point test timeout');app.exit(1)},90000);timer.unref();
  try{
    await fs.mkdir(root,{recursive:true});const engine=require('./render-engine.cjs'),io=require('./project-io.cjs');const source=path.join(root,'source.mp4');
    await run(engine.ffmpegPath(),['-v','error','-y','-f','lavfi','-i','testsrc2=s=320x180:r=24:d=3','-f','lavfi','-i','sine=frequency=220:duration=3','-c:v','libx264','-c:a','aac','-pix_fmt','yuv420p',source],{windowsHide:true});
    const w=BrowserWindow.getAllWindows()[0];if(w.webContents.isLoading())await new Promise(r=>w.webContents.once('did-finish-load',r));const js=code=>w.webContents.executeJavaScript(code);await js('demoReady');
    console.log(await js(`(async()=>{
      const camera=t=>({time:t,x:.5+t*.1,y:.5,width:1-t*.1,height:1-t*.1,rotation:0});
      await restoreProject({format:'LQTAC Studio',version:1,name:'Puntos',library:[],tracks:[{id:'V1',kind:'video',envelope:[{time:0,value:1},{time:1,value:.5},{time:2,value:1}],clips:[{name:'Vídeo',kind:'video',filePath:${JSON.stringify(source)},startSeconds:0,durationSeconds:2,sourceDurationSeconds:3,panCrop:[camera(0),camera(.333333333),camera(2)]}]},{id:'A1',kind:'audio',envelope:[{time:0,value:1}],clips:[{name:'Audio',kind:'audio',filePath:${JSON.stringify(source)},startSeconds:0,durationSeconds:2,sourceDurationSeconds:3}]}]});
      window.pointVideo=timelineClips()[0];window.pointAudio=timelineClips()[1];selectTimelineClip(pointVideo);resetEditHistory();timelineTime=0;openPanCropEditor(pointVideo);
      const session=panCropSession;await waitMedia(session.video,()=>session.video.readyState>=2);const canvas=$('#pcKeys'),rect=canvas.getBoundingClientRect(),node=session.draft[1],initial={...node};
      const event=(type,x)=>new PointerEvent(type,{button:0,bubbles:true,clientX:rect.left+x*rect.width,clientY:rect.top+rect.height/2});const x=(10+node.time/2*980)/1000;
      canvas.dispatchEvent(event('pointerdown',x));window.dispatchEvent(event('pointermove',x+.2));window.dispatchEvent(event('pointerup',x+.2));
      if(Math.abs(node.time-initial.time-.4/.98)>.00001||node.x!==initial.x||node.width!==initial.width)throw Error('Camera key drag changed transform or failed');
      const input=$('#panCropDialog .keyframe-tools input');input.value='1.75';$('#panCropDialog .keyframe-tools button').click();if(node.time!==1.75)throw Error('Precise retime failed');
      canvas.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:rect.left+(10+node.time/2*980)/1000*rect.width,clientY:rect.top+rect.height/2}));const menu=[...panCropDialog.querySelectorAll('button')].find(b=>b.textContent==='Eliminar punto'&&!b.hidden);if(!menu)throw Error('No camera context menu');menu.click();if(session.draft.includes(node))throw Error('Context delete failed');
      $('#pcList').value='0';$('#pcList').dispatchEvent(new Event('click'));panCropDialog.dispatchEvent(new KeyboardEvent('keydown',{key:'Delete',bubbles:true}));if(session.draft.some(p=>p.time===0)||timelineClips().length!==2)throw Error('Delete removed wrong object');
      $('#pcList').value='2';$('#pcList').dispatchEvent(new Event('click'));$('#pcDelete').click();if(session.draft.length)throw Error('Last camera key cannot be deleted');$('#pcApply').click();await new Promise(r=>setTimeout(r,80));if(clipCropFrames(pointVideo).length)throw Error('Camera removal not saved');
      await navigateHistory(false);window.pointVideo=timelineClips()[0];window.pointAudio=timelineClips()[1];if(clipCropFrames(pointVideo).length!==3)throw Error('Camera undo lost keyframes');await navigateHistory(true);window.pointVideo=timelineClips()[0];window.pointAudio=timelineClips()[1];
      return 'PAN: drag, exact fractional selection, precise retime, context/button/Delete removal including last key, history and no clip deletion OK';
    })()`));
    console.log(await js(`(async()=>{
      const tests=[{kind:'video',open:()=>openEffectEditor(pointVideo,'saturation'),dialog:effectEditor,session:()=>effectEditorSession,canvas:'editorCurve',list:'editorPoints',remove:'editorRemove',parameter:'saturation',min:0,max:2},{kind:'audio',open:()=>openAudioEffectEditor(pointAudio,'bass'),dialog:audioEffectEditor,session:()=>audioEditorSession,canvas:'audioEditorCurve',list:'audioEditorPoints',remove:'audioEditorRemove',parameter:'mid',min:-18,max:18}];
      for(const t of tests){t.open();const s=t.session();s.draft.animation[t.parameter]=[{time:.123456789,value:t.kind==='audio'?6:1},{time:1,value:0},{time:2,value:1}];if(t.kind==='audio'){$('#audioEditorParameter').value='mid';$('#audioEditorParameter').dispatchEvent(new Event('change'));}s.setTime(.123456789);const list=$('#'+t.list);list.value='.123456789';list.dispatchEvent(new Event('click'));
        const field=t.dialog.querySelector('.keyframe-tools input');field.value='1.5';t.dialog.querySelector('.keyframe-tools button').click();const curve=s.draft.animation[t.parameter];if(curve.length!==3||curve[1].time!==1.5)throw Error(t.kind+' precise move across key failed');
        const rect=$('#'+t.canvas).getBoundingClientRect(),node=curve[1],sx=node.time/2*rect.width,sy=(140-(node.value-t.min)/(t.max-t.min)*130)/150*rect.height;
        $('#'+t.canvas).dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:rect.left+sx,clientY:rect.top+sy}));const menu=[...t.dialog.querySelectorAll('button')].find(b=>b.textContent==='Eliminar punto'&&!b.hidden);if(!menu)throw Error(t.kind+' context missing');menu.click();if(curve.length!==2)throw Error(t.kind+' context removal failed');
        list.value='1';list.dispatchEvent(new Event('click'));t.dialog.dispatchEvent(new KeyboardEvent('keydown',{key:'Delete',bubbles:true}));if(curve.length!==1)throw Error(t.kind+' keyboard removal failed');list.value='2';list.dispatchEvent(new Event('click'));$('#'+t.remove).click();if(s.draft.animation[t.parameter])throw Error(t.kind+' last key cannot be deleted');if(timelineClips().length!==2)throw Error('Clip removed from FX');t.dialog.close();
      }
      return 'Video/audio FX: fractional selection, crossing retime, context menu, Delete and last-point removal OK';
    })()`));
    console.log(await js(`(async()=>{
      const track=$$('.track')[0];track.classList.add('envelope-visible');drawEnvelope(track);const point=getEnvelopePoints(track)[1],handle=$('[data-point="1"]',track),rect=handle.getBoundingClientRect();handle.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:rect.x,clientY:rect.y}));$('#pointDeleteMenu').click();if(getEnvelopePoints(track).includes(point))throw Error('Envelope context delete failed');
      for(let i=0;i<2;i++){const h=$('[data-point="0"]',track);h.dispatchEvent(new PointerEvent('pointerdown',{button:0,bubbles:true,clientX:rect.x,clientY:rect.y}));window.dispatchEvent(new PointerEvent('pointerup'));document.activeElement?.blur();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Delete',bubbles:true}));}
      if(getEnvelopePoints(track).length||envelopeValue(track,1)!==1||timelineClips().length!==2)throw Error('Envelope last delete / neutral / clip safety failed');
      const snap=projectSnapshot();await restoreProject(snap);if(getEnvelopePoints($$('.track')[0]).length)throw Error('Empty envelope restored unwanted points');return 'Envelope context/Delete, last point neutral, no clip deletion and empty roundtrip OK';
    })()`));
    const snap=await js('projectSnapshot()');await io.saveProject(path.join(root,'points.LQTS'),snap);await io.openProject(path.join(root,'points.LQTS'));console.log('ALL KEYFRAME CONTROL TESTS PASSED '+root);app.exit(0);
  }catch(e){console.error(e.stack);app.exit(1);}
});
