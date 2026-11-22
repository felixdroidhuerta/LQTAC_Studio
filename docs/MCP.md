# Cinema Studio · control MCP local

Implementación local añadida a 0.22.0 y ampliada en 0.23.0. Permite que un cliente MCP (Claude Code, Claude Desktop, Codex u otro con transporte stdio) use el programa visible: el montaje mediante herramientas transaccionales y **cualquier otra función** (menús, paneles, diálogos, menús contextuales) mediante el acceso a la interfaz, además de grabar la pantalla entera o una zona. No requiere publicar el programa en una web, instalar Node ni descargar paquetes: utiliza el runtime incluido en Electron y los motores offline del portable.

## Activación

1. Abre `Cinema Studio.exe`.
2. Ve a **Opciones → Control MCP local…**.
3. Activa **Permitir control mediante MCP** y cierra el diálogo.
4. Opcional: activa **Permitir grabación de pantalla mediante MCP** si quieres que el asistente vea pantallas o ventanas y grabe (desactivado por defecto).
5. En **Configuración para** elige el cliente y copia el texto:
   - **Claude Code (comando)**: `claude mcp add cinema-studio --scope user -e … -- <electron.exe> <mcp-server.cjs>`. Después, `/mcp` en Claude Code para comprobarlo.
   - **Claude Desktop / .mcp.json**: bloque `mcpServers` con `type: "stdio"`.
   - **Codex**: bloque `[mcp_servers.cinema-studio]` para `%USERPROFILE%\.codex\config.toml`, con `startup_timeout_sec = 30` y `tool_timeout_sec = 180`.
   - **Otros clientes**: JSON `mcpServers` estándar.

   Las variantes se guardan también en `LQTAC Studio/mcp` (`mcp-client.json`, `codex-config.toml`, `claude-code.txt`) al activar el MCP.

El interruptor se conserva por usuario. Desactivarlo cierra la conexión local y cancela el trabajo MCP en curso. Cerrar Cinema Studio también cierra la conexión. Los permisos del cliente de IA se gestionan en ese cliente.

En este equipo se registra además el servidor `cinema-studio` en la configuración de Codex. Si una sesión ya abierta aún no lo lista, reinicia la conexión MCP desde Ajustes → Servidores MCP, o reinicia el cliente. En una instalación distinta copia la configuración generada por su propio portable: las rutas deben corresponder a ese equipo.

## Herramientas disponibles

| Herramienta | Función |
| --- | --- |
| `cinema_status` | Estado del editor, progreso y resultado del último trabajo |
| `cinema_project` | Proyecto, revisión y referencias de clips |
| `cinema_new` / `cinema_open` | Proyecto vacío / apertura LQTS |
| `cinema_import` | Biblioteca: vídeo, audio e imágenes; duración real y presencia de audio |
| `cinema_edit` | Lote de operaciones que se puede deshacer como una sola edición |
| `cinema_range` | Tramo compartido de reproducción y render |
| `cinema_save` | Guardar LQTS en una ruta explícita |
| `cinema_preview` | Fotograma PNG del montaje, devuelto como imagen y opcionalmente guardado |
| `cinema_render` | MP4, WebM, GIF, WAV, MP3, FLAC o M4A; audio y vídeo del montaje real |
| `cinema_cancel` | Cancelar el trabajo MCP |
| `cinema_history` | Deshacer / rehacer |
| `cinema_effects` | Parámetros, rangos y transiciones disponibles |
| `cinema_subtitle_import` | SRT a una nueva pista de subtítulos |
| `cinema_transcribe` | Transcripción offline de una pista de audio |
| `cinema_apply_subtitles` | Insertar el resultado terminado de la transcripción |
| `cinema_ui_snapshot` | Interfaz visible: diálogos abiertos y su estado, controles con `ref`, valor y opciones, y todos los comandos de menú (con su ruta y si están disponibles) |
| `cinema_ui_action` | Usar cualquier función: `command`, `click`, `set`, `contextmenu`, `select`, `key`, `close`, `menus`; contesta selectores nativos (`files`), cuadros de mensaje (`dialogButton`) y confirmaciones (`accept`) |
| `cinema_ui_screenshot` | PNG de la ventana de Cinema Studio |
| `cinema_record_sources` | Pantallas (con tamaño en píxeles) y ventanas grabables, micrófonos y cámaras · requiere permiso de grabación |
| `cinema_record_thumbnail` | Imagen actual de una pantalla o ventana para elegir la zona · requiere permiso |
| `cinema_record_start` | Grabar pantalla o ventana, entera o una zona (`region` en píxeles o fracciones), con audio del sistema, micrófono o cámara · requiere permiso |
| `cinema_record_control` | `pause`, `resume`, `stop` (guarda e inserta), `discard`, `snapshot`, `close` · requiere permiso |

