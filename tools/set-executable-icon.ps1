param([Parameter(Mandatory=$true)][string]$Executable,[Parameter(Mandatory=$true)][string]$Icon)
$ErrorActionPreference='Stop'
$exePath=(Resolve-Path -LiteralPath $Executable).Path
$icoPath=(Resolve-Path -LiteralPath $Icon).Path
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;
public static class LqtacIconResource {
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr BeginUpdateResource(string file,bool deleteExisting);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool UpdateResource(IntPtr handle,IntPtr type,IntPtr name,ushort language,byte[] data,uint size);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool EndUpdateResource(IntPtr handle,bool discard);
  static void Check(bool value){if(!value)throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());}
  public static void Set(string executable,string icon){
    byte[] ico=File.ReadAllBytes(icon);
    if(ico.Length<22||BitConverter.ToUInt16(ico,2)!=1)throw new Exception("ICO no válido");
    int count=BitConverter.ToUInt16(ico,4);if(count<1||count>32||ico.Length<6+16*count)throw new Exception("ICO incompleto");
    byte[] group=new byte[6+14*count];Array.Copy(ico,group,6);
    IntPtr handle=BeginUpdateResource(executable,false);if(handle==IntPtr.Zero)throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
    bool success=false;
    try{for(int i=0;i<count;i++){
      int at=6+16*i,length=BitConverter.ToInt32(ico,at+8),offset=BitConverter.ToInt32(ico,at+12);
      if(length<1||offset<0||(long)offset+length>ico.Length)throw new Exception("Imagen ICO incompleta");
      byte[] image=new byte[length];Array.Copy(ico,offset,image,0,length);
      Array.Copy(ico,at,group,6+14*i,12);Array.Copy(BitConverter.GetBytes((ushort)(i+1)),0,group,18+14*i,2);
      foreach(ushort lang in new ushort[]{0,1033})Check(UpdateResource(handle,(IntPtr)3,(IntPtr)(i+1),lang,image,(uint)image.Length));
    }
    foreach(ushort lang in new ushort[]{0,1033})Check(UpdateResource(handle,(IntPtr)14,(IntPtr)1,lang,group,(uint)group.Length));
    success=true;
    }finally{Check(EndUpdateResource(handle,!success));}
  }
}
'@
[LqtacIconResource]::Set($exePath,$icoPath)
Write-Output ('Icono incorporado: '+$exePath)
