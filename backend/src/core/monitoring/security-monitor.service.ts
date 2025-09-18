import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';

export enum SecurityEventType {
  LOGIN_FAILED = 'LOGIN_FAILED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  INVALID_EMPLOYEE = 'INVALID_EMPLOYEE',
  INACTIVE_EMPLOYEE = 'INACTIVE_EMPLOYEE',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  SYNC_UNAUTHORIZED = 'SYNC_UNAUTHORIZED',
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

interface SecurityEvent {
  type: SecurityEventType;
  severity: AlertSeverity;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  timestamp: Date;
}

interface AlertThreshold {
  eventType: SecurityEventType;
  count: number;
  timeWindowMinutes: number;
  severity: AlertSeverity;
}

@Injectable()
export class SecurityMonitorService {
  private readonly logger = new Logger(SecurityMonitorService.name);
  private readonly eventStore: Map<string, SecurityEvent[]> = new Map();

  // Alert thresholds configuration
  private readonly alertThresholds: AlertThreshold[] = [
    {
      eventType: SecurityEventType.LOGIN_FAILED,
      count: 3,
      timeWindowMinutes: 5,
      severity: AlertSeverity.MEDIUM,
    },
    {
      eventType: SecurityEventType.LOGIN_FAILED,
      count: 10,
      timeWindowMinutes: 30,
      severity: AlertSeverity.HIGH,
    },
    {
      eventType: SecurityEventType.UNAUTHORIZED_ACCESS,
      count: 5,
      timeWindowMinutes: 10,
      severity: AlertSeverity.HIGH,
    },
    {
      eventType: SecurityEventType.INVALID_EMPLOYEE,
      count: 3,
      timeWindowMinutes: 5,
      severity: AlertSeverity.CRITICAL,
    },
  ];

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Clean up old events every hour
    setInterval(() => this.cleanupOldEvents(), 3600000);
  }

  /**
   * Track a security event and check for alert conditions
   */
  async trackSecurityEvent(
    event: Omit<SecurityEvent, 'timestamp'>,
  ): Promise<void> {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
    };

