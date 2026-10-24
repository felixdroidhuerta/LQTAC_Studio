"""Local CPU INT8 worker. Frozen as an onedir executable for Windows distribution."""
import argparse
import json
import os
import pathlib
import sys

# Never consult a Hub or implicit account token during normal application use.
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
os.environ['HF_HUB_DISABLE_IMPLICIT_TOKEN'] = '1'


def progress(stage, value):
    print(json.dumps({'stage': stage, 'progress': max(0, min(1, value))}, ensure_ascii=True), flush=True)


def timestamp(seconds):
    ms = max(0, round(seconds * 1000))
    return f'{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', required=True)
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--language', default='es')
    parser.add_argument('--threads', type=int, default=8)
    args = parser.parse_args()
    if args.language not in ['auto', 'es', 'en', 'fr', 'de', 'it', 'pt', 'ca', 'eu', 'gl']:
        raise ValueError('Idioma no válido')
    for name in ['model.bin', 'config.json', 'tokenizer.json', 'vocabulary.txt']:
        if not (pathlib.Path(args.model) / name).is_file():
            raise FileNotFoundError('Falta un recurso del modelo local: ' + name)
    progress('Cargando Faster Whisper INT8 · CPU · offline', 0)
    from faster_whisper import WhisperModel
    model = WhisperModel(args.model, device='cpu', compute_type='int8',
                         cpu_threads=max(1, min(8, args.threads)), num_workers=1, local_files_only=True)
    progress('Reconociendo voz · Faster Whisper INT8', 0)
    # A Python file object handles Windows Unicode paths without native fopen assumptions.
    with open(args.input, 'rb') as audio:
        segments, info = model.transcribe(audio, language=None if args.language == 'auto' else args.language,
            beam_size=5, best_of=5, temperature=0.0, vad_filter=False, word_timestamps=False,
            condition_on_previous_text=True, compression_ratio_threshold=2.4,
            log_prob_threshold=-1.0, no_speech_threshold=0.6)
        cues = []
        for segment in segments:
            text = segment.text.strip()
            if text and segment.end > segment.start:
                cues.append(f'{len(cues)+1}\n{timestamp(segment.start)} --> {timestamp(segment.end)}\n{text}\n')
            progress('Reconociendo voz · Faster Whisper INT8', segment.end / max(.001, info.duration))
    pathlib.Path(args.output).write_text('\n'.join(cues), encoding='utf-8')
    progress('Subtítulos preparados · Faster Whisper INT8', 1)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Faster Whisper: ' + str(error), file=sys.stderr, flush=True)
        sys.exit(1)
