# LQTAC Studio — Funcionamiento y validación

Última actualización: 22 de octubre de 2026.

Este documento acompaña el desarrollo. Se actualizará con las funciones implementadas y los resultados de las pruebas, distinguiendo las comprobaciones técnicas de la aceptación del usuario. Una función nueva no se considerará aceptada únicamente porque su código esté escrito.

## Criterios del producto acordados

- Aplicación de escritorio local para Windows, con identidad visual LQTAC Studio, paleta y tipografías propias.
- Funcionamiento final completamente offline: edición, reproducción, guardado y exportación. Los componentes necesarios deberán distribuirse con el programa y sus licencias; los repositorios externos solo se consultan durante el desarrollo.
- Organización de edición inspirada en VEGAS: pistas en la mitad inferior de la ventana y separador arrastrable para ampliar su espacio. En la zona superior: selector de herramientas, biblioteca en mosaico y monitor de proyecto.
- La compatibilidad con proyectos VEGAS es un requisito pendiente de validar completamente; no debe confundirse con la posibilidad de seleccionar un archivo VEG.

## Abrir la aplicación

### Distribucion a equipos nuevos

La descarga de codigo de GitHub no incluye Electron. Para usar el programa en un equipo nuevo se debe distribuir el paquete `LQTAC_Studio_Portable_*.zip`, generado con `desktop/build-portable.ps1` en el equipo de desarrollo.

Extraer el ZIP completo y ejecutar `LQTAC Studio.exe`. El paquete incluye el motor, sus bibliotecas, licencias, recursos y codigo: no requiere Node, pnpm ni Internet en el equipo de destino. Mantener todos los archivos junto al ejecutable. La compilacion actual corresponde a Windows y a la arquitectura del Electron instalado en el equipo de desarrollo.

### Equipo de desarrollo

En la carpeta `Documentos\LQTAC Studio`, hacer doble clic en `LQTAC Video.bat`.

El lanzador abre el ejecutable local de Electron incluido en `desktop\node_modules\electron\dist`. No requiere escribir comandos ni ejecutar pnpm. Debe mantenerse la estructura de carpetas del proyecto. Todavía no es un instalador autónomo para distribuir a otros equipos.

## Biblioteca y clips

- La biblioteca muestra los medios en mosaico.
- Arrastrar un medio desde la biblioteca o desde el Explorador de Windows hasta una pista para insertarlo.
- Los archivos deben seguir disponibles en su ruta local: insertar un clip no copia ni modifica el archivo original.
- La duración del evento se obtiene del archivo. Si no puede leerse, se muestra un aviso y no se inserta un evento con duración ficticia.
- La escala temporal se amplía para cubrir los eventos completos.
- Un MP4 insertado crea un evento de vídeo y otro de audio, agrupados y de igual duración.

## Selección, movimiento y eliminación

- Clic en un evento: seleccionarlo; si pertenece a un grupo, seleccionar el grupo.
- Ctrl o Shift + clic: añadir o quitar eventos de la selección.
- Arrastrar desde una zona vacía de una pista: dibujar un recuadro y seleccionar los clips que toca, incluso entre varias pistas. Los miembros de un grupo se seleccionan juntos.
- Ctrl o Shift + arrastrar un recuadro: añadir clips a la selección existente. Clic en una zona vacía: limpiar la selección. Escape durante el arrastre: cancelar y recuperar la selección anterior.
- Arrastrar los eventos seleccionados para cambiar su posición temporal.
- Se permite trasladar un evento entre pistas. Los cambios temporales de un grupo aplican un desplazamiento común para conservar su sincronización.
- Suprimir o Retroceso: eliminar los eventos seleccionados de la timeline.
- Botón derecho sobre un evento → Eliminar evento: quitar la selección de la timeline.
- Eliminar eventos no borra los archivos originales.

## Grupos

- El vídeo y el audio de un MP4 quedan agrupados automáticamente.
- Botón derecho → Desagrupar: separar los miembros del grupo para editarlos individualmente.
- Seleccionar varios eventos y pulsar botón derecho → Agrupar selección: crear un grupo.
- Los grupos se identifican mediante una marca visual en sus eventos.

## Solapamientos y transiciones

Solapar dos eventos de la misma pista define la duración de la transición. Por defecto se aplica un fundido entre ambos, tanto en audio como en vídeo.

La zona de solapamiento muestra su duración. La vista previa aplica cambios graduales de volumen u opacidad durante esa zona.

### Catálogo de transiciones de vídeo

