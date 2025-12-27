import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { StoredImage } from './imageStorage';

export interface VideoOptions {
  fps: number;
  width: number;
  height: number;
  audioFile: File;
}

export class VideoComposer {
  private ffmpeg: FFmpeg;
  private loaded = false;

  constructor() {
    this.ffmpeg = new FFmpeg();
  }

  async load(onProgress?: (progress: number) => void) {
    if (this.loaded) return;

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    
    this.ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message);
    });

    if (onProgress) {
      this.ffmpeg.on('progress', ({ progress }) => {
        onProgress(progress * 100);
      });
    }

    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    this.loaded = true;
  }

  async createVideo(
    images: StoredImage[],
    options: VideoOptions,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (!this.loaded) {
      await this.load(onProgress);
    }

    // Sort images by segment index
    const sortedImages = [...images].sort((a, b) => a.segmentIndex - b.segmentIndex);

    // Write images to FFmpeg filesystem
    for (let i = 0; i < sortedImages.length; i++) {
      const img = sortedImages[i];
      const fileName = `img${String(i).padStart(3, '0')}.jpg`;
      await this.ffmpeg.writeFile(fileName, await fetchFile(img.blob));
    }

    // Write audio file
    await this.ffmpeg.writeFile('audio.mp3', await fetchFile(options.audioFile));

    // Calculate duration per image based on audio duration
    const audioDuration = await this.getAudioDuration(options.audioFile);
    const durationPerImage = audioDuration / sortedImages.length;

    // Create video with images
    // Each image will be shown for durationPerImage seconds
    await this.ffmpeg.exec([
      '-framerate', `1/${durationPerImage}`,
      '-i', 'img%03d.jpg',
      '-i', 'audio.mp3',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-shortest',
      '-vf', `scale=${options.width}:${options.height}`,
      'output.mp4'
    ]);

    // Read output video
    const data = await this.ffmpeg.readFile('output.mp4');
    
    // Cleanup
    await this.cleanup(sortedImages.length);

    return new Blob([data], { type: 'video/mp4' });
  }

  private async getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
      audio.src = URL.createObjectURL(file);
    });
  }

  private async cleanup(imageCount: number) {
    // Remove temporary files
    for (let i = 0; i < imageCount; i++) {
      const fileName = `img${String(i).padStart(3, '0')}.jpg`;
      try {
        await this.ffmpeg.deleteFile(fileName);
      } catch (e) {
        // Ignore errors
      }
    }
    
    try {
      await this.ffmpeg.deleteFile('audio.mp3');
      await this.ffmpeg.deleteFile('output.mp4');
    } catch (e) {
      // Ignore errors
    }
  }
}
