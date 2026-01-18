import { openDB, type IDBPDatabase } from 'idb';
import { logger } from './logger';

export type AnimationType = 'zoomIn' | 'zoomOut' | 'panLeft' | 'panRight' | 'panUp' | 'panDown' | 'zoomInRotate' | 'kenBurnsClassic' | 'none';

export interface StoredImage {
  id: string;
  url: string;
  blob?: Blob;
  prompt: string;
  timestamp: number;
  segmentIndex: number;
  animationType?: AnimationType;
  videoUrl?: string; // URL do vídeo gerado por IA (RunwayML, Luma, Stability)
}

const DB_NAME = 'tonmoves-images';
const STORE_NAME = 'images';
const DB_VERSION = 1;

export class ImageStorage {
  private db: IDBPDatabase | null = null;

  async init() {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('segmentIndex', 'segmentIndex');
        }
      },
    });
  }

  async saveImage(image: StoredImage): Promise<void> {
    try {
      logger.storage.saving(image.id, 'image');
      if (!this.db) await this.init();
      await this.db!.put(STORE_NAME, image);
      logger.storage.saved(image.id, 'image');
    } catch (error) {
      logger.storage.error('saveImage', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  async getImage(id: string): Promise<StoredImage | undefined> {
    try {
      if (!this.db) await this.init();
      const image = await this.db!.get(STORE_NAME, id);
      logger.debug('STORAGE', `Imagem ${id}: ${image ? 'encontrada' : 'não encontrada'}`);
      return image;
    } catch (error) {
      logger.storage.error('getImage', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  async getAllImages(): Promise<StoredImage[]> {
    try {
      logger.storage.loading('images');
      if (!this.db) await this.init();
      const images = await this.db!.getAll(STORE_NAME);
      logger.storage.loaded('images', images.length);

      // Log detalhado de cada imagem
      images.forEach((img, i) => {
        logger.debug('STORAGE', `Imagem ${i + 1}/${images.length}`, {
          id: img.id,
          url: img.url?.substring(0, 60),
          hasBlob: !!img.blob,
          hasVideoUrl: !!img.videoUrl,
        });
      });

      return images;
    } catch (error) {
      logger.storage.error('getAllImages', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  async deleteImage(id: string): Promise<void> {
    try {
      if (!this.db) await this.init();
      await this.db!.delete(STORE_NAME, id);
      logger.info('STORAGE', `Imagem deletada: ${id}`);
    } catch (error) {
      logger.storage.error('deleteImage', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  async clearAll(): Promise<void> {
    try {
      if (!this.db) await this.init();
      await this.db!.clear(STORE_NAME);
      logger.info('STORAGE', 'Todas as imagens deletadas');
    } catch (error) {
      logger.storage.error('clearAll', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  async downloadImage(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    return await response.blob();
  }
}
