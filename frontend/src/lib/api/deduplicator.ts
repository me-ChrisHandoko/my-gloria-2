/**
 * Request Deduplication Service
 * Prevents duplicate API calls and caches responses
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
  abortController?: AbortController;
}

interface CachedResponse<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface DedupeOptions {
  ttl?: number; // Time to live in milliseconds
  cacheKey?: string; // Custom cache key
  bypassCache?: boolean; // Skip cache for this request
  forceRefresh?: boolean; // Force new request even if cached
}

class RequestDeduplicator {
  private pending = new Map<string, PendingRequest<any>>();
  private cache = new Map<string, CachedResponse<any>>();
  private readonly defaultTTL = 5000; // 5 seconds default
  private readonly maxCacheSize = 100;
  private readonly pendingTimeout = 30000; // 30 seconds timeout for pending requests

  constructor() {
    // Clean up stale data periodically
    this.startCleanupInterval();
  }

  /**
   * Deduplicate requests and cache responses
   */
  async dedupe<T>(
    key: string,
    fn: (signal?: AbortSignal) => Promise<T>,
    options: DedupeOptions = {}
  ): Promise<T> {
    const cacheKey = options.cacheKey || key;
    const ttl = options.ttl ?? this.defaultTTL;

    // Check if we should bypass cache
    if (!options.bypassCache && !options.forceRefresh) {
      // Check cache first
      const cached = this.getCached<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Check pending requests
      const pending = this.pending.get(cacheKey);
      if (pending && !this.isPendingExpired(pending)) {
        return pending.promise as Promise<T>;
      }
    }

    // Clean up expired pending request if exists
    if (this.pending.has(cacheKey)) {
      const pending = this.pending.get(cacheKey)!;
      if (this.isPendingExpired(pending)) {
        pending.abortController?.abort();
        this.pending.delete(cacheKey);
      }
    }

    // Create new request with abort controller
    const abortController = new AbortController();
    const promise = this.executeRequest<T>(
      fn,
      abortController.signal,
      cacheKey,
      ttl
    );

    // Store pending request
    this.pending.set(cacheKey, {
      promise,
      timestamp: Date.now(),
      abortController,
    });

    return promise;
  }

  /**
   * Execute request and handle caching
   */
  private async executeRequest<T>(
    fn: (signal?: AbortSignal) => Promise<T>,
    signal: AbortSignal,
    cacheKey: string,
    ttl: number
  ): Promise<T> {
    try {
      const result = await fn(signal);

      // Cache successful response
      if (ttl > 0) {
        this.setCached(cacheKey, result, ttl);
      }

      // Remove from pending
      this.pending.delete(cacheKey);

      return result;
    } catch (error) {
      // Remove from pending on error
      this.pending.delete(cacheKey);
      throw error;
    }
  }

  /**
   * Get cached response if valid
   */
  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Set cached response
   */
  private setCached<T>(key: string, data: T, ttl: number): void {
    // Enforce cache size limit
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const oldestKey = this.findOldestCacheKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Find oldest cache key
   */
  private findOldestCacheKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Check if pending request is expired
   */
  private isPendingExpired(pending: PendingRequest<any>): boolean {
    return Date.now() - pending.timestamp > this.pendingTimeout;
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Clean up every minute
  }

  /**
   * Clean up expired cache and pending requests
   */
  private cleanup(): void {
    // Clean expired cache
    for (const [key, cached] of this.cache.entries()) {
      if (Date.now() - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }

    // Clean expired pending requests
    for (const [key, pending] of this.pending.entries()) {
      if (this.isPendingExpired(pending)) {
        pending.abortController?.abort();
        this.pending.delete(key);
      }
    }
  }

  /**
   * Clear specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);

    // Also abort any pending request
    const pending = this.pending.get(key);
    if (pending) {
      pending.abortController?.abort();
      this.pending.delete(key);
    }
  }

  /**
   * Clear all cache entries matching pattern
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    // Clear cache
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }

    // Abort pending requests
    for (const [key, pending] of this.pending.entries()) {
      if (regex.test(key)) {
        pending.abortController?.abort();
        this.pending.delete(key);
      }
    }
  }

  /**
   * Clear all cache and pending requests
   */
  clear(): void {
    // Abort all pending requests
    for (const pending of this.pending.values()) {
      pending.abortController?.abort();
    }

    this.cache.clear();
    this.pending.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    cacheSize: number;
    pendingSize: number;
    cacheKeys: string[];
    pendingKeys: string[];
  } {
    return {
      cacheSize: this.cache.size,
      pendingSize: this.pending.size,
      cacheKeys: Array.from(this.cache.keys()),
      pendingKeys: Array.from(this.pending.keys()),
    };
  }

  /**
   * Preload data into cache
   */
  preload<T>(key: string, data: T, ttl?: number): void {
    this.setCached(key, data, ttl ?? this.defaultTTL);
  }

  /**
   * Create a deduped function
   */
  createDedupedFunction<T>(
    fn: (signal?: AbortSignal) => Promise<T>,
    keyGenerator: (...args: any[]) => string,
    defaultOptions?: DedupeOptions
  ): (...args: any[]) => Promise<T> {
    return async (...args: any[]): Promise<T> => {
      const key = keyGenerator(...args);
      return this.dedupe(key, fn, defaultOptions);
    };
  }
}

// Create singleton instance
export const deduplicator = new RequestDeduplicator();

// Export class for testing or multiple instances
export { RequestDeduplicator };

/**
 * Helper function to create deduped API calls
 */
export function createDedupedApiCall<T>(
  apiCall: (...args: any[]) => Promise<T>,
  keyGenerator: (...args: any[]) => string,
  options?: DedupeOptions
): (...args: any[]) => Promise<T> {
  return async (...args: any[]): Promise<T> => {
    const key = keyGenerator(...args);
    return deduplicator.dedupe(
      key,
      () => apiCall(...args),
      options
    );
  };
}

/**
 * Decorator for deduplicating class methods
 */
export function Dedupe(
  keyGenerator?: (...args: any[]) => string,
  options?: DedupeOptions
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = keyGenerator
        ? keyGenerator(...args)
        : `${target.constructor.name}.${propertyKey}:${JSON.stringify(args)}`;

      return deduplicator.dedupe(
        key,
        () => originalMethod.apply(this, args),
        options
      );
    };

    return descriptor;
  };
}