$ErrorActionPreference='Stop'
$root='Software\LQTACStudioAssociationTests\'+[Guid]::NewGuid().ToString()
$project=Split-Path -Parent $PSScriptRoot
$config=@{testRoot=$root;executable=(Join-Path $project 'desktop\node_modules\electron\dist\LQTAC Studio.exe');appDirectory=(Join-Path $project 'desktop');icon=(Join-Path $project 'desktop\assets\lqtac-studio.ico')}
$script=Join-Path $project 'desktop\windows-association.ps1'
function Run-Registration{$env:LQTAC_ASSOC_CONFIG=$config | ConvertTo-Json -Compress;return (& $script | ConvertFrom-Json)}
function Assert($condition,$message){if(!$condition){throw $message}}
try{
  $first=Run-Registration
  Assert ($first.changed -and $first.defaultAssigned) 'Missing extension was not registered'
  $command=[Microsoft.Win32.Registry]::CurrentUser.OpenSubKey($root+'\Classes\LQTACStudio.Project\shell\open\command')
  try{Assert ($command.GetValue('') -ceq ('"'+$config.executable+'" "'+$config.appDirectory+'" "%1"')) 'Command quoting/Unicode incorrect'}finally{$command.Dispose()}
  Assert (!(Run-Registration).changed) 'Registration is not idempotent'
  $appCommand=[Microsoft.Win32.Registry]::CurrentUser.OpenSubKey($root+'\Classes\Applications\LQTAC Studio.exe\shell\open\command')
  try{Assert ($appCommand.GetValue('') -ceq $first.command) 'Explorer executable command does not match ProgID'}finally{$appCommand.Dispose()}
  $foreign=[Microsoft.Win32.Registry]::CurrentUser.CreateSubKey($root+'\Classes\Other.Editor\shell\open\command')
  $foreign.SetValue('','"C:\Other App\editor.exe" "%1"');$foreign.Dispose()
  $extension=[Microsoft.Win32.Registry]::CurrentUser.CreateSubKey($root+'\Classes\.lqts');$extension.SetValue('','Other.Editor');$extension.Dispose()
  $preserved=Run-Registration
  Assert ($preserved.preservedOtherDefault -and !$preserved.defaultAssigned) 'Foreign default was replaced'
  $choice=[Microsoft.Win32.Registry]::CurrentUser.CreateSubKey($root+'\UserChoice');$choice.SetValue('ProgId','Other.Editor');$choice.Dispose()
  Assert ((Run-Registration).preservedOtherDefault) 'Explicit UserChoice not preserved'
  $choice=[Microsoft.Win32.Registry]::CurrentUser.CreateSubKey($root+'\UserChoice');$choice.SetValue('ProgId','LQTACStudio.Project');$choice.Dispose()
  $config.executable=Join-Path $project 'desktop\node_modules\electron\dist\electron.exe'
  $moved=Run-Registration
  Assert ($moved.changed -and $moved.defaultAssigned) 'Owned association paths not refreshed'
  Assert (!(Run-Registration).changed) 'Updated association not idempotent'
  Write-Output 'Association: absent, quoted Unicode paths, idempotence, preserved foreign default/UserChoice and owned path refresh OK'
}finally{
  if($root -notmatch '^Software\\LQTACStudioAssociationTests\\[a-f0-9-]+$'){throw 'Unsafe test registry cleanup'}
  [Microsoft.Win32.Registry]::CurrentUser.DeleteSubKeyTree($root,$false)
  Remove-Item Env:LQTAC_ASSOC_CONFIG -ErrorAction SilentlyContinue
}
