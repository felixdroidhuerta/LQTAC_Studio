const path = require('node:path');
const fs = require('node:fs');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow, dialog, ipcMain, desktopCapturer, nativeImage } = require('electron');
const { parseVegasProject } = require('./veg-parser.cjs');
const execFileAsync = promisify(execFile);
const crypto = require('node:crypto');
const projectIO = require('./project-io.cjs');
const renderEngine = require('./render-engine.cjs');
const windowsIntegration=require('./windows-integration.cjs');
const shellEntry=app.isPackaged||[__dirname,path.join(__dirname,'main.cjs'),windowsIntegration.applicationDirectory()].includes(path.resolve(process.argv[1]||'.'));
app.setName('LQTAC Studio');
if(process.platform==='win32')app.setAppUserModelId('LQTAC.Studio');
const ownsInstance=!shellEntry||app.requestSingleInstanceLock();
if(!ownsInstance)app.quit();
let associationTask=null;
function ensureWindowsIntegration(){
  if(!shellEntry||process.platform!=='win32')return Promise.resolve();
  if(associationTask)return associationTask;
  associationTask=windowsIntegration.ensureAssociation(windowsIntegration.integrationConfig({packaged:app.isPackaged})).catch(error=>{console.warn('No se pudo registrar LQTS en Windows:',error.message);}).finally(()=>{associationTask=null;});return associationTask;
}
const audioEffects=require('./effects-audio.cjs');
const reverseMedia=require('./reverse-media.cjs');
const mediaVisuals=require('./media-visuals.cjs');
const visualsDirectory=()=>path.join(app.getPath('userData'),'timeline-visuals');
ipcMain.handle('timeline-frame',(event,options)=>{recordingSender(event);return mediaVisuals.frame(options,visualsDirectory());});
ipcMain.handle('timeline-waveform',(event,options)=>{recordingSender(event);return mediaVisuals.waveform(options,visualsDirectory());});
ipcMain.handle('cancel-timeline-visual',(event,id)=>{recordingSender(event);mediaVisuals.cancelRequest(id);});
app.on('before-quit',()=>mediaVisuals.cancel());
const reverseDirectory=()=>path.join(app.getPath('userData'),'reverse-cache');
ipcMain.handle('prepare-reverse',(event,options)=>{recordingSender(event);return reverseMedia.prepare(options,reverseDirectory(),progress=>{if(!event.sender.isDestroyed())event.sender.send('reverse-progress',progress);});});
ipcMain.handle('cancel-reverse',event=>{recordingSender(event);reverseMedia.cancel();});
ipcMain.handle('prepare-audio-effects',async(_event,filePath,fx,segment)=>{if(segment?.reverse){filePath=await reverseMedia.prepare({filePath,kind:'audio',offset:segment.offset,duration:segment.duration*segment.rate},reverseDirectory());segment={...segment,offset:0,reverse:false};}return audioEffects.prepare(filePath,fx,path.join(app.getPath('userData'),'effects-cache'),segment);});
ipcMain.handle('cancel-audio-effects',()=>{audioEffects.cancel();reverseMedia.cancel();});
ipcMain.handle('audio-effects-waveform',(_event,filePath,segment)=>{const root=path.resolve(app.getPath('userData'),'effects-cache')+path.sep;if(typeof filePath!=='string'||!path.resolve(filePath).startsWith(root))return [];return audioEffects.waveform(filePath,segment);});
app.on('before-quit',()=>audioEffects.cancel());
app.on('before-quit',()=>reverseMedia.cancel());
let currentProjectPath = null;
ipcMain.handle('confirm-new-project',async()=>{
  const result=await dialog.showMessageBox(mainWindow,{type:'question',title:'Nuevo proyecto',message:'¿Guardar el proyecto actual antes de crear uno nuevo?',detail:'Si continúas sin guardar, se perderán los cambios actuales.',buttons:['Guardar','No guardar','Cancelar'],defaultId:0,cancelId:2,noLink:true});
  return ['save','discard','cancel'][result.response]||'cancel';
});
ipcMain.handle('reset-project-path',()=>{currentProjectPath=null;mainWindow.setTitle('Proyecto sin título — LQTAC Studio');});
let exportJob = null;
const startupVegas=process.argv.find(value=>/\.veg$/i.test(value));
const startupProject=windowsIntegration.projectArgument(process.argv);
if(process.argv.includes('--review-vegas'))app.setPath('userData',path.join(app.getPath('temp'),'lqtac-vegas-review-'+process.pid));