Disponible desde Transiciones en el selector lateral o desde el botón Transición de la timeline.

1. Solapar dos clips de vídeo en la misma pista.
2. Hacer clic en la zona del solapamiento para identificar el par que se va a editar. También se puede seleccionar un clip solapado y abrir el panel.
3. Pasar el ratón por una tarjeta para ver una muestra animada A/B.
4. Pulsar la tarjeta para aplicar el efecto al par elegido.
5. Reproducir o situar el cabezal sobre el solapamiento para ver el resultado con los vídeos reales.

Efectos iniciales: Fundido, Barrido izquierda, Barrido derecha, Apertura circular, Pixelado y Zoom deformado. La duración siempre procede del solapamiento. Seleccionar Fundido restaura la transición por defecto. El audio conserva su fundido independiente.

Los shaders proceden de `gl-transitions/gl-transitions`, revisión `66a975917ab01a738408c81eb74fd329935e1c72`, y están incluidos en `dist/assets/transition-shaders.js`, con los autores y licencias originales. La licencia MIT y su aviso se distribuyen en `dist/THIRD-PARTY/gl-transitions-LICENSE.txt`. No se consultan GitHub ni CDN al usar los efectos. El adaptador WebGL local de LQTAC está en `dist/assets/transitions.js`.

Esta implementación corresponde a la vista previa. La exportación final del proyecto sigue pendiente. Si WebGL falla, se conserva el fundido y se muestra un aviso.

### Transición por máscara personalizada

El selector Cargar imagen se abre siempre en la carpeta `Shapes` de la raíz del proyecto. En el paquete portátil, `Shapes` está junto a `LQTAC Studio.exe` e incluye la máscara LQTAC de ejemplo. Aunque se elija una imagen de otra ubicación, la siguiente apertura vuelve a comenzar en `Shapes`.

1. Abrir Transiciones y pulsar la tarjeta Máscara personalizada. Sus controles aparecen en una ventana flotante, no permanentemente en el catálogo.
2. Dentro de la ventana pulsar Cargar imagen. Aplicar al solapamiento asigna la imagen; Cerrar, la cruz o Escape cierran la configuración sin quitar la transición. Reabrir la tarjeta con un solapamiento de máscara seleccionado recupera sus ajustes.
3. Elegir una imagen PNG, JPEG, WebP o BMP de hasta 20 MB. Se recomienda una imagen en blanco y negro con degradados.
4. Seleccionar previamente el solapamiento entre dos vídeos y usar Aplicar al solapamiento. Si no hay un par seleccionado, se puede preparar la imagen pero Aplicar queda desactivado.
5. Elegir Movimiento de la máscara: Estática, Zoom in, Zoom out, Travelling izquierda/derecha/arriba/abajo o Temblor. Intensidad controla la amplitud del movimiento. Estos movimientos se aplican a la máscara, no a los vídeos.
6. Ajustar Blur de la imagen entre 0 y 50 px para difuminar la máscara y generar zonas grises. El blur se calcula sobre una copia de trabajo de hasta 1024 píxeles y se conserva en caché para no recalcularlo en cada fotograma. El original no se modifica.
7. Suavidad controla únicamente la mezcla del borde del revelado; empieza en 0 % para evitar una mezcla no solicitada. Invertir blanco y negro cambia el orden de aparición. Los ajustes de una máscara aplicada se actualizan inmediatamente; cerrar la ventana no revierte esos cambios.
8. Posición de la muestra permite examinar cualquier momento de la transición entre los ejemplos A/B antes de aplicarla. La miniatura refleja el blur y la muestra refleja también movimiento, inversión y suavidad.

Las transiciones personalizadas sustituyen el fundido automático del vídeo: el compositor muestra únicamente los colores de los vídeos seleccionados, usando la imagen como mapa de revelado, sin superponer la propia imagen ni añadir un fundido global. Si el compositor no está listo o falla, permanece el vídeo anterior; no se introduce un fundido como sustitución. Las envolventes de opacidad de la pista siguen siendo independientes, al igual que el fundido de las pistas de audio.

El blanco revela primero el vídeo entrante; el negro lo revela al final y los grises ordenan las zonas intermedias. Las imágenes de color se interpretan por su luminosidad. La imagen se adapta al tamaño de la vista previa; las transparencias del archivo se interpretan sobre negro.

Cada solapamiento mantiene su propia imagen y sus ajustes. Los controles modifican la máscara del solapamiento seleccionado cuando coincide con la imagen cargada. Cargar otra imagen no sustituye ninguna transición hasta pulsar la tarjeta para aplicarla.

