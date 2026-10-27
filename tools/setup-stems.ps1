param([Parameter(Mandatory=$true)][string]$PythonExe,[string]$BuildDirectory)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
if(!$BuildDirectory){$BuildDirectory=Join-Path $root ('tmp\stems-'+[guid]::NewGuid().ToString('N'))}
$target=Join-Path $root 'desktop\stems\bin'
if(Test-Path -LiteralPath $target){throw 'El motor de separación ya existe; no se sobrescribe automáticamente.'}
& $PythonExe -m venv (Join-Path $BuildDirectory 'venv')
if($LASTEXITCODE -ne 0){throw 'No se pudo crear el entorno de compilación'}
$python=Join-Path $BuildDirectory 'venv\Scripts\python.exe'
& $python -m pip install --disable-pip-version-check 'torch==2.5.1' 'torchaudio==2.5.1' --index-url https://download.pytorch.org/whl/cpu
if($LASTEXITCODE -ne 0){throw 'No se pudo preparar PyTorch CPU'}
& $python -m pip install --disable-pip-version-check 'demucs==4.0.1' 'numpy==1.26.4' 'soundfile==0.13.1' 'pyinstaller==6.16.0'
if($LASTEXITCODE -ne 0){throw 'No se pudieron instalar las dependencias de Demucs'}
$model=Join-Path $root 'desktop\stems\models\955717e8-8726e21a.th'
New-Item -ItemType Directory -Force (Split-Path -Parent $model) | Out-Null
if(!(Test-Path -LiteralPath $model)){Invoke-WebRequest -Uri 'https://dl.fbaipublicfiles.com/demucs/hybrid_transformer/955717e8-8726e21a.th' -OutFile ($model+'.download');Move-Item -LiteralPath ($model+'.download') -Destination $model}
if((Get-FileHash -LiteralPath $model -Algorithm SHA256).Hash.ToLowerInvariant() -ne '8726e21a993978c7ba086d3872e7608d7d5bfca646ca4aca459ffda844faa8b4'){throw 'El hash del modelo no coincide'}
$worker=Join-Path $root 'desktop\stems-worker.py'
& $python -m PyInstaller --noconfirm --onedir --console --name lqtac-stems --distpath (Join-Path $BuildDirectory 'dist') --workpath (Join-Path $BuildDirectory 'build') --specpath $BuildDirectory --collect-all demucs --collect-all soundfile --collect-data dora --collect-data torchaudio --exclude-module tkinter --exclude-module matplotlib --exclude-module IPython --exclude-module tensorboard $worker
if($LASTEXITCODE -ne 0){throw 'No se pudo empaquetar el motor local'}
$compiled=Join-Path $BuildDirectory 'dist\lqtac-stems'
& $python (Join-Path $PSScriptRoot 'collect-stems-licenses.py') $compiled $worker
if($LASTEXITCODE -ne 0){throw 'No se pudieron conservar las licencias del motor'}
Copy-Item -LiteralPath $compiled -Destination $target -Recurse
Write-Output ('Motor local preparado en '+$target)
