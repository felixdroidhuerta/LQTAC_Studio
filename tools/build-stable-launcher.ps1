param(
  [string]$Output = (Join-Path (Split-Path -Parent $PSScriptRoot) 'desktop\assets\cinema-studio-stable.exe'),
  [string]$Icon = (Join-Path (Split-Path -Parent $PSScriptRoot) 'desktop\assets\lqtac-studio.ico')
)
$ErrorActionPreference='Stop'
$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if(!(Test-Path -LiteralPath $compiler)){throw 'Falta el compilador de .NET Framework de Windows para preparar el lanzador estable'}
$source=Join-Path $PSScriptRoot 'CinemaStudioStableLauncher.cs'
$directory=Split-Path -Parent $Output
if(!(Test-Path -LiteralPath $directory)){New-Item -ItemType Directory -Path $directory | Out-Null}
& $compiler /nologo /target:winexe /platform:anycpu /reference:System.Windows.Forms.dll ('/win32icon:'+$Icon) ('/out:'+$Output) $source
if($LASTEXITCODE -ne 0){throw 'No se pudo compilar el lanzador estable de Cinema Studio'}
Write-Output $Output
