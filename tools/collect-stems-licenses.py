"""Keep installed dependency notices and a complete version manifest with the worker."""
import hashlib,json,shutil,sys
from pathlib import Path
from importlib import metadata
target=Path(sys.argv[1]);worker=Path(sys.argv[2]);licenses=target/'licenses';licenses.mkdir(exist_ok=True)
packages=[]
for dist in metadata.distributions():
    name=dist.metadata['Name'];entry={'name':name,'version':dist.version,'license':dist.metadata.get('License-Expression') or dist.metadata.get('License',''),'notices':[]}
    for file in dist.files or []:
        if any(token in Path(str(file)).name.lower() for token in ['license','copying','notice']) and ('dist-info' in str(file) or name.lower()=='torch'):
            source=Path(dist.locate_file(file))
            if source.is_file():
                destination=licenses/name/str(file).replace('../','_');destination.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,destination);entry['notices'].append(str(destination.relative_to(target)))
    packages.append(entry)
manifest={'engine':'demucs-cpu','model':'htdemucs','worker_sha256':hashlib.sha256(worker.read_bytes()).hexdigest(),'python':sys.version,'packages':packages}
(target/'runtime-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('Notices and manifest saved for',len(packages),'packages')
