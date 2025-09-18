/**
 * LocalStorage-based cache implementation
 * Persistent caching across browser sessions
 */

import {
  CacheStorage,
  CacheItem,
  CacheMetadata,
  CacheConfig,
  CachePriority,
  CACHE_LIMITS
} from '../types';

export class LocalStorageCache implements CacheStorage {
  private readonly prefix = 'gloria_cache_';
  private readonly metaKey = 'gloria_cache_meta';

  constructor(private maxSize: number = CACHE_LIMITS.MAX_STORAGE_SIZE) {
    this.initializeMetadata();
  }

  private initializeMetadata(): void {
    if (!this.isAvailable()) return;

    const meta = this.getMetaData();
    if (!meta) {
      this.setMetaData({
        keys: [],
        totalSize: 0,
        lastCleaned: Date.now(),
      });
    }
  }

  private isAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private getMetaData(): any {
    try {
      const meta = localStorage.getItem(this.metaKey);
      return meta ? JSON.parse(meta) : null;
    } catch {
      return null;
    }
  }

  private setMetaData(meta: any): void {
    try {
      localStorage.setItem(this.metaKey, JSON.stringify(meta));
    } catch (e) {
      console.error('Failed to update cache metadata:', e);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return null;

    try {
      const itemStr = localStorage.getItem(this.prefix + key);
      if (!itemStr) return null;

      const item: CacheItem<T> = JSON.parse(itemStr);

      // Check expiration
      if (this.isExpired(item)) {
        await this.delete(key);
        return null;
      }

      // Update hit count
      item.metadata.hits++;
      localStorage.setItem(this.prefix + key, JSON.stringify(item));

      return item.data;
    } catch (e) {
      console.error(`Failed to get cache item ${key}:`, e);
      return null;
    }
  }

  async set<T>(key: string, value: T, config?: CacheConfig): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const size = this.calculateSize(value);

      if (size > CACHE_LIMITS.MAX_ITEM_SIZE) {
        throw new Error(`Item size exceeds maximum allowed`);
      }

      // Check available space and evict if needed
      await this.evictIfNeeded(size);

      const metadata: CacheMetadata = {
        timestamp: Date.now(),
        ttl: config?.ttl ?? 0,
        hits: 0,
        size,
        priority: config?.priority ?? CachePriority.MEDIUM,
        compressed: false,
        encrypted: false,
        tags: [],
      };

      const item: CacheItem<T> = {
        key,
        data: value,
        metadata,
      };

      localStorage.setItem(this.prefix + key, JSON.stringify(item));

      // Update metadata
      const meta = this.getMetaData();
      if (!meta.keys.includes(key)) {
        meta.keys.push(key);
      }
      meta.totalSize = await this.calculateTotalSize();
      this.setMetaData(meta);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        // Try to free up space and retry
        await this.cleanup();
        try {
          const item: CacheItem<T> = {
            key,
            data: value,
            metadata: {
              timestamp: Date.now(),
              ttl: config?.ttl ?? 0,
              hits: 0,
              size: this.calculateSize(value),
              priority: config?.priority ?? CachePriority.MEDIUM,
              compressed: false,
              encrypted: false,
            },
          };
          localStorage.setItem(this.prefix + key, JSON.stringify(item));
        } catch {
          throw new Error('Cache storage quota exceeded');
        }
      } else {
        throw e;
      }
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isAvailable()) return;

    localStorage.removeItem(this.prefix + key);

    // Update metadata
    const meta = this.getMetaData();
    if (meta) {
      meta.keys = meta.keys.filter((k: string) => k !== key);
      meta.totalSize = await this.calculateTotalSize();
      this.setMetaData(meta);
    }
  }

  async clear(): Promise<void> {
    if (!this.isAvailable()) return;

    const meta = this.getMetaData();
    if (meta) {
      for (const key of meta.keys) {
        localStorage.removeItem(this.prefix + key);
      }
    }

    this.setMetaData({
      keys: [],
      totalSize: 0,
      lastCleaned: Date.now(),
    });
  }

  async has(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    const item = await this.get(key);
    return item !== null;
  }

  async size(): Promise<number> {
    return this.calculateTotalSize();
  }

  async keys(): Promise<string[]> {
    if (!this.isAvailable()) return [];

    const meta = this.getMetaData();
    if (!meta) return [];

    // Clean up expired items
    await this.cleanup();

    return meta.keys;
  }

  async getMetadata(key: string): Promise<CacheMetadata | null> {
    if (!this.isAvailable()) return null;

    try {
      const itemStr = localStorage.getItem(this.prefix + key);
      if (!itemStr) return null;

      const item: CacheItem = JSON.parse(itemStr);
      return item.metadata;
    } catch {
      return null;
    }
  }

  async updateMetadata(key: string, metadata: Partial<CacheMetadata>): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const itemStr = localStorage.getItem(this.prefix + key);
      if (!itemStr) return;

      const item: CacheItem = JSON.parse(itemStr);
      Object.assign(item.metadata, metadata);
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (e) {
      console.error(`Failed to update metadata for ${key}:`, e);
    }
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

  private async calculateTotalSize(): Promise<number> {
    if (!this.isAvailable()) return 0;

    let totalSize = 0;
    const meta = this.getMetaData();

    if (meta) {
      for (const key of meta.keys) {
        const itemStr = localStorage.getItem(this.prefix + key);
        if (itemStr) {
          totalSize += new Blob([itemStr]).size;
        }
      }
    }

    return totalSize;
  }

  private async evictIfNeeded(requiredSize: number): Promise<void> {
    const currentSize = await this.calculateTotalSize();

    if (currentSize + requiredSize <= this.maxSize) {
      return;
    }

    // Get all items with metadata
    const items: Array<{ key: string; item: CacheItem }> = [];
    const meta = this.getMetaData();

    if (meta) {
      for (const key of meta.keys) {
        const itemStr = localStorage.getItem(this.prefix + key);
        if (itemStr) {
          try {
            items.push({ key, item: JSON.parse(itemStr) });
          } catch {
            // Invalid item, remove it
            localStorage.removeItem(this.prefix + key);
          }
        }
      }
    }

    // Sort by priority and timestamp (LRU within same priority)
    items.sort((a, b) => {
      if (a.item.metadata.priority !== b.item.metadata.priority) {
        return a.item.metadata.priority - b.item.metadata.priority;
      }
      return a.item.metadata.timestamp - b.item.metadata.timestamp;
    });

    // Evict items until we have enough space
    let freedSpace = 0;
    const targetSpace = requiredSize + (this.maxSize * 0.1); // Free extra 10%

    for (const { key, item } of items) {
      if (freedSpace >= targetSpace) break;

      freedSpace += item.metadata.size;
      await this.delete(key);
    }
  }

  private async cleanup(): Promise<void> {
    if (!this.isAvailable()) return;

    const meta = this.getMetaData();
    if (!meta) return;

    const validKeys: string[] = [];
    const now = Date.now();

    // Clean up expired items
    for (const key of meta.keys) {
      const itemStr = localStorage.getItem(this.prefix + key);
      if (itemStr) {
        try {
          const item: CacheItem = JSON.parse(itemStr);
          if (!this.isExpired(item)) {
            validKeys.push(key);
          } else {
            localStorage.removeItem(this.prefix + key);
          }
        } catch {
          // Invalid item, remove it
          localStorage.removeItem(this.prefix + key);
        }
      }
    }

    meta.keys = validKeys;
    meta.totalSize = await this.calculateTotalSize();
    meta.lastCleaned = now;
    this.setMetaData(meta);
  }

  // Additional utility methods

  async getStats() {
    await this.cleanup();

    const totalSize = await this.calculateTotalSize();
    const meta = this.getMetaData();

    return {
      size: totalSize,
      itemCount: meta?.keys.length ?? 0,
      maxSize: this.maxSize,
      usage: (totalSize / this.maxSize) * 100,
      lastCleaned: meta?.lastCleaned ?? 0,
    };
  }
}