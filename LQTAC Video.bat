@echo off
setlocal
if exist "%~dp0LQTAC Studio.exe" (
  set "ELECTRON_RUN_AS_NODE="
  start "" "%~dp0LQTAC Studio.exe"
  exit /b 0
)
cd /d "%~dp0desktop"
if not exist "node_modules\electron\dist\electron.exe" (
  echo Esta carpeta contiene el codigo fuente, pero no el motor de escritorio.
  echo Para un equipo nuevo utiliza el paquete LQTAC_Studio_Portable.zip.
  echo Extrae el ZIP completo y abre LQTAC Studio.exe dentro de la carpeta.
  pause
  exit /b 1
)
set "ELECTRON_RUN_AS_NODE="
start "" "node_modules\electron\dist\electron.exe" "%~dp0desktop"
endlocal
