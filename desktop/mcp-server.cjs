// Offline stdio MCP transport. Runs on the Node runtime already bundled in Electron.
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),readline=require('node:readline');
const {tools,validate}=require('./mcp-tools.cjs');
const directory=process.env.CINEMA_MCP_DIR||path.join(process.env.APPDATA||require('node:os').homedir(),'LQTAC Studio','mcp');
const versions=['2025-11-25','2025-06-18','2025-03-26','2024-11-05'];let initialized=false,ready=false;
async function bridge(name,args){
 let c;try{c=JSON.parse(await fs.readFile(path.join(directory,'connection.json'),'utf8'));}catch{throw Error('Abre Cinema Studio y activa Herramientas → Control MCP local.');}
 if(!Number.isInteger(c.port)||c.port<1||c.port>65535||!/^[a-f0-9]{64}$/.test(c.token))throw Error('Conexión MCP local no válida');
 const body=JSON.stringify({name,arguments:args});
 return new Promise((resolve,reject)=>{
  const req=http.request({host:'127.0.0.1',port:c.port,path:'/call',method:'POST',headers:{Authorization:'Bearer '+c.token,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},res=>{
   let buffer='';res.setEncoding('utf8');res.on('data',d=>{buffer+=d;if(buffer.length>100*1024*1024){res.destroy();reject(Error('Respuesta MCP demasiado grande'));}});res.on('end',()=>{try{const r=JSON.parse(buffer);if(res.statusCode!==200||r.error)reject(Error(r.error||'Conexión MCP rechazada'));else resolve(r.result);}catch(e){reject(e);}});res.on('error',reject);
  });req.on('error',()=>reject(Error('No se puede conectar a Cinema Studio. Abre el programa y activa Control MCP local.')));req.setTimeout(120000,()=>req.destroy(Error('Tiempo de espera MCP agotado')));req.end(body);
 });
}
async function handle(message){
 if(!message||message.jsonrpc!=='2.0'||typeof message.method!=='string')return {jsonrpc:'2.0',id:message?.id??null,error:{code:-32600,message:'Invalid Request'}};
 const reply=result=>({jsonrpc:'2.0',id:message.id,result}),error=(code,text)=>({jsonrpc:'2.0',id:message.id,error:{code,message:text}});
 if(message.id===undefined){if(message.method==='notifications/initialized'&&initialized)ready=true;return null;}
 if(message.method==='initialize'){initialized=true;ready=false;const version=versions.includes(message.params?.protocolVersion)?message.params.protocolVersion:versions[0];return reply({protocolVersion:version,capabilities:{tools:{listChanged:false}},serverInfo:{name:'cinema-studio-local',title:'Cinema Studio',version:'1.1.0'},instructions:'Controla Cinema Studio abierto en este equipo. Montaje: lee cinema_project antes de editar, conserva la revisión y guarda LQTS antes de sustituir un montaje. Resto del programa (efectos, generadores, títulos, máscaras, estabilizar, seguimiento, separar pistas, voz, karaoke, exportaciones, preferencias…): cinema_ui_snapshot para ver menús, diálogos y controles con su ref, cinema_ui_action para usarlos y cinema_ui_screenshot para comprobar el resultado. Los selectores nativos de archivo se contestan con files en la misma acción. Grabación de pantalla (entera o una zona): cinema_record_sources, cinema_record_thumbnail, cinema_record_start y cinema_record_control; requiere que el usuario active el permiso de grabación. Los medios permanecen locales.'});}
 if(message.method==='ping')return reply({});
 // Tolerant with clients that call right after initialize, before notifications/initialized arrives.
 if(!initialized)return error(-32002,'Inicializa la sesión MCP antes de usar herramientas. Protocolos admitidos: '+versions.join(', '));
 if(message.method==='tools/list')return reply({tools});
 // No resources or prompts are offered; answer empty lists for clients that ask anyway.
 if(message.method==='resources/list')return reply({resources:[]});
 if(message.method==='resources/templates/list')return reply({resourceTemplates:[]});
 if(message.method==='prompts/list')return reply({prompts:[]});
 if(message.method==='tools/call'){
  try{const {name,arguments:args={}}=message.params||{},spec=tools.find(t=>t.name===name);if(!spec)throw Error('Herramienta no admitida');validate(spec.inputSchema,args);const result=await bridge(name,args);return reply(result?.content?result:{content:[{type:'text',text:JSON.stringify(result)}]});}
  catch(e){return reply({isError:true,content:[{type:'text',text:e.message}]});}
 }
 return error(-32601,'Method not found');
}
if(require.main===module){
 const lines=readline.createInterface({input:process.stdin,crlfDelay:Infinity});let queue=Promise.resolve();
 const send=r=>{if(r)process.stdout.write(JSON.stringify(r)+'\n');};
 lines.on('line',line=>{if(Buffer.byteLength(line)>20*1024*1024){send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Message too large'}});return;}queue=queue.then(async()=>{let m;try{m=JSON.parse(line);}catch{return send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});}try{send(await handle(m));}catch(e){send({jsonrpc:'2.0',id:m.id??null,error:{code:-32603,message:e.message}});}});});
}
module.exports={handle,bridge};
