/**
 * IndexedDB-based cache storage implementation
 * Large-scale persistent storage for complex data
 */

import {
  CacheStorage,
  CacheItem,
  CacheMetadata,
  CacheConfig,
  CachePriority,
  CACHE_LIMITS
} from '../types';

export class IndexedDBStorage implements CacheStorage {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'GloriaCacheDB';
  private readonly storeName = 'cache';
  private readonly version = 1;

  constructor(private maxSize: number = CACHE_LIMITS.MAX_STORAGE_SIZE * 10) {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (!this.isAvailable()) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('timestamp', 'metadata.timestamp', { unique: false });
          store.createIndex('priority', 'metadata.priority', { unique: false });
          store.createIndex('tags', 'metadata.tags', { unique: false, multiEntry: true });
        }
      };
    });
  }

  private isAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  private async ensureConnection(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
  }

  private getStore(mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction([this.storeName], mode);
    return transaction.objectStore(this.storeName);
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return null;

    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      try {
        const store = this.getStore();
        const request = store.get(key);

        request.onsuccess = () => {
          const item = request.result as CacheItem<T> | undefined;

          if (!item) {
            resolve(null);
            return;
          }

          // Check expiration
          if (this.isExpired(item)) {
            this.delete(key).then(() => resolve(null));
            return;
          }

          // Update hit count
          item.metadata.hits++;
          this.updateItem(item);

          resolve(item.data);
        };

        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async set<T>(key: string, value: T, config?: CacheConfig): Promise<void> {
    if (!this.isAvailable()) return;

    await this.ensureConnection();

    const size = this.calculateSize(value);

    if (size > CACHE_LIMITS.MAX_ITEM_SIZE) {
      throw new Error('Item size exceeds maximum allowed');
    }

    // Check space and evict if needed
    await this.evictIfNeeded(size);

    const metadata: CacheMetadata = {
      timestamp: Date.now(),
      ttl: config?.ttl ?? 0,
      hits: 0,
      size,
      priority: config?.priority ?? CachePriority.MEDIUM,
      compressed: config?.compress ?? false,
      encrypted: config?.encrypt ?? false,
      tags: [],
    };

    const item: CacheItem<T> = {
      key,
      data: value,
      metadata,
    };

    return new Promise((resolve, reject) => {
      try {
        const store = this.getStore('readwrite');
        const request = store.put(item);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async delete(key: string): Promise<void> {
    if (!this.isAvailable()) return;

    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      try {
        const store = this.getStore('readwrite');
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async clear(): Promise<void> {
    if (!this.isAvailable()) return;

    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      try {
        const store = this.getStore('readwrite');
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async has(key: string): Promise<boolean> {
    const item = await this.get(key);
    return item !== null;
  }

  async size(): Promise<number> {
    if (!this.isAvailable()) return 0;

    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      try {
        const store = this.getStore();
        const request = store.getAll();

        request.onsuccess = () => {
          const items = request.result as CacheItem[];
          const totalSize = items.reduce((sum, item) => sum + item.metadata.size, 0);
          resolve(totalSize);
        };

        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async keys(): Promise<string[]> {
    if (!this.isAvailable()) return [];

    await this.ensureConnection();

    // Clean up expired items first
    await this.cleanup();

    return new Promise((resolve, reject) => {
      try {
        const store = this.getStore();
        const request = store.getAllKeys();

        request.onsuccess = () => resolve(request.result as string[]);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async getMetadata(key: string): Promise<CacheMetadata | null> {
    if (!this.isAvailable()) return null;

    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      try {
        const store = this.getStore();
        const request = store.get(key);

        request.onsuccess = () => {
          const item = request.result as CacheItem | undefined;
          resolve(item ? item.metadata : null);
        };

        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async updateMetadata(key: string, metadata: Partial<CacheMetadata>): Promise<void> {
    if (!this.isAvailable()) return;

    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      try {
        const store = this.getStore('readwrite');
        const getRequest = store.get(key);

        getRequest.onsuccess = () => {
          const item = getRequest.result as CacheItem | undefined;
          if (item) {
            Object.assign(item.metadata, metadata);
            const putRequest = store.put(item);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
          } else {
            resolve();
          }
        };

        getRequest.onerror = () => reject(getRequest.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Private helper methods

  private isExpired(item: CacheItem): boolean {
    if (item.metadata.ttl === 0 || item.metadata.ttl === Infinity) {
      return false;
    }
    return Date.now() - item.metadata.timestamp > item.metadata.ttl;
  }

  private calculateSize(value: any): number {
    const str = JSON.stringify(value);
    return new Blob([str]).size;
  }

  private async updateItem(item: CacheItem): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const store = this.getStore('readwrite');
        const request = store.put(item);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  private async evictIfNeeded(requiredSize: number): Promise<void> {
    const currentSize = await this.size();

    if (currentSize + requiredSize <= this.maxSize) {
      return;
    }

    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      try {
        const store = this.getStore();
        const index = store.index('priority');
        const request = index.openCursor();

        const itemsToEvict: string[] = [];
        let freedSpace = 0;
        const targetSpace = requiredSize + (this.maxSize * 0.1); // Free extra 10%

        request.onsuccess = () => {
          const cursor = request.result;

          if (cursor && freedSpace < targetSpace) {
            const item = cursor.value as CacheItem;

            // Skip high priority items unless necessary
            if (item.metadata.priority < CachePriority.HIGH || freedSpace === 0) {
              itemsToEvict.push(item.key);
              freedSpace += item.metadata.size;
            }

            cursor.continue();
          } else {
            // Delete evicted items
            Promise.all(itemsToEvict.map(key => this.delete(key)))
              .then(() => resolve())
              .catch(reject);
          }
        };

        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  private async cleanup(): Promise<void> {
    if (!this.isAvailable()) return;

    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      try {
        const store = this.getStore();
        const request = store.getAll();

        request.onsuccess = async () => {
          const items = request.result as CacheItem[];
          const expiredKeys = items
            .filter(item => this.isExpired(item))
            .map(item => item.key);

          await Promise.all(expiredKeys.map(key => this.delete(key)));
          resolve();
        };

        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Additional utility methods

  async getStats() {
    await this.cleanup();

    const totalSize = await this.size();
    const keys = await this.keys();

    return {
      size: totalSize,
      itemCount: keys.length,
      maxSize: this.maxSize,
      usage: (totalSize / this.maxSize) * 100,
    };
  }

  async getItemsByTag(tag: string): Promise<CacheItem[]> {
    if (!this.isAvailable()) return [];

    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      try {
        const store = this.getStore();
        const index = store.index('tags');
        const request = index.getAll(tag);

        request.onsuccess = () => {
          const items = request.result as CacheItem[];
          resolve(items.filter(item => !this.isExpired(item)));
        };

        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async deleteByTag(tag: string): Promise<void> {
    const items = await this.getItemsByTag(tag);
    await Promise.all(items.map(item => this.delete(item.key)));
  }
}