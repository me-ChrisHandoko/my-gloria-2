import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import { AuditAction } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';

interface ReportFilters {
  startDate: Date;
  endDate: Date;
  modules?: string[];
  actions?: AuditAction[];
  users?: string[];
  entityTypes?: string[];
}

interface ReportOptions {
  format: 'json' | 'csv' | 'excel' | 'pdf';
  includeDetails?: boolean;
  groupBy?: 'user' | 'module' | 'action' | 'date';
}

@Injectable()
export class AuditReportingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
  ) {
    this.logger.setContext(AuditReportingService.name);
  }

  /**
   * Generate activity report
   */
  async generateActivityReport(
    filters: ReportFilters,
    options: ReportOptions = { format: 'json' },
  ) {
    const logs = await this.getAuditLogs(filters);

    switch (options.format) {
      case 'json':
        return this.formatJsonReport(logs, options);
      case 'csv':
        return this.formatCsvReport(logs);
      case 'excel':
        return this.formatExcelReport(logs, filters);
      case 'pdf':
        return this.formatPdfReport(logs, filters);
      default:
        return this.formatJsonReport(logs, options);
    }
  }

  /**
   * Generate user activity report
   */
  async generateUserActivityReport(
    userProfileId: string,
    filters: ReportFilters,
  ) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        actorProfileId: userProfileId,
        createdAt: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by action type
    const byAction = logs.reduce(
      (acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Group by module
    const byModule = logs.reduce(
      (acc, log) => {
        acc[log.module] = (acc[log.module] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Group by day
    const byDay = logs.reduce(
      (acc, log) => {
        const day = log.createdAt.toISOString().split('T')[0];
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      user: userProfileId,
      period: {
        start: filters.startDate,
        end: filters.endDate,
      },
      totalActions: logs.length,
      actionBreakdown: byAction,
      moduleBreakdown: byModule,
      dailyActivity: byDay,
      recentActions: logs.slice(0, 10),
    };
  }

  /**
   * Generate security audit report
   */
  async generateSecurityReport(filters: ReportFilters) {
    const securityActions = [
      AuditAction.LOGIN,
      AuditAction.LOGOUT,
      AuditAction.GRANT,
      AuditAction.REVOKE,
      AuditAction.DELETE,
    ];

    const logs = await this.prisma.auditLog.findMany({
      where: {
        action: { in: securityActions },
        createdAt: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      },
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
    });

    // Analyze login patterns
    const loginAttempts = logs.filter((l) => l.action === AuditAction.LOGIN);
    const failedLogins = loginAttempts.filter(
      (l) =>
        typeof l.metadata === 'object' &&
        l.metadata !== null &&
        'success' in l.metadata &&
        l.metadata.success === false,
    );

    // Analyze permission changes
    const permissionChanges = logs.filter(
      (l) => l.action === AuditAction.GRANT || l.action === AuditAction.REVOKE,
    );

    // Analyze deletions
    const deletions = logs.filter((l) => l.action === AuditAction.DELETE);

    // Identify suspicious patterns
    const suspiciousActivities = this.identifySuspiciousActivities(logs);

    return {
      period: {
        start: filters.startDate,
        end: filters.endDate,
      },
      summary: {
        totalSecurityEvents: logs.length,
        loginAttempts: loginAttempts.length,
        failedLogins: failedLogins.length,
        permissionChanges: permissionChanges.length,
        deletions: deletions.length,
      },
      suspiciousActivities,
      topUsers: this.getTopUsers(logs, 10),
      hourlyDistribution: this.getHourlyDistribution(logs),
      ipAddresses: this.getUniqueIpAddresses(logs),
    };
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(filters: ReportFilters) {
    const logs = await this.getAuditLogs(filters);

    // Group by entity type
    const byEntityType = logs.reduce(
      (acc, log) => {
        acc[log.entityType] = (acc[log.entityType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Identify data access patterns
    const dataAccess = logs.filter((l) =>
      [AuditAction.READ as string, AuditAction.EXPORT as string].includes(
        l.action as string,
      ),
    );

    // Identify data modifications
    const dataModifications = logs.filter((l) =>
      [
        AuditAction.CREATE as string,
        AuditAction.UPDATE as string,
        AuditAction.DELETE as string,
      ].includes(l.action as string),
    );

    // Check for required audit trails
    const auditCoverage = await this.calculateAuditCoverage(filters);

    return {
      period: {
        start: filters.startDate,
        end: filters.endDate,
      },
      totalEvents: logs.length,
      entityTypeBreakdown: byEntityType,
      dataAccess: {
        total: dataAccess.length,
        byUser: this.groupByUser(dataAccess),
        byEntity: this.groupByEntity(dataAccess),
      },
      dataModifications: {
        total: dataModifications.length,
        creates: dataModifications.filter(
          (l) => l.action === AuditAction.CREATE,
        ).length,
        updates: dataModifications.filter(
          (l) => l.action === AuditAction.UPDATE,
        ).length,
        deletes: dataModifications.filter(
          (l) => l.action === AuditAction.DELETE,
        ).length,
      },
      auditCoverage,
      recommendations: this.generateComplianceRecommendations(auditCoverage),
    };
  }

  /**
   * Get audit logs with filters
   */
  private async getAuditLogs(filters: ReportFilters) {
    const where: any = {
      createdAt: {
        gte: filters.startDate,
        lte: filters.endDate,
      },
    };

    if (filters.modules?.length) {
      where.module = { in: filters.modules };
    }

    if (filters.actions?.length) {
      where.action = { in: filters.actions };
    }

    if (filters.users?.length) {
      where.actorProfileId = { in: filters.users };
    }

    if (filters.entityTypes?.length) {
      where.entityType = { in: filters.entityTypes };
    }

    return this.prisma.auditLog.findMany({
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
    });
  }

  /**
   * Format JSON report
   */
  private formatJsonReport(logs: any[], options: ReportOptions) {
    const report: any = {
      totalRecords: logs.length,
      logs: options.includeDetails ? logs : logs.slice(0, 100),
    };

    if (options.groupBy) {
      report.groupedData = this.groupLogs(logs, options.groupBy);
    }

    return report;
  }

  /**
   * Format CSV report
   */
  private formatCsvReport(logs: any[]): string {
    const headers = [
      'Timestamp',
      'User',
      'Action',
      'Module',
      'Entity Type',
      'Entity ID',
      'IP Address',
      'User Agent',
    ];

    const rows = logs.map((log) => [
      log.createdAt.toISOString(),
      log.actorProfile?.email || log.actorId,
      log.action,
      log.module,
      log.entityType,
      log.entityId,
      log.ipAddress || '',
      log.userAgent || '',
    ]);

    return [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');
  }

  /**
   * Format Excel report
   */
  private async formatExcelReport(logs: any[], filters: ReportFilters) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Audit Log');

    // Add headers
    worksheet.columns = [
      { header: 'Timestamp', key: 'timestamp', width: 20 },
      { header: 'User', key: 'user', width: 30 },
      { header: 'Action', key: 'action', width: 15 },
      { header: 'Module', key: 'module', width: 15 },
      { header: 'Entity Type', key: 'entityType', width: 20 },
      { header: 'Entity ID', key: 'entityId', width: 20 },
      { header: 'IP Address', key: 'ipAddress', width: 15 },
    ];

    // Add data
    logs.forEach((log) => {
      worksheet.addRow({
        timestamp: log.createdAt,
        user: log.actorProfile?.email || log.actorId,
        action: log.action,
        module: log.module,
        entityType: log.entityType,
        entityId: log.entityId,
        ipAddress: log.ipAddress || '',
      });
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow([
      'Report Period',
      `${filters.startDate.toDateString()} - ${filters.endDate.toDateString()}`,
    ]);
    summarySheet.addRow(['Total Records', logs.length]);
    summarySheet.addRow([
      'Unique Users',
      new Set(logs.map((l) => l.actorId)).size,
    ]);
    summarySheet.addRow([
      'Unique Modules',
      new Set(logs.map((l) => l.module)).size,
    ]);

    return workbook.xlsx.writeBuffer();
  }

  /**
   * Format PDF report
   */
  private async formatPdfReport(logs: any[], filters: ReportFilters) {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    // Title
    doc.fontSize(20).text('Audit Log Report', { align: 'center' });
    doc.moveDown();

    // Report period
    doc
      .fontSize(12)
      .text(
        `Period: ${filters.startDate.toDateString()} - ${filters.endDate.toDateString()}`,
      );
    doc.text(`Total Records: ${logs.length}`);
    doc.moveDown();

    // Summary statistics
    doc.fontSize(14).text('Summary Statistics', { underline: true });
    doc.fontSize(10);

    const actionCounts = logs.reduce(
      (acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    Object.entries(actionCounts).forEach(([action, count]) => {
      doc.text(`${action}: ${count}`);
    });

    doc.moveDown();

    // Recent activities
    doc.fontSize(14).text('Recent Activities', { underline: true });
    doc.fontSize(9);

    logs.slice(0, 20).forEach((log) => {
      doc.text(
        `${log.createdAt.toISOString()} - ${log.actorProfile?.email || log.actorId} - ${log.action} - ${log.entityType}`,
      );
    });

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * Group logs by specified field
   */
  private groupLogs(logs: any[], groupBy: string) {
    return logs.reduce(
      (acc, log) => {
        let key: string;

        switch (groupBy) {
          case 'user':
            key = log.actorProfile?.email || log.actorId;
            break;
          case 'module':
            key = log.module;
            break;
          case 'action':
            key = log.action;
            break;
          case 'date':
            key = log.createdAt.toISOString().split('T')[0];
            break;
          default:
            key = 'unknown';
        }

        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(log);

        return acc;
      },
      {} as Record<string, any[]>,
    );
  }

  /**
   * Identify suspicious activities
   */
  private identifySuspiciousActivities(logs: any[]) {
    const suspicious: any[] = [];

    // Multiple failed login attempts
    const failedLogins = logs.filter(
      (l) => l.action === AuditAction.LOGIN && l.metadata?.success === false,
    );

    const failedByUser = this.groupByUser(failedLogins);
    for (const [user, userLogs] of Object.entries(failedByUser)) {
      const logs = userLogs as any[];
      if (logs.length >= 3) {
        suspicious.push({
          type: 'MULTIPLE_FAILED_LOGINS',
          user,
          count: logs.length,
          logs: logs,
        });
      }
    }

    // Unusual activity hours (e.g., 2 AM - 5 AM)
    const unusualHours = logs.filter((l) => {
      const hour = l.createdAt.getHours();
      return hour >= 2 && hour <= 5;
    });

    if (unusualHours.length > 0) {
      suspicious.push({
        type: 'UNUSUAL_HOURS',
        count: unusualHours.length,
        logs: unusualHours.slice(0, 10),
      });
    }

    // Mass deletions
    const deletions = logs.filter((l) => l.action === AuditAction.DELETE);
    const deletionsByUser = this.groupByUser(deletions);

    for (const [user, userLogs] of Object.entries(deletionsByUser)) {
      const logs = userLogs as any[];
      if (logs.length >= 10) {
        suspicious.push({
          type: 'MASS_DELETIONS',
          user,
          count: logs.length,
          logs: logs.slice(0, 10),
        });
      }
    }

    return suspicious;
  }

  /**
   * Get top users by activity
   */
  private getTopUsers(logs: any[], limit: number) {
    const userCounts = logs.reduce(
      (acc, log) => {
        const user = log.actorProfile?.email || log.actorId;
        acc[user] = (acc[user] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(userCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, limit)
      .map(([user, count]) => ({ user, count }));
  }

  /**
   * Get hourly distribution
   */
  private getHourlyDistribution(logs: any[]) {
    const hourly = new Array(24).fill(0);

    logs.forEach((log) => {
      const hour = log.createdAt.getHours();
      hourly[hour]++;
    });

    return hourly;
  }

  /**
   * Get unique IP addresses
   */
  private getUniqueIpAddresses(logs: any[]) {
    const ips = new Set(logs.map((l) => l.ipAddress).filter(Boolean));
    return Array.from(ips);
  }

  /**
   * Group logs by user
   */
  private groupByUser(logs: any[]) {
    return logs.reduce(
      (acc, log) => {
        const user = log.actorProfile?.email || log.actorId;
        if (!acc[user]) {
          acc[user] = [];
        }
        acc[user].push(log);
        return acc;
      },
      {} as Record<string, any[]>,
    );
  }

  /**
   * Group logs by entity
   */
  private groupByEntity(logs: any[]) {
    return logs.reduce(
      (acc, log) => {
        const key = `${log.entityType}:${log.entityId}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Calculate audit coverage
   */
  private async calculateAuditCoverage(filters: ReportFilters) {
    // Get all entity types in the system
    const allEntities = [
      'user',
      'role',
      'permission',
      'school',
      'department',
      'position',
      'workflow',
      'notification',
    ];

    const coverage: Record<string, number> = {};

    for (const entity of allEntities) {
      const count = await this.prisma.auditLog.count({
        where: {
          entityType: entity,
          createdAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        },
      });

      // Calculate coverage percentage (simplified)
      coverage[entity] = count > 0 ? 100 : 0;
    }

    return coverage;
  }

  /**
   * Generate compliance recommendations
   */
  private generateComplianceRecommendations(coverage: Record<string, number>) {
    const recommendations: any[] = [];

    for (const [entity, percentage] of Object.entries(coverage)) {
      if (percentage < 100) {
        recommendations.push({
          entity,
          issue: 'Missing audit coverage',
          recommendation: `Implement audit logging for all ${entity} operations`,
          priority: 'HIGH',
        });
      }
    }

    return recommendations;
  }
}
