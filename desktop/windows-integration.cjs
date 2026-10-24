const path=require('node:path'),fs=require('node:fs'),{execFile}=require('node:child_process'),{promisify}=require('node:util');
const run=promisify(execFile);
function projectArgument(argv){return argv.find(value=>typeof value==='string'&&path.isAbsolute(value)&&/\.lqts$/i.test(value));}
function applicationDirectory(){
  const parent=path.resolve(__dirname,'..');
  try{if(JSON.parse(fs.readFileSync(path.join(parent,'package.json'),'utf8')).main==='desktop/main.cjs')return parent;}catch{}
  return __dirname;
}
function integrationConfig({packaged,executable=process.execPath}){
  const branded=path.join(__dirname,'node_modules','electron','dist','LQTAC Studio.exe');
  const appDirectory=applicationDirectory(),bundled=appDirectory!==__dirname;
  const portableLauncher=path.resolve(appDirectory,'..','..','LQTAC Studio.exe');
  // A renamed stock Electron binary still accepts an application path before file arguments.
  // Always pass that path, including in the portable; otherwise it may execute the LQTS as JS.
  return {executable:bundled&&fs.existsSync(portableLauncher)?portableLauncher:packaged?executable:fs.existsSync(branded)?branded:executable,appDirectory,icon:path.join(__dirname,'assets','lqtac-studio.ico')};
}
async function ensureAssociation(config){
  if(process.platform!=='win32')return {registered:false,unsupported:true};
  const {stdout}=await run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'windows-association.ps1')],{windowsHide:true,timeout:20000,maxBuffer:1024*1024,env:{...process.env,LQTAC_ASSOC_CONFIG:JSON.stringify(config)}});
  return JSON.parse(stdout.trim().replace(/^\uFEFF/,''));
}
module.exports={projectArgument,applicationDirectory,integrationConfig,ensureAssociation};
