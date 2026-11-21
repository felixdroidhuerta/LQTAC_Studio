// View and Options menus, monitor buttons (safe areas, preview quality, full screen), timeline settings (⚙),
// preferences, real save status and autosave. Preferences are per-user UI settings: never part of the project.
(function(){
const KEY='lqtac.prefs';
const choices={language:['es','en','fr','zh','ja'],theme:['dark','light'],autosave:[0,1,2,5,10,15],previewScale:[1,.5,.25],trackSize:['compact','normal','large'],timeFormat:['timecode','seconds']};
const defaults={language:'es',theme:'dark',snap:true,autosave:0,previewScale:1,safeAreas:false,trackSize:'normal',visuals:true,timeFormat:'timecode',follow:true};
const prefs={...defaults};
try{const stored=JSON.parse(localStorage.getItem(KEY)||'{}');for(const [k,v] of Object.entries(stored||{})){if(!(k in defaults))continue;if(choices[k]?choices[k].includes(v):typeof v===typeof defaults[k])prefs[k]=v;}}catch{}
function store(){try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch{}}
const qualityNames={1:'Completa',.5:'Media (½)',.25:'Borrador (¼)'};
const css=document.createElement('style');css.textContent=`
.monitor-head-actions button[aria-pressed=true]{color:var(--cyan)}
.safe-overlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;pointer-events:none;z-index:7}.safe-overlay.on{display:flex}
.safe-overlay .safe-frame{position:relative;aspect-ratio:16/9;max-width:100%;max-height:100%;width:100%}
.safe-overlay .safe-action,.safe-overlay .safe-title{position:absolute;border:1px dashed rgba(255,255,255,.75);box-shadow:0 0 0 1px rgba(0,0,0,.45)}.safe-overlay .safe-action{inset:5%}.safe-overlay .safe-title{inset:10%;border-color:rgba(255,214,102,.85)}
.safe-overlay .safe-cross{position:absolute;left:50%;top:50%;width:18px;height:18px;transform:translate(-50%,-50%);background:linear-gradient(rgba(255,255,255,.7),rgba(255,255,255,.7)) center/100% 1px no-repeat,linear-gradient(rgba(255,255,255,.7),rgba(255,255,255,.7)) center/1px 100% no-repeat}
.safe-overlay span{position:absolute;font-size:9px;color:#fff;text-shadow:0 1px 2px #000;left:calc(10% + 4px);top:calc(10% + 2px)}.safe-overlay span.action{left:calc(5% + 4px);top:calc(5% + 2px)}
.monitor:fullscreen{background:#030b18;padding:12px;display:flex;flex-direction:column}.monitor:fullscreen .monitor-screen{flex:1;height:auto}
#monitorQualityMenu{position:fixed;z-index:1200;min-width:190px}
body[data-track-size=compact] .track,body[data-track-size=compact] .track-label{height:46px}body[data-track-size=compact] .track .clip{top:4px;height:38px}
body[data-track-size=large] .track,body[data-track-size=large] .track-label{height:88px}body[data-track-size=large] .track .clip{top:16px;height:55px}body[data-track-size=large] .envelope-layer{top:15px}
#snapButton[aria-pressed=true]{color:var(--cyan);border-color:rgba(110,162,255,.45);background:rgba(110,162,255,.14)}
.snap-guide{position:absolute;top:0;bottom:0;width:0;border-left:1px solid #ffd166;box-shadow:0 0 4px #ffd166;z-index:20;pointer-events:none;display:none}
#prefsDialog{width:min(560px,94vw)}#prefsDialog fieldset{padding:4px 12px}#prefsDialog legend{font-size:11px;color:var(--muted)}#prefsDialog label:has(>input[type=checkbox]){justify-content:flex-start}
#prefsDialog select{width:190px}#cacheDialog code{word-break:break-all;font-size:10px}
`;document.head.append(css);

// ---------- Monitor ----------
const screen=$('.monitor-screen'),monitor=$('.monitor');
const overlay=document.createElement('div');overlay.className='safe-overlay';overlay.setAttribute('aria-hidden','true');overlay.innerHTML='<div class="safe-frame"><div class="safe-action"></div><div class="safe-title"></div><div class="safe-cross"></div><span class="action">Acción 90 %</span><span>Títulos 80 %</span></div>';screen.append(overlay);
const quality=document.createElement('div');quality.id='monitorQualityMenu';quality.className='clip-context-menu studio-menu';quality.setAttribute('role','menu');quality.setAttribute('aria-label','Calidad de la vista previa');
for(const v of choices.previewScale){const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitemradio');b.dataset.scale=String(v);b.onclick=()=>{set('previewScale',v);quality.classList.remove('open');};quality.append(b);}
document.body.append(quality);
function redraw(){try{if(typeof playing!=='undefined'&&!playing&&typeof renderTimelineAt==='function')void renderTimelineAt(timelineTime);}catch{}}
$('#monitorSafe').onclick=()=>set('safeAreas',!prefs.safeAreas);
$('#monitorQuality').onclick=event=>{event.stopPropagation();if(quality.classList.toggle('open')){const r=event.currentTarget.getBoundingClientRect();quality.style.left=Math.min(r.left,innerWidth-200)+'px';quality.style.top=r.bottom+4+'px';}};
document.addEventListener('click',event=>{if(!event.target.closest('#monitorQualityMenu,#monitorQuality'))quality.classList.remove('open');});
async function fullScreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await monitor.requestFullscreen();}catch(error){toast('No se pudo cambiar a pantalla completa: '+error.message);}}
$('#monitorFull').onclick=fullScreen;
document.addEventListener('fullscreenchange',()=>{$('#monitorFull').setAttribute('aria-pressed',String(document.fullscreenElement===monitor));requestAnimationFrame(redraw);});

// ---------- Timeline ----------
// Follow the playhead while playing: when it leaves the visible part, the view jumps one page forward.
setInterval(()=>{if(!prefs.follow||typeof playing==='undefined'||!playing)return;const body=$('.timeline-body'),head=$('#timelinePlayhead'),labels=$('#trackLabels');if(!body||!head)return;
  const view=body.getBoundingClientRect(),left=Math.max(view.left,labels?labels.getBoundingClientRect().right:view.left),right=view.left+body.clientWidth,x=head.getBoundingClientRect().left;
  if(x>right-24||x<left)body.scrollLeft=Math.max(0,body.scrollLeft+(x-left)-40);},200);

// ---------- Snap (imán) ----------
// While moving or trimming, the nearest clip edge, playhead, project start or render-range mark within 8 px pulls the edge onto it.
const guide=document.createElement('div');guide.className='snap-guide';$('#tracks').append(guide);
const SNAP_PX=8;
function snapTargets(exclude){const skip=new Set(exclude),out=[{time:0,kind:'inicio'}];
  for(const c of timelineClips()){if(skip.has(c))continue;const t=clipTiming(c);out.push({time:t.startSeconds,kind:'clip'},{time:t.startSeconds+t.durationSeconds,kind:'clip'});}
  if(Number.isFinite(timelineTime))out.push({time:timelineTime,kind:'cabezal'});
  const r=window.lqtacRenderRange;if(r){for(const k of ['start','end'])if(Number.isFinite(r[k]))out.push({time:r[k],kind:'marca'});}
  return out;}
function adjust(edges,delta,exclude,pxPerSecond,bypass){
  if(!prefs.snap||bypass||!edges.length||!(pxPerSecond>0)){clear();return delta;}
  const limit=SNAP_PX/pxPerSecond;let best=null;
  for(const target of snapTargets(exclude))for(const edge of edges){const d=target.time-(edge+delta);if(Math.abs(d)<=limit&&(!best||Math.abs(d)<Math.abs(best.d)))best={d,target};}
  if(!best){clear();return delta;}
  if(!guide.isConnected)$('#tracks').append(guide);guide.style.left=(best.target.time/timelineDurationSeconds*100)+'%';guide.style.display='block';guide.dataset.kind=best.target.kind;guide.dataset.time=String(best.target.time);
  return delta+best.d;}
function clear(){guide.style.display='none';delete guide.dataset.kind;}
window.LQTACSnap={adjust,clear,get enabled(){return prefs.snap;}};
$('#snapButton').onclick=()=>set('snap',!prefs.snap);

// ---------- Apply preferences ----------
function apply(){
  window.LQTACTheme?.set(prefs.theme);window.LQTACI18n?.set(prefs.language);
  $('#snapButton').setAttribute('aria-pressed',String(prefs.snap));{const s=$('#timelineStatusSnap');if(s)s.textContent='Imán: '+(prefs.snap?'activado':'desactivado');}
  window.LQTACPreviewScale=prefs.previewScale;window.LQTACTimeFormat=prefs.timeFormat;document.body.dataset.trackSize=prefs.trackSize;
  overlay.classList.toggle('on',prefs.safeAreas);$('#monitorSafe').setAttribute('aria-pressed',String(prefs.safeAreas));
  $('#monitorQuality').textContent=(prefs.previewScale===1?'Calidad':'Calidad '+(prefs.previewScale===.5?'½':'¼'))+' ▾';
  $$('button',quality).forEach(b=>{const on=Number(b.dataset.scale)===prefs.previewScale;b.setAttribute('aria-checked',String(on));b.textContent=(on?'✓ ':'   ')+qualityNames[b.dataset.scale];});
  window.LQTACTimelineVisuals?.setEnabled?.(prefs.visuals);
  try{if(typeof renderTimelineTime==='function')renderTimelineTime();}catch{}
  syncDialog();
}
function set(key,value){prefs[key]=value;store();apply();if(key==='previewScale')redraw();if(key==='autosave')scheduleCheck();}

// ---------- Preferences dialog (also the ⚙ timeline settings) ----------
const dialog=document.createElement('dialog');dialog.id='prefsDialog';dialog.className='work-dialog';document.body.append(dialog);
dialog.innerHTML=`<h2 id="prefsTitle">Preferencias</h2>
<fieldset data-section="general"><legend>Apariencia</legend><label>Idioma <select id="prefLanguage" data-i18n-skip><option value="es">Español</option><option value="en">English</option><option value="fr">Français</option><option value="zh">中文（简体）</option><option value="ja">日本語</option></select></label><label>Tema <select id="prefTheme"><option value="dark">Oscuro</option><option value="light">Claro (grises y azul claro)</option></select></label><p>El monitor de vídeo sigue oscuro en los dos temas, para juzgar bien la imagen.</p></fieldset>
<fieldset data-section="general"><legend>Guardado</legend><label>Autoguardado del proyecto <select id="prefAutosave"><option value="0">Desactivado</option><option value="1">Cada minuto</option><option value="2">Cada 2 minutos</option><option value="5">Cada 5 minutos</option><option value="10">Cada 10 minutos</option><option value="15">Cada 15 minutos</option></select></label><p>Guarda los cambios en el mismo archivo .LQTS cuando el proyecto ya tiene nombre (después del primer «Guardar»). No guarda mientras reproduces, exportas o tienes una ventana abierta.</p></fieldset>
<fieldset data-section="general"><legend>Monitor</legend><label>Calidad de la vista previa <select id="prefQuality"><option value="1">Completa</option><option value="0.5">Media (½)</option><option value="0.25">Borrador (¼)</option></select></label><label><input type="checkbox" id="prefSafe"> Mostrar las zonas seguras</label><p>La calidad solo afecta a los efectos de vídeo del monitor; la exportación siempre sale a calidad completa.</p></fieldset>
<fieldset data-section="timeline"><legend>Línea de tiempo</legend><label><input type="checkbox" id="prefSnap"> Imán: pegar clips a bordes, cabezal y marcas (Alt al arrastrar lo desactiva)</label><label>Altura de las pistas <select id="prefTrackSize"><option value="compact">Compacta</option><option value="normal">Normal</option><option value="large">Grande</option></select></label><label>Formato del tiempo <select id="prefTimeFormat"><option value="timecode">Timecode (hh:mm:ss:ff)</option><option value="seconds">Minutos y segundos (mm:ss.cc)</option></select></label><label><input type="checkbox" id="prefVisuals"> Miniaturas de vídeo y formas de onda en los clips</label><label><input type="checkbox" id="prefFollow"> Seguir el cabezal al reproducir</label><p>Sin miniaturas ni formas de onda la línea de tiempo va más ligera en proyectos largos.</p></fieldset>
<footer><button type="button" id="prefsReset">Restablecer valores</button><button type="button" id="prefsClose">Cerrar</button></footer>`;
function syncDialog(){$('#prefLanguage',dialog).value=prefs.language;$('#prefTheme',dialog).value=prefs.theme;$('#prefSnap',dialog).checked=prefs.snap;$('#prefAutosave',dialog).value=String(prefs.autosave);$('#prefQuality',dialog).value=String(prefs.previewScale);$('#prefSafe',dialog).checked=prefs.safeAreas;$('#prefTrackSize',dialog).value=prefs.trackSize;$('#prefTimeFormat',dialog).value=prefs.timeFormat;$('#prefVisuals',dialog).checked=prefs.visuals;$('#prefFollow',dialog).checked=prefs.follow;}
$('#prefLanguage',dialog).onchange=e=>set('language',e.target.value);$('#prefTheme',dialog).onchange=e=>set('theme',e.target.value);$('#prefAutosave',dialog).onchange=e=>set('autosave',Number(e.target.value));$('#prefQuality',dialog).onchange=e=>set('previewScale',Number(e.target.value));$('#prefSafe',dialog).onchange=e=>set('safeAreas',e.target.checked);
$('#prefTrackSize',dialog).onchange=e=>set('trackSize',e.target.value);$('#prefTimeFormat',dialog).onchange=e=>set('timeFormat',e.target.value);$('#prefVisuals',dialog).onchange=e=>set('visuals',e.target.checked);$('#prefFollow',dialog).onchange=e=>set('follow',e.target.checked);$('#prefSnap',dialog).onchange=e=>set('snap',e.target.checked);
$('#prefsClose',dialog).onclick=()=>dialog.close();
$('#prefsReset',dialog).onclick=()=>{const sections=$$('fieldset:not([hidden])',dialog).map(f=>f.dataset.section);const keys={general:['language','theme','autosave','previewScale','safeAreas'],timeline:['snap','trackSize','timeFormat','visuals','follow']};for(const s of new Set(sections))for(const k of keys[s])prefs[k]=defaults[k];store();apply();redraw();scheduleCheck();};
function openPrefs(section){if(dialog.open||exporting)return;$('#prefsTitle',dialog).textContent=section==='timeline'?'Ajustes de la línea de tiempo':'Preferencias';$$('fieldset',dialog).forEach(f=>f.hidden=!!section&&f.dataset.section!==section);syncDialog();dialog.showModal();}
$('#timelineSettingsButton').onclick=()=>openPrefs('timeline');
// Left rail: ⚙ opens Preferencias and ? the user manual.
{const gear=$('.rail [title="Ajustes"]'),help=$('.rail [title="Ayuda"]');if(gear){gear.title='Preferencias';gear.setAttribute('aria-label','Preferencias');gear.id='railPreferences';gear.onclick=()=>openPrefs();}if(help){help.title='Manual de usuario';help.setAttribute('aria-label','Manual de usuario');help.id='railManual';help.onclick=()=>{void window.lqtacDesktop.openUserManual?.();};}}

// ---------- Processed audio cache ----------
const cache=document.createElement('dialog');cache.id='cacheDialog';cache.className='work-dialog';document.body.append(cache);
cache.innerHTML='<h2>Caché de audio procesado</h2><p id="cacheInfo" role="status">Calculando…</p><p>Copias de audio con efectos (ecualizador, IA de ruido y eco, autotune…). Se vuelven a preparar solas cuando hacen falta; los archivos originales no se tocan.</p><p>Carpeta: <code id="cacheFolder"></code></p><footer><button type="button" id="cacheClear">Vaciar caché</button><button type="button" id="cacheClose">Cerrar</button></footer>';
async function cacheInfo(){try{const i=await window.lqtacDesktop.audioCacheInfo();$('#cacheInfo',cache).textContent=i.files?`${i.files} archivos · ${(i.bytes/1048576).toLocaleString('es-ES',{maximumFractionDigits:1})} MB`:'Vacía';$('#cacheFolder',cache).textContent=i.directory||'';$('#cacheClear',cache).disabled=!i.files;}catch(error){$('#cacheInfo',cache).textContent=error.message;}}
$('#cacheClose',cache).onclick=()=>cache.close();
$('#cacheClear',cache).onclick=async()=>{if(exporting||effectsBusy)return toast('Espera a que termine la exportación o la preparación de audio');if(!confirm('¿Vaciar la caché de audio procesado? Se volverá a generar al reproducir o exportar.'))return;stopTimelinePlayback();try{const r=await window.lqtacDesktop.audioCacheClear();effectAudioCache.clear();toast(`Caché vaciada · ${(r.bytes/1048576).toLocaleString('es-ES',{maximumFractionDigits:1})} MB liberados`+(r.busy?` · ${r.busy} en uso`:''));}catch(error){toast(error.message);}await cacheInfo();};

// ---------- Menus ----------
const mark=(on,label)=>(on?'✓ ':'')+label;
function toggle(label,get,run,extra={}){const button=studioCommand(label,run,()=>{button.firstChild.textContent=mark(get(),label);button.setAttribute('aria-checked',String(!!get()));return studioReady();},'',{role:'menuitemcheckbox',...extra});return button;}
// View
const spaces={edit:'Montaje',audio:'Audio',color:'Color',text:'Texto'};
studioGroup(viewMenu,'Espacio de trabajo');
for(const [id,name] of Object.entries(spaces))viewMenu.append(toggle(name,()=>window.LQTACWorkspaces?.current===id,()=>window.LQTACWorkspaces.activate(id),{'data-view-space':id}));
viewMenu.append(studioCommand('Restablecer la distribución',()=>window.LQTACWorkspaces.reset(),()=>studioReady()&&!!window.LQTACWorkspaces,'',{'data-view':'reset-space'}));
studioDivider(viewMenu);studioGroup(viewMenu,'Apariencia');
viewMenu.append(toggle('Tema oscuro',()=>prefs.theme==='dark',()=>set('theme','dark'),{'data-view-theme':'dark'}),toggle('Tema claro',()=>prefs.theme==='light',()=>set('theme','light'),{'data-view-theme':'light'}));
studioDivider(viewMenu);studioGroup(viewMenu,'Monitor');
viewMenu.append(toggle('Zonas seguras',()=>prefs.safeAreas,()=>set('safeAreas',!prefs.safeAreas),{'data-view':'safe'}));
for(const v of choices.previewScale)viewMenu.append(toggle('Calidad '+qualityNames[v].toLowerCase(),()=>prefs.previewScale===v,()=>set('previewScale',v),{'data-view-quality':String(v)}));
viewMenu.append(studioCommand('Monitor a pantalla completa',fullScreen,studioReady,'',{'data-view':'fullscreen'}));
studioDivider(viewMenu);studioGroup(viewMenu,'Línea de tiempo');
viewMenu.append(toggle('Imán',()=>prefs.snap,()=>set('snap',!prefs.snap),{'data-view':'snap'}),studioCommand('Ajustar el zoom a todo el proyecto',()=>$('[data-zoom=fit]')?.click(),studioReady,'',{'data-view':'fit'}),
 toggle('Miniaturas y formas de onda',()=>prefs.visuals,()=>set('visuals',!prefs.visuals),{'data-view':'visuals'}),
 toggle('Seguir el cabezal al reproducir',()=>prefs.follow,()=>set('follow',!prefs.follow),{'data-view':'follow'}),
 studioCommand('Ajustes de la línea de tiempo…',()=>openPrefs('timeline'),studioReady,'',{'data-view':'timeline-settings'}));
studioDivider(viewMenu);studioGroup(viewMenu,'Paneles');
viewMenu.append(studioCommand('Panel de subtítulos',()=>window.LQTACOpenSubtitlePanel?.(),studioReady,'',{'data-view':'subtitles'}));
// Options: program settings first, then extensions (Paquetes and Control MCP were appended by their own modules).
const extensions=[...optionsMenu.children];optionsMenu.replaceChildren();
studioGroup(optionsMenu,'Programa');
optionsMenu.append(studioCommand('Preferencias…',()=>openPrefs(),studioReady,'',{'data-options':'preferences'}),studioCommand('Caché de audio procesado…',()=>{void cacheInfo();cache.showModal();},studioReady,'',{'data-options':'cache'}));
if(extensions.length){studioDivider(optionsMenu);studioGroup(optionsMenu,'Ampliaciones');optionsMenu.append(...extensions);}
for(const menu of [viewMenu,optionsMenu])menu.querySelectorAll('button').forEach(b=>{b.type='button';b.tabIndex=-1;if(!b.getAttribute('role'))b.setAttribute('role','menuitem');});

// ---------- Save status and autosave ----------
const status=$('#saveStatus'),dot=$('.head-meta .live-dot');let baseline=null,savedAt=0,auto=false,path=null,dirtySince=0,checking=false;
function signature(){const s=projectSnapshot();delete s.time;delete s.zoom;delete s.zoomStart;return JSON.stringify(s);}
function ago(ms){const s=Math.round(ms/1000);return s<60?'unos segundos':s<3600?Math.round(s/60)+' min':Math.round(s/3600)+' h';}
async function check(){
  if(checking||typeof projectSnapshot!=='function')return;checking=true;
  try{
    let dirty=false;try{dirty=baseline!==null&&signature()!==baseline;}catch{}
    if(dirty&&!dirtySince)dirtySince=Date.now();if(!dirty)dirtySince=0;
    if(dirty&&path&&prefs.autosave&&Date.now()-dirtySince>=prefs.autosave*60000&&!exporting&&!historyBusy&&!(typeof playing!=='undefined'&&playing)&&!document.querySelector('dialog[open]')){
      try{const snapshot=projectSnapshot(),result=await window.lqtacDesktop.saveProject(snapshot,false);if(!result.canceled){const s={...snapshot};delete s.time;delete s.zoom;delete s.zoomStart;baseline=JSON.stringify(s);savedAt=Date.now();auto=true;dirty=false;dirtySince=0;path=result.filePath;}}
      catch(error){toast('Autoguardado: '+error.message);}
    }
    const name=path?path.split(/[\\/]/).pop():'';
    status.textContent=!path?(dirty||baseline===null?'Proyecto sin guardar':'Proyecto sin guardar'):dirty?'Cambios sin guardar'+(prefs.autosave?` · autoguardado en ${Math.max(0,Math.ceil((prefs.autosave*60000-(Date.now()-dirtySince))/60000))} min`:''):savedAt?`Guardado${auto?' automáticamente':''} hace ${ago(Date.now()-savedAt)}`:'Sin cambios';
    status.title=path?name:'Usa Archivo › Guardar proyecto para darle nombre';if(dot)dot.style.background=dirty||!path?'#ffb44d':'';
  }finally{checking=false;}
}
let tick=0;function scheduleCheck(){clearTimeout(tick);tick=setTimeout(()=>{void check().finally(()=>{tick=setTimeout(scheduleCheck,0);});},15000);void check();}
window.addEventListener('lqtac-project-restored',async()=>{try{path=await window.lqtacDesktop.projectPath?.()||null;}catch{path=null;}try{baseline=signature();}catch{baseline=null;}savedAt=0;auto=false;dirtySince=0;void check();});
window.addEventListener('lqtac-project-saved',event=>{path=event.detail?.filePath||path;try{baseline=signature();}catch{}savedAt=Date.now();auto=false;dirtySince=0;void check();});
setTimeout(async()=>{if(baseline===null){try{await demoReady;}catch{}try{path=await window.lqtacDesktop.projectPath?.()||null;}catch{}try{baseline=signature();}catch{}}scheduleCheck();},1500);
window.LQTACAppOptions={prefs,set,openPrefs,check,get status(){return status.textContent;},backdate(ms){if(dirtySince)dirtySince-=ms;}};
apply();
})();
