// Local inventory of mapping work; tools can exist without a verified VEGAS mapping.
const fs = require('node:fs');
const path = require('node:path');
function summarize(d) {
  if (d.format !== 'LQTAC VEGAS diagnostic' || d.version !== 1 || !Array.isArray(d.tracks)) throw Error('Diagnóstico no reconocido');
  const events = d.tracks.flatMap(t => t.events);
  const blockers = [];
  const add = (code, scope, detail) => blockers.push({code, scope, detail});
  if (d.readErrors.length) add('READ_ERRORS', 'project', d.readErrors);
  for (const t of d.tracks) {
    if (t.Mute || t.Solo) add('TRACK_MUTE_SOLO', t.id, {mute:t.Mute, solo:t.Solo});
    const fx = t.effects.filter(f => !f.Bypass);
    if (fx.length) add('TRACK_EFFECTS', t.id, fx.map(f => f.plugin.Name));
    if (t.motion?.HasMotionData || t.motion?.HasShadowData || t.motion?.HasGlowData) add('TRACK_MOTION', t.id, t.motion);
    for (const e of t.events) {
      if (Math.abs(e.PlaybackRate - 1) > 1e-9) add('PLAYBACK_RATE', e.id, e.PlaybackRate);
      if (e.Mute) add('EVENT_MUTE', e.id, true);
      if (e.takes.length !== 1) add('TAKES', e.id, e.takes.length);
      for (const side of ['fadeIn','fadeOut']) {
        const f = e[side];
        if (f.Length > 0 && f.Curve !== 'Linear') add('FADE_CURVE', e.id, {side, length:f.Length, curve:f.Curve});
        if (f.Gain !== 1) add('EVENT_GAIN', e.id, {side,gain:f.Gain});
        if (f.transition) add('TRANSITION_PLUGIN', e.id, f.transition);
      }
      if (e.effects.some(f => !f.Bypass)) add('EVENT_EFFECTS', e.id, e.effects);
      const take = e.takes.find(a => a.IsActive);
      if (!take) add('NO_ACTIVE_TAKE', e.id, null);
      else {
        if (!take.media.fileExists || take.media.IsOffline) add('MISSING_MEDIA', e.id, take.MediaPath);
        if (take.media.IsGenerated || take.media.IsSubclip) add('SPECIAL_MEDIA', e.id, take.media);
        if (e.Loop && take.Offset + e.Length * e.PlaybackRate > take.media.Length + 1e-6) add('SOURCE_REPEAT', e.id, {offset:take.Offset,length:e.Length,sourceLength:take.media.Length});
      }
    }
  }
  return {format:'LQTAC VEGAS compatibility inventory',version:1,conversionReady:false,
    editorVersion:'0.4.0',editorTools:['Mute/solo por tipo','Ganancia de pista/evento','Balance estéreo','Velocidad positiva 0.25–4','Pan/Crop 2D lineal','Orden de pistas'],
    reason:'Inventario de aspectos pendientes de mapear. LQTAC 0.4.0 dispone de herramientas básicas; faltan exportador y comparación audiovisual con VEGAS. Los plugins externos quedan fuera de la fase acordada.',
    vegasVersion:d.vegasVersion,project:d.project,video:d.video,audio:d.audio,
    tracks:d.tracks.length,events:events.length,media:d.mediaPool.length,
    modifiedBefore:d.modifiedBefore,modifiedAfter:d.modifiedAfter,readErrors:d.readErrors,blockers,
    pending:['Semántica de solapamientos y doble fade','Selección de streams y canales','Pan/crop, composición y orden de capas','Buses, ganancia, paneo y parámetros de plugins','Precisión temporal y prueba audiovisual con referencia VEGAS']};
}
if (require.main === module) {
  const input = process.argv[2];
  if (!input) throw Error('Uso: node summarize-diagnostic.cjs ruta-diagnostico.json');
  const result = summarize(JSON.parse(fs.readFileSync(input,'utf8')));
  const base = input.replace(/\.json$/i,'') + '.compatibility';
  fs.writeFileSync(base+'.json',JSON.stringify(result,null,2),{flag:'wx'});
  const categories = Object.entries(Object.groupBy(result.blockers,b=>b.code));
  const md = `# Diagnóstico de compatibilidad VEGAS → LQTAC\n\n${result.vegasVersion}. Proyecto: ${path.basename(result.project.FilePath.replaceAll('\\','/'))}.\n\n${result.tracks} pistas, ${result.events} eventos, ${result.project.Length.toFixed(3)} segundos. Vídeo: ${result.video.Width}×${result.video.Height}, ${result.video.FrameRate} fps.\n\nErrores de lectura: ${result.readErrors.length}. Sesión modificada antes/después: ${result.modifiedBefore}/${result.modifiedAfter}.\n\n**Conversión fiel todavía pendiente.** ${result.reason}\n\n| Diferencia detectada | Casos |\n| --- | ---: |\n${categories.map(([k,v])=>`| ${k} | ${v.length} |`).join('\n')}\n\n## Comprobaciones pendientes\n\n${result.pending.map(x=>'- '+x).join('\n')}\n\nEl JSON adjunto identifica cada pista/evento y conserva el detalle. Los informes permanecen locales, excluidos de Git. No se han convertido ni renderizado medios ni modificado el VEG.\n`;
  fs.writeFileSync(base+'.md',md,{flag:'wx'});
  console.log(JSON.stringify({report:base+'.md',tracks:result.tracks,events:result.events,blockers:categories.map(([code,v])=>({code,count:v.length}))},null,2));
}
module.exports = {summarize};
