const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const {EventEmitter} = require('node:events');
const automation = require('./vegas-automation.cjs');
(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'lqtac-automation-test-'));
  try {
    const veg = path.join(root,'Montaje ü.veg');await fs.writeFile(veg,'synthetic');
    const fixture = {format:'LQTAC VEGAS bridge',version:1,project:{FilePath:veg},sourceSha256:crypto.createHash('sha256').update('synthetic').digest('hex'),video:{FrameRate:24,PixelAspectRatio:1,FieldOrder:'ProgressiveScan'},audio:{MasterBusMode:'Stereo'},readErrors:[],tracks:[]};
    let launches=0;
    const spawn = (exe,args,opts) => {
      launches++;assert.equal(exe,'fake.exe');assert.deepEqual(args.slice(0,3),['/NOLOGO','/OPEN',veg]);assert.equal(opts.windowsHide,true);
      const child=new EventEmitter();child.unref=()=>{};
      void (async()=>{
        const script=await fs.readFile(args[4],'utf8');
        assert(script.includes('StringComparison.OrdinalIgnoreCase'));assert(script.includes('exporter.Automated = true'));
        assert(await fs.readFile(args[4]+'.config','utf8'));
        const result=script.match(/exporter.OutputPath = @"([^"]+)"/)[1];
        const sidecar=veg+'.20990101.lqtac.json';await fs.writeFile(sidecar,JSON.stringify(fixture));await fs.writeFile(result,sidecar);
      })().catch(error=>child.emit('error',error));
      return child;
    };
    const options={executable:'fake.exe',spawn,timeoutMs:3000};
    assert.equal((await automation.openVegas(veg,options)).report.errors.length,0);
    await automation.openVegas(veg,options);assert.equal(launches,1,'Matching bridge must bypass VEGAS');
    await fs.appendFile(veg,'changed');fixture.sourceSha256=crypto.createHash('sha256').update('syntheticchanged').digest('hex');
    await automation.openVegas(veg,options);assert.equal(launches,2,'Stale bridge must regenerate');
    const failSpawn=()=>{const child=new EventEmitter();child.unref=()=>{};setImmediate(()=>child.emit('error',Error('Launch failed')));return child;};
    await assert.rejects(()=>automation.openVegas(veg,{...options,refresh:true,spawn:failSpawn}),/Launch failed/);
    const quietSpawn=()=>{const child=new EventEmitter();child.unref=()=>{};return child;};
    await assert.rejects(()=>automation.openVegas(veg,{...options,refresh:true,spawn:quietSpawn,timeoutMs:10}),/no ha completado/);
    await automation.openVegas(veg,options); // A failed conversion must release the lock.
    console.log('VEGAS automation: regeneration, cache, Unicode, launch failure, timeout and recovery OK');
  } finally {await fs.rm(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
