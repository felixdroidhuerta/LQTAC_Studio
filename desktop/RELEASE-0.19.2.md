# Cinema Studio by LQTAC 0.19.2

Imágenes fijas en pistas de vídeo. Arrastra PNG, JPG/JPEG, BMP, WebP o TIFF desde Windows, Explorer o Project Media. La imagen se añade a la biblioteca si no estaba y se inserta un clip de 5 segundos ajustable.

Probado con previsualización, reproducción, guardado LQTS y render MP4. Incluye el manual funcional 0.19.0 y conserva los motores offline.

Corrección incorporada al mismo portable 0.19.2: el botón derecho sobre un clip, una pista o su nombre permite añadir u ocultar la línea de transparencia en vídeo y la línea de volumen en audio. Sobre la línea, el botón derecho añade puntos. Los puntos se desplazan en tiempo y valor, y el tramo entre dos puntos se puede subir o bajar conjuntamente. Se conserva en LQTS y afecta a la previsualización y al render.

Validado dentro del paquete con `verify-envelope-menu.cjs`: menú contextual, inserción de puntos, arrastre de puntos y segmentos, exclusión de subtítulos y persistencia.

Corrección adicional del pie del timeline: Posición, Selección/Tramo, Zoom y Snap muestran ahora el estado real y se actualizan durante reproducción, búsqueda, selección y navegación. Validado dentro del paquete mediante `verify-timeline-status.cjs`.

La regla superior permite crear el tramo de render arrastrando directamente, sin tecla modificadora. Un clic corto mueve el cabezal y arrastrar la flecha del cabezal mantiene su función independiente. La prueba empaquetada valida los dos gestos y la iluminación del tramo.

Segundo cabezal ámbar para el final del tramo. El cabezal principal parte del inicio, la reproducción queda limitada a la selección y se detiene en el marcador ámbar. El mismo tramo limita el render. El marcador de salida es ajustable y la prueba empaquetada valida aspecto, arrastre, reproducción y render.

Creación simplificada de envolventes: botón derecho en cualquier posición de una pista de vídeo o audio y Añadir punto aquí. La línea se muestra automáticamente, los puntos visibles son menores con zona de agarre ampliada y el hover incorpora cursor cian y realce amarillo. Validado dentro del portable con ratón real, arrastre, historial y persistencia.

Lanzador permanente `Documentos\Cinema Studio\Cinema Studio.exe`. Selecciona automáticamente el portable extraído con versión más reciente y proporciona a Windows un comando anclable sin número de versión. Validado en fuente, paquete y sistema real: resuelve y abre 0.19.2 aunque existan copias anteriores.
