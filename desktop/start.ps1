$desktopRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $desktopRoot
pnpm start
