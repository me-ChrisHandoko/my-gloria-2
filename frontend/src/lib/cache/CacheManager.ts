/**
 * Advanced Cache Manager for Gloria System
 * Production-ready caching with multiple strategies and intelligent invalidation
 */

import {
  CacheStorage,
  CacheStrategy,
  CacheConfig,
  CacheStats,
  CacheEventMap,
  CacheEventListener,
  CacheSyncMessage,
  CacheInvalidationStrategy,
  CACHE_TTL,
  CACHE_KEYS,
  CachePriority,
} from './types';
import { MemoryStorage } from './storage/MemoryStorage';
import { LocalStorageCache } from './storage/LocalStorage';
import { IndexedDBStorage } from './storage/IndexedDBStorage';

export class CacheManager {
  private static instance: CacheManager;
  private storages: Map<CacheStrategy, CacheStorage>;
  private listeners: Map<keyof CacheEventMap, Set<CacheEventListener<any>>>;
  private stats: CacheStats;
  private broadcastChannel: BroadcastChannel | null = null;
  private invalidationStrategies: Set<CacheInvalidationStrategy>;
  private defaultConfig: CacheConfig;

  private constructor() {
    this.storages = new Map();
    this.listeners = new Map();
    this.invalidationStrategies = new Set();

    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      itemCount: 0,
      evictions: 0,
      errors: 0,
      lastCleaned: Date.now(),
    };

    this.defaultConfig = {
      strategy: CacheStrategy.HYBRID,
      ttl: CACHE_TTL.MEDIUM,
      priority: CachePriority.MEDIUM,
      compress: false,
      encrypt: false,
      persistOnUnload: true,
      syncAcrossTabs: true,
    };

    this.initializeStorages();
    this.setupBroadcastChannel();
    this.setupEventListeners();
    this.startBackgroundTasks();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private initializeStorages(): void {
    // Initialize different storage strategies
    this.storages.set(CacheStrategy.MEMORY, new MemoryStorage());
    this.storages.set(CacheStrategy.LOCAL_STORAGE, new LocalStorageCache());
    this.storages.set(CacheStrategy.SESSION_STORAGE, new LocalStorageCache()); // Reuse with different prefix
    this.storages.set(CacheStrategy.INDEXED_DB, new IndexedDBStorage());
  }

  private setupBroadcastChannel(): void {
    if (typeof BroadcastChannel !== 'undefined' && this.defaultConfig.syncAcrossTabs) {
      try {
        this.broadcastChannel = new BroadcastChannel('gloria_cache_sync');
        this.broadcastChannel.onmessage = (event) => {
          this.handleSyncMessage(event.data);
        };
      } catch (error) {
        console.warn('BroadcastChannel not available:', error);
      }
    }
  }

