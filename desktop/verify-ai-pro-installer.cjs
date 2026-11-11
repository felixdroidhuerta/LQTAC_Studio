// Offline test of the IA pro installer with a simulated GitHub release (node verify-ai-pro-installer.cjs).
const fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {createAiProService}=require('./ai-pro-service.cjs');
(async()=>{
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'lqtac-ai-pro-'));const src=path.join(root,'src');
  await fsp.mkdir(path.join(src,'bin'),{recursive:true});await fsp.writeFile(path.join(src,'bin','lqtac-ai-pro.exe'),'dummy');
  await fsp.writeFile(path.join(src,'ai-pro.json'),JSON.stringify({name:'LQTAC IA pro',version:'1.0.0',engine:'test',entry:'bin/lqtac-ai-pro.exe'}));
  const zip=path.join(root,'pkg.zip');execFileSync(path.join(process.env.SystemRoot||'C:\\Windows','System32','tar.exe'),['-a','-cf',zip,'-C',src,'ai-pro.json','bin'],{windowsHide:true});
  const bytes=await fsp.readFile(zip),sha=crypto.createHash('sha256').update(bytes).digest('hex');
  const install=path.join(root,'portable');await fsp.mkdir(install);
  const make=({badHash=false,release=true,minAppVersion='0.19.0'}={})=>async url=>{
    const json=v=>({ok:true,status:200,json:async()=>v});
    if(url.includes('/releases?'))return json(release?[{tag_name:'v0.19.2-portable',draft:false,prerelease:false,assets:[]},{tag_name:'ai-pro-v1.0.0',draft:false,prerelease:false,assets:[{name:'ai-pro-manifest.json',size:200,browser_download_url:'https://github.com/x/manifest'},{name:'pkg.zip',size:bytes.length,browser_download_url:'https://github.com/x/pkg.zip'}]}]:[]);
    if(url.endsWith('/manifest'))return json({version:'1.0.0',package:'pkg.zip',size:bytes.length,sha256:badHash?'0'.repeat(64):sha,minAppVersion,engine:'test'});
    if(url.endsWith('/pkg.zip'))return {ok:true,status:200,body:new Blob([bytes]).stream()};
    throw Error('unexpected '+url);
  };
  let s=createAiProService({root:install,appVersion:'0.20.0',fetchImpl:make({release:false})});
  assert.equal(s.status().installed,false);assert.equal((await s.check()).available,false);console.log('No release published → not available OK');
  s=createAiProService({root:install,appVersion:'0.20.0',fetchImpl:make({minAppVersion:'0.21.0'})});
  await assert.rejects(s.install(),/necesita Cinema Studio 0.21.0/);console.log('Incompatible app version rejected OK');
  s=createAiProService({root:install,appVersion:'0.20.0',fetchImpl:make({badHash:true})});
  await assert.rejects(s.install(),/SHA-256/);assert.equal(s.status().installed,false);assert(!fs.existsSync(path.join(install,'ai-pro.download.zip')));console.log('Wrong SHA-256 rejected and cleaned OK');
  s=createAiProService({root:install,appVersion:'0.20.0',fetchImpl:make()});const phases=[];
  const st=await s.install(p=>phases.push(p.phase));assert.equal(st.installed,true);assert.equal(st.version,'1.0.0');assert(phases.includes('download')&&phases.at(-1)==='done');console.log('Download, verify, extract and activate OK');
  assert.equal((await s.install()).installed,true);console.log('Reinstall over existing module OK');
  const evil=createAiProService({root:path.join(root,'other'),appVersion:'0.20.0',fetchImpl:async url=>{const r=await make()(url);if(url.includes('/releases?')){const list=await r.json();list[1].assets[1].browser_download_url='https://evil.example/pkg.zip';return {ok:true,json:async()=>list};}return r;}});
  await fsp.mkdir(path.join(root,'other'));await assert.rejects(evil.install(),/Origen de descarga no permitido/);console.log('Download outside GitHub rejected OK');
  assert.equal((await s.uninstall()).installed,false);assert(!fs.existsSync(path.join(install,'ai-pro')));console.log('Uninstall OK');
  await fsp.rm(root,{recursive:true,force:true});console.log('IA pro installer verification OK');
})().catch(error=>{console.error(error);process.exit(1);});
