# Cinema Studio by LQTAC 0.20.0

**Croma por zonas.** FX → Croma / fondo transparente incorpora «Zona donde actúa el croma»:

- **Todo el fotograma:** el croma clásico.
- **IA rápida · proteger personas** (incluida, en directo): detecta personas y solo elimina el color fuera de ellas. Ofrece los modelos Rápido y Detallado y permite animar el umbral de protección y la suavidad del borde. Usa MediaPipe (Apache 2.0) en local con la gráfica y respaldo en CPU. Añade unos 30 MB.
- **IA precisa · cualquier objeto** (módulo opcional): se descarga desde el botón de descarga, a partir de la release `ai-pro-v1.0.0` de GitHub. Se verifica con SHA-256 y se instala en la carpeta `ai-pro`. Para usarla, marcas con clics los personajes u objetos y se siguen durante todo el clip. No es un filtro en directo: requiere un análisis previo, de aproximadamente 1 s por fotograma en un i5-1145G7. Ocupa 295 MB de descarga y 568 MB instalado.

Validado con `verify-chroma-zone.cjs`, `verify-ai-pro-installer.cjs` y `verify-ai-pro-analysis.cjs` (instalación real desde GitHub, análisis y croma protegido), además de las regresiones de efectos.
