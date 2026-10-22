const path = require('node:path');
const fs = require('node:fs');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { parseVegasProject } = require('./veg-parser.cjs');
const execFileAsync = promisify(execFile);
const crypto = require('node:crypto');
const projectIO = require('./project-io.cjs');
const renderEngine = require('./render-engine.cjs');
let currentProjectPath = null;
let exportJob = null;
const startupVegas=process.argv.find(value=>/\.veg$/i.test(value));
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
  const filePath=result.filePaths[0],loaded=await projectIO.openProject(filePath);
  currentProjectPath=filePath;return {canceled:false,filePath,...loaded};
});
ipcMain.handle('render-start',async(event,options)=>{
  if(exportJob)throw new Error('Ya hay una exportación en curso.');
  const preset=renderEngine.presets[options.profile];if(!preset)throw new Error('Formato no válido.');
  const result=await dialog.showSaveDialog(mainWindow,{title:'Renderizar proyecto actual',defaultPath:String(options.project.name||'Proyecto').replace(/[<>:"/\\|?*]/g,'_')+'.'+options.profile,filters:[{name:preset.label,extensions:[options.profile]}]});
  if(result.canceled || !result.filePath)return {canceled:true};
  let output=result.filePath;if(path.extname(output).toLowerCase()!=='.'+options.profile)output+='.'+options.profile;
  const job=await renderEngine.startRender({...options,output},progress=>{if(!event.sender.isDestroyed())event.sender.send('render-progress',progress);});
  exportJob=job;
  return {canceled:false,video:job.video,duration:job.duration,output};
});
ipcMain.handle('render-frame',async(_event,base64)=>{if(!exportJob)throw new Error('No hay exportación activa.');await exportJob.frame(base64);});
ipcMain.handle('render-finish',async()=>{if(!exportJob)throw new Error('No hay exportación activa.');const job=exportJob;try{return await job.finish();}finally{if(exportJob===job)exportJob=null;}});
ipcMain.handle('render-cancel',()=>{const job=exportJob;if(job){job.cancel();job.done.finally(()=>{if(exportJob===job)exportJob=null;}).catch(()=>{});}});
app.on('before-quit',()=>exportJob?.cancel());

let mainWindow;

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
    title: 'LQTAC Video',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

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

ipcMain.handle('open-media', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Importar media a LQTAC Video',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Media compatible', extensions: mediaExtensions },
      { name: 'Todos los archivos', extensions: ['*'] }
    ]
  });
  if (result.canceled) return { canceled: true, files: [] };
  return { canceled: false, files: result.filePaths.map(filePath => ({ filePath, fileName: path.basename(filePath), extension: path.extname(filePath).slice(1).toLowerCase() })) };
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
  createWindow();
  if(startupVegas){
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
