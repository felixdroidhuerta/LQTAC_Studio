# LQTAC Studio — guía de desarrollo y continuidad

## Empaquetado 0.14.0 — 24/10/2026

Versión de entrega que consolida todos los cambios locales posteriores a 0.13.0 descritos abajo: ambos ASR, capturas, menús y exportaciones PNG/GIF, icono y shell .LQTS, fast path del BAT. Las notas históricas de no empaquetado se refieren a sus entregas originales. Build offline desde dependencias/modelos presentes, sin actualizar librerías; no se reemplazan ZIPs históricos. Código publicado en felixdroidhuerta/LQTAC_Studio desde clon dedicado para conservar historial y no usar origin del antiguo sitio.

## Icono y shell Windows — local posterior a 0.13.0 (24/10/2026)

Corrección posterior al aviso de lentitud: BAT fast path por existencia de LQTAC Studio.exe, sin fingerprint SHA de los ~210 MB ni PowerShell previos a cada lanzamiento. prepare-runtime sigue comprobando fingerprints cuando se invoca explícitamente durante desarrollo o cuando falta el EXE; tras actualizar assets ejecutar ese helper para regenerarlo. Fallback a electron.exe si falla preparación, sin impedir acceso al editor. Registro de asociación diferido a did-finish-load para evitar competir con carga inicial del renderer. No se detienen procesos/proyectos abiertos para aplicar la corrección.

desktop/assets conserva app-icon-source.png suministrado por el usuario, lqtac-studio.png de 256 px e ICO multirresolución. tools/build-icon.cjs se ejecuta con Electron normal (no ELECTRON_RUN_AS_NODE), usa nativeImage para conversión de formato sin redibujar, DIB BGRA bottom-up + máscara AND para tamaños 16–128 y PNG para 256. Se evita PNG comprimido en tamaños pequeños por diferencias de compatibilidad GDI. tools/set-executable-icon.ps1 incorpora RT_ICON y RT_GROUP_ICON con API Win32 UpdateResource y recursos neutrales/1033; no descarga rcedit ni cambia el Electron original.

tools/prepare-runtime.ps1 crea al lado del runtime un LQTAC Studio.exe con icono; un fingerprint SHA-256 de Electron original + ICO evita repetir el trabajo si no cambia. El BAT ejecuta esa preparación oculta y pasa argumentos al editor. El EXE interno sin argumentos sigue siendo un motor Electron: lanzar el BAT en desarrollo. build-portable excluye esa copia de desarrollo al copiar runtime, renombra la copia original, incorpora icono y copia assets/integración. Los EXE modificados necesitan firma propia si se desea distribuir con firma; no se añade firma en esta tarea. Ventana usa icon explícito y AppUserModelID LQTAC.Studio.

windows-integration.cjs detecta argumentos absolutos .lqts sin confundirlos con opciones, compone configuración para desarrollo (EXE + directorio app + %1) o portable (EXE + %1), y ejecuta windows-association.ps1 mediante execFile con JSON en entorno, sin interpolar rutas en código de shell. Registro solo HKCU: Software/Classes/LQTACStudio.Project con DefaultIcon y shell/open/command; OpenWithProgids, Capabilities y RegisteredApplications. Lee UserChoice y vista HKCR para respetar asociaciones existentes; solo asigna default cuando no hay handler o ya es propio. Nunca escribe/hash-manipula UserChoice. Registro idempotente, actualización de rutas/iconos propios, IconRevision SHA-256 y SHChangeNotify cuando cambia. Errores de registro no bloquean la apertura del editor.

main reconoce la entrada real del programa para registrar/bloquear instancia; pruebas que requieren main desde su runner no registran asociaciones reales ni adquieren el lock del usuario. requestSingleInstanceLock + second-instance encaminan aperturas a una cola. Arranque .LQTS espera demoReady, valida con project-io, restaura estado e historial y actualiza ruta actual/título. Al recibir un proyecto en caliente comprueba que no haya editor/render/grabación, valida antes de preguntar, permite guardar en la ruta anterior o cancelar, y no cambia currentProjectPath hasta haber restaurado. ErrorBox para archivos inválidos y aviso de medios faltantes. No se altera el importador VEGAS.

tools/verify-windows-association.ps1 usa un árbol HKCU temporal validado con GUID, comprueba ausencia/asignación, rutas Unicode con comillas, idempotencia, asociación y UserChoice ajenos conservados, actualización de rutas propias; limpia solo su árbol. verify-shell.cjs prueba arranque por argumento y evento second-instance, una ventana, cancelación, guardado anterior y archivo inválido. Extrae icono nativo del EXE con System.Drawing y lo compara con el ICO; la API Electron getFileIcon puede devolver iconos de caché genéricos para EXE y no se usa como única prueba. Con LQTAC_VERIFY_REGISTERED_ICON=1 comprueba además el icono real de un .LQTS (ejecutado tras registro autorizado en este equipo). Comprueba que el EXE modificado responde --version. verify-new-project y verify-menus pasan como regresión.

La asociación real .LQTS se ha registrado para el usuario actual y se ha verificado el icono. Los portables históricos no se modifican, no se genera ZIP ni se publica código en esta entrega. Si se mueve el portable/carpeta principal, ejecutarlo desde la nueva ruta para reparar su registro; no se reclama un default ajeno. Archivo generado propio sigue .LQTS, no se registra el error tipográfico LTQS.

## Menús superiores, PNG y GIF — local posterior a 0.13.0 (24/10/2026)

menu-controls.js se carga al final de dist para disponer de los comandos de todos los módulos. Reutiliza los nodos fileMenu/editMenu, agrega insertMenu/toolsMenu y una tabla de comandos que llama las funciones originales de proyecto, pistas, FX, subtítulos y captura. Los listeners capture de los nuevos menús evitan dobles ejecuciones de los delegados legados; Editar conserva su delegado anterior. No se duplican algoritmos de edición ni se cambian atajos de timeline. Los submenús de FX derivan effectsCatalog y llaman openEffectEditor/openAudioEffectEditor; Pan/Crop usa su editor propio. enabled se recalcula al abrir. Roles menu/menuitem, aria-expanded/controls, foco por teclado, Escape parcial/total y colocación ajustada al viewport. Menús mantienen paleta/fuente y grupos visuales. Se eliminan solo los tres accesos laterales de grabación; FX y Subtítulos conservan atajos.

openMedia(kind) añade filtros explícitos video/audio/image; el main valida tipo y filtra extensiones del resultado. Sin argumento conserva importación genérica existente. studioImport añade cards bajo un único checkpoint, no usa addMediaToTimeline ni crea pistas. Imágenes conservan kind video en el esquema legado de biblioteca; este cambio solo incorpora importación, no un compositor de imágenes nuevo. La creación de pistas llama addTimelineTrack con tipo correspondiente.

export-controls.js añade modal de fotograma y opción GIF al render existente. Fotograma usa captureProjectFrame con exportSize 720/1080/2160 y bloqueo exporting, PNG por IPC export-still restringido al editor local, validación firma/base64/tamaño y decodificación nativeImage con máximo 3840 × 2160. Guardado nativo PNG con wx, sin sobrescritura. Se restaura tamaño/cabezal al finalizar/cancelar/fallar. No incluye encabezados/controles de UI; captura la composición del proyecto.

render-engine añade preset gif video+silent, 10/15 fps adicionales y no prepara/mezcla audio en GIF. El pipe PNG/compositor sigue siendo el de vídeo; FFmpeg usa split, palettegen stats_mode=single y paletteuse new=1 por fotograma, sin almacenar toda la secuencia para una paleta global. Salida en bucle infinito, hasta 256 colores por frame, sin audio. Perfil inicial GIF 640 × 360/15 fps; exporta hasta último evento como otros perfiles. Presets AV, cancelación y protección de medios origen se conservan. Vídeo GIF sigue validando el proyecto y medios existentes. No hay rango de exportación ni preservación de color de vídeo de alta profundidad en GIF.

verify-menus.cjs genera medios sintéticos y prueba top menus, movimiento de capturas, selector de vídeo/audio/imagen sin tocar timeline, pistas vacías, FX individuales, split/undo agrupado, PNG 4K decodificado y GIF renderizado/decodificado sin audio. Verifica teclado y obtiene capturas de menús. verify-new-project, verify-project y verify-layout se ejecutan como regresión. verify-portable-runtime incluye hashes de módulos y comprueba capturas en insertMenu, ya no fileMenu. El build copia dist completo; no necesita binarios externos nuevos. Código local únicamente, sin build/publicación de otro portable.

## Pantalla/ventana — implementación local posterior a 0.13.0 (24/10/2026)

screen-controls.js añade menú/lateral y openScreenRecorder, reutiliza openCameraRecorder('screen') y la misma máquina de estados/grabación/guardado/inserción de cámara para no duplicar rutas. Selección de pantalla/ventana y flags independientes micrófono/sistema, por defecto sin audio. getDisplayMedia obtiene solo la fuente elegida y solicita audio únicamente cuando se marca sistema. getUserMedia audio-only se usa solo al marcar micrófono; no se abre cámara. Si hay dos señales, AudioContext→MediaStreamDestination las mezcla a ganancia 0.5 por entrada sin conectar a los altavoces. La pista mezclada y el vídeo comparten el MediaRecorder existente, tiempos/grupo media. dispose detiene también los tracks fuente que no forman parte del stream mezclado, cierra el contexto y cancela la selección nativa; el IPC de cancelación se envía antes de esperar cierre para no cancelar por carrera una preparación posterior.

screen-capture.cjs inyecta desktopCapturer y getWindow; lista solo id/nombre/tipo, sin miniaturas ni lectura de contenido ajeno para el selector. Exige selección explícita de un id previamente listado, token interno de un solo uso con caducidad de 30 s, mainFrame exacto y URL local exacta. El handler vuelve a enumerar y comprueba que la fuente sigue existiendo antes de concederla. Solo agrega audio:'loopback' si se marcó sistema y getDisplayMedia pidió audio; en Windows es la salida global incluso para una ventana. Nunca escoge la primera fuente automáticamente. Cancelación/cierre/caída invalida selección. IPC de fuentes/select/cancel usa recordingSender y preload con argumentos limitados; no expone desktopCapturer al renderer.

El Electron instalado (38) reporta getDisplayMedia como permiso media con mediaTypes vacío: el handler permite exclusivamente ese caso desde el frame local con selección vigente; también admite display-capture para runtimes que lo reporten así. No se conceden permisos genéricos de cámara/micrófono por preparar pantalla. Los handlers de cámara/audio conservan consentimiento separado. backgroundThrottling:false permite procesar captura/temporizadores al minimizar. Start comparte el servicio camera-recording.cjs con mode validado camera/screen para nombre de destino; conserva bloqueo mutuo, temporales, remux copy, no sobrescritura y retry. El portable futuro copia screen-capture.cjs y dist; verify-portable-runtime incluye hashes/acceso de pantalla. Sin descarga, conexión ni modelo nuevo.

