import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { CacheService } from '@/core/cache/cache.service';
import { LoggingService } from '@/core/logging/logging.service';
import { AuditAction, Prisma } from '@prisma/client';
import { Request } from 'express';
import { v7 as uuidv7 } from 'uuid';

export interface AuditLogEntry {
  actorId: string;
  actorProfileId?: string;
  action: AuditAction;
  module: string;
  entityType: string;
  entityId: string;
  entityDisplay?: string;
  oldValues?: any;
  newValues?: any;
  changedFields?: string[];
  targetUserId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditContext {
  userId: string;
  userProfileId?: string;
  request?: Request;
  module: string;
}

@Injectable()
export class AuditLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly logger: LoggingService,
  ) {
    this.logger.setContext(AuditLogService.name);
  }

  /**
   * Create an audit log entry
   */
  async create(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          id: uuidv7(),
          ...entry,
          oldValues: entry.oldValues ? entry.oldValues : undefined,
          newValues: entry.newValues ? entry.newValues : undefined,
          changedFields: entry.changedFields ? entry.changedFields : undefined,
          metadata: entry.metadata ? entry.metadata : undefined,
        },
      });

      // Cache recent audit activity for quick access
      await this.cacheRecentActivity(entry);
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`);
      // Don't throw - audit logging should not break the application
    }
  }

  /**
   * Log a CREATE action
   */
  async logCreate(
    context: AuditContext,
    entityType: string,
    entityId: string,
    entityData: any,
    entityDisplay?: string,
  ): Promise<void> {
    await this.create({
      actorId: context.userId,
      actorProfileId: context.userProfileId,
      action: AuditAction.CREATE,
      module: context.module,
      entityType,
      entityId,
      entityDisplay,
      newValues: entityData,
      ipAddress: context.request?.ip,
      userAgent: context.request?.headers['user-agent'] as string,
    });
  }

  /**
   * Log an UPDATE action
   */
  async logUpdate(
    context: AuditContext,
    entityType: string,
    entityId: string,
    oldValues: any,
    newValues: any,
    entityDisplay?: string,
  ): Promise<void> {
    const changedFields = this.getChangedFields(oldValues, newValues);

    if (changedFields.length === 0) {
      return; // No changes to log
    }

    await this.create({
      actorId: context.userId,
      actorProfileId: context.userProfileId,
      action: AuditAction.UPDATE,
      module: context.module,
      entityType,
      entityId,
      entityDisplay,
      oldValues: oldValues, // Store ALL fields before update
      newValues: newValues, // Store ALL fields after update
      changedFields, // Array of field names that changed
      ipAddress: context.request?.ip,
      userAgent: context.request?.headers['user-agent'] as string,
    });
  }

  /**
   * Log a DELETE action
   */
  async logDelete(
    context: AuditContext,
    entityType: string,
    entityId: string,
    entityData: any,
    entityDisplay?: string,
  ): Promise<void> {
    await this.create({
      actorId: context.userId,
      actorProfileId: context.userProfileId,
      action: AuditAction.DELETE,
      module: context.module,
      entityType,
      entityId,
      entityDisplay,
      oldValues: entityData,
      ipAddress: context.request?.ip,
      userAgent: context.request?.headers['user-agent'] as string,
    });
  }

  /**
   * Log a READ/VIEW action
   */
  async logRead(
    context: AuditContext,
    entityType: string,
    entityId: string,
    entityDisplay?: string,
    metadata?: any,
  ): Promise<void> {
    await this.create({
      actorId: context.userId,
      actorProfileId: context.userProfileId,
      action: AuditAction.READ,
      module: context.module,
      entityType,
      entityId,
      entityDisplay,
      metadata,
      ipAddress: context.request?.ip,
      userAgent: context.request?.headers['user-agent'] as string,
    });
  }

  /**
   * Log an EXPORT action
   */
  async logExport(
    context: AuditContext,
    entityType: string,
    entityId: string,
    exportDetails: {
      format: string;
      recordCount: number;
      filters?: any;
    },
  ): Promise<void> {
    await this.create({
      actorId: context.userId,
      actorProfileId: context.userProfileId,
      action: AuditAction.EXPORT,
      module: context.module,
      entityType,
      entityId,
      metadata: exportDetails,
      ipAddress: context.request?.ip,
      userAgent: context.request?.headers['user-agent'] as string,
    });
  }

  /**
   * Log LOGIN action
   */
  async logLogin(
    userId: string,
    userProfileId: string,
    request: Request,
    success: boolean,
    metadata?: any,
  ): Promise<void> {
    await this.create({
      actorId: userId,
      actorProfileId: userProfileId,
      action: AuditAction.LOGIN,
      module: 'auth',
      entityType: 'user',
      entityId: userId,
      metadata: {
        success,
        ...metadata,
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] as string,
    });
  }

  /**
   * Log LOGOUT action
   */
  async logLogout(
    userId: string,
    userProfileId: string,
    request: Request,
  ): Promise<void> {
    await this.create({
      actorId: userId,
      actorProfileId: userProfileId,
      action: AuditAction.LOGOUT,
      module: 'auth',
      entityType: 'user',
      entityId: userId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] as string,
    });
  }

  /**
   * Log permission-related actions
   */
  async logPermissionChange(
    context: AuditContext,
    targetUserId: string,
    permissionAction: 'GRANT' | 'REVOKE',
    permissions: string[],
  ): Promise<void> {
    await this.create({
      actorId: context.userId,
      actorProfileId: context.userProfileId,
      action:
        permissionAction === 'GRANT' ? AuditAction.GRANT : AuditAction.REVOKE,
      module: 'permissions',
      entityType: 'user_permission',
      entityId: targetUserId,
      targetUserId,
      metadata: { permissions },
      ipAddress: context.request?.ip,
      userAgent: context.request?.headers['user-agent'] as string,
    });
  }

  /**
   * Query audit logs with filters
   */
  async queryLogs(filters: {
    actorId?: string;
    actorProfileId?: string;
    module?: string;
    action?: AuditAction;
    entityType?: string;
    entityId?: string;
    targetUserId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, ...whereFilters } = filters;

    const where: Prisma.AuditLogWhereInput = {};

    if (whereFilters.actorId) where.actorId = whereFilters.actorId;
    if (whereFilters.actorProfileId)
      where.actorProfileId = whereFilters.actorProfileId;
    if (whereFilters.module) where.module = whereFilters.module;
    if (whereFilters.action) where.action = whereFilters.action;
    if (whereFilters.entityType) where.entityType = whereFilters.entityType;
    if (whereFilters.entityId) where.entityId = whereFilters.entityId;
    if (whereFilters.targetUserId)
      where.targetUserId = whereFilters.targetUserId;

    if (whereFilters.dateFrom || whereFilters.dateTo) {
      where.createdAt = {};
      if (whereFilters.dateFrom) where.createdAt.gte = whereFilters.dateFrom;
      if (whereFilters.dateTo) where.createdAt.lte = whereFilters.dateTo;
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: {
          actorProfile: {
            select: {
              id: true,
              nip: true,
              dataKaryawan: {
                select: {
                  nama: true,
                  email: true,
                },
              },
            },
          },
          targetUserProfile: {
            select: {
              id: true,
              nip: true,
              dataKaryawan: {
                select: {
                  nama: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get entity history
   */
  async getEntityHistory(
    entityType: string,
    entityId: string,
    options: {
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { page = 1, limit = 50 } = options;

    const where: Prisma.AuditLogWhereInput = {
      entityType,
      entityId,
    };

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: {
          actorProfile: {
            select: {
              id: true,
              nip: true,
              dataKaryawan: {
                select: {
                  nama: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user activity
   */
  async getUserActivity(
    userProfileId: string,
    options: {
      page?: number;
      limit?: number;
      dateFrom?: Date;
      dateTo?: Date;
    } = {},
  ) {
    const { page = 1, limit = 50, dateFrom, dateTo } = options;

    const where: Prisma.AuditLogWhereInput = {
      actorProfileId: userProfileId,
    };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get audit statistics
   */
  async getStatistics(
    filters: {
      dateFrom?: Date;
      dateTo?: Date;
      module?: string;
    } = {},
  ) {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.module) where.module = filters.module;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const [byAction, byModule, byEntity, topUsers] = await Promise.all([
      // Count by action
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
        orderBy: { _count: { action: 'desc' } },
      }),

      // Count by module
      this.prisma.auditLog.groupBy({
        by: ['module'],
        where,
        _count: true,
        orderBy: { _count: { module: 'desc' } },
      }),

      // Count by entity type
      this.prisma.auditLog.groupBy({
        by: ['entityType'],
        where,
        _count: true,
        orderBy: { _count: { entityType: 'desc' } },
        take: 10,
      }),

      // Top users by activity
      this.prisma.auditLog.groupBy({
        by: ['actorProfileId'],
        where,
        _count: true,
        orderBy: { _count: { actorProfileId: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      byAction,
      byModule,
      byEntity,
      topUsers,
    };
  }

  /**
   * Cache recent audit activity
   */
  private async cacheRecentActivity(entry: AuditLogEntry): Promise<void> {
    const cacheKey = `audit:recent:${entry.module}`;
    const ttl = 300; // 5 minutes

    try {
      // Get existing cached entries
      const cached = (await this.cache.get<AuditLogEntry[]>(cacheKey)) || [];

      // Add new entry and keep only last 100
      cached.unshift(entry);
      if (cached.length > 100) {
        cached.pop();
      }

      await this.cache.set(cacheKey, cached, ttl);
    } catch (error) {
      this.logger.error(`Failed to cache audit activity: ${error.message}`);
    }
  }

  /**
   * Get changed fields between old and new values
   * Only compares fields that exist in oldValues (database fields)
   * to avoid including computed/relational fields from DTOs
   */
  private getChangedFields(oldValues: any, newValues: any): string[] {
    const changed: string[] = [];

    if (!oldValues || !newValues) {
      return changed;
    }

    // Only check fields that exist in oldValues (source of truth for database fields)
    // This excludes computed fields (positionCount, userCount) and
    // relational fields (parent, school) that only exist in formatted DTOs
    const oldKeys = Object.keys(oldValues);

    for (const key of oldKeys) {
      // Skip metadata fields and internal fields
      if (['createdAt', 'updatedAt', 'deletedAt', '_count'].includes(key)) {
        continue;
      }

      // Skip if key is an object (relational data like parent, school)
      if (
        oldValues[key] !== null &&
        typeof oldValues[key] === 'object' &&
        !Array.isArray(oldValues[key])
      ) {
        continue;
      }

      const oldVal = oldValues[key];
      const newVal = newValues[key];

      // Compare values - field changed if new value is different
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changed.push(key);
      }
    }

    return changed;
  }

  /**
   * Filter object to only include changed fields
   */
  private filterChangedValues(values: any, changedFields: string[]): any {
    if (!values || changedFields.length === 0) {
      return null;
    }

    const filtered: any = {};
    for (const field of changedFields) {
      if (field in values) {
        filtered[field] = values[field];
      }
    }

    return filtered;
  }
}