Se guarda una copia PNG independiente del original en `transition-masks`, dentro de los datos locales de la aplicación de Windows. Las imágenes grandes se reducen a un máximo de 2048 píxeles de lado para la vista previa. Esta copia no requiere Internet. El guardado y traslado de un proyecto completo con sus máscaras sigue pendiente del sistema de persistencia de proyectos; actualmente los ajustes de la timeline no se recuperan automáticamente al cerrar.

Comprobaciones técnicas: carga de PNG y copia local, compilación del shader, extremos de transición exactos, orden de blanco/negro e inversión mediante lectura de píxeles y aplicación de máscara, suavidad e inversión sobre ambos MP4 de prueba. Pendiente de aceptación visual por el usuario.

## Monitor y reproducción del proyecto

- El monitor reproduce los eventos activos de las pistas del proyecto, no el clip seleccionado en la biblioteca.
- Las pistas de audio activas se reproducen simultáneamente. Los vídeos activos se componen por capas.
- El vídeo se reproduce silenciado porque su audio se reproduce desde el evento separado, evitando duplicarlo.
- El botón Reproducir/Pausa y la barra espaciadora controlan la reproducción.
- Un cabezal vertical y su código de tiempo indican la posición en todas las pistas.
- Clic en la regla temporal: situar el cabezal y actualizar la vista previa.
- El monitor identifica el tiempo y las pistas activas. Los errores de reproducción se muestran en pantalla.

## Envolventes de volumen y opacidad

Las envolventes se aplican a la pista, en tiempos del proyecto. Su efecto continúa aunque se oculte la línea.

1. Botón derecho sobre el fondo de una pista → Mostrar envolvente.
2. En pistas de audio aparece la envolvente de volumen; en vídeo, la de opacidad.
3. Botón derecho sobre la línea: insertar un punto en esa posición, conservando inicialmente el valor de la curva.
4. Arrastrar un punto horizontalmente para cambiar su tiempo y verticalmente para cambiar su valor. Los puntos no pueden cruzarse.
5. Arrastrar el tramo entre dos puntos verticalmente para cambiar ambos valores manteniendo su diferencia, hasta alcanzar los límites permitidos.
6. Botón derecho sobre el fondo de la pista → Ocultar envolvente.

La interpolación entre puntos es lineal. Las pistas comienzan al 100 %:

| Valor | Volumen | Opacidad |
| --- | --- | --- |
| 100 % | Nivel original | Vídeo opaco |
| 0 % | Silencio | Vídeo transparente; se ven las capas inferiores o negro |

Las envolventes se combinan con los fundidos por solapamiento. Actualmente el volumen permite atenuar entre 0 y 100 %; no incluye amplificación por encima del nivel original.

## Crear pistas

Pulsar ＋ Pista y elegir Añadir pista de vídeo o Añadir pista de audio.

Cada pista nueva comienza vacía, tiene identificador propio y admite inserción de medios y envolventes. Cuando se acumulan pistas, el área permite desplazamiento vertical.

## Zoom y desplazamiento de la timeline

En la barra inferior:

- Arrastrar el centro de la ventana azul: desplazar la zona visible.
- Arrastrar uno de sus extremos: ampliar o reducir la zona visible y, por tanto, cambiar el zoom.
- Botones − y +: reducir o aumentar el zoom.
- Ajustar: volver a mostrar el proyecto completo.
- El porcentaje indica la ampliación; el rango implementado es del 100 al 3000 %.

El zoom modifica la representación visual, no las duraciones, los tiempos de los eventos ni los puntos de las envolventes.

## Registro de validación

| Área | Estado y evidencia |
| --- | --- |
| Reproducción y timeline tras las correcciones | Usuario da por buena esta parte antes de solicitar las envolventes. Pruebas técnicas de reproducción con los MP4 de 2:15 y 4:21, pares de igual duración y cabezal en movimiento. |
| Envolventes | Aceptadas por el usuario al solicitar la siguiente mejora. Comprobaciones técnicas de inserción de puntos, movimiento de punto y tramo, y aplicación de volumen 25 % y opacidad 40 % a los reproductores. |
| Creación de pistas y zoom | Implementados y comprobados técnicamente: pistas vacías con controles de inserción/envolvente, zoom 400 %, desplazamiento horizontal y ajuste completo. Pendiente de confirmación explícita de uso por el usuario. |
| Selección por recuadro | Comprobada técnicamente sobre clips agrupados y cancelación con Escape. Pendiente de aceptación explícita. |
| Catálogo de transiciones | Seis shaders compilados y comprobados con lectura de píxeles en inicio y final; barrido aplicado en el compositor con los MP4 reales de 2:15 y 4:21. Pendiente de aceptación visual por el usuario. |
| Funcionamiento offline completo | Requisito acordado. Pendiente de prueba integral con conexión desactivada y de completar guardado/exportación. |

