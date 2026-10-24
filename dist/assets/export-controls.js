$('#renderProfile').append(new Option('GIF animado · sin audio','gif'));
for(const fps of [10,15])$('#renderFps').append(new Option(String(fps),String(fps)));
const gifNotice=document.createElement('p');gifNotice.id='gifNotice';gifNotice.hidden=true;gifNotice.textContent='GIF no contiene audio y tiene una paleta de hasta 256 colores por fotograma. Para archivos manejables usa montajes cortos, 640 × 360 y 10–15 fps. Se exporta todo el proyecto.';$('#renderVideoOptions').after(gifNotice);
$('#renderProfile').addEventListener('change',()=>{gifNotice.hidden=$('#renderProfile').value!=='gif';});
function openGifExport(){openRenderDialog();$('#renderProfile').value='gif';$('#renderResolution').value='640,360';$('#renderFps').value='15';$('#renderProfile').dispatchEvent(new Event('change'));}
const stillDialog=document.createElement('dialog');stillDialog.id='stillDialog';stillDialog.className='work-dialog';stillDialog.style.width='min(540px,90vw)';stillDialog.innerHTML='<h2>Exportar fotograma</h2><p>Guarda la composición del proyecto en la posición del cabezal como PNG sin pérdida, con efectos, transparencias y subtítulos visibles. Ampliar la resolución no añade detalle a las fuentes.</p><label>Resolución<select id="stillResolution"><option value="1920,1080">1920 × 1080 · Full HD</option><option value="3840,2160">3840 × 2160 · 4K</option><option value="1280,720">1280 × 720</option></select></label><p id="stillStatus" role="status"></p><footer><button id="stillClose" type="button">Cerrar</button><button id="stillGo" type="button">Guardar PNG…</button></footer>';document.body.append(stillDialog);
function openStillExport(){if(exporting||historyBusy||document.querySelector('dialog[open]'))return;stopTimelinePlayback();$('#stillStatus').textContent='Posición del cabezal: '+timelineTime.toFixed(3)+' s';stillDialog.showModal();}
$('#stillClose').onclick=()=>{if(!exporting)stillDialog.close();};stillDialog.oncancel=event=>{if(exporting)event.preventDefault();};
$('#stillGo').onclick=async()=>{
  if(exporting||historyBusy)return;const previousTime=timelineTime,previousSize=exportSize;stopTimelinePlayback();exporting=true;
  $('#stillGo').disabled=$('#stillClose').disabled=$('#stillResolution').disabled=true;
  const [width,height]=$('#stillResolution').value.split(',').map(Number);exportSize={width,height};$('#stillStatus').textContent='Preparando fotograma de la composición…';
  try{await demoReady;const base64=await captureProjectFrame(previousTime,width,height);const result=await window.lqtacDesktop.exportStill({base64});$('#stillStatus').textContent=result.canceled?'Exportación cancelada.':'PNG guardado · '+result.width+' × '+result.height+' · '+result.filePath;}
  catch(error){$('#stillStatus').textContent=error.message;}
  finally{exportSize=previousSize;exporting=false;$('#stillGo').disabled=$('#stillClose').disabled=$('#stillResolution').disabled=false;await renderTimelineAt(previousTime);}
};