  private setupEventListeners(): void {
    // Listen for page unload to persist cache
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.defaultConfig.persistOnUnload) {
          this.persistMemoryCache();
        }
      });

      // Listen for online/offline events
      window.addEventListener('online', () => {
        this.emit('hit', { key: 'network', value: 'online' });
      });

      window.addEventListener('offline', () => {
        this.emit('hit', { key: 'network', value: 'offline' });
      });
    }
  }

  private startBackgroundTasks(): void {
    // Periodic cleanup task
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Stats calculation
    setInterval(() => {
      this.calculateStats();
    }, 30 * 1000); // Every 30 seconds
  }

  // Public API methods

  async get<T>(
    key: string,
    config?: Partial<CacheConfig>
  ): Promise<T | null> {
    const strategy = config?.strategy ?? this.defaultConfig.strategy;
    const storage = this.getStorage(strategy!);

    try {
      // Try hybrid strategy (memory first, then persistent storage)
      if (strategy === CacheStrategy.HYBRID) {
        const memoryResult = await this.storages.get(CacheStrategy.MEMORY)?.get<T>(key);
        if (memoryResult !== null) {
          this.stats.hits++;
          this.emit('hit', { key, value: memoryResult });
          return memoryResult as T;
        }

        // Try persistent storage
        const persistentResult = await this.storages.get(CacheStrategy.INDEXED_DB)?.get<T>(key);
        if (persistentResult !== null) {
          // Populate memory cache for faster access
          await this.storages.get(CacheStrategy.MEMORY)?.set(key, persistentResult, config);
          this.stats.hits++;
          this.emit('hit', { key, value: persistentResult });
          return persistentResult as T;
        }
      } else {
        const result = await storage.get<T>(key);
        if (result !== null) {
          this.stats.hits++;
          this.emit('hit', { key, value: result });
          return result;
        }
      }

      this.stats.misses++;
      this.emit('miss', { key });
      return null;
    } catch (error) {
      this.stats.errors++;
      this.emit('error', { error: error as Error, operation: 'get' });
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    config?: Partial<CacheConfig>
  ): Promise<void> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const strategy = mergedConfig.strategy!;

    try {
      if (strategy === CacheStrategy.HYBRID) {
        // Store in both memory and persistent storage
        await Promise.all([
          this.storages.get(CacheStrategy.MEMORY)?.set(key, value, mergedConfig),
          this.storages.get(CacheStrategy.INDEXED_DB)?.set(key, value, mergedConfig),
        ]);
      } else {
        const storage = this.getStorage(strategy);
        await storage.set(key, value, mergedConfig);
      }

      this.emit('set', { key, value });

      // Broadcast to other tabs
      if (this.broadcastChannel && mergedConfig.syncAcrossTabs) {
        const message: CacheSyncMessage = {
          type: 'set',
          key,
          value,
          config: mergedConfig,
          timestamp: Date.now(),
          tabId: this.getTabId(),
        };
        this.broadcastChannel.postMessage(message);
      }
    } catch (error) {
      this.stats.errors++;
      this.emit('error', { error: error as Error, operation: 'set' });
      throw error;
    }
  }

  async delete(key: string, strategy?: CacheStrategy): Promise<void> {
    const targetStrategy = strategy ?? this.defaultConfig.strategy;

    try {
      if (targetStrategy === CacheStrategy.HYBRID) {
        // Delete from all storages
        await Promise.all(
          Array.from(this.storages.values()).map(storage => storage.delete(key))
        );
      } else {
        const storage = this.getStorage(targetStrategy!);
        await storage.delete(key);
      }

      this.emit('delete', { key });

      // Broadcast to other tabs
      if (this.broadcastChannel) {
        const message: CacheSyncMessage = {
          type: 'delete',
          key,
          timestamp: Date.now(),
          tabId: this.getTabId(),
        };
        this.broadcastChannel.postMessage(message);
      }
    } catch (error) {
      this.stats.errors++;
      this.emit('error', { error: error as Error, operation: 'delete' });
    }
  }

  async clear(strategy?: CacheStrategy): Promise<void> {
    const targetStrategy = strategy ?? this.defaultConfig.strategy;

    try {
      if (targetStrategy === CacheStrategy.HYBRID) {
        // Clear all storages
        await Promise.all(
          Array.from(this.storages.values()).map(storage => storage.clear())
        );
      } else {
        const storage = this.getStorage(targetStrategy!);
        await storage.clear();
      }

      this.emit('clear', undefined);

      // Broadcast to other tabs
      if (this.broadcastChannel) {
        const message: CacheSyncMessage = {
          type: 'clear',
          timestamp: Date.now(),
          tabId: this.getTabId(),
        };
        this.broadcastChannel.postMessage(message);
      }

      // Reset stats
      this.stats = {
        ...this.stats,
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: 0,
        itemCount: 0,
      };
    } catch (error) {
      this.stats.errors++;
      this.emit('error', { error: error as Error, operation: 'clear' });
    }
  }

  async has(key: string, strategy?: CacheStrategy): Promise<boolean> {
    const targetStrategy = strategy ?? this.defaultConfig.strategy;
    const storage = this.getStorage(targetStrategy!);

    try {
      return await storage.has(key);
    } catch {
      return false;
    }
  }

  // Pattern-based invalidation
  async invalidate(pattern: string | RegExp): Promise<void> {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    for (const storage of this.storages.values()) {
      const keys = await storage.keys();
      const keysToDelete = keys.filter(key => regex.test(key));

      await Promise.all(keysToDelete.map(key => storage.delete(key)));
    }
  }

  // Tag-based invalidation
  async invalidateByTag(tag: string): Promise<void> {
    // IndexedDB storage supports tag-based queries
    const indexedDB = this.storages.get(CacheStrategy.INDEXED_DB) as IndexedDBStorage;
    if (indexedDB && indexedDB.deleteByTag) {
      await indexedDB.deleteByTag(tag);
    }

    // For other storages, we need to check each item
    for (const [strategy, storage] of this.storages) {
      if (strategy === CacheStrategy.INDEXED_DB) continue;

      const keys = await storage.keys();
      for (const key of keys) {
        const metadata = await storage.getMetadata(key);
        if (metadata?.tags?.includes(tag)) {
          await storage.delete(key);
        }
      }
    }
  }

  // Advanced features

  async preload(keys: string[], config?: Partial<CacheConfig>): Promise<void> {
    // Preload multiple keys into memory cache for performance
    const promises = keys.map(async (key) => {
      const value = await this.get(key, config);
      if (value !== null) {
        await this.storages.get(CacheStrategy.MEMORY)?.set(key, value, config);
      }
    });

    await Promise.all(promises);
  }

  async warmup(data: Array<{ key: string; value: any; config?: Partial<CacheConfig> }>): Promise<void> {
    // Warm up cache with initial data
    const promises = data.map(({ key, value, config }) =>
      this.set(key, value, config)
    );

    await Promise.all(promises);
  }

  // Event handling

  on<K extends keyof CacheEventMap>(
    event: K,
    listener: CacheEventListener<K>
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(listener);
  }

  off<K extends keyof CacheEventMap>(
    event: K,
    listener: CacheEventListener<K>
  ): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit<K extends keyof CacheEventMap>(
    event: K,
    data: CacheEventMap[K]
  ): void {
    this.listeners.get(event)?.forEach(listener => listener(data));
  }

  // Statistics and monitoring

  getStats(): CacheStats {
    return { ...this.stats };
  }

  async getDetailedStats(): Promise<{
    global: CacheStats;
    byStrategy: Map<CacheStrategy, any>;
  }> {
    const byStrategy = new Map();

    for (const [strategy, storage] of this.storages) {
      if ('getStats' in storage && typeof storage.getStats === 'function') {
        byStrategy.set(strategy, await storage.getStats());
      }
    }

    return {
      global: this.getStats(),
      byStrategy,
    };
  }

  // Private helper methods

  private getStorage(strategy: CacheStrategy): CacheStorage {
    const storage = this.storages.get(strategy);
    if (!storage) {
      throw new Error(`Storage strategy ${strategy} not initialized`);
    }
    return storage;
  }

  private async persistMemoryCache(): Promise<void> {
    const memoryStorage = this.storages.get(CacheStrategy.MEMORY);
    const persistentStorage = this.storages.get(CacheStrategy.INDEXED_DB);

    if (memoryStorage && persistentStorage) {
      const keys = await memoryStorage.keys();
      for (const key of keys) {
        const value = await memoryStorage.get(key);
        const metadata = await memoryStorage.getMetadata(key);
        if (value !== null && metadata) {
          await persistentStorage.set(key, value, {
            ttl: metadata.ttl,
            priority: metadata.priority,
          });
        }
      }
    }
  }

  private async cleanup(): Promise<void> {
    // Run cleanup on all storages
    for (const storage of this.storages.values()) {
      if ('cleanup' in storage && typeof storage.cleanup === 'function') {
        await (storage as any).cleanup();
      }
    }

    // Run invalidation strategies
    for (const strategy of this.invalidationStrategies) {
      for (const storage of this.storages.values()) {
        const keys = await storage.keys();
        for (const key of keys) {
          const metadata = await storage.getMetadata(key);
          if (metadata) {
            const item = { key, data: null, metadata };
            if (strategy.shouldInvalidate(item)) {
              await storage.delete(key);
              strategy.onInvalidate?.(item);
            }
          }
        }
      }
    }

    this.stats.lastCleaned = Date.now();
  }

  private async calculateStats(): Promise<void> {
    let totalSize = 0;
    let totalItems = 0;

    for (const storage of this.storages.values()) {
      totalSize += await storage.size();
      totalItems += (await storage.keys()).length;
    }

    this.stats.size = totalSize;
    this.stats.itemCount = totalItems;
    this.stats.hitRate =
      this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
        : 0;
  }

  private handleSyncMessage(message: CacheSyncMessage): void {
    // Ignore messages from the same tab
    if (message.tabId === this.getTabId()) return;

    // Apply the cache operation from another tab
    switch (message.type) {
      case 'set':
        if (message.key && message.value) {
          // Update local memory cache
          this.storages.get(CacheStrategy.MEMORY)?.set(
            message.key,
            message.value,
            message.config
          );
        }
        break;
      case 'delete':
        if (message.key) {
          this.storages.get(CacheStrategy.MEMORY)?.delete(message.key);
        }
        break;
      case 'clear':
        this.storages.get(CacheStrategy.MEMORY)?.clear();
        break;
    }
  }

  private getTabId(): string {
    // Generate or retrieve a unique tab ID
    if (typeof window !== 'undefined' && window.sessionStorage) {
      let tabId = sessionStorage.getItem('gloria_tab_id');
      if (!tabId) {
        tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('gloria_tab_id', tabId);
      }
      return tabId;
    }
    return 'unknown';
  }

  // Add invalidation strategy
  addInvalidationStrategy(strategy: CacheInvalidationStrategy): void {
    this.invalidationStrategies.add(strategy);
  }

  removeInvalidationStrategy(strategy: CacheInvalidationStrategy): void {
    this.invalidationStrategies.delete(strategy);
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();