verify-screen.cjs prueba captura real del SO de una BrowserWindow fixture propia; restringe desktopCapturer.getSources a esa ventana y no ofrece ni captura pantallas/ventanas personales. Verifica imagen, grabación nativa, decodificación VP8 sin audio, playback, biblioteca/pista, tiempos/historial y LQTS, y liberación al cancelar destino. Audio usa señales sintéticas de 440/880 Hz, no loopback personal/micrófono físico; ambas frecuencias se verifican tras decodificar la toma, y se comprueban grupo y liberación. Tests del servicio prueban fuente obligatoria, frame ajeno, permiso de un solo uso, loopback opcional y fuente desaparecida. verify-camera y verify-microphone pasan como regresión. Pendiente prueba del usuario del loopback real de Windows y sus drivers. No hay captura de región, pause/resume, webcam superpuesta, audio por aplicación, pistas separadas para sistema/micrófono ni recuperación de toma tras crash. Código local solamente: no se genera ni publica ZIP.

## Cámara — implementación local posterior a 0.13.0 (24/10/2026)

dist/assets/camera-controls.js añade diálogo modal de captura, menú Archivo y acceso lateral. getUserMedia solicita solo video o video+audio tras Activar cámara; constraints ideales 480/720/1080 y 30 fps, selector de dispositivos e indicador de configuración real. Vista previa muted sin monitorización del micrófono, reproducción del proyecto detenida y workspace inert mientras se captura. MediaRecorder VP8 (+Opus si audio) entrega blobs cada 500 ms, serializados a ArrayBuffer/IPC sin acumular la toma entera en memoria. Stop espera el último dataavailable y escritura antes de finalizar; todos los tracks se liberan también al cancelar, descartar, desconectar o cerrar. Backlog >32 MiB detiene captura; el servicio limita bloques a 16 MiB, total a 8 GiB y duración de recepción a dos horas.

desktop/camera-recording.cjs mantiene una sola toma nativa, token UUID, temporal propio y cola serial. FFmpeg local remultiplexa con stream copy a un archivo WebM con duración/índice para seek sin segunda codificación; se publica con COPYFILE_EXCL usando stage único en la carpeta destino. Valida destino absoluto .webm, no sobrescribe, conserva raw en error para reintentar en otra ruta. Cleanup solo borra el temporal propio validado y su stage; nunca archivos finales. No utiliza repositorios, servidores ni descargas en ejecución. Captura comprimida distinta de la ruta WAV PCM del micrófono independiente, que sigue sin cambios de formato.

Preload expone cameraRecordingStart/Append/Finish/Abort; main restringe los cuatro IPC al renderer principal y URL exacta del editor local. Bloqueo mutuo de inicios con micrófono/exportación/diálogo de destino. Permisos media separados audio/video, confirmación nativa local y checks de origen/main frame; no se concede display capture. Cierre normal con cualquiera de las tomas pendientes ofrece volver o descartar; caída/cierre del renderer aborta ambos servicios. Se conserva el control de permisos del micrófono previo.

Tras finalizar, se lee metadata real con HTMLVideoElement y se añade biblioteca/pistas con una única entrada de historial. Vídeo/audio comparten archivo, posición/duración reales y grupo media, sin pista de audio ficticia cuando no hay micrófono. Crear pistas siempre nuevas evita modificar contenidos existentes. El archivo guardado sobrevive a Deshacer. Persistencia usa esquema LQTS existente. Si falla la lectura de metadata se informa de la ruta guardada y se permite reintentar inserción/importación.

verify-camera.cjs usa exclusivamente cámara/audio generados por Chromium: captura real MediaRecorder→IPC→FFmpeg, playback/seek, streams decodificados VP8/Opus, vídeo sin audio, biblioteca/inserción manual, grupo/duración/posición, undo/redo, LQTS, cancelación de destino, descarte, rechazo de permiso, race de archivo existente y reintento, tokens inválidos y cierre con toma pendiente. Verificación de micrófono existente pasa como regresión. La cámara física y permisos reales de Windows quedan pendientes de prueba del usuario; grabación de micrófono real ya validada por el usuario. Sin pantalla, pausa/overdub, recuperación de tomas tras crash ni sincronización de latencia calibrada. build-portable incluye el servicio y dist, verify-portable-runtime coteja hashes/acceso de cámara para el próximo paquete. No se ha generado ZIP ni publicado en esta entrega.

## Local 0.11.0 — pista de subtítulos y ASR offline

Nuevos dist/assets/subtitle-model.js (validación de texto/estilo, parse/serialize SRT, composición Canvas), subtitles-controls.js (pista S, bloques, diálogo, panel, render overlay, burn-in y flujo ASR), desktop/subtitles-service.cjs (preparación de audio con render-engine, conversión mono 16 kHz PCM16, whisper-cli y reubicación de tiempos). IPC y preload: status/transcribe/cancel/progress/import/export de subtítulos. Una operación ASR global, máximo cuatro horas; cancellation propaga a render/FX/CLI y no confirma cambios parciales. Drena stdout para evitar bloqueo en transcripciones largas. Usa modelo relativo al cwd de whisper-cli para evitar fallos con el NBSP del perfil de usuario; entrada/salida también se pasan relativas cuando están en el mismo volumen. Pruebas reales en este equipo con rutas Unicode.

Esquema LQTS 1 extendido con track/clip.kind=subtitle, filePath vacío, subtitleText y subtitleStyle opcionales en eventos AV y obligatorios/validados para subtítulos. El render de audio ignora eventos de texto al validar medios; duración final incluye los subtítulos. El render Canvas los compone al final, compartiendo modelo con overlay de vista previa; casilla renderSubtitles controla exclusivamente burn-in. Cada bloque usa sus propios tiempos y estilo, no un archivo multimedia. El drag restringe cambios entre pistas de distinto tipo. Trim de texto no consulta duración de un medio; split y clipboard conservan texto/estilo. No se agrupan automáticamente con audio ni se recalculan tras editar ese audio. No exportación de texto editable embebido en MP4: salida SRT o píxeles quemados.

Subtitles-controls mueve Pan/Crop/FX generales al catálogo y la información VEGAS al panel Proyecto; sustituye asistencia ficticia por panel Subtítulos. Propiedades desde inspector oculta el antiguo fieldset Pan/Crop y no altera su curva al aplicar otras propiedades. Conserva el formulario numérico legado accesible a pruebas/integraciones directas. El inspector se sincroniza con selección de timeline, no biblioteca. Los bloques de subtítulos abren su editor propio al doble clic.

Dependencias fijadas: whisper.cpp v1.9.2 (ZIP oficial SHA256 49dcc16de826f20bd53d44f947a1ae49dfa81f86cad67a64d80820cb192d674a); modelo ggerganov/whisper.cpp revisión 5359861c739e955e79d9a303bcbc70fb988958b1, ggml-small.bin SHA256 1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b. tools/setup-whisper.ps1 verifica antes de instalar; bin/ y models/ ignorados en Git. Licencias de motor/modelo incluidas en desktop/speech. build-portable.ps1 copia runtime, modelo y avisos, no el ZIP descargado duplicado; requiere activos locales antes de empaquetar. No descarga, telemetría ni API añadida durante el uso normal.

Prueba nueva: verify-subtitles.cjs; argumento opcional WAV español para ASR real de UI. Comprueba edición, renderizado/burn-in, SRT IPC, LQTS, historial, copy/split, composición MP4 decodificada; con WAV prueba generación real y cancelación. Resultado real: muestra TTS Helena reconocida en español y muestra JFK reconocida en inglés, offsets de proyecto conservados. Esto no mide calidad en ruido/canciones ni garantiza sincronización por palabra. Tests AV/VEGAS previos pasan sin nuevos requisitos de modelo salvo la prueba ASR. Portable publicado sigue 0.10.1; no se ha publicado ni generado otro en esta entrega.

## Portable 0.10.1 — publicación solicitada

build-portable.ps1 empaqueta el estado actual sin actualizar dependencias. verify-portable-runtime.cjs carga el main/preload/HTML del paquete, comprueba 14 tarjetas de vídeo, Pan/Crop y herramientas de puntos, genera vídeo con FFmpeg incluido y coteja hashes de los módulos clave y del ejecutable Electron. Prueba superada el 23/10/2026; no sustituye una prueba integral en otro equipo. Incluye los cambios de Mayús posteriores a la corrección 0.10.1. El SHA-256 del ZIP queda registrado en desktop/RELEASE-SHA256SUMS.txt.

## Pan/Crop · arrastre restringido con Shift

pan-crop-editor.js evalúa PointerEvent.shiftKey solo al trasladar el interior. Selecciona el eje dominante en coordenadas de fuente tras un umbral de dos unidades canvas; fija la coordenada perpendicular. Conserva el eje durante esa pulsación. Cambiar el modificador reinicia el anclaje en la última posición de cámara/puntero, evitando saltos. No altera tamaño, rotación ni el arrastre de esquinas. Regresión verify-pan-crop-editor.cjs ampliada con ejes X/Y, rotación, deriva contraria y Shift a mitad de gesto.

## Local 0.10.1 — edición común de puntos

keyframe-controls.js se carga antes de los editores. install conserva selección por referencia, añade menú de borrar, atajos aislados, campo de retiming y resolución desde lista. Pan/Crop incorpora arrastre de diamantes (antes solo cambiaba el cursor). La selección no depende de una igualdad con el valor redondeado del slider. retime ordena las curvas y rechaza colisiones exactas; las posiciones/valores de cámara se conservan al cambiar el tiempo. FX de vídeo/audio usan el helper para seleccionar/borrar y permiten cruzar nodos durante el arrastre; limpieza de listeners al cerrar. No cambia esquema LQTS.

Envolventes: selección explícita de nodo, menú de borrar, Delete con prioridad sobre clips, neutralidad cuando no hay puntos y extremos visuales no serializados. drawEnvelope deja de insertar automáticamente un nodo final. restoreProject conserva arrays vacíos. Los atajos globales de clips no se ejecutan con un diálogo abierto. Nuevo verify-keyframe-controls.cjs comprueba la regresión del usuario y los otros editores.

## Local 0.10.0 — editor visual de Pan/Crop

Nuevo dist/assets/pan-crop-editor.js cargado al final de index.html: escritorio canvas, overlay de cámara rotada y cuatro tiradores, preview propio con FX y fondo negro, presets de aspecto en píxeles de fuente, bloqueo de proporción, zoom de escritorio, campos numéricos plegables, transporte local y línea/lista de keyframes. Estado de trabajo en borrador con una sola operación de historial al aplicar. No cambia esquema panCrop ni LQTACWork.drawCrop/cropAt; reusa compositor y metadatos de offset/rate. El redimensionado calcula en ejes rotados y ancla esquina opuesta. La fase temporal de FX sigue siendo local al evento.

work-controls.js abre editor visual al doble clic en vídeo; audio y formularios de propiedades originales se mantienen. Botón openVisualCrop en inspector. Teclado del diálogo aislado de atajos de borrar/reproducir del proyecto. Cancelar/Escape descarta; cerrar elimina listeners temporales y el elemento video. El editor se limita a 1000 fotogramas según validación existente. Preset/bloqueo no se serializan como estado aparte: las dimensiones resultantes sí; la selección de formato se deduce del encuadre actual.

