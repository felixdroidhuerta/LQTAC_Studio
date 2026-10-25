# LQTAC Studio — Funcionamiento y validación

Última actualización: 25 de octubre de 2026.

## Editar puntos directamente en las curvas del generador

En la curva inferior de los títulos, elige **Opacidad**, **Escala**, **Posición X** o **Posición Y**. **Clic sobre la curva** añade un punto en ese tiempo y valor; también puedes usar **botón derecho → Añadir punto** en una zona sin puntos. Al pulsar un punto existente se selecciona; arrastrarlo horizontalmente cambia su tiempo y verticalmente cambia su valor. El resultado animado y los valores del panel se actualizan durante el arrastre.

**Suprimir**, **Eliminar punto** o **botón derecho sobre el punto → Eliminar punto** lo borran. **Escape** durante el arrastre cancela ese gesto y recupera los puntos anteriores. Se mantienen el botón Añadir/actualizar y el campo para retimar con precisión. Los puntos se guardan en LQTS y afectan al resultado, no solo al dibujo de la curva. Como antes, al existir puntos propios estos sustituyen el movimiento del preset.

Validado con clic y arrastre reales en las cuatro curvas, menú contextual de creación/borrado, Suprimir, cancelación, diferencias de opacidad en los píxeles renderizados y guardado/reapertura.

## Editor compacto de títulos y gráficos

El editor mantiene el **visor, la línea de tiempo y Cancelar/Guardar/Añadir siempre visibles**, sin desplazar toda la ventana para acceder a las herramientas.

- **Diseño:** lienzo editable para seleccionar, arrastrar, redimensionar, girar y escribir; arriba están Añadir texto, Añadir forma y Eliminar objeto.
- **Resultado animado:** usa el mismo espacio del visor para reproducir la composición. Reproducir o desplazar el tiempo cambia automáticamente a esta vista; Diseño permite volver a manipular los objetos.
- **Texto:** contenido, fuentes instaladas, búsqueda/actualización, tamaño, negrita y alineación.
- **Estilo:** color, contorno y sombra.
- **Animación:** preset, entrada/salida, interpolación y valores de X/Y, escala y opacidad de los puntos. Seleccionar/manipular puntos abre este panel automáticamente.
- **Lienzo:** fondo transparente/color y duración de la fuente generada.
- **Línea de tiempo inferior:** reproducción, tiempo, curva, añadir/actualizar/eliminar puntos, lista y cambio preciso del tiempo del punto. La ayuda de puntos está en una sección desplegable de Animación.

Solo el panel lateral de propiedades tiene desplazamiento cuando hace falta. El lienzo se ajusta al espacio disponible y mantiene la proporción 16:9; no cambia la resolución ni las posiciones del diseño guardado. Se conservan todas las herramientas, las fuentes instaladas y el formato LQTS anterior.

Validado en ventanas de 1540×900 a 800×600: sin desplazamiento global del diálogo, con visor/timeline/pie visibles, cambio de pestañas, arrastre real de un objeto después de redimensionar, edición de texto/puntos y guardado.

## Fuentes instaladas en el equipo

Los selectores de **Fuente** de Generadores y **Tipografía** de Subtítulos muestran las familias instaladas en Windows, con búsqueda por nombre, muestra visual y botón **Actualizar fuentes**. Los nombres siguen siendo legibles con la tipografía de la interfaz; la muestra y el contenido se dibujan con la fuente elegida. Se pueden usar también en los subtítulos con karaoke, que conservan el mismo estilo tipográfico.

La lista se consulta al abrir el selector y se reutiliza en memoria; no se escanean fuentes al arrancar ni se descarga nada. Si instalas fuentes mientras LQTAC Studio está abierto, pulsa **Actualizar fuentes**. Los proyectos guardan el nombre de la familia tanto en los diseños generados como en los estilos de subtítulo. Si falta una fuente en otro ordenador, su nombre se conserva y el selector avisa de que se está mostrando una sustitución. No se copian ni instalan archivos de fuentes dentro de LQTS o del portable: para reproducir exactamente el diseño en otro equipo, esa familia debe estar instalada allí.

Validado con catálogo real de 276 familias de Windows, selección de Impact, cambio de píxeles respecto a Segoe UI en ambos motores de texto, búsqueda sin pérdida de selección, actualización del catálogo, fuente ausente preservada, composición y guardado/reapertura LQTS.

## Project Media, Explorer y Generadores

Las tres entradas tienen vistas independientes:

- **Project Media:** muestra únicamente la biblioteca del proyecto, incluidos sus diseños generados.
- **Explorer:** elige una carpeta del equipo, entra en subcarpetas o sube al directorio padre. Selecciona un vídeo, audio o imagen para previsualizarlo; **Añadir a Project Media** lo importa a la biblioteca sin crear eventos en el timeline. Los archivos de vídeo/audio también se pueden arrastrar directamente a una pista compatible. Cambiar de vista detiene la previsualización del explorador. No modifica ni mueve los originales.
- **Generadores:** catálogo de **Texto**, **Títulos**, **Rótulos**, **Créditos** y **Carteles**. Abre un editor independiente; no muestra otra copia de la biblioteca.

En el editor de Generadores puedes escribir sobre el lienzo (doble clic), añadir textos o formas, arrastrarlos, redimensionarlos, girarlos y eliminarlos. El objeto seleccionado tiene controles de texto, fuente, tamaño, color, negrita, alineación, contorno y sombra. La composición puede tener fondo transparente u opaco. El diseño se hace a 1920 × 1080 y se escala al render; el selector permite las fuentes instaladas en el equipo.

Elige **Sin animación**, **Fundido**, **Entrada lateral**, **Zoom**, **Máquina de escribir** o **Créditos verticales**. Ajusta entrada, salida e interpolación y reproduce la previsualización con su línea de tiempo. Los puntos propios de la composición permiten animar X, Y, escala y opacidad; puedes añadir/actualizar, seleccionar, retimar arrastrando o con el campo preciso y eliminar con botón o menú contextual. Los puntos propios sustituyen el movimiento del preset mientras existan. La duración es la de la fuente generada; al reeditar un clip recortado no puede quedar más corta que el fragmento que este utiliza.

**Guardar en Project Media** conserva el diseño en la biblioteca; desde allí puedes arrastrarlo a una pista de vídeo. **Añadir a timeline** crea también un evento en una pista superior de títulos, con fondo transparente cuando corresponda. Doble clic sobre un clip generado reabre su diseño. Al editar un clip, **Aplicar al clip** modifica solo ese evento y **Guardar copia en Project Media** crea una copia independiente. Los diseños se guardan dentro de LQTS y no dependen de un PNG externo. Soportan división, recorte, velocidad, repetición, inversión, FX de vídeo y Pan/Crop; la composición del monitor es la misma que utiliza el render. Esta primera versión admite texto y rectángulos; todavía no incorpora imágenes/SVG dentro del lienzo ni el editor completo de escenas de Motion Canvas.

Fabric.js y las funciones de tiempo de Motion Canvas Core están incluidas en un bundle local de aproximadamente 296 KB con sus licencias. La prueba bloquea HTTP/HTTPS y confirma edición, animación, guardado/reapertura y MP4 sin conexión. Los portables anteriores no incluyen estas funciones nuevas.

## Efectos de audio: escucha mientras editas

Abre un efecto de audio desde **FX**, pulsa **Escuchar clip** y cambia los valores: la escucha continúa y el sonido responde sin regenerar un archivo con cada cambio. Se evalúan también las curvas animadas durante la reproducción. El selector **Escuchar original sin filtros** permite comparar sin cerrar el editor. Al cerrar se liberan la reproducción, los nodos y el contexto de audio.

La **preescucha en directo es aproximada**, mediante Web Audio y un AudioWorklet local: ecualizador, compresor, limitador, reducción de ruido, normalización, eco y reverberación. Ruido usa una expansión de nivel y normalización usa una estimación RMS; no equivalen a la reducción espectral y la medición de sonoridad de FFmpeg. El limitador directo tampoco reproduce el lookahead del render. Para evaluar el resultado del motor final conserva **Preparar escucha exacta**. Al aplicar, se prepara/valida ese audio exacto; la exportación mantiene el motor FFmpeg anterior.

Validaciones: cambio real de RMS al editar el ecualizador sin pausar, comparación con original, apertura/reproducción/cierre de los siete efectos, procesamiento exacto de una curva de EQ, offsets, velocidad 1.5×, guardado, división y deshacer/rehacer. Primera implementación funcional pendiente de tu prueba de uso.

## Pistas, navegación y tramo de renderizado

- **Eliminar una pista:** botón derecho en su cabecera o en una zona vacía de la fila → **Eliminar pista**. Elimina esa pista y sus eventos; conserva los archivos de la biblioteca y del disco. **Ctrl+Z** recupera la pista con sus clips y ajustes.
- **Regla fija:** los tiempos, el contador y la flecha del cabezal permanecen arriba del timeline al bajar por las pistas. Las marcas de tiempo corresponden a su posición real en la regla.
- **Mover el cabezal:** arrastrar su flecha o contador; **← / →** retroceden o avanzan un fotograma (24 fps de la regla actual), **Mayús+← / →** un segundo. No actúa al escribir en un campo o con un editor abierto. Al salir horizontalmente del área visible, el timeline sigue el desplazamiento por teclado.
- **Ventanas:** secciones colapsables **Medios**, **Edición**, **Proyecto** y **Grabaciones**. Esta última incluye audio, cámara y pantalla, también disponibles en Insertar.
- **Elegir tramo:** **Mayús+arrastrar sobre la regla** crea una selección. Arrastra sus extremos para ajustarla. Los botones **Inicio I** y **Fin O** fijan los límites en el cabezal; **Todo** borra el tramo. También puedes pulsar botón derecho dentro de la selección sobre la regla y elegir **Quitar selección**, o usar **Ctrl+Supr**. Este atajo también funciona en la ventana de render antes de iniciar la exportación; no cancela un render en curso. La tecla **Esc** cancela un arrastre.
- **Renderizar:** la ventana permite activar/desactivar el tramo y escribir inicio/fin en segundos. Sin tramo, exporta desde el inicio del primer evento activo hasta el fin del último; no añade el espacio inicial vacío ni la cola de pistas silenciadas. Respeta **Mute** de pista/evento y **Solo** por tipo de pista. Los huecos internos se conservan. Un tramo explícito puede incluir huecos, pero debe contener algún clip activo; si no hay ninguno, no se renderiza.
- **Render terminado:** al guardar correctamente el archivo, la ventana de renderizado se cierra automáticamente y aparece **Renderización finalizada**, con la ruta del archivo y un botón **Aceptar**. Si se cancela o hay un error, no aparece un aviso de éxito: la ventana queda abierta con el estado correspondiente.
- El tramo se guarda en **LQTS**. Audio, vídeo y GIF usan los mismos límites; las animaciones, envolventes, fades y subtítulos conservan su posición absoluta en el montaje. Un PNG sigue exportando únicamente el fotograma del cabezal.