`cinema_edit` permite crear, borrar, renombrar, silenciar y reordenar pistas; insertar y borrar clips; editar inicio, duración, recorte de origen, velocidad, fundidos, ganancia, dirección, FX y Pan/Crop; modificar envolventes; crear títulos y subtítulos; agrupar y desagrupar. Una pista de vídeo está por encima de las inferiores: coloca la pista de títulos antes de las pistas de vídeo que deban quedar detrás.

Los clips insertados desde un vídeo generan por defecto un vídeo y su audio agrupados con idénticos tiempos. Desactiva `splitAudio` solo si se quiere vídeo sin su audio asociado. Las ediciones de tiempo se propagan al grupo salvo `includeGroup:false`; los efectos específicos permanecen en el evento elegido. Para una transición, solapa clips en la misma pista y configura `transition` en el clip de entrada; sin elección se aplica fade. Consulta `cinema_effects` para los IDs reconocidos.

## Acceso a todo el programa

Las funciones que no tienen herramienta propia (efectos y su editor, Pan/Crop, generadores y títulos, máscaras, estabilizar, seguimiento, separar instrumentos, voz de estudio, karaoke, presets, exportar PNG/GIF/SRT, proyectos VEGAS, IA precisa, paneles…) se usan como lo haría una persona:

1. `cinema_ui_snapshot` (sin argumentos) devuelve los comandos de menú y los controles visibles. Con un diálogo modal abierto solo lista ese diálogo; `scope:"all"` lista todo y `query` filtra por texto.
2. `cinema_ui_action` con el `ref`: `command:command-12` para un comando de menú, `#id` o `ui:N` para controles, `clip:V1:0` / `track:V1` para clips y pistas (los mismos índices que `cinema_project`).
3. Vuelve a leer `cinema_ui_snapshot` (o `cinema_ui_screenshot`) para ver el resultado.

Ejemplo: abrir un proyecto desde Archivo contestando la confirmación del editor y el selector nativo (el `ref` exacto sale de `cinema_ui_snapshot`):

```json
{"action":"command","target":"command:command-1","accept":true,"files":["D:\\Proyectos\\Montaje.lqts"],"waitMs":2000}
```

`files` y `dialogButton` solo contestan el diálogo nativo que provoque esa acción y caducan al terminarla; nunca contestan los permisos de cámara o micrófono de Windows. `accept` responde a las confirmaciones del propio editor durante esa acción (por defecto, cancelar).

## Grabación de pantalla

Requiere activar **Permitir grabación de pantalla mediante MCP**. Sin ese permiso se rechazan todas las herramientas `cinema_record_*`; la interfaz nunca deja abrir desde MCP los grabadores ni el panel Control MCP.

1. `cinema_record_sources` → id de cada pantalla (`pixelWidth × pixelHeight`, principal o no) y de cada ventana.
2. `cinema_record_thumbnail` → imagen para decidir la zona.
3. `cinema_record_start` con `sourceId`, `path` (ruta `.webm` nueva) y opcionalmente `region`:

```json
{"sourceId":"screen:0:0","path":"D:\\Capturas\\demo.webm","region":{"x":100,"y":80,"width":1280,"height":720},"quality":1080,"systemAudio":false,"microphone":true}
```

   En pantallas, `region` se mide en píxeles reales de esa pantalla; en ventanas, sobre el tamaño capturado; con `regionUnit:"fraction"` se usan fracciones 0–1. Ancho y alto se redondean a números pares. Durante la toma aparece la Toolbox flotante para que la persona pueda pausar o detener.
