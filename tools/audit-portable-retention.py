"""Read-only audit. Produces a removal plan only for unchanged, remotely backed-up portables."""
import argparse, hashlib, json, pathlib, re, subprocess, zipfile, zlib

parser = argparse.ArgumentParser()
parser.add_argument("--directory", type=pathlib.Path, required=True)
parser.add_argument("--releases", type=pathlib.Path, required=True)
parser.add_argument("--plan", type=pathlib.Path, required=True)
args = parser.parse_args()
directory = args.directory.resolve()
pattern = re.compile(r"LQTAC_Studio_(\d+)\.(\d+)\.(\d+)_Windows_x64_Portable")
versions = {}
for entry in directory.iterdir():
    match = pattern.fullmatch(entry.stem if entry.is_file() and entry.suffix == ".zip" else entry.name)
    if match:
        versions.setdefault(tuple(map(int, match.groups())), directory / match[0])
keep = sorted(versions, reverse=True)[:3]
assets = [a for r in json.loads(args.releases.read_text(encoding="utf-8-sig")) if not r["draft"] for a in r["assets"]]
processes = subprocess.run(["powershell.exe", "-NoProfile", "-NonInteractive", "-Command",
    "Get-Process | Where-Object Path | Select-Object -ExpandProperty Path | ConvertTo-Json -Compress"],
    capture_output=True, text=True, check=True).stdout.strip()
running = json.loads(processes) if processes else []
running = [running] if isinstance(running, str) else running
plan = {"directory": str(directory), "keep": [str(versions[v]) for v in keep], "remove": [], "preserved": []}
for version, folder in sorted(versions.items()):
    if version in keep:
        continue
    archive = pathlib.Path(str(folder) + ".zip")
    try:
        if not archive.is_file() or not folder.is_dir() or folder.is_symlink() or folder.is_junction():
            raise ValueError("Missing original folder/ZIP or reparse point")
        if any(pathlib.Path(exe).is_relative_to(folder) for exe in running):
            raise ValueError("Portable currently running")
        if folder.parent != directory or archive.parent != directory:
            raise ValueError("Unexpected absolute target")
        with archive.open("rb") as stream:
            digest = hashlib.file_digest(stream, "sha256").hexdigest()
        asset = next((a for a in assets if a["name"] == archive.name and a["size"] == archive.stat().st_size
                      and a.get("digest") == "sha256:" + digest), None)
        if not asset:
            raise ValueError("Remote asset SHA-256/size not confirmed")
        actual = {}
        for file in folder.rglob("*"):
            if file.is_symlink() or file.is_junction():
                raise ValueError("Reparse point within portable")
            if file.is_file():
                actual[file.relative_to(folder).as_posix()] = file
        with zipfile.ZipFile(archive) as zipped:
            entries = {}
            for info in zipped.infolist():
                if info.is_dir():
                    continue
                name = info.filename.replace(chr(92), "/")
                prefix = folder.name + "/"
                if not name.startswith(prefix):
                    raise ValueError("Unexpected ZIP root")
                entries[name[len(prefix):]] = info
            if set(entries) != set(actual):
                raise ValueError("Added/removed files: folder may contain personal work")
            for name, info in entries.items():
                file = actual[name]
                if file.stat().st_size != info.file_size:
                    raise ValueError("Changed file: " + name)
                crc = 0
                with file.open("rb") as stream:
                    while block := stream.read(1024 * 1024):
                        crc = zlib.crc32(block, crc)
                if crc != info.CRC:
                    raise ValueError("Changed file: " + name)
        plan["remove"].append({"folder": str(folder), "archive": str(archive), "sha256": digest,
                               "remote_url": asset["browser_download_url"], "file_count": len(actual)})
        print("Verified removable: " + folder.name, flush=True)
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        plan["preserved"].append({"folder": str(folder), "reason": str(error)})
        print("Preserved: " + folder.name + " · " + str(error), flush=True)
args.plan.write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
print("Read-only audit complete: " + str(len(plan["remove"])) + " verified backups")