Validado con audio WAV real (frecuencia y duración del tramo), exportación MP4 desde el botón Guardar archivo, clips rojos/azules antes y después del corte, clips/pistas silenciados, Solo, regla fija con 23 pistas, borrado/deshacer, selección por arrastre a 300 % y guardado/restauración de LQTS.

## Fotogramas y ondas reales en los clips del timeline

Los clips de vídeo muestran automáticamente una **tira de miniaturas extraídas del archivo**, repartidas a lo largo de su duración. Los de audio —incluidos el sonido de un vídeo y las grabaciones WAV/WebM— muestran una **onda calculada a partir de su señal**, sustituyendo las rayas decorativas anteriores. Los silencios quedan planos; un medio sin pista de sonido se indica como «Sin audio».

Las vistas siguen el zoom y el desplazamiento horizontal, el recorte, la velocidad y la dirección del clip. Las repeticiones vuelven a mostrar su propio fragmento de origen y mantienen sus marcas cian. Las miniaturas son muestras representativas, no todos los fotogramas; acercar el timeline permite localizar intervalos más cortos. Las ondas representan picos de la fuente antes de FX, ganancia y envolventes; las miniaturas también pertenecen al original, antes de FX/PAN. El resultado procesado se sigue viendo y oyendo en el monitor.

Se utiliza una escala visual compensada para que la actividad de un audio suave siga siendo visible; no es un medidor de dB y no modifica su volumen. La onda combina los picos de los canales sin cancelar una señal estéreo en contrafase. El análisis usa audio a 48 kHz/estéreo y conserva picos en bloques de 1 ms.

La primera vez puede aparecer «Analizando audio…» o «Cargando fotogramas…». El trabajo se hace en segundo plano, para la parte visible, con caché local reutilizable. Al cambiar de vista se descarta el trabajo pendiente obsoleto. Los lienzos fuera de pantalla se liberan; los archivos originales y los .SFK no se modifican. Si falta un medio o no puede decodificarse, se muestra el estado de análisis en lugar de inventar contenido.

La generación nueva de estas vistas se aplaza mientras se está grabando micrófono, cámara o pantalla; las vistas que ya estén en caché pueden seguir mostrándose. Al finalizar, cancelar o descartar la toma se reanuda el análisis pendiente. Así la preparación visual no tiene prioridad sobre una grabación.

Se conserva el nombre legible en una cabecera pequeña y se aprovecha el alto de las pistas existente, manteniendo la distribución de la ventana. Las nuevas capas dejan pasar el ratón: mover, seleccionar, agrupar, recortar, repetir, estirar con Ctrl y ajustar fades siguen funcionando. Son ayudas visuales del editor y no se graban en el vídeo final ni se añaden como imágenes al proyecto.

El análisis y las miniaturas se regeneran a partir de los medios al abrir un LQTS; no se almacenan dentro del proyecto ni se necesitan repositorios o servicios externos. Validado con fotogramas JPEG reales, cambios de imagen, silencios y amplitudes de audio, WAV y WebM/Opus de ensayo, estéreo en contrafase, zoom, recorte, velocidad, inversión de la onda y las miniaturas, liberación fuera de pantalla, reutilización de caché y persistencia LQTS. Código local; no se ha creado ni publicado otro portable.

## Botón derecho → Invertir clip / Invertir grupo

- **Invertir clip** reproduce desde el final al principio únicamente el evento sobre el que pulsaste, aunque forme parte de un grupo. No cambia la dirección de su audio agrupado; para invertir ambos, utiliza **Invertir grupo**.
- **Invertir grupo** cambia la dirección de todos sus vídeos y audios y refleja sus posiciones dentro del intervalo del grupo. Una secuencia A–B–C pasa a C–B–A, conservando duraciones, separaciones, pistas y agrupación. Una pareja de vídeo y audio coincidente continúa sincronizada.
- Los clips invertidos muestran **⏪**. El menú ofrece **Restaurar clip hacia delante** o **Restaurar grupo hacia delante** para cambiar de nuevo la dirección. Dos inversiones de grupo recuperan su disposición original. Los subtítulos de un grupo cambian de posición con el grupo y conservan su texto legible; no tienen inversión individual de sonido/imagen.

La inversión respeta el fragmento recortado y su velocidad actual. Los ajustes de FX, PAN/Crop y fades siguen en el tiempo del evento: se procesa el medio invertido con esos ajustes. Las envolventes de pista permanecen en sus tiempos de proyecto. Se puede recortar, dividir, repetir o cambiar la velocidad del material invertido; sus rangos de origen se ajustan para mantener la dirección correcta.

La primera inversión prepara un derivado local con progreso y botón **Cancelar**. Hasta que termina no se modifican los eventos; cancelar conserva el montaje y su historial. Los clips largos necesitan tiempo de preparación y espacio de caché. El vídeo se prepara por bloques con H.264 de alta calidad, manteniendo resolución y normalizando la cadencia a su FPS nominal (máximo 120); es una recodificación, no copia sin pérdida ni conservación HDR. El audio derivado usa PCM flotante, 48 kHz, estéreo. Se mantiene el archivo original intacto y el proceso funciona offline.

LQTS guarda la dirección y las rutas originales, sin depender de rutas de caché de este ordenador: los derivados se pueden volver a preparar a partir de esos medios. La inversión se utiliza en el monitor, los editores individuales de FX/PAN, la escucha de audio y la exportación. Se deshace/rehace en una sola operación. Código local, sin nueva publicación ni portable.

Prueba funcional con vídeo rojo→azul y audio 440→880 Hz: después de invertir, píxeles azul→rojo y frecuencias 880→440 Hz comprobados en el derivado, WAV y MP4 codificado. Validación de menú contextual sobre audio agrupado, inversión del orden del grupo, segunda inversión, guardado/apertura LQTS, cancelación, recorte de ambos bordes, división, repetición, Ctrl-estiramiento y audio con ecualización animada a 2×. Regresiones de repetición, velocidad y propiedades también satisfactorias.

## Repetir un medio al estirar sus extremos

Arrastra un extremo **sin Ctrl**. Si lo encoges, recortas como antes. Si lo estiras, primero recuperas el material que había quedado fuera del recorte; al llegar al final del archivo se crea otra copia desde su principio, tantas veces como dure la extensión. La última copia puede quedar parcial. Por ejemplo, un medio de 2 segundos extendido a 5 queda como **2 + 2 + 1 segundos**, manteniendo su velocidad.

Las uniones se distinguen por una **línea vertical cian** y una etiqueta **↻ 1, ↻ 2, ↻ 3…**. Son eventos reales consecutivos, editables de forma independiente; las marcas solo pertenecen al timeline, no se incrustan en el vídeo exportado. Puedes recortar, mover, borrar o volver a extender la última copia. Cada repetición nueva conserva sus propios ajustes de FX, PAN/Crop y fades, con los puntos limitados a su duración. Los fades existentes también se copian; no se añade un fundido entre copias que simplemente se tocan.

Funciona también desde el extremo izquierdo, si hay espacio antes del evento: al sobrepasar el principio del medio se añaden sus repeticiones anteriores, incluida una primera parte parcial cuando corresponde. El inicio del proyecto permanece en cero.

Con vídeo y audio agrupados, cada repetición mantiene su pareja sincronizada y forma un grupo nuevo, separado del grupo de la copia anterior. Si sus duraciones de contenedor difieren ligeramente, se usa el final común disponible para no acumular desajustes. Se conserva la velocidad que ya tuviera el clip. **Ctrl** y **Ctrl+Alt** siguen reservados al cambio de velocidad y no generan repeticiones.

Una extensión completa se deshace de una vez y se puede rehacer. Escape/cancelación elimina las copias provisionales y recupera el historial; si arrastras hacia fuera y vuelves hacia dentro antes de soltar, desaparecen las copias sobrantes. Se respetan los límites existentes de siete días y 10 000 eventos por proyecto. LQTS guarda los eventos, sus grupos y sus marcas; reproducción y render utilizan las copias normales, sin instalar un motor de bucles ni añadir dependencias.

Validado con vídeo/audio reales de ensayo: ambos extremos, última copia parcial, recuperación de recorte antes de repetir, velocidad previa de 2×, grupos A/V independientes por repetición, deshacer/rehacer, cancelación y arrastre de vuelta. Apertura LQTS con marcas, comparación de fotogramas repetidos con FX/PAN, WAV audible de cinco segundos y MP4 codificado desde el montaje. Código local; no se ha generado ni publicado otro portable.

## Cambiar velocidad arrastrando un extremo · Ctrl / Ctrl+Alt

- **Sin modificadores:** arrastrar un extremo sigue recortando el contenido.
- **Ctrl + arrastrar un extremo:** conserva el fragmento de origen y cambia su velocidad. Estirar ralentiza; encoger acelera. Si el clip está agrupado, se aplica el mismo factor a todos los miembros: vídeo, audio asociado y otros clips del grupo.
- **Ctrl + Alt + arrastrar un extremo:** aplica el cambio únicamente al clip arrastrado. La pertenencia al grupo no se elimina, pero esta operación puede desincronizarlo deliberadamente de sus compañeros.

Mantén la combinación desde que empiezas a arrastrar. Funciona desde el extremo izquierdo y el derecho; el extremo opuesto del clip arrastrado actúa como ancla. En un grupo también se escalan las separaciones y los inicios respecto a esa ancla, para mantener sus posiciones relativas y sincronía. No afecta a otros elementos que solo estén seleccionados sin pertenecer al grupo. Ctrl en una esquina tiene prioridad sobre el tirador de fade; sin Ctrl los fades funcionan como antes.

El rango es **0,25× a 4×**, limitado por todos los miembros del grupo, una duración mínima de un fotograma a 24 fps y los límites del proyecto (inicio cero y máximo siete días). No se lee material fuera del fragmento: el inicio en el archivo y la cantidad de contenido utilizada se conservan. El audio mantiene el tono con el motor existente.

