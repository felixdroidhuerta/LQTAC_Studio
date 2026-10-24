const path=require('node:path'),fs=require('node:fs'),{execFile}=require('node:child_process'),{promisify}=require('node:util');
const run=promisify(execFile);
function projectArgument(argv){return argv.find(value=>typeof value==='string'&&path.isAbsolute(value)&&/\.lqts$/i.test(value));}
function integrationConfig({packaged,executable=process.execPath}){
  const branded=path.join(__dirname,'node_modules','electron','dist','LQTAC Studio.exe');
  return {executable:packaged?executable:fs.existsSync(branded)?branded:executable,appDirectory:packaged?null:__dirname,icon:path.join(__dirname,'assets','lqtac-studio.ico')};
}
async function ensureAssociation(config){
  if(process.platform!=='win32')return {registered:false,unsupported:true};
  const {stdout}=await run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'windows-association.ps1')],{windowsHide:true,timeout:20000,maxBuffer:1024*1024,env:{...process.env,LQTAC_ASSOC_CONFIG:JSON.stringify(config)}});
  return JSON.parse(stdout.trim().replace(/^\uFEFF/,''));
}
module.exports={projectArgument,integrationConfig,ensureAssociation};