verify-pan-crop-editor.cjs valida UI, geometría, timeline, reproducción con offset/rate, preview/export en píxeles, persistencia e historial. La conversión VEGAS mantiene sus restricciones previas: disponer de editor de rotación no amplía el mapeo certificado del puente. Fuentes 0.10.0; portable publicado 0.8.1 sin cambios.

## Local 0.9.0 — seis efectos creativos

effects-model.js exporta creative: definición central de seis grupos, etiquetas, defaults y rangos. Amplía dinámicamente videoDefaults/ranges.video (16 parámetros nuevos); el límite de claves de animación deriva del número real de parámetros. Proyectos previos toman intensidades cero. effects-controls.js amplía catálogo y formulario general, evitando campos ausentes al serializar todos los defaults. effect-editor.js reutiliza editor/curvas para cada grupo.

effects-video.js implementa distorsión CRT/VHS/glitch, separación RGB, halos glow/bloom y textura de película en el shader original. uniform clock recibe tiempo del evento desde draw(source,fx,time), igual en monitor/editor/captura exportada. No usa Date, Math.random ni servicios externos. Patrón fijo a tiempo dado; reinicia fase procedural al recortar/dividir. Se conserva alfa, CRT recorta exterior curvado, radios en píxeles de fuente, glow/bloom aproximados con muestras limitadas. No efectos de audio nuevos, plugins externos, orden editable ni garantías 4K/HDR.

Prueba nueva desktop/verify-creative-effects.cjs: píxeles, neutralidad, determinismo, variación temporal, alfa, catálogo/editores, formulario general, keyframes, undo/redo, captura de exportación y LQTS en disco. Versión de fuentes 0.9.0; no se ha generado ni publicado un nuevo portable en esta entrega. El portable de GitHub sigue en 0.8.1. Consultar FUNCIONAMIENTO.md para uso y límites.

## Catálogo FX y siguiente fase

Botón lateral renombrado de Video FX a FX en dist/index.html; effects-controls.js y verify-effects.cjs usan el nuevo nombre. README actualizado. Aceptación del usuario de fase 1 el 23/10/2026. La fase 2 está pendiente de concretar; no marcar propuestas de efectos avanzados como implementadas.

## Actualización local 0.8.1 — curvas múltiples de EQ

audio-effect-editor.js dibuja simultáneamente bass/mid/treble con colores, grosores/trazos y leyenda seleccionable. Hit testing prioriza nodos cercanos y luego curvas, con desempate por banda activa. El arrastre conserva la banda capturada y no altera las otras curvas. No cambia el modelo ni el DSP. verify-audio-editor.cjs comprueba tres controles de leyenda, selección automática de medios y arrastre independiente.

## Actualización local 0.8.0 — efectos de audio con keyframes

Aceptación expresa del editor de vídeo 0.7.0 por el usuario el 23/10/2026. Nuevo audio-effect-editor.js: borrador por efecto, onda, transporte independiente, bypass original y curvas editables. Once parámetros numéricos admiten audioFx.animation={parametro:[{time,value},...]}; tiempos relativos al evento, interpolación lineal y validación compartida. Los interruptores de filtros no se animan. Guardado, historial y copia conservan curvas; trim/split usan effects-model.slice para preservar valores de frontera.

desktop/audio-automation.cjs genera un grafo FFmpeg con comandos asendcmd por etapa, bloques de 256 muestras a 48 kHz y expresiones interpoladas; los filtros pueden añadir su propio buffering. effects-audio.cjs prepara/cancela y cachea WAV float estéreo, con hash de fuente, parámetros y segmento. waveform extrae picos del WAV sin cargarlo completo. IPC de onda restringido a effects-cache. Escucha, monitor y render reutilizan el resultado. Para automatización se recorta offset/duración y aplica velocidad antes de FX; el WAV preparado se reproduce desde cero a velocidad 1. Los metadatos originales permanecen intactos; render-engine ajusta únicamente su copia del evento para evitar aplicar offset/velocidad dos veces.

Modo estático conserva el procesamiento de fuente completa anterior. Por ello no se promete equivalencia bit a bit al activar animación ni continuidad de memoria DSP al cortar. Normalización dinámica: loudnorm base y ganancia relativa al objetivo; no es medición/normalización adaptativa instantánea. Reverb es ambiente multitap, no convolución. Retardo animado puede alterar tono. Preparar escucha tras cada cambio; no se promete DSP en vivo. El editor escucha el evento antes de la mezcla de pistas.

Pruebas nuevas: desktop/verify-audio-animation.cjs (EQ medida y filtros decodificados), desktop/verify-audio-editor.cjs (UI, escucha/búsqueda, mezcla/exportación medida con offset y rate, persistencia, undo/redo, split/copy). build-portable.ps1 incluye audio-automation.cjs y los nuevos assets. No requiere repositorios ni conexión. La compatibilidad VEGAS mantiene sus límites existentes; no se traducen plugins VEGAS a estos filtros.

## Actualización local 0.7.0 — editor de efecto y keyframes

Nuevo `dist/assets/effect-editor.js`, cargado después de effects-controls: las tarjetas del catálogo abren una ventana individual. Para vídeo, usa un elemento video dedicado, una previsualización canvas propia, controles del filtro elegido y una curva editable. Los cambios viven en un borrador; solo Aplicar registra historial y reemplaza clip.dataset.videoFx. La reproducción del proyecto no avanza al previsualizar este clip.

`videoFx.animation` es un objeto con curvas por nombre de parámetro numérico: por ejemplo `{ "saturation": [{"time":0,"value":1},{"time":5,"value":0}] }`. Cada curva tiene hasta 1000 puntos ordenados, valores dentro de effects-model.ranges.video y tiempos relativos al evento, no mayores que su duración. LQTACEffects.at interpola; slice recalcula fronteras de recortes/divisiones. effects-video.draw recibe el tiempo local y comparte evaluación con captura de exportación. LQTS, copiado e historial conservan las curvas.

Audio: ventana individual con preparación de caché y escucha/seek de fragmento, pero sin curvas todavía. Booleanos/color de croma y LUT tampoco están animados. No inventar equivalencia con automatización/curvas Vegas: la interpolación FX actual es lineal. Nueva prueba verify-effect-editor.cjs; pruebas de controles/puente desactivan background throttling para verificar capturas aunque la ventana de pruebas no esté en primer plano.

## Actualización local 0.6.0 — 23/10/2026: efectos por evento

Corrección local 0.6.1: effects-controls.js añade effectsPanel como hijo de side-panel. La pestaña Video FX oculta los hermanos y muestra 15 tarjetas, aunque no haya selección. Cada tarjeta resuelve un evento del tipo apropiado y abre openClipEffects; el resto de pestañas oculta effectsPanel. verify-effects.cjs verifica el clic real de la pestaña y tarjeta, no solo la llamada directa al diálogo.

La entrega añade `dist/assets/effects-model.js` (defaults, rangos, validación compartida, parser .cube y filtros FFmpeg), `effects-video.js` (shader WebGL propio) y `effects-controls.js` (diálogo modal). `desktop/effects-audio.cjs` prepara cachés WAV locales con FFmpeg, desduplica trabajos y permite cancelarlos. El empaquetador copia este módulo y todos los assets. No se han incorporado glfx, PixiJS, Tuna, Tone.js, Airwindows ni RNNoise; se usa el FFmpeg existente y código propio.

El esquema LQTS 1 admite ahora `clip.videoFx` y `clip.audioFx`, validados por project-io. Se restauran, copian y dividen con el evento. Las LUT son valores JSON integrados, no paths externos. Los valores originales de LQTS sin estos campos equivalen a efectos desactivados. Las versiones antiguas pueden ignorar estos campos y perderlos al guardar: no abrir/reescribir montajes con FX en versiones previas.

Preview: clipEffectsState cachea el JSON del dataset; el vídeo se procesa antes de drawCrop. El audio resuelve effectsAudioPath por IPC a una fuente procesada, sin alterar filePath ni los tiempos originales. Exportación: captura el mismo compositor de vídeo y render-engine prepara/reutiliza la misma caché para audio antes de sus filtros temporales y de ganancia.

La caché se identifica por SHA-256 de ruta, tamaño/mtime y lista de filtros. Está en userData/effects-cache, no en Git ni LQTS. Se procesa la fuente completa, incluida la referencia de normalización; los tails no amplían el montaje. El usuario cancela preparación desde el diálogo; al salir se detienen hijos de este servicio. Pendiente purga/cuotas/progreso porcentual y tratamiento de modificaciones externas de la fuente durante una sesión.

Límites de esta primera tanda: normalización de una pasada aproximada, reverb de multieco, blur de nueve muestras, LUT 8 bits, orden fijo, sin automatización FX ni cadenas de pista/bus. Consultar FUNCIONAMIENTO.md. La incorporación al puente VEGAS de efectos homónimos no es automática: no equivalen a plugins/curvas Vegas ni certifican sus parámetros. Nueva prueba: ejecutar verify-effects.cjs con Electron. Prueba píxeles, alfa, LUT, audio procesado, interfaz, historial, serialización, copia/división y exportación.

Actualizado: 23-10-2026. Código: **0.5.3**. Proyecto privado: https://github.com/felixdroidhuerta/LQTAC_Studio.

Estado vigente: ver la sección final «Transporte del reproductor — 0.5.3». Ya existe un puente estructural inicial; las secciones de 0.3.4 se conservan como contexto histórico. No declarar lectura binaria universal ni compatibilidad audiovisual completa con VEG.

## 1. Objetivo y condiciones del producto

- Editor de vídeo/audio local para Windows, con ejecutable portable, utilizable sin conexión. No convertirlo en un sitio web ni depender de repositorios, servicios o códecs descargados en tiempo de ejecución.
- Interfaz inspirada en la distribución de VEGAS: timeline inicialmente en la mitad inferior, separador ajustable, herramientas a la izquierda, biblioteca en mosaico y monitor sin dominar la ventana. Mantener colores, tipografías y marca LQTAC.
- Edición no destructiva. Vídeo/audio separados pero agrupados al importar MP4. Las transiciones duran lo que dura el solapamiento.
- Compatibilidad VEGAS prioritaria, pero debe demostrarse con proyectos reales y declarar las pérdidas. La conversión inicial mediante VEGAS puede requerir ese programa; el LQTS resultante debe funcionar después sin VEGAS y sin Internet.
- Actualizar `FUNCIONAMIENTO.md` con cada función, sus límites y pruebas. Separar comprobación técnica de aceptación del usuario.

## 2. Arquitectura y mapa de archivos

