// Compact shell: keep the existing controls and handlers, move only their DOM nodes.
window.LQTACGeneratorLayout={mount(dialog){
 const q=id=>dialog.querySelector('#'+id),oldGrid=dialog.querySelector('.generator-editor-grid'),heading=dialog.querySelector('h2'),footer=dialog.querySelector('footer'),status=q('genStatus');
 dialog.classList.add('generator-compact');dialog.style.width='min(1080px,calc(100vw - 24px))';dialog.style.height='min(800px,calc(100dvh - 24px))';dialog.style.maxHeight='calc(100dvh - 24px)';
 const header=document.createElement('header');header.className='gen-header';header.append(heading,q('genName').closest('label'));
 const body=document.createElement('div');body.className='gen-body';const workspace=document.createElement('section');workspace.className='gen-workspace';
 const toolbar=document.createElement('div');toolbar.className='gen-workspace-toolbar';toolbar.innerHTML='<div class="gen-view-tabs" role="tablist" aria-label="Vista del título"><button type="button" role="tab" id="genViewDesign" aria-controls="genDesignPane">Diseño</button><button type="button" role="tab" id="genViewAnimated" aria-controls="genAnimatedPane">Resultado animado</button></div><div class="gen-object-tools"></div>';for(const id of ['genAddText','genAddRect','genDeleteObject'])toolbar.lastElementChild.append(q(id));
 const stage=document.createElement('div');stage.className='gen-stage';const designPane=document.createElement('div'),animatedPane=document.createElement('div');designPane.id='genDesignPane';animatedPane.id='genAnimatedPane';for(const p of [designPane,animatedPane]){p.className='gen-view-pane';p.setAttribute('role','tabpanel');stage.append(p);}designPane.append(q('genDesign'));animatedPane.append(q('genPreview'));
 const hint=document.createElement('p');hint.className='gen-stage-hint';hint.textContent='Arrastra para colocar · esquinas para tamaño · doble clic para escribir';workspace.append(toolbar,stage,hint);
 const inspector=document.createElement('aside');inspector.className='gen-inspector';const tabs=document.createElement('div');tabs.className='gen-inspector-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Herramientas del título');inspector.append(tabs);const panels=new Map();
 for(const [key,name,ids]of [['text','Texto',['genText','genFont','genSize','genBold','genAlign']],['style','Estilo',['genColor','genStroke','genStrokeWidth','genShadow','genShadowBlur']],['motion','Animación',['genPreset','genIn','genOut','genEase','genX','genY','genScale','genOpacity']],['canvas','Lienzo',['genTransparent','genBackground','genDuration']]]){
  const b=document.createElement('button');b.type='button';b.id='genTab-'+key;b.textContent=name;b.setAttribute('role','tab');b.setAttribute('aria-controls','genPane-'+key);b.dataset.genTab=key;tabs.append(b);const pane=document.createElement('section');pane.id='genPane-'+key;pane.className='gen-inspector-pane';pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby',b.id);panels.set(key,pane);for(const id of ids)pane.append(q(id).closest('label'));inspector.append(pane);
 }
 const transformGrid=document.createElement('div');transformGrid.className='gen-transform-grid';for(const id of ['genX','genY','genScale','genOpacity'])transformGrid.append(panels.get('motion').querySelector('#'+id).closest('label'));panels.get('motion').append(transformGrid);
 body.append(workspace,inspector);
 const timeline=document.createElement('section');timeline.id='genTimeline';timeline.setAttribute('aria-label','Línea de tiempo de la animación');const timeToolbar=document.createElement('div');timeToolbar.className='gen-time-toolbar';timeToolbar.append(q('genPlay'),q('genTimeLabel'),q('genCurveParameter').closest('label'),q('genAddKey'),q('genRemoveKey'));const track=document.createElement('div');track.className='gen-time-track';const curve=document.createElement('div');curve.className='gen-time-curve';curve.append(q('genTime'),q('genCurve'));const list=document.createElement('div');list.className='gen-key-list';q('genPoints').size=2;list.append(q('genPoints'));track.append(curve,list);timeline.append(timeToolbar,track);
 dialog.replaceChildren(header,body,timeline,status,footer);
 let canvas=null,observer=null,disposed=false;
 function fit(){if(!canvas||disposed||!dialog.open)return;const width=Math.max(1,Math.floor(Math.min(stage.clientWidth-16,(stage.clientHeight-16)*16/9))),height=Math.max(1,Math.floor(width*9/16));if(canvas.getWidth()!==width||canvas.getHeight()!==height){canvas.setDimensions({width,height});canvas.setZoom(width/1920);canvas.requestRenderAll();}canvas.calcOffset();const preview=q('genPreview');preview.style.width=width+'px';preview.style.height=height+'px';}
 function view(which){const design=which==='design';designPane.hidden=!design;animatedPane.hidden=design;q('genViewDesign').setAttribute('aria-selected',String(design));q('genViewAnimated').setAttribute('aria-selected',String(!design));q('genViewDesign').tabIndex=design?0:-1;q('genViewAnimated').tabIndex=design?-1:0;hint.textContent=design?'Arrastra para colocar · esquinas para tamaño · doble clic para escribir':'Previsualización del resultado · usa Reproducir o desplaza el tiempo';fit();}
 function showTab(key){for(const [name,pane]of panels){pane.hidden=name!==key;const b=q('genTab-'+name);b.setAttribute('aria-selected',String(name===key));b.tabIndex=name===key?0:-1;}view(key==='motion'?'animated':'design');}
 for(const b of tabs.children)b.onclick=()=>showTab(b.dataset.genTab);
 function tabKeys(event,buttons,activate){if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();event.stopPropagation();const i=buttons.indexOf(document.activeElement),next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(i+(event.key==='ArrowLeft'?-1:1)+buttons.length)%buttons.length;activate(buttons[next]);buttons[next].focus();}
 tabs.onkeydown=e=>tabKeys(e,[...tabs.children],b=>showTab(b.dataset.genTab));toolbar.firstElementChild.onkeydown=e=>tabKeys(e,[q('genViewDesign'),q('genViewAnimated')],b=>view(b.id==='genViewDesign'?'design':'animated'));
 q('genViewDesign').onclick=()=>view('design');q('genViewAnimated').onclick=()=>view('animated');q('genPlay').addEventListener('click',()=>view('animated'),true);q('genTime').addEventListener('input',()=>view('animated'),true);q('genCurve').addEventListener('pointerdown',()=>showTab('motion'),true);q('genPoints').addEventListener('change',()=>showTab('motion'),true);for(const id of ['genAddKey','genRemoveKey'])q(id).addEventListener('click',()=>showTab('motion'),true);
 timeline.addEventListener('pointerdown',()=>view('animated'),true);timeline.addEventListener('click',e=>{if(e.target.closest('button'))view('animated');},true);
 showTab('text');
 return {showTab,view,fit,attach(value){canvas=value;fit();observer=new ResizeObserver(fit);observer.observe(stage);},finalize(){const help=list.querySelector('.keyframe-tools + p');if(help){help.textContent='Clic en la curva o botón derecho → Añadir punto. Arrastra un punto para cambiar tiempo y valor; Suprimir, Eliminar punto o su menú contextual lo borran. Escape cancela el arrastre.';const details=document.createElement('details');details.className='gen-point-help';const summary=document.createElement('summary');summary.textContent='Ayuda sobre puntos';details.append(summary,help);panels.get('motion').append(details);}const label=list.querySelector('.keyframe-tools label');if(label?.firstChild?.nodeType===3)label.firstChild.textContent='Tiempo del punto (s)';q('genAddKey').textContent='Añadir / actualizar';q('genCurveParameter').closest('label').firstChild.textContent='Curva ';},dispose(){disposed=true;observer?.disconnect();}};
}};
const generatorCompactStyle=document.createElement('style');generatorCompactStyle.textContent=`
#generatorEditor.generator-compact{box-sizing:border-box;padding:14px;overflow:hidden;max-width:calc(100vw - 24px);min-width:0;min-height:0}
#generatorEditor.generator-compact[open]{display:grid;grid-template-rows:auto minmax(0,1fr) 170px auto auto;gap:10px}
#generatorEditor.generator-compact [hidden]{display:none!important}
#generatorEditor.generator-compact .gen-header{display:flex;align-items:center;justify-content:space-between;gap:16px;min-width:0}
#generatorEditor.generator-compact h2{font-size:17px;margin:0}
#generatorEditor.generator-compact .gen-header>label{display:flex;align-items:center;gap:8px;margin:0;max-width:40%;min-width:0}
#generatorEditor.generator-compact .gen-body{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:14px;min-width:0;min-height:0}
#generatorEditor.generator-compact .gen-workspace{display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:6px;min-width:0;min-height:0}
#generatorEditor.generator-compact .gen-workspace-toolbar{display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap}
#generatorEditor.generator-compact .gen-view-tabs,#generatorEditor.generator-compact .gen-object-tools{display:flex;gap:4px}
#generatorEditor.generator-compact .gen-stage{position:relative;min-width:0;min-height:0;background:#06152a;border:1px solid var(--line);border-radius:7px;overflow:hidden}
#generatorEditor.generator-compact .gen-view-pane{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden}
#generatorEditor.generator-compact .gen-view-pane .canvas-container{max-width:none}
#generatorEditor.generator-compact #genPreview{max-width:none}
#generatorEditor.generator-compact .gen-stage-hint{margin:0;color:var(--muted);font-size:10px}
#generatorEditor.generator-compact .gen-inspector{display:grid;grid-template-rows:auto minmax(0,1fr);min-width:0;min-height:0;border:1px solid var(--line);border-radius:7px;background:#0b1e39;overflow:hidden}
#generatorEditor.generator-compact .gen-inspector-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3px;padding:5px;background:#0a1a31;border-bottom:1px solid var(--line)}
#generatorEditor.generator-compact .gen-inspector-tabs button{padding:7px 3px}
#generatorEditor.generator-compact [role=tab][aria-selected=true]{background:#285588;color:#fff;border-color:var(--accent-2)}
#generatorEditor.generator-compact .gen-inspector-pane{overflow:auto;min-width:0;min-height:0;padding:8px 10px;scrollbar-gutter:stable}
#generatorEditor.generator-compact label{font-size:11px;margin:0 0 9px;min-width:0}
#generatorEditor.generator-compact input:not([type=checkbox]),#generatorEditor.generator-compact select,#generatorEditor.generator-compact textarea{box-sizing:border-box;min-width:0;font:inherit;padding:5px;max-width:100%}
#generatorEditor.generator-compact textarea{resize:vertical;min-height:54px;max-height:110px}
#generatorEditor.generator-compact input[type=color]{height:28px;padding:2px}
#generatorEditor.generator-compact button{font:inherit;font-size:11px;padding:6px 8px;white-space:nowrap}
#generatorEditor.generator-compact .system-font-picker{margin:5px 0 7px}
#generatorEditor.generator-compact .system-font-picker p{margin:4px 0;line-height:1.3}
#generatorEditor.generator-compact .gen-transform-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 8px}
#generatorEditor.generator-compact .gen-point-help{font-size:11px;color:var(--muted);margin-top:10px}
#generatorEditor.generator-compact #genTimeline{display:grid;grid-template-rows:auto minmax(0,1fr);gap:6px;min-height:0;border:1px solid var(--line);border-radius:7px;padding:7px;background:#091b34;box-sizing:border-box}
#generatorEditor.generator-compact .gen-time-toolbar{display:flex;align-items:center;gap:7px;min-width:0;flex-wrap:wrap}
#generatorEditor.generator-compact .gen-time-toolbar label{display:flex;align-items:center;gap:5px;margin:0;margin-left:auto}
#generatorEditor.generator-compact #genCurveParameter{width:110px}
#generatorEditor.generator-compact #genTimeLabel{color:var(--muted);font-size:11px;min-width:100px}
#generatorEditor.generator-compact .gen-time-track{display:grid;grid-template-columns:minmax(0,1fr) 210px;gap:10px;min-height:0}
#generatorEditor.generator-compact .gen-time-curve{display:grid;grid-template-rows:20px minmax(0,1fr);min-width:0;min-height:0}
#generatorEditor.generator-compact #genTime{width:100%;padding:0;margin:0;min-width:0;box-sizing:border-box}
#generatorEditor.generator-compact #genCurve{width:100%;height:100%;min-height:0;display:block}
#generatorEditor.generator-compact .gen-key-list{min-width:0;min-height:0;display:grid;grid-template-rows:38px minmax(0,1fr);gap:4px}
#generatorEditor.generator-compact #genPoints{width:100%;padding:2px;font-size:10px}
#generatorEditor.generator-compact .keyframe-tools{display:grid!important;grid-template-columns:minmax(0,1fr) auto;gap:5px!important;margin:0!important;align-items:end!important;min-width:0}
#generatorEditor.generator-compact .keyframe-tools label{margin:0;font-size:10px}
#generatorEditor.generator-compact .keyframe-tools input{width:100%!important}
#generatorEditor.generator-compact .keyframe-tools button{margin-bottom:0}
#generatorEditor.generator-compact #genStatus{margin:0;font-size:11px;max-height:36px;overflow:auto}
#generatorEditor.generator-compact #genStatus:empty{display:none}
#generatorEditor.generator-compact footer{position:static;padding:0;background:transparent;flex-wrap:nowrap;min-width:0}
@media(max-width:900px){#generatorEditor.generator-compact .gen-body{grid-template-columns:minmax(0,1fr) 245px;gap:8px}#generatorEditor.generator-compact .gen-inspector-tabs{grid-template-columns:repeat(2,minmax(0,1fr))}#generatorEditor.generator-compact[open]{gap:7px;padding:10px;grid-template-rows:auto minmax(0,1fr) 164px auto auto}#generatorEditor.generator-compact .gen-time-track{grid-template-columns:minmax(0,1fr) 180px}#generatorEditor.generator-compact .gen-time-toolbar{gap:4px}#generatorEditor.generator-compact .gen-time-toolbar button{padding:5px}#generatorEditor.generator-compact .gen-time-toolbar label{margin-left:0}}
`;document.head.append(generatorCompactStyle);
