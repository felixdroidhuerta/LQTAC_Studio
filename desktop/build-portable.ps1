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
Get-ChildItem -LiteralPath $runtime -Force | Where-Object { $_.Name -notin @('LQTAC Studio.exe','lqtac-icon.sha256') } | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $OutputDirectory -Recurse }
& (Join-Path $projectRoot 'tools\build-launcher.ps1') -Output (Join-Path $OutputDirectory 'LQTAC Studio.exe') -Icon (Join-Path $PSScriptRoot 'assets\lqtac-studio.ico')
$appRoot = Join-Path $OutputDirectory 'resources\app'
$desktopTarget = Join-Path $appRoot 'desktop'
New-Item -ItemType Directory -Path $desktopTarget -Force | Out-Null
foreach ($name in @('main.cjs','preload.cjs','veg-parser.cjs','vegas-bridge.cjs','vegas-automation.cjs','project-io.cjs','render-engine.cjs','reverse-media.cjs','media-visuals.cjs','effects-audio.cjs','audio-automation.cjs','subtitles-service.cjs','stems-service.cjs','audio-recording.cjs','camera-recording.cjs','capture-recording.cjs','screen-capture.cjs','capture-toolbox.cjs','capture-toolbox-preload.cjs','capture-toolbox.html','capture-toolbox-ui.js','windows-integration.cjs','windows-association.ps1')) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination $desktopTarget
}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'assets') -Destination $desktopTarget -Recurse
$codecTarget = Join-Path $desktopTarget 'codecs'
New-Item -ItemType Directory -Path $codecTarget -Force | Out-Null
$ffmpegRoot = Join-Path $PSScriptRoot 'node_modules\ffmpeg-static'
if (!(Test-Path -LiteralPath (Join-Path $ffmpegRoot 'ffmpeg.exe'))) { throw 'Falta FFmpeg local. Instala las dependencias de desarrollo antes de empaquetar.' }
foreach ($name in @('ffmpeg.exe','LICENSE','README.md','ffmpeg.exe.LICENSE','ffmpeg.exe.README')) {
    $source = Join-Path $ffmpegRoot $name
    if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination $codecTarget }
}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'EXPORTACION.md') -Destination $codecTarget
Copy-Item -LiteralPath (Join-Path $projectRoot 'dist') -Destination $appRoot -Recurse
$vegasTarget = Join-Path $appRoot 'tools\vegas'
New-Item -ItemType Directory -Path $vegasTarget -Force | Out-Null
foreach ($name in @('ExportLqtac.cs','ExportLqtac.cs.config')) {
    Copy-Item -LiteralPath (Join-Path $projectRoot ('tools\vegas\' + $name)) -Destination $vegasTarget
}
Copy-Item -LiteralPath (Join-Path $projectRoot 'Shapes') -Destination $OutputDirectory -Recurse
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'portable-package.json') -Destination (Join-Path $appRoot 'package.json')
Copy-Item -LiteralPath (Join-Path $projectRoot 'FUNCIONAMIENTO.md') -Destination $OutputDirectory
$stemsRoot=Join-Path $PSScriptRoot 'stems'
if(!(Test-Path -LiteralPath (Join-Path $stemsRoot 'bin\lqtac-stems.exe')) -or !(Test-Path -LiteralPath (Join-Path $stemsRoot 'models\955717e8-8726e21a.th'))){throw 'Falta el motor de separación offline. Ejecuta tools/setup-stems.ps1 antes de crear un nuevo portable.'}
$stemsManifest=Get-Content -LiteralPath (Join-Path $stemsRoot 'bin\runtime-manifest.json') -Raw | ConvertFrom-Json
if($stemsManifest.worker_sha256 -ne (Get-FileHash -LiteralPath (Join-Path $PSScriptRoot 'stems-worker.py') -Algorithm SHA256).Hash.ToLowerInvariant()){throw 'El worker de separación no coincide con su compilación; reconstruye el motor.'}
if((Get-FileHash -LiteralPath (Join-Path $stemsRoot 'models\955717e8-8726e21a.th') -Algorithm SHA256).Hash.ToLowerInvariant() -ne '8726e21a993978c7ba086d3872e7608d7d5bfca646ca4aca459ffda844faa8b4'){throw 'El peso Demucs está alterado.'}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'stems-worker.py') -Destination $desktopTarget
Copy-Item -LiteralPath $stemsRoot -Destination (Join-Path $desktopTarget 'stems') -Recurse
$manual = Join-Path $projectRoot ('output\pdf\LQTAC_Studio_Manual_de_usuario_' + (Get-Content -LiteralPath (Join-Path $PSScriptRoot 'portable-package.json') -Raw | ConvertFrom-Json).version + '.pdf')
if (!(Test-Path -LiteralPath $manual)) { throw 'Falta el manual PDF actualizado para esta versión.' }
Copy-Item -LiteralPath $manual -Destination (Join-Path $OutputDirectory 'Manual de usuario.pdf')
$speechRoot=Join-Path $PSScriptRoot 'speech'
if(!(Test-Path -LiteralPath (Join-Path $speechRoot 'models\ggml-small.bin'))){throw 'Falta el modelo offline de subtítulos. Ejecuta tools/setup-whisper.ps1.'}
$speechTarget=Join-Path $desktopTarget 'speech'
New-Item -ItemType Directory -Path $speechTarget -Force | Out-Null
foreach($required in @('faster\bin\lqtac-faster-whisper.exe','faster\bin\_internal','faster\bin\runtime-manifest.json','faster\bin\licenses','faster\models\small\model.bin','faster\models\small\config.json','faster\models\small\tokenizer.json','faster\models\small\vocabulary.txt')){if(!(Test-Path -LiteralPath (Join-Path $speechRoot $required))){throw ('Falta un recurso Faster INT8: '+$required+'. Ejecuta tools/setup-faster-whisper.ps1.')}}
$fasterManifest=Get-Content -LiteralPath (Join-Path $speechRoot 'faster\bin\runtime-manifest.json') -Raw | ConvertFrom-Json
if($fasterManifest.worker_sha256 -ne (Get-FileHash -LiteralPath (Join-Path $PSScriptRoot 'faster-whisper-worker.py') -Algorithm SHA256).Hash.ToLowerInvariant()){throw 'El worker Faster ha cambiado desde su compilación. Reconstruye el motor antes de empaquetar.'}
foreach($name in @('bin','models','faster','README.md','LICENSE-whisper.cpp.txt','LICENSE-model.txt')){Copy-Item -LiteralPath (Join-Path $speechRoot $name) -Destination $speechTarget -Recurse}
$archive = $OutputDirectory + '.zip'
Compress-Archive -LiteralPath $OutputDirectory -DestinationPath $archive -CompressionLevel Optimal
Write-Output $archive
