import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis Cache Service for Permission Caching (Phase 2)
 *
 * Replaces PermissionCache database table with Redis in-memory cache
 *
 * Features:
 * - Fast permission lookups (<5ms)
 * - Automatic TTL expiration (5 minutes default)
 * - Namespace-based key organization
 * - Graceful error handling
 */
@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;
  private readonly defaultTTL = 300; // 5 minutes in seconds

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      this.redis = new Redis({
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: this.configService.get('REDIS_PORT', 6379),
        password: this.configService.get('REDIS_PASSWORD'),
        db: this.configService.get('REDIS_DB', 0),
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });

      this.redis.on('error', (err) => {
        console.error('Redis connection error:', err);
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  /**
   * Get permission cache for user
   * @param userProfileId - User profile ID
   * @param cacheKey - Optional cache key (e.g., 'basic', 'full')
   */
  async getPermissionCache(
    userProfileId: string,
    cacheKey: string = 'full',
  ): Promise<any | null> {
    try {
      const key = this.buildKey('perm', userProfileId, cacheKey);
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting permission cache:', error);
      return null;
    }
  }

  /**
   * Set permission cache for user
   * @param userProfileId - User profile ID
   * @param permissions - Permission data to cache
   * @param cacheKey - Optional cache key
   * @param ttl - Time to live in seconds (default: 5 minutes)
   */
  async setPermissionCache(
    userProfileId: string,
    permissions: any,
    cacheKey: string = 'full',
    ttl: number = this.defaultTTL,
  ): Promise<void> {
    try {
      const key = this.buildKey('perm', userProfileId, cacheKey);
      await this.redis.setex(key, ttl, JSON.stringify(permissions));
    } catch (error) {
      console.error('Error setting permission cache:', error);
    }
  }

  /**
   * Invalidate permission cache for user
   * @param userProfileId - User profile ID
   * @param cacheKey - Optional specific cache key, or '*' for all keys
   */
  async invalidatePermissionCache(
    userProfileId: string,
    cacheKey?: string,
  ): Promise<void> {
    try {
      if (cacheKey) {
        const key = this.buildKey('perm', userProfileId, cacheKey);
        await this.redis.del(key);
      } else {
        // Delete all permission caches for user
        const pattern = this.buildKey('perm', userProfileId, '*');
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (error) {
      console.error('Error invalidating permission cache:', error);
    }
  }

  /**
   * Invalidate permission cache for multiple users
   * @param userProfileIds - Array of user profile IDs
   */
  async invalidatePermissionCacheBulk(
    userProfileIds: string[],
  ): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      for (const userId of userProfileIds) {
        const pattern = this.buildKey('perm', userId, '*');
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          pipeline.del(...keys);
        }
      }
      await pipeline.exec();
    } catch (error) {
      console.error('Error bulk invalidating permission cache:', error);
    }
  }

  /**
   * Get generic cached value
   * @param key - Cache key
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      console.error('Error getting cache:', error);
      return null;
    }
  }

  /**
   * Set generic cached value
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.redis.setex(key, ttl, value);
      } else {
        await this.redis.set(key, value);
      }
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  /**
   * Delete cached value
   * @param key - Cache key or pattern
   */
  async delete(key: string): Promise<void> {
    try {
      if (key.includes('*')) {
        const keys = await this.redis.keys(key);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        await this.redis.del(key);
      }
    } catch (error) {
      console.error('Error deleting cache:', error);
    }
  }

  /**
   * Check if key exists in cache
   * @param key - Cache key
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Error checking cache existence:', error);
      return false;
    }
  }

  /**
   * Build namespaced cache key
   * @param namespace - Key namespace (e.g., 'perm', 'user', 'session')
   * @param parts - Key parts to join
   */
  private buildKey(namespace: string, ...parts: string[]): string {
    return `gloria:${namespace}:${parts.join(':')}`;
  }

  /**
   * Get Redis instance for advanced operations
   */
  getRedisClient(): Redis {
    return this.redis;
  }
}