4. `cinema_status.recording` muestra estado, segundos y zona; `cinema_record_control` con `stop` guarda, inserta en el proyecto (salvo `insert:false`) y devuelve el archivo.

La misma zona se puede elegir sin MCP: **Grabar pantalla → Preparar captura → Seleccionar zona…**, arrastrando sobre la imagen de la fuente o escribiendo X, Y, ancho y alto, con proporción libre, 16:9, 9:16, 1:1, 4:3 o 4:5. **Fuente completa** vuelve a grabarla entera.

## Flujo recomendado

Primero lee `cinema_project`. Conserva `revision` y las referencias `trackId:index`. Envía la revisión con cada lote de `cinema_edit`. Si una persona ha modificado el proyecto mientras tanto, el lote se rechaza y debes volver a leerlo. Las referencias se resuelven sobre el proyecto anterior al lote.

Ejemplo de operaciones (con la revisión obtenida previamente):

```json
{
  "revision": "REVISION_DEVUELTA_POR_CINEMA_PROJECT",
  "operations": [
    {"op":"addTrack","id":"V1","kind":"video","name":"Montaje"},
    {"op":"insertClip","trackId":"V1","path":"D:\\Medios\\video.mp4","start":0,"duration":10},
    {"op":"insertClip","trackId":"V1","path":"D:\\Medios\\otro.mp4","start":9,"duration":8}
  ]
}
```

Este ejemplo crea un segundo de solapamiento de vídeo. El audio de cada vídeo se crea en una pista de audio independiente; si se desea una transición de audio por solapamiento, indica el mismo `audioTrackId` de una pista existente al insertar ambos clips.

Los FX se asignan con `updateClip`, por ejemplo `patch.videoFx={"enabled":true,"saturation":0}`. Para desaturación gradual: `patch.videoFx={"enabled":true,"animation":{"saturation":[{"time":0,"value":1},{"time":10,"value":0}]}}`. Los tiempos de animación son locales al clip y deben caber en su duración.

**Trayectoria (0.27):** un clip de vídeo, imagen o GIF puede seguir una ruta con `updateClip` → `patch.motionPath` (`null` la quita). Ejemplo: `{"anchor":{"x":0.62,"y":0.38},"nodes":[{"x":-0.1,"y":0.7,"out":{"x":0.2,"y":0.7}},{"x":0.5,"y":0.3,"in":{"x":0.3,"y":0.3},"out":{"x":0.7,"y":0.3}},{"x":1.1,"y":0.6}],"start":0,"end":6,"orient":"path","inertia":0.4,"scale":0.3}`. `anchor` es la zona de peso en coordenadas 0–1 de la capa (el punto que va sobre la ruta y sobre el que gira); `nodes` son de 2 a 200 puntos Bézier en coordenadas de pantalla (de −2 a 3, fuera de cuadro permitido) con tiradores `in`/`out` absolutos; `start`/`end` en segundos locales del clip; `easing` Linear, Fast, Slow, Smooth o Sharp; `orient` path (gira con la ruta), flip (voltea al ir a la izquierda) o none; `forward` (°, hacia dónde mira la imagen), `angleOffset` (°), `inertia` 0–1, `scale` y `scaleEnd` 0,01–10, `loop`. Se recorre a velocidad uniforme y la pose es determinista. Los GIF animados se importan como vídeo y se convierten en local a WebM con transparencia.

Antes de sustituir un montaje con `cinema_new` o `cinema_open`, guarda el LQTS o autoriza `discardCurrent:true`. Un destino existente requiere `overwrite:true`. Solo se admiten rutas absolutas.

Render y transcripción devuelven un trabajo. Consulta `cinema_status` hasta `completed`, `failed` o `cancelled`. El render usa el mismo compositor del monitor, con audio, textos y FX. La transcripción no inserta automáticamente el resultado: lee la nueva revisión y llama a `cinema_apply_subtitles` para elegir cuándo incorporarlo. La fuente es una pista de audio, incluida la pista asociada a un vídeo.

