"""Development-only packaging: preserve available dependency notices and versions."""
import hashlib
import importlib.metadata
import json
import pathlib
import shutil
import sys

target = pathlib.Path(sys.argv[1])
worker = pathlib.Path(sys.argv[2])
packages = []
for distribution in importlib.metadata.distributions():
    name = distribution.metadata['Name']
    packages.append({'name': name, 'version': distribution.version, 'license': distribution.metadata.get('License-Expression') or distribution.metadata.get('License'), 'homepage': distribution.metadata.get('Home-page')})
    for file in distribution.files or []:
        if any(part.lower().startswith(('license', 'copying', 'notice', 'copyright', 'authors')) for part in file.parts):
            source = pathlib.Path(distribution.locate_file(file))
            if not source.is_file() or '..' in file.parts:
                continue
            destination = target / 'licenses' / name / file
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
manifest = {'format': 'LQTAC Faster runtime', 'engine': 'faster-int8', 'faster_whisper': importlib.metadata.version('faster-whisper'), 'ctranslate2': importlib.metadata.version('ctranslate2'), 'pyav': importlib.metadata.version('av'), 'python': sys.version, 'worker_sha256': hashlib.sha256(worker.read_bytes()).hexdigest(), 'packages': sorted(packages, key=lambda p: p['name'].lower())}
(target / 'runtime-manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8')
