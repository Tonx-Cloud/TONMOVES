type RenderParams = {
  images: { url: string; prompt?: string }[];
  audioFile: File;
  aspectRatio: '16:9' | '9:16';
  fps?: number;
  onProgress?: (p: number) => void;
  watermarkText?: string;
  watermarkOpacity?: number;
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function renderCanvasVideo({ images, audioFile, aspectRatio, fps = 30, onProgress, watermarkText = 'tonmovies.app', watermarkOpacity = 0.15 }: RenderParams): Promise<Blob> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Canvas renderer requer ambiente de navegador');
  }

  const width = aspectRatio === '9:16' ? 720 : 1280;
  const height = aspectRatio === '9:16' ? 1280 : 720;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D não disponível');

  // Precarregar imagens
  const loadedImages = await Promise.all(images.map(img => loadImage(img.url)));

  // Configurar áudio
  const audioUrl = URL.createObjectURL(audioFile);
  const audio = new Audio(audioUrl);
  audio.preload = 'auto';
  audio.crossOrigin = 'anonymous';
  await new Promise<void>((resolve) => {
    audio.addEventListener('loadedmetadata', () => resolve(), { once: true });
    // fallback se não disparar
    setTimeout(() => resolve(), 1000);
  });
  const duration = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 30;

  // Captura de vídeo
  const canvasStream = canvas.captureStream(fps);
  const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

  // Tentar capturar áudio
  let audioStream: MediaStream | null = null;
  try {
    // @ts-ignore
    audioStream = typeof audio.captureStream === 'function' ? audio.captureStream() : null;
  } catch {
    audioStream = null;
  }
  if (audioStream) {
    tracks.push(...audioStream.getAudioTracks());
  }
  const mixedStream = new MediaStream(tracks);

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(mixedStream, { mimeType: 'video/webm;codecs=vp9,opus' });
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  let resolvePromise: (b: Blob) => void;
  let rejectPromise: (e: any) => void;
  const donePromise = new Promise<Blob>((resolve, reject) => { resolvePromise = resolve; rejectPromise = reject; });

  recorder.onstop = () => {
    try {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolvePromise!(blob);
    } catch (e) {
      rejectPromise!(e);
    } finally {
      mixedStream.getTracks().forEach(t => t.stop());
      canvasStream.getTracks().forEach(t => t.stop());
      if (audioStream) audioStream.getTracks().forEach(t => t.stop());
      URL.revokeObjectURL(audioUrl);
    }
  };

  recorder.start();
  void audio.play().catch(() => {});

  const start = performance.now();

  const drawFrame = () => {
    const now = performance.now();
    const elapsed = (now - start) / 1000;
    const progress = Math.min(elapsed / duration, 1);
    if (onProgress) onProgress(progress * 100);

    // selecionar imagem pelo progresso
    const idx = Math.min(loadedImages.length - 1, Math.floor(progress * loadedImages.length));
    const img = loadedImages[idx];

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    const { naturalWidth, naturalHeight } = img;
    const canvasRatio = width / height;
    const imgRatio = naturalWidth / naturalHeight;
    let drawW = width;
    let drawH = height;
    if (imgRatio > canvasRatio) {
      drawH = width / imgRatio;
    } else {
      drawW = height * imgRatio;
    }
    const dx = (width - drawW) / 2;
    const dy = (height - drawH) / 2;
    ctx.drawImage(img, dx, dy, drawW, drawH);

    // Watermark central
    const wm = watermarkText || '';
    if (wm) {
      ctx.save();
      ctx.globalAlpha = watermarkOpacity;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px Inter, system-ui';
      const textWidth = ctx.measureText(wm).width;
      const tx = (width - textWidth) / 2;
      const ty = height / 2;
      ctx.fillText(wm, tx, ty);
      ctx.restore();
    }

    if (progress < 1) {
      requestAnimationFrame(drawFrame);
    } else {
      recorder.stop();
      audio.pause();
    }
  };

  requestAnimationFrame(drawFrame);

  return donePromise;
}