Las duraciones, las posiciones y la etiqueta de velocidad cambian durante el arrastre. Al soltar se actualiza el monitor; así no se lanzan renderizados de FX de audio por cada movimiento del ratón. Se reajustan proporcionalmente fades, puntos PAN/Crop, animaciones de FX de vídeo y audio, y tiempos de karaoke si hay subtítulos en el grupo. Las envolventes de pista permanecen en sus tiempos absolutos de proyecto. Los solapamientos y sus transiciones se recalculan.

Toda la operación se deshace con un Ctrl+Z y se rehace con Ctrl+Y. **Escape** o cancelar el arrastre restauran los valores y el historial anteriores. La velocidad y los tiempos reajustados quedan guardados en LQTS y se utilizan al reproducir y renderizar. Validado con gestos de ambos extremos, grupos A/V y clips separados temporalmente, aislamiento Ctrl+Alt, límites, recorte normal, cancelación, FX/PAN/fades, reapertura LQTS, duración y tono de WAV acelerado/ralentizado y codificación MP4 de cuatro segundos con audio asociado ralentizado. Cambio local, sin publicar ni generar un nuevo portable.

## Captura de pantalla · Toolbox y cámara simultánea (código local posterior a 0.14.1)

**Correcciones de uso:** con una captura preparada o grabando, **Cerrar panel** (también Escape) oculta únicamente el panel principal. La Toolbox, los dispositivos y la toma permanecen activos, sin preguntar por descarte ni guardar o detener. El botón **Editor** de la Toolbox recupera el mismo panel y la misma toma; también se recupera entrando de nuevo en Insertar → Capturar pantalla. Al finalizar desde la Toolbox se muestra el resultado guardado o el error pendiente. Para detener se utiliza **Finalizar** y para descartar se mantiene la acción explícita del grabador.

La Toolbox tiene ahora cabecera propia arrastrable, sin marco estándar, iconos, tarjetas, indicadores de estado y medidores integrados, manteniendo los colores y la tipografía del editor. La posición se elige en una **cuadrícula de nueve botones**, sin desplegables ni tooltips nativos: esquinas, centro superior, centro inferior, centro izquierda, centro derecha y centro de pantalla. Los textos de ayuda se dibujan dentro de la ventana protegida. Así el selector queda excluido junto con la Toolbox. Se comprobaron las nueve posiciones en los píxeles de la composición, el cierre/reapertura sin interrumpir la toma y una captura nativa de escritorio mientras se pulsaban los nueve botones, inspeccionando el PNG y todos los fotogramas decodificados del WebM. Se admite la pequeña variación de color propia de VP8 y del cursor; la cámara de ensayo es sintética.

1. En **Insertar → Capturar pantalla**, selecciona la pantalla o ventana, resolución y audios que quieres incluir. Micrófono y audio del equipo se seleccionan por separado antes de preparar la toma. El audio del equipo recoge todo el sonido del sistema, incluso si grabas una sola ventana.
2. En **Cámara simultánea**, elige **Sin cámara**, **Integrada en la pantalla** o **Archivo y pista separados**, y la entrada de cámara. Para la cámara integrada puedes elegir cualquiera de las nueve posiciones y un tamaño del 15 al 40 % del ancho de la imagen; se conserva su proporción. Estos ajustes también están en la Toolbox.
3. Pulsa **Preparar captura**. Se abre una Toolbox independiente, movible y siempre encima, que continúa visible al minimizar el editor. Su cámara de previsualización es silenciosa. **Grabar** pide el destino WebM; **Pausar / Continuar** afecta a ambas tomas y el contador descuenta las pausas. **Finalizar** guarda e importa el resultado. **Editor** muestra de nuevo el grabador sin descartar la toma.
4. Los botones de micrófono y sonido del equipo silencian cada entrada de forma independiente; los medidores reflejan la señal que pasa a la mezcla. Solo están disponibles las entradas habilitadas antes de preparar. El botón de cámara apaga su salida: desaparece del vídeo integrado o produce negro en el archivo separado; se mantiene su duración para no perder sincronía. Para cambiar de dispositivo o modo, desconecta y prepara de nuevo.
5. **Snapshot PNG…** captura el fotograma actual sin la Toolbox y pide dónde guardarlo. Con cámara integrada incluye su composición. Añade la imagen a la biblioteca, sin crear un evento en las pistas. PNG sin pérdida, hasta 3840 × 2160; fuentes mayores se reducen proporcionalmente.
6. En modo separado se guardan `Nombre.webm` y `Nombre_camara.webm`. La cámara no duplica el audio: este queda en la toma principal. Al insertar automáticamente se crean pistas de pantalla, audio si se pidió, y cámara; quedan agrupadas y sincronizadas, con la cámara debajo de la pantalla para no taparla. Puedes desagrupar y editar después. Se conserva el pequeño desfase de arranque de los grabadores al colocar los eventos. La inserción completa se deshace de una vez y se guarda en LQTS.

La Toolbox se excluye mediante protección de ventana de Windows. Se ha verificado en este equipo con una captura real de escritorio, tanto en un PNG como en los píxeles de un WebM codificado, mientras la Toolbox seguía visible y encima. La exclusión completa requiere Windows 10 versión 2004 o posterior / Windows 11; sistemas anteriores pueden mostrar un rectángulo negro. No se garantiza ocultarla a cámaras físicas ni a programas externos que eludan la protección del sistema. El editor y los diálogos de guardar no están protegidos: si están en la pantalla elegida pueden grabarse.

Pantalla, cámara y micrófono se liberan al finalizar, desconectar, cancelar el destino o descartar. La pausa conserva los dispositivos preparados. No se sobrescriben archivos; si al guardar dos tomas falla la cámara después de guardar la pantalla, se conserva la pantalla y **Guardar en otra ruta…** reintenta únicamente la cámara pendiente. Descartar no elimina un archivo ya guardado. Todo funciona offline con los motores existentes; no añade descargas ni dependencias.

Validación: controles reales de la Toolbox, posición/tamaño/encendido de cámara, snapshots, pausa conjunta, tonos sintéticos decodificados para comprobar los dos mutes, dos WebM con diferencia de duración inferior a 150 ms en la prueba, agrupación, un solo deshacer y apertura LQTS. Prueba de fallo parcial y reintento sin sobrescritura. La prueba de escritorio cubre previamente todo el monitor con una ventana de ensayo propia, evitando capturar contenido personal. Los ZIP y releases históricos no se han modificado.

## Portable 0.14.1 — apertura desde el Explorador corregida

Esta entrega incorpora las correcciones locales de apertura descritas bajo 0.14.0. Extraer todo el ZIP nuevo y abrir **LQTAC Studio.exe** una vez para registrar las rutas de esta carpeta; después los .LQTS se abren con doble clic. El EXE visible es un lanzador propio con icono, que inicia el motor interno electron.exe con el directorio del editor antes del documento. Se aceptan también comandos antiguos de Windows que pasen solo el proyecto. No separar el lanzador del motor ni de resources.

Se incluyen las entradas de asociación del tipo de proyecto y de Abrir con para el ejecutable, con actualización de rutas propias y preservación de elecciones ajenas. La asociación no modifica UserChoice ni su hash. Para Windows 10/11 se utiliza .NET Framework del sistema en el lanzador; no hay descarga, instalación de motores ni conexión durante el uso. Las demás funciones de 0.14.0 y ambos motores ASR se conservan.

El ZIP 0.14.0 publicado se conserva intacto. Las notas históricas que indican corrección local pendiente de empaquetar quedan incorporadas en 0.14.1.

## Portable 0.14.0

Corrección adicional validada por doble clic literal en el Explorador: algunas sesiones de Windows conservan un comando antiguo EXE + documento aunque ShellExecute use el registro actualizado. Se añade un lanzador propio que siempre dirige el archivo al editor y evita que el motor intente ejecutarlo como JavaScript. El BAT mantiene arranque directo y el próximo empaquetado conserva electron.exe como motor interno junto al lanzador LQTAC Studio.exe. La carpeta principal y el portable extraído están corregidos; el ZIP publicado sigue sin alterarse. Se comprueba visualmente el proyecto del usuario tras doble clic en el Explorador, con 4 medios, 3 pistas y 5 eventos.

Corrección local posterior a esta publicación: la apertura por doble clic del portable necesita indicar tanto el directorio de la aplicación como el archivo .LQTS. Se corrigen el código principal y la carpeta extraída local de 0.14.0 y se repara su asociación. El ZIP histórico de GitHub conserva los bytes publicados; todavía no contiene esta corrección. Abrir el programa corregido una vez para reparar el comando en otros equipos. La nueva prueba usa procesos reales del ejecutable con estructura portable, no solo simulación de argumentos.

Prueba manual real del 24/10/2026: se cierra el aviso residual de la apertura fallida anterior y se abre Prueba projectLQTS.LQTS mediante la asociación de Windows. Se comprueba visualmente la ventana del portable con el nombre de archivo en el título, proyecto Demo reel · 01, cuatro medios y tres pistas con sus cinco eventos, además de imagen en el monitor. Apertura correcta, sin guardar ni modificar el documento; se deja abierto.

Empaquetado solicitado del estado actual: motores Faster Whisper INT8 y whisper.cpp offline; grabación de micrófono, cámara y pantalla/ventana con audio opcional; menús Archivo/Insertar/Herramientas, editores FX y exportación PNG/GIF; icono propio, asociación .LQTS y apertura en la ventana existente; corrección de arranque del BAT. Todas las secciones que siguen marcadas como posteriores a 0.13.0 forman parte de 0.14.0. Se conservan límites y pruebas de hardware descritos; el empaquetado no convierte las pruebas de sonido simulado en una validación del loopback real.

Extraer todo el ZIP en una carpeta y abrir **LQTAC Studio.exe**. FFmpeg, iconos, ambos motores/modelos de voz y licencias están incluidos. No se necesita conexión, acceso al repositorio ni instalar dependencias para editar/capturar/renderizar/transcribir. Los proyectos y medios del usuario se guardan aparte; no se incluyen medios personales en el portable.

## Icono y apertura desde Windows — cambio local posterior a 0.13.0