## Límites actuales y funciones pendientes

- La reproducción utiliza Chromium/Electron; no se ha integrado el motor nativo MLT. Los formatos reproducibles dependen del decodificador disponible.
- Las pruebas descritas verifican reproducción breve y comportamiento concreto; no certifican todavía proyectos largos, carga intensiva o precisión de audio a nivel de muestra.
- Guardado LQTS y exportación implementados en 0.3.0 y comprobados en proyectos cortos; pendientes de aceptación del usuario y prueba de proyectos largos.
- La apertura completa y fiel de proyectos VEGAS sigue pendiente de validación, incluidos eventos, medios, efectos y transiciones.
- El portable incluye Electron y FFmpeg. Sigue pendiente una prueba integral en otro equipo con la conexión desactivada.

## Proyectos LQTS y exportación local — 0.3.0

### Guardar y abrir

- **Archivo → Guardar proyecto** (`Ctrl+S`) muestra el diálogo nativo la primera vez y después actualiza ese archivo. **Guardar proyecto como…** (`Ctrl+Mayús+S`) permite guardar una copia.
- **Archivo → Abrir proyecto .LQTS…** (`Ctrl+O`) recupera el montaje. Se pide confirmación antes de reemplazar la edición actual; guarda primero si deseas conservarla.
- Se conservan nombre, biblioteca, orden y tipo de pistas, tiempos reales, grupos de sincronización, puntos/visibilidad de envolventes, transición por evento entrante, ajustes e imagen de la máscara personalizada, posición del cabezal y zoom.
- `.LQTS` es JSON versionado. Las máscaras PNG están integradas. Los vídeos y audios se **referencian, no se incluyen**: conserva los originales. Se guardan rutas relativas al proyecto y una ruta absoluta alternativa; si faltan medios, se informa de sus rutas sin eliminar los eventos.
- Guardado mediante archivo temporal y reemplazo después de escribir. Se rechazan esquemas desconocidos, eventos no válidos y archivos superiores a 100 MB. La decodificación de máscaras se completa antes de sustituir el montaje.

### Renderizar vídeo y audio

**Archivo → Renderizar vídeo o audio…** o **Exportar** abre la configuración. Elige el formato y pulsa **Guardar archivo…** para indicar destino. Incluye progreso y cancelación.

| Tipo | Formato | Codificación |
| --- | --- | --- |
| Vídeo | MP4 | H.264 / AAC 192 kb/s |
| Vídeo | WebM | VP9 / Opus 160 kb/s |
| Audio | WAV | PCM 24 bits |
| Audio | MP3 | 320 kb/s |
| Audio | FLAC | Sin pérdida |
| Audio | M4A | AAC 256 kb/s |

Vídeo: 640×360, 1280×720 o 1920×1080, a 24, 25 o 30 fps. Mantiene la proporción de los medios con bandas negras. Exporta desde tiempo cero hasta el final del último evento, no hasta el ancho mínimo de 75 segundos del timeline.

Se renderizan fotogramas del mismo compositor de la vista previa, incluyendo capas, opacidad, solapamientos y máscaras animadas/difuminadas. La mezcla de audio incorpora todas las pistas de audio, sus envolventes y fundidos por solapamiento. Las partes sin medios son negras/silenciosas. Un proyecto sin pistas de audio produce una pista silenciosa. La exportación de solo audio no necesita renderizar vídeo.

FFmpeg y los códecs están incluidos en el portable; no se conecta a GitHub ni descarga componentes. No requiere instalar FFmpeg en el equipo destino. El archivo final aparece al terminar correctamente; cancelar elimina únicamente el archivo temporal de esta exportación. Se impide sobrescribir un medio utilizado por el montaje.

### Pruebas y límites de esta entrega

