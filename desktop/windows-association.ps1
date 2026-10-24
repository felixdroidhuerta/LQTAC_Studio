$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
$config=$env:LQTAC_ASSOC_CONFIG | ConvertFrom-Json
$testMode=[bool]$config.testRoot
if($testMode -and $config.testRoot -notmatch '^Software\\LQTACStudioAssociationTests\\[a-f0-9-]+$'){throw 'Registro de prueba no válido'}
$classes=if($testMode){$config.testRoot+'\Classes'}else{'Software\Classes'}
$choice=if($testMode){$config.testRoot+'\UserChoice'}else{'Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.lqts\UserChoice'}
$progid='LQTACStudio.Project.1'
$ownProgids=@($progid,'LQTACStudio.Project')
$script:changed=$false
function Read-Value($hive,$key,$name=''){
  $opened=$hive.OpenSubKey($key)
  if(!$opened){return $null}
  try{return $opened.GetValue($name,$null,[Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)}finally{$opened.Dispose()}
}
function Put-Value($key,$name,$value){
  $old=Read-Value ([Microsoft.Win32.Registry]::CurrentUser) $key $name
  if($null -ne $old -and [string]$old -ceq [string]$value){return}
  $opened=[Microsoft.Win32.Registry]::CurrentUser.CreateSubKey($key)
  try{$opened.SetValue($name,[string]$value,[Microsoft.Win32.RegistryValueKind]::String);$script:changed=$true}finally{$opened.Dispose()}
}
function Effective-Value($key){
  $value=Read-Value ([Microsoft.Win32.Registry]::CurrentUser) ($classes+'\'+$key)
  if($null -eq $value -and !$testMode){$value=Read-Value ([Microsoft.Win32.Registry]::ClassesRoot) $key}
  return $value
}
if(!(Test-Path -LiteralPath $config.executable -PathType Leaf) -or !(Test-Path -LiteralPath $config.icon -PathType Leaf)){throw 'Falta el ejecutable o el icono para asociar proyectos'}
$command='"'+$config.executable+'"'
if($config.appDirectory){$command+=' "'+$config.appDirectory+'"'}
$command+=' "%1"'
$userChoice=Read-Value ([Microsoft.Win32.Registry]::CurrentUser) $choice 'ProgId'
$assigned=if($userChoice){$userChoice}else{Effective-Value '.lqts'}
$existingCommand=if($assigned){Effective-Value ($assigned+'\shell\open\command')}else{$null}
$isOwned=$assigned -and ($ownProgids -contains $assigned)
$claimDefault=(!$userChoice -and (!$assigned -or !$existingCommand -or $isOwned))
$iconRevision=(Get-FileHash -LiteralPath $config.icon -Algorithm SHA256).Hash
foreach($own in $ownProgids){
  Put-Value ($classes+'\'+$own) '' 'Proyecto LQTAC Studio'
  Put-Value ($classes+'\'+$own+'\DefaultIcon') '' ('"'+$config.icon+'",0')
  Put-Value ($classes+'\'+$own) 'IconRevision' $iconRevision
  Put-Value ($classes+'\'+$own+'\shell\open\command') '' $command
  Put-Value ($classes+'\'+$own+'\shell\open') 'FriendlyAppName' 'LQTAC Studio'
}
$executableName=[System.IO.Path]::GetFileName($config.executable)
if($executableName -ieq 'LQTAC Studio.exe'){
  # Explorer can use the remembered executable from OpenWithList instead of the ProgID.
  # Register our own executable as well; never claim the generic electron.exe application.
  $application=$classes+'\Applications\'+$executableName
  Put-Value $application 'FriendlyAppName' 'LQTAC Studio'
  Put-Value ($application+'\DefaultIcon') '' ('"'+$config.icon+'",0')
  Put-Value ($application+'\shell\open\command') '' $command
  Put-Value ($application+'\SupportedTypes') '.lqts' ''
}
Put-Value ($classes+'\.lqts\OpenWithProgids') $progid ''
if($claimDefault){Put-Value ($classes+'\.lqts') '' $progid}
$capabilities=if($testMode){$config.testRoot+'\Capabilities'}else{'Software\LQTACStudio\Capabilities'}
Put-Value $capabilities 'ApplicationName' 'LQTAC Studio'
Put-Value $capabilities 'ApplicationDescription' 'Editor local de video y audio LQTAC Studio'
Put-Value $capabilities 'ApplicationIcon' ('"'+$config.icon+'",0')
Put-Value ($capabilities+'\FileAssociations') '.lqts' $progid
$registered=if($testMode){$config.testRoot+'\RegisteredApplications'}else{'Software\RegisteredApplications'}
Put-Value $registered 'LQTAC Studio' $capabilities
if($script:changed -and !$testMode){
  Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class LqtacShellNotify { [DllImport("shell32.dll")] public static extern void SHChangeNotify(uint e,uint f,IntPtr a,IntPtr b); }'
  [LqtacShellNotify]::SHChangeNotify(0x08000000,0x1000,[IntPtr]::Zero,[IntPtr]::Zero)
}
@{changed=$script:changed;registered=$true;defaultAssigned=($claimDefault -or $isOwned);preservedOtherDefault=([bool]$assigned -and !$isOwned -and !$claimDefault);command=$command} | ConvertTo-Json -Compress
