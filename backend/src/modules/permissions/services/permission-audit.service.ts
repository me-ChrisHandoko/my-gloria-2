import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { v7 as uuidv7 } from 'uuid';

interface PermissionChangeEvent {
  entityType:
    | 'PERMISSION'
    | 'ROLE'
    | 'USER_ROLE'
    | 'USER_PERMISSION'
    | 'MODULE_ACCESS';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'GRANT' | 'REVOKE';
  performedBy: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface PermissionCheckLog {
  userProfileId: string;
  permissionId?: string;
  resource: string;
  action: string;
  scope?: string;
  result: 'GRANTED' | 'DENIED';
  reason: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class PermissionAuditService {
  private readonly logger = new Logger(PermissionAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log permission change event
   */
  async logPermissionChange(event: PermissionChangeEvent): Promise<void> {
    try {
      // Map event action to AuditAction enum
      let auditAction: any;
      switch (event.action) {
        case 'CREATE':
          auditAction = 'CREATE';
          break;
        case 'UPDATE':
          auditAction = 'UPDATE';
          break;
        case 'DELETE':
          auditAction = 'DELETE';
          break;
        case 'GRANT':
          auditAction = 'GRANT';
          break;
        case 'REVOKE':
          auditAction = 'REVOKE';
          break;
        default:
          auditAction = 'UPDATE';
      }

      await this.prisma.auditLog.create({
        data: {
          id: uuidv7(),
          actorId: event.performedBy,
          action: auditAction,
          module: 'PERMISSIONS',
          entityType: event.entityType,
          entityId: event.entityId,
          oldValues: event.changes?.oldValues,
          newValues: event.changes?.newValues,
          changedFields: event.changes?.changedFields,
          metadata: {
            ...event.metadata,
            category: 'PERMISSION',
            permissionAction: event.action,
          } as any,
          category: 'PERMISSION',
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
        },
      });

      this.logger.log(
        `Permission change logged: ${event.entityType} ${event.action} by ${event.performedBy}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to log permission change: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Log permission check (optional - can be expensive)
   * NOTE: Disabled until PermissionCheckLog model is added to schema
   */
  async logPermissionCheck(log: PermissionCheckLog): Promise<void> {
    // TODO: Implement when PermissionCheckLog model is added to database schema
    this.logger.debug(
      'Permission check logging disabled - model not in schema',
    );
  }

  /**
   * Get audit trail for permission entity
   */
  async getPermissionAuditTrail(
    entityType: string,
    entityId: string,
    limit = 100,
  ): Promise<any[]> {
    return this.prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
        metadata: {
          path: ['category'],
          equals: 'PERMISSION',
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get permission checks for user
   * NOTE: Disabled until PermissionCheckLog model is added to schema
   */
  async getUserPermissionChecks(
    userProfileId: string,
    startDate?: Date,
    endDate?: Date,
    limit = 100,
  ): Promise<any[]> {
    // TODO: Implement when PermissionCheckLog model is added to database schema
    this.logger.debug(
      'Permission check retrieval disabled - model not in schema',
    );
    return [];
  }

  /**
   * Get permission check statistics
   * NOTE: Disabled until PermissionCheckLog model is added to schema
   */
  async getPermissionCheckStatistics(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalChecks: number;
    granted: number;
    denied: number;
    checksByResource: Array<{ resource: string; count: number }>;
    checksByUser: Array<{ userProfileId: string; count: number }>;
  }> {
    // TODO: Implement when PermissionCheckLog model is added to database schema
    this.logger.debug(
      'Permission check statistics disabled - model not in schema',
    );
    return {
      totalChecks: 0,
      granted: 0,
      denied: 0,
      checksByResource: [],
      checksByUser: [],
    };
  }

  /**
   * Clean up old permission check logs
   * NOTE: Disabled until PermissionCheckLog model is added to schema
   */
  async cleanupOldPermissionChecks(daysToKeep = 90): Promise<number> {
    // TODO: Implement when PermissionCheckLog model is added to database schema
    this.logger.debug(
      'Permission check cleanup disabled - model not in schema',
    );
    return 0;
  }
}