- Prueba automatizada `desktop/verify-project.cjs`: guardar/reabrir LQTS con cuatro eventos, grupos, puntos de volumen/opacidad y máscara PNG animada con blur; conserva duraciones y ajustes.
- Exportaciones de 1,5 segundos a los seis formatos, decodificadas posteriormente por FFmpeg sin errores. MP4 y WebM contienen 36 fotogramas a 24 fps, composición y audio del proyecto.
- No es una garantía de precisión de mezcla a nivel de muestra: el volumen FFmpeg se evalúa por bloque de audio. Falta medir rendimiento, memoria y estabilidad en proyectos largos y confirmar el resultado visual con el usuario.
- Exportación de vídeo fotograma a fotograma: puede tardar más que la duración del montaje. Durante la exportación la edición queda bloqueada por la ventana modal.
- Sin recolector de medios, relocalización interactiva de archivos perdidos, registro de extensión en Windows ni guardado automático. Los controles aún no funcionales de la interfaz (por ejemplo, efectos no implementados) no se convierten en efectos de exportación.

## Cómo mantener este documento

### Cabezal arrastrable — 0.3.4

- Arrastra la flecha del cabezal o su etiqueta de tiempo para cambiar la posición. También puedes pulsar y arrastrar sobre la regla superior del timeline.
- Actualiza el contador, la línea de posición y la vista previa del proyecto. Si estaba reproduciendo, se pausa para inspeccionar el punto elegido; pulsa Play para continuar desde allí.
- Respeta el zoom y el desplazamiento horizontal y limita la posición entre cero y la duración del timeline. Escape durante el arrastre recupera la posición inicial. La línea vertical no intercepta clics sobre los clips.
- No modifica eventos, selección ni historial de deshacer. Comprobación técnica: arrastre al 400 % con desplazamiento, límites inicial/final e historial intacto. Pendiente de aceptación del usuario.

### Fade-in y fade-out por evento — 0.3.3

- Arrastra el tirador de la esquina superior izquierda hacia dentro para crear un **fade-in**, y el superior derecho hacia dentro para un **fade-out**. Los tiradores se desplazan al final/inicio de la rampa; arrastrarlos hacia el extremo reduce el fade hasta cero. El título del tirador indica su duración en segundos.
- Cada extremo se ajusta por separado, hasta la duración total del clip. Se dibuja una rampa y sombreado sobre el evento. Las dos rampas pueden solaparse; sus ganancias se multiplican.
- Afecta solo al clip manipulado, incluso si pertenece a un grupo. En vídeo modifica su opacidad y en audio su volumen. No altera los tiempos ni la sincronización, y se combina con la envolvente de pista y la transición por solapamiento existente.
- Doble clic en un tirador elimina ese fade. Escape durante el arrastre cancela el ajuste. Ctrl+Z/Y deshace/rehace un arrastre como una sola operación.
- Los fades se conservan en LQTS y al copiar/pegar. La exportación de vídeo usa el compositor y el audio exportado aplica la misma ganancia lineal. El compositor WebGL también aplica los fades individuales de los vídeos participantes en transiciones personalizadas.
- Al recortar, los fades se limitan a la duración restante. Al dividir, la pieza izquierda conserva el fade-in y la derecha el fade-out, limitados a sus duraciones; no se crean fundidos nuevos en el corte.
- Pruebas técnicas: arrastre de ambos extremos, independencia del audio agrupado, valores de ganancia al inicio/mitad/final de las rampas, recuperación del montaje, deshacer/rehacer y canal alfa en WebGL. Pendiente de aceptación visual y de escucha por el usuario.

### Copiar, pegar, deshacer y rehacer — 0.3.2

