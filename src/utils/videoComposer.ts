import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { StoredImage } from './imageStorage';

export type VideoMode = 'slideshow' | 'animated';

export interface VideoOptions {
  fps?: number;
  width?: number;
  height?: number;
  audioFile?: File;
  videoMode?: VideoMode;
}

// Proxies CORS publicos
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
];

// Carrega imagem e converte para blob
async function loadImageAsBlob(url: string, width: number, height: number, index: number): Promise<Uint8Array> {
  // Metodo 1: Tentar fetch direto (funciona para Together AI, OpenAI, base64)
  if (url.startsWith('data:') || !url.includes('pollinations')) {
    try {
      console.log(`Carregando imagem ${index + 1} via fetch direto...`);
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        return await resizeImageBlob(blob, width, height);
      }
    } catch (e) {
      console.log(`Fetch direto falhou para imagem ${index + 1}`);
    }
  }

  // Metodo 2: Usar proxy CORS (para Pollinations e outras URLs externas)
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy + encodeURIComponent(url);
      console.log(`Carregando imagem ${index + 1} via proxy CORS...`);
      const response = await fetch(proxyUrl);
      if (response.ok) {
        const blob = await response.blob();
        return await resizeImageBlob(blob, width, height);
      }
    } catch (e) {
      console.log(`Proxy ${proxy} falhou para imagem ${index + 1}`);
    }
  }

  // Metodo 3: Tentar carregar via img + canvas (pode funcionar se servidor permitir)
  try {
    console.log(`Tentando img tag para imagem ${index + 1}...`);
    return await loadImageNoCors(url, width, height);
  } catch (e) {
    console.log(`Img tag falhou para imagem ${index + 1}: ${e}`);
  }

  // Metodo 4: Criar placeholder colorido
  console.log(`Usando placeholder para imagem ${index + 1}`);
  return createColorPlaceholder(width, height, index);
}

// Carrega imagem SEM crossOrigin - funciona para Pollinations
async function loadImageNoCors(url: string, width: number, height: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // NAO definir crossOrigin - permite carregar de qualquer origem

    const timeout = setTimeout(() => {
      reject(new Error('Timeout'));
    }, 30000);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        // Fundo preto
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        // Desenhar imagem centralizada
        const scale = Math.min(width / img.width, height / img.height);
        const x = (width - img.width * scale) / 2;
        const y = (height - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        // Converter para dados
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64 = dataUrl.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        resolve(bytes);
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Erro ao carregar imagem'));
    };

    // Adicionar timestamp para evitar cache
    const separator = url.includes('?') ? '&' : '?';
    img.src = url + separator + '_t=' + Date.now();
  });
}