Corrección de arranque: el BAT abre directamente el motor con icono si ya está preparado. No calcula hashes del EXE ni ejecuta PowerShell en cada lanzamiento; la preparación solo se ejecuta cuando falta la copia con icono. La comprobación de asociación se inicia después de cargar la interfaz y no bloquea su aparición. Si falla preparar el icono, se abre el motor original disponible con el icono de ventana de LQTAC.

Se utiliza la imagen proporcionada por el usuario como icono del programa y de los proyectos **.LQTS**. El formato del proyecto conserva su extensión y estructura. La imagen original se guarda sin redibujar y se convierte a ICO con tamaños de 16, 24, 32, 48, 64, 128 y 256 píxeles; el ejecutable y la ventana utilizan este icono.

En la carpeta de desarrollo abrir **LQTAC Video.bat**: prepara el motor con icono propio y lo ejecuta con el editor. El ejecutable interno del motor no es el programa completo por sí solo. El próximo portable incorporará el icono en su LQTAC Studio.exe; no se ha generado todavía un paquete nuevo.

Al arrancar el programa o abrir un proyecto, se comprueba la asociación de .LQTS para el usuario actual. Si no existe un programa asociado, se registra LQTAC Studio, su icono y el comando de apertura. No requiere permisos de administrador. Si ya hay otro programa elegido se conserva; LQTAC queda disponible como alternativa en Abrir con. No se cambia la asociación de MP4, WAV, imágenes u otros tipos compartidos.

Un doble clic en un .LQTS puede iniciar el programa con ese proyecto. Si ya está abierto, se utiliza la misma ventana y se ofrece Guardar, No guardar o Cancelar antes de sustituir el proyecto. Cancelar conserva el montaje actual; un archivo inválido no lo sustituye. Si hay un editor modal, grabación o render en curso, se informa de que hay que finalizarlo primero. Las referencias de medios y sus avisos se mantienen.

Si se mueve la carpeta del programa, abrir de nuevo su BAT/EXE desde la nueva ubicación para actualizar las rutas propias de Windows. No se modifican elecciones explícitas de otro programa. Los iconos pueden requerir actualizar la vista del Explorador si conserva una imagen anterior en caché.

Validado en este equipo: registro real por usuario para .LQTS, icono extraído por Windows tanto del EXE como de un proyecto, ejecutable modificado arrancable, apertura inicial con rutas Unicode/espacios y recepción de apertura en la misma ventana; cancelar, guardar antes de cambiar y rechazar archivo inválido. Las asociaciones ajenas y la actualización de rutas se prueban en claves de registro aisladas, que se eliminan al terminar. Nuevos proyectos y menús/exportaciones mantienen sus pruebas aprobadas.

## Organización de menús y exportaciones — cambio local posterior a 0.13.0

**Archivo:** Nuevo proyecto, Abrir LQTS, Abrir VEGAS, Guardar, Guardar como, submenú **Exportar** (Fotograma PNG, Proyecto GIF animado, Subtítulos SRT) y Renderizar vídeo/audio. Se conservan Ctrl+N/O/S y Ctrl+Mayús+S y los flujos de confirmación de proyecto existentes.

**Insertar** tiene tres grupos separados:

- Biblioteca del proyecto: Insertar vídeo, audio o imagen. Cada entrada abre un selector filtrado por ese tipo y solo añade los archivos a la biblioteca; no crea eventos ni pistas. Admite selección múltiple y Deshacer/Rehacer de la importación.
- Crear pistas: pista de audio, de vídeo o de subtítulos, siempre vacías.
- Generar medios: Grabar audio, Grabar vídeo con cámara y Capturar pantalla/ventana. Estos accesos se retiran de Archivo y del lateral para despejar la navegación. Sus diálogos y comportamiento siguen siendo los ya implementados.

**Herramientas:** Separar clip (S), Efectos de vídeo con listado desplegable (incluye Pan/Crop y filtros creativos), Efectos de audio con listado desplegable y Subtítulos (generar, editar selección, añadir bloque manual, importar SRT y abrir panel). Cada filtro abre su editor individual actual. Los filtros aparecen deshabilitados si no hay un evento seleccionado del tipo correspondiente. Los accesos laterales FX/Subtítulos se conservan como atajos.

Los desplegables respetan colores y tipografías existentes, separan grupos y ajustan su posición al área visible. Se abren con clic o teclado; flechas arriba/abajo, Inicio/Fin, derecha/izquierda para submenús y Escape para volver/cerrar. Clic exterior y cambio de tamaño cierran los menús. Editar conserva Copiar/Pegar y Deshacer/Rehacer.

**Exportar fotograma:** guarda la composición completa en la posición del cabezal, con capas, FX, transparencias y subtítulos visibles, como PNG sin pérdida en 720p, Full HD o 4K. La resolución es de salida: ampliar una fuente pequeña no añade detalle. Conserva el cabezal y no modifica los medios. Si el nombre ya existe, elegir uno nuevo; no se sobrescribe.

**Exportar GIF:** abre Renderizar con GIF, 640 × 360 y 15 fps como valores iniciales; permite otras resoluciones/fps. Usa todo el proyecto y el mismo compositor que el vídeo, sin audio, en bucle infinito y con paleta de hasta 256 colores por fotograma. Para tamaño/tiempo razonables convienen montajes cortos y resolución/fps moderados. No se añade selección de un rango de exportación en esta fase. El render normal MP4/WebM y los formatos de audio se conservan.

Validación: verify-menus comprueba menús/teclado, disponibilidad contextual, selectores nativos por tipo, biblioteca sin inserción automática, pistas vacías, editores de vídeo/audio reales, división agrupada y undo, exportación PNG 3840 × 2160 y GIF real decodificado sin audio. Nuevos proyectos, proyecto/renderizado y layout se comprueban como regresión. Cambios en código principal; sin nuevo portable ni publicación.

## Captura de pantalla o ventana — cambio local posterior a 0.13.0

Disponible en el lateral **Grabar pantalla** y en **Archivo → Grabar pantalla o ventana…**. Selecciona una pantalla completa o una ventana de la lista; **Actualizar entradas** renueva las fuentes disponibles. No se inicia la captura al abrir el diálogo. **Preparar captura** activa una vista previa silenciosa de la fuente elegida. Desde ese momento se comparte la imagen con el grabador local, aunque todavía no se escribe una toma.

El audio está desactivado por defecto. Puedes marcar **Grabar también micrófono**, **Grabar audio del sistema**, ambos o ninguno. Al capturar una ventana, el audio del sistema es TODO lo que suena en el equipo, no solo esa aplicación. Si se eligen ambos, se mezclan a media ganancia por entrada en una sola pista de audio; no quedan disponibles por separado. Si Windows no entrega el audio del sistema solicitado, se informa del fallo y se liberan las fuentes, sin grabar silenciosamente una toma incompleta.

Selecciona posición e inserción automática y pulsa **Grabar vídeo…** para elegir un WebM nuevo. **Detener y guardar** libera pantalla/micrófono/audio, finaliza la toma y la añade a la biblioteca. Con inserción se crean pistas nuevas de vídeo y, si hay sonido, audio agrupado con la misma posición y duración real. Sin sonido se crea solo vídeo. Se mantienen la vista previa de la toma, inserción manual posterior, Deshacer/Rehacer, guardado LQTS y exportación del proyecto a MP4. No se sobrescriben grabaciones existentes. Cancelar el destino, desconectar, cerrar o descartar libera las fuentes; un fallo de guardado conserva la toma para intentar otra ruta.

Puedes minimizar LQTAC mientras graba y regresar para **Detener y guardar**. Si seleccionas la pantalla donde está LQTAC, se verá el editor; su propia vista previa puede crear una imagen repetida. Seleccionar otra ventana evita esa repetición. La calidad solicitada limita la altura orientativa a 480/720/1080 y pide hasta 30 fps; se conserva la proporción de la fuente y se indica resolución/fps reales. Algunas ventanas minimizadas, contenido protegido o superficies no capturables pueden mostrar negro/congelarse. Cambiar de fuente exige desconectar y preparar de nuevo.

Todo funciona offline con Electron/FFmpeg incluidos. Comparte los límites de cámara: WebM VP8/Opus comprimido, una toma hasta dos horas u 8 GiB, sin pausa, selección de región, webcam superpuesta ni recuperación garantizada tras cierre forzado. La reproducción del proyecto se detiene durante el grabador. No hay un control flotante de parada; regresar al diálogo para detener.

Validación: captura nativa de una ventana de prueba propia, píxeles no negros, WebM decodificado/reproducido, duración/posición reales, historial, LQTS y cancelación; mezcla de dos tonos sintéticos (sistema/micrófono), confirmados en el audio decodificado, y liberación de fuentes. Se comprueba selección obligatoria de un solo uso, marco local exacto y rechazo de ventanas desaparecidas. Cámara y micrófono mantienen sus pruebas aprobadas. El audio loopback real del equipo queda pendiente de prueba del usuario; no se grabó el sonido personal del sistema durante las pruebas. Código principal actualizado, sin nuevo portable ni publicación.

## Grabación de cámara — cambio local posterior a 0.13.0

El usuario ha probado y validado la grabación de micrófono anterior. Ahora se añade **Grabar vídeo**, en el lateral y en **Archivo → Grabar vídeo desde cámara…**.

1. Selecciona cámara, calidad solicitada (480p, 720p o 1080p a 30 fps) y, opcionalmente, micrófono. Desmarca **Grabar también micrófono** para capturar solo vídeo.
2. Pulsa **Activar cámara** y acepta el permiso local. Abrir el diálogo no activa dispositivos. La vista previa es silenciosa; el indicador informa de resolución y fps reales. La cámara puede entregar una calidad distinta de la solicitada.
3. Elige la posición de inserción. **Grabar vídeo…** solicita un archivo nuevo `.webm` antes de empezar. Se graba vídeo VP8 y, si está habilitado, audio Opus en el mismo contenedor. Todo funciona localmente y offline.
4. **Detener y guardar** finaliza el archivo, libera cámara/micrófono y añade la toma a la biblioteca. Con inserción automática se crean pistas nuevas: vídeo y, cuando existe, audio separado con la misma duración y posición, agrupados para editar sincronizados. Sin audio se crea solo vídeo. También se puede insertar después con **Insertar toma guardada**.
5. La vista previa de la toma guardada permite reproducir, escuchar y desplazarse. Desde el proyecto puede exportarse a MP4 con el render habitual. Un paso de Deshacer retira la importación/inserción; no elimina el archivo grabado.

