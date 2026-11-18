// Installed content packs: userData/packs/<id>/{manifest.json,install.json,files/...} plus packs/state.json (disabled ids).
// Only packs whose signature verifies with a trusted key are installed (see pack-format.cjs and pack-keys.cjs).
const fs=require('node:fs/promises'),path=require('node:path');
const format=require('./pack-format.cjs');
const MIME={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg'};

function createPacksStore({directory,appVersion,trustedKeys}){
  const stateFile=path.join(directory,'state.json');
  const packDir=id=>{if(!format.ID.test(id||''))throw Error('Paquete no válido');return path.join(directory,id);};
  async function readJson(file,fallback){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return fallback;throw error;}}
  async function state(){const s=await readJson(stateFile,{disabled:[]});return {disabled:Array.isArray(s.disabled)?s.disabled.filter(id=>format.ID.test(id)):[]};}
  async function writeState(s){await fs.mkdir(directory,{recursive:true});const tmp=stateFile+'.'+process.pid+'.tmp';await fs.writeFile(tmp,JSON.stringify(s));await fs.rename(tmp,stateFile);}
  async function list(){
    let names=[];try{names=await fs.readdir(directory,{withFileTypes:true});}catch(error){if(error.code==='ENOENT')return [];throw error;}
    const {disabled}=await state(),result=[];
    for(const entry of names){
      if(!entry.isDirectory()||!format.ID.test(entry.name))continue;
      try{const manifest=await readJson(path.join(directory,entry.name,'manifest.json'),null),install=await readJson(path.join(directory,entry.name,'install.json'),{});if(!manifest||manifest.id!==entry.name)continue;
        result.push({id:manifest.id,name:manifest.name,version:manifest.version,author:manifest.author,description:manifest.description||'',cover:manifest.cover||null,signer:install.signer||null,installedAt:install.installedAt||null,enabled:!disabled.includes(manifest.id),manifest});}catch{}
    }
    return result.sort((a,b)=>a.name.localeCompare(b.name,'es'));
  }
  // Verifies first, then writes to a temporary folder and swaps it in, so a failed install never leaves half a pack.
  async function inspect(filePath){
    if(typeof filePath!=='string'||!path.isAbsolute(filePath)||!/\.lqpack$/i.test(filePath))throw Error('Elige un archivo .lqpack');
    const stat=await fs.stat(filePath);if(stat.size>format.LIMITS.total*1.4+format.LIMITS.manifest)throw Error('Archivo de paquete demasiado grande');
    const verified=format.verify(await fs.readFile(filePath),{trustedKeys,appVersion});
    const current=(await list()).find(p=>p.id===verified.manifest.id);
    return {verified,current,comparison:current?format.compareVersions(verified.manifest.version,current.version):null};
  }
  async function install(filePath,{allowDowngrade=false}={}){
    const {verified,current,comparison}=await inspect(filePath),{manifest,files,signer,summary}=verified;
    if(current&&comparison<0&&!allowDowngrade)throw Error('Ya tienes instalada una versión más nueva de «'+manifest.name+'» ('+current.version+')');
    await fs.mkdir(directory,{recursive:true});
    const target=packDir(manifest.id),tmp=path.join(directory,'.install-'+manifest.id+'-'+process.pid+'-'+Date.now()),old=tmp+'-old';
    try{
      for(const [p,bytes] of Object.entries(files)){const file=path.join(tmp,'files',...p.split('/'));await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes);}
      await fs.writeFile(path.join(tmp,'manifest.json'),JSON.stringify(manifest));
      await fs.writeFile(path.join(tmp,'install.json'),JSON.stringify({signer,installedAt:new Date().toISOString(),source:path.basename(filePath)}));
      let moved=false;try{await fs.rename(target,old);moved=true;}catch(error){if(error.code!=='ENOENT')throw error;}
      try{await fs.rename(tmp,target);}catch(error){if(moved)await fs.rename(old,target).catch(()=>{});throw error;}
      if(moved)await fs.rm(old,{recursive:true,force:true});
    }finally{await fs.rm(tmp,{recursive:true,force:true}).catch(()=>{});}
    const s=await state();if(s.disabled.includes(manifest.id)){s.disabled=s.disabled.filter(id=>id!==manifest.id);await writeState(s);}
    return {id:manifest.id,name:manifest.name,version:manifest.version,previousVersion:current?.version||null,summary,signer};
  }
  async function remove(id){const dir=packDir(id);await fs.access(path.join(dir,'manifest.json'));await fs.rm(dir,{recursive:true,force:true});const s=await state();if(s.disabled.includes(id)){s.disabled=s.disabled.filter(x=>x!==id);await writeState(s);}return true;}
  async function setEnabled(id,enabled){packDir(id);const s=await state();s.disabled=s.disabled.filter(x=>x!==id);if(!enabled)s.disabled.push(id);await writeState(s);return true;}
  // Returns a data: URL for one file of an installed pack (images are small; data URLs keep canvases untainted for export).
  async function asset(id,file){
    if(typeof file!=='string'||!format.FILE.test(file)||file.split('/').some(s=>s==='.'||s==='..'))throw Error('Archivo de paquete no válido');
    const root=path.join(packDir(id),'files'),full=path.resolve(root,...file.split('/'));if(!full.startsWith(path.resolve(root)+path.sep))throw Error('Archivo de paquete no válido');
    const bytes=await fs.readFile(full);return 'data:'+MIME[file.split('.').pop().toLowerCase()]+';base64,'+bytes.toString('base64');
  }
  return {list,inspect,install,remove,setEnabled,asset,directory};
}
module.exports={createPacksStore};
