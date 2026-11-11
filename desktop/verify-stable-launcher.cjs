const {app}=require('electron');
const fs=require('node:fs/promises'),fsp=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFile}=require('node:child_process'),{promisify}=require('node:util');
const portable=process.argv[2]?path.resolve(process.argv[2]):null,runtimeDesktop=portable?path.join(portable,'resources','app','desktop'):__dirname;
const run=promisify(execFile),root=path.join(app.getPath('temp'),'cinema-stable-launcher-'+process.pid),documents=path.join(root,'Documents'),stableDir=path.join(documents,'Cinema Studio');
const source=path.join(runtimeDesktop,'assets','cinema-studio-stable.exe'),stable=path.join(stableDir,'Cinema Studio.exe');
const integration=require(path.join(runtimeDesktop,'windows-integration.cjs'));
const hash=file=>crypto.createHash('sha256').update(fsp.readFileSync(file)).digest('hex');
async function fixturePortable(name,version){const directory=path.join(documents,name),launcher=path.join(directory,'Cinema Studio.exe');await fs.mkdir(path.join(directory,'resources','app'),{recursive:true});await fs.writeFile(launcher,'fixture');await fs.writeFile(path.join(directory,'resources','app','package.json'),JSON.stringify({name:'lqtac-studio',productName:'Cinema Studio by LQTAC',version,main:'desktop/main.cjs'}));return launcher;}
async function resolve(){const output=path.join(root,'resolved-'+Date.now()+'.txt');await run(stable,['--resolve-file',output],{windowsHide:true,timeout:10000});return (await fs.readFile(output,'utf8')).trim();}
app.whenReady().then(async()=>{try{
 await fs.rm(root,{recursive:true,force:true});await fs.mkdir(stableDir,{recursive:true});await fs.copyFile(source,stable);
 const v191=await fixturePortable('Cinema_Studio_0.19.1_Windows_x64_Portable','0.19.1'),v192=await fixturePortable('Cinema_Studio_0.19.2_Windows_x64_Portable','0.19.2'),v200=await fixturePortable('Cinema_Studio_0.20.0_Windows_x64_Portable','0.20.0');
 await fs.writeFile(path.join(stableDir,'current-portable.txt'),v191);assert.equal((await fs.realpath(await resolve())).toLowerCase(),(await fs.realpath(v200)).toLowerCase());
 const renamed=await fixturePortable('Cinema Studio Experimental','0.21.0');await fs.writeFile(path.join(stableDir,'current-portable.txt'),renamed);assert.equal((await fs.realpath(await resolve())).toLowerCase(),(await fs.realpath(renamed)).toLowerCase());
 await fs.rm(renamed);assert.equal((await fs.realpath(await resolve())).toLowerCase(),(await fs.realpath(v200)).toLowerCase());
 const copied=integration.ensureStableLauncher({documentsPath:documents,executable:v192});assert.equal(copied,stable);assert.equal(hash(copied),hash(source));assert.equal((await fs.readFile(path.join(stableDir,'current-portable.txt'),'utf8')).trim(),v192);
 const details=integration.taskbarDetails({executable:v192,appDirectory:path.dirname(v192),icon:path.join(runtimeDesktop,'assets','lqtac-studio.ico'),stableLauncher:copied});assert.equal(details.appId,'LQTAC.CinemaStudio');assert.equal(details.relaunchCommand,'"'+stable+'"');assert(!details.relaunchCommand.includes('0.19.2'));
 console.log(`PASS ${portable?'portable':'source'} stable launcher chooses newest version, supports renamed pointer fallback, self-updates and supplies version-independent taskbar command. ${root}`);app.exit(0);
 }catch(error){console.error(error.stack);app.exit(1);}});
