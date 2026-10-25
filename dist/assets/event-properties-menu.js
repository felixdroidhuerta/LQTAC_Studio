// Property access belongs to the event context menu, not a permanent side panel.
(function(){
const inspector=$('.workspace > .inspector');
// Legacy selection bindings still use these hidden nodes. VEGAS information and
// FX/PAN have already been moved to their own visible panels before this loads.
inspector.hidden=true;inspector.inert=true;inspector.setAttribute('aria-hidden','true');
const style=document.createElement('style');style.textContent=`
.workspace{grid-template-columns:58px 220px minmax(0,2fr) minmax(0,1fr) 0px}
.workspace > .inspector{display:none!important}
@media(max-width:1280px){.workspace{grid-template-columns:58px 190px minmax(0,2fr) minmax(0,1fr)}}
@media(max-width:840px){.workspace{grid-template-columns:58px 1fr}}
`;document.head.append(style);
const button=document.createElement('button');button.type='button';button.dataset.action='event-properties';button.textContent='Propiedades del evento…';button.hidden=true;clipContextMenu.prepend(button);
new MutationObserver(()=>{
 const open=clipContextMenu.classList.contains('open');button.hidden=!open||!contextClip?.isConnected;
 if(open){const r=clipContextMenu.getBoundingClientRect();clipContextMenu.style.top=Math.max(4,Math.min(r.top,innerHeight-r.height-8))+'px';}
}).observe(clipContextMenu,{attributes:true,attributeFilter:['class']});
button.onclick=()=>{
 const clip=contextClip;hideClipContextMenu();
 if(!clip?.isConnected||exporting||historyBusy||document.querySelector('dialog[open]'))return;
 if(clip.dataset.kind==='subtitle'){openSubtitleEditor(clip);return;}
 openWorkControls(clip.parentElement,clip);const legacy=$('fieldset',workDialog);if(legacy)legacy.hidden=true;
};
})();
