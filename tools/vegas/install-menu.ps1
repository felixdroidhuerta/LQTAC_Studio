$ErrorActionPreference='Stop'
$destination=Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Vegas Script Menu'
New-Item -ItemType Directory -Path $destination -Force | Out-Null
foreach($pair in @(@('ExportLqtac.cs','LQTAC Export Bridge.cs'),@('ExportLqtac.cs.config','LQTAC Export Bridge.cs.config'))){
    $source=Join-Path $PSScriptRoot $pair[0]
    $target=Join-Path $destination $pair[1]
    if(Test-Path -LiteralPath $target){
        if((Get-FileHash -LiteralPath $source).Hash -ne (Get-FileHash -LiteralPath $target).Hash){throw "Ya existe otro script en $target. Se conserva sin sobrescribir."}
    }else{Copy-Item -LiteralPath $source -Destination $target}
}
Write-Output "Instalado en $destination. En VEGAS: Herramientas > Creación de secuencias de comandos > Volver a explorar carpeta; después LQTAC Export Bridge."
