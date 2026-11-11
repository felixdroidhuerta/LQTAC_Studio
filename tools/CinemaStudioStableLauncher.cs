using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows.Forms;

internal static class CinemaStudioStableLauncher {
    private const string LauncherName = "Cinema Studio.exe";
    private const string PointerName = "current-portable.txt";

    private sealed class Candidate {
        internal string FilePath;
        internal Version Version;
        internal bool Preferred;
    }

    private static string Quote(string value) {
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

    private static Version ReadVersion(string launcher) {
        string directory = Path.GetDirectoryName(launcher);
        string package = Path.Combine(directory, "resources", "app", "package.json");
        try {
            if (File.Exists(package)) {
                Match match = Regex.Match(File.ReadAllText(package), "\\\"version\\\"\\s*:\\s*\\\"(\\d+(?:\\.\\d+){1,3})\\\"", RegexOptions.IgnoreCase);
                Version parsed;
                if (match.Success && Version.TryParse(match.Groups[1].Value, out parsed)) return parsed;
            }
        } catch { }
        Match folder = Regex.Match(new DirectoryInfo(directory).Name, "Cinema_Studio_(\\d+(?:\\.\\d+){1,3})_Windows_x64_Portable", RegexOptions.IgnoreCase);
        Version fallback;
        return folder.Success && Version.TryParse(folder.Groups[1].Value, out fallback) ? fallback : new Version(0, 0);
    }

    private static void AddCandidate(List<Candidate> candidates, string filePath, bool preferred) {
        if (String.IsNullOrWhiteSpace(filePath)) return;
        try {
            string full = Path.GetFullPath(filePath.Trim().Trim('"'));
            if (!String.Equals(Path.GetFileName(full), LauncherName, StringComparison.OrdinalIgnoreCase) || !File.Exists(full)) return;
            string own = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, LauncherName));
            if (String.Equals(full, own, StringComparison.OrdinalIgnoreCase)) return;
            Candidate existing = candidates.FirstOrDefault(item => String.Equals(item.FilePath, full, StringComparison.OrdinalIgnoreCase));
            if (existing != null) { existing.Preferred |= preferred; return; }
            candidates.Add(new Candidate { FilePath = full, Version = ReadVersion(full), Preferred = preferred });
        } catch { }
    }

    private static string ResolveTarget() {
        string stableDirectory = Path.GetFullPath(AppDomain.CurrentDomain.BaseDirectory);
        DirectoryInfo parentInfo = Directory.GetParent(stableDirectory.TrimEnd(Path.DirectorySeparatorChar));
        if (parentInfo == null) throw new DirectoryNotFoundException("No se encuentra la carpeta Documentos.");
        string documents = parentInfo.FullName;
        List<Candidate> candidates = new List<Candidate>();
        string pointer = Path.Combine(stableDirectory, PointerName);
        try { if (File.Exists(pointer)) AddCandidate(candidates, File.ReadAllText(pointer).Trim(), true); } catch { }
        foreach (string directory in Directory.GetDirectories(documents, "Cinema_Studio_*_Windows_x64_Portable", SearchOption.TopDirectoryOnly))
            AddCandidate(candidates, Path.Combine(directory, LauncherName), false);
        Candidate selected = candidates.OrderByDescending(item => item.Version).ThenByDescending(item => item.Preferred).ThenByDescending(item => File.GetLastWriteTimeUtc(item.FilePath)).FirstOrDefault();
        if (selected == null) throw new FileNotFoundException("No se encuentra ningún portable de Cinema Studio en Documentos. Extrae el ZIP completo antes de utilizar el acceso anclado.");
        try { File.WriteAllText(pointer, selected.FilePath, new UTF8Encoding(false)); } catch { }
        return selected.FilePath;
    }

    [STAThread]
    private static int Main(string[] args) {
        try {
            string target = ResolveTarget();
            if (args.Length == 2 && String.Equals(args[0], "--resolve-file", StringComparison.OrdinalIgnoreCase)) {
                File.WriteAllText(args[1], target, new UTF8Encoding(false));
                return 0;
            }
            ProcessStartInfo start = new ProcessStartInfo(target, String.Join(" ", args.Select(Quote).ToArray()));
            start.UseShellExecute = true;
            start.WorkingDirectory = Path.GetDirectoryName(target);
            Process.Start(start);
            return 0;
        } catch (Exception error) {
            MessageBox.Show(error.Message, "Cinema Studio by LQTAC", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }
}