| Archivo | Responsabilidad |
| --- | --- |
| `dist/index.html` | Fuente principal de interfaz y lógica de edición. HTML/CSS y JavaScript inline, sin React ni fase de compilación. Aunque se llame dist, actualmente se edita directamente. |
| `dist/assets/transitions.js` | Compositor WebGL, catálogo y máscara de luminancia; admite opacidad individual de los dos vídeos. |
| `dist/assets/transition-shaders.js` | Shaders de transiciones incorporados localmente. |
| `desktop/main.cjs` | Electron: ventana, diálogos de archivos, IPC, rutas locales, duración nativa, proyectos y trabajos de exportación. |
| `desktop/preload.cjs` | API `window.lqtacDesktop` mediante contextBridge/IPC. |
| `desktop/project-io.cjs` | Validación, lectura y escritura de LQTS; rutas relativas, alternativa absoluta y detección de medios ausentes. |
| `desktop/render-engine.cjs` | Proceso FFmpeg, perfiles, mezcla de audio, entrada PNG por tubería, cancelación y salida temporal. |
| `desktop/veg-parser.cjs` | Inspección heurística de cadenas UTF-16 de VEG/VF. No reconstruye eventos. |
| `desktop/verify-project.cjs` | Pruebas Electron con medios sintéticos, persistencia, exportación y edición. |
| `desktop/verify-playback.cjs` | Pruebas de reproducción con medios reales y rutas específicas del equipo original. No es portable sin adaptar fixtures. |
| `desktop/build-portable.ps1` | Genera carpeta Windows x64 y ZIP con Electron, aplicación, FFmpeg, licencias, Shapes y manual. |
| `desktop/portable-package.json` | Manifest del paquete final; mantener versión alineada con desktop/package.json. |
| `Shapes/` | Máscaras de ejemplo, incluida la marca negra sobre blanco. |
| `FUNCIONAMIENTO.md` | Manual funcional y registro de validación. |
| `desktop/EXPORTACION.md` | Procedencia y licencias del motor de exportación. |

Stack comprobado en el equipo original: Electron 38.8.6 (manifest `^38.2.0`), ffmpeg-static 5.3.0, binario FFmpeg 6.1.1 Windows x64. El lockfile determina las resoluciones; no actualizar dependencias automáticamente al retomar el proyecto. Herramienta utilizada: pnpm 11.25.0. Node y pnpm son solo requisitos de desarrollo, no del portable.

La ventana tiene contextIsolation=true, nodeIntegration=false y sandbox=false. No introducir contenido remoto o ejecución de scripts procedentes de proyectos. Pendiente endurecer CSP, validación IPC y superficie de acceso a archivos antes de una distribución amplia. Un JSON válido no es garantía de seguridad ni de fidelidad.

### Estado y reproducción

El modelo de edición vive principalmente en el DOM: `.track` y `.clip`, con datos temporales en dataset. Las posiciones CSS son porcentajes derivados, no tiempos maestros. Los segundos reales son `startSeconds`, `durationSeconds` y `sourceOffsetSeconds`.

En `dist/index.html`, localizar por nombre:

- `projectSnapshot()` / `restoreProject()`: serializar y recuperar el montaje.
- `clipTiming()` / `clipLocalTime()`: tiempos de proyecto y posición dentro de la fuente.
- `refreshTimelineScale()`: ajustar la escala visual sin acortar eventos.
- `renderTimelineAt()`: reproducir simultáneamente los eventos activos; vídeo en videoPool y audio en timelineAudioPool.
- `clipFadeGain()` / `eventGain()` / `envelopeValue()`: fades individuales, solapamientos y automatización de pista.
- `transitionMasks` y `envelopePoints`: WeakMaps ligados a elementos DOM; hay que serializar sus valores, no los nodos.
- `historyCheckpoint()` / `navigateHistory()`: historial de snapshots, sin persistencia entre sesiones.
- `captureProjectFrame()`: búsqueda de fotograma y composición para exportar.

La vista previa usa elementos multimedia Chromium y WebGL, no MLT. El audio de los elementos de vídeo está silenciado para no duplicar las pistas de audio separadas. La exportación genera fotogramas PNG secuencialmente y los entrega a FFmpeg con control de escritura; el audio se mezcla con filtros FFmpeg. No es un motor de audio de precisión de muestra ni una exportación acelerada garantizada.

## 3. Arranque en un equipo nuevo

1. Clonar el repositorio privado con una cuenta autorizada. No sustituir un checkout con cambios ajenos.
2. Usar Windows x64 con Node compatible con pnpm 11, pnpm y PowerShell. La instalación inicial de dependencias requiere red o un almacén/cache previamente preparado.
3. Desde la raíz del clon:

```powershell
Set-Location desktop
pnpm install --frozen-lockfile
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
pnpm start
```

`pnpm-workspace.yaml` permite los scripts de instalación de Electron y ffmpeg-static. Comprobar que existen `desktop/node_modules/electron/dist/electron.exe` y `desktop/node_modules/ffmpeg-static/ffmpeg.exe`. No desactivar indiscriminadamente las políticas de seguridad del equipo si la instalación falla.

También se puede usar `LQTAC Video.bat` desde un checkout con las dependencias instaladas. El ZIP automático **Source code** de GitHub no contiene el motor; no confundirlo con un portable listo para ejecutar.

Para generar un portable desde la raíz:

```powershell
.\desktop\build-portable.ps1
```

El script devuelve la ruta del ZIP y exige una carpeta de salida nueva. El usuario final debe extraer el paquete completo y abrir `LQTAC Studio.exe`. No copiar solo el EXE. El portable incluye FFmpeg en `resources/app/desktop/codecs` y sus avisos originales; revisar obligaciones GPL y fuentes correspondientes antes de distribución pública/comercial. Los shaders mantienen sus licencias MIT en `dist/THIRD-PARTY`.

Las rutas de demo en main.cjs y de pruebas reales pertenecen al equipo original: que no existan en otro equipo no implica compatibilidad VEGAS ni debe provocar que se inventen medios. No subir canciones/proyectos personales como fixtures sin autorización.

## 4. Estado funcional de 0.3.4

Implementado y comprobado técnicamente:

- Importación de medios locales; timeline multipista; crear pistas; zoom/desplazamiento; selección múltiple y por recuadro.
- Arrastrar eventos entre pistas, eliminar, agrupar/desagrupar y mantener parejas de vídeo/audio.
- Recorte por extremos con desplazamiento dentro de la fuente; división con S en el cabezal.
- Ctrl+C/V; Ctrl+Z/Y y Ctrl+Mayús+Z; menú Editar y botones de historial.
- Envolventes de pista de volumen/opacidad con puntos y segmentos editables.
- Fade-in/out individual por tiradores superiores, independiente del grupo, con efecto en vista previa y exportación.
- Fundidos por solapamiento y transiciones WebGL; máscara PNG integrada con movimiento, blur, suavidad e inversión.
- Cabezal arrastrable desde flecha, contador y regla; pausa y búsqueda de posición con vista previa.
- Archivo → Guardar/Abrir LQTS. Exportar MP4/H.264/AAC, WebM/VP9/Opus, WAV PCM24, MP3, FLAC y M4A/AAC.

Límites importantes para el importador:

- No hay apertura fiel de VEG, relocalización interactiva de medios perdidos, recolector de medios ni guardado automático.
- Los botones/controles visibles no equivalen todos a funciones implementadas: no asumir soporte de mute/solo, buses, plugins, inspector completo o efectos por ver sus etiquetas.
- El reloj/contador y varios cálculos usan 24 fps. Las salidas permiten 24, 25 o 30 fps; escribir otro valor en `fps` del JSON no implementa soporte integral de 23.976/29.97/50/60 ni drop-frame.
- Ganancia de envolvente 0..1, interpolación lineal. No se representan niveles superiores a unidad, curvas Vegas arbitrarias ni mezcla/buses/multicanal completos.
- La transición se asocia al evento entrante, no a un objeto independiente por cada pareja de solapamiento. Más de dos eventos superpuestos en la misma pista y cortes dentro de una transición necesitan especial validación.
- Sin modelo completo para velocidad, reversa, loop, varias tomas/streams, imagen fija, generadores, pan/crop, track motion, nesting o OFX/VST. Detectar y reportar; no importar silenciosamente como vídeo normal.
- Codecs de vista previa dependen de Chromium. Que FFmpeg pueda decodificar una fuente no garantiza que el monitor pueda reproducirla.
- Exportaciones cortas y reproducción real comprobadas; falta certificar proyectos largos, memoria, latencia, color, sincronismo a nivel de muestra y funcionamiento integral en otro equipo desconectado.

## 5. Contrato LQTS actual (versión de esquema 1)

JSON UTF-8. `format` debe ser `LQTAC Studio` y `version` debe ser 1. No confundir la versión de esquema con la versión de aplicación 0.3.4.

Ejemplo de estructura compatible con el validador actual (los medios son ilustrativos y deben existir para reproducir):

```json
{
  "format": "LQTAC Studio",
  "version": 1,
  "name": "Prueba puente VEGAS",
  "fps": 24,
  "time": 0,
  "zoom": 1,
  "zoomStart": 0,
  "library": [
    {"name": "clip.mp4", "kind": "video", "filePath": "Media/clip.mp4"}
  ],
  "tracks": [
    {
      "id": "V1", "name": "Vídeo", "kind": "video", "role": "video",
      "envelopeVisible": false,
      "envelope": [{"time": 0, "value": 1}],
      "clips": [
        {
          "name": "clip", "kind": "video", "filePath": "Media/clip.mp4",
          "startSeconds": 1, "durationSeconds": 3,
          "sourceOffsetSeconds": 2, "sourceDurationSeconds": 30,
          "fadeInSeconds": 0.25, "fadeOutSeconds": 0.5,
          "groupId": "vegas-group-1", "groupType": "media", "transition": "fade"
        }
      ]
    },
    {
      "id": "A1", "name": "Audio del vídeo", "kind": "audio", "role": "video-audio",
      "envelopeVisible": false,
      "envelope": [{"time": 0, "value": 1}],
      "clips": [
        {
          "name": "clip audio", "kind": "audio", "filePath": "Media/clip.mp4",
          "startSeconds": 1, "durationSeconds": 3,
          "sourceOffsetSeconds": 2, "sourceDurationSeconds": 30,
          "fadeInSeconds": 0, "fadeOutSeconds": 0,
          "groupId": "vegas-group-1", "groupType": "media", "transition": "fade"
        }
      ]
    }
  ]
}
```

Reglas de implementación:

