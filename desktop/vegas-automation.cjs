const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const bridge = require('./vegas-bridge.cjs');
const literal = value => '@"' + value.replaceAll('"', '""') + '"';

async function findVegas() {
  const root = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'VEGAS');
  const versions = (await fs.readdir(root).catch(() => [])).sort((a,b) => b.localeCompare(a,undefined,{numeric:true}));
  for (const version of versions) {
    const folder = path.join(root,version);
    for (const name of await fs.readdir(folder).catch(() => [])) {
      if (/^vegas\d+\.exe$/i.test(name)) return path.join(folder,name);
    }
  }
  throw Error('No se ha encontrado VEGAS Pro instalado. Instálalo o selecciona un puente .lqtac.json ya exportado.');
}

let busy = false;
async function openVegas(filePath, options = {}) {
  // Reuse only a bridge matching the exact saved source bytes.
  try { if (!options.refresh) return await bridge.openVegas(filePath); } catch (error) {
    if (!/necesita su puente|no corresponde al VEG actual/.test(error.message)) throw error;
  }
  if (busy) throw Error('Ya hay una conversión VEGAS en curso. Espera a que termine.');
  busy = true;
  let job;
  try {
    const executable = options.executable || await findVegas();
    job = await fs.mkdtemp(path.join(os.tmpdir(),'lqtac-vegas-'));
    const scriptPath = path.join(job,'Convert.cs'), resultPath = path.join(job,'result.json'), errorPath = path.join(job,'error.txt');
    const source = path.join(__dirname,'..','tools','vegas','ExportLqtac.cs');
    let script = (await fs.readFile(source,'utf8')).replace('public class EntryPoint','public class LqtacExporter');
    script += `\npublic class EntryPoint { public void FromVegas(Vegas vegas) { try {
      if (!String.Equals(Path.GetFullPath(vegas.Project.FilePath), ${literal(path.resolve(filePath))}, StringComparison.OrdinalIgnoreCase)) throw new Exception("VEGAS no ha abierto el proyecto solicitado.");
      LqtacExporter exporter = new LqtacExporter(); exporter.Automated = true; exporter.OutputPath = ${literal(resultPath)}; exporter.FromVegas(vegas);
    } catch(Exception ex) { File.WriteAllText(${literal(errorPath)}, ex.ToString(), new UTF8Encoding(false)); } } }`;
    await fs.writeFile(scriptPath,script,'utf8');
    await fs.copyFile(source+'.config',scriptPath+'.config');
    let launchError;
    const child = (options.spawn || spawn)(executable,['/NOLOGO','/OPEN',path.resolve(filePath),'/SCRIPT',scriptPath],{windowsHide:true,stdio:'ignore'});
    child.on('error',error => { launchError=error; });
    child.unref();
    const deadline = Date.now() + (options.timeoutMs || 180000);
    while (Date.now() < deadline) {
      if (launchError) throw launchError;
      const failure = await fs.readFile(errorPath,'utf8').catch(() => null);
      if (failure) throw Error('VEGAS no pudo convertir el proyecto: '+failure);
      if (await fs.stat(resultPath).catch(() => null)) {
        const exportedPath = await fs.readFile(resultPath,'utf8');
        return await bridge.readBridge(exportedPath,filePath);
      }
      await new Promise(resolve => setTimeout(resolve,250));
    }
    throw Error('VEGAS no ha completado la conversión en 3 minutos. Revisa sus ventanas: puede solicitar medios, licencia o confirmar la carga. Vuelve a abrir el VEG en LQTAC cuando termine.');
  } finally {
    busy = false;
    // Keep timed-out scripts available: VEGAS may still be loading them.
    if (job && await fs.stat(path.join(job,'result.json')).catch(() => null)) await fs.rm(job,{recursive:true,force:true});
  }
}
module.exports = {openVegas,findVegas};
