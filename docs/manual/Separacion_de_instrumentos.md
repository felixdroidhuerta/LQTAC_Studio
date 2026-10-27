# Separar una canción en instrumentos

Prueba funcional local añadida el 27 de octubre de 2026. La edición del manual PDF incluida en el portable 0.17.0 es anterior a esta herramienta.

1. Coloca la canción en una pista de audio. No necesitas seleccionar un evento para abrir la herramienta.
2. Pulsa **Separar instrumentos** en **Ventanas**, justo debajo de **Subtítulos**. También puedes abrirlo desde **Herramientas → Separar instrumentos…**, o desde el espacio **Audio**. Elige **Pista a procesar** y **Evento de audio**. Si tenías un audio válido seleccionado, se propone automáticamente. Solo aparecen eventos con archivo disponible y de hasta 30 minutos. Sin ninguno válido, verás **«Aún no hay pistas a procesar en este proyecto»** y no podrás iniciar el proceso.
3. Pulsa **Elegir carpeta…**. Se creará una subcarpeta nueva para cada separación.
4. Deja marcada **Silenciar el evento original** para escuchar después los instrumentos sin duplicar la canción.
5. Pulsa **Separar e insertar cuatro pistas**. El procesamiento se ejecuta en tu equipo y puede tardar varios minutos. El límite de esta prueba es de 30 minutos por evento.
6. Al terminar aparecen cuatro pistas: **Voz, Batería, Bajo y Otros instrumentos**. Están agrupadas, alineadas y tienen la misma duración que el evento elegido. El recorte, velocidad y ajustes del audio original quedan incorporados a los resultados.
7. Escucha cada resultado en el diálogo, o cierra la ventana y utiliza Solo/Mute en las pistas para valorar la mezcla. Guarda tu proyecto LQTS y conserva la carpeta de WAV.

La separación puede contener restos de otros instrumentos o sonidos artificiales. No recupera las grabaciones originales. «Otros instrumentos» reúne lo que no pertenece a voz, batería o bajo; no genera una pista individual para cada guitarra o piano.

El archivo original permanece intacto. Ctrl+Z deshace la inserción y recupera su estado anterior; los WAV ya guardados no se borran. **Cancelar separación** detiene la operación sin añadir pistas.

El motor está preparado para funcionar sin conexión. Si falta el modelo o el motor local, se muestra el aviso y no se intenta descargarlo durante el uso. Esta primera versión usa CPU y separación en cuatro fuentes.
