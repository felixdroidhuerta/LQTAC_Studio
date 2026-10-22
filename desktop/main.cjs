const path = require('node:path');
const fs = require('node:fs');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { parseVegasProject } = require('./veg-parser.cjs');
const execFileAsync = promisify(execFile);

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
    { name: 'Proyectos Premiere', extensions: ['prproj'] },
    { name: 'Intercambio de timeline', extensions: ['xml', 'fcpxml', 'edl', 'srt', 'txt'] },
    { name: 'Todos los archivos', extensions: ['*'] }
  ];
}

ipcMain.handle('open-vegas-project', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Abrir proyecto VEGAS en LQTAC Video',
    properties: ['openFile'],
    filters: projectFilters()
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };

  const filePath = result.filePaths[0];
  const ext = path.extname(filePath).slice(1).toLowerCase();
  if (ext === 'veg' || ext === 'vf') return { canceled: false, project: parseVegasProject(filePath) };
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

ipcMain.handle('read-file-text', async (_event, filePath) => {
  return fs.readFileSync(filePath, 'utf8');
});

ipcMain.handle('get-demo-media', async () => demoMedia.filter(item => fs.existsSync(item.filePath)));

ipcMain.handle('media-file-url', async (_event, filePath) => pathToFileURL(filePath).toString());

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

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
