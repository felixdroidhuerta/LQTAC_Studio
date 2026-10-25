(function(root){
function valid(name){return typeof name==='string'&&name.trim().length>0&&name.length<=200&&!/[\u0000-\u001f\u007f]/.test(name);}
function css(name){if(!valid(name))throw Error('Nombre de fuente no válido');return '"'+name.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"';}
const api={valid,css};if(typeof module==='object'&&module.exports)module.exports=api;else root.LQTACFontModel=api;
})(typeof globalThis==='object'?globalThis:this);
