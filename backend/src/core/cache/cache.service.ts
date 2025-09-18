import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export interface CacheKeyOptions {
  prefix?: string;
  suffix?: string;
  params?: Record<string, any>;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Generate a cache key with optional prefix, suffix, and parameters
   */
  generateKey(base: string, options?: CacheKeyOptions): string {
    let key = base;

    if (options?.prefix) {
      key = `${options.prefix}:${key}`;
    }

    if (options?.params) {
      const paramStr = Object.entries(options.params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join(':');
      key = `${key}:${paramStr}`;
    }

    if (options?.suffix) {
      key = `${key}:${options.suffix}`;
    }

    return key;
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug(`Cache hit for key: ${key}`);
      } else {
        this.logger.debug(`Cache miss for key: ${key}`);
      }
      return value || null;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache set for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}:`, error);
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}:`, error);
    }
  }

  /**
   * Reset all cache
   */
  async reset(): Promise<void> {
    try {
      await this.cacheManager.reset();
      this.logger.warn('Cache reset completed');
    } catch (error) {
      this.logger.error('Error resetting cache:', error);
    }
  }

  /**
   * Get or set cache with a factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // If not in cache, execute factory function
      const value = await factory();

      // Store in cache
      await this.set(key, value, ttl);

      return value;
    } catch (error) {
      this.logger.error(`Error in getOrSet for key ${key}:`, error);
      // If there's an error, still try to execute the factory
      return await factory();
    }
  }

  /**
   * Invalidate cache by pattern
   * Note: This only works with Redis backend, not with in-memory cache
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const store = (this.cacheManager as any).store;
      if (store && store.keys) {
        const keys = await store.keys(pattern);
        if (keys && keys.length > 0) {
          await Promise.all(keys.map((key: string) => this.del(key)));
          this.logger.debug(
            `Invalidated ${keys.length} keys matching pattern: ${pattern}`,
          );
        }
      } else {
        this.logger.warn(
          'Pattern invalidation not supported with current cache store',
        );
      }
    } catch (error) {
      this.logger.error(`Error invalidating pattern ${pattern}:`, error);
    }
  }

  /**
   * Delete cache by pattern (alias for invalidatePattern)
   */
  async delPattern(pattern: string): Promise<void> {
    return this.invalidatePattern(pattern);
  }

  /**
   * Get all keys matching a pattern
   * Note: This only works with Redis backend, not with in-memory cache
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      const store = (this.cacheManager as any).store;
      if (store && store.keys) {
        return (await store.keys(pattern)) || [];
      } else {
        this.logger.warn('Keys method not supported with current cache store');
        return [];
      }
    } catch (error) {
      this.logger.error(`Error getting keys for pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Wrap a function with caching
   */
  wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    return this.getOrSet(key, fn, ttl);
  }

  /**
   * Check if cache store is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const testKey = 'cache:health:check';
      await this.set(testKey, true, 1);
      const result = await this.get(testKey);
      return result === true;
    } catch {
      return false;
    }
  }

  /**
   * Get cache statistics (if supported by the store)
   */
  async getStats(): Promise<any> {
    try {
      const store = (this.cacheManager as any).store;
      if (store && store.client) {
        const info = await store.client.info('stats');
        return info;
      }
      return null;
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return null;
    }
  }
}
