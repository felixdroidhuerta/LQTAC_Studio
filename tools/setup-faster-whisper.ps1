param([string]$PythonExe='python',[string]$BuildPython,[string]$ModelSource)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$fasterRoot=Join-Path $projectRoot 'desktop\speech\faster'
$runtimeTarget=Join-Path $fasterRoot 'bin'
if(Test-Path -LiteralPath $runtimeTarget){throw 'El motor Faster ya existe. No se sobrescribe automáticamente; usa un destino limpio de desarrollo.'}
$buildRoot=Join-Path $projectRoot ('tmp\faster-build-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $buildRoot -Force | Out-Null
if(!$BuildPython){
 & $PythonExe -m venv (Join-Path $buildRoot 'venv')
 if($LASTEXITCODE -ne 0){throw 'No se pudo crear Python de desarrollo'}
 $BuildPython=Join-Path $buildRoot 'venv\Scripts\python.exe'
}
& $BuildPython -m pip install --disable-pip-version-check 'faster-whisper==1.2.1' 'ctranslate2==4.8.3' 'av==16.1.0' 'numpy==2.5.4' 'pyinstaller==6.16.0'
if($LASTEXITCODE -ne 0){throw 'No se pudieron preparar las dependencias fijadas'}
$modelTarget=Join-Path $fasterRoot 'models\small'
New-Item -ItemType Directory -Path $modelTarget -Force | Out-Null
$hashes=@{'model.bin'='3e305921506d8872816023e4c273e75d2419fb89b24da97b4fe7bce14170d671';'config.json'='b55496ac7940a7ae47d2c01eab40edfd8701feec1229d9cce3b40014383fb828';'tokenizer.json'='fb7b63191e9bb045082c79fd742a3106a12c99513ab30df4a0d47fa6cb6fd0ab';'vocabulary.txt'='34ce3fe1c5041027b3f8d42912270993f986dbc4bb34cf27f951e34a1e453913'}
foreach($name in $hashes.Keys){
 $destination=Join-Path $modelTarget $name
 if(!(Test-Path -LiteralPath $destination)){
  if($ModelSource){$source=Join-Path $ModelSource $name;if((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne $hashes[$name]){throw ('Modelo de origen alterado: '+$name)};Copy-Item -LiteralPath $source -Destination $destination}
  else{$download=$destination+'.download';Invoke-WebRequest -Uri ('https://huggingface.co/Systran/faster-whisper-small/resolve/536b0662742c02347bc0e980a01041f333bce120/'+$name) -OutFile $download;if((Get-FileHash -LiteralPath $download -Algorithm SHA256).Hash.ToLowerInvariant() -ne $hashes[$name]){throw ('Descarga alterada: '+$name)};Move-Item -LiteralPath $download -Destination $destination}
 }
 if((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant() -ne $hashes[$name]){throw ('Modelo local alterado: '+$name)}
}
$worker=Join-Path $projectRoot 'desktop\faster-whisper-worker.py'
& $BuildPython -m PyInstaller --noconfirm --onedir --console --name lqtac-faster-whisper --distpath (Join-Path $buildRoot 'dist') --workpath (Join-Path $buildRoot 'build') --specpath $buildRoot --collect-all faster_whisper --collect-all ctranslate2 --collect-all av --collect-all onnxruntime --collect-all tokenizers $worker
if($LASTEXITCODE -ne 0){throw 'No se pudo generar el motor portable'}
$compiled=Join-Path $buildRoot 'dist\lqtac-faster-whisper'
& $BuildPython (Join-Path $PSScriptRoot 'collect-faster-licenses.py') $compiled $worker
if($LASTEXITCODE -ne 0){throw 'No se pudieron conservar licencias y manifiesto'}
Copy-Item -LiteralPath $compiled -Destination $runtimeTarget -Recurse
Write-Output ('Motor offline listo: '+(Join-Path $runtimeTarget 'lqtac-faster-whisper.exe'))
