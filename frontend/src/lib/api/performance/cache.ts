/**
 * Advanced Caching Service
 *
 * Production-ready caching service with multiple storage strategies.
 * Features:
 * - Multiple storage backends (Memory, SessionStorage, LocalStorage, IndexedDB)
 * - Cache invalidation strategies
 * - Cache versioning and migration
 * - Size limits and eviction policies
 * - Compression support
 * - Cross-tab synchronization
 * - Partial cache updates
 */

import { compress, decompress } from '@/lib/utils/compression';
import { logger } from '@/lib/errors/errorLogger';

export enum CacheStrategy {
  MEMORY = 'memory',
  SESSION = 'session',
  LOCAL = 'local',
  INDEXED_DB = 'indexeddb',
  HYBRID = 'hybrid', // Memory + Persistent
}

export enum EvictionPolicy {
  LRU = 'lru', // Least Recently Used
  LFU = 'lfu', // Least Frequently Used
  FIFO = 'fifo', // First In First Out
  TTL = 'ttl', // Time To Live based
}

interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  expiresAt?: number;
  version: number;
  compressed: boolean;
  metadata?: Record<string, any>;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

interface CacheOptions {
  strategy?: CacheStrategy;
  maxSize?: number; // In bytes
  maxEntries?: number;
  ttl?: number; // Default TTL in milliseconds
  compression?: boolean;
  version?: number;
  evictionPolicy?: EvictionPolicy;
  enableCrossTab?: boolean;
  namespace?: string;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  entries: number;
  hitRate: number;
  compressionRatio: number;
}

