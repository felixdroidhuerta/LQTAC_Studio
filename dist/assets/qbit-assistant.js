// Qbit: optional local assistant (Ayuda → Asistente Qbit…). Floating, non-modal panel so the timeline stays usable.
// The model runs in the main process (desktop/qbit-service.cjs); this panel only shows proposals and asks before applying.
(()=>{
 if(!window.lqtacDesktop?.qbitStatus)return;
 // Spritesheet: 8 columns × 11 rows of 192×208 px poses.
 // Calm by design: idle is a still pose with an occasional short gesture; gestures run slowly and mostly play once.
 const ANIM={idle:{row:0,frames:7,fps:3,once:true},wave:{row:3,frames:4,fps:3,once:true},happy:{row:4,frames:5,fps:4,once:true},sleep:{row:5,frames:7,fps:2,once:true},talk:{row:6,frames:6,fps:3,once:true},think:{row:7,frames:6,fps:2},explain:{row:8,frames:6,fps:3,once:true},look:{row:9,frames:8,fps:4,once:true}};
 const style=document.createElement('style');
 style.textContent=`
 #qbitPanel{position:fixed;right:22px;bottom:22px;z-index:60;width:min(400px,calc(100vw - 32px));height:min(600px,calc(100vh - 90px));display:none;flex-direction:column;background:var(--panel);color:var(--text);border:1px solid var(--line-strong);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;font-size:13px}
 #qbitPanel.open{display:flex}
 #qbitPanel header{display:flex;align-items:center;gap:12px;padding:10px 12px 8px;border-bottom:1px solid var(--line);background:var(--panel-2);cursor:move;user-select:none}
 #qbitAvatar{width:96px;height:104px;flex:none;background-repeat:no-repeat;background-size:768px 1144px;image-rendering:auto}
 #qbitPanel header h2{margin:0;font-size:16px}#qbitPanel header p{margin:2px 0 0;color:var(--muted);font-size:12px}
 #qbitPanel header .qbit-actions{margin-left:auto;display:flex;gap:6px;align-self:flex-start}
 #qbitPanel .qbit-icon{border:1px solid var(--line);background:transparent;color:var(--text);border-radius:8px;width:30px;height:30px;cursor:pointer;font:inherit}
 #qbitPanel .qbit-icon:hover{border-color:var(--accent)}
 #qbitLog{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px}
 #qbitLog .msg{max-width:88%;padding:8px 11px;border-radius:12px;line-height:1.4;white-space:pre-wrap;overflow-wrap:anywhere}
 #qbitLog .user{align-self:flex-end;background:var(--accent);color:#071735}
 #qbitLog .bot{align-self:flex-start;background:var(--ink-2);border:1px solid var(--line)}
 #qbitLog .bot.error{border-color:var(--orange);color:var(--orange)}
 #qbitLog .proposal{align-self:stretch;border:1px solid var(--accent);border-radius:12px;padding:10px 12px;background:var(--ink-2)}
 #qbitLog .proposal ul{margin:6px 0 10px;padding-left:18px}#qbitLog .proposal li{margin:3px 0}
 #qbitLog .proposal .warn{color:var(--orange);font-size:12px;margin:0 0 8px}
 #qbitLog .proposal .row{display:flex;gap:8px;justify-content:flex-end}
 #qbitLog .proposal button,#qbitForm button{font:inherit;font-weight:650;min-height:32px;padding:5px 14px;border-radius:8px;cursor:pointer;border:1px solid var(--line-strong);background:transparent;color:var(--text)}
 #qbitLog .proposal button.primary,#qbitForm button{background:var(--accent);border-color:var(--accent);color:#071735}
 #qbitLog .proposal button:disabled,#qbitForm button:disabled{opacity:.5;cursor:default}
 #qbitLog .done{color:var(--lime);font-size:12px}
 #qbitLog .chips{display:flex;flex-wrap:wrap;gap:6px}#qbitLog .chips button{font:inherit;font-size:12px;border:1px solid var(--line-strong);background:transparent;color:var(--text);border-radius:999px;padding:4px 10px;cursor:pointer}
 #qbitLog .chips button:hover{border-color:var(--accent)}
 #qbitForm{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--line)}
 #qbitInput{flex:1;min-width:0;background:var(--ink);color:var(--text);border:1px solid var(--line-strong);border-radius:8px;padding:7px 10px;font:inherit}
 #qbitInput:focus-visible,#qbitPanel button:focus-visible{outline:2px solid var(--accent-2);outline-offset:2px}
 .rail .icon-btn.qbit-rail{padding:0}
 .rail .qbit-rail img{width:28px;height:28px;display:block;pointer-events:none;filter:saturate(.8) brightness(.9);transition:filter .15s,transform .15s}
 .rail .qbit-rail:hover img,.rail .qbit-rail.active img{filter:none}
 .rail .qbit-rail:active img{transform:scale(.94)}
 @media (prefers-reduced-motion:reduce){#qbitAvatar,.rail .qbit-rail img{transition:none}}`;
 document.head.append(style);
 const panel=document.createElement('section');panel.id='qbitPanel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Asistente Qbit');
 panel.innerHTML=`<header><div id="qbitAvatar" role="img" aria-label="Qbit"></div><div><h2>Qbit</h2><p id="qbitState">Asistente de Cinema Studio</p></div><div class="qbit-actions"><button type="button" class="qbit-icon" id="qbitNew" title="Nueva conversación" aria-label="Nueva conversación">↺</button><button type="button" class="qbit-icon" id="qbitClose" title="Cerrar" aria-label="Cerrar">✕</button></div></header><div id="qbitLog" aria-live="polite"></div><form id="qbitForm"><input id="qbitInput" autocomplete="off" maxlength="600" placeholder="Pídeme un efecto, una transición…" aria-label="Mensaje para Qbit"><button type="submit">Enviar</button></form>`;
 document.body.append(panel);
 const $q=s=>panel.querySelector(s),log=$q('#qbitLog'),input=$q('#qbitInput'),form=$q('#qbitForm'),avatar=$q('#qbitAvatar'),stateLine=$q('#qbitState');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

 // --- Avatar ------------------------------------------------------------------------------------------------
 let anim='idle',frame=0,timer=null,idleTimer=null,fidget=null;
 function draw(){const a=ANIM[anim];avatar.style.backgroundPosition=`${-frame*96}px ${-a.row*104}px`;}
 // Still idle pose; every 8–14 s one slow idle gesture, then still again.
 function still(){anim='idle';frame=0;clearInterval(timer);draw();clearTimeout(fidget);if(!reduced)fidget=setTimeout(()=>play('idle'),8000+Math.random()*6000);}
 function play(name,after){
  clearTimeout(fidget);anim=name;frame=0;clearInterval(timer);draw();const a=ANIM[name];if(reduced)return;
  // Once-only gestures end back in the still pose (or the given follow-up), never in a busy loop.
  timer=setInterval(()=>{if(frame<a.frames-1)frame++;else if(a.once){clearInterval(timer);if(after&&after!=='idle')play(after);else if(name!=='sleep')still();return;}else frame=0;draw();},1000/a.fps);
 }
 function rest(){clearTimeout(idleTimer);idleTimer=setTimeout(()=>play('sleep'),90000);}

 // --- Chat --------------------------------------------------------------------------------------------------
 const add=(cls,text)=>{const d=document.createElement('div');d.className='msg '+cls;d.textContent=text;log.append(d);log.scrollTop=log.scrollHeight;return d;};
 function suggestions(){
  const box=document.createElement('div');box.className='chips';
  for(const s of ['Fundido de 1 s entre el clip 1 y el 2','Dale aire de película antigua al seleccionado','Quita el ruido del audio del seleccionado','¿Cómo pongo una transición a mano?']){const b=document.createElement('button');b.type='button';b.textContent=s;b.onclick=()=>{input.value=s;form.requestSubmit();};box.append(b);}
  log.append(box);
 }
 function greet(){log.textContent='';add('bot','¡Hola! Soy Qbit. Puedo poner transiciones, efectos de vídeo y audio y fundidos en tu proyecto, o explicarte cómo se hace algo. Siempre te enseño lo que voy a cambiar antes de hacerlo.');suggestions();}
 const selection=()=>{try{return window.CinemaAutomation.selection();}catch{return [];}};
 let busy=false;
 function setBusy(v,label){busy=v;input.disabled=v;form.querySelector('button').disabled=v;stateLine.textContent=label||'Asistente de Cinema Studio';}
 function proposalCard(r){
  const card=document.createElement('div');card.className='proposal';
  const title=document.createElement('strong');title.textContent='Te propongo:';card.append(title);
  const ul=document.createElement('ul');for(const s of r.steps){const li=document.createElement('li');li.textContent=s;ul.append(li);}card.append(ul);
  if(r.errors.length){const w=document.createElement('p');w.className='warn';w.textContent='No puedo hacer: '+r.errors.join(' · ');card.append(w);}
  const row=document.createElement('div');row.className='row';
  const no=document.createElement('button');no.type='button';no.textContent='Descartar';
  const yes=document.createElement('button');yes.type='button';yes.className='primary';yes.textContent='Aplicar';
  row.append(no,yes);card.append(row);log.append(card);log.scrollTop=log.scrollHeight;yes.focus();
  const finish=(text,cls='done')=>{row.remove();const p=document.createElement('p');p.className=cls;p.textContent=text;card.append(p);input.focus();};
  no.onclick=()=>{finish('Descartado');still();};
  yes.onclick=async()=>{yes.disabled=no.disabled=true;try{await window.lqtacDesktop.qbitApply(r.id);finish('✓ Aplicado · Ctrl+Z lo deshace');play('happy','idle');}catch(e){finish(clean(e),'warn');play('look','idle');}};
 }
 const clean=e=>String(e?.message||e).replace(/^Error invoking remote method '[^']+': (Error: )?/,'');
 form.onsubmit=async e=>{
  e.preventDefault();const question=input.value.trim();if(!question||busy)return;
  input.value='';add('user',question);rest();setBusy(true,'Pensando…');play('think');
  try{
   const r=await window.lqtacDesktop.qbitAsk({question,selection:selection()});
   if(r.id){if(r.intent!=='editar'||!r.steps.length)add('bot',r.reply);proposalCard(r);play('explain');}
   else{
    let text=r.reply||'No he entendido la petición.';if(r.errors?.length)text+=(r.reply?'\n':'')+'No puedo hacerlo: '+r.errors.join(' · ');
    add('bot'+(r.errors?.length&&!r.reply?' error':''),text);play(r.intent==='fuera_de_tema'?'look':'talk',r.intent==='fuera_de_tema'?'idle':undefined);
   }
  }catch(err){add('bot error',clean(err));play('look','idle');}
  finally{setBusy(false);input.focus();}
 };
 $q('#qbitNew').onclick=async()=>{await window.lqtacDesktop.qbitReset();greet();play('wave','idle');input.focus();};
 $q('#qbitClose').onclick=()=>{panel.classList.remove('open');railButton?.classList.remove('active');railButton?.setAttribute('aria-pressed','false');clearInterval(timer);clearTimeout(idleTimer);clearTimeout(fidget);};
 panel.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.stopPropagation();$q('#qbitClose').click();return;}
  // The editor ignores Ctrl+Z/Y while typing; with nothing typed here they undo/redo the project ("Ctrl+Z lo deshace").
  const key=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&!e.altKey&&(key==='z'||key==='y')&&!input.value){e.preventDefault();e.stopPropagation();if(!historyBusy&&!exporting)void navigateHistory(key==='y'||e.shiftKey);}
 });

 // Drag by the header.
 (()=>{const head=$q('header');let start=null;head.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;const r=panel.getBoundingClientRect();start={x:e.clientX,y:e.clientY,left:r.left,top:r.top};head.setPointerCapture(e.pointerId);});
  head.addEventListener('pointermove',e=>{if(!start)return;const left=Math.min(innerWidth-120,Math.max(0,start.left+e.clientX-start.x)),top=Math.min(innerHeight-60,Math.max(0,start.top+e.clientY-start.y));Object.assign(panel.style,{left:left+'px',top:top+'px',right:'auto',bottom:'auto'});});
  head.addEventListener('pointerup',()=>{start=null;});})();

 // --- Opening -----------------------------------------------------------------------------------------------
 // Not installed: offer the download from the project's GitHub releases (installs next to the program).
 const gb=n=>(n/1e9).toLocaleString('es-ES',{maximumFractionDigits:1})+' GB';
 async function installOffer(broken){
  log.textContent='';input.disabled=true;form.querySelector('button').disabled=true;stateLine.textContent='No instalado';greeted=false;
  add('bot',(broken?'Mi instalación está incompleta y hay que repetirla. ':'')+'Soy un módulo opcional: funciono en tu equipo, sin conexión y sin enviar nada fuera. Primero tengo que descargarme.');
  const card=document.createElement('div');card.className='proposal';card.innerHTML='<strong>Instalar Qbit</strong><p class="info" style="margin:6px 0 10px">Buscando la última versión…</p><progress max="1" value="0" style="width:100%;display:none"></progress><div class="row"><button type="button" class="cancel" hidden>Cancelar</button><button type="button" class="primary go" disabled>Instalar</button></div>';
  log.append(card);
  const info=card.querySelector('.info'),bar=card.querySelector('progress'),go=card.querySelector('.go'),cancel=card.querySelector('.cancel');
  let release;
  try{release=await window.lqtacDesktop.qbitCheck();}catch(e){info.textContent='No he podido consultar GitHub: '+clean(e);return;}
  if(!release.available){info.textContent=release.reason;return;}
  if(!release.compatible){info.textContent=`Qbit ${release.version} necesita Cinema Studio ${release.minAppVersion} o superior. Actualiza el programa primero.`;return;}
  info.textContent=`Versión ${release.version} · descarga de ${gb(release.size)} · se instala en la carpeta del programa, así que viaja con él si lo copias.`;go.disabled=false;go.focus();
  go.onclick=async()=>{
   go.disabled=true;cancel.hidden=false;bar.style.display='block';play('think');
   const off=window.lqtacDesktop.onQbitProgress(p=>{
    if(p.phase==='download'){bar.value=p.received/p.total;info.textContent=`Descargando… ${gb(p.received)} de ${gb(p.total)}`;}
    else if(p.phase==='extract'){bar.removeAttribute('value');info.textContent='Descomprimiendo…';cancel.hidden=true;}
    else if(p.phase==='activate')info.textContent='Activando…';
   });
   try{await window.lqtacDesktop.qbitInstall();off();play('happy','idle');await open();}
   catch(e){off();bar.style.display='none';cancel.hidden=true;go.disabled=false;info.textContent=clean(e);play('look','idle');}
  };
  cancel.onclick=()=>{cancel.disabled=true;window.lqtacDesktop.qbitCancel();};
 }
 let greeted=false;
 async function open(){
  panel.classList.add('open');railButton?.classList.add('active');railButton?.setAttribute('aria-pressed','true');
  const s=await window.lqtacDesktop.qbitStatus();
  avatar.style.backgroundImage=`url("${s.sprite||'assets/qbit-spritesheet.webp'}")`;
  if(!s.installed){if(!s.busy)await installOffer(s.broken);still();return;}
  if(!greeted){greet();greeted=true;}
  play('wave','idle');rest();
  if(s.state!=='ready'){
   setBusy(true,'Despertando…');
   try{await window.lqtacDesktop.qbitStart();}catch(e){add('bot error','No he podido arrancar: '+clean(e));setBusy(false,'Detenido');input.disabled=true;return;}
   setBusy(false);
  }
  input.focus();
 }
 // Shortcut in the side rail, right above the manual (?) button: same 38 px button as its neighbours; toggles the panel.
 const railHelp=document.querySelector('#railManual')||document.querySelector('.rail [title="Ayuda"]');let railButton=null;
 if(railHelp){railButton=document.createElement('button');railButton.type='button';railButton.className='icon-btn qbit-rail';railButton.title='Asistente Qbit';railButton.setAttribute('aria-label','Asistente Qbit');railButton.setAttribute('aria-pressed','false');railButton.innerHTML='<img src="assets/qbit-button.png" alt="">';
  railButton.onclick=()=>panel.classList.contains('open')?$q('#qbitClose').click():void open();railHelp.before(railButton);}
 helpMenu.prepend(studioCommand('Asistente Qbit…',open,()=>true,'',{'data-help':'qbit'}));
 window.LQTACQbit={open,panel};
})();
