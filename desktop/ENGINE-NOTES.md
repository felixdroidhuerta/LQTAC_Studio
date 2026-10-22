# Referencias de arquitectura

## Transiciones locales

Se incorporan seis shaders MIT de https://github.com/gl-transitions/gl-transitions, revisión 66a975917ab01a738408c81eb74fd329935e1c72. Las fuentes conservan sus cabeceras en dist/assets/transition-shaders.js y la licencia se incluye en dist/THIRD-PARTY/gl-transitions-LICENSE.txt. El adaptador WebGL es propio. No se carga código remoto durante la ejecución. Los paquetes portátiles copian dist completo, incluida la licencia.

Consultadas el 22 de octubre de 2026:

- Shotcut: https://github.com/mltframework/shotcut/blob/master/src/models/multitrackmodel.cpp
  Modelo multipista con posiciones y duraciones temporales independientes de la escala visual.
- MLT: https://github.com/mltframework/mlt/blob/master/src/framework/mlt_tractor.c
  Composición de múltiples pistas y transiciones sobre una posición de reproducción común.

La implementación JavaScript de LQTAC es propia; no se ha copiado código GPL ni integrado el motor nativo MLT. Estas referencias orientan la separación del tiempo del proyecto, su representación visual y la reproducción.

Cambios: rutas de archivos mediante Electron webUtils, duraciones sin recorte visual, desplazamiento común de grupos, reproductores por evento, vídeo silenciado para no duplicar el audio separado, fundidos por solapamiento, reloj monotónico condicionado a disponibilidad de los medios y errores visibles.

Verificación local: ejecutar verify-playback.cjs con Electron. Usa los dos MP4 del usuario, comprueba duraciones iguales, reproducción efectiva y cabezal. No modifica los archivos fuente.

Limitaciones: la mezcla de audio usa los elementos multimedia de Chromium; no es todavía un motor nativo de render/exportación. La precisión a nivel de muestra, los formatos no decodificables por Chromium y la importación completa de VEG requieren desarrollo adicional.
