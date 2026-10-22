const fs = require('node:fs');
const path = require('node:path');

const mediaPattern = /\.(?:mp4|mov|mxf|avi|wmv|m4v|webm|mp3|wav|aiff?|flac|m4a|aac|ogg|png|jpe?g|tiff?|bmp|webp)$/i;
const printable = /[\p{L}\p{N}]/u;

function extractUtf16LeStrings(buffer) {
  const values = [];
  let current = '';
  const flush = () => {
    const value = current.trim();
    if (value.length >= 4 && printable.test(value)) values.push(value);
    current = '';
  };

  for (let offset = 0; offset + 1 < buffer.length; offset += 2) {
    const code = buffer.readUInt16LE(offset);
    const isPrintable = code === 9 || code === 32 || (code >= 33 && code <= 126) || code >= 160;
    if (code === 0) flush();
    else if (isPrintable) current += String.fromCharCode(code);
    else flush();
  }
  flush();
  return values;
}

function unique(values) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function classifyTrack(name) {
  return /vocals?|drums?|bass|guitar|keyboard|synth|music|audio|voice|fx|other/i.test(name) ? 'audio' : 'video';
}

function parseVegasProject(filePath) {
  const buffer = fs.readFileSync(filePath);
  const isRiff = buffer.subarray(0, 4).toString('ascii').toLowerCase() === 'riff';
  const strings = unique(extractUtf16LeStrings(buffer));
  const mediaPaths = strings.filter(value => mediaPattern.test(value));
  const projectPath = strings.find(value => /\.(?:veg|vf)$/i.test(value)) || filePath;
  const vegasVersionSource = strings.find(value => /VEGAS Pro\\?\s*\d+/i.test(value)) || strings.find(value => /(?:VEGAS|Vegas)\s+(?:Pro\\?\s*)?\d+/i.test(value));
  const vegasVersionMatch = vegasVersionSource?.match(/VEGAS(?: Pro)?[\\/\\s]+(\d+(?:\.\d+)?)/i);
  const vegasVersion = vegasVersionMatch ? `VEGAS Pro ${vegasVersionMatch[1]}` : 'VEGAS (versión no identificada)';
  const fx = strings.filter(value => /(?:Sony|VEGAS|Boris|Mocha|Chromakeyer|Equalizer|Ecualizador|Compres|Puerta|Reverb|Color|Weak Light Rays|Empty Graph|Generador|Títulos)/i.test(value)).slice(0, 40);
  const trackNames = unique(strings.filter(value => /^(?:\d+\s+)?[^\\/:*?"<>|]{3,}$/u.test(value) && !mediaPattern.test(value) && !/^(?:Master|Vista previa|Microsoft Sound Mapper|Asignador de sonido Microsoft|Documents)$/i.test(value) && !/created=|^META:/i.test(value) && !/AppData|VEGAS Pro|Users|OneDrive|Documents/i.test(value))).filter(value => /(?:vocals?|drums?|bass|guitar|keyboard|synth|music|voice|carrera|woha|intro|video|audio|other)/i.test(value));
  const titles = strings.filter(value => /(?:Títulos|Texto|Historias|Muy pronto|oscuridad|verá la luz|\{\\rtf)/i.test(value)).slice(0, 30);
  const media = mediaPaths.map(mediaPath => ({
    path: mediaPath,
    fileName: path.basename(mediaPath),
    exists: fs.existsSync(mediaPath),
    kind: /\.(?:wav|mp3|aiff?|flac|m4a|aac|ogg)$/i.test(mediaPath) ? 'audio' : 'video'
  }));
  const tracks = trackNames.map(name => ({ name, kind: classifyTrack(name) }));
  const missingMediaCount = media.filter(item => !item.exists).length;
  const warnings = [];
  if (!isRiff) warnings.push('El archivo no empieza por RIFF; se ha leído como contenedor binario de texto parcial.');
  if (missingMediaCount) warnings.push(`${missingMediaCount} referencias de media apuntan a rutas que no están disponibles en este equipo o unidad.`);
  warnings.push('La apertura estructural conserva referencias, nombres, títulos y FX; la reconstrucción exacta de parámetros propietarios requiere exportar XML/EDL desde VEGAS.');

  return {
    filePath,
    fileName: path.basename(filePath),
    bytes: buffer.length,
    format: isRiff ? 'VEGAS RIFF project' : 'VEGAS project (binary)',
    vegasVersion,
    projectPath,
    media,
    tracks,
    fx,
    titles,
    buses: strings.filter(value => /^(?:Master|Vista previa|Microsoft Sound Mapper|Asignador de sonido Microsoft)$/i.test(value)),
    missingMediaCount,
    warnings,
    rawStringCount: strings.length
  };
}

module.exports = { parseVegasProject, extractUtf16LeStrings };
