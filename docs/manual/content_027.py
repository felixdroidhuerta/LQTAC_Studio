"""Pages added in the 0.27 edition: features from 0.20 to 0.27. Inserted into PAGES by content.py."""

def after(pages, title, *new):
    """Insert new pages right after the page with this title."""
    i = next(i for i, p in enumerate(pages) if p['title'] == title) + 1
    pages[i:i] = list(new)

def before(pages, title, *new):
    i = next(i for i, p in enumerate(pages) if p['title'] == title)
    pages[i:i] = list(new)

PRESETS = dict(title='Presets de efectos', section='EDITORES', lead='Cada editor de efectos tiene arriba una barra Preset con ajustes listos para usar y los tuyos propios. Hay 125 de fábrica: 61 de vídeo y 64 de audio.', blocks=[
('Probar un preset', 'Abre un efecto desde FX o Herramientas > Efectos de vídeo o de audio y elige un preset en la lista. Se aplica al borrador al momento, así que lo ves y lo escuchas en la vista previa. Aplicar al clip lo confirma; Cancelar lo descarta. Cada preset solo cambia los parámetros de su efecto: un preset de saturación no toca el brillo.'),
('Guardar los tuyos', 'Ajusta el efecto y pulsa Guardar como preset…. Ponle un nombre y marca si quieres guardar también la animación. Las curvas se guardan en proporción a la duración del clip, de modo que se adaptan a clips más largos o más cortos.'),
('Compartir y borrar', 'Exportar mis presets… crea un archivo .lqfx con todos tus presets de vídeo o de audio; Importar… los añade y renombra los nombres repetidos. Eliminar borra un preset propio. Los presets de los paquetes instalados aparecen en el grupo Paquetes.'),
('Ejemplos', 'Vídeo: blanco y negro, colores vivos, «Color → blanco y negro» animado, nieve, lluvia, confeti, destello que cruza, rayos de sol, onda expansiva o estela fantasma. Audio: voz de radio, sala de conciertos, ardilla, corrección natural de afinación o efecto robótico.')])

ESPECIALES = dict(title='Efectos especiales de vídeo', section='EDITORES', lead='El catálogo FX > Vídeo incluye efectos de luz, partículas y deformación, además de estabilizar, seguir objetos y dibujar máscaras animadas.', image='31-estabilizar.png', caption='Estabilizar imagen prepara una copia local estabilizada; el archivo original no cambia.', blocks=[
('Luz, partículas y deformación', 'Partículas (nieve, lluvia, chispas, polvo, confeti, burbujas o bokeh), destello de lente, rayos de luz, fugas de luz, parpadeo, ondas de agua, remolino, ojo de pez, onda de calor, espejo o caleidoscopio y estela. Se animan con curvas como el resto de FX. En el destello, haz clic sobre la vista previa para situar su centro.'),
('Estabilizar imagen', 'Suaviza el temblor de la cámara. Elige el suavizado (1–100 fotogramas) y qué hacer con los bordes: ampliar para ocultarlos o mantener el encuadre con bordes negros. Se procesa el archivo completo, una vez y media su duración aproximadamente, y la copia se reutiliza. Quitar estabilización vuelve al original.'),
('Antes de estabilizar', 'No se puede estabilizar un clip invertido: restaura primero su dirección. Los recortes, divisiones y cambios de velocidad del clip se conservan.')])

SEGUIMIENTO = dict(title='Seguimiento y máscaras dibujadas', section='EDITORES', lead='El seguimiento de movimiento registra el recorrido de un objeto y lo aplica a un efecto, a una máscara o a un título. La rotoscopia recorta o limita los efectos a una forma que tú dibujas.', blocks=[
('1. Tramo y zona', 'Abre Herramientas > Efectos de vídeo > Seguimiento de movimiento. Marca el inicio y el fin con Marcar inicio aquí y Marcar fin aquí, o deja todo el clip. En el instante de inicio, arrastra un rectángulo sobre algo con detalle y contraste.'),
('2. Analizar y aplicar', 'Analizar el tramo sigue la zona 15 veces por segundo y guarda el resultado en el clip. Después elige el destino y pulsa Aplicar: la posición del destello, de los rayos, de las ondas o del remolino; la máscara dibujada del clip; o un título de otra pista que coincida en el tiempo. Cada destino tiene su botón Quitar.'),
('3. Máscara dibujada', 'En Máscara dibujada (rotoscopia) haz clic alrededor de la zona y pulsa el primer punto para cerrarla (de 3 a 64 puntos). En otro instante, arrastra los puntos para crear un fotograma clave; Mayús + arrastrar mueve toda la máscara. Úsala para recortar el clip o para aplicar efectos solo dentro, por ejemplo para desenfocar una matrícula.'),
('Límites', 'El seguimiento sigue la posición, no la rotación ni la escala. Si el objeto queda tapado o cambia mucho, puede perderse.')])

