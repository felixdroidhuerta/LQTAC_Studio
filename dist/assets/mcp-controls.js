// Fixed automation commands, shared composition path with the interactive editor.
(()=>{
 const canonical=p=>JSON.stringify({...p,time:0,zoom:0,zoomStart:0});
 function assertIdle(){if(exporting||historyBusy||newProjectBusy||document.querySelector('dialog[open]')||modal.classList.contains('open')||compatModal.classList.contains('open'))throw Error('Cierra el diálogo o finaliza la operación del editor antes de controlar el proyecto');return true;}
 window.CinemaAutomation={
  async snapshot(){await demoReady;return projectSnapshot();},
  assertIdle,
  status:()=>({exporting,historyBusy,time:timelineTime,undo:undoHistory.length,redo:redoHistory.length,renderProgress:Number($('#renderProgress').value)}),
  transitions:()=>LQTACTransitions.catalog.map(({id,name})=>({id,name})),
  // Selected clips as cinema_edit refs (trackId:index, same order as projectSnapshot).
  selection:()=>$$('.track').flatMap(track=>timelineClips().filter(c=>c.parentElement===track).map((c,i)=>c.classList.contains('selected')?track.dataset.track+':'+i:null)).filter(Boolean),
  async apply({project,expected}){
   await demoReady;assertIdle();const previous=projectSnapshot();if(canonical(previous)!==expected)throw Error('El proyecto cambió durante la operación. Lee cinema_project y vuelve a intentarlo');
   const undo=[...undoHistory],redo=[...redoHistory];stopTimelinePlayback();historyCheckpoint();historyBusy=true;$('.workspace').inert=true;
   try{await restoreProject(project);toast('Proyecto actualizado mediante MCP local');}
   catch(e){await restoreProject(previous);undoHistory.splice(0,undoHistory.length,...undo);redoHistory.splice(0,redoHistory.length,...redo);throw e;}
   finally{historyBusy=false;$('.workspace').inert=false;updateHistoryButtons();}
   return true;
  },
  async history({redo}){assertIdle();await navigateHistory(!!redo);return true;},
  async preview({time,width,height}){
   assertIdle();stopTimelinePlayback();const previous=timelineTime;exportSize={width,height};exporting=true;$('.workspace').inert=true;
   try{await LQTACAiMatte.prepareForProject();await LQTACAiMatte.prepareFrame(time);return await captureProjectFrame(time,width,height);}
   finally{exporting=false;exportSize=null;$('.workspace').inert=false;await renderTimelineAt(previous);}
  },
  async cancel(){cancelExport=true;await window.lqtacDesktop.renderCancel();return true;},
  async render({profile,width,height,fps,output,ticket}){
   assertIdle();await demoReady;stopTimelinePlayback();const previous=timelineTime;exporting=true;cancelExport=false;exportSize={width,height};$('.workspace').inert=true;
   $('#renderProgress').value=0;$('#renderStatus').textContent='Render MCP · preparando…';
   try{
    await LQTACAiMatte.prepareForProject();if(cancelExport)throw Error('Render MCP cancelado');const result=await window.lqtacDesktop.renderStart({project:projectSnapshot(),profile,width,height,fps,automationTicket:ticket,output});
    if(cancelExport)throw Error('Render MCP cancelado');
    if(result.canceled)throw Error('Render MCP cancelado');
    if(result.video){const frames=Math.ceil(result.duration*fps);for(let i=0;i<frames;i++){if(cancelExport)throw Error('Render MCP cancelado');const t=(result.startSeconds||0)+i/fps;await LQTACAiMatte.prepareFrame(t);await window.lqtacDesktop.renderFrame(await captureProjectFrame(t,width,height));$('#renderProgress').value=(i+1)/frames;$('#renderStatus').textContent='Render MCP · '+Math.round((i+1)/frames*100)+' %';}}
    const saved=await window.lqtacDesktop.renderFinish();$('#renderProgress').value=1;$('#renderStatus').textContent='Render MCP finalizado · '+saved.output;toast('Render MCP finalizado');return saved;
   }catch(e){await window.lqtacDesktop.renderCancel();throw e;}
   finally{exporting=false;exportSize=null;$('.workspace').inert=false;await renderTimelineAt(previous);}
  }
 };
 if(!window.lqtacDesktop?.mcpStatus)return;
 const panelStyle=document.createElement('style');
 panelStyle.textContent='#mcpDialog button{font:inherit;font-weight:650;min-height:40px;padding:9px 16px;border:1px solid #54769d;border-radius:9px;background:#193b5d;color:#f2f6ff;cursor:pointer}#mcpDialog button:hover{background:#254d75;border-color:#8bb7ff}#mcpDialog #mcpCopy{background:#6ea2ff;border-color:#6ea2ff;color:#071735}#mcpDialog #mcpCopy:hover{background:#8bb7ff;border-color:#8bb7ff}#mcpDialog button:focus-visible{outline:2px solid #9bdcff;outline-offset:3px}#mcpDialog button:disabled{background:#20354e;color:#aabbd0;cursor:default}';
 document.head.append(panelStyle);
 const dialog=document.createElement('dialog');dialog.id='mcpDialog';dialog.style.cssText='width:min(760px,90vw);background:#102545;color:#e7f0ff;border:1px solid #436389;border-radius:16px;padding:24px;';
 dialog.innerHTML='<h2>Control MCP local</h2><p>Permite a un asistente (Claude, Codex u otro cliente MCP) usar el programa que ves en pantalla: montaje, efectos, generadores, herramientas, exportaciones y el resto de menús y paneles. Cinema Studio debe estar abierto. Los medios se procesan en este equipo; el cliente de IA puede recibir el texto, las vistas previas y las capturas de esta ventana que solicite.</p><label style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="mcpEnabled"> Permitir control mediante MCP</label><label style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="mcpRecording"> Permitir grabación de pantalla mediante MCP (ver pantallas y ventanas, grabarlas entera o por zonas)</label><p style="font-size:.9em;color:#aac4e8">Mientras graba se muestra la Toolbox flotante para que puedas detenerla. Los permisos de cámara y micrófono de Windows siempre los contestas tú.</p><p id="mcpConnectionStatus" role="status"></p><label style="display:flex;gap:10px;align-items:center">Configuración para <select id="mcpClient" class="ghost-btn" style="background:#10213b"><option value="claude">Claude Code (comando)</option><option value="claudeJson">Claude Desktop / .mcp.json (JSON)</option><option value="codex">Codex (config.toml)</option><option value="json">Otros clientes MCP (JSON)</option></select></label><textarea id="mcpConfiguration" readonly style="width:100%;height:180px;background:#07172c;color:#b9d7ff;resize:vertical"></textarea><p id="mcpConfigPath" style="overflow-wrap:anywhere"></p><div style="display:flex;gap:12px;justify-content:flex-end"><button id="mcpCopy">Copiar configuración</button><button id="mcpClose">Cerrar</button></div>';
 document.body.append(dialog);
 const checkbox=dialog.querySelector('#mcpEnabled'),recording=dialog.querySelector('#mcpRecording'),status=dialog.querySelector('#mcpConnectionStatus'),config=dialog.querySelector('#mcpConfiguration'),client=dialog.querySelector('#mcpClient');
 let clientConfig=null;
 const describe=s=>s.enabled?'Activo · conexión local disponible'+(s.recordingAllowed?' · grabación permitida':''):'Desactivado';
 checkbox.onchange=async()=>{checkbox.disabled=true;try{const s=await window.lqtacDesktop.mcpEnable(checkbox.checked);checkbox.checked=s.enabled;status.textContent=describe(s);}catch(e){checkbox.checked=!checkbox.checked;status.textContent=e.message;}finally{checkbox.disabled=false;}};
 recording.onchange=async()=>{recording.disabled=true;try{const s=await window.lqtacDesktop.mcpRecording(recording.checked);recording.checked=s.recordingAllowed;status.textContent=describe(s);}catch(e){recording.checked=!recording.checked;status.textContent=e.message;}finally{recording.disabled=false;}};
 function showClient(){if(!clientConfig)return;const c=clientConfig,v=client.value;
  config.value=v==='claude'?c.claudeCommand+'\n\n# Después, en Claude Code: /mcp para comprobar la conexión.':v==='claudeJson'?JSON.stringify(c.claudeJson,null,2):v==='codex'?c.codex:JSON.stringify(c.configuration,null,2);
  dialog.querySelector('#mcpConfigPath').textContent=v==='codex'?'Guardado también en '+c.codexFilePath:'Guardado también en '+c.filePath;}
 client.onchange=showClient;
 dialog.querySelector('#mcpCopy').onclick=async()=>{try{await navigator.clipboard.writeText(config.value);status.textContent='Configuración copiada';}catch{config.select();document.execCommand('copy');}};
 dialog.querySelector('#mcpClose').onclick=()=>dialog.close();
 async function open(){const s=await window.lqtacDesktop.mcpStatus();clientConfig=await window.lqtacDesktop.mcpConfig();checkbox.checked=s.enabled;recording.checked=!!s.recordingAllowed;status.textContent=describe(s);showClient();dialog.showModal();}
 optionsMenu.append(studioCommand('Control MCP local…',open,()=>!exporting&&!historyBusy,'',{'data-mcp-control':'open'}));
})();
