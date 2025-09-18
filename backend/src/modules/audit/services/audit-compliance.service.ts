import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import { CacheService } from '@/core/cache/cache.service';
import { AuditAction } from '@prisma/client';

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  entityTypes: string[];
  requiredActions: AuditAction[];
  retentionDays: number;
  checkFunction: (logs: any[]) => ComplianceCheckResult;
}

export interface ComplianceCheckResult {
  compliant: boolean;
  issues: string[];
  recommendations: string[];
  score: number;
}

export interface ComplianceReport {
  overallScore: number;
  rules: ComplianceRuleResult[];
  summary: {
    compliant: number;
    nonCompliant: number;
    warnings: number;
  };
  recommendations: string[];
}

export interface ComplianceRuleResult {
  ruleId: string;
  ruleName: string;
  result: ComplianceCheckResult;
}

@Injectable()
export class AuditComplianceService {
  private complianceRules: ComplianceRule[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly logger: LoggingService,
  ) {
    this.logger.setContext(AuditComplianceService.name);
    this.initializeComplianceRules();
  }

  /**
   * Initialize compliance rules
   */
  private initializeComplianceRules() {
    this.complianceRules = [
      {
        id: 'AUTH_LOGGING',
        name: 'Authentication Logging',
        description: 'All authentication events must be logged',
        entityTypes: ['user'],
        requiredActions: [AuditAction.LOGIN, AuditAction.LOGOUT],
        retentionDays: 90,
        checkFunction: this.checkAuthenticationLogging.bind(this),
      },
      {
        id: 'DATA_ACCESS',
        name: 'Data Access Tracking',
        description: 'All data access must be tracked',
        entityTypes: ['*'],
        requiredActions: [AuditAction.READ, AuditAction.EXPORT],
        retentionDays: 180,
        checkFunction: this.checkDataAccessTracking.bind(this),
      },
      {
        id: 'DATA_MODIFICATION',
        name: 'Data Modification Audit',
        description:
          'All data modifications must be audited with old and new values',
        entityTypes: ['*'],
        requiredActions: [
          AuditAction.CREATE,
          AuditAction.UPDATE,
          AuditAction.DELETE,
        ],
        retentionDays: 365,
        checkFunction: this.checkDataModificationAudit.bind(this),
      },
      {
        id: 'PERMISSION_CHANGES',
        name: 'Permission Change Tracking',
        description: 'All permission changes must be logged',
        entityTypes: ['permission', 'role', 'user_permission'],
        requiredActions: [AuditAction.GRANT, AuditAction.REVOKE],
        retentionDays: 730,
        checkFunction: this.checkPermissionChangeTracking.bind(this),
      },
      {
        id: 'SENSITIVE_DATA',
        name: 'Sensitive Data Access',
        description:
          'Access to sensitive data must be logged with justification',
        entityTypes: ['data_karyawan', 'salary', 'personal_info'],
        requiredActions: [
          AuditAction.READ,
          AuditAction.UPDATE,
          AuditAction.EXPORT,
        ],
        retentionDays: 1095,
        checkFunction: this.checkSensitiveDataAccess.bind(this),
      },
    ];
  }

  /**
   * Run compliance check
   */
  async runComplianceCheck(
    startDate: Date,
    endDate: Date,
    ruleIds?: string[],
  ): Promise<ComplianceReport> {
    const rules = ruleIds
      ? this.complianceRules.filter((r) => ruleIds.includes(r.id))
      : this.complianceRules;

    const results: ComplianceRuleResult[] = [];
    let totalScore = 0;

    for (const rule of rules) {
      const logs = await this.getLogsForRule(rule, startDate, endDate);
      const result = rule.checkFunction(logs);

      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        result,
      });

