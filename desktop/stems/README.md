# Demucs local - prueba de separación

Modelo `htdemucs` (Demucs 4.0.1), cuatro fuentes: vocals, drums, bass, other. Solo CPU en esta primera integración. Preparación de desarrollo: `tools/setup-stems.ps1 -PythonExe <Python 3.12>`. Se descargan dependencias y pesos únicamente al preparar el motor. El usuario de la aplicación no necesita Python ni Internet.

El worker exige un repositorio local, comprueba SHA-256 completo del peso y bloquea conexiones de red. No hay descarga automática si falta el modelo. Peso oficial de Meta: https://dl.fbaipublicfiles.com/demucs/hybrid_transformer/955717e8-8726e21a.th

SHA-256: `8726e21a993978c7ba086d3872e7608d7d5bfca646ca4aca459ffda844faa8b4`.

Código/modelo Demucs: licencia MIT y aviso conservados en licenses/Demucs-MIT.txt. Las dependencias empaquetadas conservan sus avisos en bin/licenses y sus versiones en bin/runtime-manifest.json. No se usa el wrapper Audio Separator en esta primera prueba; se evalúa Demucs directamente.

Se procesa el evento aislado, ya editado, con su recorte, velocidad, fundidos, FX, ganancia, balance y envolvente de pista. WAV estéreo PCM24 a 44,1 kHz. Se aplica consistencia con la mezcla original al residual «other» y, si es necesario, una única atenuación común a los cuatro stems. No se normaliza cada instrumento por separado. Límite inicial: 30 minutos por evento.

No se recuperan las grabaciones originales: pueden quedar filtraciones y artefactos. Los medios originales no se sobrescriben. Resultados en una carpeta nueva; al cancelar se retiran únicamente los archivos de esa operación incompleta. Al deshacer una inserción los WAV guardados permanecen disponibles.
