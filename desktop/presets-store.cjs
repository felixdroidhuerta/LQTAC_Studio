// User effect presets: one JSON file in userData, plus .lqfx export/import. Content is validated again in the renderer.
const fs=require('node:fs/promises'),path=require('node:path');
const MAX_BYTES=8*1024*1024,MAX_PRESETS=2000;
function checkList(list){
  if(!Array.isArray(list)||list.length>MAX_PRESETS)throw Error('Lista de presets no válida');
  for(const p of list){if(!p||typeof p!=='object'||typeof p.name!=='string'||!p.name.trim()||p.name.length>80||!['video','audio'].includes(p.kind)||typeof p.key!=='string'||p.key.length>40||!p.values||typeof p.values!=='object')throw Error('Preset no válido');}
  const text=JSON.stringify({format:'Cinema Studio presets',version:1,presets:list});if(Buffer.byteLength(text)>MAX_BYTES)throw Error('Los presets superan 8 MB');return text;
}
function parse(text){const data=JSON.parse(String(text).replace(/^﻿/,''));if(data?.format!=='Cinema Studio presets'||!Array.isArray(data.presets))throw Error('El archivo no contiene presets de Cinema Studio');checkList(data.presets);return data.presets;}
function createPresetsStore({directory,dialog,getWindow}){
  const file=path.join(directory,'effects-presets.json');
  async function load(){try{return parse(await fs.readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return [];throw Error('No se pudieron leer tus presets: '+error.message);}}
  async function save(list){const text=checkList(list);await fs.mkdir(directory,{recursive:true});const temporary=file+'.'+process.pid+'.tmp';await fs.writeFile(temporary,text,'utf8');await fs.rename(temporary,file);return list.length;}
  async function exportPresets(list,suggested='Presets'){const text=checkList(list);const r=await dialog.showSaveDialog(getWindow(),{title:'Exportar presets',defaultPath:String(suggested).replace(/[\\/:*?"<>|]/g,'_').slice(0,60)+'.lqfx',filters:[{name:'Presets de Cinema Studio',extensions:['lqfx']}]});if(r.canceled||!r.filePath)return {canceled:true};const target=/\.lqfx$/i.test(r.filePath)?r.filePath:r.filePath+'.lqfx';await fs.writeFile(target,text,'utf8');return {canceled:false,filePath:target};}
  async function importPresets(){const r=await dialog.showOpenDialog(getWindow(),{title:'Importar presets',properties:['openFile'],filters:[{name:'Presets de Cinema Studio',extensions:['lqfx','json']}]});if(r.canceled||!r.filePaths[0])return {canceled:true};const stat=await fs.stat(r.filePaths[0]);if(stat.size>MAX_BYTES)throw Error('El archivo supera 8 MB');return {canceled:false,presets:parse(await fs.readFile(r.filePaths[0],'utf8'))};}
  return {load,save,exportPresets,importPresets,file};
}
module.exports={createPresetsStore,parse,checkList};
