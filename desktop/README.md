# LQTAC Video Desktop

Aplicación local Electron que carga la interfaz de LQTAC Video sin depender del navegador ni de Sites.

## Ejecutar

```powershell
cd desktop
pnpm install
pnpm start
```

En Windows también puedes ejecutar `start.ps1` desde esta carpeta después de instalar las dependencias.

El botón **Abrir proyecto VEGAS** abre un selector nativo y analiza `.veg`/`.vf` como contenedores binarios RIFF, recuperando referencias de media, nombres de pistas, títulos, buses, versión de VEGAS y FX detectables. Las referencias que estaban en una unidad antigua aparecen como media fuera de ruta para que puedan relincarse.

Para una reconstrucción de timeline de máxima fidelidad, LQTAC Video acepta además XML/EDL/FCPXML exportados desde VEGAS.
