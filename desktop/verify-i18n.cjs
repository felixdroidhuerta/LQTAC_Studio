// Interface language: dictionaries complete, live switch without reload (project kept), number templates, user content
// untouched, alert/confirm translated, exact return to Spanish, remembered after reload.
// Usage: desktop\node_modules\.bin\electron.cmd desktop\verify-i18n.cjs
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(app.getPath('temp'),'lqtac-i18n-test-'+process.pid);app.setPath('userData',path.join(root,'profile'));
require('./main.cjs');
app.whenReady().then(async()=>{const timeout=setTimeout(()=>app.exit(1),180000);timeout.unref();try{
  // Every dictionary parses and has the same keys.
  const dicts={};global.LQTACI18n={add:(l,d)=>dicts[l]=d};for(const l of ['en','fr','zh','ja'])require(path.join(__dirname,'..','dist','assets','i18n',l+'.js'));
  const keys=Object.keys(dicts.en).sort();for(const l of ['fr','zh','ja'])assert.deepEqual(Object.keys(dicts[l]).sort(),keys,l+' has the same keys as en');
  for(const l of Object.keys(dicts))for(const [k,v] of Object.entries(dicts[l])){const ph=s=>(s.match(/\{\d+\}/g)||[]).sort().join();assert.equal(ph(v),ph(k),l+' placeholders: '+k);}
  console.log('Dictionaries',Object.keys(dicts).join(','),keys.length,'keys each');
  const win=BrowserWindow.getAllWindows()[0];if(win.webContents.isLoading())await new Promise(r=>win.webContents.once('did-finish-load',r));const js=c=>win.webContents.executeJavaScript(c,true);await js('demoReady');
  const snapshot=`JSON.stringify({menus:$$('.menu-item').map(b=>b.innerText.trim()),export:document.querySelector('.top-actions .solid-btn')?.innerText.trim(),count:$('#mediaCount').innerText,clips:timelineClips().map(c=>c.firstChild?.textContent),project:$('#projectName').innerText,title:$('#timelineSettingsButton').getAttributeNode('title').value,code:$('#timelineSettingsButton').title,headCode:toolsMenu.querySelector('.menu-heading').textContent,tools:[...toolsMenu.querySelectorAll('.menu-heading')].map(h=>h.innerText),lang:document.documentElement.lang})`;
  const es=JSON.parse(await js(snapshot));
  for(const code of ['en','fr','zh','ja']){
    await js(`LQTACAppOptions.set('language','${code}')`);const t=JSON.parse(await js(snapshot)),d=dicts[code];
    assert.deepEqual(t.menus,es.menus.map(m=>d[m]??m),code+' menus');assert.equal(t.title,d[es.title]??es.title,code+' tooltip');assert.deepEqual(t.tools,es.tools.map(h=>d[h]??h),code+' menu headings');
    const n=es.count.match(/\d+/)[0];assert.equal(t.count,d['{0} elementos'].replace('{0}',n),code+' number template');
    assert.deepEqual(t.clips,es.clips,code+' clip names untouched');assert.equal(t.project,es.project,code+' project name untouched');assert.equal(t.lang,code);assert.equal(t.code,es.title,code+' code still reads Spanish titles');assert.equal(t.headCode,es.headCode,code+' code still reads Spanish text');
    console.log(code,JSON.stringify(t.menus));
  }
  // Text set later by scripts is translated too (toast, check-marked menu entries).
  const live=JSON.parse(await js(`(async()=>{toast('Caché de audio procesado');await new Promise(r=>setTimeout(r,50));const toastText=[...document.querySelectorAll('.toast,[class*=toast]')].map(n=>n.innerText).find(x=>x)||'';
    $$('.menu-item').find(b=>b.dataset&&b.getAttribute('aria-controls')==='viewMenu').click();await new Promise(r=>setTimeout(r,30));const mark=[...viewMenu.querySelectorAll('[data-view=snap]')].map(b=>b.innerText)[0];studioCloseMenus();return JSON.stringify({toastText,mark});})()`));
  console.log(JSON.stringify(live));assert(dicts.ja['Caché de audio procesado'],'key present');assert(live.toastText.includes(dicts.ja['Caché de audio procesado']),'toast translated');
  assert(live.mark.startsWith('✓ ')&&live.mark!=='✓ Imán','check-marked entry translated: '+live.mark);
  assert.equal(await js("LQTACI18n.t('Evento seleccionado · Mi toma 3.wav')"),'選択中のクリップ · Mi toma 3.wav','free-text template keeps the name');assert.equal(await js("LQTACI18n.t('toma.wav · 12.5 s · inicio 3 s')"),'toma.wav · 12.5 秒 · 開始 3 秒','free text plus numbers');
  // Main process: language reported by the window, native dialog options translated, IPC error prefix and 'Prefijo: detalle'.
  const main=require('./i18n-main.cjs');await new Promise(r=>setTimeout(r,100));assert.equal(main.language,'ja','main process follows the window');assert.equal(main.t('Guardar proyecto'),dicts.ja['Guardar proyecto']);assert.equal(require('electron').dialog.__lqtacI18n,true,'dialogs wrapped');
  assert.equal(main.t("Error invoking remote method 'x': Error: Guardar proyecto"),dicts.ja['Guardar proyecto'],'IPC prefix removed');
  // Back to Spanish: exactly the original texts.
  await js(`LQTACAppOptions.set('language','es')`);assert.deepEqual(JSON.parse(await js(snapshot)),es,'Spanish restored exactly');
  // Remembered after reload.
  await js(`LQTACAppOptions.set('language','fr')`);win.webContents.reload();await new Promise(r=>win.webContents.once('did-finish-load',r));await js('demoReady');await new Promise(r=>setTimeout(r,300));
  assert.equal(JSON.parse(await js(snapshot)).menus[0],dicts.fr[es.menus[0]],'French after reload');
  const missing=JSON.parse(await js(`JSON.stringify([...LQTACI18n.missing])`));console.log('Untranslated strings seen so far:',missing.length);fs.writeFileSync(path.join(root,'missing-fr.json'),JSON.stringify(missing,null,1));
  await js(`LQTACAppOptions.set('language','es')`);
  console.log('I18N VERIFICATION PASSED',root);app.exit(0);
}catch(error){console.error(error);app.exit(1);}});
