const { app, BrowserWindow } = require('electron');
app.setPath('userData', require('node:path').join(app.getPath('temp'), 'lqtac-playback-verification'));
require('./main.cjs');
app.whenReady().then(async () => {
  try {
    const win = BrowserWindow.getAllWindows()[0];
    if (win.webContents.isLoading()) await new Promise(resolve => win.webContents.once('did-finish-load', resolve));
    await win.webContents.executeJavaScript('new Promise(resolve => setTimeout(resolve, 5000))');
    console.log(await win.webContents.executeJavaScript(`(() => {
      const audio=addTimelineTrack('audio'),video=addTimelineTrack('video');
      if($('.clip',audio)||$('.clip',video)) throw new Error('New tracks must be empty');
      if(!$('.envelope-layer',audio).dataset.functional||!audio.dataset.dropBound) throw new Error('Track bindings missing');
      const originalWidth=$('#tracks').getBoundingClientRect().width;
      updateTimelineViewport(4,.2);
      if($('#tracks').getBoundingClientRect().width < originalWidth*3 || timelineBody.scrollLeft<=0) throw new Error('Zoom or scroll failed');
      updateTimelineViewport(1,0);
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
        return result;
      })()`);
      console.log(JSON.stringify(result));
    }
    app.exit(0);
  } catch(error) { console.error(error); app.exit(1); }
});
