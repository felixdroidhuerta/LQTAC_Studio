// Verifies the chroma zone ("IA rápida") and the IA pro UI state.
// Usage: electron verify-chroma-zone.cjs  (env LQTAC_TEST_PERSON = image with a full-body person; not included in Git)
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(app.getPath('temp'),'lqtac-chroma-zone-'+process.pid);app.setPath('userData',path.join(root,'profile'));
app.on('browser-window-created',(_e,win)=>win.webContents.setBackgroundThrottling(false));require('./main.cjs');
app.whenReady().then(async()=>{
  const timeout=setTimeout(()=>{console.error('Chroma zone verification timeout');app.exit(1);},180000);timeout.unref();
  try{
    const image=process.env.LQTAC_TEST_PERSON;assert(image,'Define LQTAC_TEST_PERSON');
    const dataUrl='data:image/jpeg;base64,'+(await fs.readFile(image)).toString('base64');
    const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));
    const js=code=>win.webContents.executeJavaScript(code);await js('demoReady');
    const result=await js(`(async()=>{
      const img=new Image();img.src=${JSON.stringify(dataUrl)};await img.decode();
      const source=document.createElement('canvas');source.width=img.naturalWidth;source.height=img.naturalHeight;source.getContext('2d').drawImage(img,0,0);
      const pick=(x,y)=>{const d=source.getContext('2d').getImageData(x,y,1,1).data;return '#'+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,'0')).join('');};
      const out={};const load={};
      for(const model of ['fast','detail']){const t=performance.now();await LQTACAiMatte.ensure(model);load[model]=Math.round(performance.now()-t);}
      out.load=load;out.delegate={fast:LQTACAiMatte.delegate('fast'),detail:LQTACAiMatte.delegate('detail')};
      const key=pick(${Number(process.env.LQTAC_KEY_X||500)},${Number(process.env.LQTAC_KEY_Y||400)});out.key=key;
      const alphaAt=(fx,points)=>{const c=LQTACVideoEffects.draw(source,{enabled:true,chroma:true,chromaColor:key,chromaTolerance:.18,chromaSoftness:.05,...fx},0),r=document.createElement('canvas');r.width=source.width;r.height=source.height;const x=r.getContext('2d');x.drawImage(c,0,0);return points.map(([px,py])=>x.getImageData(px,py,1,1).data[3]);};
      const inside=JSON.parse(${JSON.stringify(process.env.LQTAC_INSIDE||'[[500,400],[490,360]]')}),outside=JSON.parse(${JSON.stringify(process.env.LQTAC_OUTSIDE||'[[300,636],[700,636]]')});
      out.all=alphaAt({chromaZone:'all'},inside);
      for(const model of ['fast','detail']){
        const times=[];let a;for(let i=0;i<5;i++){const t=performance.now();a=alphaAt({chromaZone:'people',chromaMatteModel:model},inside);times.push(performance.now()-t);if(!LQTACVideoEffects.matteUsed)throw Error('Matte not used for '+model);}
        out[model]={inside:a,outside:alphaAt({chromaZone:'people',chromaMatteModel:model},outside),ms:Math.round(times.slice(1).reduce((s,v)=>s+v,0)/4)};
        const m=LQTACAiMatte.personMask(source,0,model),c=document.createElement('canvas');c.width=m.width;c.height=m.height;const id=c.getContext('2d').createImageData(m.width,m.height);for(let i=0;i<m.data.length;i++){id.data[i*4]=id.data[i*4+1]=id.data[i*4+2]=m.data[i];id.data[i*4+3]=255;}c.getContext('2d').putImageData(id,0,0);out[model].matte=c.toDataURL('image/png');
      }
      // Model validation of the new fields.
      LQTACEffects.validate({chromaZone:'people',chromaMatteModel:'detail',chromaProtect:.4,chromaMatteSoftness:.1},'video');
      let rejected=false;try{LQTACEffects.validate({chromaZone:'mask'},'video');}catch{rejected=true;}if(!rejected)throw Error('Invalid zone accepted');
      // UI: zone selector inside the chroma editor, IA pro shown as not installed with a download button.
      const clip=timelineClips().find(c=>c.dataset.kind==='video');out.ui=null;
      if(clip){openEffectEditor(clip,'chroma');await new Promise(r=>setTimeout(r,300));const box=$('#effectEditor .chroma-zone');out.ui={radios:box.querySelectorAll('input[name=chromaZone]').length,proDisabled:box.querySelector('input[value=pro]').disabled,download:!!box.querySelector('.cz-download'),badge:box.querySelector('.cz-pro-state').textContent.trim()};
        const installed=(await window.lqtacDesktop.aiProStatus()).installed;out.ui.installed=installed;
        if(installed){if(!/Instalada/.test(out.ui.badge)||out.ui.proDisabled)throw Error('Installed module not shown');}
        else{if(!out.ui.download)throw Error('Download button missing');box.querySelector('.cz-download').click();await new Promise(r=>setTimeout(r,4000));out.ui.dialog=$('#aiProInfo').textContent;$('#aiProClose').click();}
        effectEditor.close();}
      return out;
    })()`);
    for(const model of ['fast','detail']){await fs.writeFile(path.join(root,`matte-${model}.png`),Buffer.from(result[model].matte.split(',')[1],'base64'));delete result[model].matte;}
    console.log(JSON.stringify(result,null,1));console.log('Mattes written to '+root);
    assert(result.all.every(a=>a<40),'Zone all should key the subject colour');
    for(const model of ['fast','detail'])assert(result[model].inside.every(a=>a>200),`Zone people (${model}) should protect the subject`);
    console.log('Chroma zone verification OK');app.exit(0);
  }catch(error){console.error(error);app.exit(1);}
});
