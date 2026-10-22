# Motor local de exportación

FFmpeg se ejecuta como proceso independiente, sin shell ni acceso a repositorios durante el uso. El portable incluye el binario Windows x64 y sus documentos originales. Los fotogramas PNG se envían por una tubería con control de escritura; no se guardan todos en RAM ni se acumulan archivos de fotogramas en disco.

Dependencia de desarrollo: `ffmpeg-static` 5.3.0 (GPL-3.0-or-later). Binario incluido: FFmpeg 6.1.1 essentials de gyan.dev, GPL v3, según `ffmpeg.exe.README`. El empaquetador copia las licencias y la información de compilación a `resources/app/desktop/codecs`. Conserva estos avisos al distribuir.

- Paquete y script de obtención: https://github.com/eugeneware/ffmpeg-static
- Build original, configuración y fuentes: https://www.gyan.dev/ffmpeg/builds/
- Revisión FFmpeg indicada por el proveedor: https://github.com/FFmpeg/FFmpeg/commit/e38092ef93
- Filtros y expresiones: https://ffmpeg.org/ffmpeg-filters.html

Estos enlaces documentan la procedencia, no son dependencias de ejecución. Antes de una distribución pública comercial, revisar las obligaciones de licencia y entrega de fuentes correspondientes al binario distribuido; incluir enlaces no sustituye dicha revisión.
