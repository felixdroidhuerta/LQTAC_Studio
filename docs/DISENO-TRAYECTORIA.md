# Diseño · Efecto «Trayectoria» (ruta de movimiento con zona de peso)

Estado: propuesta sobre el código de Cinema Studio 0.26.0. Aún no hay nada implementado.

## 1. Qué hace

El usuario selecciona un clip de vídeo o imagen con transparencia (PNG, WebP, WebM con alfa y, en la fase 3, GIF animado) colocado en una pista superior. Después:

1. **Marca la zona de peso**: un punto sobre el objeto (p. ej. la cabeza del pájaro).
2. **Dibuja la ruta** sobre la imagen del proyecto, como una curva con nodos y tiradores.
3. **Elige el tramo de tiempo**: la ruta se recorre entre un inicio y un fin dentro del clip.
4. **Elige la orientación**: el objeto gira según la dirección de la ruta, pivotando sobre la zona de peso, de modo que la cabeza va primero y el cuerpo la sigue.

En cada instante, el compositor coloca la zona de peso exactamente sobre la ruta y gira el objeto alrededor de ella.

## 2. Encaje en el código actual

| Pieza existente | Uso en la trayectoria |
|---|---|
| `index.html:882`: cada clip de vídeo se pinta en su propio lienzo con `LQTACWork.drawCrop(ctx, LQTACVideoEffects.draw(...), w, h, cropAt(...))` | Punto de inserción del render. La exportación pasa por el mismo código (`exportSize`), así que preview, MP4, WebM, GIF y PNG salen iguales sin trabajo extra. |
| `index.html:924`: dibujo de clips durante transiciones personalizadas | Segundo punto de inserción. |
| `work-model.js` («semántica compartida por preview, persistencia y exportación FFmpeg») | Aquí va el modelo puro: `motionAt()` y `drawMotion()`. Se puede probar con Node. |
| `pan-crop-editor.js` y `fx-tools.js` (seguimiento) | Patrones del editor: diálogo modal, lienzo con coordenadas normalizadas, borrador, «Aplicar» como un solo paso de deshacer, reproducción con `seek()`. |
| `keyframe-controls.js` (`LQTACKeyframes.install`) | Barra de tiempo del tramo, con marcas de inicio y fin arrastrables. |
| `effects-model.js` → `tracking.points` | Fase 4: convertir un seguimiento analizado en ruta. |
| `mcp-edit.cjs` (`updateClip.patch`) | Nuevo campo `motionPath`, para que Claude pueda crear rutas por MCP. |

**Orden de dibujo:** efectos de vídeo → Pan/Crop → **Trayectoria**. Pan/Crop sigue sirviendo para encuadrar o recortar el objeto, y la trayectoria mueve el resultado como una pegatina.

## 3. Modelo de datos

Es un campo nuevo del clip, que se guarda en LQTS (`clip.dataset.motionPath` y `motionPath` en `project-io.cjs`):

```js
motionPath: {
  version: 1,
  enabled: true,
  anchor: { x: 0.62, y: 0.31 },      // zona de peso, normalizada sobre la capa ya recortada (0–1)
  nodes: [                           // ruta en coordenadas de pantalla normalizadas (−0.5 … 1.5: puede entrar o salir de cuadro)
    { x: -0.10, y: 0.60, in: null, out: { x: 0.10, y: 0.45 }, mode: 'smooth' },
    { x:  0.50, y: 0.30, in: { x: 0.35, y: 0.30 }, out: { x: 0.65, y: 0.30 }, mode: 'smooth' },
    { x:  1.10, y: 0.55, in: { x: 0.90, y: 0.40 }, out: null, mode: 'corner' }
  ],
  start: 0.0, end: 4.0,              // tramo en segundos locales del clip; antes de start y después de end se mantiene la pose
  easing: 'Smooth',                  // reutiliza LQTACWork.curveFormula: Linear | Fast | Slow | Smooth | Sharp
  orient: 'flip',                    // 'path' | 'flip' | 'none' (ver §4.3)
  forward: 0,                        // grados: hacia dónde «mira» el objeto en la imagen original (0 = derecha, 180 = izquierda)
  angleOffset: 0,                    // grados extra (cabecear arriba o abajo)
  inertia: 0.35,                     // 0–1: cuánto tarda el cuerpo en alinearse en los giros
  scale: 0.25,                       // tamaño del objeto respecto al fotograma
  scaleEnd: null,                    // opcional: escala al final (perspectiva: se aleja o se acerca)
  loop: false
}
```