Cancelar la elección de destino o descartar libera los dispositivos. No se sobrescriben archivos existentes; si falla el destino, se conserva la toma temporal para **Guardar en otra ruta…**. Cerrar el programa con una toma pendiente requiere volver al grabador o descartarla explícitamente. Cerrar el diálogo mientras solo hay vista previa desconecta los dispositivos.

Límites: una cámara, micrófono opcional, hasta dos horas u 8 GB; no hay pausa, grabación del proyecto mientras reproduce, audio del sistema, captura de pantalla, captura multicámara ni recuperación garantizada de tomas temporales tras un cierre forzado. WebM utiliza compresión con pérdida. La grabación WAV independiente mantiene su formato PCM sin pérdida. El proyecto se pausa al abrir el grabador. Las pruebas automatizadas utilizan dispositivos generados por Chromium: guardado, decodificación FFmpeg, reproducción/seek, agrupación, duración, historial, LQTS, cancelación, descarte, permisos denegados y reintento de guardado. Pendiente validación con cámara física del usuario. Código principal actualizado; no se ha generado ni publicado otro portable.

## Subtítulos locales y reorganización de paneles — 0.11.0

### Generar y editar

1. Abrir «Subtítulos» en la columna izquierda y pulsar «Generar subtítulos».
2. Elegir un evento de audio o una pista de audio completa e idioma (español o detección automática, entre otros). Si se seleccionó un evento de audio, aparece preseleccionado. En vídeo con audio separado, elegir su evento de audio. Para voz con música es preferible una pista de voz aislada.
3. El programa prepara el audio y ejecuta Whisper small multilingüe en CPU, localmente. Se respetan offsets, velocidades, FX y ganancias/envolventes de la fuente elegida. Se analizan los eventos elegidos aunque su mute esté activado. Límite de cuatro horas por operación. El montaje queda bloqueado durante el trabajo y se permite cancelar.
4. Al terminar se añade una pista S de subtítulos, sin reemplazar las anteriores ni tocar los medios originales. Cada frase es un bloque independiente. Si se cancela o falla no se añade una pista parcial. La transcripción puede tardar; no se promete tiempo real.
5. Doble clic en un bloque para corregir texto, inicio, duración, fuente, tamaño, color, contorno y posición X/Y. Arrastrar mueve el bloque; sus extremos recortan/extienden duración. S divide copiando el texto en las dos partes, no redistribuye automáticamente sus palabras. Ctrl+C/V, Suprimir, grupos y deshacer/rehacer conservan texto y estilo. «Añadir subtítulo» añade un bloque manual en la primera pista de subtítulos existente o crea una si no hay; «＋ Pista» permite otra pista S vacía.

Los estilos se aplican por bloque; el tamaño se expresa respecto a 720p y escala con la salida. Se ajustan líneas de texto al ancho del vídeo. No hay karaoke palabra a palabra, identificación de hablantes ni alineación forzada de letras cantadas. Música, silencios, ruido y voces solapadas pueden causar errores o texto inventado: revisar siempre texto y tiempos. Los subtítulos no siguen automáticamente ediciones posteriores de la pista de audio original; recolocarlos o regenerar cuando cambie el montaje. Varias pistas/bloques en la misma posición pueden superponerse.

### Guardar y exportar

Los bloques y estilos se guardan dentro de LQTS sin un medio externo ficticio. Abrir estos proyectos con 0.11.0 o posterior; las versiones anteriores no admiten el tipo de pista nuevo. Los proyectos AV anteriores siguen abriendo con valores neutros.

«Importar SRT» crea una pista nueva y «Exportar SRT» guarda los bloques habilitados, ordenados por tiempo. SRT conserva texto y tiempos (milisegundos), no colores, tipografía, contorno ni posición. El editor no interpreta etiquetas HTML/ASS como formato de texto. Para exportar vídeo, «Incrustar subtítulos en el vídeo» está activado por defecto; desactivarlo genera vídeo limpio sin alterar la vista previa ni los bloques guardados. Los subtítulos habilitados aparecen sobre la composición completa, también cuando no hay un vídeo activo. Se elimina la marca decorativa y el tiempo ficticio que quedaban sobre el monitor para no interferir con la previsualización real.

### Motor offline

Whisper.cpp v1.9.2 Windows x64 CPU y ggml-small.bin multilingüe (~466 MiB) están instalados en desktop/speech. No se usa API, cuenta ni conexión durante la transcripción; Python/CUDA no son requisitos del usuario. Para preparar un equipo de desarrollo desde Git: tools/setup-whisper.ps1 descarga las versiones fijadas y comprueba SHA-256; esa preparación requiere Internet. Los binarios/modelo no se guardan en Git; se empaquetan con el portable y se incluyen licencias MIT. La compilación del portable exige el modelo local; no produce silenciosamente un paquete sin motor de voz. Los temporales de audio/transcripción se eliminan al terminar o cancelar normalmente; un cierre forzado del proceso puede dejarlos en Temp.

### Paneles y validación

Pan/Crop y los ajustes generales de efectos están ahora en FX. El inspector derecho muestra el evento seleccionado en la timeline y sus propiedades; seleccionar una tarjeta de biblioteca ya no sustituye esa información. Se retiran los botones de maqueta Transcribir/Auto ducking/Subtítulos y las afirmaciones de Qbit. Los subtítulos funcionales tienen su panel propio accesible también en ventanas donde el inspector se oculta. La información y el informe de compatibilidad VEGAS pasan al panel «Proyecto»; no se amplía el alcance del puente.

verify-subtitles.cjs comprueba pista de texto, estilo/tiempos, copiar/dividir, historial, LQTS sin medios faltantes, SRT mediante IPC, captura con/sin subtítulos y un MP4 codificado y decodificado con texto visible. Con un WAV de prueba adicional, ejecuta el flujo real desde UI/IPC a Whisper y comprueba cancelación sin pista parcial. Se ha probado con voz española sintetizada por Helena de Windows y con una muestra inglesa de referencia: ambas reconocidas localmente con tiempos de proyecto. No constituye certificación de precisión con material del usuario. Las regresiones de proyectos, propiedades y puente VEGAS han pasado. Aceptación visual/auditiva del usuario pendiente; cambios solo en carpeta principal, portable publicado 0.10.1 sin modificar.

## Empaquetado solicitado — 0.10.1

Se prepara portable Windows x64 de 0.10.1, incluyendo FX creativos, Pan/Crop visual, selección/arrastre/borrado de puntos y movimiento de cámara con Mayús. Esta publicación agrupa cambios que las secciones históricas siguientes describían como locales. Incluye Electron, FFmpeg, assets, Shapes y manual; no necesita Node ni conexión para editar/renderizar. La conversión inicial de un VEG sigue requiriendo VEGAS Pro instalado cuando no hay un puente válido. El código y los portables históricos se conservan en GitHub. El paquete no incluye medios ni proyectos personales.

## Pan/Crop · Mayús para movimiento recto

Mantener Mayús al arrastrar el interior de la cámara bloquea el movimiento en horizontal o vertical según la dirección inicial. Un pequeño umbral evita que un temblor del ratón elija el eje; una vez elegido se conserva hasta soltar Mayús, aunque el ratón cambie de dirección. El eje se refiere a la imagen del escritorio, incluso con la cámara rotada. Soltar Mayús recupera el movimiento libre sin saltos; también se puede pulsar a mitad de un arrastre, tomando como origen la última posición. No modifica los tiradores de zoom ni la casilla de proporción. Se añade ayuda en el escritorio. verify-pan-crop-editor.cjs comprueba ambos ejes, cambio de dirección, cámara rotada y pulsación/liberación durante el arrastre, además de preview/export e historial. Cambio solo en carpeta principal, sin nuevo portable.

## Seleccionar, mover y eliminar puntos — corrección local 0.10.1

Pan/Crop: pulsar un diamante o elegir su fila para seleccionarlo. Arrastrar el diamante lo mueve en el tiempo, conservando el encuadre. También se puede escribir un segundo exacto en «Tiempo del punto seleccionado» y pulsar «Mover punto». Se permite pasar por delante/detrás de otros fotogramas, pero no colocar dos exactamente en el mismo instante. El borrado funciona desde «Eliminar fotograma», Suprimir/Retroceso (fuera de campos de texto) o botón derecho sobre el diamante → Eliminar punto. Se puede borrar incluso el último; sin fotogramas vuelve el encuadre neutro.

FX de vídeo y audio: mismo borrado con botón, Suprimir o menú contextual, selección desde curva/lista y campo de tiempo exacto. El arrastre de la curva permite cambiar tiempo y valor, incluso cruzar otros puntos manteniendo la curva ordenada. En el ecualizador se respeta la banda seleccionada. El borrado trabaja con el punto seleccionado, no exige acertar con el deslizador en una fracción exacta de segundo. Quitar el último punto desactiva esa curva y deja el valor estático del parámetro. Los cambios de audio invalidan la escucha preparada y requieren volver a prepararla.

Envolventes de pista: sus nodos siguen permitiendo arrastre horizontal/vertical; ahora botón derecho sobre un nodo ofrece Eliminar punto, y Suprimir elimina el nodo seleccionado sin borrar los clips. Borrar extremos no los vuelve a crear automáticamente. Sin nodos la envolvente queda neutra (100 %); la línea continúa disponible para añadir nuevos puntos con botón derecho. El guardado conserva envolventes vacías. El historial permite recuperar borrados de pista; en los editores de clip, Aplicar guarda el borrador como una operación y Cancelar lo descarta.

verify-keyframe-controls.cjs reproduce arrastre de diamante Pan/Crop, tiempos fraccionarios, retiming entre puntos, menú contextual, borrado por botón/teclado, eliminación del último punto, seguridad de los clips, historial y persistencia de envolvente vacía. Regresiones de editores FX/Pan-Crop y proyecto superadas. Cambios en carpeta principal; portable publicado sin actualizar.

## Pan/Crop visual con línea de tiempo — local 0.10.0

Seleccionar un evento de vídeo y pulsar «Pan/Crop · editor visual» en el inspector, o hacer doble clic en el evento de vídeo. Los eventos de audio siguen abriendo sus propiedades. El editor conserva un borrador independiente y reproduce el vídeo silenciado sin desplazar el cabezal del proyecto.