    try {
      // Store event in memory for quick threshold checking
      this.storeEvent(securityEvent);

      // Persist to database for audit trail
      await this.persistEvent(securityEvent);

      // Check alert thresholds
      await this.checkAlertThresholds(securityEvent);

      // Log the event
      this.logSecurityEvent(securityEvent);
    } catch (error) {
      this.logger.error('Failed to track security event:', error);
    }
  }

  /**
   * Track failed login attempt with enhanced monitoring
   */
  async trackFailedLogin(
    email: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.trackSecurityEvent({
      type: SecurityEventType.LOGIN_FAILED,
      severity: AlertSeverity.MEDIUM,
      email,
      ipAddress,
      userAgent,
      metadata: { reason },
    });
  }

  /**
   * Track unauthorized access attempt
   */
  async trackUnauthorizedAccess(
    userId: string,
    email: string,
    endpoint: string,
    reason: string,
  ): Promise<void> {
    await this.trackSecurityEvent({
      type: SecurityEventType.UNAUTHORIZED_ACCESS,
      severity: AlertSeverity.HIGH,
      userId,
      email,
      metadata: { endpoint, reason },
    });
  }

  /**
   * Get security statistics for monitoring dashboard
   */
  async getSecurityStats(hoursBack: number = 24): Promise<any> {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hoursBack);

    const [failedLogins, unauthorizedAccess, recentAlerts] = await Promise.all([
      // Count failed login attempts
      this.prismaService.auditLog.count({
        where: {
          action: 'LOGIN',
          metadata: {
            path: ['securityAction'],
            equals: 'AUTH_FAILURE',
          },
          createdAt: { gte: startDate },
        },
      }),

      // Count unauthorized access attempts
      this.prismaService.auditLog.count({
        where: {
          action: 'LOGIN',
          OR: [
            {
              metadata: {
                path: ['reason'],
                equals: 'NOT_IN_DATA_KARYAWAN_OR_INACTIVE',
              },
            },
            {
              metadata: {
                path: ['reason'],
                equals: 'EMPLOYEE_NOT_ACTIVE',
              },
            },
          ],
          createdAt: { gte: startDate },
        },
      }),

      // Get recent security alerts
      this.prismaService.auditLog.findMany({
        where: {
          module: { in: ['AUTH', 'USER_SYNC', 'PROFILE_CLEANUP'] },
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          actorId: true,
          action: true,
          module: true,
          entityDisplay: true,
          metadata: true,
          ipAddress: true,
          createdAt: true,
        },
      }),
    ]);

    // Get current threat level based on recent activity
    const threatLevel = this.calculateThreatLevel(
      failedLogins,
      unauthorizedAccess,
    );

    return {
      summary: {
        failedLogins,
        unauthorizedAccess,
        threatLevel,
        periodHours: hoursBack,
      },
      recentAlerts,
      topOffenders: await this.getTopOffenders(startDate),
    };
  }

  /**
   * Store event in memory for threshold checking
   */
  private storeEvent(event: SecurityEvent): void {
    const key = `${event.type}:${event.email || event.userId || 'unknown'}`;

    if (!this.eventStore.has(key)) {
      this.eventStore.set(key, []);
    }

    this.eventStore.get(key)!.push(event);
  }

  /**
   * Persist security event to database
   */
  private async persistEvent(event: SecurityEvent): Promise<void> {
    try {
      await this.prismaService.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          actorId: event.userId || 'UNKNOWN',
          action: 'LOGIN',
          module: 'SECURITY_MONITOR',
          entityType: 'SECURITY_EVENT',
          entityId: event.userId || 'SYSTEM',
          entityDisplay: event.email || 'Unknown',
          metadata: {
            eventType: event.type,
            severity: event.severity,
            ...event.metadata,
            timestamp: event.timestamp.toISOString(),
          },
          ipAddress: event.ipAddress || '0.0.0.0',
          userAgent: event.userAgent || 'Unknown',
        },
      });
    } catch (error) {
      this.logger.error('Failed to persist security event:', error);
    }
  }

  /**
   * Check if event triggers any alert thresholds
   */
  private async checkAlertThresholds(event: SecurityEvent): Promise<void> {
    const relevantThresholds = this.alertThresholds.filter(
      (t) => t.eventType === event.type,
    );

    for (const threshold of relevantThresholds) {
      const recentEvents = this.getRecentEvents(
        event.type,
        event.email || event.userId,
        threshold.timeWindowMinutes,
      );

      if (recentEvents.length >= threshold.count) {
        await this.triggerAlert({
          severity: threshold.severity,
          message: `Security threshold exceeded: ${threshold.count} ${event.type} events in ${threshold.timeWindowMinutes} minutes`,
          affectedEntity: event.email || event.userId || 'Unknown',
          eventCount: recentEvents.length,
          events: recentEvents,
        });
      }
    }
  }

  /**
   * Get recent events for threshold checking
   */
  private getRecentEvents(
    eventType: SecurityEventType,
    identifier: string | undefined,
    minutesBack: number,
  ): SecurityEvent[] {
    const key = `${eventType}:${identifier || 'unknown'}`;
    const events = this.eventStore.get(key) || [];
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - minutesBack);

    return events.filter((e) => e.timestamp >= cutoffTime);
  }

  /**
   * Trigger security alert
   */
  private async triggerAlert(alert: any): Promise<void> {
    // Critical alerts
    if (alert.severity === AlertSeverity.CRITICAL) {
      this.logger.error(`🚨 CRITICAL SECURITY ALERT: ${alert.message}`);
      this.logger.error(`Affected entity: ${alert.affectedEntity}`);
      this.logger.error(`Event count: ${alert.eventCount}`);

      // In production, send notifications (email, Slack, PagerDuty, etc.)
      await this.sendAlertNotification(alert);
    } else if (alert.severity === AlertSeverity.HIGH) {
      this.logger.warn(`⚠️ HIGH SECURITY ALERT: ${alert.message}`);
      this.logger.warn(`Affected entity: ${alert.affectedEntity}`);
    } else {
      this.logger.warn(`SECURITY ALERT: ${alert.message}`);
    }

    // Record alert in database
    await this.recordAlert(alert);
  }

  /**
   * Send alert notification to configured channels
   */
  private async sendAlertNotification(alert: any): Promise<void> {
    // Implementation would depend on your notification service
    // Could integrate with:
    // - Email (via Postmark)
    // - Slack webhooks
    // - PagerDuty
    // - SMS alerts
    // - Security dashboard websocket

    const notificationChannels = this.configService.get<string>(
      'SECURITY_NOTIFICATION_CHANNELS',
      'log',
    );

    if (notificationChannels.includes('email')) {
      // Send email alert
      this.logger.log('Would send email alert in production');
    }

    if (notificationChannels.includes('slack')) {
      // Send Slack alert
      this.logger.log('Would send Slack alert in production');
    }
  }

  /**
   * Record alert in database
   */
  private async recordAlert(alert: any): Promise<void> {
    try {
      await this.prismaService.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          actorId: 'SECURITY_MONITOR',
          action: 'LOGIN', // Use valid AuditAction enum value
          module: 'SECURITY_MONITOR',
          entityType: 'SECURITY_ALERT',
          entityId: alert.affectedEntity || 'SYSTEM',
          entityDisplay: alert.message,
          metadata: {
            ...alert,
            alertType: 'SECURITY_ALERT',
          },
          ipAddress: '0.0.0.0',
          userAgent: 'SecurityMonitor',
        },
      });
    } catch (error) {
      this.logger.error('Failed to record security alert:', error);
    }
  }

  /**
   * Log security event with appropriate level
   */
  private logSecurityEvent(event: SecurityEvent): void {
    const logMessage = `[${event.type}] ${event.email || event.userId || 'Unknown'} - ${JSON.stringify(event.metadata)}`;

    switch (event.severity) {
      case AlertSeverity.CRITICAL:
        this.logger.error(logMessage);
        break;
      case AlertSeverity.HIGH:
        this.logger.warn(logMessage);
        break;
      default:
        this.logger.log(logMessage);
    }
  }

  /**
   * Calculate current threat level based on activity
   */
  private calculateThreatLevel(
    failedLogins: number,
    unauthorizedAccess: number,
  ): string {
    const score = failedLogins * 1 + unauthorizedAccess * 3;

    if (score >= 50) return 'CRITICAL';
    if (score >= 30) return 'HIGH';
    if (score >= 15) return 'MEDIUM';
    if (score >= 5) return 'LOW';
    return 'NORMAL';
  }

  /**
   * Get top offending IPs or emails
   */
  private async getTopOffenders(startDate: Date): Promise<any[]> {
    const offenders = await this.prismaService.auditLog.groupBy({
      by: ['entityDisplay', 'ipAddress'],
      where: {
        action: 'LOGIN',
        metadata: {
          path: ['securityAction'],
          equals: 'AUTH_FAILURE',
        },
        createdAt: { gte: startDate },
      },
      _count: true,
      orderBy: {
        _count: {
          entityDisplay: 'desc',
        },
      },
      take: 5,
    });

    return offenders.map((o) => ({
      entity: o.entityDisplay,
      ipAddress: o.ipAddress,
      attemptCount: o._count,
    }));
  }

  /**
   * Clean up old events from memory
   */
  private cleanupOldEvents(): void {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 24); // Keep 24 hours of events

    for (const [key, events] of this.eventStore.entries()) {
      const recentEvents = events.filter((e) => e.timestamp >= cutoffTime);

      if (recentEvents.length === 0) {
        this.eventStore.delete(key);
      } else {
        this.eventStore.set(key, recentEvents);
      }
    }

    this.logger.debug(
      `Cleaned up event store. Current size: ${this.eventStore.size}`,
    );
  }
}