## Arquitectura y límites

- `desktop/mcp-server.cjs`: JSON-RPC MCP sobre stdio, sin dependencias externas; negociación 2025-11-25, 2025-06-18, 2025-03-26 y 2024-11-05. No anuncia protocolos posteriores.
- `desktop/mcp-tools.cjs`: contrato y validación de las 23 herramientas.
- `desktop/mcp-clients.cjs`: configuración generada para Claude Code, Claude Desktop/.mcp.json, Codex y JSON genérico.
- `dist/assets/automation-ui.js`: acceso a la interfaz (snapshot, acciones, confirmaciones del editor). Excluye grabadores (`[data-capture]`, `#cameraDialog`, `#microphoneDialog`) y el panel MCP.
- `desktop/main.cjs`: respuestas de un solo uso para selectores nativos y cuadros de mensaje (60 s, nunca permisos), autorización del destino de grabación y listado/miniaturas de fuentes.
- `desktop/mcp-bridge.cjs`: conexión interna HTTP exclusivamente `127.0.0.1`, puerto efímero, token aleatorio y rechazo de peticiones con Origin. Este HTTP privado no es un servidor MCP remoto ni se publica en Internet.
- `desktop/mcp-edit.cjs`: edición transaccional, validación LQTS y detección de revisiones obsoletas.
- `dist/assets/mcp-controls.js`: adaptación al estado real del editor, compositor, historial, bloqueo durante render y panel de activación.
- `Cinema Studio MCP.bat`: entrada stdio opcional para clientes que inicien el BAT mediante `cmd /d /c`. No es un botón de montaje interactivo: espera mensajes MCP por la entrada estándar.
- Descriptor y configuración bajo el perfil del usuario: `LQTAC Studio/mcp`. No publicar `connection.json`, que contiene el token local.
- No expone ejecución de JavaScript arbitrario, terminal ni borrado de archivos. La grabación (pantalla, y micrófono o cámara dentro de esa toma) solo funciona con el permiso explícito; los permisos de cámara y micrófono de Windows los contesta siempre la persona.
- Los medios y motores permanecen locales. Un cliente de IA puede enviar a su proveedor los textos, rutas y vistas previas solicitados: el funcionamiento offline del editor no implica que el asistente sea offline.
- El acceso a la interfaz usa los mismos controles que la persona; los arrastres sobre lienzos (dibujar una máscara punto a punto, mover un clip con el ratón) no se reproducen como gestos: para el montaje usa `cinema_edit`. La grabación solo de audio o solo de cámara no se automatiza (sí dentro de una toma de pantalla).

## Validación

0.23.0: `verify-mcp.cjs` añade menús, diálogos y cierre; bloqueo de grabadores y panel MCP desde la interfaz; respuestas a diálogos nativos (abrir LQTS desde Archivo); captura de ventana; permiso de grabación; toma real de una zona de la pantalla insertada en el proyecto (tamaño exacto del WebM), y configuraciones de Claude y Codex. `verify-screen-region.cjs` prueba el selector visual de zona (arrastre, proporción, campos, Escape y fuente completa).

`desktop/verify-mcp.cjs` inicia un perfil aislado y un cliente stdio real. Genera vídeo y audio de prueba con FFmpeg; verifica negociación, listado de herramientas, acceso desactivado y sin token, importación y sincronía de grupos, lote atómico, rechazo de revisión antigua, FX animados, envolventes, títulos, subtítulos, historial, persistencia LQTS, PNG, render MP4 con audio y tramo, cancelación, importación SRT y desactivación final. Admite una ruta de portable como argumento para repetir el recorrido dentro del paquete.

La opción `--speech` añade una transcripción real con Faster INT8 y la inserción explícita del resultado. También se ha ejecutado correctamente dentro del portable 0.22.0. Esto verifica la integración; no vuelve a medir la precisión de Whisper ni la calidad de reconocimiento de canciones.

Referencia de configuración del cliente: [MCP en Codex](https://learn.chatgpt.com/docs/extend/mcp). Protocolo: [MCP 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25).
