"""CPU-only, offline Demucs worker. All paths and models are local."""
import argparse, hashlib, json, os, socket, sys, time
from pathlib import Path
os.environ['HF_HUB_OFFLINE']='1'
os.environ['TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD']='1'

def offline(*args, **kwargs):
    raise RuntimeError('Este motor funciona sin red; no se permiten descargas durante la separación.')
socket.create_connection=offline
socket.socket.connect=offline

def emit(stage, progress):
    print(json.dumps({'stage':stage,'progress':progress},ensure_ascii=True),flush=True)

def main():
    p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);p.add_argument('--models',required=True);p.add_argument('--threads',type=int,default=4);a=p.parse_args()
    started=time.perf_counter();models=Path(a.models);output=Path(a.output)
    expected='8726e21a993978c7ba086d3872e7608d7d5bfca646ca4aca459ffda844faa8b4'
    weight=models/'955717e8-8726e21a.th'
    if hashlib.file_digest(weight.open('rb'),'sha256').hexdigest()!=expected:raise RuntimeError('El modelo Demucs está ausente o alterado')
    emit('Cargando Demucs local',0.05)
    import numpy as np
    import torch
    import soundfile as sf
    from demucs.pretrained import get_model
    from demucs.apply import apply_model
    import demucs.apply as application
    from tqdm import tqdm as BaseProgress
    class Progress(BaseProgress):
        def update(self,n=1):
            result=super().update(n)
            if self.total:emit('Separando instrumentos',min(.85,.15+.7*self.n/self.total))
            return result
    application.tqdm.tqdm=Progress
    torch.set_num_threads(max(1,min(8,a.threads)));torch.manual_seed(0)
    model=get_model('htdemucs',repo=models);model.eval()
    audio,sr=sf.read(a.input,dtype='float32',always_2d=True)
    if sr!=44100 or audio.shape[1]!=2 or len(audio)<1 or not np.isfinite(audio).all():raise RuntimeError('Se requiere audio estéreo válido a 44,1 kHz')
    if len(audio)/sr>1800:raise RuntimeError('La prueba admite un máximo de 30 minutos por evento')
    mix=torch.from_numpy(audio.T.copy());ref=mix.mean(0);mean=ref.mean();std=ref.std()
    emit('Separando instrumentos',.15)
    with torch.no_grad():
        if std<1e-8:stems=mix.unsqueeze(0).repeat(4,1,1)/4
        else:
            stems=apply_model(model,((mix-mean)/std)[None],device='cpu',shifts=0,split=True,overlap=.25,segment=7.5,progress=True,num_workers=0)[0]
            stems=stems*std+mean/len(model.sources)
    # Preserve the mixture and relative levels. No separate normalization per stem.
    stems[model.sources.index('other')]+=mix-stems.sum(0)
    peak=float(stems.abs().max());gain=min(1.,.98/max(peak,1e-8));stems*=gain
    if not torch.isfinite(stems).all():raise RuntimeError('El motor ha producido muestras no válidas')
    emit('Guardando cuatro pistas WAV',.9);files=[]
    for i,name in enumerate(model.sources):
        target=output/(name+'.wav')
        if target.exists():raise FileExistsError(str(target))
        sf.write(target,stems[i].T.cpu().numpy(),sr,subtype='PCM_24');files.append({'stem':name,'name':target.name,'frames':len(audio)})
    result={'model':'htdemucs','device':'cpu','sampleRate':sr,'channels':2,'frames':len(audio),'durationSeconds':len(audio)/sr,'gain':gain,'seconds':time.perf_counter()-started,'files':files}
    with (output/'result.json').open('x',encoding='utf-8') as f:json.dump(result,f,ensure_ascii=False,indent=2)
    emit('Separación terminada',1)

if __name__=='__main__':
    try:main()
    except Exception as e:
        print(str(e),file=sys.stderr,flush=True);sys.exit(1)
