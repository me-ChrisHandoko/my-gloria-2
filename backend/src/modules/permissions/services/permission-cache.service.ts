import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { CacheService } from '@/core/cache/cache.service';
import { LoggingService } from '@/core/logging/logging.service';
import { PermissionCache } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';
import {
  IComputedPermissions,
  IPermissionResult,
} from '../interfaces/permission.interface';

@Injectable()
export class PermissionCacheService {
  private readonly CACHE_TTL = 3600; // 1 hour in seconds
  private readonly CACHE_PREFIX = 'permissions:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Get cached permissions for user
   */
  async getCachedPermissions(
    userId: string,
  ): Promise<IComputedPermissions | null> {
    try {
      // Try Redis cache first
      const cacheKey = `${this.CACHE_PREFIX}${userId}`;
      const cached =
        await this.cacheService.get<IComputedPermissions>(cacheKey);

      if (cached) {
        this.logger.debug(
          `Cache hit for user ${userId} permissions (Redis)`,
          'PermissionCacheService',
        );
        return cached;
      }

      // Try database cache
      const dbCache = await this.prisma.permissionCache.findFirst({
        where: {
          userProfileId: userId,
          isValid: true,
          expiresAt: { gte: new Date() },
        },
        orderBy: {
          computedAt: 'desc',
        },
      });

      if (dbCache) {
        const permissions =
          dbCache.permissions as unknown as IComputedPermissions;

        // Store in Redis for faster access
        await this.cacheService.set(cacheKey, permissions, this.CACHE_TTL);

        this.logger.debug(
          `Cache hit for user ${userId} permissions (Database)`,
          'PermissionCacheService',
        );
        return permissions;
      }

      this.logger.debug(
        `Cache miss for user ${userId} permissions`,
        'PermissionCacheService',
      );
      return null;
    } catch (error) {
      this.logger.error(
        `Error getting cached permissions for user ${userId}`,
        error.stack,
        'PermissionCacheService',
      );
      // Return null on error to allow fallback to computation
      return null;
    }
  }

  /**
   * Set cached permissions for user
   */
  async setCachedPermissions(
    userId: string,
    permissions: IComputedPermissions,
  ): Promise<void> {
    try {
      // Store in Redis
      const cacheKey = `${this.CACHE_PREFIX}${userId}`;
      await this.cacheService.set(cacheKey, permissions, this.CACHE_TTL);

      // Store in database for persistence
      await this.prisma.permissionCache.create({
        data: {
          id: uuidv7(),
          userProfileId: userId,
          cacheKey: permissions.cacheKey,
          permissions: permissions as any,
          computedAt: permissions.computedAt,
          expiresAt: permissions.expiresAt,
          isValid: true,
        },
      });

      // Clean up old cache entries
      await this.cleanupOldCacheEntries(userId);

      this.logger.debug(
        `Cached permissions for user ${userId}`,
        'PermissionCacheService',
      );
    } catch (error) {
      this.logger.error(
        `Error caching permissions for user ${userId}`,
        error.stack,
        'PermissionCacheService',
      );
      // Don't throw - caching failure shouldn't break permission checks
    }
  }

  /**
   * Invalidate cached permissions for user
   */
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      // Clear Redis cache
      const cacheKey = `${this.CACHE_PREFIX}${userId}`;
      await this.cacheService.del(cacheKey);

      // Invalidate database cache
      await this.prisma.permissionCache.updateMany({
        where: {
          userProfileId: userId,
        },
        data: {
          isValid: false,
        },
      });

