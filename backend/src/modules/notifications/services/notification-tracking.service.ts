import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import { CacheService } from '@/core/cache/cache.service';
import { NotificationType } from '@prisma/client';

interface FrequencyWindow {
  type: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  start: Date;
  end: Date;
}

@Injectable()
export class NotificationTrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(NotificationTrackingService.name);
  }

  /**
   * Check and update frequency limits for a notification
   */
  async checkFrequencyLimits(
    userProfileId: string,
    notificationType: NotificationType,
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Get user preferences
    const preferences = await this.prisma.notificationPreference.findUnique({
      where: { userProfileId },
      include: {
        channelPreferences: {
          where: { notificationType },
        },
      },
    });

    if (!preferences) {
      return { allowed: true };
    }

    // Check hourly limit
    if (preferences.maxHourlyNotifications) {
      const hourlyCount = await this.getFrequencyCount(
        preferences.id,
        notificationType,
        'HOURLY',
      );

      if (hourlyCount >= preferences.maxHourlyNotifications) {
        return {
          allowed: false,
          reason: `Hourly limit (${preferences.maxHourlyNotifications}) reached`,
        };
      }
    }

    // Check daily limit
    if (preferences.maxDailyNotifications) {
      const dailyCount = await this.getFrequencyCount(
        preferences.id,
        notificationType,
        'DAILY',
      );

      if (dailyCount >= preferences.maxDailyNotifications) {
        return {
          allowed: false,
          reason: `Daily limit (${preferences.maxDailyNotifications}) reached`,
        };
      }
    }

    // Check channel-specific limits
    const channelPref = preferences.channelPreferences[0];
    if (channelPref?.maxDaily) {
      const dailyTypeCount = await this.getFrequencyCount(
        preferences.id,
        notificationType,
        'DAILY',
      );

      if (dailyTypeCount >= channelPref.maxDaily) {
        return {
          allowed: false,
          reason: `Daily limit for ${notificationType} (${channelPref.maxDaily}) reached`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Track notification sent and update frequency counters
   */
  async trackNotificationSent(
    userProfileId: string,
    notificationType: NotificationType,
  ) {
    const preferences = await this.prisma.notificationPreference.findUnique({
      where: { userProfileId },
    });

    if (!preferences) {
      return;
    }

    // Update frequency tracking for different windows
    const windows: FrequencyWindow[] = [
      this.getWindow('HOURLY'),
      this.getWindow('DAILY'),
      this.getWindow('WEEKLY'),
      this.getWindow('MONTHLY'),
    ];

    for (const window of windows) {
      await this.updateFrequencyTracking(
        preferences.id,
        notificationType,
        window,
      );
    }
  }

  /**
   * Get frequency count for a specific window
   */
  private async getFrequencyCount(
    preferenceId: string,
    notificationType: NotificationType,
    windowType: string,
  ): Promise<number> {
    const window = this.getWindow(windowType as any);

    const tracking = await this.prisma.notificationFrequencyTracking.findUnique(
      {
        where: {
          preferenceId_notificationType_windowType_windowStart: {
            preferenceId,
            notificationType,
            windowType,
            windowStart: window.start,
          },
        },
      },
    );

    return tracking?.count || 0;
  }

  /**
   * Update frequency tracking counter
   */
  private async updateFrequencyTracking(
    preferenceId: string,
    notificationType: NotificationType,
    window: FrequencyWindow,
  ) {
    await this.prisma.notificationFrequencyTracking.upsert({
      where: {
        preferenceId_notificationType_windowType_windowStart: {
          preferenceId,
          notificationType,
          windowType: window.type,
          windowStart: window.start,
        },
      },
      update: {
        count: { increment: 1 },
      },
      create: {
        preferenceId,
        notificationType,
        windowType: window.type,
        windowStart: window.start,
        count: 1,
      },
    });
  }

  /**
   * Get time window for frequency tracking
   */
  private getWindow(
    type: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY',
  ): FrequencyWindow {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (type) {
      case 'HOURLY':
        start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          now.getHours(),
        );
        end = new Date(start.getTime() + 60 * 60 * 1000);
        break;
      case 'DAILY':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'WEEKLY':
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek;
        start = new Date(now.setDate(diff));
        start.setHours(0, 0, 0, 0);
        end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'MONTHLY':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
    }

    return { type, start, end };
  }

  /**
   * Clean up old frequency tracking records
   */
  async cleanupOldTracking(daysToKeep: number = 30) {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const deleted = await this.prisma.notificationFrequencyTracking.deleteMany({
      where: {
        windowStart: { lt: cutoffDate },
      },
    });

    this.logger.log(
      `Cleaned up ${deleted.count} old frequency tracking records`,
    );
    return deleted.count;
  }

  /**
   * Get notification delivery statistics
   */
  async getDeliveryStats(filters?: {
    userProfileId?: string;
    type?: NotificationType;
    dateRange?: { start: Date; end: Date };
  }) {
    const where = this.buildWhereClause(filters);

    const [total, read] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { ...where, readAt: { not: null } },
      }),
    ]);

    // Get frequency tracking stats
    const frequencyStats = await this.getFrequencyStats(filters?.userProfileId);

    return {
      total,
      read,
      readRate: total > 0 ? (read / total) * 100 : 0,
      ...frequencyStats,
    };
  }

  /**
   * Get frequency statistics for a user
   */
  async getFrequencyStats(userProfileId?: string) {
    const where: any = {};
    if (userProfileId) {
      const pref = await this.prisma.notificationPreference.findUnique({
        where: { userProfileId },
      });
      if (pref) {
        where.preferenceId = pref.id;
      }
    }

    const tracking = await this.prisma.notificationFrequencyTracking.groupBy({
      by: ['windowType', 'notificationType'],
      where,
      _sum: {
        count: true,
      },
    });

    return {
      frequencyStats: tracking.map((t) => ({
        window: t.windowType,
        type: t.notificationType,
        count: t._sum.count || 0,
      })),
    };
  }

  /**
   * Get user notification metrics
   */
  async getUserMetrics(
    userProfileId: string,
    period: 'day' | 'week' | 'month' = 'week',
  ) {
    const dateRange = this.getDateRange(period);

    const notifications = await this.prisma.notification.findMany({
      where: {
        userProfileId,
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      select: {
        type: true,
        priority: true,
        isRead: true,
        readAt: true,
        createdAt: true,
      },
    });

    // Calculate metrics
    const totalCount = notifications.length;
    const readCount = notifications.filter((n) => n.isRead).length;
    const unreadCount = totalCount - readCount;

    // Average time to read (for read notifications)
    const readTimes = notifications
      .filter((n) => n.isRead && n.readAt)
      .map((n) => n.readAt!.getTime() - n.createdAt.getTime());

    const avgTimeToRead =
      readTimes.length > 0
        ? readTimes.reduce((sum, time) => sum + time, 0) / readTimes.length
        : 0;

    // Group by type
    const byType = notifications.reduce(
      (acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Group by priority
    const byPriority = notifications.reduce(
      (acc, n) => {
        acc[n.priority] = (acc[n.priority] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      period,
      dateRange,
      metrics: {
        total: totalCount,
        read: readCount,
        unread: unreadCount,
        readRate: totalCount > 0 ? (readCount / totalCount) * 100 : 0,
        avgTimeToRead: Math.round(avgTimeToRead / 1000), // in seconds
      },
      byType,
      byPriority,
    };
  }

  /**
   * Get date range for period
   */
  private getDateRange(period: 'day' | 'week' | 'month') {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'day':
        start.setDate(start.getDate() - 1);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
    }

    return { start, end };
  }

  /**
   * Track notification creation
   */
  async trackCreation(notification: any) {
    try {
      // Track the creation in frequency counters
      await this.trackNotificationSent(
        notification.userProfileId,
        notification.type,
      );

      this.logger.debug(`Tracked creation of notification ${notification.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to track notification creation: ${error.message}`,
      );
    }
  }

  /**
   * Track notification read
   */
  async trackRead(notificationId: string) {
    try {
      // Update the notification as read
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      this.logger.debug(`Tracked read of notification ${notificationId}`);
    } catch (error) {
      this.logger.error(`Failed to track notification read: ${error.message}`);
    }
  }

  /**
   * Build where clause for queries
   */
  private buildWhereClause(filters?: any) {
    if (!filters) return {};

    const where: any = {};

    if (filters.userProfileId) {
      where.userProfileId = filters.userProfileId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.dateRange) {
      where.createdAt = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    return where;
  }
}
