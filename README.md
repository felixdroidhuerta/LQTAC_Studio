# LQTAC Studio

Editor local de vídeo y audio para Windows. Versión 0.18.0: separación offline de canciones en Voz, Batería, Bajo y Otros, selector de pista/evento y resaltado del intervalo sobre las pistas. Incluye espacios de trabajo, mezclador, generadores, fuentes de Windows, FX, renderizado por tramos, captura y dos motores de subtítulos offline.

## Descargar el programa

Para un equipo nuevo, abre [Releases](https://github.com/felixdroidhuerta/LQTAC_Studio/releases/tag/v0.18.0-portable) y descarga **LQTAC_Studio_0.18.0_Windows_x64_Portable.zip** dentro de Assets.

Extrae todo el ZIP y abre **LQTAC Studio.exe**. El motor y sus bibliotecas están incluidos; no requiere Node, pnpm ni Internet en el equipo destino. La carpeta Shapes junto al ejecutable contiene la máscara LQTAC de ejemplo.

Los archivos automáticos **Source code** contienen únicamente fuentes y no el motor de escritorio.

El portable incluye **Manual de usuario.pdf**. Las fuentes de la guía y sus capturas están en `docs/manual`; el PDF de esta versión se conserva también en `output/pdf`.

La versión local añade pista de subtítulos editable, Whisper small multilingüe offline, importación/exportación SRT e incrustación en vídeo. Acceso desde la pestaña «Subtítulos». El modelo y runtime están instalados en este equipo; para preparar otro entorno de desarrollo ejecutar tools/setup-whisper.ps1. El empaquetado incluye ambos y sus licencias; no requiere descargas durante el uso.

## Funciones actuales

Icono propio del programa y de proyectos .LQTS. Al iniciar se comprueba/registra la asociación de Windows por usuario cuando no existe y se actualizan rutas propias, respetando otros programas predeterminados. El lanzador incluido en 0.14.1 corrige la apertura por doble clic, tanto inicial como en la ventana existente con confirmación de guardado. En desarrollo usar LQTAC Video.bat.

Menús reorganizados: Archivo para proyecto/render/exportación (PNG hasta 4K, GIF animado y SRT), Insertar para biblioteca/pistas/grabaciones y Herramientas para división, efectos de vídeo/audio y subtítulos. Las importaciones por tipo solo alimentan la biblioteca. GIF usa el montaje completo, sin audio; se recomienda baja resolución/fps para proyectos cortos.

Grabación de micrófono, cámara y pantalla/ventana desde Insertar. Captura de pantalla sin audio o con micrófono/sistema/ambos, vista previa y WebM local, biblioteca e inserción de vídeo/audio agrupados. El audio del sistema es global; ambas entradas se mezclan si se habilitan juntas. WAV independiente PCM24 mono48k conserva su formato sin pérdida. Todo offline. Pantalla probada con ventana propia y mezcla sintética; pendiente validar loopback real. Cámara probada con dispositivos simulados. Consultar FUNCIONAMIENTO.md.

Al generar subtítulos se puede elegir Faster Whisper INT8 (seleccionado inicialmente) o Whisper.cpp. Ambos tienen motor/modelo incluidos; las pistas indican cuál se utilizó. Desarrollo de Faster: tools/setup-faster-whisper.ps1; uso y límites en FUNCIONAMIENTO.md.

El sincronizador Karaoke permite elegir Palabras o Sílabas. La división silábica sugerida se puede corregir antes de marcar con Espacio; admite aplicación parcial y continuación guardada en LQTS. El resaltado silábico se ve dentro de la palabra, sin cambiar la letra ni añadir guiones al vídeo. Incluido en el portable 0.12.0.

K de la pista de subtítulos: activación masiva y menú con botón derecho → «Sincronizar letra completa…». Escucha la canción y mantén/suelta Espacio por unidad para sincronizar todos los bloques seguidos. Puedes aplicar desde una palabra o sílaba y continuar después, también a mitad de una frase. Guarda LQTS para conservar el progreso al cerrar; música/vídeo no se desplazan.

Archivo → Nuevo proyecto (Ctrl+N) y subtítulos Karaoke por palabra o relleno progresivo, con tiempos editables, escucha del proyecto y exportación del resaltado. El reparto inicial es orientativo; no detecta automáticamente la sincronización del canto. Consulta FUNCIONAMIENTO.md.

- Timeline multipista, selección por recuadro y grupos de vídeo/audio.
- Creación de pistas, desplazamiento y zoom.
- Cabezal arrastrable desde la flecha, el contador o la regla, con actualización de vista previa.
- Recorte no destructivo desde ambos extremos y división con S en el cabezal, manteniendo vídeo/audio agrupados.
- Copiar/pegar clips con Ctrl+C/V y deshacer/rehacer ediciones con Ctrl+Z/Y, también desde Editar y los botones de la cabecera.
- Envolventes de volumen y opacidad con puntos editables.
- Fade-in y fade-out independientes por clip, arrastrando los tiradores superiores, con efecto real en vista previa y exportación.
- Transiciones WebGL locales, muestras y duración por solapamiento.
- Máscara de luminancia con zoom, travelling, temblor, blur, suavidad e inversión; configuración flotante.
- Archivo → Guardar/Abrir proyectos `.LQTS`, con biblioteca, tiempos, grupos, envolventes y máscaras integradas.
- Renderizado offline: vídeo MP4/H.264 y WebM/VP9; audio WAV, MP3, FLAC y M4A/AAC.
- Efectos por clip de vídeo y audio con editor individual, previsualización/escucha y parámetros animados. El ecualizador muestra tres curvas simultáneas con colores y puntos independientes. Selecciona un evento y pulsa «Efectos de vídeo / audio» o «FX». Ver uso y límites en FUNCIONAMIENTO.md.
- Editor individual de filtros con vista previa del clip y curvas de animación para parámetros numéricos de vídeo: por ejemplo, desaturación gradual. El audio dispone de escucha individual con ajuste fijo.

Consulta [FUNCIONAMIENTO.md](FUNCIONAMIENTO.md) para el uso, las pruebas y los límites actuales. La compatibilidad fiel con VEGAS sigue pendiente; esta versión no debe considerarse un editor terminado.

Para retomar el desarrollo, arquitectura, formato LQTS y plan de implementación del puente desde un equipo con VEGAS Pro, consulta [developer.md](developer.md). Las descargas de código fuente no incluyen motores ni modelo de voz: usa el ZIP portable para ejecutar el programa.

## Desarrollo y paquete portátil

El código de escritorio está en desktop y la interfaz en dist. Las dependencias se instalan en el equipo de desarrollo mediante pnpm. Ejecutar desktop/build-portable.ps1 genera un ZIP con el motor instalado, recursos, Shapes y manual para distribuir sin instalación en el equipo destino.

Los shaders externos conservan sus autores y licencia en dist/THIRD-PARTY. El portable incluye FFmpeg como proceso independiente y sus avisos/licencias en resources/app/desktop/codecs. No se descargan efectos ni códecs durante el uso. Consulta desktop/EXPORTACION.md para los componentes y fuentes.


Versión 0.4.0: controles reales de mute/solo, volumen/opacidad, balance estéreo, orden de pistas, velocidad de evento y Pan/Crop con fotogramas clave. Uso y límites en FUNCIONAMIENTO.md. El exportador VEGAS sigue pendiente.


Versión 0.5.0: apertura de VEG con puente estructural exportado desde VEGAS, curvas calibradas, mezcla de solapamientos y persistencia del informe de compatibilidad. Instrucciones y límites en la sección «Puente operativo VEGAS → LQTAC» de FUNCIONAMIENTO.md.

Versión 0.5.1: «Abrir proyecto VEGAS» inicia automáticamente VEGAS Pro si falta un puente válido. No hace falta abrir VEGAS ni ejecutar el script a mano. Requiere VEGAS instalado en la ruta habitual de Program Files/VEGAS y medios accesibles. Convierte la copia guardada del VEG; los cambios sin guardar en otra sesión no se incluyen. Un puente vigente se reutiliza sin iniciar VEGAS.
