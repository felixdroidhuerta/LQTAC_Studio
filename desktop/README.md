# LQTAC Video Desktop

Aplicación local Electron que carga la interfaz de LQTAC Video sin depender del navegador ni de Sites.

## Ejecutar

```powershell
cd desktop
pnpm install
pnpm start
```

En Windows también puedes ejecutar `start.ps1` desde esta carpeta después de instalar las dependencias.

El botón **Abrir proyecto VEGAS** abre un selector nativo e inspecciona cadenas de `.veg`/`.vf` para detectar posibles referencias y metadatos. Es un lector heurístico: no reconstruye el montaje, no garantiza los nombres/efectos detectados y no permite todavía una relocalización interactiva completa.

La inspección de XML/EDL/FCPXML tampoco es un importador completo de timeline. La persistencia funcional actual utiliza `.LQTS`. Consulta [developer.md](../developer.md) para el esquema, las pruebas y el plan pendiente del puente de conversión desde VEGAS Pro.
