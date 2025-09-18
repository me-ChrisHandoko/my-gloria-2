/**
 * Caching Decorator
 * Production-ready decorator for response caching
 *
 * @module core/auth/decorators
 */

import { SetMetadata, CustomDecorator } from '@nestjs/common';

/**
 * Metadata key for caching
 */
export const CACHE_KEY = 'cache';

/**
 * Cache storage options
 */
export enum CacheStore {
  MEMORY = 'memory',
  REDIS = 'redis',
  HYBRID = 'hybrid', // Memory first, then Redis
}

/**
 * Cache invalidation strategies
 */
export enum CacheInvalidation {
  TTL = 'ttl', // Time-based expiration
  EVENT = 'event', // Event-driven invalidation
  MANUAL = 'manual', // Manual invalidation
  LRU = 'lru', // Least recently used
}

/**
 * Options for response caching
 */
export interface CacheOptions {
  /** Time to live in seconds */
  ttl?: number;
  /** Custom cache key or key generator */
  key?: string | ((req: any) => string);
  /** Cache store to use */
  store?: CacheStore;
  /** Invalidation strategy */
  invalidation?: CacheInvalidation;
  /** Whether to cache per user */
  perUser?: boolean;
  /** Whether to cache based on query parameters */
  includeQuery?: boolean;
  /** Tags for cache invalidation */
  tags?: string[];
  /** Whether to compress cached data */
  compress?: boolean;
  /** Maximum cache size in bytes */
  maxSize?: number;
  /** Whether to serve stale content while revalidating */
  staleWhileRevalidate?: boolean;
  /** Grace period for stale content in seconds */
  staleGracePeriod?: number;
}

/**
 * Enables response caching for an endpoint
 *
 * @example
 * // Simple caching with TTL
 * @Cache({ ttl: 300 }) // Cache for 5 minutes
 * @Get('products')
 * getProducts() {
 *   return this.service.getAllProducts();
 * }
 *
 * @example
 * // Per-user caching
 * @Cache({ ttl: 60, perUser: true })
 * @Get('dashboard')
 * getDashboard(@CurrentUser() user: User) {
 *   return this.service.getUserDashboard(user.id);
 * }
 *
 * @example
 * // Cache with custom key
 * @Cache({
 *   ttl: 3600,
 *   key: (req) => `products:${req.params.category}:${req.query.sort}`
 * })
 * @Get('products/:category')
 * getProductsByCategory(@Param('category') category: string) {
 *   return this.service.getProductsByCategory(category);
 * }
 *
 * @example
 * // Cache with tags for invalidation
 * @Cache({
 *   ttl: 1800,
 *   tags: ['products', 'inventory'],
 *   staleWhileRevalidate: true
 * })
 * @Get('inventory')
 * getInventory() {
 *   return this.service.getInventory();
 * }
 *
 * @param options - Caching options
 * @returns Decorator function
 */
export const Cache = (options?: CacheOptions): CustomDecorator => {
  return SetMetadata(CACHE_KEY, {
    enabled: true,
    ttl: options?.ttl || 60,
    store: options?.store || CacheStore.MEMORY,
    invalidation: options?.invalidation || CacheInvalidation.TTL,
    compress: options?.compress || false,
    ...options,
  });
};

/**
 * Disables caching for an endpoint
 * Useful when caching is enabled globally but needs to be disabled for specific endpoints
 *
 * @example
 * @NoCache()
 * @Get('real-time-data')
 * getRealTimeData() {
 *   return this.service.getRealTimeData();
 * }
 */
export const NoCache = (): CustomDecorator => {
  return SetMetadata(CACHE_KEY, { enabled: false });
};

/**
 * Short-lived cache (1 minute)
 * Suitable for frequently changing data
 *
 * @example
 * @ShortCache()
 * @Get('notifications')
 * getNotifications(@CurrentUser() user: User) {
 *   return this.service.getUserNotifications(user.id);
 * }
 */
export const ShortCache = (): CustomDecorator => {
  return Cache({ ttl: 60 });
};

/**
 * Medium-lived cache (5 minutes)
 * Suitable for moderately dynamic data
 *
 * @example
 * @MediumCache()
 * @Get('statistics')
 * getStatistics() {
 *   return this.service.getSystemStatistics();
 * }
 */
export const MediumCache = (): CustomDecorator => {
  return Cache({ ttl: 300 });
};

/**
 * Long-lived cache (1 hour)
 * Suitable for relatively static data
 *
 * @example
 * @LongCache()
 * @Get('configuration')
 * getConfiguration() {
 *   return this.service.getSystemConfiguration();
 * }
 */
export const LongCache = (): CustomDecorator => {
  return Cache({ ttl: 3600 });
};

/**
 * CDN-friendly cache with appropriate headers
 * Suitable for public, static content
 *
 * @example
 * @CDNCache(86400) // 24 hours
 * @Get('static-content/:id')
 * getStaticContent(@Param('id') id: string) {
 *   return this.service.getStaticContent(id);
 * }
 *
 * @param maxAge - Maximum age in seconds
 * @returns Decorator function
 */
export const CDNCache = (maxAge: number): CustomDecorator => {
  return Cache({
    ttl: maxAge,
    store: CacheStore.MEMORY,
    perUser: false,
    compress: true,
  });
};

/**
 * Invalidates cache based on tags
 * Used in conjunction with Cache decorator tags
 *
 * @example
 * @InvalidateCache(['products', 'inventory'])
 * @Post('products')
 * createProduct(@Body() dto: CreateProductDto) {
 *   return this.service.createProduct(dto);
 * }
 *
 * @param tags - Cache tags to invalidate
 * @returns Decorator function
 */
export const InvalidateCache = (tags: string[]): CustomDecorator => {
  return SetMetadata('invalidateCache', { tags });
};
