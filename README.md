# LQTAC Studio

Editor local de vídeo y audio para Windows. Versión de desarrollo 0.8.1.

## Descargar el programa

Para un equipo nuevo, abre [Releases](https://github.com/felixdroidhuerta/LQTAC_Studio/releases), entra en **v0.8.1-portable** y descarga **LQTAC_Studio_0.8.1_Windows_x64_Portable.zip** dentro de Assets.

Extrae todo el ZIP y abre **LQTAC Studio.exe**. El motor y sus bibliotecas están incluidos; no requiere Node, pnpm ni Internet en el equipo destino. La carpeta Shapes junto al ejecutable contiene la máscara LQTAC de ejemplo.

Los archivos automáticos **Source code** contienen únicamente fuentes y no el motor de escritorio.

## Funciones actuales

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
- Efectos por clip de vídeo y audio con editor individual, previsualización/escucha y parámetros animados. El ecualizador muestra tres curvas simultáneas con colores y puntos independientes. Selecciona un evento y pulsa «Efectos de vídeo / audio» o «Video FX». Ver uso y límites en FUNCIONAMIENTO.md.
- Editor individual de filtros con vista previa del clip y curvas de animación para parámetros numéricos de vídeo: por ejemplo, desaturación gradual. El audio dispone de escucha individual con ajuste fijo.

Consulta [FUNCIONAMIENTO.md](FUNCIONAMIENTO.md) para el uso, las pruebas y los límites actuales. La compatibilidad fiel con VEGAS sigue pendiente; esta versión no debe considerarse un editor terminado. La versión 0.3.4 se genera localmente; los enlaces de descarga anteriores corresponden a la última versión publicada, 0.2.0.

Para retomar el desarrollo, arquitectura, formato LQTS y plan de implementación del puente desde un equipo con VEGAS Pro, consulta [developer.md](developer.md). El código actual es 0.3.4; subirlo al repositorio no sustituye los Assets de la Release 0.2.0.

## Desarrollo y paquete portátil

El código de escritorio está en desktop y la interfaz en dist. Las dependencias se instalan en el equipo de desarrollo mediante pnpm. Ejecutar desktop/build-portable.ps1 genera un ZIP con el motor instalado, recursos, Shapes y manual para distribuir sin instalación en el equipo destino.

Los shaders externos conservan sus autores y licencia en dist/THIRD-PARTY. El portable incluye FFmpeg como proceso independiente y sus avisos/licencias en resources/app/desktop/codecs. No se descargan efectos ni códecs durante el uso. Consulta desktop/EXPORTACION.md para los componentes y fuentes.


Versión 0.4.0: controles reales de mute/solo, volumen/opacidad, balance estéreo, orden de pistas, velocidad de evento y Pan/Crop con fotogramas clave. Uso y límites en FUNCIONAMIENTO.md. El exportador VEGAS sigue pendiente.


Versión 0.5.0: apertura de VEG con puente estructural exportado desde VEGAS, curvas calibradas, mezcla de solapamientos y persistencia del informe de compatibilidad. Instrucciones y límites en la sección «Puente operativo VEGAS → LQTAC» de FUNCIONAMIENTO.md.

Versión 0.5.1: «Abrir proyecto VEGAS» inicia automáticamente VEGAS Pro si falta un puente válido. No hace falta abrir VEGAS ni ejecutar el script a mano. Requiere VEGAS instalado en la ruta habitual de Program Files/VEGAS y medios accesibles. Convierte la copia guardada del VEG; los cambios sin guardar en otra sesión no se incluyen. Un puente vigente se reutiliza sin iniciar VEGAS.
