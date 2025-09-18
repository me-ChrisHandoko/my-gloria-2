import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditAction } from '@prisma/client';

export interface RetentionPolicy {
  name: string;
  entityTypes: string[];
  actions: AuditAction[];
  retentionDays: number;
  archiveAfterDays?: number;
  compressAfterDays?: number;
}

export interface ArchiveResult {
  archived: number;
  deleted: number;
  compressed: number;
  errors: string[];
}

@Injectable()
export class AuditRetentionService {
  private retentionPolicies: RetentionPolicy[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
  ) {
    this.logger.setContext(AuditRetentionService.name);
    this.initializeRetentionPolicies();
  }

  /**
   * Initialize retention policies
   */
  private initializeRetentionPolicies() {
    this.retentionPolicies = [
      {
        name: 'Authentication Events',
        entityTypes: ['user'],
        actions: [AuditAction.LOGIN, AuditAction.LOGOUT],
        retentionDays: 90,
        archiveAfterDays: 30,
      },
      {
        name: 'Read Operations',
        entityTypes: ['*'],
        actions: [AuditAction.READ],
        retentionDays: 30,
        compressAfterDays: 7,
      },
      {
        name: 'Data Modifications',
        entityTypes: ['*'],
        actions: [AuditAction.CREATE, AuditAction.UPDATE, AuditAction.DELETE],
        retentionDays: 365,
        archiveAfterDays: 90,
        compressAfterDays: 30,
      },
      {
        name: 'Permission Changes',
        entityTypes: ['permission', 'role', 'user_permission'],
        actions: [AuditAction.GRANT, AuditAction.REVOKE],
        retentionDays: 730, // 2 years
        archiveAfterDays: 180,
      },
      {
        name: 'Export Operations',
        entityTypes: ['*'],
        actions: [AuditAction.EXPORT],
        retentionDays: 180,
        archiveAfterDays: 60,
      },
      {
        name: 'Sensitive Data Access',
        entityTypes: ['data_karyawan', 'salary', 'personal_info'],
        actions: ['*' as any],
        retentionDays: 1095, // 3 years
        archiveAfterDays: 365,
      },
    ];
  }

  /**
   * Apply retention policies (scheduled daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async applyRetentionPolicies(): Promise<ArchiveResult> {
    this.logger.log('Starting audit retention policy application');

    const result: ArchiveResult = {
      archived: 0,
      deleted: 0,
      compressed: 0,
      errors: [],
    };

    for (const policy of this.retentionPolicies) {
      try {
        const policyResult = await this.applyPolicy(policy);
        result.archived += policyResult.archived;
        result.deleted += policyResult.deleted;
        result.compressed += policyResult.compressed;
      } catch (error) {
        const errorMsg = `Failed to apply policy "${policy.name}": ${error.message}`;
        this.logger.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    this.logger.log(
      `Retention policies applied: ${result.archived} archived, ${result.deleted} deleted, ${result.compressed} compressed`,
    );

    // Store retention run history
    await this.storeRetentionHistory(result);

    return result;
  }

  /**
   * Apply a single retention policy
   */
  private async applyPolicy(policy: RetentionPolicy): Promise<ArchiveResult> {
    const result: ArchiveResult = {
      archived: 0,
      deleted: 0,
      compressed: 0,
      errors: [],
    };

    // Calculate cutoff dates
    const now = new Date();
    const deleteCutoff = new Date(
      now.getTime() - policy.retentionDays * 24 * 60 * 60 * 1000,
    );
    const archiveCutoff = policy.archiveAfterDays
      ? new Date(now.getTime() - policy.archiveAfterDays * 24 * 60 * 60 * 1000)
      : null;
    const compressCutoff = policy.compressAfterDays
      ? new Date(now.getTime() - policy.compressAfterDays * 24 * 60 * 60 * 1000)
      : null;

    // Build where clause
    const where: any = {
      createdAt: { lt: deleteCutoff },
    };

    if (policy.entityTypes[0] !== '*') {
      where.entityType = { in: policy.entityTypes };
    }

    if ((policy.actions[0] as any) !== '*') {
      where.action = { in: policy.actions };
    }

    // Archive old logs if needed
    if (archiveCutoff) {
      const toArchive = await this.prisma.auditLog.findMany({
        where: {
          ...where,
          createdAt: {
            lt: archiveCutoff,
            gte: deleteCutoff,
          },
        },
      });

      if (toArchive.length > 0) {
        result.archived = await this.archiveLogs(toArchive);
      }
    }

    // Compress logs if needed
    if (compressCutoff) {
      const toCompress = await this.prisma.auditLog.findMany({
        where: {
          ...where,
          createdAt: {
            lt: compressCutoff,
            gte: archiveCutoff || deleteCutoff,
          },
        },
      });

      if (toCompress.length > 0) {
        result.compressed = await this.compressLogs(toCompress);
      }
    }

    // Delete old logs
    const deleteResult = await this.prisma.auditLog.deleteMany({ where });
    result.deleted = deleteResult.count;

    return result;
  }

