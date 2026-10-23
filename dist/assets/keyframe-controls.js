// Shared point selection/deletion/precise retiming for local editors.
window.LQTACKeyframes={
  deleteMenu(event,erase){
    document.getElementById('pointDeleteMenu')?.remove();const button=document.createElement('button');button.id='pointDeleteMenu';button.type='button';button.textContent='Eliminar punto';button.style.cssText='position:fixed;z-index:10000;padding:10px;background:#183455;color:white;border:1px solid #76d8f1';button.style.left=Math.max(0,Math.min(innerWidth-170,event.clientX))+'px';button.style.top=Math.max(0,Math.min(innerHeight-50,event.clientY))+'px';document.body.append(button);
    const close=()=>{button.remove();document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape);};const dismiss=e=>{if(e.target!==button)close();},escape=e=>{if(e.key==='Escape')close();};document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape);button.onclick=()=>{erase();close();};
  },
  retime(curve,node,value,duration){
    let t=Math.max(0,Math.min(duration,value));
    for(const other of curve)if(other!==node&&Math.abs(other.time-t)<.00001)return false;
    node.time=t;curve.sort((a,b)=>a.time-b.time);return true;
  },
  install(o){
    let selected=null,finishDrag=null;const dialog=o.dialog,canvas=o.canvas,list=o.list,remove=o.remove;
    const bar=document.createElement('div');bar.className='keyframe-tools';bar.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0';
    const label=document.createElement('label');label.textContent='Tiempo del punto seleccionado (s)';const field=document.createElement('input');field.type='number';field.step='any';field.min='0';field.max=String(o.duration);field.style.width='130px';field.setAttribute('aria-label','Tiempo del punto seleccionado');label.append(field);
    const move=document.createElement('button');move.type='button';move.textContent='Mover punto';bar.append(label,move);list.after(bar);
    const help=document.createElement('p');help.textContent='Selecciona un punto o diamante. Arrástralo para moverlo; Suprimir, Eliminar punto o botón derecho → Eliminar punto lo borran.';bar.after(help);
    const menu=document.createElement('button');menu.type='button';menu.textContent='Eliminar punto';menu.hidden=true;menu.style.cssText='position:fixed;z-index:10000;padding:10px;background:#183455;color:#fff;border:1px solid #76d8f1';dialog.append(menu);
    function resolve(){const entries=o.entries();if(selected&&selected.band===o.band()&&entries.some(e=>e.point===selected.point&&e.band===selected.band))return selected;selected=entries.find(e=>e.band===o.band()&&Math.abs(e.point.time-o.time())<.00101)||null;return selected;}
    function refresh(){const entry=resolve();remove.disabled=!!o.busy?.()||!entry;move.disabled=field.disabled=remove.disabled;if(document.activeElement!==field)field.value=entry?String(Number(entry.point.time.toFixed(6))):'';}
    function select(entry){selected=entry;if(entry)o.select(entry);refresh();}
    function erase(){if(o.busy?.())return;finishDrag?.();const entry=resolve();if(!entry)return;o.erase(entry);selected=null;menu.hidden=true;refresh();}
    function hit(event){const rect=canvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;return o.entries().map(e=>({entry:e,d:Math.hypot(o.position(e,rect).x-x,o.position(e,rect).y-y)})).filter(e=>e.d<=13).sort((a,b)=>a.d-b.d||(a.entry.band===o.band()?-1:1))[0]?.entry;}
    const oldDown=canvas.onpointerdown;
    canvas.onpointerdown=event=>{
      if(o.busy?.()||event.button!==0)return;menu.hidden=true;
      if(!o.timeline){oldDown?.(event);selected=o.entries().find(e=>e.band===o.band()&&Math.abs(e.point.time-o.time())<.00101)||null;refresh();return;}
      event.preventDefault();finishDrag?.();const entry=hit(event);if(!entry){selected=null;oldDown?.(event);refresh();return;}select(entry);
      const rect=canvas.getBoundingClientRect(),startX=event.clientX,startTime=entry.point.time;
      const drag=e=>{if(Math.abs(e.clientX-startX)<2)return;const t=startTime+(e.clientX-startX)/rect.width*o.duration/0.98;if(o.retime(entry,t)){selected=entry;o.select(entry);refresh();}};
      const finish=()=>{window.removeEventListener('pointermove',drag);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);finishDrag=null;};finishDrag=finish;window.addEventListener('pointermove',drag);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);
    };
    list.onchange=list.onclick=()=>{const entry=o.entries().find(entry=>entry.band===o.band()&&Math.abs(entry.point.time-Number(list.value))<.000001);if(entry)select(entry);};
    field.oninput=()=>field.setCustomValidity('');
    remove.onclick=erase;move.onclick=()=>{const entry=resolve(),t=Number(field.value);field.setCustomValidity('');if(!entry)return;if(field.value===''||!Number.isFinite(t)||t<0||t>o.duration){field.setCustomValidity('Elige un tiempo dentro de la duración del clip.');field.reportValidity();return;}if(!o.retime(entry,t)){field.setCustomValidity('Ya existe otro punto en ese instante. Elige un tiempo distinto.');field.reportValidity();return;}selected=entry;o.select(entry);refresh();};
    const context=e=>{if(o.busy?.())return;const entry=e.currentTarget===canvas?hit(e):resolve();if(!entry)return;e.preventDefault();e.stopPropagation();select(entry);menu.style.left=Math.max(0,Math.min(innerWidth-170,e.clientX))+'px';menu.style.top=Math.max(0,Math.min(innerHeight-50,e.clientY))+'px';menu.hidden=false;};canvas.addEventListener('contextmenu',context);list.addEventListener('contextmenu',context);menu.onclick=erase;
    const key=e=>{const typing=e.target.matches('input,textarea,[contenteditable=true]');if((e.key==='Delete'||e.key==='Backspace')&&!typing){e.preventDefault();e.stopImmediatePropagation();erase();}if(e.key==='Escape')menu.hidden=true;};dialog.addEventListener('keydown',key,true);
    const dismiss=e=>{if(e.target!==menu)menu.hidden=true;};dialog.addEventListener('pointerdown',dismiss);
    const close=()=>{finishDrag?.();dialog.removeEventListener('keydown',key,true);dialog.removeEventListener('pointerdown',dismiss);};dialog.addEventListener('close',close,{once:true});
    refresh();return {refresh,erase,select};
  }
};
