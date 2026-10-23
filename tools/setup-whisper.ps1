# Development-only preparation; the application never downloads at runtime.
$ErrorActionPreference='Stop'
$speechRoot=Join-Path (Split-Path -Parent $PSScriptRoot) 'desktop\speech'
$binaryUrl='https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.2/whisper-bin-x64.zip'
$modelUrl='https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-small.bin'
New-Item -ItemType Directory -Path (Join-Path $speechRoot 'bin'),(Join-Path $speechRoot 'models') -Force | Out-Null
function Get-VerifiedDownload($url,$file,$expected){
  if(Test-Path -LiteralPath $file){if((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLower() -eq $expected){return};throw "El archivo existente no coincide: $file"}
  $temporary=$file+'.download'
  Invoke-WebRequest -Uri $url -OutFile $temporary
  if((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash.ToLower() -ne $expected){throw "SHA-256 incorrecto: $temporary"}
  Move-Item -LiteralPath $temporary -Destination $file
}
$archive=Join-Path $speechRoot 'whisper-bin-x64.zip'
Get-VerifiedDownload $binaryUrl $archive '49dcc16de826f20bd53d44f947a1ae49dfa81f86cad67a64d80820cb192d674a'
if(!(Test-Path -LiteralPath (Join-Path $speechRoot 'bin\Release\whisper-cli.exe'))){Expand-Archive -LiteralPath $archive -DestinationPath (Join-Path $speechRoot 'bin')}
Get-VerifiedDownload $modelUrl (Join-Path $speechRoot 'models\ggml-small.bin') '1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b'
Write-Output 'Whisper small listo para funcionar offline y empaquetar.'