CROMA = dict(title='Croma por zonas', section='EDITORES', lead='En FX > Croma / fondo transparente, «Zona donde actúa el croma» decide dónde se elimina el color de fondo.', blocks=[
('Todo el fotograma', 'El croma clásico: elimina el color elegido en toda la imagen.'),
('IA rápida · proteger personas', 'Incluida y en directo. Detecta a las personas en cada fotograma y solo quita el color fuera de ellas. Sirve cuando el color del fondo también aparece en la ropa. Funciona sin conexión y usa la gráfica si está disponible.'),
('IA precisa · cualquier objeto', 'Módulo opcional que se descarga desde la propia ventana. Pulsa Marcar y analizar…, haz clic izquierdo sobre lo que se conserva y clic derecho sobre el fondo; puedes marcar en varios instantes y hasta 4 objetos. Necesita un análisis previo y consume mucha CPU: en un portátil, unos 5 minutos de vídeo a 12 fps tardan alrededor de una hora.')])

AUDIO = dict(title='Pack de audio y autotune', section='EDITORES', lead='FX > Audio incluye filtros, efectos de voz y espacio, y un autotune con pista guía. Todos tienen escucha, presets y curvas.', blocks=[
('Efectos del pack', 'Filtro paso alto y paso bajo, puerta de ruido, de-esser, cambio de tono (−12 a +12 semitonos), chorus, trémolo, lo-fi, ensanche estéreo, reverb de sala por convolución y panorámica. En los efectos con varios valores, cada parámetro tiene su curva de color.'),
('Autotune', 'Lleva cada nota a la más cercana de la escala. Elige tonalidad y escala (si no la conoces, usa Cromática), la intensidad de la corrección y la velocidad de ajuste: 0 da el efecto robótico y 1 un deslizamiento natural. Para una sola voz o instrumento melódico; con acordes o música de fondo la detección se confunde.'),
('Pista guía', 'En el apartado Pista guía elige otra pista con la melodía (un piano o una voz de referencia, una nota a la vez). La voz se lleva a la nota de la guía: Seguir notas conserva su vibrato y Copiar entonación copia también los deslizamientos. La guía puede estar silenciada para que no se oiga al exportar.'),
('Escucha exacta', 'La escucha en directo es aproximada y puede sonar algo granulada. Para juzgar el resultado final, usa Preparar escucha exacta. Opciones > Caché de audio procesado… muestra lo que ocupan estas copias y permite vaciarlas.')])

TITULOS = dict(title='Plantillas y efectos de títulos', section='TEXTO', lead='El editor de títulos y gráficos trae plantillas, efectos de entrada y salida por letra, palabra o línea, degradados, brillo y texto en perspectiva.', image='36-titulo-animacion.png', caption='Pestaña Animación del editor de títulos, con la curva de opacidad de la composición.', blocks=[
('Plantillas', 'El selector Plantilla, arriba a la derecha, sustituye el diseño por uno listo para editar: títulos (cine, neón, degradado dorado, máquina de escribir, crawl…), rótulos y créditos. Solo muestra las del mismo tipo que el gráfico abierto. Si te equivocas, Cancelar descarta el cambio.'),
('Entrada, salida y movimiento', 'En Efectos, elige la entrada (fundido, subir, caer, escalar, desenfoque, girar, barrido o máquina de escribir), cómo se aplica (letra, palabra, línea u objeto) y su suavizado; la salida funciona igual. El movimiento continuo añade ola, latido o temblor. En Estilo hay degradado lineal y brillo.'),
('Texto en perspectiva', 'Animación > Texto en perspectiva (crawl), o la plantilla Crawl galáctico, hace subir el texto sobre un plano inclinado hasta perderse en el horizonte. Ajusta la inclinación, la altura del horizonte, el desvanecimiento y cuándo empieza a subir. Fijo en pantalla deja un objeto plano encima.')])

CAPAS = dict(title='Capas e imágenes en los títulos', section='TEXTO', lead='La pestaña Capas muestra los objetos del título de arriba abajo: la capa de arriba se ve delante.', image='35-titulo-capas.png', caption='Pestaña Capas: pulsa una capa para seleccionarla y ordénala con los cuatro botones.', blocks=[
('Seleccionar y ordenar', 'Pulsa una capa para seleccionarla en el lienzo; las demás pestañas muestran sus propiedades. Al frente, Subir, Bajar y Al fondo cambian su orden. Con el lienzo enfocado: Ctrl + ] sube, Ctrl + [ baja, Ctrl + Mayús + ] trae al frente y Ctrl + Mayús + [ envía al fondo.'),
('Formas e imágenes', 'Además de texto y rectángulo puedes añadir elipses y líneas; «Sin relleno» deja solo el contorno y el efecto Dibujar el trazo lo traza poco a poco. Imagen de paquete… añade los adornos de los paquetes instalados, que se mueven, escalan, giran y animan como el resto.'),
('Mismo resultado al exportar', 'El orden de las capas se guarda en el título, en Project Media y en el proyecto, y es el mismo en la vista previa y en el render.')])

