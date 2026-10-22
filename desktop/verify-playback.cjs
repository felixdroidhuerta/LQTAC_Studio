const { app, BrowserWindow } = require('electron');
app.setPath('userData', require('node:path').join(app.getPath('temp'), 'lqtac-playback-verification-' + process.pid));
require('./main.cjs');
app.whenReady().then(async () => {
  try {
    const win = BrowserWindow.getAllWindows()[0];
    const timeout=setTimeout(()=>{console.error('Verification timeout');app.exit(1);},45000);timeout.unref();
    if (win.webContents.isLoading()) await new Promise(resolve => win.webContents.once('did-finish-load', resolve));
    await win.webContents.executeJavaScript('new Promise(resolve => setTimeout(resolve, 5000))');
    const { dialog } = require('electron');
    const originalDialog = dialog.showOpenDialog;
    const defaults = [];
    try {
      dialog.showOpenDialog = async (_window, options) => { defaults.push(options.defaultPath); return {canceled:true,filePaths:[]}; };
      await win.webContents.executeJavaScript('(async()=>{await window.lqtacDesktop.openTransitionMask();await window.lqtacDesktop.openTransitionMask();})()');
      const expected = require('node:path').resolve(__dirname,'..','Shapes');
      if(defaults.length!==2 || defaults.some(value=>value!==expected))throw new Error('Shapes default path failed');
      console.log('Mask file dialog starts in project Shapes on every opening OK');
    } finally { dialog.showOpenDialog = originalDialog; }
    console.log(await win.webContents.executeJavaScript(`(async () => {
      const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;
      const renderer=new LQTACTransitions.Renderer(canvas);
      const source=color=>{const c=document.createElement('canvas');c.width=c.height=32;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,32,32);return c;};
      const from=source('blue'),to=source('red');
      const mask=source('black');const maskContext=mask.getContext('2d');maskContext.fillStyle='white';maskContext.fillRect(0,0,16,32);
      const blob=await new Promise(resolve=>mask.toBlob(resolve,'image/png'));
      await loadCustomMask(new File([blob],'test-mask.png',{type:'image/png'}));
      if(!customMask.filePath || !customMask.dataUrl.startsWith('data:image/png'))throw new Error('Mask asset copy failed');
      for(const effect of LQTACTransitions.catalog){
        for(const progress of [0,.5,1]){
          renderer.draw(effect.id,from,to,progress,{image:mask,softness:.15});
          const pixel=new Uint8Array(4);renderer.gl.readPixels(16,16,1,1,renderer.gl.RGBA,renderer.gl.UNSIGNED_BYTE,pixel);
          if(progress===0 && pixel[2]<240)throw new Error(effect.id+' wrong start '+pixel);
          if(progress===1 && pixel[0]<240)throw new Error(effect.id+' wrong end '+pixel);
          if(renderer.gl.getError()!==renderer.gl.NO_ERROR)throw new Error(effect.id+' WebGL error');
        }
      }
      for(const invert of [false,true]) {
        renderer.draw('lumaMask',from,to,.5,{image:mask,softness:.1,invert});
        const left=new Uint8Array(4),right=new Uint8Array(4);
        renderer.gl.readPixels(4,16,1,1,renderer.gl.RGBA,renderer.gl.UNSIGNED_BYTE,left);
        renderer.gl.readPixels(28,16,1,1,renderer.gl.RGBA,renderer.gl.UNSIGNED_BYTE,right);
        if((invert?left[2]:left[0])<240 || (invert?right[0]:right[2])<240) throw new Error('Mask luminance/inversion failed');
      }
      const blurred=LQTACTransitions.prepareMask(mask,5),blurPixels=blurred.getContext('2d').getImageData(0,0,32,32).data;
      if(!blurPixels.some((value,index)=>index%4===0 && value>2 && value<253))throw new Error('Blur did not produce grayscale edges');
      for(const motion of ['none','zoomIn','zoomOut','left','right','up','down','shake']){
        for(const progress of [0,.3,.7,1]){
          renderer.draw('lumaMask',from,to,progress,{image:mask,softness:0,blur:5,motion,amount:.75});
          const pixel=new Uint8Array(4);renderer.gl.readPixels(16,16,1,1,renderer.gl.RGBA,renderer.gl.UNSIGNED_BYTE,pixel);
          if((progress===0&&pixel[2]<240)||(progress===1&&pixel[0]<240)||renderer.gl.getError()!==renderer.gl.NO_ERROR)throw new Error('Mask motion endpoint/render failed: '+motion);
        }
      }
      renderer.dispose();openTransitionPanel();
      if($$('.transition-card').length!==7||!$('#mediaList').hidden)throw new Error('Catalog UI failed');
      if(transitionPanel.contains(maskControls)||maskControls.open)throw new Error('Mask controls must not be permanent');
      $('.transition-card[data-transition="fade"]').click();
      if(maskControls.open)throw new Error('Other transitions opened mask configuration');
      $('.transition-card[data-transition="lumaMask"]').click();
      if(!maskControls.open)throw new Error('Custom mask dialog did not open');
      $('#dismissMaskDialog').click();
      if(maskControls.open)throw new Error('Custom mask dialog did not close');
      return 'Seven offline shaders, mask loading/copy, luminance order and inversion OK';
    })()`));
    console.log(await win.webContents.executeJavaScript(`(() => {
      const audio=addTimelineTrack('audio'),video=addTimelineTrack('video');
      if($('.clip',audio)||$('.clip',video)) throw new Error('New tracks must be empty');
      if(!$('.envelope-layer',audio).dataset.functional||!audio.dataset.dropBound) throw new Error('Track bindings missing');
      const originalWidth=$('#tracks').getBoundingClientRect().width;
      updateTimelineViewport(4,.2);
      if($('#tracks').getBoundingClientRect().width < originalWidth*3 || timelineBody.scrollLeft<=0) throw new Error('Zoom or scroll failed');
      updateTimelineViewport(1,0);
      const clipA=createTimelineClip(audio,{name:'Selection test A',kind:'audio',durationSeconds:3},10);
      const clipB=createTimelineClip(video,{name:'Selection test B',kind:'video',durationSeconds:3},10);
      createTimelineGroup([clipA,clipB]);
      applyTimelineSelection([]);
      const a=clipA.getBoundingClientRect();
      audio.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,clientX:a.right+15,clientY:a.bottom+5}));
      window.dispatchEvent(new PointerEvent('pointermove',{clientX:a.left-5,clientY:a.top-5}));
      window.dispatchEvent(new PointerEvent('pointerup'));
      if(!selectedTimelineClips.includes(clipA)||!selectedTimelineClips.includes(clipB)) throw new Error('Marquee group selection failed');
      audio.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,clientX:a.right+15,clientY:a.bottom+5}));
      window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
      if(selectedTimelineClips.length!==2 || $('.timeline-selection-box')) throw new Error('Marquee cancellation failed');
      clipA.remove();clipB.remove();applyTimelineSelection([]);
      return 'Empty audio/video tracks, envelope/drop bindings, 400% zoom, horizontal scroll and fit OK';
    })()`));
    const files = ['Tantas cosas que diria.mp4', 'Tantas cosas que diria_Efects.mp4'];
    for (const name of files) {
      const filePath = 'D:\\loquetengoaquicolgado.com\\Canciones\\Tantas cosas que diria Stems\\VideoClip\\' + name;
      const result = await win.webContents.executeJavaScript(`(async () => {
        stopTimelinePlayback();
        timelineClips().forEach(clip => clip.remove());
        await addMediaToTimeline($('.track[data-role="video"]'), ${JSON.stringify({name, filePath, kind:'video'})}, 0);
        const clips = timelineClips();
        if (clips.length !== 2 || clips[0].dataset.durationSeconds !== clips[1].dataset.durationSeconds) throw new Error('Unequal pair durations');
        const audioTrack=clips.find(c=>c.dataset.kind==='audio').parentElement;
        const videoTrack=clips.find(c=>c.dataset.kind==='video').parentElement;
        envelopePoints.set(audioTrack,[{time:0,value:1},{time:timelineDurationSeconds,value:1}]);
        const layer=$('.envelope-layer',audioTrack); audioTrack.classList.add('envelope-visible');
        drawEnvelope(audioTrack);
        const svg=$('svg',layer), rect=svg.getBoundingClientRect();
        $('.envelope-segment',layer).dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:rect.left+rect.width/2,clientY:rect.top+4/46*rect.height}));
        if(getEnvelopePoints(audioTrack).length<3) throw new Error('Point insertion failed');
        let handle=$('[data-point="1"]',layer);
        handle.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,clientX:rect.left+rect.width/2,clientY:rect.top}));
        window.dispatchEvent(new PointerEvent('pointermove',{clientX:rect.left+rect.width/2,clientY:rect.top+rect.height*19/46}));
        window.dispatchEvent(new PointerEvent('pointerup'));
        if(Math.abs(getEnvelopePoints(audioTrack)[1].value-.5)>.01) throw new Error('Point drag failed');
        const segment=$('[data-segment="0"]',layer);
        segment.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,clientX:rect.left,clientY:rect.top}));
        window.dispatchEvent(new PointerEvent('pointermove',{clientX:rect.left,clientY:rect.top+rect.height*9.5/46}));
        window.dispatchEvent(new PointerEvent('pointerup'));
        if(Math.abs(getEnvelopePoints(audioTrack)[0].value-.75)>.01 || Math.abs(getEnvelopePoints(audioTrack)[1].value-.25)>.01) throw new Error('Segment drag failed');
        envelopePoints.set(audioTrack,[{time:0,value:.25},{time:timelineDurationSeconds,value:.25}]);
        envelopePoints.set(videoTrack,[{time:0,value:.4},{time:timelineDurationSeconds,value:.4}]);
        await renderTimelineAt(0);
        const actualAudio=timelineAudioPool.get(clips.find(c=>c.dataset.kind==='audio'));
        const actualVideo=videoPool.get(clips.find(c=>c.dataset.kind==='video'));
        if(Math.abs(actualAudio.volume-.25)>.001 || Math.abs(Number(actualVideo.style.opacity)-.4)>.001) throw new Error('Envelope output failed');
        console.log('Envelope insertion, point drag, segment drag, volume=0.25 and opacity=0.4 OK');
        timelineTime = 0;
        $('#playButton').click();
        await new Promise(resolve => setTimeout(resolve, 4000));
        const video = [...videoPool.values()].find(media => !media.paused);
        const result = {name:${JSON.stringify(name)}, durations:clips.map(clip=>clip.dataset.durationSeconds), timelineTime, videoTime:video?.currentTime, players:[...videoPool.values()].map(m=>({paused:m.paused,ready:m.readyState,time:m.currentTime,error:m.error?.message})), error:playbackError, head:$('#timelinePlayhead').style.left};
        stopTimelinePlayback();
        if (result.error || !(result.videoTime > 0) || !(timelineTime > 0)) throw new Error(JSON.stringify(result));
        const originalVideo=clips.find(c=>c.dataset.kind==='video');
        const incoming=createTimelineClip(originalVideo.parentElement,{name:'Transition test',kind:'video',durationSeconds:10,filePath:${JSON.stringify(filePath)}},100/timelineDurationSeconds);
        selectedTransitionPair={from:originalVideo,to:incoming};
        if(!applyTransition('wipeRight')) throw new Error('Transition application failed');
        await renderTimelineAt(2);
        await new Promise(resolve=>setTimeout(resolve,1500));
        await renderTimelineAt(2);
        const compositor=transitionRenderers.get(originalVideo.parentElement);
        if(!compositor || compositor.canvas.style.display!=='block')throw new Error('Video transition compositor not active');
        result.transition='wipeRight rendered over real MP4';
        if(!applyTransition('lumaMask'))throw new Error('Custom mask application failed');
        $('#maskSoftness').value='30';$('#maskSoftness').dispatchEvent(new Event('input'));
        $('#maskInvert').checked=true;$('#maskInvert').dispatchEvent(new Event('change'));
        $('#maskMotion').value='zoomIn';$('#maskMotion').dispatchEvent(new Event('change'));
        $('#maskBlur').value='8';$('#maskBlur').dispatchEvent(new Event('input'));
        await renderTimelineAt(2);
        const maskState=transitionMasks.get(incoming);
        if(maskState.softness!==.3 || !maskState.invert || compositor.canvas.style.display!=='block')throw new Error('Custom mask settings/composition failed');
        if(maskState.motion!=='zoomIn'||maskState.blur!==8||videoPool.get(incoming).style.opacity!=='0')throw new Error('Motion/blur settings or unwanted crossfade');
        $('.transition-card[data-transition="lumaMask"]').click();
        if(!maskControls.open || $('#maskSoftness').value!=='30'||!$('#maskInvert').checked)throw new Error('Reopening mask configuration lost settings');
        if($('#maskMotion').value!=='zoomIn'||$('#maskBlur').value!=='8')throw new Error('Reopening lost motion/blur');
        $('#closeMaskDialog').click();
        if(maskControls.open || incoming.dataset.transition!=='lumaMask')throw new Error('Closing removed transition');
        result.mask='luminance mask rendered with softness=0.3, invert=true';
        return result;
      })()`);
      console.log(JSON.stringify(result));
    }
    app.exit(0);
  } catch(error) { console.error(error); app.exit(1); }
});
