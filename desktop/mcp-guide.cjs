// Manual for assistants that drive Cinema Studio through MCP (tool cinema_guide). Lists of values come from the live models,
// so the guide never drifts from what the validators accept.
const G=require('../dist/assets/generator-model.js'),M=require('../dist/assets/title-motion.js');
const topics={
inicio:()=>`# Cinema Studio por MCP · guía para asistentes
Temas: diagramas (flujo completo de un vídeo explicativo con gráficos sincronizados), rotulos (esquema JSON de títulos y diagramas), composicion (pantalla dividida, capturas, zoom), sincronia (tiempos de palabras).
Reglas: lee cinema_project antes de editar y usa su revision; tras cada cinema_edit la revisión cambia. Comprueba el resultado con cinema_preview en varios instantes. Guarda con cinema_save antes de cambios grandes.`,
diagramas:()=>`# Vídeo explicativo con diagramas animados (flujo automático)
1. cinema_new (o cinema_open) y cinema_import del vídeo del presentador y de las capturas (png/jpg).
2. cinema_project → addTrack de vídeo «Cámara» e insertClip del vídeo (splitAudio crea su pista de audio).
3. cinema_transcribe {trackId: pista de audio, engine:"whisper-cpp", language:"es"} → espera cinema_status completed → cinema_transcript (frases y palabras con tiempos exactos). Usa query para localizar dónde se dice algo.
4. Planifica las escenas sobre las frases: qué explica cada una y qué gráfico la acompaña (diagrama de cajas y flechas, captura con recuadro, contador, aviso…).
5. Por cada escena: un rótulo (tema rotulos) con canvas del tamaño del vídeo; cada paso del diagrama con anim.in.delay = tiempo de la palabra que lo nombra − inicio del rótulo. Inserta con cinema_edit {op:"title", trackId, start, generator}. Pista de gráficos por ENCIMA de la de cámara (addTrack la añade debajo: usa reorderTrack index 0).
6. Composición (tema composicion): mientras hay diagrama, la cámara baja a la mitad inferior (Pan/Crop + Trayectoria fija) o desaparece; las capturas se colocan arriba con zoom suave.
7. Subtítulos: cinema_apply_subtitles crea la pista; el estilo karaoke y el resaltado se ajustan en la interfaz (cinema_ui_*).
8. Revisa con cinema_preview (inicio, mitad y final de cada escena), corrige y exporta con cinema_render (1080x1920 para vertical).
Estilo neón recomendado: fondo #0b0820, cajas rect rx 22 fill #0d1330 stroke de color (#3df5a0 verde, #33d6ff cian, #ff3d6e rojo, #ffd23d amarillo) strokeWidth 5 y glow del mismo color (size 24, strength 2); texto blanco negrita 44–56 y segunda línea Consolas del color de la caja; flechas path blancas strokeWidth 7 con arrow:"end" y anim draw.`,
rotulos:()=>`# Rótulos y diagramas: JSON de generator (cinema_edit op title)
{version:1, type:"title", name, duration (s), background:null|"#rrggbb", canvas?:{width,height}, objects:[…], motion:{preset:"none",in:0,out:0,easing:"smooth"}, keys:[]}
- canvas: ${Object.keys(G.SIZES).join(', ')} (o cualquier entero 320–3840). Sin canvas: 1920x1080. Para vídeo vertical, 1080x1920.
- Coordenadas en píxeles del lienzo; left/top = esquina superior izquierda; el primer objeto queda detrás.
- objects[].type: textbox, rect, ellipse, line, image, path.
  · textbox: text, width (ancho de caja), fontSize, fontFamily ("Segoe UI", "Consolas"…), fontWeight normal|bold, textAlign left|center|right|justify-left, fill.
    count (contador): {from, to, decimals 0–4, delay, duration, easing?, separator? (".", ",", " "), decimal? (",", ".")} y {n} en text: "modelos · {n}".
  · rect: width, height, rx, ry, fill, stroke, strokeWidth.  · ellipse: rx, ry (left/top = esquina de su caja).
  · line: x1, y1, x2, y2 (absolutas), stroke, strokeWidth, arrow.
  · path: path con datos SVG M L H V C Q Z (coordenadas locales; left/top colocan su caja), stroke, strokeWidth, fill (null = contorno), arrow.
    Flecha recta "M0 0 L0 170"; curva "M0 0 C 140 50 140 120 0 170"; ✓ "M0 45 L38 85 L110 0"; ✗ "M0 0 L100 100 M100 0 L0 100"; aviso "M70 0 L140 122 L0 122 Z".
  · image: asset "<id de paquete>:images/x.png" (imágenes de paquetes instalados). Las capturas propias van como clips de imagen (tema composicion).
  · arrow (line, path): ${G.ARROWS.join(', ')}. Punta del color de stroke, ≈3,2×strokeWidth; con draw aparece al llegar el trazo.
  · Comunes: angle, scaleX, scaleY, opacity, shadow {color,blur,offsetX,offsetY}, gradient {angle,stops:[{offset,color}]}, glow {color,size 0–200,strength entero 1–5}, fixed.
- anim: {in:{effect,by,duration,stagger,delay,easing}, out:{…,end?}|null, loop:{effect,amount,speed}|null}
  · effect: ${M.effects.join(', ')}  · by: ${M.units.join(', ')} (formas e imágenes: object)
  · easing: ${M.easingNames.join(', ')}  · loop.effect: ${M.loops.join(', ')}
  · draw dibuja contornos, líneas y trazos; typewriter con by letter; rise/fade por word para textos.
- Colores siempre #rrggbb. Máximo 100 objetos por rótulo.
- Un diagrama largo se divide en varios rótulos (uno por escena): más fácil de retocar y de sincronizar.`,
composicion:()=>`# Composición: pantalla dividida, capturas y zoom
Cada clip de vídeo o imagen se ajusta entero al fotograma (contain). Dos herramientas de updateClip.patch lo colocan:
- panCrop: [{time:0, x, y, width, height, rotation:0}] — zona visible de la fuente: x,y = CENTRO (0–1), width/height = fracción de la fuente. La zona se ajusta al fotograma conservando su proporción.
- motionPath fijo: {anchor:{x:.5,y:.5}, nodes:[{x:X,y:Y},{x:X,y:Y}], start:0, end:<duración del clip>, orient:"none", inertia:0, scale:S, scaleEnd:S2?} — el centro de la capa va a (X,Y) del fotograma (0–1) con escala S (→ S2 = zoom lento).
Recetas (proyecto vertical 1080x1920):
- Cámara en la mitad inferior: en la fuente, una zona de proporción 1080:960 (1,125) alrededor de la cara. Fuente vertical 9:16 (1080x1920): width 1, height 0.5, y ≈ 0.4. Fuente horizontal 16:9 (1920x1080): width 0.633, height 1, x = posición de la cara. En general width/height (en fracciones) = 1,125 × alto/ancho de la fuente. Queda 1080x960 centrada; motionPath nodes (0.5, 0.75) la baja a la mitad inferior.
- Cámara a pantalla completa en vertical desde fuente horizontal: panCrop width 0.316, height 1 (9:16 dentro de 16:9), x = posición de la cara.
- Captura arriba: clip de imagen en una pista sobre la cámara; motionPath nodes (0.5, 0.27), scale 0.92 → scaleEnd 1.02 para un acercamiento lento. Recuadro de resaltado: un rótulo con rect sin relleno (fill null, stroke amarillo, anim draw) en las coordenadas de la frase.
- Cambios de plano: divide el clip de cámara (dos insertClip con offset) o usa fadeIn/fadeOut; las Trayectorias son por clip.
Comprueba siempre con cinema_preview: la zona exacta depende del encuadre de cada vídeo.`,
sincronia:()=>`# Sincronizar gráficos con la voz
- cinema_transcribe engine "whisper-cpp" da tiempos EXACTOS por palabra (wordTiming "exact"); faster-int8 solo por frase (las palabras se estiman).
- cinema_transcript {from,to} devuelve cues (frases) y words; {query:"recompilada"} o {query:"shaders de la consola"} devuelve matches con startSeconds/endSeconds.
- Un rótulo empieza ≈0,2 s antes de la primera palabra de su escena; cada objeto: anim.in.delay = palabra − inicio del rótulo (mínimo 0). Termina cuando acaba la frase siguiente o con la escena (duration).
- Entradas cortas (0,3–0,6 s) para que el gráfico llegue con la palabra; las flechas (draw) empiezan 0,1 s antes de la caja a la que apuntan.`
};
function guide(topic='inicio'){if(topic==='todo')return Object.keys(topics).map(k=>topics[k]()).join('\n\n');const t=topics[topic];if(!t)throw Error('Tema no válido. Temas: '+Object.keys(topics).join(', ')+', todo');return t();}
module.exports={guide,topics:Object.keys(topics)};