TRAYECTORIA = dict(title='Trayectoria: mover un objeto por una ruta', section='MOVIMIENTO', lead='Un vídeo, una imagen con transparencia o un GIF animado pueden recorrer una ruta dibujada en pantalla. La zona de peso, por ejemplo la cabeza de un pájaro, va sobre la ruta y el cuerpo la sigue al girar.', image='37-trayectoria-zona.png', caption='Zona de peso marcada en la cabeza de Lítera; la flecha indica hacia dónde mira.', blocks=[
('Abrir el editor', 'Coloca el objeto en una pista por encima del fondo, selecciónalo y abre Herramientas > Efectos de vídeo > Trayectoria · ruta de movimiento… o el botón Trayectoria · ruta, junto a Pan/Crop. El lienzo muestra el fotograma real del proyecto.'),
('1. Marcar la zona de peso', 'Pulsa Zona de peso: el objeto aparece en reposo. Haz clic sobre el punto que manda, normalmente la cabeza. La flecha indica hacia dónde mira; cámbiala con Mira a la derecha, Mira a la izquierda o en grados.'),
('2. Dibujar la ruta', 'Pulsa Dibujar ruta. Cada clic añade un nodo al final; si arrastras al crearlo, la línea se curva. Arrastra nodos y tiradores para corregirla. Mayús + clic pone un nodo encima de otro, útil para cerrar un rizo. Doble clic borra un nodo y Ctrl + clic sobre la línea inserta uno. La zona gris queda fuera de cuadro, para entrar y salir de plano.')])

TRAYECTORIA2 = dict(title='Trayectoria: giro, tiempo y GIF animados', section='MOVIMIENTO', lead='Ajusta cuándo se recorre la ruta y cómo gira el objeto. Los fantasmas muestran seis poses a lo largo del camino.', image='38-trayectoria-ruta.png', caption='Un looping dibujado con el ratón: Lítera pasa boca abajo en lo alto del rizo, como un pájaro real.', blocks=[
('Tiempo y orientación', 'Elige inicio y fin (o Usar todo el clip), la aceleración y si se repite en bucle. La orientación puede girar con la ruta (loopings, flechas, naves), voltear al cambiar de sentido para que un animal de perfil no vaya boca abajo, o no girar. La inercia retrasa el cuerpo respecto a la cabeza en las curvas; también hay cabeceo extra y tamaño inicial y final.'),
('Comprobar y aplicar', 'Ver fantasmas, Reproducir y la barra de tiempo enseñan el movimiento sin salir del editor. Aplicar al clip se puede deshacer; Quitar trayectoria la elimina. Al dividir, recortar, repetir o estirar el clip se conserva la pose en cada instante.'),
('GIF animados con transparencia', 'Importa el GIF como un vídeo. La primera vez se convierte en tu equipo a un vídeo con transparencia y se guarda en caché; el proyecto sigue apuntando al GIF original. Si dura menos que el tramo, usa Repetir. Invertir o estabilizar un GIF pierde la transparencia.')])

PAQUETES = dict(title='Paquetes de contenido', section='AMPLIACIONES', lead='Los paquetes .lqpack añaden marcos de subtítulos, rótulos, imágenes, máscaras de transición y presets. Solo se instalan los firmados por LQTAC.', image='32-paquetes.png', caption='Opciones > Paquetes…: gestor de paquetes instalados.', blocks=[
('Instalar', 'Abre Paquetes… y pulsa Instalar paquete…, o haz doble clic en un archivo .lqpack. Antes de instalar se muestran el nombre, la versión, la firma y el contenido. Se rechazan los paquetes no oficiales y los modificados después de firmarlos. Un paquete solo contiene imágenes y datos, nunca programas.'),
('Usar el contenido', 'Marco en el editor de un subtítulo, o Marco de los subtítulos en las propiedades de la pista para todos; plantillas «· paquete» en el editor de títulos; Imagen de paquete… para adornos; Máscara de un paquete en las transiciones; y el grupo Paquetes en los presets.'),
('Activar o desinstalar', 'Activado oculta el paquete sin borrarlo; Desinstalar lo elimina. Un proyecto que use un paquete ausente se abre igual, pero ese marco o imagen no se dibuja hasta que vuelvas a tenerlo.')])

