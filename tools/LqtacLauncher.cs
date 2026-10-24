using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Windows.Forms;
using System.Collections.Generic;

internal static class LqtacLauncher {
    static string Quote(string value) {
        StringBuilder text = new StringBuilder("\"");
        int slashes = 0;
        foreach (char c in value) {
            if (c == '\\') { slashes++; continue; }
            if (c == '"') text.Append('\\', slashes * 2 + 1).Append('"');
            else text.Append('\\', slashes).Append(c);
            slashes = 0;
        }
        text.Append('\\', slashes * 2).Append('"');
        return text.ToString();
    }
    static string FindApplication(string directory) {
        string packaged = Path.Combine(directory, "resources", "app");
        if (File.Exists(Path.Combine(packaged, "package.json"))) return packaged;
        DirectoryInfo parent = new DirectoryInfo(directory);
        for (int i = 0; parent != null && i < 12; i++, parent = parent.Parent) {
            if (File.Exists(Path.Combine(parent.FullName, "main.cjs")) &&
                File.Exists(Path.Combine(parent.FullName, "package.json"))) return parent.FullName;
        }
        throw new FileNotFoundException("No se encuentra la carpeta de LQTAC Studio.");
    }
    [STAThread]
    static int Main(string[] args) {
        try {
            string directory = AppDomain.CurrentDomain.BaseDirectory;
            string engine = Path.Combine(directory, "electron.exe");
            if (!File.Exists(engine)) throw new FileNotFoundException("Falta el motor de LQTAC Studio.");
            string application = FindApplication(directory);
            bool version = args.Length == 1 && args[0] == "--version";
            List<string> command = new List<string>();
            if (!version) command.Add(Quote(application));
            foreach (string arg in args) {
                if (!version && String.Equals(arg.TrimEnd('\\'), application.TrimEnd('\\'), StringComparison.OrdinalIgnoreCase)) continue;
                command.Add(Quote(arg));
            }
            ProcessStartInfo start = new ProcessStartInfo(engine, String.Join(" ", command.ToArray()));
            start.UseShellExecute = false;
            start.CreateNoWindow = true;
            start.WorkingDirectory = application;
            start.EnvironmentVariables.Remove("ELECTRON_RUN_AS_NODE");
            if (version) start.RedirectStandardOutput = true;
            Process child = Process.Start(start);
            if (version) { Console.Write(child.StandardOutput.ReadToEnd()); child.WaitForExit(); return child.ExitCode; }
            return 0;
        } catch (Exception error) {
            MessageBox.Show(error.Message, "LQTAC Studio", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }
}