export class AdvancedCache<T = any> {
  private memoryCache = new Map<string, CacheEntry<T>>();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    entries: 0,
    hitRate: 0,
    compressionRatio: 1,
  };
  private dbName: string;
  private storeName = 'cache';
  private db: IDBDatabase | null = null;
  private broadcastChannel: BroadcastChannel | null = null;

  constructor(private options: CacheOptions = {}) {
    this.options = {
      strategy: CacheStrategy.HYBRID,
      maxSize: 50 * 1024 * 1024, // 50MB
      maxEntries: 1000,
      ttl: 5 * 60 * 1000, // 5 minutes
      compression: true,
      version: 1,
      evictionPolicy: EvictionPolicy.LRU,
      enableCrossTab: true,
      namespace: 'gloria',
      ...options,
    };

    this.dbName = `${this.options.namespace}_cache`;
    this.initialize();
  }

  /**
   * Initialize cache
   */
  private async initialize(): Promise<void> {
    // Initialize IndexedDB if needed
    if (
      this.options.strategy === CacheStrategy.INDEXED_DB ||
      this.options.strategy === CacheStrategy.HYBRID
    ) {
      await this.initIndexedDB();
    }

    // Initialize cross-tab communication
    if (this.options.enableCrossTab && typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel(`${this.options.namespace}_cache`);
      this.setupCrossTabSync();
    }

    // Load persistent cache into memory for hybrid strategy
    if (this.options.strategy === CacheStrategy.HYBRID) {
      await this.loadPersistentCache();
    }

    logger.info('Cache initialized', {
      strategy: this.options.strategy,
      namespace: this.options.namespace,
    });
  }

  /**
   * Initialize IndexedDB
   */
  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.options.version);

      request.onerror = () => {
        logger.error('Failed to open IndexedDB', request.error as Error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    });
  }

  /**
   * Get value from cache
   */
  async get(key: string): Promise<T | null> {
    const fullKey = this.getFullKey(key);

    // Check memory cache first
    const memoryEntry = this.memoryCache.get(fullKey);
    if (memoryEntry && this.isValid(memoryEntry)) {
      this.recordHit(memoryEntry);
      return await this.extractValue(memoryEntry);
    }

    // Check persistent storage
    if (this.shouldCheckPersistent()) {
      const persistentEntry = await this.getPersistent(fullKey);
      if (persistentEntry && this.isValid(persistentEntry)) {
        // Add to memory cache
        this.memoryCache.set(fullKey, persistentEntry);
        this.recordHit(persistentEntry);
        return await this.extractValue(persistentEntry);
      }
    }

    this.recordMiss();
    return null;
  }

  /**
   * Set value in cache
   */
  async set(
    key: string,
    value: T,
    options?: {
      ttl?: number;
      metadata?: Record<string, any>;
      skipCompression?: boolean;
    }
  ): Promise<void> {
    const fullKey = this.getFullKey(key);
    const ttl = options?.ttl || this.options.ttl || 0;
    const shouldCompress = this.options.compression && !options?.skipCompression;

    // Prepare entry
    const entry: CacheEntry<T> = {
      key: fullKey,
      value: shouldCompress ? await compress(value) : value,
      timestamp: Date.now(),
      expiresAt: ttl > 0 ? Date.now() + ttl : undefined,
      version: this.options.version || 1,
      compressed: shouldCompress,
      metadata: options?.metadata,
      accessCount: 0,
      lastAccessed: Date.now(),
      size: this.calculateSize(value),
    };

    // Check size limits
    await this.enforceEvictionPolicy(entry.size);

    // Set in memory
    this.memoryCache.set(fullKey, entry);

    // Set in persistent storage
    if (this.shouldPersist()) {
      await this.setPersistent(fullKey, entry);
    }

    // Broadcast update
    this.broadcastUpdate('set', fullKey, entry);

    this.updateMetrics();
    logger.debug('Cache set', { key: fullKey, size: entry.size, compressed: shouldCompress });
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);

    // Delete from memory
    const deleted = this.memoryCache.delete(fullKey);

    // Delete from persistent storage
    if (this.shouldPersist()) {
      await this.deletePersistent(fullKey);
    }

    // Broadcast deletion
    this.broadcastUpdate('delete', fullKey);

    this.updateMetrics();
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();

    if (this.shouldPersist()) {
      await this.clearPersistent();
    }

    this.broadcastUpdate('clear');
    this.resetMetrics();

    logger.info('Cache cleared');
  }

  /**
   * Get value from persistent storage
   */
  private async getPersistent(key: string): Promise<CacheEntry<T> | null> {
    if (this.options.strategy === CacheStrategy.SESSION) {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    }

    if (this.options.strategy === CacheStrategy.LOCAL) {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    }

    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    return null;
  }

  /**
   * Set value in persistent storage
   */
  private async setPersistent(key: string, entry: CacheEntry<T>): Promise<void> {
    if (this.options.strategy === CacheStrategy.SESSION) {
      sessionStorage.setItem(key, JSON.stringify(entry));
      return;
    }

    if (this.options.strategy === CacheStrategy.LOCAL) {
      localStorage.setItem(key, JSON.stringify(entry));
      return;
    }

    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(entry);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Delete from persistent storage
   */
  private async deletePersistent(key: string): Promise<void> {
    if (this.options.strategy === CacheStrategy.SESSION) {
      sessionStorage.removeItem(key);
      return;
    }

    if (this.options.strategy === CacheStrategy.LOCAL) {
      localStorage.removeItem(key);
      return;
    }

    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Clear persistent storage
   */
  private async clearPersistent(): Promise<void> {
    if (this.options.strategy === CacheStrategy.SESSION) {
      sessionStorage.clear();
      return;
    }

    if (this.options.strategy === CacheStrategy.LOCAL) {
      localStorage.clear();
      return;
    }

    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Load persistent cache into memory
   */
  private async loadPersistentCache(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result as CacheEntry<T>[];
        entries.forEach(entry => {
          if (this.isValid(entry)) {
            this.memoryCache.set(entry.key, entry);
          }
        });
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Enforce eviction policy
   */
  private async enforceEvictionPolicy(newEntrySize: number): Promise<void> {
    const currentSize = this.calculateTotalSize();
    const maxSize = this.options.maxSize || Infinity;
    const maxEntries = this.options.maxEntries || Infinity;

    // Check if eviction is needed
    if (
      currentSize + newEntrySize <= maxSize &&
      this.memoryCache.size < maxEntries
    ) {
      return;
    }

    // Evict based on policy
    switch (this.options.evictionPolicy) {
      case EvictionPolicy.LRU:
        await this.evictLRU(newEntrySize);
        break;
      case EvictionPolicy.LFU:
        await this.evictLFU(newEntrySize);
        break;
      case EvictionPolicy.FIFO:
        await this.evictFIFO(newEntrySize);
        break;
      case EvictionPolicy.TTL:
        await this.evictExpired();
        break;
    }
  }

  /**
   * Evict using LRU policy
   */
  private async evictLRU(requiredSpace: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    let freedSpace = 0;
    for (const [key, entry] of entries) {
      if (freedSpace >= requiredSpace) break;

      await this.delete(key);
      freedSpace += entry.size;
      this.metrics.evictions++;
    }
  }

  /**
   * Evict using LFU policy
   */
  private async evictLFU(requiredSpace: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].accessCount - b[1].accessCount);

    let freedSpace = 0;
    for (const [key, entry] of entries) {
      if (freedSpace >= requiredSpace) break;

      await this.delete(key);
      freedSpace += entry.size;
      this.metrics.evictions++;
    }
  }

  /**
   * Evict using FIFO policy
   */
  private async evictFIFO(requiredSpace: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    let freedSpace = 0;
    for (const [key, entry] of entries) {
      if (freedSpace >= requiredSpace) break;

      await this.delete(key);
      freedSpace += entry.size;
      this.metrics.evictions++;
    }
  }

  /**
   * Evict expired entries
   */
  private async evictExpired(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      await this.delete(key);
      this.metrics.evictions++;
    }
  }

  /**
   * Setup cross-tab synchronization
   */
  private setupCrossTabSync(): void {
    if (!this.broadcastChannel) return;

    this.broadcastChannel.onmessage = async (event) => {
      const { type, key, entry } = event.data;

      switch (type) {
        case 'set':
          if (entry) {
            this.memoryCache.set(key, entry);
          }
          break;
        case 'delete':
          this.memoryCache.delete(key);
          break;
        case 'clear':
          this.memoryCache.clear();
          break;
      }

      this.updateMetrics();
    };
  }

  /**
   * Broadcast cache update
   */
  private broadcastUpdate(
    type: 'set' | 'delete' | 'clear',
    key?: string,
    entry?: CacheEntry<T>
  ): void {
    if (!this.broadcastChannel) return;

    this.broadcastChannel.postMessage({ type, key, entry });
  }

  /**
   * Check if entry is valid
   */
  private isValid(entry: CacheEntry<T>): boolean {
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      return false;
    }

    if (entry.version !== this.options.version) {
      return false;
    }

    return true;
  }

  /**
   * Extract value from entry
   */
  private async extractValue(entry: CacheEntry<T>): Promise<T> {
    if (entry.compressed) {
      return await decompress(entry.value);
    }
    return entry.value;
  }

  /**
   * Get full cache key
   */
  private getFullKey(key: string): string {
    return `${this.options.namespace}_${key}`;
  }

  /**
   * Should check persistent storage
   */
  private shouldCheckPersistent(): boolean {
    return [
      CacheStrategy.SESSION,
      CacheStrategy.LOCAL,
      CacheStrategy.INDEXED_DB,
      CacheStrategy.HYBRID,
    ].includes(this.options.strategy!);
  }

  /**
   * Should persist to storage
   */
  private shouldPersist(): boolean {
    return this.shouldCheckPersistent();
  }

  /**
   * Calculate entry size
   */
  private calculateSize(value: any): number {
    return new Blob([JSON.stringify(value)]).size;
  }

  /**
   * Calculate total cache size
   */
  private calculateTotalSize(): number {
    let total = 0;
    this.memoryCache.forEach(entry => {
      total += entry.size;
    });
    return total;
  }

  /**
   * Record cache hit
   */
  private recordHit(entry: CacheEntry<T>): void {
    this.metrics.hits++;
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.updateHitRate();
  }

  /**
   * Record cache miss
   */
  private recordMiss(): void {
    this.metrics.misses++;
    this.updateHitRate();
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    this.metrics.entries = this.memoryCache.size;
    this.metrics.size = this.calculateTotalSize();
  }

  /**
   * Reset metrics
   */
  private resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      entries: 0,
      hitRate: 0,
      compressionRatio: 1,
    };
  }

  /**
   * Get metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Destroy cache
   */
  async destroy(): Promise<void> {
    await this.clear();

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }

    if (this.db) {
      this.db.close();
    }

    logger.info('Cache destroyed');
  }
}

// Create default cache instances
export const memoryCache = new AdvancedCache({
  strategy: CacheStrategy.MEMORY,
  maxEntries: 100,
  ttl: 5 * 60 * 1000,
});

export const sessionCache = new AdvancedCache({
  strategy: CacheStrategy.SESSION,
  maxEntries: 50,
  ttl: 30 * 60 * 1000,
});

export const persistentCache = new AdvancedCache({
  strategy: CacheStrategy.HYBRID,
  maxSize: 10 * 1024 * 1024, // 10MB
  compression: true,
  ttl: 60 * 60 * 1000, // 1 hour
});