// Redimensiona blob de imagem
async function resizeImageBlob(blob: Blob, width: number, height: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      const scale = Math.min(width / img.width, height / img.height);
      const x = (width - img.width * scale) / 2;
      const y = (height - img.height * scale) / 2;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

      canvas.toBlob((resultBlob) => {
        if (resultBlob) {
          resultBlob.arrayBuffer().then(buffer => resolve(new Uint8Array(buffer)));
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/jpeg', 0.9);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

// Carrega imagem via tag img (sem CORS para canvas)
async function loadImageViaImgTag(url: string, width: number, height: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timeout = setTimeout(() => {
      reject(new Error('Timeout loading image'));
    }, 10000);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        const scale = Math.min(width / img.width, height / img.height);
        const x = (width - img.width * scale) / 2;
        const y = (height - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        canvas.toBlob((blob) => {
          if (blob) {
            blob.arrayBuffer().then(buffer => resolve(new Uint8Array(buffer)));
          } else {
            reject(new Error('Canvas tainted by CORS'));
          }
        }, 'image/jpeg', 0.9);
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

// Ken Burns animation types - exportado para uso externo
export type AnimationType = 'zoomIn' | 'zoomOut' | 'panLeft' | 'panRight' | 'panUp' | 'panDown' | 'zoomInRotate' | 'kenBurnsClassic';

export const ANIMATION_TYPES: { id: AnimationType; name: string; description: string }[] = [
  { id: 'zoomIn', name: 'Zoom In', description: 'Aproxima lentamente' },
  { id: 'zoomOut', name: 'Zoom Out', description: 'Afasta lentamente' },
  { id: 'panLeft', name: 'Pan Esquerda', description: 'Move para esquerda' },
  { id: 'panRight', name: 'Pan Direita', description: 'Move para direita' },
  { id: 'panUp', name: 'Pan Cima', description: 'Move para cima' },
  { id: 'panDown', name: 'Pan Baixo', description: 'Move para baixo' },
  { id: 'zoomInRotate', name: 'Zoom + Rotação', description: 'Aproxima com leve rotação' },
  { id: 'kenBurnsClassic', name: 'Ken Burns', description: 'Zoom + Pan combinados' },
];

// Generate frames with Ken Burns effect for a single image
async function generateKenBurnsFrames(
  imageData: Uint8Array,
  width: number,
  height: number,
  frameCount: number,
  animationType: AnimationType
): Promise<Uint8Array[]> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([imageData], { type: 'image/jpeg' });
    const img = new Image();

    img.onload = () => {
      const frames: Uint8Array[] = [];
      console.log(`🎬 Gerando ${frameCount} frames com animação: ${animationType}`);

      for (let i = 0; i < frameCount; i++) {
        const progress = i / (frameCount - 1); // 0 to 1
        // Usar easing para movimento mais suave
        const easedProgress = easeInOutCubic(progress);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        // Black background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        // Calculate Ken Burns transformation - VALORES MAIORES para efeito mais visível
        let scale = 1;
        let offsetX = 0;
        let offsetY = 0;
        let rotation = 0;

        const maxZoom = 1.5; // Aumentado de 1.3 para 1.5 (50% zoom)
        const panAmount = 0.25; // Aumentado de 0.15 para 0.25 (25% pan)

        switch (animationType) {
          case 'zoomIn':
            scale = 1 + (maxZoom - 1) * easedProgress;
            break;
          case 'zoomOut':
            scale = maxZoom - (maxZoom - 1) * easedProgress;
            break;
          case 'panLeft':
            scale = 1.2;
            offsetX = panAmount * width * (1 - easedProgress) - panAmount * width * 0.5;
            break;
          case 'panRight':
            scale = 1.2;
            offsetX = -panAmount * width * (1 - easedProgress) + panAmount * width * 0.5;
            break;
          case 'panUp':
            scale = 1.2;
            offsetY = panAmount * height * (1 - easedProgress) - panAmount * height * 0.5;
            break;
          case 'panDown':
            scale = 1.2;
            offsetY = -panAmount * height * (1 - easedProgress) + panAmount * height * 0.5;
            break;
          case 'zoomInRotate':
            scale = 1 + (maxZoom - 1) * easedProgress;
            rotation = easedProgress * 3 * Math.PI / 180; // 3 graus de rotação
            break;
          case 'kenBurnsClassic':
            // Combinação de zoom e pan
            scale = 1 + 0.4 * easedProgress;
            offsetX = panAmount * width * 0.5 * easedProgress;
            offsetY = -panAmount * height * 0.3 * easedProgress;
            break;
        }

        // Salvar estado e aplicar transformações
        ctx.save();
        ctx.translate(width / 2, height / 2);
        if (rotation !== 0) {
          ctx.rotate(rotation);
        }
        ctx.translate(-width / 2, -height / 2);

        // Calculate drawing dimensions
        const imgAspect = img.width / img.height;
        const canvasAspect = width / height;

        let drawWidth, drawHeight;
        if (imgAspect > canvasAspect) {
          // Image is wider - fit to height
          drawHeight = height * scale;
          drawWidth = drawHeight * imgAspect;
        } else {
          // Image is taller - fit to width
          drawWidth = width * scale;
          drawHeight = drawWidth / imgAspect;
        }

        // Center the image with offset
        const x = (width - drawWidth) / 2 + offsetX;
        const y = (height - drawHeight) / 2 + offsetY;

        ctx.drawImage(img, x, y, drawWidth, drawHeight);
        ctx.restore();

        // Convert to Uint8Array
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64 = dataUrl.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let j = 0; j < binary.length; j++) {
          bytes[j] = binary.charCodeAt(j);
        }
        frames.push(bytes);
      }

      URL.revokeObjectURL(img.src);
      console.log(`✅ ${frames.length} frames gerados para animação ${animationType}`);
      resolve(frames);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for animation'));
    };

    img.src = URL.createObjectURL(blob);
  });
}

// Easing function para movimento mais suave
function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Get animation type based on image index for variety
function getAnimationType(index: number): AnimationType {
  const types: AnimationType[] = ['zoomIn', 'zoomOut', 'panLeft', 'panRight', 'kenBurnsClassic', 'zoomInRotate'];
  return types[index % types.length];
}

// Exportar função para gerar preview de animação (GIF ou video curto)
export async function generateAnimationPreview(
  imageUrl: string,
  animationType: AnimationType,
  width: number = 320,
  height: number = 480
): Promise<string> {
  // Carregar imagem
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const imageData = new Uint8Array(arrayBuffer);

  // Gerar apenas 30 frames para preview (1 segundo a 30fps)
  const frames = await generateKenBurnsFrames(imageData, width, height, 30, animationType);

  // Retornar o primeiro e último frame como comparação
  // (Para um preview real, precisaria de uma biblioteca de GIF)
  const lastFrameBlob = new Blob([frames[frames.length - 1]], { type: 'image/jpeg' });
  return URL.createObjectURL(lastFrameBlob);
}

// Cria placeholder colorido quando imagem nao carrega
function createColorPlaceholder(width: number, height: number, index: number): Uint8Array {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Cores variadas baseadas no index
  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c',
    '#4facfe', '#00f2fe', '#fa709a', '#fee140',
    '#a8edea', '#fed6e3', '#ffecd2', '#fcb69f'
  ];
  const color = colors[index % colors.length];

  // Gradiente
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, '#000');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Texto
  ctx.fillStyle = 'white';
  ctx.font = `bold ${Math.floor(height / 10)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Cena ${index + 1}`, width / 2, height / 2);

  // Converter para Uint8Array
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export class VideoComposer {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;

  async load(onProgress?: (progress: number) => void): Promise<void> {
    if (this.loaded) return;

    this.ffmpeg = new FFmpeg();

    // Progress callback
    this.ffmpeg.on('log', ({ message }) => {
      console.log('FFmpeg:', message);
    });

    this.ffmpeg.on('progress', ({ progress }) => {
      if (onProgress) {
        onProgress(Math.round(progress * 100));
      }
    });

    // Tentar carregar FFmpeg de diferentes CDNs
    const cdnOptions = [
      // Opcao 1: unpkg (versao ESM)
      {
        name: 'unpkg',
        coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
        wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
      },
      // Opcao 2: jsdelivr
      {
        name: 'jsdelivr',
        coreURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
        wasmURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
      },
      // Opcao 3: unpkg versao UMD (fallback)
      {
        name: 'unpkg-umd',
        coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
        wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
      },
    ];

    for (const cdn of cdnOptions) {
      try {
        console.log(`Carregando FFmpeg de ${cdn.name}...`);

        await this.ffmpeg.load({
          coreURL: await toBlobURL(cdn.coreURL, 'text/javascript'),
          wasmURL: await toBlobURL(cdn.wasmURL, 'application/wasm'),
        });

        this.loaded = true;
        console.log(`FFmpeg carregado com sucesso de ${cdn.name}!`);
        return;

      } catch (error) {
        console.warn(`Falha ao carregar de ${cdn.name}:`, error);
      }
    }

    throw new Error('Nao foi possivel carregar FFmpeg. Verifique sua conexao e recarregue a pagina.');
  }

  async createVideo(
    images: StoredImage[],
    options: VideoOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (!this.ffmpeg || !this.loaded) {
      throw new Error('FFmpeg nao esta carregado');
    }

    if (!images || images.length === 0) {
      throw new Error('Nenhuma imagem fornecida');
    }

    const {
      fps = 24,
      width = 720,
      height = 1280,
      audioFile,
      videoMode = 'slideshow'
    } = options;

    const isAnimated = videoMode === 'animated';
    const framesPerImage = isAnimated ? 120 : 1; // 5 seconds at 24fps for animated

    console.log(`Criando video ${width}x${height} com ${images.length} imagens (modo: ${videoMode})`);

    try {
      // 1. Escrever imagens no sistema de arquivos do FFmpeg
      console.log('Escrevendo imagens...');
      const writtenFiles: string[] = [];
      let frameIndex = 0;

      for (let i = 0; i < images.length; i++) {
        try {
          const imageData = await loadImageAsBlob(images[i].url, width, height, i);

          if (isAnimated) {
            // Generate animated frames with Ken Burns effect
            // Usar animação definida na imagem, ou selecionar automaticamente
            const animationType = (images[i].animationType && images[i].animationType !== 'none')
              ? images[i].animationType as AnimationType
              : getAnimationType(i);
            console.log(`Gerando ${framesPerImage} frames animados para imagem ${i + 1} (${animationType})...`);

            const animatedFrames = await generateKenBurnsFrames(
              imageData,
              width,
              height,
              framesPerImage,
              animationType
            );

            for (let f = 0; f < animatedFrames.length; f++) {
              const filename = `img${frameIndex.toString().padStart(6, '0')}.jpg`;
              await this.ffmpeg.writeFile(filename, animatedFrames[f]);
              writtenFiles.push(filename);
              frameIndex++;
            }
          } else {
            // Slideshow mode - single frame per image
            const filename = `img${frameIndex.toString().padStart(6, '0')}.jpg`;
            await this.ffmpeg.writeFile(filename, imageData);
            writtenFiles.push(filename);
            frameIndex++;
          }

          console.log(`Imagem ${i + 1}/${images.length} OK`);
        } catch (imgError) {
          console.error(`Erro na imagem ${i}:`, imgError);
          // Criar placeholder se falhar
          const placeholder = createColorPlaceholder(width, height, i);

          if (isAnimated) {
            // Generate animated frames for placeholder too
            const animationType = (images[i].animationType && images[i].animationType !== 'none')
              ? images[i].animationType as AnimationType
              : getAnimationType(i);
            const animatedFrames = await generateKenBurnsFrames(
              placeholder,
              width,
              height,
              framesPerImage,
              animationType
            );

            for (let f = 0; f < animatedFrames.length; f++) {
              const filename = `img${frameIndex.toString().padStart(6, '0')}.jpg`;
              await this.ffmpeg.writeFile(filename, animatedFrames[f]);
              writtenFiles.push(filename);
              frameIndex++;
            }
          } else {
            const filename = `img${frameIndex.toString().padStart(6, '0')}.jpg`;
            await this.ffmpeg.writeFile(filename, placeholder);
            writtenFiles.push(filename);
            frameIndex++;
          }
        }

        if (onProgress) {
          onProgress(Math.round((i / images.length) * 40));
        }
      }

      console.log(`${writtenFiles.length} frames escritos`);

      // 2. Escrever audio se fornecido
      let hasAudio = false;
      if (audioFile) {
        try {
          console.log('Escrevendo audio...');
          const audioData = await fetchFile(audioFile);
          await this.ffmpeg.writeFile('audio.mp3', audioData);
          hasAudio = true;
          console.log('Audio escrito OK');
        } catch (audioError) {
          console.error('Erro ao escrever audio:', audioError);
        }
      }

      if (onProgress) onProgress(50);

      // 3. Calcular duracao e framerate
      const totalDuration = hasAudio ? await this.getAudioDuration(audioFile!) : images.length * 2;

      let inputFramerate: string;
      let outputDuration: number;

      if (isAnimated) {
        // Animated mode: frames are already at fps rate (24fps)
        inputFramerate = fps.toString();
        outputDuration = writtenFiles.length / fps;
        console.log(`Modo animado: ${writtenFiles.length} frames a ${fps}fps = ${outputDuration.toFixed(1)}s`);
      } else {
        // Slideshow mode: calculate framerate to match audio duration
        const durationPerImage = Math.max(0.5, totalDuration / images.length);
        inputFramerate = (1 / durationPerImage).toFixed(4);
        outputDuration = totalDuration;
        console.log(`Modo slideshow: ${images.length} imagens, ${durationPerImage.toFixed(1)}s cada = ${totalDuration.toFixed(1)}s`);
      }

      // 4. Criar video - comando simplificado
      console.log('Executando FFmpeg...');

      let ffmpegArgs: string[];

      if (hasAudio) {
        // Com audio
        ffmpegArgs = [
          '-framerate', inputFramerate,
          '-i', 'img%06d.jpg',
          '-i', 'audio.mp3',
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-shortest',
          '-y',
          'output.mp4'
        ];
      } else {
        // Sem audio
        ffmpegArgs = [
          '-framerate', inputFramerate,
          '-i', 'img%06d.jpg',
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-t', outputDuration.toString(),
          '-y',
          'output.mp4'
        ];
      }

      console.log('FFmpeg args:', ffmpegArgs.join(' '));

      await this.ffmpeg.exec(ffmpegArgs);

      if (onProgress) onProgress(90);

      // 5. Ler video de saida
      console.log('Lendo video...');

      let data: Uint8Array;
      try {
        const fileData = await this.ffmpeg.readFile('output.mp4');
        data = fileData as Uint8Array;
      } catch (readError) {
        console.error('Erro ao ler output.mp4:', readError);
        throw new Error('FFmpeg nao gerou o video. Verifique o console para mais detalhes.');
      }

      if (!data || data.length === 0) {
        throw new Error('Video gerado esta vazio');
      }

      console.log(`Video gerado: ${(data.length / 1024 / 1024).toFixed(2)} MB`);

      if (onProgress) onProgress(100);

      // 6. Limpeza (ignorar erros)
      for (const filename of writtenFiles) {
        try { await this.ffmpeg.deleteFile(filename); } catch {}
      }
      try { await this.ffmpeg.deleteFile('audio.mp3'); } catch {}
      try { await this.ffmpeg.deleteFile('output.mp4'); } catch {}

      console.log('Video criado com sucesso!');
      return new Blob([data], { type: 'video/mp4' });

    } catch (error) {
      console.error('Erro ao criar video:', error);
      throw error;
    }
  }

  private async getAudioDuration(audioFile: File): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(audioFile);
      
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
        URL.revokeObjectURL(audio.src);
      });

      audio.addEventListener('error', () => {
        console.warn('Não foi possível determinar duração do áudio, usando fallback');
        resolve(30); // Fallback: 30 segundos
        URL.revokeObjectURL(audio.src);
      });
    });
  }

  cleanup(): void {
    if (this.ffmpeg) {
      // FFmpeg cleanup is automatic
      this.ffmpeg = null;
      this.loaded = false;
    }
  }
}
