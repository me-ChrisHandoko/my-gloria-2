/**
 * Memory-based cache storage implementation
 * Fast, in-memory caching with LRU eviction
 */

import {
  CacheStorage,
  CacheItem,
  CacheMetadata,
  CacheConfig,
  CachePriority,
  CACHE_LIMITS
} from '../types';

export class MemoryStorage implements CacheStorage {
  private cache: Map<string, CacheItem>;
  private accessOrder: Map<string, number>;
  private currentSize: number;
  private accessCounter: number;

  constructor(private maxSize: number = CACHE_LIMITS.MAX_MEMORY_SIZE) {
    this.cache = new Map();
    this.accessOrder = new Map();
    this.currentSize = 0;
    this.accessCounter = 0;
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if item is expired
    if (this.isExpired(item)) {
      await this.delete(key);
      return null;
    }

    // Update access metadata
    item.metadata.hits++;
    this.accessOrder.set(key, ++this.accessCounter);

    return item.data as T;
  }

  async set<T>(key: string, value: T, config?: CacheConfig): Promise<void> {
    const size = this.calculateSize(value);

    // Check if single item exceeds max size
    if (size > CACHE_LIMITS.MAX_ITEM_SIZE) {
      throw new Error(`Item size (${size} bytes) exceeds maximum allowed (${CACHE_LIMITS.MAX_ITEM_SIZE} bytes)`);
    }

    // Evict items if necessary
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

    // Update cache
    const existingItem = this.cache.get(key);
    if (existingItem) {
      this.currentSize -= existingItem.metadata.size;
    }

    this.cache.set(key, item);
    this.accessOrder.set(key, ++this.accessCounter);
    this.currentSize += size;
  }

  async delete(key: string): Promise<void> {
    const item = this.cache.get(key);
    if (item) {
      this.currentSize -= item.metadata.size;
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder.clear();
    this.currentSize = 0;
    this.accessCounter = 0;
  }

  async has(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (item && this.isExpired(item)) {
      await this.delete(key);
      return false;
    }
    return this.cache.has(key);
  }

  async size(): Promise<number> {
    return this.currentSize;
  }

  async keys(): Promise<string[]> {
    // Clean up expired items first
    await this.cleanupExpired();
    return Array.from(this.cache.keys());
  }

  async getMetadata(key: string): Promise<CacheMetadata | null> {
    const item = this.cache.get(key);
    return item ? item.metadata : null;
  }

  async updateMetadata(key: string, metadata: Partial<CacheMetadata>): Promise<void> {
    const item = this.cache.get(key);
    if (item) {
      Object.assign(item.metadata, metadata);
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
    // Rough estimation of object size in bytes
    const str = JSON.stringify(value);
    return new Blob([str]).size;
  }

  private async evictIfNeeded(requiredSize: number): Promise<void> {
    if (this.currentSize + requiredSize <= this.maxSize) {
      return;
    }

    // Sort items by priority and access order for LRU eviction
    const items = Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      item,
      accessOrder: this.accessOrder.get(key) ?? 0,
    }));

    items.sort((a, b) => {
      // First sort by priority (lower priority evicted first)
      if (a.item.metadata.priority !== b.item.metadata.priority) {
        return a.item.metadata.priority - b.item.metadata.priority;
      }
      // Then by access order (least recently used evicted first)
      return a.accessOrder - b.accessOrder;
    });

    // Evict items until we have enough space
    for (const { key } of items) {
      if (this.currentSize + requiredSize <= this.maxSize) {
        break;
      }
      await this.delete(key);
    }
  }

  private async cleanupExpired(): Promise<void> {
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      await this.delete(key);
    }
  }

  // Additional utility methods

  async getStats() {
    await this.cleanupExpired();

    return {
      size: this.currentSize,
      itemCount: this.cache.size,
      maxSize: this.maxSize,
      usage: (this.currentSize / this.maxSize) * 100,
    };
  }

  async defragment(): Promise<void> {
    // Rebuild the cache to optimize memory usage
    const items = Array.from(this.cache.entries());
    this.cache.clear();
    this.accessOrder.clear();
    this.currentSize = 0;

    for (const [key, item] of items) {
      if (!this.isExpired(item)) {
        this.cache.set(key, item);
        this.currentSize += item.metadata.size;
      }
    }
  }
}