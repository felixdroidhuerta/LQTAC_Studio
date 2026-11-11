# Builds the optional "IA precisa" module (SAM 2.1 tiny, CPU) as a ZIP + manifest for a GitHub release ai-pro-v<Version>.
# Requires the build venv prepared in $BuildDirectory (Python 3.12, torch 2.5.1+cpu, torchvision 0.20.1+cpu,
# SAM 2 at commit 2b90b9f5ceec907a1c18123530e92e794ad901a4 installed with SAM2_BUILD_CUDA=0, PyInstaller 6.16.0).
param([string]$Version='1.0.0',[string]$MinAppVersion='0.19.2',[string]$BuildDirectory)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
if(!$BuildDirectory){$BuildDirectory=Join-Path $root 'tmp\ai-pro-build'}
$python=Join-Path $BuildDirectory 'venv\Scripts\python.exe'
if(!(Test-Path -LiteralPath $python)){throw 'Falta el entorno de compilación (venv) del módulo IA pro'}
$model=Join-Path $BuildDirectory 'models\sam2.1_hiera_tiny.pt'
if(!(Test-Path -LiteralPath $model)){New-Item -ItemType Directory -Force (Split-Path -Parent $model)|Out-Null;Invoke-WebRequest -Uri 'https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_tiny.pt' -OutFile ($model+'.download');Move-Item -LiteralPath ($model+'.download') -Destination $model}
if((Get-FileHash -LiteralPath $model -Algorithm SHA256).Hash.ToLowerInvariant() -ne '7402e0d864fa82708a20fbd15bc84245c2f26dff0eb43a4b5b93452deb34be69'){throw 'El hash del modelo SAM 2 no coincide'}
$worker=Join-Path $root 'desktop\ai-pro-worker.py'
& $python -m PyInstaller --noconfirm --onedir --console --name lqtac-ai-pro --distpath (Join-Path $BuildDirectory 'dist') --workpath (Join-Path $BuildDirectory 'build') --specpath $BuildDirectory --collect-all sam2 --collect-all hydra --collect-all omegaconf --collect-submodules iopath --exclude-module tkinter --exclude-module matplotlib --exclude-module IPython --exclude-module tensorboard --exclude-module torchaudio $worker
if($LASTEXITCODE -ne 0){throw 'No se pudo empaquetar el motor IA pro'}
$compiled=Join-Path $BuildDirectory 'dist\lqtac-ai-pro'
& $python (Join-Path $PSScriptRoot 'collect-stems-licenses.py') $compiled $worker 'sam2.1-hiera-tiny-cpu' 'sam2.1_hiera_tiny'
if($LASTEXITCODE -ne 0){throw 'No se pudieron conservar las licencias del motor'}
$package=Join-Path $BuildDirectory 'package'
if(Test-Path -LiteralPath $package){Remove-Item -LiteralPath $package -Recurse -Force}
New-Item -ItemType Directory -Force (Join-Path $package 'models'),(Join-Path $package 'licenses')|Out-Null
Copy-Item -LiteralPath $compiled -Destination (Join-Path $package 'bin') -Recurse
Copy-Item -LiteralPath $model -Destination (Join-Path $package 'models')
$samSource=Get-ChildItem -LiteralPath (Join-Path $BuildDirectory 'src') -Directory -Filter 'sam2-*'|Select-Object -First 1
Copy-Item -LiteralPath (Join-Path $samSource.FullName 'LICENSE') -Destination (Join-Path $package 'licenses\SAM2-Apache-2.0-LICENSE.txt')
@"
Módulo IA precisa de Cinema Studio $Version
Motor: SAM 2.1 Hiera tiny (Meta, Apache 2.0) · https://github.com/facebookresearch/sam2 · commit 2b90b9f5ceec907a1c18123530e92e794ad901a4
Modelo: sam2.1_hiera_tiny.pt · SHA-256 7402e0d864fa82708a20fbd15bc84245c2f26dff0eb43a4b5b93452deb34be69
Funciona sin red en CPU. Los avisos de PyTorch y demás dependencias están en bin\licenses y la lista de versiones en bin\runtime-manifest.json.
"@|Set-Content -LiteralPath (Join-Path $package 'README.txt') -Encoding UTF8
[ordered]@{name='Cinema Studio · IA precisa';version=$Version;engine='sam2.1-hiera-tiny-cpu';entry='bin/lqtac-ai-pro.exe';model='models/sam2.1_hiera_tiny.pt'}|ConvertTo-Json|ForEach-Object{[IO.File]::WriteAllText((Join-Path $package 'ai-pro.json'),$_,(New-Object Text.UTF8Encoding $false))}
$release=Join-Path $BuildDirectory 'release';New-Item -ItemType Directory -Force $release|Out-Null
$zipName="Cinema_Studio_IA_pro_${Version}_Windows_x64.zip";$zip=Join-Path $release $zipName
if(Test-Path -LiteralPath $zip){Remove-Item -LiteralPath $zip -Force}
& "$env:SystemRoot\System32\tar.exe" -a -cf $zip -C $package ai-pro.json README.txt bin models licenses
if($LASTEXITCODE -ne 0){throw 'No se pudo crear el ZIP'}
$size=(Get-Item -LiteralPath $zip).Length;$sha=(Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
[ordered]@{version=$Version;package=$zipName;size=$size;sha256=$sha;minAppVersion=$MinAppVersion;engine='sam2.1-hiera-tiny-cpu';notes='SAM 2.1 tiny en CPU. Análisis previo, sin red.'}|ConvertTo-Json|ForEach-Object{[IO.File]::WriteAllText((Join-Path $release 'ai-pro-manifest.json'),$_,(New-Object Text.UTF8Encoding $false))}
Write-Output "Paquete: $zip ($size bytes, SHA-256 $sha)"
