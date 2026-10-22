param([string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtime = Join-Path $PSScriptRoot 'node_modules\electron\dist'
if (!(Test-Path -LiteralPath (Join-Path $runtime 'electron.exe'))) {
    throw 'Falta Electron en el equipo de desarrollo. Instala las dependencias antes de generar el paquete.'
}
if (!$OutputDirectory) { $OutputDirectory = Join-Path (Split-Path -Parent $projectRoot) ('LQTAC_Studio_Portable_' + (Get-Date -Format 'yyyyMMdd_HHmmss')) }
if (Test-Path -LiteralPath $OutputDirectory) { throw 'La carpeta de salida ya existe. Elige otra para no sobrescribirla.' }
New-Item -ItemType Directory -Path $OutputDirectory | Out-Null
Get-ChildItem -LiteralPath $runtime -Force | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $OutputDirectory -Recurse }
Rename-Item -LiteralPath (Join-Path $OutputDirectory 'electron.exe') -NewName 'LQTAC Studio.exe'
$appRoot = Join-Path $OutputDirectory 'resources\app'
$desktopTarget = Join-Path $appRoot 'desktop'
New-Item -ItemType Directory -Path $desktopTarget -Force | Out-Null
foreach ($name in @('main.cjs','preload.cjs','veg-parser.cjs')) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination $desktopTarget
}
Copy-Item -LiteralPath (Join-Path $projectRoot 'dist') -Destination $appRoot -Recurse
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'portable-package.json') -Destination (Join-Path $appRoot 'package.json')
Copy-Item -LiteralPath (Join-Path $projectRoot 'FUNCIONAMIENTO.md') -Destination $OutputDirectory
$archive = $OutputDirectory + '.zip'
Compress-Archive -LiteralPath $OutputDirectory -DestinationPath $archive -CompressionLevel Optimal
Write-Output $archive