El escritorio muestra la fuente con una cámara rectangular y cuatro tiradores. Arrastrar el interior mueve el centro; arrastrar una esquina redimensiona manteniendo fija la esquina opuesta, también con rotación. Un encuadre menor acerca la imagen; mayor la aleja. «Mantener proporción» vincula ancho y alto. El zoom del escritorio solo cambia la escala de trabajo, nunca el clip. «Ajustes numéricos y rotación» permite introducir centro X/Y, tamaño proporcional a la fuente y ángulo.

Selector de formato: original, 4:3, 16:9, 15:9, 21:9, 1:1 y 9:16. Elegir un formato ajusta el alto conservando el ancho y activa el bloqueo. La proporción se calcula en píxeles reales del medio, no comparando simplemente ancho y alto normalizados. El selector refleja el encuadre interpolado; aparece Personalizado cuando no coincide con un preset. No cambia el formato/resolución del proyecto: si difiere, quedan bandas en el resultado. Los formatos/bloqueo son ayudas del editor; se guardan las dimensiones reales de cada fotograma, no una preferencia global.

Cada cambio de encuadre añade/actualiza un fotograma en el tiempo actual. Para movimiento: fijar el encuadre inicial en 0 s, avanzar en la línea de tiempo y mover/redimensionar la cámara. Interpolación lineal de centro, tamaño y rotación. Añadir/actualizar, seleccionar desde los diamantes/lista, eliminar y restablecer están disponibles. Un primer cambio después de cero crea además una posición neutra en cero si antes no había fotogramas. Cancelar o Escape descarta el borrador; Aplicar lo registra como una operación de historial.

La previsualización pequeña incluye FX y usa el mismo compositor Pan/Crop que la exportación. Se respetan offset y velocidad de la fuente. LQTS, undo/redo, copia y continuidad de recorte/división usan el esquema existente panCrop. Se conservan los controles numéricos antiguos en propiedades. El editor no mezcla audio ni otras pistas; las zonas sin material pueden quedar negras. No se añaden máscaras Bézier ni interpolación de cámara avanzada.

verify-pan-crop-editor.cjs prueba formatos y bloqueo, anclaje al redimensionar, desplazamiento de cámara, modo libre, interpolación, offset y velocidad, aislamiento del borrador, coincidencia de píxeles entre preview/exportación, historial, cancelar, división y guardado/reapertura LQTS. Aceptación visual del usuario pendiente. Cambios solo en carpeta principal; sin nuevo portable ni publicación de esta entrega.

## Fase 2 · efectos creativos de vídeo — local 0.9.0

En FX → Vídeo aparecen TV antigua / CRT, VHS, Glitch / separación RGB, Glow / resplandor, Bloom / expansión de luces y Película antigua. Seleccionar un evento de vídeo, abrir la tarjeta y subir Intensidad (cero deja ese filtro neutro). Se pueden combinar. Cada tarjeta tiene editor individual, comparación con original y curva por parámetro; Aplicar confirma, Cancelar descarta. También están en el formulario general del inspector.

- TV / CRT: intensidad, curvatura y líneas de barrido; añade oscurecimiento de bordes y parpadeo.
- VHS: intensidad y ruido de cinta; ondulación horizontal, banda de tracking y separación de color.
- Glitch: intensidad y velocidad; desplazamientos por franjas y separación RGB.
- Glow: intensidad, radio y umbral; resplandor con mezcla tipo pantalla.
- Bloom: intensidad, radio y umbral; suma de halos luminosos en dos escalas.
- Película antigua: intensidad, grano y arañazos; tono cálido desaturado y variaciones luminosas.

Todos sus parámetros numéricos admiten animación, guardado LQTS, copia, recorte/división e historial. Vista previa y fotogramas de exportación usan el mismo shader y tiempo local del evento. Los patrones temporales son deterministas al repetir el mismo tiempo; no dependen del reloj del sistema. Después de dividir/recortar, la fase procedural se reinicia con el tiempo local del nuevo fragmento, aunque las curvas conservan sus valores de frontera.

Implementaciones originales WebGL, integradas y offline, no plugins de VEGAS ni réplicas físicas de equipos. Glow/bloom son halos de muestreo limitado, no desenfoques Gaussianos multipaso; radios en píxeles de fuente. Orden fijo: distorsión espacial y separación RGB → correcciones de color/LUT → glow/bloom → textura CRT/VHS/película → viñeta/croma. No se anima el orden de filtros. No añaden ruido de audio ni emulan sonido de cinta. Pueden aumentar el coste GPU en fuentes grandes; no se certifica reproducción 4K en tiempo real.

verify-creative-effects.cjs comprueba cambios de píxeles para los seis filtros, neutralidad con intensidad cero, repetibilidad, evolución temporal, alfa, seis editores, formulario general, animación, historial, exportación repetible y guardado/reapertura LQTS. Regresión previa verify-effects.cjs superada. Aceptación visual del usuario pendiente. Esta entrega modifica la carpeta principal; no actualiza por sí sola el portable 0.8.1 ni GitHub.

## Nombre del catálogo de efectos

El botón lateral «Video FX» pasa a llamarse «FX», ya que reúne vídeo y audio. Se actualiza también el controlador de apertura y sus pruebas para conservar el funcionamiento del catálogo. El usuario confirma que los efectos de fase 1 funcionan y propone avanzar a fase 2; todavía no hay una lista cerrada de efectos avanzados acordada. Las secciones históricas siguientes conservan los nombres y límites de cada entrega; las actualizaciones más recientes prevalecen.

## Conservación de versiones — regla desde 23/10/2026

GitHub conserva todas las versiones publicadas, con código y portables. Localmente solo se mantienen las tres versiones más recientes (carpeta y ZIP por versión). Antes de eliminar versiones antiguas se verifica su respaldo remoto; nunca se eliminan proyectos, medios personales ni la carpeta principal de desarrollo como parte de esta limpieza. La regla también figura en AGENTS.md para futuras sesiones.

## Ecualizador con tres curvas simultáneas — 0.8.1

Graves en naranja, medios en cian y agudos en violeta, visibles juntos sobre la misma escala de −18 a +18 dB. Pulsar una curva o uno de sus puntos selecciona su banda para editarla; arrastrar modifica solo esa banda. La leyenda permite elegir la banda cuando las curvas coinciden. La curva activa tiene mayor grosor y las otras usan trazos diferenciados. Los campos numéricos llevan el color correspondiente. Se conservan los controles de animación y la preparación de escucha de 0.8.0; cada banda conserva sus puntos independientes.

## Editor individual de audio y automatización — 0.8.0

El usuario da por válido el editor individual de efectos de vídeo de 0.7.0 («funcionan de lujo», 23/10/2026). Se incorpora ahora su equivalente para audio; su aceptación auditiva queda pendiente.

Seleccionar un evento de audio y abrir su efecto desde FX. La ventana muestra solo los controles del filtro, la forma de onda, escucha independiente y una línea de tiempo relativa al clip. Elegir un parámetro, marcar «Animar este parámetro» y añadir puntos en los tiempos deseados; los puntos se pueden arrastrar o eliminar. La interpolación es lineal. «Preparar escucha» procesa el borrador; «Escuchar clip» permite oírlo y comparar con el original sin filtros. Tras editar hay que preparar de nuevo. «Aplicar al clip» confirma los cambios; Cancelar los descarta.

Se pueden animar graves, medios, agudos, umbral y ratio del compresor, techo del limitador, reducción de ruido, objetivo de sonoridad, retardo y mezcla del eco e intensidad de reverberación. Activar/desactivar cada filtro es fijo, no un parámetro animado. La escucha del editor es del evento antes de las ganancias y envolventes de pista, no de la mezcla completa.

El proyecto y la exportación reutilizan el mismo audio procesado. Los puntos se guardan en LQTS, copiar/pegar e historial; recortar y dividir conserva los valores interpolados en los límites. No se modifican los medios originales. Todo funciona localmente con FFmpeg incluido.

Límites: no hay procesamiento DSP interactivo mientras se arrastra. El audio animado se prepara sobre el fragmento a su velocidad de reproducción; el modo estático procesa la fuente completa antes del recorte, por lo que el estado inicial de los filtros puede diferir. Al cortar se conservan las curvas, no la memoria interna ni colas de los procesadores. Variar el retardo del eco puede cambiar el tono. La sonoridad animada combina normalización inicial y ganancia variable, no garantiza un LUFS instantáneo constante. Los comandos se actualizan en bloques, con latencia adicional propia de algunos filtros.

Validación técnica: verify-audio-animation.cjs mide una rampa de EQ y decodifica filtros animados. verify-audio-editor.cjs comprueba edición, escucha preparada, búsqueda temporal, reproducción del proyecto, exportación medida con inicio desplazado y velocidad 1,5×, persistencia LQTS, historial, división y copia.

## Efectos básicos por clip — 0.6.0

### Editor individual y animación de filtros — 0.7.0

En Video FX, selecciona un clip y pulsa una tarjeta. El editor muestra solo ese filtro, una vista previa del clip (no del proyecto completo), reproducción individual, comparación con el original y una línea de tiempo que empieza en cero y termina en la duración del evento. Los cambios son un borrador hasta **Aplicar al clip**; Cancelar o Escape los descarta. El tiempo del proyecto no se mueve al explorar la vista previa. El vídeo se previsualiza silenciado; el audio del grupo no se mezcla en esta ventana.

Para cambiar progresivamente de color a blanco y negro: abre **Saturación**, activa **Animar este parámetro**, deja valor 1 en 0 s, mueve el cursor al final y escribe 0. Puedes añadir puntos intermedios para mantener color hasta un instante concreto y empezar entonces el cambio. Entre puntos se interpola linealmente; antes/después se mantiene el valor extremo. El valor está expresado como multiplicador: 1 = original, 0 = blanco y negro, 2 = saturación doble.

La lista permite seleccionar puntos; Añadir/actualizar los crea en el tiempo actual y Eliminar quita el punto de ese instante. También puedes pulsar en la curva para crear un punto o arrastrar un punto existente en tiempo y valor. Para Brillo/Contraste o Croma, el desplegable permite elegir qué parámetro representa la curva. Se pueden animar brillo, contraste, saturación, temperatura, blur, enfoque, viñeta, tolerancia y suavidad de croma. La casilla/color del croma y la tabla LUT son fijos en esta entrega.

Las curvas se guardan con el evento en `.LQTS`, y se evalúan igual en vista previa y exportación. Copiar/pegar las conserva. Dividir y recortar ajusta los tiempos de sus puntos e interpola valores en los límites para evitar saltos. Deshacer/rehacer recupera el ajuste como una operación. Los tiempos son relativos al clip, no a la fuente ni al proyecto; cambiar velocidad no comprime automáticamente la curva.

