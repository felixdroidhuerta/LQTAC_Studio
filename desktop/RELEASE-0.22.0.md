# Cinema Studio by LQTAC 0.22.0

**Títulos animados.** Hay 14 plantillas listas para usar: cine, neón, dorado, impacto, máquina de escribir, capítulo, cita, crawl galáctico, trazos, tres rótulos inferiores y dos estilos de créditos.

- **Efectos de entrada y salida** (fundido, subir, caer, deslizar, escala, desenfoque, giro, barrido, máquina de escribir y trazado). Se aplican al objeto entero o por letra, palabra o línea, con siete curvas de aceleración.
- **Animaciones en bucle:** ola, pulso y temblor.
- **Estilo:** degradados, resplandor y objetos sin relleno.
- **Formas nuevas:** elipse y línea.
- **Texto justificado.**
- **Crawl galáctico:** texto que se aleja en perspectiva sobre un campo de estrellas, con inclinación, horizonte, fundido y retardo ajustables.

**Efectos especiales (VFX).** Hay 11 efectos nuevos de vídeo, todos animables. Además, 30 presets nuevos llevan el total a 125.

- Partículas en siete tipos: chispas, bokeh, nieve, lluvia, polvo, confeti y burbujas.
- Destello de lente, rayos de luz, fuga de luz y parpadeo.
- Ondas, remolino, ojo de pez, calor y espejo.
- Eco o estela de movimiento.

**Herramientas de VFX.**

- **Estabilizar imagen:** analiza el clip en dos pasadas con vid.stab, con suavizado ajustable y dos modos de borde (zoom o bordes). El resultado se guarda en caché.
- **Seguimiento de movimiento** en cuatro pasos:
  1. Tramo, con inicio y fin.
  2. Zona a seguir.
  3. Análisis.
  4. Aplicación.

  El movimiento se aplica a la posición de un efecto, a una máscara o a un título. Una lista muestra dónde está aplicado y permite quitarlo. El análisis queda guardado en el clip.
- **Máscara dibujada (rotoscopia):** polígono animado por fotogramas clave, con borde suave e inversión. Puede recortar el clip o limitar dónde actúan los efectos, y puede seguir un seguimiento de movimiento.

**Grabar sobre el proyecto.** El grabador de micrófono incorpora tres opciones:

- **Reproducir el proyecto mientras grabas:** sirve para cantar o doblar sobre una base.
- **Grabar desde la posición del cursor** o desde un segundo escrito.
- **Compensación de latencia:** ajuste manual de la sincronía de la voz.

Al detener, la reproducción se para y el cursor vuelve al punto de partida.

Validado con `verify-titles.cjs`, `verify-vfx-pack1.cjs`, `verify-vfx-pack2.cjs`, `verify-vfx-pack23-ui.cjs` y `verify-microphone.cjs`. También pasan las regresiones de efectos y de audio.

Incluye el manual funcional 0.19.0; los capítulos nuevos se añadirán en la próxima revisión. Requiere la carpeta extraída completa; abre **Cinema Studio.exe**.
