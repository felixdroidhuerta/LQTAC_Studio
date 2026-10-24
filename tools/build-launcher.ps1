param([Parameter(Mandatory=$true)][string]$Output,[Parameter(Mandatory=$true)][string]$Icon)
$ErrorActionPreference='Stop'
$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if(!(Test-Path -LiteralPath $compiler)){throw 'Falta el compilador de .NET Framework de Windows para preparar el lanzador'}
$source=Join-Path $PSScriptRoot 'LqtacLauncher.cs'
& $compiler /nologo /target:winexe /platform:anycpu /reference:System.Windows.Forms.dll ('/win32icon:'+$Icon) ('/out:'+$Output) $source
if($LASTEXITCODE -ne 0){throw 'No se pudo compilar el lanzador de LQTAC'}
