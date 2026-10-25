# Generadores: evaluación e integración propuesta

Fecha: 25/10/2026. Estado: evaluación inicial seguida de implementación local de Fabric 6.7.1 + Motion Canvas Core 3.17.2. Consulta FUNCIONAMIENTO.md y developer.md para funciones, pruebas y límites actuales. La recomendación inferior conserva el plan de partida.

## Diagnóstico local

Project Media, Explorer y Generadores comparten la vista base de biblioteca. Los listeners de dock-panel-item en dist/index.html muestran los hijos del panel salvo Transiciones; FX y Subtítulos tienen controladores específicos posteriores, pero Explorer y Generadores no tienen una vista propia equivalente.

## Funciones propuestas

- Project Media: únicamente medios que pertenecen a la biblioteca del proyecto.
- Explorer: explorar carpetas locales, previsualizar e importar medios a esa biblioteca.
- Generadores: catálogo independiente de Texto, Títulos, Rótulos, Créditos y Carteles, con plantillas LQTAC.
- Editor individual con lienzo, texto editable, posiciones y tamaños, tipografía, colores, contorno/sombra y fondo transparente u opaco.
- Línea de tiempo para entradas/salidas y créditos desplazados, basada en el tiempo del clip y determinista para exportación. Las bibliotecas gráficas no proporcionan por sí solas esta integración.
- Guardar la descripción editable del diseño en LQTS; no convertirlo exclusivamente en una imagen que pierda texto/objetos. Generados en la biblioteca, arrastrables a pistas y reeditables por doble clic.
- Empaquetar código, plantillas y recursos necesarios en el portable. Cero CDN, servicios o repositorios necesarios durante su uso.

## Opciones revisadas

1. Fabric.js — https://github.com/fabricjs/fabric.js — MIT. Base recomendada para editar texto y objetos, transformar, serializar diseños e importar/exportar SVG/Canvas. Textbox permite texto multilínea con ajuste. Requiere desarrollar nuestro catálogo, animación temporal y enlace a LQTS/preview/render. https://fabric5.fabricjs.com/docs/fabric.Textbox.html
2. Konva — https://github.com/konvajs/konva — MIT: https://github.com/konvajs/konva/blob/master/LICENSE . Escena Canvas, arrastre, Transformer y animación; alternativa especialmente útil para movimiento. Edición de texto directa requiere añadir una interfaz de entrada; el editor completo es trabajo de integración. https://konvajs.org/docs/select_and_transform/Resize_Text.html
3. Motion Canvas — https://github.com/motion-canvas/motion-canvas — MIT. Animación 2D programada en TypeScript y previsualización temporal. Candidato para una etapa avanzada; su editor/toolchain es más amplio que el catálogo inicial que necesitamos.
4. OpenShot — referencia funcional de editor y plantillas SVG, títulos transparentes y rótulos: https://github.com/OpenShot/openshot-qt/blob/develop/doc/titles.rst . No se han copiado plantillas ni código; cualquier incorporación debe revisar la licencia específica de los archivos.
5. Remotion — https://github.com/remotion-dev/remotion/blob/main/packages/core/LICENSE.md . No es la recomendación inicial: licencia propia con condiciones para uso/redistribución, que no equivale a las opciones MIT.

## Recomendación

Evaluar un prototipo Fabric.js local con cuatro plantillas iniciales (texto transparente, título/subtítulo, créditos y cartel). Mantener renderizado de diseños por tiempo común entre previsualización y exportación. Cargar la biblioteca solo al abrir el editor; fijar versión, conservar licencia y probar sin red. No añadir simultáneamente Fabric y Konva para la misma tarea. Verificar retorno de edición, guardar/reabrir LQTS, composición sobre vídeo, recorte/velocidad, créditos animados y exportación antes de dar por válida la función.
