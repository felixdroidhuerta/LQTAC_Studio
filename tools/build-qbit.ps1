# Builds the optional Qbit module for a GitHub release (tag qbit-v<Version>):
#   qbit-<Version>.zip.001, .002…  ZIP split in parts (GitHub caps each release asset at 2 GiB)
#   qbit-manifest.json             version, minAppVersion, engine, total size/SHA-256 and each part's size/SHA-256
# The ZIP holds qbit.json, runtime/ (only what llama-server needs), models/ and licenses/.
# Usage: tools\build-qbit.ps1 -Version 1.0.0 [-Source <repo>\qbit] [-MinAppVersion 0.26.0] [-OutputDirectory …]
param([Parameter(Mandatory)][string]$Version,[string]$Source,[string]$MinAppVersion='0.26.0',[string]$OutputDirectory,[long]$PartSize=1GB,[string]$Notes='')
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
if(!$Source){$Source=Join-Path $projectRoot 'qbit'}
if(!$OutputDirectory){$OutputDirectory=Join-Path $projectRoot ('output\qbit-'+$Version)}
if(Test-Path -LiteralPath $OutputDirectory){throw 'La carpeta de salida ya existe. Elige otra para no sobrescribirla.'}
$info=Get-Content -LiteralPath (Join-Path $Source 'qbit.json') -Raw | ConvertFrom-Json
$model=Join-Path $Source $info.model
if(!(Test-Path -LiteralPath $model)){throw 'Falta el modelo: '+$model}
$licenses=Join-Path $Source 'licenses'
if(!(Test-Path -LiteralPath $licenses) -or !(Get-ChildItem -LiteralPath $licenses -File)){throw 'Falta la carpeta licenses con las licencias del motor y del modelo.'}
# llama-server and the libraries it loads (checked with llama-server --version on a pruned copy).
$runtimeFiles=@('llama-server.exe','llama-server-impl.dll','llama-common.dll','llama.dll','mtmd.dll','ggml.dll','ggml-base.dll','libomp.dll','LICENSE-LLVM-OpenMP')
$runtimeSource=Join-Path $Source 'runtime'
$staging=Join-Path $OutputDirectory 'staging'
New-Item -ItemType Directory -Path (Join-Path $staging 'runtime'),(Join-Path $staging 'models') -Force | Out-Null
foreach($name in $runtimeFiles){Copy-Item -LiteralPath (Join-Path $runtimeSource $name) -Destination (Join-Path $staging 'runtime')}
Get-ChildItem -LiteralPath $runtimeSource -Filter 'ggml-cpu-*.dll' | Copy-Item -Destination (Join-Path $staging 'runtime')
Copy-Item -LiteralPath $model -Destination (Join-Path $staging 'models')
Copy-Item -LiteralPath $licenses -Destination $staging -Recurse
# llama-server prints its version on stderr, which Windows PowerShell turns into an error under 'Stop'.
$ErrorActionPreference='Continue';& (Join-Path $staging 'runtime\llama-server.exe') --version 2>$null | Out-Null;$ErrorActionPreference='Stop'
if($LASTEXITCODE -ne 0){throw 'El motor recortado no arranca; revisa la lista de archivos del runtime.'}
$manifestInfo=[ordered]@{version=$Version;engine=$info.engine;runtime='runtime/llama-server.exe';model='models/'+(Split-Path -Leaf $model)}
[IO.File]::WriteAllText((Join-Path $staging 'qbit.json'),($manifestInfo|ConvertTo-Json),[Text.UTF8Encoding]::new($false))
# Compress-Archive in Windows PowerShell cannot handle files over 2 GB; the system tar can.
$zip=Join-Path $OutputDirectory ('qbit-'+$Version+'.zip')
& (Join-Path $env:SystemRoot 'System32\tar.exe') -a -cf $zip -C $staging qbit.json runtime models licenses
if($LASTEXITCODE -ne 0){throw 'No se pudo crear el ZIP'}
Remove-Item -LiteralPath $staging -Recurse -Force
$total=(Get-Item -LiteralPath $zip).Length
$sha=(Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
$parts=@();$reader=[IO.File]::OpenRead($zip);$buffer=New-Object byte[] (8MB);$index=0
try{
  while($reader.Position -lt $total){
    $index++;$name=('qbit-{0}.zip.{1:000}' -f $Version,$index);$path=Join-Path $OutputDirectory $name;$out=[IO.File]::Create($path);$written=0L
    try{while($written -lt $PartSize -and $reader.Position -lt $total){$n=$reader.Read($buffer,0,[int][Math]::Min($buffer.Length,$PartSize-$written));$out.Write($buffer,0,$n);$written+=$n}}finally{$out.Dispose()}
    $parts+=[ordered]@{name=$name;size=$written;sha256=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()}
  }
}finally{$reader.Dispose()}
Remove-Item -LiteralPath $zip
$manifest=[ordered]@{version=$Version;minAppVersion=$MinAppVersion;engine=$info.engine;size=$total;sha256=$sha;parts=$parts;notes=$Notes}
[IO.File]::WriteAllText((Join-Path $OutputDirectory 'qbit-manifest.json'),($manifest|ConvertTo-Json -Depth 4),[Text.UTF8Encoding]::new($false))
Write-Output $OutputDirectory
