// Generic UI access for the local MCP bridge: every menu command, panel, dialog and control the
// person can use. Capture (screen/camera/microphone) and the MCP panel itself are excluded here:
// recording goes through the dedicated cinema_record_* tools, which have their own permission.
(()=>{
 if(!window.CinemaAutomation)return;
 const BLOCKED='#mcpDialog,#cameraDialog,#microphoneDialog,[data-capture],[data-mcp-control]';
 const CONTROLS='button,input,select,textarea,summary,a[href],[role=menuitem],[role=button],[role=tab],[role=checkbox],[role=switch],[contenteditable=true]';
 let sequence=0;
 const blocked=el=>!!el.closest(BLOCKED);
 const text=value=>String(value??'').replace(/\s+/g,' ').trim();
 const short=(value,n=140)=>{value=text(value);return value.length>n?value.slice(0,n-1)+'…':value;};
 function visible(el){
  if(el.closest('dialog:not([open])'))return false;
  if(el.checkVisibility&&!el.checkVisibility({checkOpacity:false,checkVisibilityCSS:true}))return false;
  const r=el.getBoundingClientRect();return r.width>0&&r.height>0;
 }
 function ref(el){
  if(el.dataset.command)return 'command:'+el.dataset.command;
  if(el.id&&document.querySelectorAll('#'+CSS.escape(el.id)).length===1)return '#'+el.id;
  if(!el.dataset.uiRef)el.dataset.uiRef=String(++sequence);
  return 'ui:'+el.dataset.uiRef;
 }
 function label(el){
  const labelled=el.getAttribute('aria-labelledby');
  const own=el.getAttribute('aria-label')||(labelled&&text(labelled.split(/\s+/).map(id=>document.getElementById(id)?.textContent).join(' ')));
  if(own)return short(own);
  if(el.labels?.length){const l=el.labels[0].cloneNode(true);l.querySelectorAll('select,input,textarea,output').forEach(x=>x.remove());const t=text(l.textContent);if(t)return short(t);}
  if(['INPUT','SELECT','TEXTAREA'].includes(el.tagName)){const wrap=el.closest('label');if(wrap){const l=wrap.cloneNode(true);l.querySelectorAll('select,input,textarea').forEach(x=>x.remove());const t=text(l.textContent);if(t)return short(t);}}
  return short(el.title||(el.tagName==='SELECT'?'':el.textContent)||el.placeholder||el.name||el.value||'');
 }
 function kind(el){
  if(el.tagName==='INPUT')return el.type||'text';
  if(el.tagName==='SELECT')return 'select';if(el.tagName==='TEXTAREA')return 'textarea';
  if(el.isContentEditable)return 'editable';if(el.getAttribute('role')==='menuitem')return 'menuitem';
  return el.getAttribute('role')||el.tagName.toLowerCase();
 }
 function describe(el){
  const item={ref:ref(el),type:kind(el),label:label(el)};
  if(el.disabled||el.getAttribute('aria-disabled')==='true')item.disabled=true;
  if(el.tagName==='SELECT'){item.value=el.value;item.options=[...el.options].slice(0,80).map(o=>({value:o.value,label:short(o.textContent,80)}));}
  else if(['checkbox','radio'].includes(el.type))item.checked=el.checked;
  else if(el.tagName==='INPUT'||el.tagName==='TEXTAREA'){if(el.type!=='file'&&el.type!=='password')item.value=short(el.value,400);for(const k of ['min','max','step'])if(el.getAttribute(k)!==null)item[k]=el.getAttribute(k);}
  else if(el.isContentEditable)item.value=short(el.textContent,400);
  if(el.getAttribute('aria-expanded'))item.expanded=el.getAttribute('aria-expanded')==='true';
  if(el.getAttribute('aria-pressed'))item.pressed=el.getAttribute('aria-pressed')==='true';
  if(el.classList.contains('active'))item.active=true;
  return item;
 }
 const openDialogs=()=>[...document.querySelectorAll('dialog[open]')];
 const topDialog=()=>{const list=openDialogs();return list.find(d=>d.matches(':modal'))||list.at(-1)||null;};
 const dialogInfo=d=>({id:d.id||null,title:short(d.querySelector('h1,h2,h3')?.textContent||d.getAttribute('aria-label')||'',120),modal:d.matches(':modal'),blocked:blocked(d),status:[...d.querySelectorAll('[role=status],.status,output[id$=Status]')].map(x=>short(x.textContent,300)).filter(Boolean).slice(0,6)});
 function menuCommands(){
  const result=[];
  for(const button of document.querySelectorAll('[data-command]')){
   const entry=studioCommands.get(button.dataset.command);if(!entry)continue;
   const menu=button.closest('[role=menu],.studio-menu,#fileMenu,#editMenu,#viewMenu,#insertMenu,#toolsMenu,#optionsMenu,#helpMenu');
   const path=[];let m=menu;while(m){const opener=m.id&&document.querySelector('[aria-controls="'+CSS.escape(m.id)+'"]');path.unshift(opener?short(opener.textContent,60).replace(/›$/,'').trim():({fileMenu:'Archivo',editMenu:'Edición',viewMenu:'Ver',insertMenu:'Insertar',toolsMenu:'Herramientas',optionsMenu:'Opciones',helpMenu:'Ayuda'}[m.id]||m.getAttribute('aria-label')||m.id||''));m=opener?opener.closest('[role=menu],.studio-menu'):null;}
   let enabled=false;try{enabled=!!entry.enabled();}catch{}
   result.push({ref:'command:'+button.dataset.command,menu:path.filter(Boolean).join(' › '),label:short(button.firstChild?.textContent||button.textContent,120),shortcut:button.querySelector('kbd')?.textContent||undefined,enabled,blocked:blocked(button)||undefined});
  }
  return result;
 }
 function clipElement(spec){
  const [trackId,index]=spec.split(':');const track=[...document.querySelectorAll('.track')].find(t=>t.dataset.track===trackId);
  if(!track)throw Error('No existe la pista '+trackId);if(index===undefined)return track;
  const clip=timelineClips().filter(c=>c.parentElement===track)[Number(index)];if(!clip)throw Error('No existe el clip '+spec);return clip;
 }
 function resolve(target){
  if(typeof target!=='string'||!target)throw Error('Indica target (ref de cinema_ui_snapshot)');
  let el=null;
  if(target.startsWith('command:'))el=document.querySelector('[data-command="'+CSS.escape(target.slice(8))+'"]');
  else if(target.startsWith('ui:'))el=document.querySelector('[data-ui-ref="'+CSS.escape(target.slice(3))+'"]');
  else if(target.startsWith('#'))el=document.getElementById(target.slice(1));
  else if(target.startsWith('clip:'))el=clipElement(target.slice(5));
  else if(target.startsWith('track:'))el=clipElement(target.slice(6));
  else if(target.startsWith('css:'))el=document.querySelector(target.slice(4));
  if(!el)throw Error('Elemento no encontrado: '+target+'. Vuelve a leer cinema_ui_snapshot');
  if(blocked(el))throw Error('Las grabaciones y el panel MCP no se controlan desde la interfaz. Usa cinema_record_* (requiere el permiso de grabación en Control MCP local)');
  return el;
 }
 function snapshot({scope='auto',query='',limit=250}={}){
  const dialog=topDialog(),modal=dialog?.matches(':modal');
  const root=scope==='all'||!modal?document:dialog;
  let controls=[];
  if(scope!=='menus'){
   const q=text(query).toLowerCase();
   for(const el of root.querySelectorAll(CONTROLS)){
    if(blocked(el)||!visible(el)||el.closest('[inert]')&&!modal)continue;
    if(modal&&!dialog.contains(el)&&scope!=='all')continue;
    const item=describe(el);if(q&&!(item.label+' '+(item.value||'')+' '+item.ref).toLowerCase().includes(q))continue;
    controls.push(item);if(controls.length>=limit)break;
   }
  }
  const toastEl=document.getElementById('toast');
  return {
   project:short(document.getElementById('projectName')?.textContent,120),
   activePanel:short(document.querySelector('.dock-panel-item.active')?.textContent,60)||null,
   dialogs:openDialogs().map(dialogInfo),
   focus:modal?'dialog':'editor',
   toast:toastEl?.classList.contains('show')?short(toastEl.textContent,300):null,
   controls,
   truncated:controls.length>=limit||undefined,
   menus:scope==='menus'||scope==='all'||(scope==='auto'&&!modal)?menuCommands():undefined,
   selectedClips:selectedTimelineClips.map(c=>{const track=c.parentElement;return 'clip:'+track.dataset.track+':'+timelineClips().filter(x=>x.parentElement===track).indexOf(c);}),
   hint:'Usa cinema_ui_action con el ref. Clips: clip:<pista>:<índice> (como cinema_project); pistas: track:<pista>. Los diálogos nativos de abrir/guardar se contestan con files.'
  };
 }
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 function setValue(el,value){
  if(el.disabled)throw Error('El control está desactivado');
  if(el.tagName==='SELECT'){const option=[...el.options].find(o=>o.value===value)||[...el.options].find(o=>text(o.textContent).toLowerCase()===text(value).toLowerCase());if(!option)throw Error('Opción no disponible: '+value);el.value=option.value;}
  else if(['checkbox','radio'].includes(el.type)){const v=String(value).toLowerCase();el.checked=v==='true'||v==='1'||v==='on'||v==='sí'||v==='si';}
  else if(el.isContentEditable)el.textContent=value;
  else if('value' in el){if(el.type==='file')throw Error('Usa files en la acción que abre el selector nativo');el.value=value;}
  else throw Error('El elemento no admite valores');
  el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
 }
 const KEYS=new Set(['Enter','Escape','Tab','Space',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown','Delete','Backspace']);
 async function action({action,target,value='',accept=false,waitMs=350}){
  const alerts=[];const original={confirm:window.confirm,alert:window.alert,prompt:window.prompt};
  // Native confirm()/alert() would block the editor until someone clicks; answer them for this action only.
  window.confirm=message=>{alerts.push({type:'confirm',message:short(message,300),answer:!!accept});return !!accept;};
  window.alert=message=>{alerts.push({type:'alert',message:short(message,300)});};
  window.prompt=(message,def)=>{alerts.push({type:'prompt',message:short(message,300)});return accept?(value||def||''):null;};
  try{
   if(action==='command'){
    const el=resolve(target.startsWith('command:')?target:'command:'+target);const entry=studioCommands.get(el.dataset.command);
    if(!entry.enabled())throw Error('El comando no está disponible ahora (revisa la selección o cierra el diálogo abierto)');
    studioCloseMenus?.();await entry.run();
   }else if(action==='click'){const el=resolve(target);if(el.disabled)throw Error('El control está desactivado');el.scrollIntoView?.({block:'nearest',inline:'nearest'});el.focus?.({preventScroll:true});el.click();}
   else if(action==='set'){const el=resolve(target);setValue(el,String(value));}
   else if(action==='contextmenu'){const el=resolve(target);const r=el.getBoundingClientRect();el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:r.left+Math.min(r.width/2,40),clientY:r.top+r.height/2,button:2}));}
   else if(action==='select'){const el=resolve(target);const r=el.getBoundingClientRect(),o={bubbles:true,cancelable:true,clientX:r.left+Math.min(r.width/2,40),clientY:r.top+r.height/2,button:0,pointerId:1,isPrimary:true};el.dispatchEvent(new PointerEvent('pointerdown',o));el.dispatchEvent(new PointerEvent('pointerup',o));el.dispatchEvent(new MouseEvent('click',o));}
   else if(action==='key'){
    const key=value==='Space'?' ':value;if(!KEYS.has(value)&&!KEYS.has(key))throw Error('Tecla no admitida: '+value);
    const el=target?resolve(target):document.activeElement;if(!el||el===document.body)throw Error('Indica target para la tecla');
    const dialog=topDialog();if(!(dialog?.contains(el)||['INPUT','TEXTAREA','SELECT'].includes(el.tagName)))throw Error('Las teclas solo se envían a campos o a diálogos abiertos; para menús usa command');
    if(key==='Escape'&&dialog?.contains(el)){if(blocked(dialog))throw Error('Diálogo protegido');const e=new Event('cancel',{cancelable:true});dialog.dispatchEvent(e);if(!e.defaultPrevented)dialog.close();}
    else{for(const type of ['keydown','keyup'])el.dispatchEvent(new KeyboardEvent(type,{key,bubbles:true,cancelable:true}));if(key==='Enter'&&el.tagName==='BUTTON')el.click();}
   }else if(action==='close'){
    const dialog=target?resolve(target).closest('dialog'):topDialog();if(!dialog)throw Error('No hay ningún diálogo abierto');if(blocked(dialog))throw Error('Diálogo protegido');
    const e=new Event('cancel',{cancelable:true});dialog.dispatchEvent(e);if(!e.defaultPrevented&&dialog.open)dialog.close();
   }else if(action==='menus'){studioCloseMenus?.();}
   else throw Error('Acción no válida');
   await wait(Math.max(0,Math.min(10000,waitMs)));
  }finally{Object.assign(window,original);}
  const after=topDialog(),toastEl=document.getElementById('toast');
  return {ok:true,alerts,dialog:after?dialogInfo(after):null,toast:toastEl?.classList.contains('show')?short(toastEl.textContent,300):null};
 }
 Object.assign(window.CinemaAutomation,{
  uiSnapshot:snapshot,uiAction:action,
  recordStatus:()=>window.LQTACRecorderAutomation?.status()||{state:'none'},
  recordStart:options=>window.LQTACRecorderAutomation.start(options),
  recordControl:({action})=>window.LQTACRecorderAutomation.control(action),
  devices:async()=>{const all=await navigator.mediaDevices.enumerateDevices();return {microphones:all.filter(d=>d.kind==='audioinput'&&d.deviceId&&d.deviceId!=='default').map(d=>({id:d.deviceId,label:d.label})),cameras:all.filter(d=>d.kind==='videoinput'&&d.deviceId&&d.deviceId!=='default').map(d=>({id:d.deviceId,label:d.label}))};}
 });
})();