Audio: las tarjetas abren solo sus controles y una escucha individual con **Preparar escucha**, botón de reproducción y desplazamiento dentro del clip. Tras modificar valores, prepara de nuevo el audio. La automatización temporal de filtros de audio sigue pendiente; sus ajustes son constantes. La escucha previa es anterior a ganancias/envolventes de pista y a la mezcla final. El editor general de todos los efectos sigue accesible desde el inspector.

Prueba `verify-effect-editor.cjs`: editor individual, previsualización propia, interpolación 1→0, fotogramas exportados color/gris, persistencia en disco, historial, copia y continuidad al dividir/recortar. Pendiente de aceptación visual del usuario. Guardar con versiones previas puede perder o rechazar estos parámetros; usar 0.7.0 o posterior para proyectos animados.

**Corrección 0.6.1:** Video FX sustituye la biblioteca central por un catálogo de efectos de vídeo y audio, incluso sin selección. Una tarjeta abre la configuración del clip seleccionado de ese tipo; sin selección muestra instrucciones dentro del panel. Project Media recupera la biblioteca. Pruebas: clic en FX sin selección, biblioteca oculta, 15 tarjetas, vuelta a medios y apertura de configuración desde una tarjeta.

Selecciona un evento y pulsa **Efectos de vídeo / audio** en el inspector o **Video FX** a la izquierda. Activa los efectos, ajusta sus valores y pulsa **Aplicar**. Para parejas agrupadas hay botones para cambiar entre vídeo y audio: cada evento conserva sus propios ajustes. Cambiar de formulario descarta ajustes no aplicados. Restablecer prepara valores neutros; confirmar con Aplicar. Desactivar la casilla principal omite el procesamiento sin borrar los ajustes.

Vídeo: brillo, contraste, saturación, temperatura cálida/fría, desenfoque, enfoque, viñeta, croma con color/tolerancia/suavidad y LUT 3D `.cube`. La LUT se integra en LQTS: tamaño de 2 a 65 por eje, dominio 0–1 y valores 0–1; no depende del archivo externo después de guardar. No se admiten LUT 1D ni dominios distintos.

Audio: EQ de tres bandas (120 Hz, 1 kHz, 8 kHz, Q=1), compresor con umbral/ratio, limitador, reducción FFT de ruido, eco, ambiente/reverberación corta por multieco y normalización de sonoridad de una pasada (objetivo LUFS aproximado). El ambiente por multieco no es una reverb de convolución profesional.

Los efectos se conservan en guardado/apertura, copiar/pegar y división, y admiten deshacer/rehacer. No sobrescriben originales. Cierra la ventana y reproduce el proyecto para escuchar el resultado.

### Procesamiento y límites de esta prueba

- Vídeo: shader WebGL propio, compartido por vista previa y fotogramas exportados. Orden fijo: desenfoque/enfoque → color → LUT → viñeta → croma, antes de Pan/Crop y composición. Desenfoque aproximado de nueve muestras; temperatura creativa RGB, no balance de blancos calibrado. LUT interpolada en textura de 8 bits; no es un flujo HDR certificado.
- Audio: FFmpeg prepara una copia WAV estéreo float32/48 kHz en `userData/effects-cache`. Vista previa y exportación usan la misma copia, aplicando después los recortes, velocidad, ganancia y envolventes del evento. No se descarga nada ni se envía material fuera del equipo.
- Aplicar audio puede tardar con fuentes largas. El diálogo muestra preparación y permite cancelar. Si falla, no se cambia la configuración del evento. Una caché válida se reutiliza por ruta, tamaño/fecha de fuente y filtros; en otro equipo se regenera localmente.
- La normalización usa **la fuente completa**, no solo el fragmento recortado. Los efectos temporales también conservan el contexto de la fuente. Las colas de eco/ambiente no alargan los eventos ni el proyecto.
- Orden de audio fijo: ruido → EQ → compresor → eco → ambiente → normalización → limitador. Las ganancias posteriores pueden superar el nivel limitado. Las cachés ocupan disco y aún no tienen límite automático ni botón de purga. Los originales siguen siendo necesarios; las rutas de caché no se guardan en LQTS.
- Todavía sin cadenas reordenables, automatización FX, presets ni efectos de pista/bus. Video FX muestra un catálogo de efectos y abre ajustes por clip; no es una biblioteca de presets.

### Verificación

`desktop/verify-effects.cjs`: píxeles neutros, brillo, temperatura, saturación, viñeta, croma y LUT; ejecución de blur/enfoque; preparación/decodificación de todos los filtros de audio y reutilización de caché; reproducción WAV float32; interfaz, persistencia, copiar/pegar, división e historial; captura de vídeo y exportación de audio con efectos. Regresión superada de proyecto, controles, puente VEGAS y layout. Pendiente de aceptación visual/de escucha del usuario y pruebas largas.

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

## Transporte del reproductor — 0.5.3 (23/10/2026)

Corregido el icono de retroceder: los caracteres se dividían en dos líneas dentro del botón. Retroceder y avanzar usan ahora iconos SVG locales centrados y botones de tamaño fijo, con etiquetas y ayudas que indican su función de restar/sumar un segundo. La barra ajusta la información secundaria con puntos suspensivos para conservar los controles visibles en monitores estrechos.

Nuevo botón «Reproducir desde el inicio»: lleva el cabezal a cero y comienza la reproducción, tanto si estaba pausada como si estaba reproduciendo. El botón habitual mantiene reproducir/pausar desde la posición actual y actualiza su etiqueta accesible. La prueba verify-layout.cjs comprueba los controles sin saltos de línea en cuatro anchos, retroceso con límite en cero, avance, reproducción desde cero, pausa, continuación y reinicio durante la reproducción.
# Corrección de detección de audio para subtítulos

## Grabar audio desde micrófono — primera fase de captura

Disponible desde el botón lateral **Grabar audio** o **Archivo → Grabar audio desde micrófono…**. No se activa el micrófono solo por abrir el diálogo: primero selecciona una entrada y pulsa **Activar micrófono**. En el primer acceso permite el micrófono cuando el programa lo pregunte; si Windows lo bloquea, revisar Privacidad → Micrófono → aplicaciones de escritorio. Actualizar entradas no inicia una grabación. Cambiar de dispositivo desconecta el anterior y exige activarlo de nuevo.

El medidor muestra nivel RMS en dBFS y aviso de saturación por picos; la ganancia digital ajusta la señal que se graba entre 0 y 200 %. La señal no se reproduce por altavoces durante la captura. Preparar el micrófono lo mantiene activo solo para comprobar el nivel, indicado en pantalla; **Desconectar** lo libera sin grabar.

**Grabar WAV…** pide una ruta de archivo nuevo antes de empezar. **Detener y guardar** libera la entrada y produce un WAV PCM mono de 24 bits a 48 kHz. No se usa MP3/Opus como formato intermedio: las muestras flotantes del navegador se guardan por bloques y FFmpeg convierte a PCM24. Esto no aumenta la resolución real de un dispositivo que capture a menor precisión. No se sobrescriben archivos existentes, ni siquiera si aparecen después de elegir la ruta. Si falla la ruta de salida, se conserva la toma temporal para probar otra ruta o descartarla.

La toma guardada se añade a la biblioteca y, por defecto, se inserta en una pista de audio nueva en la posición indicada. Puedes elegir otra pista de audio, cambiar la posición antes de grabar o desmarcar «Insertar en timeline al terminar». En ese caso puedes escuchar el WAV y pulsar «Insertar toma guardada» después. La importación/inserción automática es una acción deshacible; deshacer no elimina el archivo WAV del disco. Los proyectos LQTS guardan la referencia al WAV como al resto de medios.

Cerrar o descartar libera las pistas del dispositivo y el contexto de audio. Se pide confirmación para descartar una toma en curso; al cerrar la aplicación con una toma pendiente se permite volver al grabador o descartarla. No se eliminan grabaciones que ya se hayan guardado. Los errores de permiso, ausencia de dispositivo o dispositivo ocupado se explican en el diálogo.

Límites del grabador de audio: una toma mono de hasta dos horas, sin pausa, punch-in, calibración de latencia ni monitorización por altavoces. La timeline se detiene al abrir el grabador: no es aún doblaje sincronizado durante reproducción. Solo captura el micrófono; la cámara dispone ahora de un grabador separado descrito arriba. No hay recuperación garantizada de una toma temporal tras fallo brusco o apagado; hay que detener y guardar. Pruebas automatizadas con dispositivo simulado de Chromium; el usuario ha validado el micrófono real.

### Pendientes acordados

- Grabación de cámara implementada; pendiente validación con cámara física.
- Captura de pantalla/ventana implementada; pendiente validar loopback real con el equipo del usuario.
- Autoguardado y recuperación de proyectos.
- Mezclador de audio con medidores por pista y máster.

## Portable local 0.13.0 — dos motores

Medición final: el ZIP con dos motores ocupa 1177942111 bytes, frente a 628469244 bytes del 0.12.0. Son 549,47 MB decimales adicionales (+87,43 %). Verificados ambos motores desde el paquete. La carpeta extraída ocupa aproximadamente 1,69 GB decimales. Los resultados se documentan aquí después de generar el ZIP; el manual dentro de esa copia conserva la nota de preparación anterior a la medición.

Paquete local solicitado para medir el incremento de tamaño respecto al ZIP 0.12.0 (628469244 bytes). Incluye Faster Whisper INT8 como opción inicial y whisper.cpp como alternativa, con ambos motores/modelos, bibliotecas y avisos locales. No se cambia el filtrado de voz ni se intenta corregir automáticamente el caso instrumental descrito. Este paquete no se publica en GitHub sin nueva solicitud. Extraer todo el ZIP y ejecutar LQTAC Studio.exe; no mover solo el ejecutable.

## Selector de motor de subtítulos — cambio local posterior a 0.12.0

En «Subtítulos → Generar subtítulos», «Motor de transcripción» permite elegir **Faster Whisper INT8 · principal** o **Whisper.cpp · alternativa**. Cada apertura empieza con Faster INT8 seleccionado. El idioma, la fuente de audio y el funcionamiento con pistas de audio o audio separado de vídeo se conservan.

