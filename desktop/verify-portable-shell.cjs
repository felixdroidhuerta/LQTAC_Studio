// Launch the real renamed Electron executable with a portable-layout app, rather than simulating argv.
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=path.join(os.tmpdir(),'lqtac-real-portable-shell-'+process.pid),runtime=path.join(__dirname,'node_modules','electron','dist');
async function waitFile(file,child){for(let i=0;i<600;i++){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch{}if(child.exitCode!==null&&child.exitCode!==0)throw Error('Portable exited early: '+child.exitCode);await new Promise(r=>setTimeout(r,50));}throw Error('Portable startup timed out');}
function stubAssociation(){require('./windows-integration.cjs').ensureAssociation=async config=>{require('node:fs').writeFileSync(require('node:path').join(process.env.LQTAC_FIXTURE,'registration.json'),JSON.stringify(config));return {registered:true};};}
function observePortable(){
  if(!ownsInstance)return;
  dialog.showMessageBox=async()=>({response:1});
  app.whenReady().then(async()=>{
    mainWindow.hide();
    if(mainWindow.webContents.isLoading())await new Promise(r=>mainWindow.webContents.once('did-finish-load',r));
    await mainWindow.webContents.executeJavaScript('demoReady');
    const stop=setTimeout(()=>app.exit(2),30000);
    const poll=setInterval(async()=>{
      try{
        const name=await mainWindow.webContents.executeJavaScript("$('#projectName').textContent");
        if(name==='Inicial real')fs.writeFileSync(path.join(process.env.LQTAC_FIXTURE,'ready.json'),JSON.stringify({name,argv:process.argv,config:windowsIntegration.integrationConfig({packaged:app.isPackaged}),isPackaged:app.isPackaged}));
        if(name==='Segundo real'){clearInterval(poll);clearTimeout(stop);fs.writeFileSync(path.join(process.env.LQTAC_FIXTURE,'done.json'),JSON.stringify({name,windows:BrowserWindow.getAllWindows().length}));app.exit(0);}
      }catch(error){console.error(error);app.exit(3);}
    },100);
  });
}
(async()=>{let firstProcess,secondProcess;try{
  const engine=path.join(root,'engine'),application=path.join(engine,'resources','app'),desktop=path.join(application,'desktop');await fs.mkdir(desktop,{recursive:true});
  for(const entry of await fs.readdir(runtime,{withFileTypes:true})){if(['resources','lqtac-icon.sha256'].includes(entry.name))continue;await fs.cp(path.join(runtime,entry.name),path.join(engine,entry.name),{recursive:true});}
  await fs.mkdir(path.join(engine,'resources'),{recursive:true});await fs.copyFile(path.join(runtime,'resources','default_app.asar'),path.join(engine,'resources','default_app.asar'));
  for(const name of await fs.readdir(__dirname)){if(name.endsWith('.cjs')&&!name.startsWith('verify-'))await fs.copyFile(path.join(__dirname,name),path.join(desktop,name));}
  await fs.cp(path.join(__dirname,'assets'),path.join(desktop,'assets'),{recursive:true});await fs.cp(path.join(__dirname,'..','dist'),path.join(application,'dist'),{recursive:true});
  await fs.writeFile(path.join(application,'package.json'),JSON.stringify({name:'lqtac-portable-shell-fixture',version:'0.14.0',main:'desktop/main.cjs'}));
  const main=await fs.readFile(path.join(desktop,'main.cjs'),'utf8');await fs.writeFile(path.join(desktop,'main.cjs'),'('+stubAssociation.toString()+')();\n'+main+'\n('+observePortable.toString()+')();');
  const first=path.join(root,'Proyecto inicial á.LQTS'),second=path.join(root,'Segundo proyecto.LQTS');for(const [file,name] of [[first,'Inicial real'],[second,'Segundo real']])await fs.writeFile(file,JSON.stringify({format:'LQTAC Studio',version:1,name,tracks:[],library:[]}));
  const environment={...process.env,LQTAC_FIXTURE:root};delete environment.ELECTRON_RUN_AS_NODE;const exe=path.join(engine,'LQTAC Studio.exe'),profile='--user-data-dir='+path.join(root,'profile');let errors='';
  firstProcess=spawn(exe,[profile,application,first],{windowsHide:true,env:environment,stdio:['ignore','pipe','pipe']});firstProcess.stderr.on('data',d=>errors+=d);firstProcess.stdout.resume();
  const ready=await waitFile(path.join(root,'ready.json'),firstProcess);assert.equal(ready.name,'Inicial real');assert.equal(ready.config.executable,exe);assert.equal(ready.config.appDirectory,application);console.log('Actual portable executable cold-starts a Unicode/spaced LQTS with explicit app directory OK');
  secondProcess=spawn(exe,[profile,application,second],{windowsHide:true,env:environment,stdio:['ignore','ignore','pipe']});secondProcess.stderr.on('data',d=>errors+=d);
  const done=await waitFile(path.join(root,'done.json'),firstProcess);assert.equal(done.name,'Segundo real');assert.equal(done.windows,1);console.log('Actual second process forwards project into the existing portable window OK');
  const registration=JSON.parse(await fs.readFile(path.join(root,'registration.json'),'utf8'));assert.equal(registration.appDirectory,application);assert.equal(registration.executable,exe);console.log('Portable remains recognized for association repair and single-instance lock even with explicit app path OK');
  console.log('ALL REAL PORTABLE SHELL TESTS PASSED '+root);
}catch(error){console.error(error.stack);process.exitCode=1;}finally{if(firstProcess&&firstProcess.exitCode===null)firstProcess.kill();if(secondProcess&&secondProcess.exitCode===null)secondProcess.kill();}})();