- **Ctrl+C** copia los eventos seleccionados y los miembros de sus grupos al portapapeles interno de la aplicación. **Ctrl+V** pega el primero en el cabezal y mantiene la separación temporal de los restantes y sus pistas de origen cuando existen y son compatibles.
- Conserva recortes, duración original, tipo de medio y ajustes de transición/máscara. Los grupos pegados reciben identificadores nuevos: no quedan unidos a los originales. No duplica los archivos de vídeo/audio en disco. Si faltan pistas compatibles, crea las necesarias.
- **Ctrl+Z** deshace y **Ctrl+Y** o **Ctrl+Mayús+Z** rehace. También funcionan los botones de deshacer/rehacer de la cabecera y el menú **Editar**, que incluye copiar y pegar.
- Historial para pegar, añadir medios a pistas, mover, recortar, dividir, eliminar, agrupar/desagrupar, crear pistas, editar envolventes, aplicar/configurar transiciones y renombrar. Un arrastre se registra como una operación, no una por cada movimiento del ratón.
- Una nueva edición descarta la rama de rehacer. El historial se mantiene solo durante la sesión y se limpia al abrir otro LQTS; no se guarda dentro del proyecto. Límite por pila: 50 estados y presupuesto de 32 MB, conservando al menos un estado aunque lo exceda. Las máscaras grandes pueden reducir la profundidad disponible.
- Deshacer no rebobina el cabezal ni cambia el zoom; recupera la selección del estado de edición cuando es posible. No elimina exportaciones ni archivos originales. Las importaciones de biblioteca y ajustes de visualización no tienen un historial independiente.
- En campos de texto, Ctrl+C/V/Z/Y conservan el comportamiento nativo de edición. No se aplican comandos del timeline con ventanas de configuración abiertas o mientras se exporta/restaura el montaje.
- Pruebas técnicas: copia y pegado de vídeo/audio recortados con nuevos grupos, posiciones y desplazamientos de origen correctos; deshacer/rehacer de pegado, eliminación y creación de pista; múltiples pasos; descarte de rehacer tras una edición nueva; no interceptar Ctrl+Z al escribir. Regresión de guardado, recorte y seis formatos de exportación superada. Pendiente de aceptación del usuario.

### Recorte y división — 0.3.1

- Arrastra el borde izquierdo o derecho de un evento para recortar su inicio o final. Al pasar el ratón aparecen las marcas de los extremos y el cursor de ajuste horizontal.
- El recorte no destruye el original: arrastrar hacia fuera permite recuperar material oculto hasta el límite de la fuente. No desplaza los demás eventos ni aplica cambio de velocidad. Duración mínima durante el recorte: 1/24 s.
- Se recortan a la vez los miembros del grupo del evento, limitando el movimiento para no sacar ninguno del archivo fuente. Desagrupa para editar vídeo/audio por separado. Escape durante el arrastre cancela ese recorte.
- Selecciona uno o varios eventos, sitúa el cabezal en su interior y pulsa **S**. Se dividen los eventos seleccionados y sus compañeros agrupados que crucen ese instante. El lado derecho queda seleccionado y recibe un grupo diferente al izquierdo, conservando la sincronización de cada pareja.
- S no divide mientras se escribe en un campo, se guarda con Ctrl+S o hay una ventana de configuración abierta. Situar el cabezal en el extremo de un evento no crea fragmentos vacíos.
- Se guardan en LQTS el desplazamiento de inicio dentro del medio y la duración original conocida. Vista previa y exportación de audio/vídeo usan ese desplazamiento; no vuelven al principio del archivo después de cortar.
- Comprobación técnica: recorte de inicio y final sobre vídeo/audio agrupados, división posterior, grupos independientes, tiempos de origen correctos y recuperación del montaje serializado. Regresión de los seis formatos de exportación superada. Pendiente de aceptación de uso por el usuario.
- Las envolventes siguen ancladas al tiempo de la pista, no al clip. Dividir dentro de una transición puede modificar su cálculo, que continúa basándose en el solapamiento de los eventos resultantes.

Con cada mejora se actualizarán el uso, los límites y las comprobaciones realizadas. La aceptación del usuario se registrará por separado de una prueba técnica. Las correcciones posteriores actualizarán la descripción anterior para que el documento represente el comportamiento vigente.

## Preparación de este equipo — 22/10/2026

- Copia de trabajo preparada en `C:\Users\FelixHuerta Rosario\Documents\ChatGPT\LQTAC Studio` desde la carpeta local `Documents\LQTAC_Studio` (código 0.3.4). La carpeta de origen se conserva.
- Node 24.22.0 y pnpm 11.25.0 disponibles. Instalación con `pnpm install --frozen-lockfile`: Electron 38.8.6, ffmpeg-static 5.3.0 y FFmpeg 6.1.1. Sin actualización del lockfile.
- Prueba `desktop/verify-project.cjs` finalizada con código 0: round-trip LQTS, medios ausentes, seis exportaciones decodificadas, cancelación, recorte/división, copiar/pegar, historial, fades y cabezal.
- Arranque: doble clic en `LQTAC Video.bat`. También `desktop/start.ps1`, que elimina ELECTRON_RUN_AS_NODE para iniciar Electron en modo escritorio.
- No se ha ejecutado verify-playback.cjs: sus medios reales corresponden al equipo anterior. La validación anterior usa medios sintéticos; no certifica proyectos largos ni el puente VEGAS.
- Esta carpeta tiene un repositorio Git nuevo, sin commits ni remoto configurado. No se ha vinculado ni publicado en GitHub.

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
