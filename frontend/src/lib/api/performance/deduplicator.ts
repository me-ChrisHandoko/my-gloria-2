/**
 * Request Deduplication Service
 *
 * Production-ready service for preventing duplicate API requests.
 * Features:
 * - Request deduplication by key
 * - TTL-based cache expiration
 * - Memory management with size limits
 * - Metrics tracking
 * - TypeScript generics for type safety
 */

import { logger } from '@/lib/errors/errorLogger';
import { PerformanceMonitor } from '@/lib/errors/errorLogger';

interface DeduplicationOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of cached requests
  enableMetrics?: boolean;
}

interface CacheEntry<T> {
  promise: Promise<T>;
  timestamp: number;
  ttl: number;
  hitCount: number;
}

interface DeduplicationMetrics {
  hits: number;
  misses: number;
  evictions: number;
  errors: number;
  averageHitRate: number;
  cacheSize: number;
}

export class RequestDeduplicator {
  private cache = new Map<string, CacheEntry<any>>();
  private metrics: DeduplicationMetrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    errors: 0,
    averageHitRate: 0,
    cacheSize: 0,
  };
  private performanceMonitor: PerformanceMonitor;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private options: DeduplicationOptions = {}) {
    this.options = {
      ttl: 5000, // Default 5 seconds
      maxSize: 100, // Default 100 entries
      enableMetrics: true,
      ...options,
    };

    this.performanceMonitor = new PerformanceMonitor();
    this.startCleanupInterval();
  }

  /**
   * Deduplicate a request by key
   */
  async dedupe<T>(
    key: string,
    fn: () => Promise<T>,
    customTtl?: number
  ): Promise<T> {
    const ttl = customTtl || this.options.ttl || 5000;

    // Check for existing request
    const existing = this.cache.get(key);
    if (existing && this.isValid(existing)) {
      this.recordHit(key);
      existing.hitCount++;
      return existing.promise;
    }

    // Record miss
    this.recordMiss(key);

    // Enforce size limit
    if (this.cache.size >= (this.options.maxSize || 100)) {
      this.evictOldest();
    }

    // Create new request
    const promise = this.executeRequest(key, fn);

    this.cache.set(key, {
      promise,
      timestamp: Date.now(),
      ttl,
      hitCount: 0,
    });

    this.updateMetrics();
    return promise;
  }

  /**
   * Execute request with error handling
   */
  private async executeRequest<T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    try {
      const result = await this.performanceMonitor.measure(
        `dedupe_${key}`,
        fn
      );
      return result;
    } catch (error) {
      // Remove from cache on error
      this.cache.delete(key);
      this.metrics.errors++;

      logger.error('Request deduplication error', error as Error, { key });
      throw error;
    }
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry<any>): boolean {
    const age = Date.now() - entry.timestamp;
    return age < entry.ttl;
  }

  /**
   * Record cache hit
   */
  private recordHit(key: string): void {
    if (!this.options.enableMetrics) return;

    this.metrics.hits++;
    logger.debug('Cache hit', { key, hitRate: this.getHitRate() });
  }

  /**
   * Record cache miss
   */
  private recordMiss(key: string): void {
    if (!this.options.enableMetrics) return;

    this.metrics.misses++;
    logger.debug('Cache miss', { key, hitRate: this.getHitRate() });
  }

  /**
   * Evict oldest cache entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.metrics.evictions++;
      logger.debug('Evicted cache entry', { key: oldestKey });
    }
  }

  /**
   * Start cleanup interval for expired entries
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Clean every minute
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.cache.delete(key);
    });

    if (expiredKeys.length > 0) {
      logger.debug('Cleaned up expired cache entries', {
        count: expiredKeys.length,
      });
    }

    this.updateMetrics();
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    this.metrics.cacheSize = this.cache.size;
    this.metrics.averageHitRate = this.getHitRate();
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.metrics.hits + this.metrics.misses;
    return total === 0 ? 0 : (this.metrics.hits / total) * 100;
  }

  /**
   * Get current metrics
   */
  getMetrics(): DeduplicationMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear all cached requests
   */
  clear(): void {
    this.cache.clear();
    this.updateMetrics();
    logger.info('Deduplication cache cleared');
  }

  /**
   * Clear specific cached request
   */
  clearKey(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.updateMetrics();
    return deleted;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? this.isValid(entry) : false;
  }

  /**
   * Prefetch and cache a request
   */
  async prefetch<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<void> {
    try {
      await this.dedupe(key, fn, ttl);
      logger.debug('Prefetched request', { key });
    } catch (error) {
      logger.warn('Prefetch failed', { key, error });
    }
  }

  /**
   * Batch deduplicate multiple requests
   */
  async dedupeMany<T>(
    requests: Array<{
      key: string;
      fn: () => Promise<T>;
      ttl?: number;
    }>
  ): Promise<T[]> {
    return Promise.all(
      requests.map(({ key, fn, ttl }) => this.dedupe(key, fn, ttl))
    );
  }

  /**
   * Destroy deduplicator and clean up
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
    logger.info('Deduplicator destroyed');
  }
}

// Create singleton instance
export const requestDeduplicator = new RequestDeduplicator({
  ttl: 5000,
  maxSize: 100,
  enableMetrics: true,
});

// Export helper functions
export const dedupe = <T>(
  key: string,
  fn: () => Promise<T>,
  ttl?: number
): Promise<T> => requestDeduplicator.dedupe(key, fn, ttl);

export const prefetch = async <T>(
  key: string,
  fn: () => Promise<T>,
  ttl?: number
): Promise<void> => requestDeduplicator.prefetch(key, fn, ttl);

export const clearCache = (key?: string): void | boolean => {
  if (key) {
    return requestDeduplicator.clearKey(key);
  }
  requestDeduplicator.clear();
};

export const getDeduplicationMetrics = (): DeduplicationMetrics =>
  requestDeduplicator.getMetrics();