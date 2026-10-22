# LQTAC Studio

Editor local de vídeo y audio para Windows. Versión de desarrollo 0.2.0.

## Descargar el programa

Para un equipo nuevo, abre [Releases](https://github.com/felixdroidhuerta/LQTAC_Studio/releases), entra en **v0.2.0-portable** y descarga **LQTAC_Studio_0.2.0_Windows_x64_Portable.zip** dentro de Assets.

Extrae todo el ZIP y abre **LQTAC Studio.exe**. El motor y sus bibliotecas están incluidos; no requiere Node, pnpm ni Internet en el equipo destino. La carpeta Shapes junto al ejecutable contiene la máscara LQTAC de ejemplo.

Los archivos automáticos **Source code** contienen únicamente fuentes y no el motor de escritorio.

## Funciones actuales

- Timeline multipista, selección por recuadro y grupos de vídeo/audio.
- Creación de pistas, desplazamiento y zoom.
- Envolventes de volumen y opacidad con puntos editables.
- Transiciones WebGL locales, muestras y duración por solapamiento.
- Máscara de luminancia con zoom, travelling, temblor, blur, suavidad e inversión; configuración flotante.

Consulta [FUNCIONAMIENTO.md](FUNCIONAMIENTO.md) para el uso, las pruebas y los límites actuales. El guardado/exportación completos y la compatibilidad fiel con VEGAS siguen pendientes; esta versión no debe considerarse un editor terminado.

## Desarrollo y paquete portátil

El código de escritorio está en desktop y la interfaz en dist. Las dependencias se instalan en el equipo de desarrollo mediante pnpm. Ejecutar desktop/build-portable.ps1 genera un ZIP con el motor instalado, recursos, Shapes y manual para distribuir sin instalación en el equipo destino.

Los shaders externos conservan sus autores y licencia en dist/THIRD-PARTY. No se descargan efectos durante el uso.
