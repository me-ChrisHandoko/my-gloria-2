import { Injectable } from '@nestjs/common';
import { PermissionCalculationService } from './permission-calculation.service';
import { LoggingService } from '@/core/logging/logging.service';
import {
  IPermissionCheck,
  IPermissionResult,
} from '../interfaces/permission.interface';

@Injectable()
export class PermissionValidationService {
  constructor(
    private readonly calculationService: PermissionCalculationService,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Validate if user has permission (with caching)
   */
  async validatePermission(
    check: IPermissionCheck,
  ): Promise<IPermissionResult> {
    try {
      // Permission calculation with Redis caching handled by PermissionCalculationService
      const result = await this.calculationService.checkPermission(check);

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
    // Redis cache refresh handled automatically by PermissionCalculationService
    // Force recalculation by requesting permissions
    await this.calculationService.getUserPermissions(userId);

    this.logger.log(
      `Refreshed permissions cache for user ${userId}`,
      'PermissionValidationService',
    );
  }
}
