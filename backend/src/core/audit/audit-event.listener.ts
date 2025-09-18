import { Injectable, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditLog } from '@prisma/client';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '../config';

export interface AuditLoggedEvent {
  auditLog: AuditLog;
  entry: any;
}

@Injectable()
export class AuditEventListener {
  private readonly enableRealTimeProcessing: boolean;
  private readonly enableNotifications: boolean;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @InjectQueue('audit-processing')
    private readonly auditQueue?: Queue,
  ) {
    this.enableRealTimeProcessing =
      this.configService.get('audit.realTimeProcessing') !== false;
    this.enableNotifications =
      this.configService.get('audit.notifications.enabled') === true;
  }

  @OnEvent('audit.logged')
  async handleAuditLogged(event: AuditLoggedEvent) {
    const { auditLog, entry } = event;

    // Process critical security events immediately
    if (this.isCriticalSecurityEvent(auditLog)) {
      await this.handleCriticalSecurityEvent(auditLog);
    }

    // Queue for async processing if enabled
    if (this.auditQueue && this.enableRealTimeProcessing) {
      await this.auditQueue.add(
        'process-audit-log',
        {
          auditLog,
          entry,
        },
        {
          priority: this.getProcessingPriority(auditLog),
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }

    // Send notifications for specific events
    if (this.enableNotifications && this.shouldNotify(auditLog)) {
      await this.sendNotification(auditLog);
    }
  }

  @OnEvent('user.login')
  async handleUserLogin(event: {
    userId: string;
    ip: string;
    success: boolean;
  }) {
    // Additional login-specific audit logic
    if (!event.success) {
      await this.trackFailedLogin(event.userId, event.ip);
    }
  }

  @OnEvent('permission.denied')
  async handlePermissionDenied(event: {
    userId: string;
    permission: string;
    resource: string;
  }) {
    // Track permission denial patterns for security analysis
    await this.trackPermissionDenial(event);
  }

  @OnEvent('data.exported')
  async handleDataExport(event: {
    userId: string;
    entityType: string;
    recordCount: number;
  }) {
    // Track data export for compliance
    console.log(
      `Data export tracked: ${event.entityType} (${event.recordCount} records) by user ${event.userId}`,
    );
  }

  private isCriticalSecurityEvent(auditLog: AuditLog): boolean {
    const criticalActions = [
      'LOGIN_FAILED',
      'ACCESS_DENIED',
      'UNAUTHORIZED_ACCESS',
      'DATA_BREACH_ATTEMPT',
    ];

    return criticalActions.includes(auditLog.action);
  }

  private async handleCriticalSecurityEvent(auditLog: AuditLog): Promise<void> {
    // Immediate actions for critical security events
    console.error(`CRITICAL SECURITY EVENT: ${auditLog.action}`, {
      actorId: auditLog.actorId,
      ip: auditLog.ipAddress,
      timestamp: auditLog.createdAt,
    });

    // In production, you might want to:
    // - Send immediate alerts to security team
    // - Trigger automated response (e.g., account lockout)
    // - Create incident ticket
    // - Enable enhanced logging for the user
  }

  private getProcessingPriority(auditLog: AuditLog): number {
    // Higher number = higher priority
    const priorityMap: Record<string, number> = {
      LOGIN_FAILED: 10,
      ACCESS_DENIED: 9,
      DELETE: 8,
      PASSWORD_CHANGE: 7,
      UPDATE: 5,
      CREATE: 4,
      LOGIN: 3,
      VIEW: 1,
    };

    return priorityMap[auditLog.action] || 0;
  }

  private shouldNotify(auditLog: AuditLog): boolean {
    const notifyActions = [
      'LOGIN_FAILED',
      'ACCESS_DENIED',
      'PASSWORD_CHANGE',
      'DELETE',
      'EXPORT',
    ];

    return notifyActions.includes(auditLog.action);
  }

  private async sendNotification(auditLog: AuditLog): Promise<void> {
    // In production, integrate with notification service
    console.log(`Notification triggered for audit event: ${auditLog.action}`);

    // Example notification channels:
    // - Email to security team
    // - Slack/Teams webhook
    // - SMS for critical events
    // - Push notification to admin app
  }

  private async trackFailedLogin(userId: string, ip: string): Promise<void> {
    // Track failed login attempts for account lockout
    // This could be stored in Redis for fast access
    console.log(`Failed login tracked for user ${userId} from IP ${ip}`);

    // In production:
    // - Increment failed attempt counter
    // - Check if threshold exceeded
    // - Trigger account lockout if necessary
    // - Send alert to user about suspicious activity
  }

  private async trackPermissionDenial(event: {
    userId: string;
    permission: string;
    resource: string;
  }): Promise<void> {
    // Track permission denial patterns
    console.log(
      `Permission denial tracked: ${event.permission} on ${event.resource} for user ${event.userId}`,
    );

    // In production:
    // - Analyze patterns for potential security issues
    // - Detect privilege escalation attempts
    // - Alert on unusual access patterns
  }
}
