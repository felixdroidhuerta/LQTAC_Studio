// Offline test of the Qbit installer with a simulated GitHub release split in parts (node desktop/verify-qbit-installer.cjs).
const fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {createQbitService}=require('./qbit-service.cjs');
(async()=>{
 const root=await fsp.mkdtemp(path.join(os.tmpdir(),'lqtac-qbit-inst-'));const src=path.join(root,'src');
 await fsp.mkdir(path.join(src,'runtime'),{recursive:true});await fsp.mkdir(path.join(src,'models'),{recursive:true});
 await fsp.writeFile(path.join(src,'runtime','llama-server.exe'),'dummy');await fsp.writeFile(path.join(src,'models','m.gguf'),crypto.randomBytes(300000));
 await fsp.writeFile(path.join(src,'qbit.json'),JSON.stringify({version:'1.0.0',engine:'test',runtime:'runtime/llama-server.exe',model:'models/m.gguf'}));
 const zip=path.join(root,'pkg.zip');execFileSync(path.join(process.env.SystemRoot||'C:\\Windows','System32','tar.exe'),['-a','-cf',zip,'-C',src,'qbit.json','runtime','models'],{windowsHide:true});
 const bytes=await fsp.readFile(zip),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
 const cut=Math.floor(bytes.length/2),parts=[bytes.subarray(0,cut),bytes.subarray(cut)];
 const install=path.join(root,'portable');await fsp.mkdir(install);
 const make=({badPart=false,release=true,minAppVersion='0.26.0',missing=false,host='github.com'}={})=>async url=>{
  const json=v=>({ok:true,status:200,json:async()=>v});
  const assets=[{name:'qbit-manifest.json',size:300,browser_download_url:'https://github.com/x/qbit-manifest.json'},...parts.map((p,i)=>({name:'p'+i,size:p.length,browser_download_url:`https://${host}/x/p${i}`}))];
  if(url.includes('/releases?'))return json(release?[{tag_name:'v0.26.0-portable',draft:false,prerelease:false,assets:[]},{tag_name:'qbit-v1.0.0',draft:false,prerelease:false,assets:missing?assets.slice(0,2):assets}]:[]);
  if(url.endsWith('/qbit-manifest.json'))return json({version:'1.0.0',minAppVersion,engine:'test',size:bytes.length,sha256:sha(bytes),parts:parts.map((p,i)=>({name:'p'+i,size:p.length,sha256:badPart&&i===1?'0'.repeat(64):sha(p)}))});
  const m=url.match(/\/p(\d)$/);if(m)return {ok:true,status:200,body:new Blob([parts[Number(m[1])]]).stream()};
  throw Error('inesperado '+url);
 };
 const service=opts=>createQbitService({root:install,bridge:{},appVersion:'0.26.0',httpImpl:make(opts)});
 let s=service({release:false});assert.equal(s.status().installed,false);assert.equal((await s.check()).available,false);console.log('✓ sin publicación: no disponible');
 await assert.rejects(service({minAppVersion:'0.27.0'}).install(),/necesita Cinema Studio 0.27.0/);console.log('✓ versión del programa insuficiente rechazada');
 await assert.rejects(service({missing:true}).install(),/no contiene p1/);console.log('✓ falta una parte: rechazado');
 await assert.rejects(service({badPart:true}).install(),/SHA-256 de p1/);assert.equal(s.status().installed,false);assert(!fs.existsSync(path.join(install,'qbit.download.zip')));console.log('✓ parte alterada: descartado y limpiado');
 await assert.rejects(service({host:'evil.example'}).install(),/Origen de descarga no permitido/);console.log('✓ descarga fuera de GitHub rechazada');
 s=service();const phases=[];let last=0;
 const st=await s.install(p=>{phases.push(p.phase);if(p.phase==='download')last=p.received/p.total;});
 assert.equal(st.installed,true);assert.equal(st.version,'1.0.0');assert.equal(last,1);assert.equal(phases.at(-1),'done');
 assert.deepEqual(await fsp.readFile(path.join(install,'qbit','models','m.gguf')),await fsp.readFile(path.join(src,'models','m.gguf')));console.log('✓ descarga por partes, verificación, extracción y activación');
 assert.equal((await s.install()).installed,true);console.log('✓ reinstalar sobre lo existente');
 assert.equal((await s.uninstall()).installed,false);assert(!fs.existsSync(path.join(install,'qbit')));console.log('✓ desinstalar');
 await fsp.rm(root,{recursive:true,force:true});console.log('\nInstalador de Qbit correcto');
})().catch(e=>{console.error('✗',e);process.exit(1);});