      totalScore += result.score;
    }

    const overallScore = rules.length > 0 ? totalScore / rules.length : 0;

    const summary = {
      compliant: results.filter((r) => r.result.compliant).length,
      nonCompliant: results.filter(
        (r) => !r.result.compliant && r.result.score < 50,
      ).length,
      warnings: results.filter(
        (r) => !r.result.compliant && r.result.score >= 50,
      ).length,
    };

    const recommendations = this.generateRecommendations(results);

    // Cache the report
    await this.cacheComplianceReport({
      overallScore,
      rules: results,
      summary,
      recommendations,
    });

    return {
      overallScore,
      rules: results,
      summary,
      recommendations,
    };
  }

  /**
   * Get compliance status
   */
  async getComplianceStatus(): Promise<{
    status: 'COMPLIANT' | 'WARNING' | 'NON_COMPLIANT';
    score: number;
    lastCheck: Date | null;
  }> {
    const cached = await this.cache.get<ComplianceReport>('compliance:latest');

    if (!cached) {
      // Run a quick check for the last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const report = await this.runComplianceCheck(startDate, endDate);

      return {
        status: this.getStatusFromScore(report.overallScore),
        score: report.overallScore,
        lastCheck: new Date(),
      };
    }

    return {
      status: this.getStatusFromScore(cached.overallScore),
      score: cached.overallScore,
      lastCheck: new Date(), // Would be stored in cache metadata
    };
  }

  /**
   * Check data retention compliance
   */
  async checkRetentionCompliance(): Promise<{
    compliant: boolean;
    issues: string[];
    logsToDelete: number;
  }> {
    const issues: string[] = [];
    let logsToDelete = 0;

    for (const rule of this.complianceRules) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - rule.retentionDays);

      // Check if we have logs older than retention period
      const oldLogs = await this.prisma.auditLog.count({
        where: {
          entityType: { in: rule.entityTypes },
          action: { in: rule.requiredActions },
          createdAt: { lt: cutoffDate },
        },
      });

      if (oldLogs > 0) {
        issues.push(
          `${oldLogs} logs for rule "${rule.name}" exceed retention period of ${rule.retentionDays} days`,
        );
        logsToDelete += oldLogs;
      }
    }

    return {
      compliant: issues.length === 0,
      issues,
      logsToDelete,
    };
  }

  /**
   * Validate audit trail integrity
   */
  async validateAuditTrail(
    entityType: string,
    entityId: string,
  ): Promise<{
    valid: boolean;
    issues: string[];
    timeline: any[];
  }> {
    const logs = await this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'asc' },
    });

    const issues: string[] = [];
    const timeline: any[] = [];

    // Check for logical consistency
    let hasCreate = false;
    let hasDelete = false;

    for (const log of logs) {
      timeline.push({
        action: log.action,
        timestamp: log.createdAt,
        actor: log.actorId,
      });

      if (log.action === AuditAction.CREATE) {
        if (hasCreate) {
          issues.push('Multiple CREATE actions for same entity');
        }
        hasCreate = true;
      }

      if (log.action === AuditAction.DELETE) {
        if (hasDelete) {
          issues.push('Multiple DELETE actions for same entity');
        }
        hasDelete = true;
      }

      // Check for actions after delete
      if (hasDelete && log.action !== AuditAction.DELETE) {
        issues.push(`${log.action} action after DELETE`);
      }
    }

    // Check for missing CREATE
    if (!hasCreate && logs.length > 0) {
      issues.push('Missing CREATE action for entity');
    }

    return {
      valid: issues.length === 0,
      issues,
      timeline,
    };
  }

  /**
   * Get logs for a specific rule
   */
  private async getLogsForRule(
    rule: ComplianceRule,
    startDate: Date,
    endDate: Date,
  ) {
    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (!rule.entityTypes.includes('*')) {
      where.entityType = { in: rule.entityTypes };
    }

    if (rule.requiredActions.length > 0) {
      where.action = { in: rule.requiredActions };
    }

    return this.prisma.auditLog.findMany({
      where,
      include: {
        actorProfile: true,
      },
    });
  }

  /**
   * Check authentication logging compliance
   */
  private checkAuthenticationLogging(logs: any[]): ComplianceCheckResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for missing logout logs
    const logins = logs.filter((l) => l.action === AuditAction.LOGIN);
    const logouts = logs.filter((l) => l.action === AuditAction.LOGOUT);

    if (logins.length > logouts.length * 1.5) {
      issues.push('Many login events without corresponding logout events');
      recommendations.push('Implement session timeout logging');
    }

    // Check for failed login tracking
    const failedLogins = logins.filter((l) => l.metadata?.success === false);
    if (failedLogins.length === 0 && logins.length > 100) {
      issues.push('No failed login attempts recorded');
      recommendations.push('Ensure failed login attempts are being logged');
    }

    const score =
      issues.length === 0 ? 100 : Math.max(0, 100 - issues.length * 25);

    return {
      compliant: issues.length === 0,
      issues,
      recommendations,
      score,
    };
  }

  /**
   * Check data access tracking compliance
   */
  private checkDataAccessTracking(logs: any[]): ComplianceCheckResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for READ action logging
    const readLogs = logs.filter((l) => l.action === AuditAction.READ);
    if (readLogs.length === 0) {
      issues.push('No data access (READ) events logged');
      recommendations.push('Implement READ action logging for all entities');
    }

    // Check for EXPORT action logging
    const exportLogs = logs.filter((l) => l.action === AuditAction.EXPORT);
    const hasExports = exportLogs.length > 0;

    if (!hasExports && logs.length > 1000) {
      issues.push('No data export events logged');
      recommendations.push('Implement EXPORT action logging');
    }

    const score =
      issues.length === 0 ? 100 : Math.max(0, 100 - issues.length * 30);

    return {
      compliant: issues.length === 0,
      issues,
      recommendations,
      score,
    };
  }

  /**
   * Check data modification audit compliance
   */
  private checkDataModificationAudit(logs: any[]): ComplianceCheckResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for old/new values in UPDATE actions
    const updateLogs = logs.filter((l) => l.action === AuditAction.UPDATE);
    const missingOldValues = updateLogs.filter((l) => !l.oldValues);
    const missingNewValues = updateLogs.filter((l) => !l.newValues);

    if (missingOldValues.length > 0) {
      issues.push(
        `${missingOldValues.length} UPDATE actions missing old values`,
      );
      recommendations.push('Capture old values before updates');
    }

    if (missingNewValues.length > 0) {
      issues.push(
        `${missingNewValues.length} UPDATE actions missing new values`,
      );
      recommendations.push('Capture new values after updates');
    }

    // Check for entity display names
    const missingDisplay = logs.filter((l) => !l.entityDisplay);
    if (missingDisplay.length > logs.length * 0.5) {
      issues.push('Many audit logs missing entity display names');
      recommendations.push(
        'Include entity display names for better readability',
      );
    }

    const score =
      issues.length === 0 ? 100 : Math.max(0, 100 - issues.length * 20);

    return {
      compliant: issues.length === 0,
      issues,
      recommendations,
      score,
    };
  }

  /**
   * Check permission change tracking compliance
   */
  private checkPermissionChangeTracking(logs: any[]): ComplianceCheckResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const grantLogs = logs.filter((l) => l.action === AuditAction.GRANT);
    const revokeLogs = logs.filter((l) => l.action === AuditAction.REVOKE);

    if (grantLogs.length === 0 && revokeLogs.length === 0) {
      issues.push('No permission change events logged');
      recommendations.push('Implement permission change logging');
    }

    // Check for target user identification
    const missingTarget = logs.filter((l) => !l.targetUserId);
    if (missingTarget.length > 0) {
      issues.push(
        `${missingTarget.length} permission changes missing target user`,
      );
      recommendations.push('Include target user in permission change logs');
    }

    const score =
      issues.length === 0 ? 100 : Math.max(0, 100 - issues.length * 35);

    return {
      compliant: issues.length === 0,
      issues,
      recommendations,
      score,
    };
  }

  /**
   * Check sensitive data access compliance
   */
  private checkSensitiveDataAccess(logs: any[]): ComplianceCheckResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for justification in metadata
    const missingJustification = logs.filter(
      (l) => !l.metadata?.justification && l.action === AuditAction.READ,
    );

    if (missingJustification.length > 0) {
      issues.push(
        `${missingJustification.length} sensitive data access without justification`,
      );
      recommendations.push('Require justification for sensitive data access');
    }

    // Check for bulk exports
    const bulkExports = logs.filter(
      (l) => l.action === AuditAction.EXPORT && l.metadata?.recordCount > 100,
    );

    if (bulkExports.length > 0) {
      issues.push(`${bulkExports.length} bulk export operations detected`);
      recommendations.push(
        'Review bulk export permissions and add approval workflow',
      );
    }

    const score =
      issues.length === 0 ? 100 : Math.max(0, 100 - issues.length * 40);

    return {
      compliant: issues.length === 0,
      issues,
      recommendations,
      score,
    };
  }

  /**
   * Generate recommendations based on compliance results
   */
  private generateRecommendations(results: ComplianceRuleResult[]): string[] {
    const recommendations: string[] = [];

    // Aggregate all recommendations
    results.forEach((result) => {
      recommendations.push(...result.result.recommendations);
    });

    // Add high-level recommendations based on overall compliance
    const nonCompliant = results.filter((r) => !r.result.compliant);

    if (nonCompliant.length > 0) {
      recommendations.unshift(
        `Address ${nonCompliant.length} non-compliant rules immediately`,
      );
    }

    const lowScores = results.filter((r) => r.result.score < 70);
    if (lowScores.length > 0) {
      recommendations.push(
        'Consider implementing automated compliance monitoring',
      );
    }

    // Remove duplicates
    return [...new Set(recommendations)];
  }

  /**
   * Get status from score
   */
  private getStatusFromScore(
    score: number,
  ): 'COMPLIANT' | 'WARNING' | 'NON_COMPLIANT' {
    if (score >= 80) return 'COMPLIANT';
    if (score >= 50) return 'WARNING';
    return 'NON_COMPLIANT';
  }

  /**
   * Cache compliance report
   */
  private async cacheComplianceReport(report: ComplianceReport): Promise<void> {
    await this.cache.set('compliance:latest', report, 3600); // Cache for 1 hour

    // Also cache historical reports
    const dateKey = new Date().toISOString().split('T')[0];
    await this.cache.set(`compliance:history:${dateKey}`, report, 86400 * 30); // Keep for 30 days
  }
}
