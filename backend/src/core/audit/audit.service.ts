import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditLog, AuditAction, Prisma } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

export interface AuditContext {
  actorId: string;
  actorProfileId?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  module?: string;
}

export interface AuditEntry {
  action: AuditAction;
  module: string;
  entityType: string;
  entityId: string;
  entityDisplay?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changedFields?: string[];
  targetUserId?: string;
  metadata?: Record<string, any>;
  context: AuditContext;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Log an audit entry
   */
  async log(entry: AuditEntry): Promise<AuditLog> {
    const {
      action,
      module,
      entityType,
      entityId,
      entityDisplay,
      oldValues,
      newValues,
      changedFields,
      targetUserId,
      metadata,
      context,
    } = entry;

    // Create audit log entry
    const auditLog = await this.prisma.auditLog.create({
      data: {
        id: this.generateId(),
        action,
        module: module || context.module || 'SYSTEM',
        entityType,
        entityId,
        entityDisplay,
        oldValues: oldValues || undefined,
        newValues: newValues || undefined,
        changedFields: changedFields || undefined,
        targetUserId,
        metadata: metadata || undefined,
        actorId: context.actorId,
        actorProfileId: context.actorProfileId,
        ipAddress: context.ip,
        userAgent: context.userAgent,
        createdAt: new Date(),
      },
    });

    // Emit audit event for real-time processing
    this.eventEmitter.emit('audit.logged', {
      auditLog,
      entry,
    });

    return auditLog;
  }

  /**
   * Log a data change with before/after comparison
   */
  async logDataChange(
    action: AuditAction,
    module: string,
    entityType: string,
    entityId: string,
    before: any,
    after: any,
    context: AuditContext,
  ): Promise<AuditLog> {
    const changes = this.calculateChanges(before, after);
    const changedFields = Object.keys(changes);

    return this.log({
      action,
      module,
      entityType,
      entityId,
      oldValues: before,
      newValues: after,
      changedFields,
      metadata: {
        changeCount: changedFields.length,
      },
      context,
    });
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(
    action: AuditAction,
    module: string,
    details: Record<string, any>,
    context: AuditContext,
  ): Promise<AuditLog> {
    return this.log({
      action,
      module,
      entityType: 'SECURITY',
      entityId: `security_${Date.now()}`,
      metadata: {
        ...details,
        severity: this.getSecuritySeverity(action),
        timestamp: new Date().toISOString(),
      },
      context,
    });
  }

  /**
   * Log a permission check
   */
  async logPermissionCheck(
    actorId: string,
    permission: string,
    resource: string,
    granted: boolean,
    context: AuditContext,
  ): Promise<void> {
    await this.prisma.permissionCheckLog.create({
      data: {
        id: this.generateId(),
        userProfileId: context.actorProfileId || actorId,
        resource,
        action: permission,
        isAllowed: granted,
        checkDuration: 0,
        createdAt: new Date(),
      },
    });

    // Also create an audit log for critical permission checks
    if (!granted || this.isCriticalPermission(permission)) {
      await this.log({
        action: granted ? AuditAction.APPROVE : AuditAction.REJECT,
        module: 'PERMISSION',
        entityType: 'PERMISSION',
        entityId: this.generateId(),
        metadata: {
          permission,
          resource,
          granted,
        },
        context: { ...context, actorId },
      });
    }
  }

  /**
   * Query audit logs with filters
   */
  async queryLogs(filters: {
    actorId?: string;
    actorProfileId?: string;
    action?: AuditAction;
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.actorProfileId) where.actorProfileId = filters.actorProfileId;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        take: filters.limit || 100,
        skip: filters.offset || 0,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Get audit trail for a specific entity
   */
  async getEntityAuditTrail(
    entityType: string,
    entityId: string,
  ): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get user activity log
   */
  async getUserActivity(actorId: string, limit = 100): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { actorId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Archive old audit logs
   */
  async archiveOldLogs(daysToKeep: number, actorId: string): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // In production, you might want to move these to an archive table
    // or export to external storage before deletion
    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    await this.log({
      action: AuditAction.DELETE,
      module: 'AUDIT',
      entityType: 'AUDIT_LOG',
      entityId: `archive_${Date.now()}`,
      metadata: {
        archivedCount: result.count,
        cutoffDate: cutoffDate.toISOString(),
        daysToKeep,
      },
      context: {
        actorId,
        module: 'AUDIT',
      },
    });

    return result.count;
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<any> {
    const [totalLogs, actionBreakdown, userActivity, securityEvents] =
      await Promise.all([
        this.prisma.auditLog.count({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
        this.prisma.auditLog.groupBy({
          by: ['action'],
          _count: true,
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
        this.prisma.auditLog.groupBy({
          by: ['actorId'],
          _count: true,
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: {
            _count: {
              actorId: 'desc',
            },
          },
          take: 10,
        }),
        this.prisma.auditLog.findMany({
          where: {
            entityType: 'SECURITY',
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
      ]);

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalLogs,
        averagePerDay:
          totalLogs /
          Math.ceil(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
          ),
      },
      actionBreakdown,
      topUsers: userActivity,
      recentSecurityEvents: securityEvents,
      generatedAt: new Date().toISOString(),
    };
  }

  // Private helper methods

  private generateId(): string {
    return uuidv7();
  }

  private calculateChanges(before: any, after: any): Record<string, any> {
    const changes: Record<string, any> = {};

    if (!before || !after) {
      return changes;
    }

    // Get all keys from both objects
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    // Compare each field
    for (const key of allKeys) {
      const beforeValue = before[key];
      const afterValue = after[key];

      if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
        changes[key] = {
          before: beforeValue,
          after: afterValue,
        };
      }
    }

    return changes;
  }

  private getSecuritySeverity(
    action: AuditAction,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalActions: AuditAction[] = [
      AuditAction.DELETE,
      AuditAction.REVOKE,
    ];

    const highActions: AuditAction[] = [
      AuditAction.LOGIN,
      AuditAction.LOGOUT,
      AuditAction.ASSIGN,
      AuditAction.DELEGATE,
    ];

    const mediumActions: AuditAction[] = [
      AuditAction.UPDATE,
      AuditAction.CREATE,
      AuditAction.APPROVE,
      AuditAction.REJECT,
    ];

    if (criticalActions.includes(action)) return 'CRITICAL';
    if (highActions.includes(action)) return 'HIGH';
    if (mediumActions.includes(action)) return 'MEDIUM';
    return 'LOW';
  }

  private isCriticalPermission(permission: string): boolean {
    const criticalPermissions = [
      'DELETE_USER',
      'MANAGE_PERMISSIONS',
      'SYSTEM_ADMIN',
      'VIEW_AUDIT_LOGS',
      'EXPORT_DATA',
    ];

    return criticalPermissions.some((cp) => permission.includes(cp));
  }
}
