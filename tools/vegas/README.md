# Puente VEGAS → LQTAC: versión 0.5.1

Conversión integrada: en LQTAC pulsa **Abrir proyecto VEGAS** y elige el `.veg`. Si no existe un puente vigente, LQTAC detecta VEGAS en Program Files/VEGAS, lo inicia y ejecuta el exportador automáticamente. No necesitas abrir VEGAS previamente. Se convierte la copia guardada; guarda antes cualquier cambio pendiente. Si VEGAS muestra avisos de medios o licencia, resuélvelos en su ventana. El plazo de espera es de tres minutos y no se fuerza el cierre del proceso.

Alternativa manual: abrir el proyecto guardado en VEGAS y ejecutar **ExportLqtac.cs**, con su archivo `.config` al lado. Crea un JSON nuevo junto al VEG. En LQTAC, **Abrir proyecto VEGAS** carga el VEG con ese JSON y verifica la huella SHA-256. Después guardar como LQTS. No se modifican los medios ni el VEG. Los cambios posteriores del VEG necesitan una nueva exportación.

`install-menu.ps1` instala una copia del script y su configuración en Documentos/Vegas Script Menu. Volver a explorar las secuencias de comandos en VEGAS para ver **LQTAC Export Bridge**. El instalador preserva cualquier copia diferente que encuentre.

El lector/mapeador es `desktop/vegas-bridge.cjs`. Los parámetros no representables bloquean la importación; los plugins externos se omiten con un informe, conforme al alcance acordado. El LQTS conserva la procedencia y el informe. La apertura directa del binario VEG sin exportación inicial de su API no está implementada.

El exportador calibra seis curvas mediante Envelope.ValueAt en una copia temporal, dentro de su propio UndoBlock; no añade envolventes a la sesión original. La instalación probada es VEGAS Pro 22 build 250. La coincidencia de tablas permite usar fórmulas analíticas en vez de aproximarlas con segmentos. `CaptureReference.cs` genera cinco imágenes de referencia local y restaura el cursor; no guarda el VEG.

La prueba `desktop/verify-vegas.cjs` incluye estructura exacta, rechazo de incompatibilidades, huella obsoleta, persistencia, exportación y compositor. Puede recibir como argumento un `current-bridge.json` personal y `--reference=carpeta` para comparar cinco fotogramas; no se incluyen medios personales en el repositorio. Ver la sección 0.5.0 al final de FUNCIONAMIENTO.md para el alcance y resultados; el color, audio y remuestreo integral no están certificados como idénticos.

## Herramientas de diagnóstico anteriores

`DiagnoseLqtac.cs` se ejecuta dentro de VEGAS Pro mediante Herramientas → Creación de secuencias de comandos → Ejecutar secuencia de comandos. Mantener junto a él `DiagnoseLqtac.cs.config`, que referencia System.Web.Extensions para serializar JSON con cultura independiente y escapes correctos.

Lee la sesión abierta sin modificar eventos, guardar el VEG, renderizar ni escribir en los medios. Genera un JSON nuevo en `diagnostics/`, junto al script, y muestra su ruta. Conserva posiciones, duraciones y offsets en segundos, tomas, streams, grupos, fades, efectos, envolventes, pan/crop y movimiento de pista. Los errores de lectura se registran; no se interpretan como ausencia de características. No extrae todos los parámetros de plugins.

Desde la raíz del proyecto:

```powershell
node tools/vegas/summarize-diagnostic.cjs "ruta al diagnostico.json"
```

Genera un inventario `.compatibility.json` y un resumen `.compatibility.md`, sin sobrescribir archivos existentes. Enumera diferencias conocidas respecto al modelo actual de LQTAC. La ausencia de bloqueos detectados en ese diagnóstico no certifica compatibilidad. Para la importación actual se usa ExportLqtac.cs y vegas-bridge.cjs.

Verificado dentro de VEGAS Pro 22 build 250, el 22/10/2026, con el proyecto abierto del usuario: 5 pistas, 19 eventos, cero errores de lectura en la versión corregida y estado IsModified=false antes y después. Todos los medios del pool estaban presentes y online. Detectados velocidad alterada, mute de pista, cadenas de efectos de audio, curvas no lineales y ganancia de evento. El primer intento reveló colecciones COM no enumerables en fades sin transición; se corrigió y volvió a ejecutar.

Los diagnósticos contienen rutas y datos personales del montaje: permanecen excluidos de Git. No incluir canciones ni proyectos personales como fixtures. El portable incluye ExportLqtac.cs y su configuración para la conversión integrada; los diagnósticos y capturas de referencia no se empaquetan.

Referencia: [FAQ oficial de scripting VEGAS Pro 22](https://help.magix-hub.com/video/vegas/22/en/content/topics/external/vegasscriptfaq.html), documentación XML y DLL de la instalación local.
