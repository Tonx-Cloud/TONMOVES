import { openDB, type IDBPDatabase } from 'idb';

export interface StoredImage {
  id: string;
  url: string;
  blob: Blob;
  prompt: string;
  timestamp: number;
  segmentIndex: number;
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
    if (!this.db) await this.init();
    await this.db!.put(STORE_NAME, image);
  }

  async getImage(id: string): Promise<StoredImage | undefined> {
    if (!this.db) await this.init();
    return await this.db!.get(STORE_NAME, id);
  }

  async getAllImages(): Promise<StoredImage[]> {
    if (!this.db) await this.init();
    return await this.db!.getAll(STORE_NAME);
  }

  async deleteImage(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete(STORE_NAME, id);
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.clear(STORE_NAME);
  }

  async downloadImage(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    return await response.blob();
  }
}
