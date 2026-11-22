# Manual de usuario de LQTAC Studio

Edición funcional actualizada al código **0.27.0**, 22/11/2026 (44 páginas). Añade presets, efectos especiales, seguimiento y rotoscopia, croma por zonas, pack de audio y autotune, plantillas y capas de títulos, Trayectoria y GIF animados, paquetes, Qbit, MCP, preferencias, idioma y tema.

## Entrega

El PDF final se genera en `output/pdf/LQTAC_Studio_Manual_de_usuario_0.18.0.pdf` desde la raíz del proyecto. El índice tiene enlaces internos; el pie de las páginas de contenido vuelve al índice. El portable lo incluye como «Manual de usuario.pdf».

## Fuentes de la guía

- `content.py`: contenido para usuarios, organizado por tareas.
- `content_027.py`: páginas añadidas en la edición 0.27 (funciones de 0.20 a 0.27), insertadas en su sección.
- `capture_manual_027.cjs`: capturas de esas páginas (ejecutar después de `capture_manual.cjs`). Usa `pose-vuelo.png` de Lítera si existe.
- `Manual_de_usuario.md`: copia de lectura y consulta generada desde ese contenido al construir el PDF.
- `build_manual.py`: maquetación PDF con ReportLab y fuentes Segoe UI de Windows.
- `capture_manual.cjs`: captura la aplicación real con un perfil aislado en `.openai/manual/profile`. Utiliza medios sintéticos locales y no activa cámara, micrófono ni captura de pantalla. No modifica proyectos del usuario ni publica cambios.
- `assets/`: capturas originales de la interfaz y metadatos de captura. El logotipo se obtiene de la marca existente en la interfaz, sin redibujarlo.

Para actualizar las capturas, ejecutar el script con el Electron local de `desktop/node_modules/electron/dist/electron.exe`. Para construir el PDF: `tmpmanual-buildenvScriptspython.exe build_manual.py <salida.pdf> <versión>` (venv con ReportLab, Pillow y PyMuPDF para revisar páginas). El constructor lista todas las páginas que se desbordan. Segoe UI no tiene ⊕ ✎ ▶ ▣ ⌗ ⚙ ni caracteres chinos o japoneses: no usarlos en el texto. Los comandos son herramientas de mantenimiento del manual, no requisitos para utilizar el programa.

La revisión contrasta el contenido con `FUNCIONAMIENTO.md`, `developer.md` y los controles del código. Las imágenes usan un montaje ficticio con gradientes y tonos de prueba. Los subtítulos de ejemplo son manuales; no se presentan como resultados de transcripción. El documento no certifica requisitos de hardware ni compatibilidad universal con VEGAS.

Al actualizar: revisar nombres de menús, atajos, perfiles de exportación y límites; regenerar capturas; construir el PDF; renderizar todas sus páginas con Poppler e inspeccionar legibilidad, cortes y composición. No publicar automáticamente esta documentación en GitHub sin solicitud del usuario.
