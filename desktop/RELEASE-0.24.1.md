# Cinema Studio by LQTAC 0.24.1

**Capas en el editor de títulos.** La nueva pestaña **Capas** lista los objetos del título de arriba abajo. La capa de arriba es la que se ve delante.

- Cada capa muestra su tipo (texto, imagen, forma o línea) y su nombre: el texto que contiene o el nombre de la imagen del paquete.
- Al pulsar una capa se selecciona en el lienzo.
- **Al frente**, **Subir**, **Bajar** y **Al fondo** cambian el orden. Atajos: Ctrl+] sube una capa, Ctrl+[ la baja, Ctrl+Mayús+] la trae al frente y Ctrl+Mayús+[ la envía al fondo.
- El orden se guarda en el título, en el proyecto y en el render.
- Una **Imagen de paquete** se añade encima del resto. El editor avisa de que se puede enviar al fondo, por ejemplo para usarla como placa o fondo de un rótulo.

**Plantillas según lo que editas.** La lista **Plantilla** muestra solo las plantillas del tipo que estás editando: en un rótulo, rótulos; en un título (también Texto y Cartel), títulos; en unos créditos, créditos. Primero salen las de los paquetes instalados, agrupadas por categoría y marcadas con «· paquete», y después las de serie, marcadas con «· de serie».

**Pruebas:**

- `verify-title-layers.cjs` comprueba que cada editor lista solo su tipo de plantillas, y también la lista de capas, la selección desde la lista, los cuatro botones, los atajos de teclado, el alta y la baja de objetos, y que el orden se guarda en el título del timeline.
- `verify-packs.cjs` comprueba además que las plantillas de paquete van primero y que una imagen de paquete aparece en Capas con su nombre.
- Siguen pasando `verify-generator-layout.cjs`, `verify-titles.cjs`, `verify-generator-curves.cjs` y `verify-generators-live.cjs`.
