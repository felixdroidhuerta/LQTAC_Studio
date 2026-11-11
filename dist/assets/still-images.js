window.LQTACStillImages = (() => {
  const extensions = ['png', 'jpg', 'jpeg', 'bmp', 'webp', 'tif', 'tiff'];
  const defaultDuration = 5;
  const sourceDuration = 604800;
  const isPath = value => typeof value === 'string' && extensions.includes(value.split('.').pop().toLowerCase());
  const isClip = clip => clip.dataset.kind === 'video' && isPath(clip.dataset.filePath);
  const pathKey = value => (value || '').replaceAll('\\', '/').toLowerCase();

  async function decode(filePath, image = new Image()) {
    try {
      image.src = await mediaUrlForTimeline(filePath);
      await image.decode();
      return image;
    } catch {
      throw new Error('No se pudo abrir la imagen ' + filePath.split(/[\\/]/).pop());
    }
  }

  // The compositing and editor paths can use the image as a video frame.
  function media(clip) {
    const image = new Image();
    let loading, ready = false, position = 0, startedAt = null;
    image.playbackRate = 1;
    Object.defineProperties(image, {
      readyState: { get: () => ready ? 4 : 0 },
      videoWidth: { get: () => image.naturalWidth },
      videoHeight: { get: () => image.naturalHeight },
      duration: { value: sourceDuration },
      seeking: { value: false },
      paused: { get: () => startedAt === null },
      ended: { get: () => image.currentTime >= sourceDuration },
      currentTime: {
        get: () => Math.min(sourceDuration, position + (startedAt === null ? 0 : (performance.now() - startedAt) / 1000 * image.playbackRate)),
        set: value => { position = Math.max(0, Math.min(sourceDuration, value)); if (startedAt !== null) startedAt = performance.now(); }
      }
    });
    image.initialize = () => loading ??= decode(clip.dataset.filePath, image).then(() => {
      ready = true;
      image.dispatchEvent(new Event('loadeddata'));
    });
    image.play = async () => { if (startedAt === null) startedAt = performance.now(); };
    image.pause = () => { position = image.currentTime; startedAt = null; };
    image.load = () => {};
    return image;
  }

  return { extensions, defaultDuration, sourceDuration, isPath, isClip, pathKey, decode, media };
})();