Límites para validar en `effects-model` y `project-io`: de 2 a 200 nodos; coordenadas dentro de [−2, 3]; `0 ≤ start < end ≤ duración`; `scale` en [0.01, 10]; `inertia` en [0, 1].

## 4. Matemática (determinista: el resultado en un instante t no depende de los fotogramas anteriores)

### 4.1 Posición con velocidad uniforme
- Cada tramo entre dos nodos es una Bézier cúbica (P0, out, in, P1). Si falta un tirador, se usa el propio nodo y el tramo queda recto.
- Se precalcula una tabla de longitud de arco (64 muestras por tramo) en coordenadas de **píxel del proyecto**, con el eje X escalado por la relación de aspecto, para que la velocidad sea la misma en horizontal y en vertical.
- `p = easing((t − start) / (end − start))` y `d = p · L`. Se busca `d` en la tabla, se obtienen `u` y el tramo, y de ahí la posición `P(d)` y la tangente `T(d)`.
- Así el objeto recorre la ruta a velocidad constante aunque los nodos estén repartidos de forma irregular. La aceleración solo la marca el easing.

### 4.2 Giro con inercia: el cuerpo acompaña a la cabeza
- Ángulo de la ruta: `θ(d) = atan2(T.y, T.x)`.
- Ángulo aplicado: la media de `θ` (desenrollado, sin saltos de ±180°) a lo largo de la ventana `[d − k, d]`, con `k = inertia · 0.25 · L`. Al llegar a una curva, la cabeza (el pivote) ya está girando sobre la ruta, pero la orientación del cuerpo «llega tarde» y se alinea poco a poco. Ese retraso es el efecto de que el cuerpo acompaña.
- Como es una media sobre la ruta y no un filtro temporal, saltar a cualquier punto, renderizar o exportar da siempre la misma pose.

### 4.3 Modos de orientación
- `path`: rotación libre `θ − forward + angleOffset`. Sirve para flechas, coches vistos desde arriba o naves.
- `flip`: **el recomendado para animales de perfil**. Si el objeto va hacia la izquierda (`cos θ < 0`), se voltea en horizontal y se gira `θ − 180°`. El pájaro nunca vuela boca abajo y cabecea arriba o abajo como mucho ±90°. Para que no parpadee en tramos verticales, el volteo se decide con el ángulo ya suavizado de §4.2 y una banda muerta de ±8°.
- `none`: solo se desplaza.

### 4.4 Composición
```
layer   = lienzo w×h con drawCrop(efectos(clip), crop(t))     // lo que ya se dibuja hoy
estado  = LQTACWork.motionAt(motionPath, t, w, h)              // {x, y, angle, flipX, scale}
ctx.translate(estado.x, estado.y)        // la zona de peso se coloca sobre la ruta
ctx.rotate(estado.angle)
ctx.scale(estado.scale * (flipX ? -1 : 1), estado.scale)
ctx.translate(-anchor.x * w, -anchor.y * h)
ctx.drawImage(layer, 0, 0)
```
Coste: un `drawImage` extra de w×h por fotograma, y solo en los clips con trayectoria. La opacidad, el fundido, la ganancia y las transiciones no cambian porque se aplican después, sobre el mismo lienzo (`surface.style.opacity`).

## 5. Interfaz: «Trayectoria · ruta de movimiento…»

Acceso: **Herramientas › Efectos de vídeo › Trayectoria…** y un botón junto a «Pan/Crop · editor visual». Requiere un clip de vídeo o imagen seleccionado.

Diálogo con un lienzo grande que muestra **la composición del proyecto en ese instante** (las pistas inferiores incluidas, para dibujar la ruta sobre el fondo real), con el objeto superpuesto:

1. **Zona de peso**: un clic sobre el objeto coloca la cruz ⊕. Una flecha indica la dirección «adelante» (`forward`) y se puede girar arrastrando su punta, o pulsar «Mira a la izquierda/derecha».
2. **Ruta**: clic para añadir nodos y arrastrar al crearlos para sacar tiradores curvos. Alt + arrastrar rompe la simetría del tirador (esquina). Doble clic sobre un nodo lo borra y Ctrl + clic sobre la línea inserta uno. Se permiten nodos fuera de cuadro, en una zona gris alrededor del fotograma, para entradas y salidas de plano.
3. **Tiempo**: inicio y fin («Marcar aquí», como en Seguimiento), «Usar todo el clip», easing y bucle.
4. **Orientación y tamaño**: modo (`flip` por defecto), inercia (deslizador «Suave ↔ Rígido»), cabeceo extra, tamaño inicial y final.
5. **Vista previa**: ▶ reproduce el tramo y la barra de tiempo permite arrastrar. La opción «Ver fantasmas» dibuja 6 poses semitransparentes a lo largo de la ruta para juzgar el giro sin reproducir.

