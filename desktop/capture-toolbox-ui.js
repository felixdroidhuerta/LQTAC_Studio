const $=id=>document.getElementById(id);let current={};
const positions=[...document.querySelectorAll('[data-position]')];
for(const id of ['record','stop','pause','snapshot','return'])$(id).onclick=()=>void action(id);
for(const id of ['microphone','system','camera'])$(id).onclick=()=>void action(id,!current[id+'Muted']);
for(const button of positions){
  button.onclick=()=>void action('position',button.dataset.position);
  // Labels live in the protected page; no native tooltip or popup window.
  button.onpointerenter=button.onfocus=()=>$('positionName').textContent=button.getAttribute('aria-label');
  button.onpointerleave=button.onblur=()=>updatePositionName();
}
function updatePositionName(){$('positionName').textContent=positions.find(b=>b.dataset.position===current.position)?.getAttribute('aria-label')||'Abajo derecha';}
$('size').oninput=()=>{$('sizeValue').textContent=$('size').value+' %';void action('size',Number($('size').value));};
async function action(id,value){try{await window.captureControls.action(id,value);}catch(e){$('status').textContent=e.message;}}
window.captureControls.onState(s=>{
  current=s;const active=['recording','paused'].includes(s.state),ready=s.state==='ready',paused=s.state==='paused';
  document.body.dataset.state=s.state;
  $('stateName').textContent=paused?'EN PAUSA':s.state==='recording'?'GRABANDO':ready?'LISTO PARA GRABAR':'PROCESANDO';
  $('clock').textContent=new Date(Math.max(0,s.elapsed||0)*1000).toISOString().slice(11,19);
  $('record').disabled=!ready;$('stop').disabled=!active;$('pause').disabled=!active;
  $('pause').setAttribute('aria-label',paused?'Continuar grabación':'Pausar grabación');
  $('pauseIcon').innerHTML=paused?'<path d="M8 5l11 7-11 7z"/>':'<path d="M8 5v14M16 5v14"/>';
  $('snapshot').disabled=!(active||ready);$('status').textContent=s.status||s.state;
  for(const id of ['microphone','system','camera']){
    const available=s[id+'Available'],muted=s[id+'Muted'],on=available&&!muted;
    $(id).disabled=!available||!(active||ready);$(id).classList.toggle('active',on);$(id).setAttribute('aria-pressed',String(on));
    $(id+'State').textContent=!available?'No incluido':muted?'Apagado':'Activo';
    if(id!=='camera'){const value=Math.min(1,Math.max(0,s.levels?.[id]||0));$(id+'Level').firstElementChild.style.transform='scaleX('+value+')';$(id+'Level').setAttribute('aria-valuenow',Math.round(value*100));}
  }
  const positionDisabled=!s.cameraAvailable||s.cameraMode!=='embedded'||!(active||ready);
  $('size').disabled=positionDisabled;
  for(const button of positions){button.disabled=positionDisabled;button.setAttribute('aria-pressed',String(button.dataset.position===(s.position||'bottom-right')));}
  if(!positions.some(b=>b.matches(':hover,:focus-visible')))updatePositionName();
  $('size').value=s.size||25;$('sizeValue').textContent=$('size').value+' %';
  $('cameraSection').hidden=!s.cameraAvailable;$('cameraMode').textContent=s.cameraMode==='embedded'?'· Integrada':'· Separada';
  $('positionHint').textContent=s.cameraMode==='separate'?'Posición editable en el proyecto':'Posición en pantalla';
  $('preview').hidden=!s.cameraPreview;$('noPreview').hidden=!!s.cameraPreview;if(s.cameraPreview)$('preview').src=s.cameraPreview;
});
