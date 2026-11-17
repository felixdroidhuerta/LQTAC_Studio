# Cinema Studio by LQTAC 0.23.0

**Control MCP de todo el programa.** Un asistente de IA (Claude Code, Claude Desktop, Codex u otro cliente MCP) ya no se limita al montaje: puede usar cualquier función del programa. Pasa de 16 a 23 herramientas.

- **Leer la interfaz:** todos los comandos de los menús, los diálogos abiertos y sus controles, con su valor y sus opciones.
- **Usarla como una persona:** comandos de menú, botones, campos, listas, casillas, deslizadores, menús contextuales de clips y pistas, teclas dentro de diálogos y cierre de diálogos. En la misma acción contesta el selector nativo de abrir o guardar archivo, los cuadros de mensaje y las confirmaciones del editor.
- **Capturar la ventana** del programa para comprobar el resultado.
- **Configuración lista para copiar** en Herramientas → Control MCP local: comando para Claude Code, JSON para Claude Desktop o `.mcp.json`, bloque `config.toml` para Codex y JSON genérico.

**Grabar solo una zona de la pantalla.** En Grabar pantalla → Preparar captura → **Seleccionar zona…** se muestra la pantalla o ventana entera:

- Arrastra para marcar la zona y arrastra dentro para moverla, o escribe X, Y, ancho y alto en píxeles.
- Proporción libre, 16:9, 9:16, 1:1, 4:3 o 4:5.
- La zona se aplica a la vista previa, a la grabación, a los snapshots y a la cámara integrada. **Fuente completa** la quita.

**Grabación de pantalla por MCP**, con un permiso propio que viene **desactivado**: «Permitir grabación de pantalla mediante MCP».

- Lista pantallas y ventanas, muestra su imagen y graba la fuente entera o una zona.
- Pausa, reanuda, detiene (guarda e inserta en el proyecto), descarta y hace snapshots.
- Mientras graba aparece la Toolbox flotante para detenerla. Los permisos de cámara y micrófono de Windows siempre los contesta la persona.
- Desde la interfaz, el MCP no puede abrir los grabadores ni el panel MCP, así que no puede darse el permiso a sí mismo.

**Giro en las máscaras de transición.** La transición «Máscara personalizada» tiene el control **Giro durante la transición** (de −720° a 720°), que se suma al movimiento elegido. Por ejemplo, Zoom in + 360° hace que la forma crezca dando una vuelta completa. Se guarda en el proyecto; los proyectos anteriores se abren sin giro.

El repositorio incorpora también archivos que ya iban en el portable 0.22.0 y faltaban en su commit: el servidor MCP, Voz de estudio, DeepFilter, RNNoise y sus pruebas.

Validado con `verify-mcp.cjs` (23 herramientas, también sobre el portable empaquetado, con una grabación real de una zona de 640 × 360 px comprobada con FFmpeg), `verify-screen-region.cjs` y la comprobación de giro de `verify-playback.cjs`. También pasan `verify-screen.cjs`, `verify-capture-toolbox.cjs`, `verify-camera.cjs` y `verify-menus.cjs`. Limitación conocida: `verify-playback.cjs` se detiene en «Envelope output failed», un fallo que ya existía en 0.22.0.
