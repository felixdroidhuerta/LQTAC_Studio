# Cinema Studio by LQTAC 0.21.0

**Presets de efectos.** Cada editor de efectos de vídeo y de audio tiene una barra **Preset** con 95 presets de fábrica (31 de vídeo y 64 de audio). Puedes guardar los tuyos, con su animación incluida (se adapta a la duración del clip), y exportarlos o importarlos en ficheros `.lqfx`.

**Pack de audio.** Hay once efectos nuevos en FX → Audio, todos con editor, escucha en directo, presets y curvas de animación:

- Filtros paso alto y paso bajo
- Puerta de ruido
- De-esser
- Cambio de tono / voces, de −12 a +12 semitonos, con o sin conservar el timbre
- Chorus y trémolo
- Lo-fi
- Ensanche estéreo
- Reverb de sala por convolución
- Panorámica

Los efectos con varios valores muestran una curva de color por parámetro. Al final del panel FX se ve cuánto ocupa la caché de audio procesado y se puede vaciar.

**Autotune.** La voz se afina hacia la tonalidad y la escala que elijas:

- **Intensidad** y **velocidad de ajuste** se pueden animar. Con velocidad 0 se obtiene el efecto robótico.
- **Pista guía:** la voz sigue la melodía de otra pista de audio del proyecto, aunque esa pista esté silenciada. Hay dos modos:
  - **Seguir notas:** la voz va a la nota de la guía y conserva su propio vibrato.
  - **Copiar entonación:** la voz copia también los deslizamientos y el vibrato de la guía.
- Se puede elegir qué hacer donde la guía calla, retrasar o adelantar la guía y fijar la corrección máxima.
- La escucha en directo es aproximada. «Preparar escucha exacta» suena igual que la exportación.

Validado con `verify-presets.cjs`, `verify-audio-pack.cjs`, `verify-audio-pack-ui.cjs` y `verify-autotune.cjs`, usando medidas de frecuencia con tonos de prueba en el render, en directo y en la exportación del proyecto. También pasan las regresiones de efectos y de audio.

Incluye el manual funcional 0.19.0 (los capítulos nuevos se añadirán en la próxima revisión). Requiere la carpeta extraída completa; abre **Cinema Studio.exe**.