      this.logger.log(
        `Invalidated permission cache for user ${userId}`,
        'PermissionCacheService',
      );
    } catch (error) {
      this.logger.error(
        `Error invalidating cache for user ${userId}`,
        error.stack,
        'PermissionCacheService',
      );
    }
  }

  /**
   * Invalidate cached permissions for all users with a specific role
   */
  async invalidateRoleCache(roleId: string): Promise<void> {
    try {
      // Get all users with this role
      const userRoles = await this.prisma.userRole.findMany({
        where: {
          roleId,
          isActive: true,
        },
        select: {
          userProfileId: true,
        },
      });

      // Invalidate cache for each user
      for (const userRole of userRoles) {
        await this.invalidateUserCache(userRole.userProfileId);
      }

      this.logger.log(
        `Invalidated permission cache for ${userRoles.length} users with role ${roleId}`,
        'PermissionCacheService',
      );
    } catch (error) {
      this.logger.error(
        `Error invalidating cache for role ${roleId}`,
        error.stack,
        'PermissionCacheService',
      );
    }
  }

  /**
   * Invalidate cached permissions for all users in a position
   */
  async invalidatePositionCache(positionId: string): Promise<void> {
    try {
      // Get all users in this position
      const userPositions = await this.prisma.userPosition.findMany({
        where: {
          positionId,
          isActive: true,
        },
        select: {
          userProfileId: true,
        },
      });

      // Invalidate cache for each user
      for (const userPosition of userPositions) {
        await this.invalidateUserCache(userPosition.userProfileId);
      }

      this.logger.log(
        `Invalidated permission cache for ${userPositions.length} users in position ${positionId}`,
        'PermissionCacheService',
      );
    } catch (error) {
      this.logger.error(
        `Error invalidating cache for position ${positionId}`,
        error.stack,
        'PermissionCacheService',
      );
    }
  }

  /**
   * Invalidate all permission caches
   */
  async invalidateAllCaches(): Promise<void> {
    try {
      // Clear all Redis permission caches
      const pattern = `${this.CACHE_PREFIX}*`;
      await this.cacheService.delPattern(pattern);

      // Invalidate all database caches
      await this.prisma.permissionCache.updateMany({
        where: {},
        data: {
          isValid: false,
        },
      });

      this.logger.log(
        'Invalidated all permission caches',
        'PermissionCacheService',
      );
    } catch (error) {
      this.logger.error(
        'Error invalidating all caches',
        error.stack,
        'PermissionCacheService',
      );
    }
  }

  /**
   * Clean up old cache entries for a user
   */
  private async cleanupOldCacheEntries(userId: string): Promise<void> {
    try {
      // Keep only the 5 most recent cache entries
      const recentEntries = await this.prisma.permissionCache.findMany({
        where: {
          userProfileId: userId,
        },
        orderBy: {
          computedAt: 'desc',
        },
        select: {
          id: true,
        },
        skip: 5,
      });

      if (recentEntries.length > 0) {
        await this.prisma.permissionCache.deleteMany({
          where: {
            id: {
              in: recentEntries.map((e) => e.id),
            },
          },
        });

        this.logger.debug(
          `Cleaned up ${recentEntries.length} old cache entries for user ${userId}`,
          'PermissionCacheService',
        );
      }
    } catch (error) {
      this.logger.error(
        `Error cleaning up cache entries for user ${userId}`,
        error.stack,
        'PermissionCacheService',
      );
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStatistics(): Promise<any> {
    try {
      const [
        totalCacheEntries,
        validCacheEntries,
        expiredCacheEntries,
        averageCacheAge,
      ] = await Promise.all([
        this.prisma.permissionCache.count(),
        this.prisma.permissionCache.count({
          where: {
            isValid: true,
            expiresAt: { gte: new Date() },
          },
        }),
        this.prisma.permissionCache.count({
          where: {
            OR: [{ isValid: false }, { expiresAt: { lt: new Date() } }],
          },
        }),
        this.prisma.$queryRaw`
          SELECT AVG(EXTRACT(EPOCH FROM (NOW() - computed_at))) as avg_age_seconds
          FROM gloria_ops.permission_cache
          WHERE is_valid = true
        `,
      ]);

      // Get Redis cache statistics
      const redisCacheKeys = await this.cacheService.keys(
        `${this.CACHE_PREFIX}*`,
      );

      return {
        database: {
          totalEntries: totalCacheEntries,
          validEntries: validCacheEntries,
          expiredEntries: expiredCacheEntries,
          averageAgeSeconds: (averageCacheAge as any)[0]?.avg_age_seconds || 0,
        },
        redis: {
          totalKeys: redisCacheKeys.length,
        },
        cacheHitRate: await this.getCacheHitRate(),
      };
    } catch (error) {
      this.logger.error(
        'Error getting cache statistics',
        error.stack,
        'PermissionCacheService',
      );
      return {};
    }
  }

  /**
   * Get cache hit rate (simplified implementation)
   */
  private async getCacheHitRate(): Promise<number> {
    // In a production system, you would track hits and misses
    // This is a simplified implementation
    const stats = await this.cacheService.get<{ hits: number; misses: number }>(
      'cache:stats:permissions',
    );

    if (stats && stats.hits + stats.misses > 0) {
      return (stats.hits / (stats.hits + stats.misses)) * 100;
    }

    return 0;
  }

  /**
   * Warm up cache for a user
   */
  async warmupUserCache(
    userId: string,
    permissions: IComputedPermissions,
  ): Promise<void> {
    try {
      await this.setCachedPermissions(userId, permissions);
      this.logger.log(
        `Warmed up permission cache for user ${userId}`,
        'PermissionCacheService',
      );
    } catch (error) {
      this.logger.error(
        `Error warming up cache for user ${userId}`,
        error.stack,
        'PermissionCacheService',
      );
    }
  }

  /**
   * Batch warm up cache for multiple users
   */
  async batchWarmupCache(
    userPermissions: Array<{
      userId: string;
      permissions: IComputedPermissions;
    }>,
  ): Promise<void> {
    try {
      const promises = userPermissions.map((up) =>
        this.warmupUserCache(up.userId, up.permissions),
      );

      await Promise.allSettled(promises);

      this.logger.log(
        `Warmed up permission cache for ${userPermissions.length} users`,
        'PermissionCacheService',
      );
    } catch (error) {
      this.logger.error(
        'Error in batch cache warmup',
        error.stack,
        'PermissionCacheService',
      );
    }
  }
}
