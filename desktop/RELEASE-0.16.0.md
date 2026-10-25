# LQTAC Studio 0.16.0

Descarga **LQTAC_Studio_0.16.0_Windows_x64_Portable.zip**, extrae la carpeta completa y abre **LQTAC Studio.exe**. No muevas solo el EXE: electron.exe, resources y Shapes forman parte del programa.

- Generadores de texto, títulos, rótulos, créditos y carteles editables en LQTS, con Fabric.js y Motion Canvas Core incluidos localmente.
- Editor compacto: visor fijo con Diseño/Resultado animado, herramientas por pestañas, timeline y botones de guardado siempre visibles.
- Puntos de animación funcionales en opacidad, escala y X/Y: clic o botón derecho para añadir, arrastre en tiempo/valor y borrado.
- Fuentes instaladas de Windows en generadores, subtítulos y karaoke; búsqueda, muestra, refresco y aviso si falta una fuente en otro equipo. No se redistribuyen los archivos de fuentes.
- Escucha directa de efectos de audio mientras editas. La preescucha es aproximada, especialmente ruido/normalización/limitador; Preparar escucha exacta conserva la referencia FFmpeg usada al renderizar.
- Project Media, Explorer y Generadores tienen vistas independientes. Explorer permite navegar, previsualizar e importar medios locales.
- Renderizado por tramo, o desde el primer al último clip activo, respetando Mute/Solo. Ctrl+Supr o menú contextual quita el tramo. Aviso de finalización y cierre automático de la ventana de render tras guardar correctamente.
- Eliminar pistas con botón derecho y deshacer; regla y contador fijos; cabezal por flechas del teclado; secciones colapsables de Ventanas.
- Conserva fotogramas/ondas reales, Toolbox de captura y los dos motores ASR offline (Faster INT8 y whisper.cpp).

Funciona sin conexión con los recursos incluidos. Revisa FUNCIONAMIENTO.md para uso y límites de cada herramienta, incluida la compatibilidad con VEGAS.

Tamaño: 1180084388 bytes. SHA-256: f009653e10a8e5235b7863b62e3c57518dad36738fd80aa260d76c4d7e82c2f5. Se adjunta RELEASE-SHA256SUMS.txt.

Validado el runtime empaquetado (arranque, módulos locales, tipografías, generador y composición), hashes de fuentes/runtime y modelos ASR incluidos, y CRC de todos los archivos del ZIP.
