import { Injectable } from '@nestjs/common';
import { PermissionCalculationService } from './permission-calculation.service';
import { PermissionCacheService } from './permission-cache.service';
import { LoggingService } from '@/core/logging/logging.service';
import {
  IPermissionCheck,
  IPermissionResult,
} from '../interfaces/permission.interface';

@Injectable()
export class PermissionValidationService {
  constructor(
    private readonly calculationService: PermissionCalculationService,
    private readonly cacheService: PermissionCacheService,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Validate if user has permission (with caching)
   */
  async validatePermission(
    check: IPermissionCheck,
  ): Promise<IPermissionResult> {
    try {
      // Try to get from cache first
      const cached = await this.cacheService.getCachedPermissions(check.userId);

      if (cached) {
        const cachedPermission = cached.permissions.find(
          (p) =>
            p.permission &&
            p.permission.resource === check.resource &&
            p.permission.action === check.action &&
            (!check.scope || p.permission.scope === check.scope),
        );

        if (cachedPermission) {
          this.logger.debug(
            `Permission validated from cache for user ${check.userId}`,
            'PermissionValidationService',
          );
          return cachedPermission;
        }
      }

      // Calculate permission if not in cache
      const result = await this.calculationService.checkPermission(check);

      // Update cache if permission was calculated
      if (result.hasPermission) {
        const allPermissions = await this.calculationService.getUserPermissions(
          check.userId,
        );
        await this.cacheService.setCachedPermissions(
          check.userId,
          allPermissions,
        );
      }

      this.logger.debug(
        `Permission validated for user ${check.userId}: ${result.hasPermission}`,
        'PermissionValidationService',
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error validating permission for user ${check.userId}`,
        error.stack,
        'PermissionValidationService',
      );
      throw error;
    }
  }

  /**
   * Batch validate permissions
   */
  async batchValidatePermissions(
    userId: string,
    checks: Omit<IPermissionCheck, 'userId'>[],
  ): Promise<IPermissionResult[]> {
    const results: IPermissionResult[] = [];

    for (const check of checks) {
      const result = await this.validatePermission({
        ...check,
        userId,
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Refresh user permissions cache
   */
  async refreshUserPermissions(userId: string): Promise<void> {
    await this.cacheService.invalidateUserCache(userId);
    const permissions =
      await this.calculationService.getUserPermissions(userId);
    await this.cacheService.setCachedPermissions(userId, permissions);

    this.logger.log(
      `Refreshed permissions cache for user ${userId}`,
      'PermissionValidationService',
    );
  }
}
