"""LQTAC IA pro: offline SAM 2.1 video object tracking. CPU, local model, no network."""
import argparse, hashlib, json, os, socket, sys, time
from pathlib import Path
os.environ['HF_HUB_OFFLINE'] = '1'

def offline(*args, **kwargs):
    raise RuntimeError('Este motor funciona sin red; no se permiten descargas durante el análisis.')
socket.create_connection = offline
socket.socket.connect = offline

VERSION = '1.0.0'
MODEL = 'sam2.1_hiera_tiny.pt'
MODEL_SHA256 = '7402e0d864fa82708a20fbd15bc84245c2f26dff0eb43a4b5b93452deb34be69'
CONFIG = 'configs/sam2.1/sam2.1_hiera_t.yaml'

def emit(**data):
    print(json.dumps(data, ensure_ascii=True), flush=True)

def base_dir():
    return Path(getattr(sys, '_MEIPASS', Path(__file__).parent))

def load_predictor(models, threads, size=1024):
    weight = Path(models) / MODEL
    with weight.open('rb') as f:
        if hashlib.file_digest(f, 'sha256').hexdigest() != MODEL_SHA256:
            raise RuntimeError('El modelo SAM 2 está ausente o alterado')
    import torch
    torch.set_num_threads(max(1, min(8, threads)))
    from sam2.build_sam import build_sam2_video_predictor
    # Lower internal resolution: memory attention cost grows with the square of the token grid.
    feat = size // 16
    overrides = [f'++model.image_size={size}', f'++model.memory_attention.layer.self_attention.feat_sizes=[{feat},{feat}]', f'++model.memory_attention.layer.cross_attention.feat_sizes=[{feat},{feat}]']
    return torch, build_sam2_video_predictor(CONFIG, str(weight), device='cpu', hydra_overrides_extra=overrides, apply_postprocessing=False)

def analyze(a):
    started = time.perf_counter()
    frames = Path(a.frames); out = Path(a.output)
    prompts = json.loads(Path(a.prompts).read_text(encoding='utf-8'))
    names = sorted(p for p in frames.iterdir() if p.suffix.lower() in ('.jpg', '.jpeg'))
    if not names: raise RuntimeError('No hay fotogramas para analizar')
    if len(names) > 20000: raise RuntimeError('El clip supera el máximo de 20.000 fotogramas')
    objects = prompts.get('objects') or []
    if not objects or not any(o.get('points') for o in objects): raise RuntimeError('Marca al menos un punto sobre el objeto')
    emit(phase='load', progress=0.0)
    torch, predictor = load_predictor(a.models, a.threads, a.size)
    import numpy as np
    from PIL import Image
    out.mkdir(parents=True, exist_ok=True)
    with torch.inference_mode():
        state = predictor.init_state(video_path=str(frames), offload_video_to_cpu=True, offload_state_to_cpu=True)
        h, w = state['video_height'], state['video_width']
        emit(phase='prompt', progress=0.02, frames=len(names), width=w, height=h)
        starts = []
        for obj_index, obj in enumerate(objects, start=1):
            by_frame = {}
            for p in obj.get('points', []):
                frame = int(p['frame'])
                if not 0 <= frame < len(names): raise RuntimeError('Punto fuera del clip')
                by_frame.setdefault(frame, []).append(([float(p['x']) * w, float(p['y']) * h], 1 if p.get('label', 1) else 0))
            for frame, pts in by_frame.items():
                predictor.add_new_points_or_box(state, frame_idx=frame, obj_id=obj_index,
                    points=np.array([q[0] for q in pts], dtype=np.float32), labels=np.array([q[1] for q in pts], dtype=np.int32))
                starts.append(frame)
        first = min(starts); done = set()

        def save(idx, logits):
            mask = (torch.sigmoid(logits).amax(dim=0)[0].cpu().numpy() * 255).clip(0, 255).astype('uint8')
            Image.fromarray(mask, 'L').save(out / f'{idx:05d}.png', optimize=False, compress_level=1)
            done.add(idx)
            emit(phase='track', progress=0.03 + 0.97 * len(done) / len(names), frame=idx, done=len(done), total=len(names))

        for idx, _ids, logits in predictor.propagate_in_video(state, start_frame_idx=first):
            save(idx, logits)
        if first > 0:
            for idx, _ids, logits in predictor.propagate_in_video(state, start_frame_idx=first, reverse=True):
                if idx not in done: save(idx, logits)
    result = {'engine': 'sam2.1-hiera-tiny', 'version': VERSION, 'device': 'cpu', 'size': a.size, 'frames': len(names), 'width': w, 'height': h,
              'seconds': round(time.perf_counter() - started, 2)}
    (out / 'result.json').write_text(json.dumps(result), encoding='utf-8')
    emit(phase='done', progress=1.0, **result)

def main():
    p = argparse.ArgumentParser(prog='lqtac-ai-pro')
    sub = p.add_subparsers(dest='command', required=True)
    sub.add_parser('info')
    an = sub.add_parser('analyze')
    an.add_argument('--frames', required=True); an.add_argument('--prompts', required=True)
    an.add_argument('--output', required=True); an.add_argument('--models', required=True)
    an.add_argument('--threads', type=int, default=4); an.add_argument('--size', type=int, default=512, choices=[512, 768, 1024])
    a = p.parse_args()
    if a.command == 'info':
        emit(engine='sam2.1-hiera-tiny', version=VERSION, model=MODEL)
    else:
        analyze(a)

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(str(e), file=sys.stderr, flush=True); sys.exit(1)
