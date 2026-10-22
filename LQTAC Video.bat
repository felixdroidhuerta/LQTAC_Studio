@echo off
setlocal
cd /d "%~dp0desktop"
if not exist "node_modules\electron\dist\electron.exe" (
  echo No se encuentra el motor de LQTAC Video en esta carpeta.
  pause
  exit /b 1
)
set "ELECTRON_RUN_AS_NODE="
start "" "node_modules\electron\dist\electron.exe" "%~dp0desktop"
endlocal
