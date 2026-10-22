$desktopRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $desktopRoot
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
pnpm start