Pie del diálogo: Cancelar · Quitar trayectoria · **Aplicar al clip**, que es un paso de deshacer y se guarda en LQTS.

## 6. Operaciones de montaje que deben respetarla

| Operación | Ajuste |
|---|---|
| Dividir clip (`index.html:1591`) | Las dos mitades conservan la ruta. En la derecha, `start` y `end` se restan con `leftDuration` (pueden quedar negativos: ya está permitido por mantener la pose). |
| Estirar (`work-model.stretchClips`) | `start` y `end` se multiplican por `scale`, como `panCrop`. |
| Invertir clip | El progreso se invierte: `p → 1 − p`. |
| Repetir y duplicar | Se copia tal cual. |
| VEGAS (puente) | No se exporta. El informe añade el aviso «Trayectoria no compatible con VEGAS». |
| MCP `cinema_edit` | `updateClip.patch.motionPath` (objeto o `null`), validado en `mcp-edit.cjs`, y documentado en `docs/MCP.md` y en el catálogo de `cinema_effects`. |

## 7. GIF animado con transparencia (fase 3)

Hoy `still-images.js` no acepta `.gif`. Propuesta: al importar un GIF, convertirlo con el FFmpeg incluido a **WebM VP9 con alfa** (`-c:v libvpx-vp9 -pix_fmt yuva420p`), guardarlo en la caché junto al original (igual que la estabilización) y tratarlo como un vídeo normal. Si el GIF es más corto que el clip, se repite en bucle con la función «Repetir» que ya existe. Así se mantiene un único camino de reproducción y exportación.

Antes hay que verificar que el `<video>` de Electron conserva el alfa al pasar por `LQTACVideoEffects.draw`. Las imágenes PNG y WebP estáticas ya lo conservan.

## 8. Fases

1. **Modelo y render**: `motionAt` y `drawMotion` en `work-model.js`, los enganches de `index.html` (882 y 924), persistencia LQTS, dividir, estirar e invertir, y el parche MCP. Al terminar ya se puede usar por MCP.
2. **Editor visual** (`motion-path-editor.js`), menú, botón e i18n (es, en, fr, ja, zh). *Hecho el 22/11/2026; la flecha «adelante» se ajusta con botones y grados en vez de arrastrar su punta, y Mayús + clic fuerza un nodo nuevo sobre otro.*
3. **GIF animado** con alfa. *Hecho el 22/11/2026: la conversión está en el proceso principal (`media-file-url`), así que el renderer no distingue un GIF de un vídeo. Comprobado que `<video>` y el compositor conservan el alfa VP9.*
4. **Extras**: «Convertir seguimiento en ruta» (desde `fx.tracking.points`), escala a lo largo de la ruta y una plantilla de vuelo con aleteo vertical (oscilación sinusoidal sobre la normal de la ruta).

## 9. Validación

- `desktop/verify-motion-path.cjs` (Node, sin interfaz):
  - Longitud de arco: velocidad uniforme con un error menor del 1 % entre muestras.
  - Extremos: en `start` la zona de peso cae en el primer nodo y en `end` en el último.
  - Inercia determinista: `motionAt(t)` da lo mismo en orden aleatorio que en secuencia.
  - `flip`: a la izquierda, `flipX` es verdadero y el ángulo queda dentro de ±90°. Sin parpadeo en un tramo vertical.
  - Dividir, estirar e invertir conservan la pose en el mismo instante absoluto.
  - La validación rechaza datos fuera de rango.
- Render: un PNG de 64×64 con un punto rojo en la zona de peso. Exportar un fotograma y comprobar que el píxel rojo cae sobre la ruta (±1 px).
- Exportación MP4 y GIF corta, decodificada con FFmpeg sin errores.
- LQTS: guardar, abrir y comprobar que todo es idéntico.
- Regresión: `verify-pan-crop-editor`, `verify-work`, `verify-stretch` y `verify-reverse`.
- Registrar el resultado en `FUNCIONAMIENTO.md` y `developer.md` (regla de `AGENTS.md`).
