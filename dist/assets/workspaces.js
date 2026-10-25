// Task layouts are UI preferences; they never enter the project snapshot/history.
(function(){
const workspace=$('.workspace'),side=$('.side-panel'),rail=$('.rail'),body=$('.timeline-body');
const modes={edit:{name:'Montaje',ratio:.5,columns:'2fr 1fr'},audio:{name:'Audio',ratio:.38,columns:'4fr 1fr'},color:{name:'Color',ratio:.66,columns:'1fr 1.5fr'},text:{name:'Texto',ratio:.66,columns:'1fr 1.2fr'}};
let current='edit',layouts={},signature='',lastScope=0;const analyzers=new WeakMap();
const css=document.createElement('style');css.textContent=`
.workspace-banner{display:flex;align-items:center;gap:8px;margin-left:auto;font-size:10px;white-space:nowrap;color:var(--cyan)}.workspace-banner button{padding:4px 7px;min-height:24px;border:1px solid var(--line);border-radius:5px;background:#102747;color:var(--muted);font:inherit;cursor:pointer}
.task-panel h2{margin:8px 0 10px}.task-panel p{font-size:12px;color:var(--muted);line-height:1.5}.task-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.task-toolbar button,.mixer-strip button{background:#142c4c;border:1px solid var(--line);color:var(--text);padding:7px 10px;border-radius:6px;cursor:pointer}
#workspaceMixer{display:flex;gap:12px;overflow:auto;padding-bottom:10px}.mixer-strip{flex:0 0 170px;padding:12px;border:1px solid var(--line);border-radius:9px;background:#0c203c}.mixer-strip h3{font-size:12px;margin:0 0 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mixer-strip label{display:block;font-size:11px;color:var(--muted);margin:12px 0 4px}.mixer-strip input{width:100%;padding:0}.mixer-strip output{float:right;color:var(--text)}.mixer-strip meter{display:block;width:100%;height:12px}.mixer-strip button[aria-pressed=true]{background:#28518a;border-color:var(--cyan)}.mixer-strip .mixer-buttons{display:flex;gap:6px;flex-wrap:wrap}
#workspaceScope{width:100%;height:115px;background:#061329;border:1px solid var(--line);border-radius:6px}.color-tools{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.color-tools button{text-align:left;padding:12px;background:#142c4c;color:var(--text);border:1px solid var(--line);border-radius:6px;cursor:pointer}.color-tools button:hover{border-color:var(--cyan)}
.workspace[data-space=audio] .track,.workspace[data-space=audio] .track-label{height:88px}.workspace[data-space=audio] .track .clip{top:16px;height:55px}.workspace[data-space=audio] .envelope-layer{top:15px}
.workspace[data-space=color] .monitor,.workspace[data-space=text] .monitor{margin-top:68px}.workspace[data-space=color] .center-head,.workspace[data-space=text] .center-head{margin-top:42px}.workspace[data-space=color] .edit-toolbar,.workspace[data-space=text] .edit-toolbar{display:none}
.workspace[data-space=audio] .monitor-stat{font-size:9px}.workspace[data-space=audio] .edit-toolbar{display:none}.workspace[data-space=audio] .center-head{margin-top:10px}.workspace[data-space=audio] .monitor{margin-top:55px}
.workspace[data-space] .monitor{display:flex;flex-direction:column}.workspace[data-space] .monitor-screen{flex:1;min-height:0;height:auto}.workspace[data-space] .monitor-head,.workspace[data-space] .monitor-controls{flex-shrink:0}
.workspace[data-space=audio] .center-head h1{font-size:18px;white-space:nowrap}.workspace[data-space=audio] .center-head p,.workspace[data-space=audio] .head-meta,.workspace[data-space=audio] .monitor-head,.workspace[data-space=audio] .monitor-stat,.workspace[data-space=audio] .scrub{display:none}.workspace[data-space=color] .center-head p,.workspace[data-space=text] .center-head p{display:none}
.workspace[data-space=audio] .mixer-strip{padding:9px}.workspace[data-space=audio] .mixer-strip label{margin-top:8px}
.mixer-strip meter::-webkit-meter-bar{background:#061329;border:1px solid var(--line);border-radius:4px}.mixer-strip meter::-webkit-meter-optimum-value{background:linear-gradient(90deg,#79e5f5,#b9f28c);border-radius:3px}
.workspace[data-space=audio] .task-panel h2{font-size:20px;margin:4px 0 8px}.workspace[data-space=audio] .task-toolbar{margin-bottom:8px}.workspace[data-space=audio] .task-toolbar button,.workspace[data-space=audio] .mixer-buttons button{font-size:12px;padding:6px 9px;min-height:28px}.workspace[data-space=audio] .mixer-strip label{margin-top:6px}.workspace[data-space=audio] .mixer-strip input{height:16px;margin:0}.workspace[data-space=audio] .mixer-strip meter{height:10px}
`;document.head.append(css);
const banner=document.createElement('span');banner.className='workspace-banner';banner.innerHTML='<span id="workspaceName"></span><button type="button" id="workspaceReset" title="Restaurar la distribución predeterminada de este espacio">Restablecer</button>';
$('.timeline-tabs').append(banner);$('.timeline-tabs').style.display='flex';$('.timeline-tabs').style.alignItems='center';
const mixer=document.createElement('section');mixer.id='audioWorkspacePanel';mixer.className='task-panel';mixer.hidden=true;mixer.innerHTML='<div class="eyebrow">ESPACIO DE AUDIO</div><h2>Mezcla por pistas</h2><div class="task-toolbar"><button type="button" id="workspaceRecord">Grabar audio…</button><button type="button" id="workspaceAudioFX">FX del clip seleccionado…</button></div><div id="workspaceMixer"></div><p id="workspaceAudioHint">Volumen y balance actúan sobre la pista completa. Los medidores muestran picos aproximados durante la reproducción.</p>';side.append(mixer);
const color=document.createElement('section');color.id='colorWorkspacePanel';color.className='task-panel';color.hidden=true;color.innerHTML='<div class="eyebrow">ESPACIO DE COLOR</div><h2>Imagen y corrección</h2><p id="workspaceColorTarget"></p><canvas id="workspaceScope" width="512" height="120" aria-label="Histograma RGB aproximado del monitor"></canvas><p id="workspaceScopeStatus">Histograma RGB aproximado de la vista previa.</p><div class="color-tools"></div>';side.append(color);
for(const [key,label] of [['brightness','Brillo y contraste'],['temperature','Balance de color'],['saturation','Saturación'],['lut','LUT 3D'],['chroma','Croma'],['vignette','Viñeta']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.workspaceFx=key;b.onclick=()=>{const clip=effectsTarget('video');if(clip)openEffectEditor(clip,key);else toast('Selecciona un clip de vídeo en el timeline');};$('.color-tools',color).append(b);}
const textTools=document.createElement('div');textTools.className='task-toolbar';textTools.innerHTML='<button type="button" id="workspaceEditText">Editar texto seleccionado…</button><button type="button" id="workspaceSubtitles">Subtítulos y karaoke</button>';$('#generatorsPanel').insertBefore(textTools,$('#generatorCatalog'));
$('#workspaceRecord').onclick=()=>void openMicrophoneRecorder();
$('#workspaceAudioFX').onclick=()=>{const clip=effectsTarget('audio');if(clip)openAnimatedAudioEditor(clip,'bass');else toast('Selecciona un clip de audio en el timeline');};
$('#workspaceEditText').onclick=()=>{const clip=selectedTimelineClip;if(clip?.dataset.generator)void LQTACGenerators.edit(JSON.parse(clip.dataset.generator).type,clip);else if(clip?.dataset.kind==='subtitle')openSubtitleEditor(clip);else toast('Selecciona un título generado o un subtítulo');};
$('#workspaceSubtitles').onclick=()=>subtitleDock.click();
function canSwitch(){return !exporting&&!historyBusy&&!effectsBusy&&!document.querySelector('dialog[open]')&&!modal.classList.contains('open')&&!compatModal.classList.contains('open')&&!workspace.classList.contains('resizing')&&!document.body.classList.contains('reordering-track');}
function showPanel(panel){LQTACWorkspace.show('media');[...side.children].forEach(c=>c.hidden=c!==panel);$$('.dock-panel-item').forEach(b=>b.classList.remove('active'));}
function geometry(){
 const dock=innerWidth<=1280?180:200;
 workspace.style.gridTemplateColumns=`58px ${dock}px minmax(0,${modes[current].columns.split(' ')[0]}) minmax(${current==='audio'?'260px':'0'},${modes[current].columns.split(' ')[1]}) 0px`;
 const max=workspace.clientHeight-28,minTop=current==='audio'?220:250,minBottom=250;
 const preferred=layouts[current]?.ratio??modes[current].ratio,top=Math.max(minTop,Math.min(max-minBottom,max*preferred));
 workspace.style.gridTemplateRows=`${Math.round(top)}px minmax(0,1fr) 28px`;
 window.LQTACTimelineVisuals?.refresh();
}
function activate(id,reset=false){
 if(!modes[id]||!canSwitch())return false;
 if(current&&workspace.dataset.space&&!reset){const h=workspace.clientHeight-28,top=parseFloat(getComputedStyle(workspace).gridTemplateRows);layouts[current]={ratio:top/h,scroll:body.scrollTop};}
 if(reset)delete layouts[id];current=id;workspace.dataset.space=id;
 for(const b of rail.querySelectorAll('[data-space]')){b.classList.toggle('active',b.dataset.space===id);b.setAttribute('aria-pressed',String(b.dataset.space===id));}
 $('#workspaceName').textContent='Espacio · '+modes[id].name;
 geometry();
 if(id==='audio'){showPanel(mixer);refreshMixer();}
 else if(id==='color')showPanel(color);
 else LQTACWorkspace.show(id==='text'?'generators':'media');
 body.scrollTop=layouts[id]?.scroll||0;
 if(!playing)void renderTimelineAt(timelineTime);return true;
}
for(const [title,id] of [['Editor','edit'],['Audio','audio'],['Color','color'],['Texto','text']]){const b=$(`[title="${title}"]`,rail);b.dataset.space=id;b.title='Espacio de trabajo · '+modes[id].name;b.setAttribute('aria-label',b.title);b.onclick=()=>activate(id);}
// Transitions remain in Ventanas; the rail now exclusively switches task layouts.
$('[title="Transiciones"]',rail)?.remove();
$('#workspaceReset').onclick=()=>activate(current,true);
function refreshMixer(){
 const tracks=$$('.track').filter(t=>t.dataset.kind==='audio');const stamp=JSON.stringify(tracks.map(t=>[t.dataset.track,$$('#trackLabels .track-label strong')[$$('.track').indexOf(t)]?.textContent]));if(stamp===signature)return;signature=stamp;
 const list=$('#workspaceMixer');list.replaceChildren();
 if(!tracks.length){const p=document.createElement('p');p.textContent='Añade una pista de audio desde Insertar o importa un vídeo con sonido.';list.append(p);return;}
 for(const track of tracks){
  const strip=document.createElement('article');strip.className='mixer-strip';strip.dataset.track=track.dataset.track;strip.innerHTML='<h3></h3><meter min="0" max="1" value="0" aria-label="Pico de audio"></meter><div class="mixer-buttons"><button type="button" data-mix="mute">M</button><button type="button" data-mix="solo">S</button><button type="button" data-mix="properties">⚙</button></div><label>Volumen <output data-value="gain"></output><input data-mix="gain" type="range" min="0" max="4" step="0.01"></label><label>Balance <output data-value="pan"></output><input data-mix="pan" type="range" min="-1" max="1" step="0.01"></label>';
  $('h3',strip).textContent=$$('#trackLabels .track-label strong')[$$('.track').indexOf(track)]?.textContent||track.dataset.track;
  for(const key of ['mute','solo']){const b=$(`[data-mix=${key}]`,strip);b.title=key==='mute'?'Silenciar pista':'Solo de pista';b.setAttribute('aria-label',b.title);b.onclick=()=>{if(!canSwitch()||!track.isConnected)return;historyCheckpoint();track.dataset[key]=String(track.dataset[key]!=='true');syncTrackHeaders();void renderTimelineAt(timelineTime);syncMixer();};}
  $('[data-mix=properties]',strip).title='Propiedades de pista';$('[data-mix=properties]',strip).onclick=()=>openWorkControls(track);
  for(const key of ['gain','pan']){const input=$(`[data-mix=${key}]`,strip);let recorded=false;input.oninput=()=>{if(!canSwitch()||!track.isConnected)return;if(!recorded){historyCheckpoint();recorded=true;}track.dataset[key]=input.value;syncTrackHeaders();void renderTimelineAt(timelineTime);syncMixer();};input.onchange=input.onblur=()=>{recorded=false;};}
  strip.track=track;list.append(strip);
 }syncMixer();
}
function syncMixer(){for(const strip of $$('.mixer-strip',mixer)){const track=strip.track;if(!track.isConnected){signature='';continue;}for(const key of ['mute','solo'])$(`[data-mix=${key}]`,strip).setAttribute('aria-pressed',String(track.dataset[key]==='true'));for(const key of ['gain','pan']){const value=Number(track.dataset[key]??(key==='gain'?1:0)),input=$(`[data-mix=${key}]`,strip);if(document.activeElement!==input)input.value=value;$(`[data-value=${key}]`,strip).textContent=key==='gain'?Math.round(value*100)+'%':value===0?'Centro':(value<0?'I ':'D ')+Math.round(Math.abs(value)*100)+'%';}}}
function meter(){
 for(const strip of $$('.mixer-strip',mixer)){let peak=0;for(const [clip,media] of timelineAudioPool){if(clip.parentElement!==strip.track||media.paused||!playing)continue;const graph=audioGraphs.get(media);if(!graph)continue;let entry=analyzers.get(graph);if(!entry){const node=workAudioContext.createAnalyser();node.fftSize=256;graph.merge.connect(node);entry={node,data:new Float32Array(256)};analyzers.set(graph,entry);}entry.node.getFloatTimeDomainData(entry.data);peak+=Math.max(...entry.data.map(Math.abs));}$('meter',strip).value=Math.min(1,peak);}
}
const sample=document.createElement('canvas');sample.width=128;sample.height=72;
function scope(){
 const clip=effectsTarget('video');$('#workspaceColorTarget').textContent=clip?'Clip seleccionado · '+clip.firstChild.textContent:'Selecciona un clip de vídeo para editar su color.';
 const ctx=sample.getContext('2d',{willReadFrequently:true});ctx.globalAlpha=1;ctx.fillStyle='#000';ctx.fillRect(0,0,128,72);let count=0;
 const surfaces=[...document.querySelectorAll('.monitor-screen canvas,.monitor-screen video')].filter(n=>getComputedStyle(n).display!=='none'&&Number(getComputedStyle(n).opacity)>0).sort((a,b)=>Number(getComputedStyle(a).zIndex)-Number(getComputedStyle(b).zIndex));
 for(const n of surfaces){if(n.tagName==='VIDEO'&&n.readyState<2||!n.width&&!n.videoWidth)continue;try{ctx.globalAlpha=Number(getComputedStyle(n).opacity);ctx.drawImage(n,0,0,128,72);count++;}catch{}}
 const out=$('#workspaceScope').getContext('2d');out.clearRect(0,0,512,120);if(!count){$('#workspaceScopeStatus').textContent='Sin fotograma disponible en el monitor.';return;}
 const bins=[new Uint32Array(256),new Uint32Array(256),new Uint32Array(256)],data=ctx.getImageData(0,0,128,72).data;
 for(let i=0;i<data.length;i+=4)for(let c=0;c<3;c++)bins[c][data[i+c]]++;
 const max=Math.max(1,...bins.flatMap(b=>Array.from(b)));for(let c=0;c<3;c++){out.strokeStyle=['#ff9087','#8beaaf','#7daeff'][c];out.beginPath();for(let x=0;x<256;x++){const y=112-Math.log1p(bins[c][x])/Math.log1p(max)*100;x?out.lineTo(x*2,y):out.moveTo(0,y);}out.stroke();}
 $('#workspaceScopeStatus').textContent='Histograma RGB aproximado del monitor · sombras ← → luces';
}
const timer=setInterval(()=>{if(current==='audio'&&!mixer.hidden){refreshMixer();syncMixer();meter();}if(current==='color'&&!color.hidden&&!document.querySelector('dialog[open]')&&performance.now()-lastScope>400){lastScope=performance.now();scope();}},150);
window.addEventListener('resize',geometry);window.addEventListener('beforeunload',()=>clearInterval(timer));
let resizing=false;$('#workspaceSplitter').addEventListener('pointerdown',()=>{resizing=true;});window.addEventListener('pointerup',()=>{if(!resizing)return;resizing=false;layouts[current]={ratio:parseFloat(getComputedStyle(workspace).gridTemplateRows)/(workspace.clientHeight-28),scroll:body.scrollTop};});
// Panel navigation stays independent of the current geometry.
$('.dock-panel-list').addEventListener('click',e=>{if(!e.target.closest('.dock-panel-item'))return;mixer.hidden=color.hidden=true;});
window.LQTACWorkspaces={activate,get current(){return current;},reset:()=>activate(current,true)};
demoReady.then(()=>activate('edit'));
})();