- Todas las duraciones/posiciones están en segundos numéricos, nunca en porcentajes CSS ni cadenas de timecode. Inicio no negativo y duración positiva.
- `sourceOffsetSeconds` es el inicio del fragmento dentro del archivo, no su posición en el timeline. `sourceDurationSeconds` es la duración completa conocida, no la longitud recortada. No inventarla si no se conoce.
- Las pistas y eventos son arrays; mantener orden y IDs únicos. El orden de pistas afecta a la composición. Grupos conservan relaciones, no fuerzan igualdad de tiempos de eventos que ya eran distintos.
- Cada evento de vídeo y audio debe salir de su evento/toma real en VEGAS. No regenerar audio automáticamente para un vídeo que lo tenía eliminado o silenciado.
- Envolventes pertenecen a la pista; `time` es absoluto dentro del proyecto y `value` está entre 0 y 1. Los fades pertenecen al evento y duran entre 0 y su longitud.
- `transition` permite fade, wipeLeft, wipeRight, circleopen, pixelize, crosswarp y lumaMask. No mapear plugins por semejanza de nombre.
- `mask` contiene `dataUrl` PNG, name, softness, invert, motion, amount y blur; se decodifica a canvas al restaurar. No intentar serializar el canvas ni depender solo de la ruta en userData.
- project-io guarda rutas relativas al LQTS con `originalPath` absoluto alternativo; al abrir prueba ambas y devuelve `missing`. Los medios no van incrustados. Los paths de Windows deben escaparse mediante un serializador JSON, no concatenación de cadenas.
- Validador actual: máximo 200 pistas, 10 000 eventos, extremo de evento hasta 604 800 segundos, archivo de entrada hasta 100 MB y máscara codificada hasta 24 MB. No es un esquema JSON formal completo: ampliar validación al implementar el puente.
- Los campos desconocidos no constituyen soporte: `projectSnapshot()` no los conserva necesariamente al guardar. Procedencia, informe de pérdidas y parámetros VEGAS sin representar deben mantenerse en un sidecar separado o en una ampliación de esquema con lector/escritor y pruebas de round-trip.

## 6. Compatibilidad VEGAS: diagnóstico y estrategia

### Situación real

`veg-parser.cjs` escanea cadenas UTF-16LE e identifica extensiones, referencias y posibles nombres. Comprueba una cabecera RIFF, pero **no interpreta la estructura de eventos, posiciones, tomas o parámetros**. Ni las pistas deducidas ni la lista de efectos prueban reconstrucción del montaje. XML/EDL/FCPXML tampoco tienen ahora un importador completo: la interfaz contiene inspección parcial, no una ruta fiable de intercambio.

