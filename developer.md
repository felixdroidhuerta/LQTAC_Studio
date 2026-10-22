# LQTAC Studio — guía de desarrollo y continuidad

Actualizado: 22-10-2026. Código: **0.5.0**. Proyecto privado: https://github.com/felixdroidhuerta/LQTAC_Studio.

Estado vigente: ver la sección final «Puente operativo VEGAS → LQTAC — 0.5.0». Ya existe un puente estructural inicial; las secciones de 0.3.4 se conservan como contexto histórico. No declarar lectura binaria universal ni compatibilidad audiovisual completa con VEG.

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
