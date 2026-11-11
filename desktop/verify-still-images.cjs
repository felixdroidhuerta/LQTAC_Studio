const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
const run = require('node:util').promisify(require('node:child_process').execFile);
const root = path.join(app.getPath('temp'), 'cinema-stills-' + process.pid);
const pack = process.argv[2] ? path.join(path.resolve(process.argv[2]), 'resources', 'app', 'desktop') : __dirname;
app.setPath('userData', path.join(root, 'profile'));
require(path.join(pack, 'main.cjs'));
app.whenReady().then(async () => {
  setTimeout(() => app.exit(1), 90000).unref();
  try {
    await fs.mkdir(root, { recursive: true });
    const engine = require(path.join(pack, 'render-engine.cjs'));
    const io = require(path.join(pack, 'project-io.cjs'));
    const ffmpeg = engine.ffmpegPath();
    const image = path.join(root, 'foto roja.png'), tiff = path.join(root, 'foto verde.tiff');
    for (const [file, color] of [[image, 'red'], [tiff, 'green']]) {
      await run(ffmpeg, ['-v','error','-y','-f','lavfi','-i',`color=${color}:size=160x90`,'-frames:v','1',file], { windowsHide: true });
    }
    const win = BrowserWindow.getAllWindows()[0];
    win.webContents.setBackgroundThrottling(false);
    if (win.webContents.isLoading()) await new Promise(resolve => win.webContents.once('did-finish-load', resolve));
    const js = code => win.webContents.executeJavaScript(code, true);
    await js('demoReady');
    await js("restoreProject({format:'LQTAC Studio',version:1,name:'Imágenes',library:[],tracks:[{id:'V1',kind:'video',role:'video',envelope:[],clips:[]},{id:'A1',kind:'audio',envelope:[],clips:[]}]})");
    const point = await js("(()=>{const r=$('.track[data-kind=video]').getBoundingClientRect();return {x:Math.round(r.left+80),y:Math.round(r.top+r.height/2)};})()");
    win.webContents.debugger.attach('1.3');
    const drop = async file => {
      for (const type of ['dragEnter','dragOver','drop']) await win.webContents.debugger.sendCommand('Input.dispatchDragEvent', { type, ...point, data:{items:[],files:[file],dragOperationsMask:1} });
    };
    async function waitFor(code) {
      for (let i=0; i<100; i++) { if(await js(code))return; await new Promise(resolve=>setTimeout(resolve,50)); }
      throw Error('No se cumplió: '+code);
    }
    await drop(image);
    await waitFor('timelineClips().length===1');
    let project = await js('projectSnapshot()');
    assert.equal(project.library.length,1);
    assert.equal(project.tracks[0].clips[0].durationSeconds,5);
    assert.equal(project.tracks[1].clips.length,0);
    const start=project.tracks[0].clips[0].startSeconds;
    await js(`renderTimelineAt(${start+1})`);
    const png=Buffer.from(await js(`captureProjectFrame(${start+1},640,360)`),'base64');
    const pixel=nativeImage.createFromBuffer(png).toBitmap().subarray((180*640+320)*4,(180*640+320)*4+4);
    assert(pixel[2]>200&&pixel[1]<30&&pixel[0]<30,'El fotograma debe mostrar la imagen roja');
    await js(`(async()=>{await renderTimelineAt(${start+1});await startTimelinePlayback()})()`);
    await waitFor(`timelineTime>${start+1.1}`);
    await js('stopTimelinePlayback()');
    const edge=await js("(()=>{const r=timelineClips()[0].getBoundingClientRect();return {x:Math.floor(r.right-2),y:Math.round(r.top+r.height/2)};})()");
    await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mousePressed',...edge,button:'left',buttons:1,clickCount:1});
    await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseMoved',x:edge.x+30,y:edge.y,button:'left',buttons:1});
    await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseReleased',x:edge.x+30,y:edge.y,button:'left',buttons:0,clickCount:1});
    await waitFor('timelineClips().length===1&&clipTiming(timelineClips()[0]).durationSeconds>5.2');
    await js("openPanCropEditor(timelineClips()[0]);void 0");
    await waitFor('panCropSession?.video.readyState===4');
    await js('panCropDialog.close()');
    const card = await js("(()=>{const r=$('.media-card').getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()");
    const end = {x:point.x+120,y:point.y};
    await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mousePressed',...card,button:'left',buttons:1,clickCount:1});
    await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseMoved',...end,button:'left',buttons:1});
    await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseReleased',...end,button:'left',buttons:0,clickCount:1});
    await waitFor('timelineClips().length===2');
    assert.equal((await js('projectSnapshot()')).library.length,1);
    await drop(tiff);
    await waitFor('timelineClips().length===3');
    project=await js('projectSnapshot()');
    assert.equal(project.library.length,2);
    assert.equal(project.tracks[1].clips.length,0);
    const lqts=path.join(root,'Imágenes.LQTS');
    await io.saveProject(lqts,project);
    const restored=await io.openProject(lqts);
    assert.equal(restored.project.library.length,2);
    assert.equal(restored.project.tracks[0].clips.length,3);
    await js(`restoreProject(${JSON.stringify(restored.project)})`);
    const output=path.join(root,'imagen.mp4');
    const job=await engine.startRender({project:restored.project,profile:'mp4',width:640,height:360,fps:10,output,range:{start,end:start+.2}});
    await js('exportSize={width:640,height:360}');
    for(let i=0;i<2;i++)await job.frame(await js(`captureProjectFrame(${start+i/10},640,360)`));
    await job.finish();
    const rendered=path.join(root,'fotograma.png');
    await run(ffmpeg,['-v','error','-i',output,'-frames:v','1',rendered],{windowsHide:true});
    const renderedPixel=nativeImage.createFromPath(rendered).toBitmap().subarray((180*640+320)*4,(180*640+320)*4+4);
    assert(Math.max(...renderedPixel.subarray(0,3))>100,'El MP4 debe contener la imagen');
    console.log('Arrastre de archivos locales y biblioteca, PNG/TIFF, sin duplicados ni audio, reproducción, duración ajustable, Pan/Crop, LQTS y render MP4 verificados.');
    app.exit(0);
  } catch (error) { console.error(error.stack);app.exit(1); }
});
