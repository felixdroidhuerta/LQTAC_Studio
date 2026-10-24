# LQTAC Studio 0.14.0

Descarga **LQTAC_Studio_0.14.0_Windows_x64_Portable.zip**, extrae la carpeta completa y abre **LQTAC Studio.exe**. No ejecutes el programa dentro del ZIP ni muevas solo el EXE.

- Dos motores de subtítulos offline: Faster Whisper INT8 como opción inicial y whisper.cpp como alternativa.
- Grabación de micrófono a WAV; grabación de cámara y pantalla/ventana a WebM, con audio opcional e inserción en pistas.
- Menús reorganizados: Archivo, Insertar y Herramientas con submenús de efectos de vídeo/audio y subtítulos.
- Exportación de fotogramas PNG hasta 4K y de proyectos a GIF animado sin audio.
- Icono propio y asociación de proyectos .LQTS en Windows por usuario, respetando otros programas predeterminados.
- Apertura por doble clic en la misma ventana, con opción de guardar antes de cambiar; BAT de desarrollo sin preparación costosa en cada arranque.

Incluye Electron, FFmpeg, motores/modelos de voz y licencias para funcionar sin conexión. No contiene proyectos ni medios personales.

La captura de sistema y micrófono juntos se mezcla en una pista de audio. El audio del sistema incluye toda la salida del equipo incluso al capturar una ventana. La calidad de reconocimiento debe revisarse, especialmente en música. Compatibilidad VEGAS mediante el puente documentado; no se garantiza importación directa universal de cualquier .VEG.

Las pruebas de captura usan ventana propia y señales/dispositivos de prueba; el loopback real y cada cámara/driver requieren validación en el equipo de destino. Consulta FUNCIONAMIENTO.md y developer.md para límites y detalles.
