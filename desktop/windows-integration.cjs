const path=require('node:path'),fs=require('node:fs'),{execFile}=require('node:child_process'),{promisify}=require('node:util');
const run=promisify(execFile);
const APP_ID='LQTAC.CinemaStudio';
function projectArgument(argv){return argv.find(value=>typeof value==='string'&&path.isAbsolute(value)&&/\.lqts$/i.test(value));}
function applicationDirectory(){
  const parent=path.resolve(__dirname,'..');
  try{if(JSON.parse(fs.readFileSync(path.join(parent,'package.json'),'utf8')).main==='desktop/main.cjs')return parent;}catch{}
  return __dirname;
}
function integrationConfig({packaged,executable=process.execPath}){
  const branded=path.join(__dirname,'node_modules','electron','dist','Cinema Studio.exe');
  const appDirectory=applicationDirectory(),bundled=appDirectory!==__dirname;
  const portableLauncher=path.resolve(appDirectory,'..','..','Cinema Studio.exe');
  // A renamed stock Electron binary still accepts an application path before file arguments.
  // Always pass that path, including in the portable; otherwise it may execute the LQTS as JS.
  return {executable:bundled&&fs.existsSync(portableLauncher)?portableLauncher:packaged?executable:fs.existsSync(branded)?branded:executable,appDirectory,icon:path.join(__dirname,'assets','lqtac-studio.ico')};
}
async function ensureAssociation(config){
  if(process.platform!=='win32')return {registered:false,unsupported:true};
  const {stdout}=await run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'windows-association.ps1')],{windowsHide:true,timeout:20000,maxBuffer:1024*1024,env:{...process.env,LQTAC_ASSOC_CONFIG:JSON.stringify(config)}});
  return JSON.parse(stdout.trim().replace(/^\uFEFF/,''));
}
function taskbarDetails(config){
  const quote=value=>'"'+value+'"';
  let icon=config.icon;
  if(config.iconCacheDirectory){const bytes=fs.readFileSync(icon),hash=require('node:crypto').createHash('sha256').update(bytes).digest('hex');fs.mkdirSync(config.iconCacheDirectory,{recursive:true});icon=path.join(config.iconCacheDirectory,'cinema-studio-'+hash+'.ico');if(!fs.existsSync(icon))fs.writeFileSync(icon,bytes);}
  const stable=config.stableLauncher&&fs.existsSync(config.stableLauncher)?config.stableLauncher:null;
  return {appId:APP_ID,appIconPath:icon,appIconIndex:0,
    relaunchDisplayName:'Cinema Studio by LQTAC',
    relaunchCommand:stable?quote(stable):quote(config.executable)+(config.appDirectory?' '+quote(config.appDirectory):'')};
}
function ensureStableLauncher(config){
  if(process.platform!=='win32'||!config?.documentsPath||!config?.executable||!fs.existsSync(config.executable))return null;
  const source=path.join(__dirname,'assets','cinema-studio-stable.exe');if(!fs.existsSync(source))throw Error('Falta el lanzador estable incluido en Cinema Studio.');
  const directory=path.join(config.documentsPath,'Cinema Studio'),target=path.join(directory,'Cinema Studio.exe'),pointer=path.join(directory,'current-portable.txt');
  fs.mkdirSync(directory,{recursive:true});
  const crypto=require('node:crypto'),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if(!fs.existsSync(target)||hash(target)!==hash(source))fs.copyFileSync(source,target);
  fs.writeFileSync(pointer,path.resolve(config.executable),'utf8');
  return target;
}
module.exports={projectArgument,applicationDirectory,integrationConfig,ensureAssociation,ensureStableLauncher,taskbarDetails,APP_ID};