QBIT = dict(title='Asistente Qbit', section='AMPLIACIONES', lead='Qbit es un asistente opcional que funciona en tu equipo, sin conexión. Entiende peticiones en español sobre el proyecto abierto y propone los cambios antes de hacerlos.', image='33-qbit.png', caption='Ayuda > Asistente Qbit… o el botón Q de la barra lateral abren su panel flotante.', blocks=[
('Qué puede hacer', 'Poner transiciones entre dos clips seguidos, aplicar efectos de vídeo y de audio, fundidos de entrada y salida, quitar efectos y deshacer o rehacer. También contesta de forma breve preguntas de uso. Si falta información, por ejemplo qué clip, la pide.'),
('Siempre con tu permiso', 'Qbit enseña «Te propongo:» con la lista exacta de cambios y nada cambia hasta pulsar Aplicar. Ctrl + Z lo deshace como cualquier otro cambio.'),
('Instalación y tiempos', 'No viene en el ZIP: la primera vez el panel ofrece descargarlo (unos 2 GB, comprobados por partes). Se instala junto al programa. En un portátil sin gráfica dedicada tarda alrededor de un minuto en despertar y unos 6–10 s por respuesta.')])

MCP = dict(title='Control desde un asistente de IA (MCP)', section='AMPLIACIONES', lead='Opciones > Control MCP local permite que un asistente compatible, como Claude o Codex, monte y exporte tus proyectos en este equipo.', image='34-mcp.png', caption='Control MCP local: activar el acceso y copiar la configuración para cada asistente.', blocks=[
('Activar y conectar', 'Activa el control, elige tu asistente y pulsa Copiar configuración (Claude Code, Claude Desktop, Codex u otros). El asistente trabaja sobre el montaje visible: importa, edita, aplica efectos, crea trayectorias, transcribe y renderiza. Los medios no salen del equipo, aunque el asistente puede enviar a su proveedor los textos y vistas previas que pida.'),
('Grabación con permiso', 'Permitir grabación de pantalla mediante MCP está desactivado por defecto. Solo con él activado el asistente puede grabar una pantalla, una ventana o una zona. Los permisos de cámara y micrófono de Windows los contestas siempre tú.'),
('Grabar una zona sin MCP', 'En Grabar pantalla, elige la fuente, pulsa Preparar captura y después Seleccionar zona…: arrastra sobre la imagen para dibujar la zona que quieres grabar.')])

PREFS = dict(title='Preferencias, monitor y línea de tiempo', section='AJUSTES', lead='Los menús Ver y Opciones reúnen el aspecto, el monitor, la línea de tiempo y el autoguardado. Las preferencias son de este equipo y no se guardan en el proyecto.', image='30-preferencias.png', caption='Opciones > Preferencias…, también desde el botón de ajustes de la barra lateral.', blocks=[
('Monitor', 'Safe Areas muestra las zonas seguras: acción al 90 % y títulos al 80 %. Calidad elige Completa, Media o Borrador para aligerar la vista previa; la exportación siempre usa la calidad completa. El botón de pantalla completa amplía el monitor y Esc vuelve.'),
('Línea de tiempo', 'El imán pega los bordes a otros clips, al cabezal y a las marcas de render a menos de 8 píxeles; mantén Alt para soltar libre. En sus ajustes eliges la altura de las pistas, el formato del tiempo, las miniaturas y si la vista sigue al cabezal.'),
('Autoguardado y estado', 'El autoguardado (desactivado por defecto) guarda cada 1 a 15 minutos en el mismo LQTS, una vez guardado el proyecto. Encima del monitor verás «Cambios sin guardar» o «Guardado hace…», con un punto naranja si hay cambios pendientes.')])

TEMA = dict(title='Idioma y tema', section='AJUSTES', lead='Cinema Studio puede mostrarse en otros idiomas y con un tema claro. Ambos cambios son inmediatos y no cierran el proyecto.', image='39-tema-claro.png', caption='Tema claro: el monitor y los clips conservan sus colores para juzgar bien la imagen.', blocks=[
('Idioma', 'Opciones > Preferencias > Apariencia > Idioma: español, inglés, francés, chino simplificado o japonés. La etiqueta también dice «Language». Se traducen menús, editores y mensajes; los nombres de clips y pistas, los subtítulos y las notas se quedan como los escribiste. Este manual y los textos para asistentes MCP están en español.'),
('Tema', 'Ver > Apariencia u Opciones > Preferencias > Apariencia > Tema: Oscuro (por defecto) o Claro. Se recuerda en este equipo.')])

def add(pages):
    after(pages, 'FX de audio con escucha', PRESETS, ESPECIALES, SEGUIMIENTO, CROMA, AUDIO)
    after(pages, 'PAN: encuadrar y mover la cámara', TRAYECTORIA, TRAYECTORIA2)
    after(pages, 'Animar títulos y elegir fuentes', TITULOS, CAPAS)
    before(pages, 'Atajos de uso frecuente', PREFS, TEMA, PAQUETES, QBIT, MCP)