Los `.SFK` son cachés de picos de audio para dibujar ondas y mostrar niveles; no contienen los cortes/ajustes del montaje. No se necesitan como fuente de configuración. Preservarlos si acompañan al material del usuario, pero el puente no debe depender de ellos. La información de edición está en el proyecto; los vídeos/audios originales siguen siendo necesarios. Fuentes oficiales: [proyectos VEGAS](https://help.magix-hub.com/video/vegas/23/en/content/topics/3-projects/projects.htm) y [picos SFK](https://help.magix-hub.com/video/vegas/23/en/content/topics/4-media/insertaudiotrack.htm).

### Enfoque recomendado, todavía pendiente

Desarrollar un exportador C# que se ejecute dentro de **VEGAS Pro** y consulte su API para producir un LQTS y un informe de compatibilidad. No intentar reconstruir tiempos buscando cadenas binarias. VEGAS es necesario para esta conversión inicial; LQTAC no debe necesitarlo después.

La documentación oficial describe scripts C# con `EntryPoint.FromVegas(Vegas vegas)` y el namespace `ScriptPortal.Vegas`. La edición exacta instalada debe soportar scripting: no asumir que Movie Studio lo ofrece. Verificar versión/build y API local antes de implementar. [FAQ oficial](https://help.magix-hub.com/video/vegas/22/en/content/topics/external/vegasscriptfaq.html).

Puntos de partida del mapeo, a confirmar con la API de esa instalación:

| API VEGAS | Destino |
| --- | --- |
| Project.Tracks / Events | tracks / clips en orden |
| Start / Length | startSeconds / durationSeconds |
| ActiveTake.Offset / MediaPath | sourceOffsetSeconds / filePath |
| Timecode.ToMilliseconds()/1000 | segundos numéricos |
| FadeIn.Length / FadeOut.Length | fades, si la curva es compatible |
| Group | groupId estable |
| PlaybackRate / SourceStreamIndex | detectar incompatibilidades, no ignorar |

Referencia: [API oficial VEGAS Pro 22](https://help.magix-hub.com/video/vegas/22/en/content/topics/external/vegasscriptapi.html). Inspeccionar también las envolventes, medios offline, propiedades de proyecto y de toma. El API disponible no garantiza acceso a todos los parámetros de plugins.

### Secuencia de trabajo en el equipo con VEGAS

1. Registrar edición, versión/build, Windows, GPU y versión de las bibliotecas API. Confirmar que el proyecto de prueba abre sin medios ausentes; usar una copia del VEG, nunca sobrescribirlo.
2. Crear una rama de trabajo, por ejemplo `feature/vegas-lqts-bridge`. Propuesta de archivos futuros: `tools/vegas/ExportLqtac.cs`, README de ejecución, fixtures sintéticos y pruebas del contrato. Esos archivos **no existen en esta entrega**.
3. Crear en VEGAS un proyecto pequeño de 24 fps con MP4 H.264/AAC y WAV. Empezar por un evento, después dos pistas, recorte, hueco, grupo y solapamiento. Guardar capturas, lista de tiempos y un render de referencia.
4. Crear primero un script de diagnóstico de solo lectura: enumerar pistas, eventos, toma activa, streams, grupos, offsets, duraciones y propiedades que no se pueden representar. Ejecutarlo mediante el menú de scripting de VEGAS (Herramientas → Scripting → Ejecutar script, según idioma/versión). Cargar scripts confiables: tienen permisos amplios sobre el equipo.
5. Implementar serialización JSON UTF-8 con números independientes de la cultura regional: no generar `1,25` como valor JSON. Escribir a un archivo nuevo mediante temporal y reemplazo. No modificar la sesión VEGAS ni sus medios, no guardar cambios sobre el VEG y no empaquetar DLL de VEGAS en LQTAC.
6. Empezar con modo **estricto**: exportar solo el subconjunto soportado y detenerse con diagnóstico si hay características no representables. Un modo aproximado debe requerir aceptación y producir avisos por pista/evento, nunca sustituir silenciosamente.
7. Mapear campos compatibles al contrato anterior; desduplicar biblioteca pero conservar eventos distintos que usan el mismo archivo. Resolver paths relativos a la ubicación del proyecto y preparar relocalización si se mueve el paquete.
8. Resolver el doble fade: VEGAS puede describir fades ligados al solapamiento que LQTAC ya calcula automáticamente. No copiar ambos como fades individuales adicionales sin distinguir su origen, pues produciría una atenuación doble. Verificar con un tono y dos colores.
9. Abrir el LQTS mediante Archivo → Abrir, validar con project-io, reproducir, guardar/reabrir y exportar. Comparar con VEGAS. Ampliar modelo/renderizador antes de aceptar características que solo caben como metadatos.
10. Ejecutar el LQTS convertido en otro Windows sin VEGAS y sin conexión, con los medios presentes. Entregar evidencia y tabla de compatibilidad, no solo un diálogo de apertura exitoso.

### Matriz mínima de aceptación del puente

| Característica de entrada | Tratamiento inicial |
| --- | --- |
| Medios presentes, pistas AV, eventos a velocidad normal, offsets y grupos | Implementar y comparar tiempos/streams exactos |
| Huecos y varios usos del mismo archivo | Conservar, sin concatenar ni duplicar audio |
| Fade lineal y fundido simple por solapamiento | Implementar evitando doble ganancia |
| Envolvente lineal entre 0 y 1 | Mapear a pista si la semántica coincide |
| Curvas no lineales, volumen >0 dB, ganancia de evento o bus | Ampliar modelo o reportar pérdida/bloquear |
| Mute/solo, paneo, buses y canales múltiples | No están resueltos por controles visuales; ampliar antes de importar fielmente |
| 23.976/29.97/50/60 fps, drop-frame, dimensiones/color no representados | Ampliar metadatos, contador y render; no redondear silenciosamente |
| Velocidad/reversa/loop, varias tomas, subclips y selección de streams | Detectar y rechazar en modo estricto hasta implementarlos |
| Pan/crop, motion, máscaras VEGAS, nesting, títulos/generadores, OFX/VST | Reportar incompatibilidad; posible render intermedio solo con consentimiento y marcado como no editable |
| Archivo ausente o codec que Chromium no reproduce | Diagnóstico/relocalización; transcodificar solo a copia con autorización |

Informe propuesto: archivo `.compatibility.json` junto al LQTS con versión/build de VEGAS y del exportador, fecha, proyecto fuente, FPS/dimensiones, IDs origen/destino, referencias de medios, características soportadas, pérdidas y errores. No guardar credenciales ni distribuir rutas personales innecesarias. Si se añade importación del informe en LQTAC, preservar el informe en guardados posteriores.

## 7. Verificación y criterio de finalización

Desde desktop, con dependencias instaladas y ELECTRON_RUN_AS_NODE eliminado:

```powershell
.\node_modules\electron\dist\electron.exe .\verify-project.cjs
.\node_modules\electron\dist\electron.exe .\verify-playback.cjs
```

El primer test genera fuentes AV y archivos temporales bajo la carpeta temporal del sistema, usa un userData propio por proceso, simula diálogos y termina con código 0 solo si sus comprobaciones pasan. El segundo requiere adaptar las rutas de los dos MP4 reales antes de usarlo en otro equipo. No versionar las salidas temporales ni los logs.

Estado de las últimas pruebas en el equipo original: round-trip LQTS con grupos/envolventes/máscara, seis salidas decodificadas, cancelación sin sobrescribir destino existente, recortes, división, copiar/pegar, historial, fades y cabezal con zoom/desplazamiento. Reproducción breve comprobada con archivos de 135 y 261 segundos. Esto **no es una prueba del puente VEGAS**, que sigue pendiente.

Para cerrar el puente: añadir fixtures sintéticos sin derechos de terceros, un VEG de referencia, dump esperado y LQTS esperado; comparar estructura y medios, tiempos con tolerancia declarada de como máximo un fotograma (sin ocultar redondeos), audio y fotogramas antes/durante/después de cada corte. Documentar desviaciones perceptuales/color/audio y comprobar sincronía sin deriva. Probar rutas Unicode, espacios, unidades cambiadas, medios ausentes y guardar/reabrir tras convertir. Mantener un proyecto con funciones deliberadamente no soportadas para comprobar que se bloquean o avisan correctamente.

Prioridades: (1) diagnóstico de solo lectura y subconjunto de eventos, (2) fuentes/offsets/grupos y pruebas, (3) resolver FPS, doble fade y envolventes, (4) ampliaciones explícitas y pérdidas, (5) prueba offline sin VEGAS. No prometer lectura binaria universal ni escritura de vuelta a VEGAS.

## 8. Repositorio y distribución

Versionar fuentes, lockfile, pruebas, Shapes, manuales y licencias. Excluir node_modules, ejecutables/FFmpeg descargados, portables/ZIP, logs, cachés, proyectos personales y renders. Subir código a main no actualiza automáticamente una Release ni sus Assets. La última Release publicada conocida es 0.2.0; el código de esta entrega es 0.3.4. Consultar Releases antes de afirmar que hay un portable nuevo publicado.

No confundir un remoto del entorno de trabajo con GitHub: verificar destino antes de push y no reemplazar remotos ajenos. Mantener cambios del usuario; usar commits normales y no force-push. No crear una Release sin la solicitud correspondiente. Para nuevos módulos, actualizar build-portable.ps1: un require que funcione en desarrollo puede fallar en el portable si falta copiar el archivo.

## Puente VEGAS: diagnóstico inicial en este equipo — 22/10/2026

Implementado `tools/vegas/DiagnoseLqtac.cs` y su configuración. Ejecutado dentro de VEGAS Pro 22 build 250 sobre la sesión abierta: 5 pistas, 19 eventos, duración 250,270 s, 1920×1080 a 24 fps y audio 48 kHz. Versión corregida: cero errores de lectura; IsModified=false antes y después. Medios del pool presentes y online.

`tools/vegas/summarize-diagnostic.cjs` genera un inventario local de compatibilidad. Diferencias detectadas: 2 eventos con velocidad alterada, 1 pista silenciada, 3 pistas con cadenas de efectos de audio activas, 16 extremos de fade con curvas no lineales y ganancia de evento distinta de unidad (registrada en ambos extremos). No se han convertido ni renderizado los medios. No se ha generado un LQTS ni validado fidelidad audiovisual.

La documentación anterior que indica que el diagnóstico no existe queda actualizada por esta sección. El exportador C# a LQTS y la compatibilidad completa siguen pendientes. Los informes personales se excluyen de Git bajo tools/vegas/diagnostics/. Ver tools/vegas/README.md para ejecución y límites. Prueba técnica, pendiente de aceptación del usuario.


## Herramientas de pistas y eventos — 0.4.0 (22/10/2026)

Se han incorporado controles reales a partir del inventario del proyecto abierto en VEGAS Pro 22 build 250. No se migra todavía el VEG. Plugins externos y efectos de pista/evento quedan fuera de esta fase por acuerdo del usuario.

### Pistas

- **M** silencia la pista y **S** activa solo entre pistas del mismo tipo (audio o vídeo); M tiene prioridad. Un solo de audio no oculta vídeo. Se aplican en vista previa y exportación.
- **⚙** en la cabecera, o doble clic en el nombre: renombrar, cambiar ganancia (audio 0–4; 1 es nivel original), opacidad (vídeo 0–1), balance estéreo de audio (−1 izquierda, 0 centro, +1 derecha) y subir/bajar la pista. El orden modifica las capas de vídeo.
- El paneo implementado es balance estéreo: centro conserva L/R; los extremos silencian el canal opuesto. Las fuentes mono se convierten a estéreo. No equivale todavía a todas las leyes/modos de paneo de VEGAS ni a paneo surround.

### Eventos y Pan/Crop

- Doble clic en un evento, o **Propiedades / Pan-Crop** en el inspector: nombre, silencio individual, ganancia/opacidad y velocidad 0,25–4. Los cambios se aplican al evento elegido, incluso si está agrupado.
- La velocidad conserva la duración del evento y altera la posición recorrida dentro de la fuente. Si requiere material fuera del archivo, se rechaza y se pide recortar el evento o reducir la velocidad. Audio con preservación de tono mediante Chromium en vista previa y atempo en exportación; no son el mismo algoritmo ni una garantía de equivalencia con VEGAS. Sin velocidad negativa ni loop de fuente.
- En vídeo, Pan/Crop permite centro X/Y, ancho/alto del encuadre y rotación. Coordenadas proporcionales a la fuente: centro 0,5/0,5, tamaño 1/1 para fuente completa; tamaños menores acercan la imagen.
- Aplicar guarda un fotograma clave en el tiempo indicado dentro del evento. Elegir uno existente para editarlo; marcar eliminar para quitarlo; restablecer vacía todos. Interpolación lineal entre fotogramas; antes/después se conserva el valor del extremo. No se importan curvas Bézier, máscaras o movimiento 3D.
- Pan/Crop usa el mismo compositor Canvas en monitor, transiciones y exportación. Al dividir se conserva la continuidad y se desplazan los fotogramas del fragmento derecho. Al recortar se conservan los límites interpolados; no se conserva el historial de fotogramas fuera del recorte.
- Recorte y división calculan offsets de fuente teniendo en cuenta la velocidad. Los campos nuevos se guardan en LQTS y se conservan en copiar/pegar y deshacer/rehacer.

### Validación y límites

`desktop/verify-project.cjs`: regresión de proyectos, edición y seis exportaciones superada. `desktop/verify-work.cjs`: persistencia/validación, botones M, solo por tipo, balance y ganancias de vista previa, cambios mediante formulario y deshacer, orden de pistas, división a velocidad 2× con offsets correctos, continuidad de Pan/Crop, píxeles de encuadre e interpolación y captura de fotograma transformado. Audio exportado medido por canales: derecha silenciosa al panear totalmente a izquierda y pista adicional silenciada; velocidad 2× y duración de salida comprobadas. Se distingue esta prueba técnica de la aceptación visual/auditiva del usuario, todavía pendiente.

LQTS mantiene esquema 1 con campos opcionales de pista `mute`, `solo`, `gain`, `pan` y de evento `mute`, `gain`, `playbackRate`, `panCrop`. Proyectos anteriores toman valores neutros. Versiones antiguas de LQTAC no conocen estos campos y pueden perderlos al guardar: abrir con 0.4.0 o posterior.

Persisten como trabajo del puente: exportador y mapeo desde VEGAS, curvas exactas de fades/solapamientos (evitar doble fade), leyes de paneo, selección de streams, buses, comprobación perceptual y sincronismo. Los efectos externos no se convierten y deberán identificarse en el informe de pérdidas. No se afirma compatibilidad integral por disponer de estos controles.


## Puente operativo VEGAS → LQTAC — 0.5.0 (22/10/2026)

Esta sección describe el estado vigente y sustituye las indicaciones anteriores que decían que no existía exportador. La lectura binaria universal de VEG sigue sin estar implementada: VEGAS realiza una exportación estructural inicial mediante su API.

### Abrir un VEG

1. En VEGAS, abrir el VEG con sus medios y guardar los cambios pendientes. Ejecutar `tools/vegas/ExportLqtac.cs` desde Herramientas → Creación de secuencias de comandos → Ejecutar secuencia de comandos.
2. El script crea un archivo nuevo `nombre.veg.FECHA-ID.lqtac.json` junto al VEG. No sobrescribe el VEG ni los medios. Calibra las curvas en una copia temporal de la sesión; la sesión original permanece sin modificaciones. Conservar el JSON junto al VEG.
3. En LQTAC, pulsar **Abrir proyecto VEGAS** y seleccionar el VEG original. Se comprueba su SHA-256 contra el puente y se reconstruye el montaje. Si el VEG cambia, volver a exportar el puente; un puente obsoleto se rechaza.
4. Revisar el informe de importación y guardar como LQTS. El LQTS conserva el informe y ya no necesita VEGAS; sigue necesitando los medios originales.

El instalador `tools/vegas/install-menu.ps1` añade el exportador a Documentos\Vegas Script Menu sin sobrescribir scripts diferentes. En VEGAS, volver a explorar la carpeta de secuencias de comandos; aparecerá **LQTAC Export Bridge**. Se ha instalado en este equipo. Si se actualiza el exportador, actualizar también la copia del menú.

### Mapeo y límites

- Pistas, orden, eventos independientes de vídeo/audio, fuentes, toma activa, inicio, longitud, offset, velocidad y grupos: se conservan. Los segundos no se redondean a milisegundos al ajustar la escala visual.
- Mute/solo por tipo, ganancia de pista y evento, opacidad, balance estéreo y envolventes lineales 0–1. Paneo no centrado con una ley distinta de Balance se bloquea; no se aproxima a otra ley.
- Pan/Crop rectangular sin rotación, con coordenadas proporcionales y keyframes lineales. Rotación, polígonos/reflejos, máscaras y curvas de movimiento no verificadas se bloquean en el importador aunque el editor tenga controles generales de rotación.
- Curvas Linear/Fast/Slow/Smooth/Sharp/None contrastadas con 257 muestras de Envelope.ValueAt del motor VEGAS. Fórmulas verificadas con error máximo 0,000002 en amplitud: Lineal p; Fast 1−(1−p)²; Slow p²; Smooth p²(3−2p); Sharp ((2p−1)³+1)/2; None mantiene el primer valor hasta el extremo. Esta calibración no certifica por sí sola todos los fades ni el motor audiovisual completo.
- Los eventos importados desactivan el fundido automático de LQTAC. La mezcla de vídeo por pista utiliza curvas de entrada y recíprocas en el solapamiento, sin multiplicar un segundo fade. Se conserva la precedencia por orden para eventos que empiezan a la vez. Más de dos eventos simultáneos y solapamientos complejos se bloquean.
- El audio exportado evalúa ganancias por muestra mediante aeval y posiciona eventos con retrasos en muestras a 48 kHz. Se omite el limitador automático al exportar montajes procedentes del puente. No hay todavía comparación de audio completa con un render de VEGAS.
- Plugins de pista, evento, medio y bus omitidos por acuerdo del usuario, siempre identificados en el informe. Transiciones de plugin, surround, buses con automatización, tomas/streams ambiguos, normalización, cambios de tono, loops que exceden la fuente, otros FPS y características no representables se bloquean.
- Alcance inicial de vídeo: 24 fps, progresivo, píxel cuadrado, composición SrcAlpha sin jerarquías/movimiento de pista. El informe conserva propiedades originales de vídeo/audio y advertencias de remuestreo. La equivalencia de color y la interpolación de cuadros de VEGAS todavía no están certificadas.

### Evidencia en este equipo

VEGAS Pro 22 build 250: puente exportado con cero errores de API e IsModified=false antes/después. Proyecto real del usuario: 5 pistas, 19 eventos, 250,2700547 s. Abierto por la vía IPC de importación; estructura y tiempos numéricos conservados al restaurar y guardar/reabrir. Se ha generado una copia local LQTS bajo tools/vegas/diagnostics/, excluida de Git.

`desktop/verify-vegas.cjs` comprueba un fixture sintético AV con nombres Unicode, tiempos fraccionarios, grupos, velocidad y curvas; apertura de VEG con JSON compañero, guardado/reapertura con informe, rechazo de VEG modificado y funciones incompatibles, exportación de audio decodificada y captura por el compositor. El argumento opcional del puente real comprueba todos sus tiempos y cinco fotogramas.

Capturas de VEGAS mediante `CaptureReference.cs`: 0, 4,5, 13,5, 58 y 77 s. Comparación RGB reducida a 64×36: MAE entre 4,72 y 7,99 sobre 255; umbral de regresión local 15. No es igualdad píxel a píxel ni certificación perceptual. La prueba detectó y permitió corregir un fotograma saliente negro: seeked podía preceder a la publicación de la imagen GPU; la captura espera dos ciclos de presentación antes de componer. La captura restaura el cursor original de VEGAS y no modifica la sesión.

Para ejecutar la prueba sintética: desde desktop, eliminar ELECTRON_RUN_AS_NODE y ejecutar Electron con verify-vegas.cjs. Las pruebas personales y sus imágenes permanecen en temporales o en diagnostics, excluidas de Git. La aceptación visual/auditiva y la validación completa de proyectos largos siguen pendientes.


Comprobación final 0.5.0: verify-project.cjs, verify-work.cjs y verify-vegas.cjs terminan con código 0. Los seis formatos de exportación se decodifican correctamente. aeval declara/reafirma el layout estéreo para la compatibilidad con AAC de FFmpeg 6.1.1. El montaje real se ha abierto en una instancia de revisión con perfil temporal independiente; no se ha cerrado la sesión anterior de trabajo del usuario. No se ha creado Release ni actualizado dependencias.

## Conversión VEGAS integrada — 0.5.1 (22/10/2026)

En LQTAC, pulsar «Abrir proyecto VEGAS» y seleccionar el archivo guardado. No hace falta iniciar VEGAS ni ejecutar scripts manualmente: si falta un puente o su SHA-256 está desactualizado, desktop/vegas-automation.cjs detecta VEGAS en Program Files/VEGAS (prioriza la versión más reciente), inicia /OPEN y /SCRIPT con argumentos separados sin shell, y espera la respuesta. Se sigue necesitando VEGAS Pro instalado; no se ha implementado lectura binaria independiente. Un puente válido se abre sin iniciar VEGAS.

El exportador y su .config se incluyen en el portable. La automatización genera un script propio en una carpeta temporal única, verifica la ruta del proyecto abierto y escribe la señal de finalización de forma atómica. El puente permanece junto al VEG y se valida contra sus bytes antes de importar. No se guarda ni se modifica el VEG, ni se cierra o sustituye la sesión de trabajo ya abierta. Se lee la copia guardada en disco: los cambios pendientes en otra sesión no se convierten. La interfaz indica la espera y evita aperturas repetidas desde el botón. Fallos de lanzamiento/API y espera de tres minutos se comunican sin sustituir el montaje actual. No se mata VEGAS al vencer el plazo; puede haber diálogos de licencia o medios pendientes. En ese caso resolverlos y volver a abrir el VEG. Los temporales sin señal de éxito se conservan para permitir que una carga tardía termine.

Prueba real del flujo automático con VEGAS Pro 22 build 250: 5 pistas y 19 eventos, cero errores de importación, sesión original abierta y sin cambios. desktop/verify-vegas-automation.cjs comprueba con lanzador simulado regeneración, reutilización sin arranque, rutas Unicode, fallo de arranque, timeout y recuperación del bloqueo. Los límites audiovisuales y de mapeo de 0.5.0 siguen vigentes. No se han actualizado dependencias ni creado Release.

Referencia de los argumentos: https://help.magix-hub.com/video/vegas/22/de/content/topics/11-autoscript/scripting_in_vegas.htm

## Alineación de pistas al abrir proyectos — 0.5.2 (23/10/2026)

Corregida la pérdida de la regla de tiempos al restaurar un montaje LQTS o VEGAS, también al deshacer/rehacer: se conserva una única regla y se actualizan sus marcas con la duración. Las cabeceras y los eventos vuelven a empezar en la misma fila, sin el desfase de 24 píxeles. La creación de pistas durante la restauración no desplaza la vista a la última pista; al terminar se muestra el comienzo vertical de la timeline y se recuperan el zoom y la posición horizontal del proyecto. Los medidores de las cabeceras iniciales quedan anclados a su propia fila. En ventanas de hasta 1280 píxeles, biblioteca y monitor ocupan columnas independientes; antes el diseño compacto los superponía.

La prueba desktop/verify-layout.cjs abre repetidamente montajes de 18 pistas en anchos de 1120, 1180, 1250 y 1540 píxeles y niveles de zoom del 100 % y 400 %, comprueba que la regla sigue visible y que todas las filas coinciden con sus cabeceras. Se guarda una captura en la carpeta temporal de la prueba. No se cambian medios, tiempos ni el formato LQTS.

## Transporte del reproductor — 0.5.3 (23/10/2026)

Corregido el icono de retroceder: los caracteres se dividían en dos líneas dentro del botón. Retroceder y avanzar usan ahora iconos SVG locales centrados y botones de tamaño fijo, con etiquetas y ayudas que indican su función de restar/sumar un segundo. La barra ajusta la información secundaria con puntos suspensivos para conservar los controles visibles en monitores estrechos.

Nuevo botón «Reproducir desde el inicio»: lleva el cabezal a cero y comienza la reproducción, tanto si estaba pausada como si estaba reproduciendo. El botón habitual mantiene reproducir/pausar desde la posición actual y actualiza su etiqueta accesible. La prueba verify-layout.cjs comprueba los controles sin saltos de línea en cuatro anchos, retroceso con límite en cero, avance, reproducción desde cero, pausa, continuación y reinicio durante la reproducción.


## Publicación del portable 0.5.3 (23/10/2026)

Publicación solicitada por el usuario: Release de prueba v0.5.3-portable, ZIP LQTAC_Studio_0.5.3_Windows_x64_Portable.zip y SHA256SUMS.txt. Construido con build-portable.ps1 sin actualizar dependencias. El README apunta a esta descarga. Fuentes, binarios y script VEGAS del paquete cotejados mediante hashes; sin node_modules, diagnósticos ni proyectos personales. La prueba sobre una extracción independiente usa un punto de entrada temporal de comprobación y ejecuta el main original: arranque, regla/alineación, reproducción desde el inicio, módulos del puente y generación de audio con FFmpeg incluido superados. No sustituye una validación integral en otro equipo.

ZIP: 168841022 bytes. SHA-256: 14656fddd7b78936053396530ded5909a392821116806ca63b976a3b95b3a63e.
# Detección de fuentes de subtítulos: corrección

## Captura de micrófono — implementación local posterior a 0.13.0

microphone-controls.js añade diálogo y accesos Archivo/lateral. getUserMedia audio-only se solicita tras acción explícita. microphone-pcm.js genera un módulo AudioWorklet desde un Blob local: recopila Float32 mono por bloques de 4096 muestras, conserva la cola final al detener y deja salidas de audio en cero. Grafo: MediaStream → Gain → Analyser → AudioWorklet → destino silencioso; no mezcla ni monitoriza el proyecto. El medidor/ganancia operan sobre la señal grabada. No depende de temporizadores del renderer para el muestreo, no usa MediaRecorder/Opus ni descarga módulos.

audio-recording.cjs gestiona un único token de toma, cola ordenada de muestras, validación de Float32/rangos/límites, temporales mkdtemp propios y conversión FFmpeg f32le→PCM24 mono48k. IPC solo acepta al renderer local principal. El usuario elige la ruta con diálogo nativo; se rechazan destinos existentes y la publicación del WAV usa COPYFILE_EXCL, sin sobrescritura si aparece una colisión. Los fallos conservan la toma temporal para retry en otra ruta. Abort espera escritura/encoder, mata proceso si procede y limpia solo temporales de esta toma; no borra el destino final. El WAV se valida leyendo RIFF/fmt/data para calcular duración real, sin valores genéricos de 15 s.

Los permission handlers permiten audio y, tras la incorporación del grabador de cámara descrito al inicio, vídeo desde el índice local principal con confirmación por sesión; pantalla sigue pendiente. Cerrar la ventana con toma nativa pendiente pide confirmación y render-process-gone cancela la toma. El renderer desconecta puerto/nodos/contexto y detiene todos los tracks al guardar/descartar/cancelar, incluidos los fallos de getUserMedia. Build-portable copia el nuevo servicio; dist incluye los dos scripts. No se modifica un ZIP histórico ni se publica nada en esta tarea.

verify-microphone.cjs usa Chromium con dispositivo/audio de prueba, nunca el micrófono físico: valida PCM sin pérdida y silencio de salida del worklet; grabación real del grafo→IPC→FFmpeg; WAV decodificado no silencioso, ganancia50 %, formato mono48k24 y duración real; biblioteca/timeline/posición y Ctrl+Z/Y; persistencia LQTS; cancelación de ruta, descarte, permiso denegado, inserción manual posterior; PCM/tokens inválidos, colisión de archivos y retry conservador; cierre de aplicación protegido. Se inspecciona el diálogo mediante captura. Falta prueba del usuario con hardware real y sus permisos de Windows.

Roadmap acordado: cámara implementada en la fase siguiente descrita al inicio; pantalla con audio opcional, autoguardado/recuperación y mezclador con medidores de pista/máster pendientes. No se incluyen en esta fase pausa de toma, grabación multipista simultánea, overdub sincronizado ni ajuste de latencia. Los temporales de una caída brusca no tienen un flujo de recuperación soportado todavía. El usuario ha validado la grabación real de micrófono el 24/10/2026.

## Empaquetado local 0.13.0 — comparación de peso

Resultado medido: ZIP 0.12.0 = 628469244 bytes (628,47 MB / 599,35 MiB). ZIP local 0.13.0 = 1177942111 bytes (1177,94 MB / 1123,37 MiB). Incremento = 549472867 bytes (549,47 MB / 524,02 MiB), +87,43 %. Dentro del ZIP nuevo los recursos del modelo Faster comprimen a 445908106 bytes y su runtime/avisos/documentación a 103229468 bytes; el resto del incremento corresponde principalmente a metadatos ZIP. Carpeta extraída: 1690244267 bytes en 1052 archivos. SHA-256 e94a639493bfa63d09c8195340435fcfe63eab4bb30f8a9212a7efde571ed7d3. verify-portable-runtime confirma ambos motores ejecutando reconocimiento español desde el paquete, hashes de modelos/UI, motor por defecto y funciones de karaoke/proyecto. No se ha subido a GitHub.

Nuevo portable sin sobrescribir históricos y sin publicación remota. Mantiene las dos familias Small en sus formatos respectivos (GGML y CT2) y el runtime Faster congelado. La medición se compara con el ZIP publicado 0.12.0 de 628469244 bytes. No se modifican VAD ni parámetros de reconocimiento en este empaquetado. verify-portable-runtime valida versión contra portable-package.json, hashes de recursos y modelos, rutas internas y ejecución del motor predeterminado.

## Selección de motor ASR — desarrollo posterior a 0.12.0

subtitles-service.status devuelve engines y defaultEngine=faster-int8; conserva exe/model de whisper.cpp como campos heredados. transcribe recibe engine=faster-int8|whisper-cpp (omitirlo selecciona Faster), valida disponibilidad antes de preparar audio y mantiene la mezcla temporal, FX, offsets, duración, origen y cancelación compartidos. No hay fallback silencioso. Faster usa su EXE onedir y un modelo CT2 Small local; whisper.cpp conserva su invocación original. El worker fuerza CPU INT8, 1 worker, hasta 8 hilos, beam/best_of 5, temperatura 0 sin VAD ni word_timestamps. Exporta SRT; el servicio conserva la conversión a tiempos absolutos. stdout JSONL comunica progreso sin exponer la letra y se analiza con búfer acotado.

tools/setup-faster-whisper.ps1 produce el motor Windows x64 con PyInstaller 6.16.0, faster-whisper 1.2.1, CTranslate2 4.8.3 y PyAV 16.1.0. Fija y verifica cuatro hashes del modelo Systran, permite reutilizar solo modelo verificado/entorno de desarrollo y no sobrescribe motores existentes. collect-faster-licenses.py conserva avisos disponibles y manifiesto de versiones/hash fuente. bin y models de Faster se excluyen de Git; build-portable.ps1 exige el motor principal y copia toda la carpeta faster, incluidos DLL, Python congelado, recursos, modelo y licencias. El usuario no necesita el Python ni el venv de construcción. No se publica ni sustituye un portable durante esta implementación.

La UI ofrece selector explícito, Faster por defecto en cada apertura, estado de disponibilidad, bloqueo durante reconocimiento y nombre de pista con motor utilizado. verify-subtitle-engines.cjs verifica reconocimiento español real por UI/IPC con ambos motores, origen de timeline, etiquetas, selección, cancelación con el worker activo, motor inexistente/no instalado y alternativa disponible. La selección no se guarda dentro del proyecto ni se utiliza para cambiar el comportamiento de Karaoke.

Validación adicional: copia independiente del motor y modelo en una carpeta temporal sin Python en PATH, con PYTHONHOME/PYTHONPATH vacíos, audio con «ñ» en el nombre y language=auto transcrita correctamente. verify-subtitles.cjs pasa también reconocimiento español por el motor predeterminado, cancelación, audio en pista heredada de vídeo, SRT/LQTS y píxeles de subtítulos en MP4 real. El build comprueba recursos Faster y que worker_sha256 corresponda al fuente actual antes de incluir el EXE, para no empaquetar una compilación obsoleta.

## Snapshot de publicación 0.12.0 — 24/10/2026

Validación del respaldo: verify-new-project, verify-karaoke-partial, verify-track-karaoke-sync, verify-karaoke-syllables, verify-project, verify-work, verify-vegas y verify-layout completados. verify-portable-runtime confirma recursos/código con SHA-256, versión 0.12.0, Nuevo proyecto, modelo silábico y continuación parcial empaquetados, FFmpeg local, modelo Small esperado y transcripción española offline real con el motor incluido. ZIP: 628469244 bytes; SHA-256 b43191167a02ecb6e7f09218651cbd2ba46af077e79f1a79ff5412c3e96ebba8. No es una prueba física en un segundo equipo.

Respaldo solicitado antes de cualquier cambio de motor ASR. Incluye todas las funciones locales de Nuevo proyecto y Karaoke por palabras/sílabas, edición de segmentos, aplicación parcial y reanudación LQTS. Las referencias históricas a cambios «locales sin publicar» de las secciones siguientes quedan incluidas en esta publicación. Se conserva whisper.cpp v1.9.2 y ggml-small.bin verificado; faster-whisper solo fue comparado documentalmente, no instalado. El ZIP incluye Electron, FFmpeg, motor/modelo Whisper, Shapes, recursos y manual. El código fuente no incluye modelos ni node_modules: se preparan con las instrucciones existentes.

## Karaoke — implementación local, sin nueva publicación

### Sincronización continua de pista

#### Unidades silábicas

El sincronizador añade options {mode: word|syllable, parts: bloques → palabras → segmentos}. flatten/plan/checkpoint/resume reciben estas opciones; los checkpoints v1 sin mode siguen interpretándose como word y conservan su huella anterior. En modo syllable cada marca corresponde a un segmento del texto original. La sugerencia splitSyllables es una heurística local conservadora orientada al español, corregible manualmente; validateParts exige concatenación exacta por palabra. No usa dependencias, red ni reconocimiento automático del canto.

subtitleStyle.karaoke.syllables {parts,marks} guarda límites y tiempos canónicos completos o parciales. Al completar un bloque también se agregan sus tiempos por palabra en words. progress usa las marcas silábicas y los anchos de prefijos medidos por Canvas para recortar el resaltado dentro de cada palabra; el texto original y sus saltos de línea se mantienen. El renderer compartido cubre monitor y exportación. El editor individual conserva syllables cuando solo cambia estilo; editar tiempos/palabras allí los sustituye por su edición de palabras y hace obsoleta la continuación anterior.

El selector y la separación trabajan en borrador, pausan escucha al cambiar y piden confirmación si hay marcas. La separación editada sin validar bloquea escuchar/aplicar para no usar límites antiguos inadvertidamente. Los metadatos silábicos se validan al abrir/guardar LQTS y forman parte de la huella de continuación. verify-karaoke-syllables.cjs prueba sugerencia y división manual para el canto, rechazo de cambios de texto, teclado, aplicación parcial dentro de palabra, reapertura LQTS, cambio de modo cancelado, completar/undo/redo y evolución del color dentro de una misma palabra en MP4 realmente codificado.

track-karaoke-sync.js añade un menú contextmenu a K y un diálogo modal de sincronización global. Conserva referencias y copia de los eventos subtitle; aplana palabras según startSeconds mediante karaoke-sync-model.js. Las marcas keydown/keyup de Space usan timelineTime (el reloj del reproductor real), no un temporizador independiente. Ignora repeat; captura Space para no activar el transporte general; suspende marcado al pausar/buscar/blur y limpia listeners/rAF/inert al cerrar. La letra visible es una ventana acotada alrededor del cursor, no un DOM de miles de palabras.

El modelo puro plan valida marcas, orden, duraciones, límite de una semana y compensación ±1 segundo antes de modificar. Acepta cualquier prefijo no vacío de palabras confirmadas. Los bloques completos se recomponen con tiempos relativos y offset cero; el último bloque parcial conserva sus words originales y guarda syncMarks canónicas, ampliando sus límites si hace falta. progress usa syncMarks mientras existen y no resalta palabras pendientes del bloque parcial. Los bloques no empezados quedan intactos.

Cada aplicación crea un único checkpoint de historial y guarda track.karaokeSync {version:1, order, marks, signature}. order conserva el orden original de la letra aunque los primeros clips se retimen más allá de los pendientes. marks son tiempos absolutos ya compensados; signature es una huella de consistencia de texto/intervalos/datos de tiempos de los bloques (no criptográfica). resume comprueba forma y huella antes de retomar el prefijo. Cambios de texto/tiempos invalidan continuación sin borrar efectos; cambios solo de modo/color no. El checkpoint y syncMarks se validan y persisten en LQTS, incluyendo undo/redo. Restore desactiva explícitamente la herencia K de createTimelineClip para no modificar bloques pendientes al abrir el archivo. El editor individual conserva syncMarks si solo cambia estilo, pero las descarta al cambiar palabras o tiempos.

verify-karaoke-partial.cjs cubre aplicación desde una palabra, bloque incompleto, render confirmado, pendientes intactos, guardado/reapertura real de LQTS y continuación dentro de bloque, orden estable tras retiming, sucesivas aplicaciones hasta completar sin duplicar compensación, undo/redo y metadatos inválidos/obsoletos. La escucha se retoma un segundo antes de la última marca. Solo lo aplicado y posteriormente guardado a LQTS sobrevive al cierre; el borrador no tiene autoguardado.

verify-track-karaoke-sync.cjs prueba menú derecho, audio local real, retención/liberación de Espacio y repeat, paso continuo entre tres bloques, repetición de palabra, pérdida de foco, cancelación sin mutar, compensación, aplicación atómica, undo/redo y persistencia LQTS. También valida rechazo de marcas incompletas, solapadas o desplazadas a tiempo negativo.

Botón K de pista: cabecera exclusiva de subtitle, adyacente a M, acción delegada que no abre propiedades. subtitle-model.karaokeStyle activa/desactiva conservando words/color/offset y lastMode. toggleTrackKaraoke prepara y valida todos los estilos antes de modificar, registra una sola entrada de historial y renderiza. syncTrackKaraoke deriva estado true/false/mixed de los clips; karaokeEnabled boolean opcional de pista persiste el valor por defecto para nuevos bloques sin configuración propia, incluso con pista vacía. Restaurar no sobreescribe estilos explícitos. verify-track-karaoke.cjs comprueba 120 bloques, ajustes manuales intactos, alternancia, Ctrl+Z/Y, cabeceras, herencia y persistencia LQTS.

- subtitleStyle.karaoke opcional: {mode: normal|word|progressive, color: hexadecimal, offset: segundos, words: [{start,end}]}. Tiempos canónicos relativos al origen del texto; offset conserva la fase al recortar/dividir. No cambia la versión base del contenedor LQTS. Los proyectos antiguos sin karaoke siguen funcionando; aplicaciones antiguas ignorarán el efecto.
- subtitle-model valida cantidad de palabras, colores, orden, duración y límites; exporta seedWords, progress y shiftedStyle. draw recibe tiempo absoluto y dibuja el texto pendiente más un relleno recortado por palabra. Misma función Canvas para editor, monitor y captura de exportación. Sin dependencias externas ni servicio online.
- karaoke-editor.js amplía el editor existente con modo/color, escucha del proyecto, seek, marcado de entradas, tabla y barras de tiempos con drag de segmento y extremos. Mantiene borrador hasta Aplicar y detiene escucha al cerrar; cancelar descarta cambios. Las palabras se distribuyen uniformemente como guía y se resetean cuando cambia la secuencia del texto. No hay alineador forzado ni detección automática de notas/compás/canto.
- beginClipTrim toma una copia inicial del estilo y aplica shiftedStyle(delta) solo al extremo inicial; splitSelectedClips desplaza el estilo de la mitad derecha. La persistencia y copiar/pegar aprovechan subtitleStyle existente. SRT degrada deliberadamente a subtítulo normal.
- verify-karaoke.cjs valida modelo, controles, escucha real de pista local, marcado, drag, historial, recorte/división, persistencia LQTS y evolución de píxeles coloreados en MP4 real. verify-subtitles y verify-new-project pasan como regresiones. El portable 0.11.0 publicado no incluye todavía Karaoke ni Nuevo proyecto.

## Nuevo proyecto

Archivo/Nuevo y Ctrl+N ejecutan newLqts: confirmación nativa de tres opciones mediante confirm-new-project, guardado cancelable con resultado booleano, restoreProject de un documento vacío y reset-project-path para desligar el archivo anterior. Reutiliza la limpieza de reproductores y composición existente y reinicia historial/clipboard. verify-new-project.cjs valida cancelación, cancelación del guardado, guardar antes de limpiar, pistas/biblioteca/cabezal vacíos, primer guardado en ruta distinta sin alterar el documento anterior, menú y atajo. Cambio local posterior a la publicación 0.11.0; no está incluido en ese portable histórico.

Validación de publicación 0.11.0: verify-project, verify-work, verify-vegas y verify-layout completados. verify-subtitles incluye transcripción española real offline en pistas de audio y pistas mixtas heredadas. verify-portable-runtime comprueba hashes del código empaquetado, FFmpeg local, modelo Whisper small con SHA-256 esperado y transcripción real usando exclusivamente el motor del portable.

La inserción de audio independiente ya no conserva un destino de tipo vídeo. La enumeración de fuentes y subtitles-service filtran por clip.kind audio y filePath, conservando los índices originales para la selección individual. Esto permite recuperar pistas mixtas heredadas sin modificar el proyecto: la copia temporal de reconocimiento se normaliza a audio y descarta eventos no sonoros y envolventes de opacidad. verify-subtitles.cjs cubre reconocimiento real de voz en pista de audio y pista heredada de vídeo, selección e inserción de audio independiente.