El botón Generar solo se habilita si el motor seleccionado y su modelo están preparados. Si falta uno, se indica y puedes seleccionar el otro; el programa no descarga recursos ni cambia de motor silenciosamente. Durante el trabajo no se permite cambiar fuente, idioma o motor. Cancelar detiene el reconocimiento y no añade una pista incompleta. Las nuevas pistas incluyen «Faster INT8» o «Whisper.cpp» en el nombre para facilitar la comparación del mismo audio.

Validado con voz española real de prueba por ambos motores desde el diálogo y con audio independiente, cancelación durante el reconocimiento, controles restaurados y estado de motores ausentes. El ejecutable Faster también se probó tras copiar motor y modelo a otra carpeta, con PATH reducido a Windows, PYTHONHOME/PYTHONPATH vacíos, entrada con nombre Unicode y detección automática de idioma: no necesitó el Python del entorno de desarrollo. Las pruebas previas de subtítulos, SRT, LQTS y exportación MP4 continúan pasando.

Faster se ejecuta mediante su EXE y bibliotecas incluidos, sin instalar Python ni CUDA y sin red. El paquete conserva también el motor/modelo whisper.cpp. Esto cambia la transcripción, no el editor Karaoke: sus marcas de palabras/sílabas siguen requiriendo el flujo de sincronización existente. No se importan tiempos de palabra de Faster ni se promete alineación automática del canto en este cambio. El portable 0.12.0 publicado no se modifica; la opción está disponible en la carpeta principal actualizada.

## Respaldo y publicación 0.12.0 — 24/10/2026

Esta versión incorpora en el portable todos los cambios descritos más abajo como posteriores a 0.11.0: Nuevo proyecto, Karaoke por bloque y pista, menú K, sincronización continua por palabras o sílabas, edición de separación silábica y aplicación parcial con continuación guardada en LQTS. No se cambia el motor: sigue whisper.cpp v1.9.2 con Small multilingüe, ejecutable y modelo incluidos para funcionar offline. No se instala faster-whisper ni se inicia una migración como parte de este respaldo. Las releases históricas no se sobrescriben.

## Subtítulos Karaoke (cambio local posterior al portable 0.11.0)

### Botón K de pista

#### Sincronizar toda la letra con Espacio

##### Elegir Palabras o Sílabas

El selector «Marcar por» permite sincronizar por Palabras (modo inicial) o Sílabas. Con sílabas se mantiene Espacio durante cada sílaba y se suelta al terminarla. El contador, la siguiente unidad y «Repetir anterior» se adaptan al modo elegido. El color avanza dentro de la palabra según las marcas silábicas, tanto en el monitor como en el vídeo exportado, sin introducir guiones ni separadores en el texto original.

En «Revisar separación silábica» se muestra una sugerencia local orientativa para español, no un análisis lingüístico garantizado ni un detector de canto. Revísala para otros idiomas, nombres y formas de cantar. Puedes ajustar sílabas con el punto medio «·»: por ejemplo «can·ci·ón a·zul». Se usa una línea por bloque y espacios entre palabras. No se permite alterar letras, acentos, signos ni el número de palabras. Pulsa «Usar esta separación» antes de grabar; si la has editado, la grabación y Aplicar permanecen bloqueados hasta validarla.

Cambiar de Palabras a Sílabas, o modificar la separación tras marcar unidades, pide confirmación y reinicia las marcas del borrador; no convierte automáticamente los tiempos anteriores. Lo aplicado al proyecto se conserva hasta volver a Aplicar. La aplicación parcial funciona desde una sílaba, incluso dentro de una palabra. LQTS conserva modo, separación y punto de continuación. Al reabrir el editor se recupera la sílaba siguiente. SRT no contiene esta información. Límite: 50000 unidades por sesión, sean palabras o sílabas.

Botón derecho sobre K → «Sincronizar letra completa…». Abre un editor de la pista entera: recorre sus bloques ordenados por inicio y muestra la palabra siguiente. La sesión comienza en cero y permite buscar con el deslizador. «Reproducir» escucha la mezcla real de las pistas habilitadas, respetando silencios/solo y efectos del proyecto.

Mantén pulsada la barra espaciadora mientras se canta la palabra mostrada y suelta cuando termine. La pulsación registra el inicio y la liberación su final; al soltar pasa a la siguiente palabra, también entre bloques. Durante la sesión Espacio NO reproduce/pausa: usa el botón Reproducir/Pausar. La repetición automática del teclado se ignora. Los silencios entre palabras se conservan.

«Repetir palabra anterior» borra la última marca, retrocede un segundo antes de su inicio y permite repetirla. Pausar, buscar o perder el foco cancela la palabra que aún estaba pulsada; las palabras terminadas se mantienen. «Reiniciar marcas…» borra las marcas de la sesión con confirmación. La compensación de -1000 a +1000 ms desplaza todas las marcas al aplicar, sin modificar el audio.

«Aplicar» se habilita al terminar la primera palabra, aunque queden otras pendientes o estés a mitad de un bloque. Su etiqueta muestra cuántas palabras aplicarás y el contador indica las pendientes. Si aún mantienes Espacio pulsado, hay que soltarlo para cerrar esa palabra. No mueve vídeo ni audio, conserva letra/colores/modo y cada aplicación se deshace con un único Ctrl+Z.

Los bloques completos se ajustan a sus marcas. En un bloque incompleto se guardan las marcas confirmadas y se amplía su intervalo solo si hace falta para mostrarlas; los tiempos originales de las palabras pendientes se conservan como referencia, sin resaltarlas como si ya estuvieran sincronizadas. Los bloques aún no empezados no cambian.

Al volver a «Sincronizar letra completa…» se recuperan las palabras aplicadas y se selecciona la siguiente, incluso dentro de una frase. La escucha se sitúa un segundo antes de la última marca para tener referencia. Guarda el proyecto LQTS después de Aplicar para conservar también el avance al cerrar el programa; SRT no contiene este progreso. La compensación parte de cero al retomar y no se vuelve a sumar automáticamente.

Cancelar/Escape descarta solo el borrador nuevo, con confirmación si hubo cambios; lo aplicado antes se mantiene. Si editas manualmente el texto, el orden de eventos o sus tiempos después de aplicar, el editor puede invalidar la continuación y lo indica: conserva el efecto aplicado, pero inicia una nueva sesión para evitar asociar marcas a palabras equivocadas. Los cambios de color o modo no invalidan por sí solos la continuación. No hay autoguardado de marcas que aún no hayas aplicado. Límite de 50000 palabras por sesión.

Las pistas de subtítulos tienen «K» justo después de «M». Un clic activa Karaoke en todos sus bloques; otro lo desactiva sin borrar colores ni tiempos. Los bloques con ajustes existentes conservan su modo (por palabra o progresivo), color y sincronización al reactivarlos. Los bloques que no tenían Karaoke reciben relleno progresivo amarillo con un reparto de tiempos orientativo que hay que revisar con la canción.

El botón iluminado indica que todos los bloques están activos. Un borde discontinuo indica que solo algunos lo están: pulsarlo activa los demás. Toda la operación se deshace con un solo Ctrl+Z. En una pista vacía, K establece el modo para los nuevos subtítulos; los bloques nuevos sin configuración propia también heredan la activación de una pista existente. El estado se guarda en LQTS. No afecta a Mute/Solo ni a otras pistas. Sigue siendo posible personalizar cada bloque por separado.

1. Crea, importa o genera subtítulos. Abre un bloque con doble clic o «Propiedades del evento».
2. En Karaoke elige «Resaltar por palabra» o «Relleno progresivo». «Subtítulo normal» desactiva el efecto. El color habitual, dentro de «Tipografía, colores y posición», corresponde al texto pendiente; «Color cantado» es el resaltado acumulativo.
3. Los tiempos iniciales se reparten uniformemente en el bloque: son una guía, NO alineación automática de canto ni detección del ritmo. Para canciones puedes escribir/corregir la letra y sincronizarla manualmente.
4. Pulsa «Escuchar proyecto» para oír sus pistas habilitadas desde la posición indicada. El deslizador permite revisar y buscar dentro del bloque; la vista previa muestra el color según el tiempo. «Marcar siguiente palabra» registra la entrada de cada palabra y cierra la anterior; al terminar, revisa los finales y los silencios.
5. Ajusta inicio y fin por palabra en segundos relativos al bloque, o arrastra las barras y sus extremos. Se validan orden, duraciones positivas y ausencia de solapamiento entre palabras. «Repartir tiempos» sustituye los ajustes con confirmación. Cambiar las palabras del texto vuelve a repartirlos; revisa después la sincronización.
6. «Aplicar» guarda los ajustes como una edición deshacible; «Cancelar» no los modifica. Al cerrar se detiene la escucha.

El efecto se reproduce en el monitor y se incrusta en MP4/WebM al renderizar con «Incrustar subtítulos» activado. LQTS conserva colores, modo y tiempos de palabras; SRT solo conserva el texto y los tiempos de los bloques, no el karaoke. Mover/copiar bloques mantiene sus tiempos relativos; recortar o dividir conserva la fase de resaltado mediante un desplazamiento interno, en lugar de reiniciarla. No se separa la voz de la música ni se garantiza una transcripción correcta de canciones.

Validado con audio local, controles de escucha/pausa, entradas marcadas, ajuste numérico y arrastre, vista previa, deshacer/rehacer, recorte/división, guardado/apertura LQTS y comparación de píxeles de color en un MP4 codificado. Los subtítulos normales y Nuevo proyecto mantienen sus pruebas satisfactorias.

## Archivo → Nuevo proyecto

Disponible desde Archivo o Ctrl+N. Antes de vaciar el montaje se pregunta Guardar, No guardar o Cancelar. Si se cancela el diálogo de guardado o falla la escritura, se conserva el montaje actual. El nuevo proyecto se llama «Proyecto sin título», contiene una pista vacía de vídeo y otra de audio, biblioteca vacía y cabezal en cero. Se reinician zoom, historial y portapapeles interno de clips. El primer Guardar solicita un archivo nuevo y no reutiliza la ruta del proyecto anterior. No se eliminan archivos de medios ni proyectos del disco.

Los archivos de audio arrastrados a una pista de vídeo se insertan en una pista de audio existente o en una nueva si no existe. El selector de subtítulos reconoce los eventos de audio por su contenido, incluso en pistas de vídeo de proyectos anteriores. Al analizar una pista mixta solo se procesan sus eventos de audio; no se interpreta la envolvente de opacidad como volumen.
