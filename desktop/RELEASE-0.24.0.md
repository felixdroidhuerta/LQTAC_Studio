# Cinema Studio by LQTAC 0.24.0

**Paquetes de contenido.** Cinema Studio puede instalar paquetes `.lqpack` que añaden contenido a lo que trae el programa:

- marcos para colocar la letra de los subtítulos;
- plantillas de rótulos con imágenes;
- imágenes para tus propios diseños;
- máscaras de transición;
- presets de efectos.

**Cómo se usan:**

- **Instalar:** desde Herramientas → **Paquetes…** o con doble clic en el archivo. Antes de instalar se muestra qué trae el paquete. Una versión nueva del mismo paquete se ofrece como actualización.
- **Gestionar:** cada paquete se puede activar, desactivar o desinstalar.
- **Actualizaciones del programa:** los paquetes instalados se conservan al actualizar Cinema Studio.

**Solo paquetes oficiales.** Cada paquete va firmado digitalmente por LQTAC. Se rechazan los paquetes sin firmar, los firmados con otra clave y los modificados después de firmarlos. Un paquete solo contiene imágenes y datos; nunca código.

**Marco para la letra.** El editor de subtítulos tiene **Marco** y **Opacidad del marco**.

- Elegir un marco aplica su estilo de letra sugerido.
- El marco se adapta al texto (o es una franja de ancho fijo), entra y sale con un fundido, y se exporta igual que se ve en la vista previa.
- La nueva casilla aplica tipografía, colores, posición y marco a todos los subtítulos de la pista, sin cambiar su texto, sus tiempos ni su karaoke.

**Rótulos con imágenes.** El editor de títulos admite imágenes de paquete, con el selector **Imagen de paquete…** y en las plantillas de los paquetes. Se mueven, escalan, giran y animan como el resto de objetos.

**Primer paquete: Navidad (lqtac.navidad 1.0.0)**, que se distribuye aparte del programa:

- 3 marcos de subtítulos;
- 5 imágenes;
- 3 rótulos;
- las 5 máscaras de transición de Dulce Navidad;
- 2 presets.

**Render con el archivo de destino abierto.** Si el MP4 de destino está abierto en un reproductor u otro programa, Windows no deja sustituirlo. Ahora el render lo reintenta unos segundos; si sigue bloqueado, deja intacto el archivo abierto y guarda el vídeo terminado con otro nombre en la misma carpeta («… - render xxxxxxxx.mp4»). Antes el render terminaba con un error al guardar.

**Pruebas:**

- `verify-pack-format.cjs` comprueba la firma, los paquetes modificados o ajenos, las reglas del contenido, y la instalación, actualización, vuelta atrás y desinstalación.
- `verify-packs.cjs` prueba todo el flujo dentro de la aplicación.
- `verify-render-commit.cjs` comprueba el guardado del render con el destino bloqueado.
- Siguen pasando las pruebas de subtítulos, karaoke, títulos, generadores, presets, menús, proyecto, fuentes, espacios de trabajo y MCP.
- Limitación conocida del entorno de pruebas: en el equipo de compilación, `verify-mcp.cjs` se detiene en la grabación de una zona de pantalla porque la captura de Windows rechaza la petición. Con el código de 0.23.0 falla igual, y 0.24.0 no cambia la grabación.
