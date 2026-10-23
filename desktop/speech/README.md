# Reconocimiento local de subtítulos

Motor: whisper.cpp v1.9.2, binario oficial Windows x64 CPU. Modelo: ggml-small.bin multilingüe, revisión ggerganov/whisper.cpp 5359861c739e955e79d9a303bcbc70fb988958b1. Código/modelo MIT; se incluyen sus avisos LICENSE-whisper.cpp.txt y LICENSE-model.txt.

Preparación de desarrollo: tools/setup-whisper.ps1 descarga y verifica SHA-256 de motor y modelo. bin/ y models/ se excluyen de Git por ser dependencias binarias; build-portable.ps1 exige el modelo y empaqueta esta carpeta. El programa no descarga ni llama servicios remotos. No se exige Python, CUDA ni cuenta/API key al usuario.

ZIP motor: 49dcc16de826f20bd53d44f947a1ae49dfa81f86cad67a64d80820cb192d674a

Modelo: 1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b (~466 MiB).

Se analiza una pista de audio o evento seleccionado, con sus tiempos, offsets, velocidad y FX; se crea una pista de texto nueva. La transcripción requiere revisión, especialmente en canto, ruido, silencios y solapamiento de voces. No se identifica automáticamente a los hablantes ni se genera karaoke palabra a palabra.
