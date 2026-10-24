# Faster Whisper INT8 local

Motor principal de la generación de subtítulos: faster-whisper 1.2.1 con CTranslate2 4.8.3, CPU INT8, Small multilingüe. PyAV está fijado a 16.1.0 por la incompatibilidad encontrada en la prueba con 19.0.2. No requiere GPU, cuenta, API key ni acceso a repositorios durante el uso.

El worker de desktop/faster-whisper-worker.py se congela como aplicación Windows x64 onedir. bin/lqtac-faster-whisper.exe utiliza sus DLL y bibliotecas en bin/_internal. No trasladar solo el EXE: hay que conservar toda la carpeta bin. El usuario final no instala Python. bin/licenses conserva los avisos disponibles de las dependencias y runtime-manifest.json documenta sus versiones y el hash del worker fuente.

models/small contiene cuatro recursos de Systran/faster-whisper-small, revisión 536b0662742c02347bc0e980a01041f333bce120:

| Recurso | SHA-256 |
|---|---|
| model.bin | 3e305921506d8872816023e4c273e75d2419fb89b24da97b4fe7bce14170d671 |
| config.json | b55496ac7940a7ae47d2c01eab40edfd8701feec1229d9cce3b40014383fb828 |
| tokenizer.json | fb7b63191e9bb045082c79fd742a3106a12c99513ab30df4a0d47fa6cb6fd0ab |
| vocabulary.txt | 34ce3fe1c5041027b3f8d42912270993f986dbc4bb34cf27f951e34a1e453913 |

Preparación de desarrollo: tools/setup-faster-whisper.ps1 crea un entorno temporal de construcción, instala dependencias fijadas, descarga/verifica el modelo y genera el ejecutable con PyInstaller 6.16.0. Puede recibir BuildPython para usar un entorno de construcción existente y ModelSource para copiar un modelo previamente descargado, siempre verificando hashes. No sobrescribe bin si ya existe. Ni el entorno de construcción ni las muestras de pruebas se empaquetan en la aplicación.

El reconocimiento fuerza HF_HUB_OFFLINE, TRANSFORMERS_OFFLINE y local_files_only=True, usa únicamente el directorio local de modelos y escribe SRT temporal. Devuelve bloques de subtítulos; no activa ni sincroniza karaoke automáticamente. Se conserva Whisper.cpp como alternativa seleccionable, sin sustitución silenciosa si falta o falla un motor.

Código y licencias: https://github.com/SYSTRAN/faster-whisper (MIT), https://github.com/OpenNMT/CTranslate2 (MIT), modelo derivado de Whisper/OpenAI (MIT). PyAV y sus bibliotecas FFmpeg tienen avisos propios: conservar el conjunto de licencias de la distribución. PyInstaller incorpora su excepción de distribución del bootloader. Ver bin/licenses y runtime-manifest.json para el conjunto construido; revisar obligaciones de distribución y fuentes de terceros al redistribuir binarios.
