// Native dialogs (open/save, message boxes) in the interface language chosen in the window.
// Uses the same dictionaries and lookup rules as the window (dist/assets/i18n-core.js); the window reports the language
// through the 'set-language' IPC. Spanish stays the source text in the code.
const path=require('node:path');
const core=require('../dist/assets/i18n-core.js').create();
const LANGS=['es','en','fr','zh','ja'];let language='es',loaded=false;
// Dictionary files are plain scripts calling LQTACI18n.add: run each in its own context.
function load(){if(loaded)return;loaded=true;const fs=require('node:fs'),vm=require('node:vm');
  for(const code of LANGS.slice(1)){try{vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','dist','assets','i18n',code+'.js'),'utf8'),{LQTACI18n:{add:(c,dict)=>core.add(c,dict)}},{filename:code+'.js'});}catch{}}}
function t(text){if(typeof text!=='string'||language==='es')return text;load();return core.lookup(text,language)??text;}
function setLanguage(code){if(LANGS.includes(code))language=code;return language;}
function options(o){if(!o||typeof o!=='object'||language==='es')return o;const out={...o};
  for(const k of ['title','message','detail','buttonLabel','checkboxLabel','nameFieldLabel','defaultPath'])if(k!=='defaultPath'&&typeof out[k]==='string')out[k]=t(out[k]);
  if(Array.isArray(out.buttons))out.buttons=out.buttons.map(t);if(Array.isArray(out.filters))out.filters=out.filters.map(f=>({...f,name:t(f.name)}));return out;}
// Wraps the dialog functions once; the window argument is optional in Electron, so the options are the last object argument.
function install(dialog){if(dialog.__lqtacI18n)return;dialog.__lqtacI18n=true;
  for(const name of ['showOpenDialog','showSaveDialog','showMessageBox','showOpenDialogSync','showSaveDialogSync','showMessageBoxSync']){const original=dialog[name];if(typeof original!=='function')continue;
    dialog[name]=function(...args){const i=args.length-1;if(i>=0&&args[i]&&typeof args[i]==='object'&&!args[i].webContents)args[i]=options(args[i]);return original.apply(this,args);};}
  const showErrorBox=dialog.showErrorBox;if(typeof showErrorBox==='function')dialog.showErrorBox=(title,content)=>showErrorBox.call(dialog,t(title),t(content));}
module.exports={t,setLanguage,install,get language(){return language;}};
