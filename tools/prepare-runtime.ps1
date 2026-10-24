$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$runtime=Join-Path $projectRoot 'desktop\node_modules\electron\dist'
$original=Join-Path $runtime 'electron.exe'
$branded=Join-Path $runtime 'LQTAC Studio.exe'
$icon=Join-Path $projectRoot 'desktop\assets\lqtac-studio.ico'
if(!(Test-Path -LiteralPath $original)){throw 'Falta el motor de escritorio'}
if(!(Test-Path -LiteralPath $icon)){throw 'Falta el icono de LQTAC Studio'}
$fingerprint=(Get-FileHash -LiteralPath $original -Algorithm SHA256).Hash+':'+(Get-FileHash -LiteralPath $icon -Algorithm SHA256).Hash
$stamp=Join-Path $runtime 'lqtac-icon.sha256'
if((Test-Path -LiteralPath $branded) -and (Test-Path -LiteralPath $stamp) -and (Get-Content -LiteralPath $stamp -Raw).Trim() -eq $fingerprint){exit 0}
Copy-Item -LiteralPath $original -Destination $branded -Force
& (Join-Path $PSScriptRoot 'set-executable-icon.ps1') -Executable $branded -Icon $icon
Set-Content -LiteralPath $stamp -Value $fingerprint -Encoding ASCII
