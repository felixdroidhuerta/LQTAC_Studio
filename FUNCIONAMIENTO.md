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
- Guardado y recuperación completos del proyecto, incluidas envolventes y grupos, y exportación final requieren implementación o verificación adicional. No se garantiza persistencia de las ediciones al cerrar la aplicación.
- La apertura completa y fiel de proyectos VEGAS sigue pendiente de validación, incluidos eventos, medios, efectos y transiciones.
- Falta empaquetado final como aplicación distribuible con todas sus dependencias y comprobación offline integral.

## Cómo mantener este documento

Con cada mejora se actualizarán el uso, los límites y las comprobaciones realizadas. La aceptación del usuario se registrará por separado de una prueba técnica. Las correcciones posteriores actualizarán la descripción anterior para que el documento represente el comportamiento vigente.