  /**
   * Archive logs to cold storage
   */
  private async archiveLogs(logs: any[]): Promise<number> {
    // In production, this would move logs to S3, glacier, or other cold storage
    // For now, we'll simulate by adding an 'archived' flag

    let archived = 0;

    for (const log of logs) {
      try {
        // Simulate archiving by updating metadata
        await this.prisma.auditLog.update({
          where: { id: log.id },
          data: {
            metadata: {
              ...log.metadata,
              archived: true,
              archivedAt: new Date(),
            },
          },
        });
        archived++;
      } catch (error) {
        this.logger.error(`Failed to archive log ${log.id}: ${error.message}`);
      }
    }

    return archived;
  }

  /**
   * Compress logs to save space
   */
  private async compressLogs(logs: any[]): Promise<number> {
    // In production, this would compress the log data
    // For now, we'll simulate by removing some fields

    let compressedCount = 0;

    for (const log of logs) {
      try {
        // Remove user agent and other verbose fields to save space
        const compressedLog = {
          ...log,
          userAgent: undefined,
          ipAddress: log.ipAddress?.substring(0, 15), // Keep only partial IP
          oldValues: log.oldValues ? { compressed: true } : undefined,
          newValues: log.newValues ? { compressed: true } : undefined,
        };

        await this.prisma.auditLog.update({
          where: { id: log.id },
          data: {
            userAgent: null,
            metadata: {
              ...log.metadata,
              compressed: true,
              compressedAt: new Date(),
              originalSize: JSON.stringify(log).length,
              compressedSize: JSON.stringify(compressedLog).length,
            },
          },
        });
        compressedCount++;
      } catch (error) {
        this.logger.error(`Failed to compress log ${log.id}: ${error.message}`);
      }
    }

    return compressedCount;
  }

  /**
   * Store retention run history
   */
  private async storeRetentionHistory(result: ArchiveResult): Promise<void> {
    // In production, store this in a separate table
    // For now, log it
    this.logger.log('Retention run completed', JSON.stringify(result));
  }

  /**
   * Get retention statistics
   */
  async getRetentionStatistics(): Promise<{
    totalLogs: number;
    oldestLog: Date | null;
    logsByAge: Record<string, number>;
    estimatedDeletions: Record<string, number>;
  }> {
    const totalLogs = await this.prisma.auditLog.count();

    const oldestLog = await this.prisma.auditLog.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    // Count logs by age brackets
    const now = new Date();
    const ageBrackets = [7, 30, 90, 180, 365, 730];
    const logsByAge: Record<string, number> = {};

    for (const days of ageBrackets) {
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const count = await this.prisma.auditLog.count({
        where: { createdAt: { lt: cutoff } },
      });
      logsByAge[`${days}d`] = count;
    }

    // Estimate deletions per policy
    const estimatedDeletions: Record<string, number> = {};

    for (const policy of this.retentionPolicies) {
      const cutoff = new Date(
        now.getTime() - policy.retentionDays * 24 * 60 * 60 * 1000,
      );
      const where: any = { createdAt: { lt: cutoff } };

      if (policy.entityTypes[0] !== '*') {
        where.entityType = { in: policy.entityTypes };
      }

      if ((policy.actions[0] as any) !== '*') {
        where.action = { in: policy.actions };
      }

      const count = await this.prisma.auditLog.count({ where });
      estimatedDeletions[policy.name] = count;
    }

    return {
      totalLogs,
      oldestLog: oldestLog?.createdAt || null,
      logsByAge,
      estimatedDeletions,
    };
  }

  /**
   * Manually trigger retention for specific criteria
   */
  async manualRetention(criteria: {
    entityType?: string;
    action?: AuditAction;
    olderThanDays: number;
    dryRun?: boolean;
  }): Promise<{
    affected: number;
    deleted: boolean;
  }> {
    const cutoff = new Date(
      Date.now() - criteria.olderThanDays * 24 * 60 * 60 * 1000,
    );

    const where: any = { createdAt: { lt: cutoff } };

    if (criteria.entityType) {
      where.entityType = criteria.entityType;
    }

    if (criteria.action) {
      where.action = criteria.action;
    }

    const count = await this.prisma.auditLog.count({ where });

    if (!criteria.dryRun && count > 0) {
      await this.prisma.auditLog.deleteMany({ where });
      this.logger.log(
        `Manually deleted ${count} audit logs older than ${criteria.olderThanDays} days`,
      );
      return { affected: count, deleted: true };
    }

    return { affected: count, deleted: false };
  }

  /**
   * Export logs before deletion
   */
  async exportLogsBeforeDeletion(
    cutoffDate: Date,
    format: 'json' | 'csv' = 'json',
  ): Promise<Buffer> {
    const logs = await this.prisma.auditLog.findMany({
      where: { createdAt: { lt: cutoffDate } },
      orderBy: { createdAt: 'asc' },
    });

    if (format === 'json') {
      return Buffer.from(JSON.stringify(logs, null, 2));
    }

    // CSV format
    const headers = Object.keys(logs[0] || {});
    const csv = [
      headers.join(','),
      ...logs.map((log) =>
        headers
          .map((h) => {
            const value = log[h];
            return typeof value === 'object'
              ? `"${JSON.stringify(value).replace(/"/g, '""')}"`
              : `"${value}"`;
          })
          .join(','),
      ),
    ].join('\n');

    return Buffer.from(csv);
  }

  /**
   * Get next scheduled retention run
   */
  getNextRetentionRun(): Date {
    // Next run at 2 AM
    const next = new Date();
    next.setHours(2, 0, 0, 0);

    if (next.getTime() < Date.now()) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }
}
