import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { StoredImage } from './imageStorage';

export interface VideoOptions {
  fps?: number;
  width?: number;
  height?: number;
  audioFile?: File;
}

export class VideoComposer {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;

  async load(onProgress?: (progress: number) => void): Promise<void> {
    if (this.loaded) return;

    this.ffmpeg = new FFmpeg();

    // ✅ CORREÇÃO: Usar CDN mais confiável
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    try {
      console.log('📦 Carregando FFmpeg...');
      
      // Progress callback
      this.ffmpeg.on('log', ({ message }) => {
        console.log('FFmpeg:', message);
      });

      this.ffmpeg.on('progress', ({ progress }) => {
        if (onProgress) {
          onProgress(Math.round(progress * 100));
        }
      });

      // ✅ Carregar WASM files
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.loaded = true;
      console.log('✅ FFmpeg carregado com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro ao carregar FFmpeg:', error);
      
      // ✅ FALLBACK: Tentar CDN alternativo
      console.log('🔄 Tentando CDN alternativo...');
      
      try {
        const altBaseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
        
        await this.ffmpeg.load({
          coreURL: await toBlobURL(`${altBaseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${altBaseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        
        this.loaded = true;
        console.log('✅ FFmpeg carregado (CDN alternativo)!');
        
      } catch (altError) {
        console.error('❌ Ambos CDNs falharam:', altError);
        throw new Error('Não foi possível carregar FFmpeg. Tente recarregar a página.');
      }
    }
  }

  async createVideo(
    images: StoredImage[],
    options: VideoOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (!this.ffmpeg || !this.loaded) {
      throw new Error('FFmpeg não está carregado');
    }

    const {
      fps = 30,
      width = 1280,
      height = 720,
      audioFile
    } = options;

    console.log(`🎬 Criando vídeo ${width}x${height} @ ${fps}fps`);

    try {
      // ✅ 1. Write images to FFmpeg filesystem
      console.log('📝 Escrevendo imagens...');
      
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const filename = `image${i.toString().padStart(3, '0')}.jpg`;
        
        const imageData = await fetchFile(img.url);
        await this.ffmpeg.writeFile(filename, imageData);
        
        if (onProgress) {
          onProgress(Math.round((i / images.length) * 30));
        }
      }

      // ✅ 2. Write audio if provided
      if (audioFile) {
        console.log('🎵 Escrevendo áudio...');
        const audioData = await fetchFile(audioFile);
        await this.ffmpeg.writeFile('audio.mp3', audioData);
      }

      // ✅ 3. Calculate video duration
      const imageDuration = audioFile ? await this.getAudioDuration(audioFile) : images.length * 2;
      const durationPerImage = imageDuration / images.length;

      console.log(`⏱️ Duração: ${imageDuration}s (${durationPerImage}s por imagem)`);

      // ✅ 4. Create video from images
      console.log('🎬 Renderizando vídeo...');
      
      const ffmpegArgs = [
        '-framerate', `1/${durationPerImage}`,
        '-i', 'image%03d.jpg',
        '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1`,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-r', fps.toString(),
      ];

      // ✅ Add audio if available
      if (audioFile) {
        ffmpegArgs.push(
          '-i', 'audio.mp3',
          '-c:a', 'aac',
          '-shortest',
          '-map', '0:v:0',
          '-map', '1:a:0'
        );
      } else {
        ffmpegArgs.push('-t', imageDuration.toString());
      }

      ffmpegArgs.push('output.mp4');

      await this.ffmpeg.exec(ffmpegArgs);

      if (onProgress) onProgress(95);

      // ✅ 5. Read output
      console.log('📤 Lendo vídeo final...');
      const data = await this.ffmpeg.readFile('output.mp4');

      if (onProgress) onProgress(100);

      // ✅ 6. Cleanup
      console.log('🧹 Limpando arquivos temporários...');
      
      for (let i = 0; i < images.length; i++) {
        const filename = `image${i.toString().padStart(3, '0')}.jpg`;
        try {
          await this.ffmpeg.deleteFile(filename);
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      if (audioFile) {
        try {
          await this.ffmpeg.deleteFile('audio.mp3');
        } catch (e) {
          // Ignore
        }
      }

      try {
        await this.ffmpeg.deleteFile('output.mp4');
      } catch (e) {
        // Ignore
      }

      console.log('✅ Vídeo criado com sucesso!');

      return new Blob([data], { type: 'video/mp4' });

    } catch (error) {
      console.error('❌ Erro ao criar vídeo:', error);
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
