using System;
using System.IO;
using System.Globalization;
using System.Web.Script.Serialization;
using ScriptPortal.Vegas;
public class EntryPoint {
  public void FromVegas(Vegas vegas) {
    if(vegas.Project.IsModified)throw new Exception("Guarda el proyecto antes de capturar referencias.");
    string directory=Path.Combine(Path.GetDirectoryName(ScriptPortal.Vegas.Script.File),"diagnostics","reference-"+DateTime.UtcNow.ToString("yyyyMMdd-HHmmss"));Directory.CreateDirectory(directory);
    Timecode cursor=vegas.Transport.CursorPosition;
    try {
      foreach(double time in new double[]{0,4.5,13.5,58,77})vegas.SaveSnapshot(Path.Combine(directory,"frame-"+time.ToString(CultureInfo.InvariantCulture)+".png"),ImageFileFormat.PNG,Timecode.FromSeconds(time));
      File.WriteAllText(Path.Combine(directory,"reference.json"),new JavaScriptSerializer().Serialize(new {project=vegas.Project.FilePath,vegas=vegas.Version,modified=vegas.Project.IsModified,times=new double[]{0,4.5,13.5,58,77}}));
    } finally {vegas.Transport.CursorPosition=cursor;}
  }
}
