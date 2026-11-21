// Content packs in the editor (Opciones → Paquetes…): installed, signed .lqpack bundles add subtitle frames,
// title templates and images, transition masks and effect presets. Images are fetched once as data: URLs and kept
// decoded, so subtitle and title drawing stay synchronous and the export canvas is never tainted.
(()=>{
 const desktop=window.lqtacDesktop;if(!desktop?.packsList)return;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let packs=[],loading=null,rerender=0;const images=new Map(),listeners=new Set();
 const active=()=>packs.filter(p=>p.enabled);
 const content=(p,k)=>p.manifest.content[k]||[];
 const split=asset=>{const i=asset.indexOf(':');return [asset.slice(0,i),asset.slice(i+1)];};
 function scheduleRender(){if(rerender)return;rerender=requestAnimationFrame(()=>{rerender=0;if(typeof exporting!=='undefined'&&!exporting&&typeof renderTimelineAt==='function')void renderTimelineAt(timelineTime);});}
 function load(id,file){const key=id+':'+file;let e=images.get(key);if(!e){e={image:null};e.promise=desktop.packAsset(id,file).then(async url=>{const img=new Image();img.src=url;await img.decode();e.image=img;scheduleRender();return img;}).catch(()=>{e.failed=true;return null;});images.set(key,e);}return e.promise;}
 const enabledPack=id=>packs.find(p=>p.id===id&&p.enabled);
 function imageSync(asset){const [id,file]=split(asset);if(!enabledPack(id))return null;const e=images.get(id+':'+file);if(!e){void load(id,file);return null;}return e.image;}
 async function imageFor(asset){const [id,file]=split(asset);return enabledPack(id)?load(id,file):null;}
 async function preload(objects){await Promise.all((objects||[]).filter(o=>o?.type==='image'&&typeof o.asset==='string').map(o=>imageFor(o.asset)));}
 function frameDefinition(packId,id){const p=enabledPack(packId);return p?content(p,'subtitleFrames').find(f=>f.id===id)||null:null;}
 function frame(packId,id){const definition=frameDefinition(packId,id);if(!definition)return null;const e=images.get(packId+':'+definition.image);if(!e){void load(packId,definition.image);return null;}return e.image?{definition,image:e.image}:null;}
 const group=(items,label)=>{const by=new Map();for(const i of items){const k=label(i);if(!by.has(k))by.set(k,[]);by.get(k).push(i);}return by;};
 function frameOptions(){return [...group(active().flatMap(p=>content(p,'subtitleFrames').map(f=>({p,f}))),x=>x.p.name)].map(([name,list])=>'<optgroup label="'+esc(name)+'">'+list.map(({p,f})=>'<option value="'+esc(p.id+'|'+f.id)+'">'+esc(f.name)+'</option>').join('')+'</optgroup>').join('');}
 function templateOptions(accept=()=>true){return [...group(active().flatMap(p=>content(p,'titles').filter(t=>accept(t.generator?.type)).map(t=>({p,t}))),x=>x.t.category||x.p.name)].map(([name,list])=>'<optgroup label="'+esc(name+' · paquete')+'">'+list.map(({p,t})=>'<option value="'+esc('pack:'+p.id+':'+t.id)+'">'+esc(t.name)+'</option>').join('')+'</optgroup>').join('');}
 // Display name of a pack image, for the title editor layers.
 function imageName(asset){const [packId,file]=String(asset).split(/:(.*)/);const p=active().find(x=>x.id===packId);return p?content(p,'images').find(i=>i.file===file)?.name||null:null;}
 function imageOptions(){return [...group(active().flatMap(p=>content(p,'images').map(i=>({p,i}))),x=>x.p.name)].map(([name,list])=>'<optgroup label="'+esc(name)+'">'+list.map(({p,i})=>'<option value="'+esc(p.id+':'+i.file)+'">'+esc(i.name)+'</option>').join('')+'</optgroup>').join('');}
 function buildTitle(key){const [,packId,id]=key.split(':');const t=enabledPack(packId)&&content(enabledPack(packId),'titles').find(x=>x.id===id);if(!t)throw Error('Plantilla de paquete no disponible');return LQTACGeneratorModel.validate(structuredClone(t.generator));}
 function presets(kind,key){return active().flatMap(p=>content(p,'presets').filter(x=>x.kind===kind&&x.key===key).map(x=>({...structuredClone(x),packName:p.name})));}
 function masks(){return active().flatMap(p=>content(p,'masks').map(m=>({...m,pack:p.id,packName:p.name})));}
 // Subtitle track properties (track FX/⚙ button): one frame for every block of the track.
 if(typeof openWorkControls==='function'){const base=openWorkControls;openWorkControls=function(track,clip=null){base(track,clip);if(clip||track?.dataset.kind!=='subtitle'||!workDialog.open)return;
  const clips=[...track.querySelectorAll('.clip')].filter(c=>c.dataset.kind==='subtitle'),styles=clips.map(c=>JSON.parse(c.dataset.subtitleStyle||'{}')),keys=new Set(styles.map(s=>s.frame?s.frame.pack+'|'+s.frame.id:'')),current=keys.size===1?[...keys][0]:'*';
  const box=document.createElement('fieldset');box.id='trackFrameBox';box.innerHTML='<legend>Marco de los subtítulos · '+clips.length+' bloques</legend><label>Marco<select id="trackFrame">'+(current==='*'?'<option value="*">Varios marcos · no cambiar</option>':'')+'<option value="">Sin marco</option>'+frameOptions()+'</select></label><label>Opacidad del marco <output id="trackFrameOpacityValue"></output><input id="trackFrameOpacity" type="range" min="0" max="1" step="0.05"></label><label><input type="checkbox" id="trackFrameStyle"> Aplicar también la letra sugerida por el marco (fuente, tamaño, colores y altura)</label><p class="transition-help">Se aplica a todos los subtítulos de esta pista. El texto, los tiempos y el karaoke de cada bloque no cambian.'+(frameOptions()?'':' No hay marcos instalados: Opciones → Paquetes… para instalar uno.')+'</p>';
  workDialog.querySelector('#workError').before(box);const select=box.querySelector('#trackFrame'),opacity=box.querySelector('#trackFrameOpacity'),out=box.querySelector('#trackFrameOpacityValue'),suggested=box.querySelector('#trackFrameStyle');
  if(current&&current!=='*'&&![...select.options].some(o=>o.value===current))select.add(new Option('No instalado · '+current.split('|')[1],current));select.value=current;
  opacity.value=String(styles.find(s=>s.frame)?.frame.opacity??1);let dirty=false;const show=()=>{out.textContent=Math.round(Number(opacity.value)*100)+' %';opacity.disabled=!select.value||select.value==='*';};show();
  select.onchange=()=>{dirty=true;suggested.checked=!!select.value&&select.value!=='*';show();};opacity.oninput=()=>{dirty=true;show();};suggested.onchange=()=>{dirty=true;};
  workDialog.querySelector('form').addEventListener('submit',()=>{if(workDialog.open||!dirty||select.value==='*')return;
   try{const [pack,id]=select.value.split('|'),def=select.value?frameDefinition(pack,id):null;
    const updates=clips.map((c,i)=>{const next={...styles[i]};if(!select.value)delete next.frame;else{next.frame={pack,id,opacity:Number(opacity.value)};if(suggested.checked&&def?.style)Object.assign(next,structuredClone(def.style));}LQTACSubtitleModel.validate({subtitleText:c.dataset.subtitleText,subtitleStyle:next});return [c,next];});
    for(const [c,next] of updates)c.dataset.subtitleStyle=JSON.stringify(next);void renderTimelineAt(timelineTime);toast(select.value?'Marco aplicado a '+updates.length+' subtítulos':'Marco quitado de '+updates.length+' subtítulos');
   }catch(error){alert('No se pudo aplicar el marco a la pista:\n'+error.message);}});
 };}
 async function refresh(){loading=(async()=>{packs=await desktop.packsList().catch(()=>[]);
   // Frames are drawn synchronously in preview and export: keep their images decoded up front.
   await Promise.all(active().flatMap(p=>content(p,'subtitleFrames').map(f=>load(p.id,f.image))));
   refreshMaskPicker();for(const fn of listeners)try{fn();}catch{}scheduleRender();})();return loading;}
 window.LQTACPacks={refresh,ready:()=>loading,list:()=>packs.map(p=>({id:p.id,name:p.name,version:p.version,author:p.author,enabled:p.enabled,signer:p.signer?.name||null})),
  frame,frameDefinition,frameOptions,templateOptions,imageOptions,imageName,buildTitle,imageSync,imageFor,preload,presets,masks,onChange:fn=>{listeners.add(fn);return ()=>listeners.delete(fn);}};

 // Transition masks from packs: loaded through the dialog's own file input so they follow the normal mask path.
 function refreshMaskPicker(){
  const dialog=document.getElementById('maskDialog'),button=document.getElementById('loadMaskButton');if(!dialog||!button)return;
  let label=document.getElementById('maskPackLabel');const list=masks();
  if(!label){label=document.createElement('label');label.id='maskPackLabel';label.className='transition-help';label.style.cssText='display:grid;gap:4px;margin:10px 0 4px';label.innerHTML='Máscara de un paquete<select id="maskPackSelect" style="width:100%"></select>';button.after(label);
   label.querySelector('select').onchange=async e=>{const value=e.target.value;e.target.value='';const m=masks().find(x=>x.pack+':'+x.id===value);if(!m)return;
    try{const url=await desktop.packAsset(m.pack,m.image),blob=await (await fetch(url)).blob();
     const set=(id,v)=>{const el=document.getElementById(id);if(!el)return;if(el.type==='checkbox')el.checked=!!v;else el.value=String(v);};
     set('maskSoftness',Math.round((m.softness??.15)*100));set('maskInvert',!!m.invert);set('maskMotion',m.motion||'none');set('maskAmount',Math.round((m.amount??.5)*100));set('maskBlur',m.blur||0);set('maskRotation',m.rotation||0);
     const input=document.getElementById('maskFileInput'),dt=new DataTransfer();dt.items.add(new File([blob],m.name+'.'+(blob.type==='image/jpeg'?'jpg':'png'),{type:blob.type}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
    }catch(error){toast('No se pudo cargar la máscara: '+error.message);}};}
  label.hidden=!list.length;label.querySelector('select').innerHTML='<option value="">— Elegir —</option>'+[...group(list,m=>m.packName)].map(([name,items])=>'<optgroup label="'+esc(name)+'">'+items.map(m=>'<option value="'+esc(m.pack+':'+m.id)+'">'+esc(m.name)+'</option>').join('')+'</optgroup>').join('');
 }

 // Manager dialog.
 const style=document.createElement('style');style.textContent=`#packsDialog{width:min(820px,92vw);max-height:86vh;background:#102545;color:#e7f0ff;border:1px solid #436389;border-radius:16px;padding:22px;box-sizing:border-box}
#packsDialog[open]{display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;gap:12px}#packsDialog h2{margin:0;font-size:19px}#packsDialog>p{margin:0;color:#b7c8e4;font-size:13px;line-height:1.45}
#packsList{overflow:auto;display:grid;gap:10px;min-height:120px}.pack-card{display:grid;grid-template-columns:150px minmax(0,1fr) auto;gap:14px;align-items:start;border:1px solid #33557d;border-radius:12px;padding:12px;background:#0c1f3b}
.pack-card.off{opacity:.62}.pack-cover{width:150px;aspect-ratio:16/9;border-radius:8px;background:#06152a center/cover no-repeat;border:1px solid #2b4a70}.pack-card h3{margin:0 0 3px;font-size:15px}.pack-meta{font-size:12px;color:#9fb6d6;margin:0 0 6px}
.pack-badge{display:inline-block;font-size:11px;padding:1px 7px;border-radius:99px;background:#1d5a3a;color:#c9f5dc;margin-left:6px;vertical-align:1px}.pack-card p.desc{margin:0 0 6px;font-size:12.5px;line-height:1.4}.pack-content{margin:0;font-size:12px;color:#c7d6ee}
.pack-actions{display:grid;gap:8px;justify-items:end}.pack-actions label{display:flex;gap:6px;align-items:center;font-size:12.5px;white-space:nowrap}#packsDialog button{font:inherit;font-weight:650;min-height:36px;padding:7px 14px;border:1px solid #54769d;border-radius:9px;background:#193b5d;color:#f2f6ff;cursor:pointer}
#packsDialog button:hover{background:#254d75}#packsDialog #packsInstall{background:#6ea2ff;border-color:#6ea2ff;color:#071735}#packsDialog footer{display:flex;justify-content:space-between;align-items:center;gap:10px}#packsStatus{font-size:12.5px;color:#b7c8e4}
.packs-empty{border:1px dashed #436389;border-radius:12px;padding:26px;text-align:center;color:#9fb6d6;font-size:13px}
@media (max-width:620px){.pack-card{grid-template-columns:1fr}.pack-cover{width:100%}.pack-actions{justify-items:start}}`;document.head.append(style);
 const dialog=document.createElement('dialog');dialog.id='packsDialog';dialog.setAttribute('aria-labelledby','packsTitle');
 dialog.innerHTML='<h2 id="packsTitle">Paquetes de contenido</h2><p>Marcos para subtítulos, rótulos e imágenes, máscaras de transición y presets de efectos que se añaden a los del programa. Solo se instalan paquetes oficiales firmados; nunca contienen programas ni código. Siguen instalados al actualizar Cinema Studio.</p><div id="packsList" aria-live="polite"></div><footer><span id="packsStatus" role="status"></span><span><button type="button" id="packsInstall">Instalar paquete…</button> <button type="button" id="packsClose">Cerrar</button></span></footer>';
 document.body.append(dialog);dialog.addEventListener('keydown',e=>e.stopPropagation());
 const status=t=>{dialog.querySelector('#packsStatus').textContent=t||'';};
 const count=(n,a,b)=>n?n+' '+(n===1?a:b):'';
 async function renderList(){
  const list=dialog.querySelector('#packsList');
  if(!packs.length){list.innerHTML='<div class="packs-empty">No hay paquetes instalados. Pulsa <b>Instalar paquete…</b> o haz doble clic en un archivo <b>.lqpack</b>.</div>';return;}
  list.innerHTML=packs.map(p=>{const c=k=>content(p,k).length,parts=[count(c('subtitleFrames'),'marco de subtítulos','marcos de subtítulos'),count(c('titles'),'rótulo','rótulos'),count(c('images'),'imagen','imágenes'),count(c('masks'),'máscara','máscaras'),count(c('presets'),'preset','presets')].filter(Boolean);
   return '<article class="pack-card'+(p.enabled?'':' off')+'" data-pack="'+esc(p.id)+'"><div class="pack-cover" role="img" aria-label="Portada de '+esc(p.name)+'"></div><div><h3>'+esc(p.name)+(p.signer?'<span class="pack-badge">'+esc(p.signer.name)+'</span>':'')+'</h3><p class="pack-meta">Versión '+esc(p.version)+' · '+esc(p.author)+'</p>'+(p.description?'<p class="desc">'+esc(p.description)+'</p>':'')+'<p class="pack-content">'+esc(parts.join(' · '))+'</p></div><div class="pack-actions"><label><input type="checkbox" data-enable'+(p.enabled?' checked':'')+'> Activado</label><button type="button" data-remove>Desinstalar</button></div></article>';}).join('');
  for(const card of list.querySelectorAll('.pack-card')){const p=packs.find(x=>x.id===card.dataset.pack);
   if(p.cover)desktop.packAsset(p.id,p.cover).then(url=>{card.querySelector('.pack-cover').style.backgroundImage='url("'+url+'")';}).catch(()=>{});
   card.querySelector('[data-enable]').onchange=async e=>{try{await desktop.packsEnable(p.id,e.target.checked);status(e.target.checked?'«'+p.name+'» activado':'«'+p.name+'» desactivado: su contenido deja de mostrarse hasta que lo actives');}catch(error){status(error.message);}};
   card.querySelector('[data-remove]').onclick=async()=>{try{if(await desktop.packsRemove(p.id))status('«'+p.name+'» desinstalado');}catch(error){status(error.message);}};}
 }
 desktop.onPacksChanged(()=>{void refresh().then(()=>{if(dialog.open)void renderList();});});
 dialog.querySelector('#packsInstall').onclick=async()=>{try{const r=await desktop.packsInstall();if(r?.error)status(r.error);else if(r)status('«'+r.name+'» '+r.version+(r.previousVersion?' actualizado (antes '+r.previousVersion+')':' instalado'));}catch(error){status(error.message);}};
 dialog.querySelector('#packsClose').onclick=()=>dialog.close();
 async function open(){status('');await refresh();await renderList();dialog.showModal();}
 window.LQTACPacks.open=open;
 if(typeof toolsMenu!=='undefined')optionsMenu.append(studioCommand('Paquetes…',()=>void open(),()=>!exporting&&!historyBusy,'',{'data-packs':'open'}));
 void refresh();
})();