ipcMain.handle('save-lqts', async (_event, data, saveAs) => {
  projectIO.validateProject(data);
  let filePath=currentProjectPath;
  if(!filePath || saveAs) {
    const result=await dialog.showSaveDialog(mainWindow,{title:'Guardar proyecto LQTAC Studio',defaultPath:filePath || String(data.name||'Proyecto').replace(/[<>:"/\\|?*]/g,'_')+'.LQTS',filters:[{name:'Proyecto LQTAC Studio',extensions:['LQTS']}]});
    if(result.canceled || !result.filePath)return {canceled:true};
    filePath=result.filePath;if(!/\.lqts$/i.test(filePath))filePath+='.LQTS';
  }
  await projectIO.saveProject(filePath,data);currentProjectPath=filePath;
  mainWindow.setTitle(path.basename(filePath)+' — LQTAC Studio');
  return {canceled:false,filePath};
});
ipcMain.handle('open-lqts',async()=>{
  const result=await dialog.showOpenDialog(mainWindow,{title:'Abrir proyecto LQTAC Studio',properties:['openFile'],filters:[{name:'Proyecto LQTAC Studio',extensions:['lqts']}]});
  if(result.canceled || !result.filePaths[0])return {canceled:true};
  await ensureWindowsIntegration();
  const filePath=result.filePaths[0],loaded=await projectIO.openProject(filePath);
  currentProjectPath=filePath;return {canceled:false,filePath,...loaded};
});
ipcMain.handle('render-start',async(event,options)=>{
  if(exportJob)throw new Error('Ya hay una exportación en curso.');
  if(audioRecording.active()||cameraRecording.active()||recordingDestinationOpen)throw new Error('Detén y guarda la toma antes de exportar.');
  const preset=renderEngine.presets[options.profile];if(!preset)throw new Error('Formato no válido.');
  const result=await dialog.showSaveDialog(mainWindow,{title:'Renderizar proyecto actual',defaultPath:String(options.project.name||'Proyecto').replace(/[<>:"/\\|?*]/g,'_')+'.'+options.profile,filters:[{name:preset.label,extensions:[options.profile]}]});
  if(result.canceled || !result.filePath)return {canceled:true};
  let output=result.filePath;if(path.extname(output).toLowerCase()!=='.'+options.profile)output+='.'+options.profile;
  const job=await renderEngine.startRender({...options,output,effectsDirectory:path.join(app.getPath('userData'),'effects-cache')},progress=>{if(!event.sender.isDestroyed())event.sender.send('render-progress',progress);});
  exportJob=job;
  return {canceled:false,video:job.video,duration:job.duration,output};
});
ipcMain.handle('render-frame',async(_event,base64)=>{if(!exportJob)throw new Error('No hay exportación activa.');await exportJob.frame(base64);});
ipcMain.handle('render-finish',async()=>{if(!exportJob)throw new Error('No hay exportación activa.');const job=exportJob;try{return await job.finish();}finally{if(exportJob===job)exportJob=null;}});
ipcMain.handle('render-cancel',()=>{audioEffects.cancel();reverseMedia.cancel();const job=exportJob;if(job){job.cancel();job.done.finally(()=>{if(exportJob===job)exportJob=null;}).catch(()=>{});}});
app.on('before-quit',()=>exportJob?.cancel());

let mainWindow;
let shellOpenQueue=Promise.resolve();
async function openShellProject(filePath,confirmReplacement=true){
  if(!mainWindow||mainWindow.isDestroyed())return false;
  if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();mainWindow.focus();
  if(mainWindow.webContents.isLoading())await new Promise(resolve=>mainWindow.webContents.once('did-finish-load',resolve));
  await mainWindow.webContents.executeJavaScript('demoReady');
  const canOpen=await mainWindow.webContents.executeJavaScript("!exporting&&!historyBusy&&!newProjectBusy&&!document.querySelector('dialog[open]')&&!modal.classList.contains('open')&&!compatModal.classList.contains('open')");
  if(!canOpen){await dialog.showMessageBox(mainWindow,{type:'info',message:'Cierra el editor o finaliza la tarea actual antes de abrir otro proyecto.'});return false;}
  const loaded=await projectIO.openProject(filePath);
  if(confirmReplacement){const decision=await dialog.showMessageBox(mainWindow,{type:'question',title:'Abrir proyecto LQTAC Studio',message:'¿Guardar el proyecto actual antes de abrir otro?',buttons:['Guardar','No guardar','Cancelar'],defaultId:0,cancelId:2,noLink:true});if(decision.response===2)return false;if(decision.response===0&&!await mainWindow.webContents.executeJavaScript('saveLqts()'))return false;}
  await mainWindow.webContents.executeJavaScript('(async()=>{await restoreProject('+JSON.stringify(loaded.project)+');resetEditHistory();clipClipboard=null;toast("Proyecto LQTS abierto");})()');
  currentProjectPath=filePath;mainWindow.setTitle(path.basename(filePath)+' — LQTAC Studio');await ensureWindowsIntegration();
  if(loaded.missing.length)await dialog.showMessageBox(mainWindow,{type:'warning',message:'Proyecto abierto con medios no encontrados',detail:loaded.missing.join('\n')});return true;
}
function queueShellProject(filePath,confirmReplacement=true){shellOpenQueue=shellOpenQueue.then(()=>app.whenReady()).then(()=>openShellProject(filePath,confirmReplacement)).catch(error=>{dialog.showErrorBox('No se pudo abrir el proyecto LQTS',error.message);});return shellOpenQueue;}
app.on('second-instance',(_event,argv)=>{if(mainWindow&&!mainWindow.isDestroyed()){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();mainWindow.focus();}const file=windowsIntegration.projectArgument(argv);if(file)void queueShellProject(file,true);});
const audioRecording=require('./audio-recording.cjs');
const cameraRecording=require('./capture-recording.cjs');
const captureToolbox=require('./capture-toolbox.cjs').createCaptureToolbox(()=>mainWindow);
function toolboxState(value){if(!value||typeof value!=='object'||JSON.stringify(value).length>150000)throw Error('Estado de captura no válido');return value;}
ipcMain.handle('capture-toolbox-show',(event,value)=>{recordingSender(event);return captureToolbox.show(toolboxState(value));});
ipcMain.handle('capture-toolbox-update',(event,value)=>{recordingSender(event);captureToolbox.update(toolboxState(value));});
ipcMain.handle('capture-toolbox-close',event=>{recordingSender(event);captureToolbox.close();});
const screenCapture=require('./screen-capture.cjs').createScreenCapture({desktopCapturer,getWindow:()=>mainWindow,expectedUrl:pathToFileURL(path.join(__dirname,'..','dist','index.html')).href});
ipcMain.handle('screen-capture-sources',event=>{recordingSender(event);return screenCapture.list();});
ipcMain.handle('screen-capture-select',(event,id,systemAudio)=>{recordingSender(event);screenCapture.select(id,systemAudio);});
ipcMain.handle('screen-capture-cancel',event=>{recordingSender(event);screenCapture.cancel();});
let recordingDestinationOpen=false;
function syncVisualPriority(){mediaVisuals.setSuspended(recordingDestinationOpen||audioRecording.active()||cameraRecording.active());}
function recordingSender(event){const expected=pathToFileURL(path.join(__dirname,'..','dist','index.html')).href;if(!mainWindow||mainWindow.isDestroyed()||event.sender.id!==mainWindow.webContents.id||event.senderFrame?.url?.split('#')[0]!==expected)throw Error('Origen de grabación no permitido');}
async function recordingDestination(){return dialog.showSaveDialog(mainWindow,{title:'Guardar nueva toma de micrófono (WAV)',defaultPath:path.join(currentProjectPath?path.dirname(currentProjectPath):app.getPath('documents'),'Grabacion_'+new Date().toISOString().replace(/[:.]/g,'-')+'.wav'),filters:[{name:'Audio WAV · PCM 24 bits · mono · 48 kHz',extensions:['wav']}]});}
ipcMain.handle('microphone-recording-start',async(event,sampleRate)=>{recordingSender(event);if(exportJob||audioRecording.active()||cameraRecording.active()||recordingDestinationOpen)throw Error('Hay una exportación o toma en curso');recordingDestinationOpen=true;syncVisualPriority();try{const r=await recordingDestination();if(r.canceled||!r.filePath)return {canceled:true};await mediaVisuals.quiesce();const file=/\.wav$/i.test(r.filePath)?r.filePath:r.filePath+'.wav';return {canceled:false,...await audioRecording.start(file,sampleRate)};}finally{recordingDestinationOpen=false;syncVisualPriority();}});
ipcMain.handle('microphone-recording-append',(event,id,data)=>{recordingSender(event);return audioRecording.append(id,data);});
ipcMain.handle('microphone-recording-finish',async(event,id,saveAs)=>{recordingSender(event);let file;if(saveAs){const r=await recordingDestination();if(r.canceled||!r.filePath)return {canceled:true};file=/\.wav$/i.test(r.filePath)?r.filePath:r.filePath+'.wav';}try{return {canceled:false,...await audioRecording.finish(id,file)};}finally{syncVisualPriority();}});
ipcMain.handle('microphone-recording-abort',async(event,id)=>{recordingSender(event);try{return await audioRecording.abort(id);}finally{syncVisualPriority();}});
let videoRecordingMode='camera';
async function cameraDestination(){const label=videoRecordingMode==='screen'?'Pantalla':'Camara';return dialog.showSaveDialog(mainWindow,{title:'Guardar nueva toma de '+(videoRecordingMode==='screen'?'pantalla':'cámara'),defaultPath:path.join(currentProjectPath?path.dirname(currentProjectPath):app.getPath('documents'),label+'_'+new Date().toISOString().replace(/[:.]/g,'-')+'.webm'),filters:[{name:'Vídeo WebM · VP8 / Opus',extensions:['webm']}]});}
ipcMain.handle('camera-recording-start',async(event,mode='camera',options={})=>{recordingSender(event);if(!['camera','screen'].includes(mode)||options&&typeof options!=='object')throw Error('Tipo de captura no válido');if(exportJob||audioRecording.active()||cameraRecording.active()||recordingDestinationOpen)throw Error('Hay una exportación o toma en curso');videoRecordingMode=mode;recordingDestinationOpen=true;syncVisualPriority();try{const r=await cameraDestination();if(r.canceled||!r.filePath)return {canceled:true};await mediaVisuals.quiesce();return {canceled:false,...await cameraRecording.start(/\.webm$/i.test(r.filePath)?r.filePath:r.filePath+'.webm',mode==='screen'&&options?.cameraSeparate===true)};}finally{recordingDestinationOpen=false;syncVisualPriority();}});
ipcMain.handle('camera-recording-append',(event,id,data)=>{recordingSender(event);return cameraRecording.append(id,data);});
ipcMain.handle('camera-recording-finish',async(event,id,saveAs)=>{recordingSender(event);let file;if(saveAs){const r=await cameraDestination();if(r.canceled||!r.filePath)return {canceled:true};file=/\.webm$/i.test(r.filePath)?r.filePath:r.filePath+'.webm';}try{return {canceled:false,...await cameraRecording.finish(id,file)};}finally{syncVisualPriority();}});
ipcMain.handle('camera-recording-abort',async(event,id)=>{recordingSender(event);try{return await cameraRecording.abort(id);}finally{syncVisualPriority();}});

const mediaExtensions = [
  'mp4', 'mov', 'mxf', 'avi', 'wmv', 'm4v', 'webm', 'mp3', 'wav', 'aiff',
  'aif', 'flac', 'm4a', 'aac', 'ogg', 'png', 'jpg', 'jpeg', 'tiff', 'bmp', 'webp'
];

// Material de demostración real para que el monitor pueda probar reproducción
// local sin depender de una importación manual en cada arranque.
const demoMedia = [
  {
    filePath: 'C:\\Users\\FELIXH~1\\OneDrive - ADSL HOUSE\\Octopus-LABO-FELIX-2\\loquetengoaquicolgado\\Rockstar\\Clips de video\\Woha completo.mp4',
    fileName: 'Woha completo.mp4',
    kind: 'video'
  },
  {
    filePath: 'C:\\Users\\FELIXH~1\\OneDrive - ADSL HOUSE\\Octopus-LABO-FELIX-2\\loquetengoaquicolgado\\Rockstar\\Clips de video\\Carrera.mp4',
    fileName: 'Carrera.mp4',
    kind: 'video'
  },
  {
    filePath: 'C:\\Users\\FELIXH~1\\OneDrive - ADSL HOUSE\\Octopus-LABO-FELIX-2\\loquetengoaquicolgado\\Rockstar\\RockStar.mp3',
    fileName: 'RockStar.mp3',
    kind: 'audio'
  },
  {
    filePath: 'C:\\Users\\FELIXH~1\\OneDrive - ADSL HOUSE\\Octopus-LABO-FELIX-2\\loquetengoaquicolgado\\Rockstar\\Clip audio\\Woha.mp3',
    fileName: 'Woha.mp3',
    kind: 'audio'
  }
];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1540,
    height: 980,
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: '#061329',
    title: 'LQTAC Studio',
    icon:path.join(__dirname,'assets','lqtac-studio.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      backgroundThrottling: false,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const expected=pathToFileURL(path.join(__dirname,'..','dist','index.html')).href;
  let microphoneApproved=false,cameraApproved=false,closingRecording=false;
  const trusted=(contents,url)=>mainWindow&&!mainWindow.isDestroyed()&&contents?.id===mainWindow.webContents.id&&(url||contents.getURL()).split('#')[0]===expected;
  mainWindow.webContents.session.setDisplayMediaRequestHandler((request,callback)=>screenCapture.handle(request,callback));
  mainWindow.webContents.session.setPermissionCheckHandler((contents,permission,_origin,details)=>details.isMainFrame!==false&&trusted(contents,details.requestingUrl)&&(permission==='display-capture'?screenCapture.permitted(contents?.mainFrame):permission==='media'&&(details.mediaType==='audio'?microphoneApproved:details.mediaType==='video'?cameraApproved:false)));
  mainWindow.webContents.session.setPermissionRequestHandler(async(contents,permission,callback,details)=>{const types=details.mediaTypes;/* Electron 38 reports display requests as media with an empty mediaTypes array. */if(permission==='display-capture'||(permission==='media'&&Array.isArray(types)&&types.length===0)){callback(details.isMainFrame!==false&&trusted(contents,details.requestingUrl)&&screenCapture.permitted(contents?.mainFrame));return;}if(permission!=='media'||!trusted(contents,details.requestingUrl)||details.isMainFrame===false||!types?.length||types.some(t=>!['audio','video'].includes(t))){callback(false);return;}try{const mic=types.includes('audio'),camera=types.includes('video');if((mic&&!microphoneApproved)||(camera&&!cameraApproved)){const r=await dialog.showMessageBox(mainWindow,{type:'question',title:camera?'Permitir cámara':'Permitir micrófono',message:'¿Permitir a LQTAC Studio usar '+(camera?(mic?'la cámara y el micrófono':'la cámara'):'el micrófono')+'?',detail:'Solo se activan al preparar o grabar una toma local. No se envían imágenes ni audio a Internet. Cierra o desconecta el grabador para liberarlos.',buttons:['Permitir','No permitir'],defaultId:1,cancelId:1,noLink:true});if(r.response!==0){callback(false);return;}if(mic)microphoneApproved=true;if(camera)cameraApproved=true;}callback(true);}catch{callback(false);}});
  mainWindow.on('close',async event=>{if(!audioRecording.active()&&!cameraRecording.active())return;event.preventDefault();if(closingRecording)return;closingRecording=true;try{const r=await dialog.showMessageBox(mainWindow,{type:'warning',title:'Toma sin guardar',message:'Hay una grabación de cámara o micrófono en curso o pendiente.',detail:'Vuelve al grabador para detener y guardar. Salir descarta la toma pendiente.',buttons:['Volver al grabador','Descartar y salir'],defaultId:0,cancelId:0,noLink:true});if(r.response===1){await Promise.all([audioRecording.abort(),cameraRecording.abort()]);mainWindow.close();}}finally{closingRecording=false;}});
  const abortCaptures=()=>{mediaVisuals.cancel();captureToolbox.close();screenCapture.cancel();void Promise.all([audioRecording.abort(),cameraRecording.abort()]).catch(()=>{});};
  mainWindow.webContents.on('render-process-gone',abortCaptures);
  mainWindow.on('closed',abortCaptures);
  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

function projectFilters() {
  return [
    { name: 'Proyectos VEGAS', extensions: ['veg', 'vf'] },
    { name: 'Puente exportado desde VEGAS', extensions: ['json'] },
    { name: 'Proyectos Premiere', extensions: ['prproj'] },
    { name: 'Intercambio de timeline', extensions: ['xml', 'fcpxml', 'edl', 'srt', 'txt'] },
    { name: 'Todos los archivos', extensions: ['*'] }
  ];
}

ipcMain.handle('open-vegas-project', async (_event,requestedPath) => {
  if(requestedPath!==undefined&&(typeof requestedPath!=='string'||!path.isAbsolute(requestedPath)||!(/\.(veg|vf)$/i.test(requestedPath)||requestedPath.toLowerCase().endsWith('.lqtac.json'))))throw new Error('Ruta de proyecto no válida.');
  const result = requestedPath?{canceled:false,filePaths:[requestedPath]}:await dialog.showOpenDialog(mainWindow, {
    title: 'Abrir proyecto VEGAS en LQTAC Video',
    properties: ['openFile'],
    filters: projectFilters()
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };

  const filePath = result.filePaths[0];
  const ext = path.extname(filePath).slice(1).toLowerCase();
  if (ext === 'veg' || ext === 'vf') {
    const loaded=await require('./vegas-automation.cjs').openVegas(filePath);
    if(loaded.project)currentProjectPath=null;return {canceled:false,...loaded};
  }
  if(filePath.toLowerCase().endsWith('.lqtac.json')){const loaded=await require('./vegas-bridge.cjs').readBridge(filePath);if(loaded.project)currentProjectPath=null;return {canceled:false,...loaded};}
  return { canceled: false, project: { filePath, fileName: path.basename(filePath), format: ext.toUpperCase(), warnings: ['Este formato se ha seleccionado; el lector estructural VEGAS se centra en .VEG y .VF.'] } };
});

ipcMain.handle('open-media', async (event,kind) => {
  recordingSender(event);
  const groups={video:['mp4','mov','mxf','avi','wmv','m4v','webm'],audio:['mp3','wav','aiff','aif','flac','m4a','aac','ogg'],image:['png','jpg','jpeg','tiff','bmp','webp']};
  if(kind!==undefined&&!groups[kind])throw Error('Tipo de medio no válido');
  const extensions=groups[kind]||mediaExtensions;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: kind?'Insertar '+({video:'vídeo',audio:'audio',image:'imagen'}[kind])+' en la biblioteca':'Importar media a LQTAC Video',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: kind?{video:'Vídeos',audio:'Audios',image:'Imágenes'}[kind]:'Media compatible', extensions }
    ]
  });
  if (result.canceled) return { canceled: true, files: [] };
  return { canceled: false, files: result.filePaths.filter(file=>extensions.includes(path.extname(file).slice(1).toLowerCase())).map(filePath => ({ filePath, fileName: path.basename(filePath), extension: path.extname(filePath).slice(1).toLowerCase() })) };
});

ipcMain.handle('export-still',async(event,options)=>{
  recordingSender(event);
  if(!options||typeof options.base64!=='string'||options.base64.length>48*1024*1024||options.base64.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(options.base64))throw Error('Fotograma PNG no válido');
  const bytes=Buffer.from(options.base64,'base64');if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('El fotograma debe ser PNG');
  const image=nativeImage.createFromBuffer(bytes),size=image.getSize();if(image.isEmpty()||size.width>3840||size.height>2160)throw Error('Resolución de imagen no válida');
  const selected=await dialog.showSaveDialog(mainWindow,{title:'Exportar fotograma PNG sin pérdida',defaultPath:'Fotograma_'+Date.now()+'.png',filters:[{name:'PNG · sin pérdida',extensions:['png']}]});if(selected.canceled||!selected.filePath)return {canceled:true};const filePath=/\.png$/i.test(selected.filePath)?selected.filePath:selected.filePath+'.png';
  await fs.promises.writeFile(filePath,bytes,{flag:'wx'});return {canceled:false,filePath,...size};
});

ipcMain.handle('open-transition-mask', async () => {
  const root = app.isPackaged ? path.dirname(process.execPath) : path.join(__dirname, '..');
  const shapes = path.join(root, 'Shapes');
  await fs.promises.mkdir(shapes, { recursive: true });
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Elegir máscara de transición',
    defaultPath: shapes,
    properties: ['openFile'],
    filters: [{ name: 'Imágenes de máscara', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }]
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  const filePath = result.filePaths[0];
  const stat = await fs.promises.stat(filePath);
  if (stat.size > 20 * 1024 * 1024) throw new Error('Elige una imagen de hasta 20 MB');
  const bytes = await fs.promises.readFile(filePath);
  return { canceled: false, name: path.basename(filePath), base64: bytes.toString('base64') };
});

ipcMain.handle('read-file-text', async (_event, filePath) => {
  return fs.readFileSync(filePath, 'utf8');
});

ipcMain.handle('get-demo-media', async () => demoMedia.filter(item => fs.existsSync(item.filePath)));

ipcMain.handle('media-file-url', async (_event, filePath) => pathToFileURL(filePath).toString());

ipcMain.handle('save-transition-mask', async (_event, dataUrl) => {
  if (typeof dataUrl !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(dataUrl) || dataUrl.length > 24 * 1024 * 1024) throw new Error('Imagen de máscara no válida');
  const bytes = Buffer.from(dataUrl.split(',')[1], 'base64');
  if (bytes.subarray(0,8).toString('hex') !== '89504e470d0a1a0a') throw new Error('La máscara no es PNG');
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  const directory = path.join(app.getPath('userData'), 'transition-masks');
  await fs.promises.mkdir(directory, { recursive: true });
  const filePath = path.join(directory, hash + '.png');
  await fs.promises.writeFile(filePath, bytes);
  return { id: hash, filePath };
});

ipcMain.handle('media-duration', async (_event, filePath) => {
  if (!filePath || !fs.existsSync(filePath) || process.platform !== 'win32') return 0;
  const script = `
    $FilePath = $env:LQTAC_MEDIA_PATH
    $shell = New-Object -ComObject Shell.Application
    $folder = $shell.Namespace((Split-Path -Path $FilePath -Parent))
    $item = $folder.ParseName((Split-Path -Path $FilePath -Leaf))
    if ($null -eq $item) { exit 0 }
    $value = $folder.GetDetailsOf($item, 27)
    if ([string]::IsNullOrWhiteSpace($value)) { exit 0 }
    $parts = $value -split ':' | ForEach-Object { [double]$_ }
    if ($parts.Count -eq 3) { [Console]::WriteLine(($parts[0] * 3600) + ($parts[1] * 60) + $parts[2]) }
    elseif ($parts.Count -eq 2) { [Console]::WriteLine(($parts[0] * 60) + $parts[1]) }
  `;
  try {
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 15000, maxBuffer: 1024 * 1024, env: { ...process.env, LQTAC_MEDIA_PATH: filePath } });
    const duration = Number.parseFloat(stdout.trim());
    return Number.isFinite(duration) && duration > 0 ? duration : 0;
  } catch (error) {
    console.warn('No se pudo leer la duración nativa de media:', error.message);
    return 0;
  }
});

app.whenReady().then(async () => {
  if(!ownsInstance)return;
  createWindow();
  mainWindow.webContents.once('did-finish-load',()=>void ensureWindowsIntegration());
  if(startupProject)void queueShellProject(startupProject,false);
  else if(startupVegas){
    try{
      const loaded=await require('./vegas-automation.cjs').openVegas(startupVegas);
      if(loaded.report.errors.length)throw new Error(JSON.stringify(loaded.report.errors,null,2));
      if(mainWindow.webContents.isLoading())await new Promise(resolve=>mainWindow.webContents.once('did-finish-load',resolve));
      await mainWindow.webContents.executeJavaScript(`(async()=>{await demoReady;await restoreProject(${JSON.stringify(loaded.project)});resetEditHistory();toast('Montaje VEGAS importado · consulta el informe de compatibilidad');})()`);
      mainWindow.setTitle(path.basename(startupVegas)+' — LQTAC Studio 0.5.3');
    }catch(error){dialog.showErrorBox('No se pudo abrir el VEGAS',error.message);}
  }
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

const subtitlesService=require('./subtitles-service.cjs');
app.on('before-quit',()=>subtitlesService.cancel());
ipcMain.handle('subtitle-status',()=>subtitlesService.status());
ipcMain.handle('subtitle-transcribe',(event,options)=>subtitlesService.transcribe(options,p=>{if(!event.sender.isDestroyed())event.sender.send('subtitle-progress',p);}));
ipcMain.handle('subtitle-cancel',()=>subtitlesService.cancel());
ipcMain.handle('subtitle-import',async()=>{const r=await dialog.showOpenDialog(mainWindow,{title:'Importar subtítulos SRT',properties:['openFile'],filters:[{name:'Subtítulos',extensions:['srt']}]});if(r.canceled)return null;const p=r.filePaths[0];if((await fs.promises.stat(p)).size>8*1024*1024)throw Error('SRT demasiado grande');return require('../dist/assets/subtitle-model.js').parse(await fs.promises.readFile(p,'utf8'));});
ipcMain.handle('subtitle-export',async(_event,cues)=>{if(!Array.isArray(cues)||cues.length>10000)throw Error('Subtítulos no válidos');for(const c of cues){require('../dist/assets/subtitle-model.js').validate(c);if(!Number.isFinite(c.startSeconds)||c.startSeconds<0||!Number.isFinite(c.durationSeconds)||c.durationSeconds<=0||c.startSeconds+c.durationSeconds>604800)throw Error('Tiempo de subtítulo no válido');}const r=await dialog.showSaveDialog(mainWindow,{title:'Exportar subtítulos SRT',defaultPath:'Subtitulos.srt',filters:[{name:'Subtítulos',extensions:['srt']}]});if(r.canceled)return null;const p=/\.srt$/i.test(r.filePath)?r.filePath:r.filePath+'.srt';await fs.promises.writeFile(p,require('../dist/assets/subtitle-model.js').srt(cues),'utf8');return p;});
