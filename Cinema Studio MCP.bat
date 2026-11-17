@echo off
setlocal
set "ELECTRON_RUN_AS_NODE=1"
if exist "%~dp0electron.exe" (
  "%~dp0electron.exe" "%~dp0resources\app\desktop\mcp-server.cjs"
) else (
  "%~dp0desktop\node_modules\electron\dist\electron.exe" "%~dp0desktop\mcp-server.cjs"
)
