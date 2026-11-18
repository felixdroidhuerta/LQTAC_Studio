const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {commitOutput}=require('./render-engine.cjs');

async function main(){
  const root=await fs.promises.mkdtemp(path.join(os.tmpdir(),'lqtac-render-commit-'));
  const rename=fs.promises.rename;
  try {
    const destination=path.join(root,'Dulce Navidad.mp4');
    let temporary=path.join(root,'.render-1.mp4');
    await fs.promises.writeFile(destination,'OLD');
    await fs.promises.writeFile(temporary,'NEW');
    let attempts=0;
    fs.promises.rename=async(from,to)=>{
      if(to===destination&&attempts++<2)throw Object.assign(new Error('locked'),{code:'EPERM'});
      return rename(from,to);
    };
    assert.equal(await commitOutput(temporary,destination),destination);
    assert.equal(await fs.promises.readFile(destination,'utf8'),'NEW');
    assert.equal(attempts,3);

    temporary=path.join(root,'.render-2.mp4');
    await fs.promises.writeFile(temporary,'FINISHED');
    fs.promises.rename=async(from,to)=>{
      if(to===destination)throw Object.assign(new Error('locked'),{code:'EPERM'});
      return rename(from,to);
    };
    const alternative=await commitOutput(temporary,destination);
    assert.notEqual(alternative,destination);
    assert.match(path.basename(alternative),/^Dulce Navidad - render [a-f0-9]{8}\.mp4$/);
    assert.equal(await fs.promises.readFile(destination,'utf8'),'NEW');
    assert.equal(await fs.promises.readFile(alternative,'utf8'),'FINISHED');
    assert.equal(fs.existsSync(temporary),false);

    temporary=path.join(root,'.render-3.mp4');
    await fs.promises.writeFile(temporary,'PRESERVE');
    fs.promises.rename=async()=>{throw Object.assign(new Error('disk error'),{code:'EIO'});};
    await assert.rejects(commitOutput(temporary,destination),/disk error/);
    assert.equal(await fs.promises.readFile(temporary,'utf8'),'PRESERVE');
    console.log('RENDER COMMIT VERIFIED: transient lock, occupied destination, failed rename preserves output');
  }finally{fs.promises.rename=rename;await fs.promises.rm(root,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
