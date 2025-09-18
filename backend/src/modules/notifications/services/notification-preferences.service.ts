import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { CacheService } from '@/core/cache/cache.service';
import { LoggingService } from '@/core/logging/logging.service';
import {
  NotificationChannel,
  NotificationType,
  Priority,
} from '@prisma/client';

interface PreferenceUpdateDto {
  enabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
  maxDailyNotifications?: number;
  maxHourlyNotifications?: number;
  defaultChannels?: NotificationChannel[];
}

interface ChannelPreferenceDto {
  notificationType: NotificationType;
  channels: NotificationChannel[];
  enabled?: boolean;
  priority?: Priority;
  maxDaily?: number;
}

@Injectable()
export class NotificationPreferencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly logger: LoggingService,
  ) {
    this.logger.setContext(NotificationPreferencesService.name);
  }

  /**
   * Get or create user notification preferences
   */
  async getUserPreferences(userProfileId: string): Promise<any> {
    const cacheKey = `notification:preferences:${userProfileId}`;

    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get from database
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: { userProfileId },
      include: {
        channelPreferences: true,
        unsubscriptions: {
          where: {
            resubscribedAt: null,
          },
        },
      },
    });

    // Create default preferences if not exists
    if (!preferences) {
      preferences = await this.createDefaultPreferences(userProfileId);
    }

    // Cache for 1 hour
    await this.cache.set(cacheKey, preferences, 3600);
    return preferences;
  }

  /**
   * Create default preferences for new user
   */
  private async createDefaultPreferences(userProfileId: string): Promise<any> {
    return await this.prisma.notificationPreference.create({
      data: {
        userProfileId,
        enabled: true,
        quietHoursEnabled: false,
        timezone: 'Asia/Jakarta',
        defaultChannels: [
          NotificationChannel.IN_APP,
          NotificationChannel.EMAIL,
        ],
        channelPreferences: {
          create: [
            {
              notificationType: NotificationType.APPROVAL_REQUEST,
              channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
              enabled: true,
              priority: Priority.HIGH,
            },
            {
              notificationType: NotificationType.SYSTEM_ALERT,
              channels: [
                NotificationChannel.IN_APP,
                NotificationChannel.EMAIL,
                NotificationChannel.PUSH,
              ],
              enabled: true,
              priority: Priority.CRITICAL,
            },
            {
              notificationType: NotificationType.ANNOUNCEMENT,
              channels: [NotificationChannel.IN_APP],
              enabled: true,
              priority: Priority.LOW,
            },
          ],
        },
      },
      include: {
        channelPreferences: true,
        unsubscriptions: true,
      },
    });
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userProfileId: string,
    data: PreferenceUpdateDto,
  ) {
    // Validate quiet hours if provided
    if (data.quietHoursStart || data.quietHoursEnd) {
      this.validateQuietHours(data.quietHoursStart, data.quietHoursEnd);
    }

    const preferences = await this.prisma.notificationPreference.update({
      where: { userProfileId },
      data,
      include: {
        channelPreferences: true,
        unsubscriptions: true,
      },
    });

    await this.invalidateCache(userProfileId);
    this.logger.log(`Updated preferences for user ${userProfileId}`);

    return preferences;
  }

  /**
   * Update channel preference for specific notification type
   */
  async updateChannelPreference(
    userProfileId: string,
    data: ChannelPreferenceDto,
  ) {
    const preference = await this.getUserPreferences(userProfileId);

    // Check if channel preference exists
    const existing = await this.prisma.notificationChannelPreference.findFirst({
      where: {
        preferenceId: preference.id,
        notificationType: data.notificationType,
      },
    });

    if (existing) {
      // Update existing
      await this.prisma.notificationChannelPreference.update({
        where: { id: existing.id },
        data: {
          channels: data.channels,
          enabled: data.enabled ?? existing.enabled,
          priority: data.priority ?? existing.priority,
          maxDaily: data.maxDaily ?? existing.maxDaily,
        },
      });
    } else {
      // Create new
      await this.prisma.notificationChannelPreference.create({
        data: {
          preferenceId: preference.id,
          notificationType: data.notificationType,
          channels: data.channels,
          enabled: data.enabled ?? true,
          priority: data.priority,
          maxDaily: data.maxDaily,
        },
      });
    }

    await this.invalidateCache(userProfileId);
    return this.getUserPreferences(userProfileId);
  }

  /**
   * Check if notification should be sent based on preferences
   */
  async shouldSendNotification(
    userProfileId: string,
    notificationType: NotificationType,
    channel: NotificationChannel,
  ): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userProfileId);

      // Check if notifications are globally enabled
      if (!preferences.enabled) {
        return false;
      }

      // Check quiet hours
      if (this.isInQuietHours(preferences)) {
        this.logger.debug(`User ${userProfileId} is in quiet hours`);
        return false;
      }

      // Check unsubscriptions
      const isUnsubscribed = preferences.unsubscriptions?.some(
        (unsub: any) =>
          unsub.notificationType === notificationType ||
          unsub.notificationType === null, // Global unsubscribe
      );

      if (isUnsubscribed) {
        return false;
      }

      // Check channel preference for specific notification type
      const channelPref = preferences.channelPreferences?.find(
        (pref: any) => pref.notificationType === notificationType,
      );

      if (channelPref) {
        return channelPref.enabled && channelPref.channels.includes(channel);
      }

      // Fall back to default channels
      return preferences.defaultChannels.includes(channel);
    } catch (error) {
      this.logger.error(
        `Error checking notification preferences: ${error.message}`,
      );
      // Default to sending if error occurs
      return true;
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(preferences: any): boolean {
    if (
      !preferences.quietHoursEnabled ||
      !preferences.quietHoursStart ||
      !preferences.quietHoursEnd
    ) {
      return false;
    }

    const now = new Date();
    const timezone = preferences.timezone || 'Asia/Jakarta';

    // Convert to user's timezone
    const userTime = new Date(
      now.toLocaleString('en-US', { timeZone: timezone }),
    );
    const currentHour = userTime.getHours();
    const currentMinute = userTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    // Parse quiet hours (format: "HH:MM")
    const [startHour, startMinute] = preferences.quietHoursStart
      .split(':')
      .map(Number);
    const [endHour, endMinute] = preferences.quietHoursEnd
      .split(':')
      .map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Handle overnight quiet hours
    if (startMinutes > endMinutes) {
      return (
        currentTimeMinutes >= startMinutes || currentTimeMinutes <= endMinutes
      );
    }

    return (
      currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes
    );
  }

  /**
   * Validate quiet hours format
   */
  private validateQuietHours(start?: string, end?: string) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (start && !timeRegex.test(start)) {
      throw new BadRequestException(
        'Invalid quiet hours start time format. Use HH:MM',
      );
    }

    if (end && !timeRegex.test(end)) {
      throw new BadRequestException(
        'Invalid quiet hours end time format. Use HH:MM',
      );
    }
  }

  /**
   * Unsubscribe user from notifications
   */
  async unsubscribe(
    userProfileId: string,
    notificationType?: NotificationType,
    channel?: NotificationChannel,
    reason?: string,
  ) {
    const preferences = await this.getUserPreferences(userProfileId);

    // Generate unique token for unsubscribe link
    const token = `unsub_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    await this.prisma.notificationUnsubscribe.create({
      data: {
        preferenceId: preferences.id,
        notificationType,
        channel,
        reason: reason || 'User requested',
        token,
      },
    });

    await this.invalidateCache(userProfileId);
    this.logger.log(
      `User ${userProfileId} unsubscribed from ${
        notificationType || 'all'
      } notifications`,
    );
  }

  /**
   * Resubscribe user to notifications
   */
  async resubscribe(
    userProfileId: string,
    notificationType?: NotificationType,
    channel?: NotificationChannel,
  ) {
    const preferences = await this.getUserPreferences(userProfileId);

    const where: any = {
      preferenceId: preferences.id,
      resubscribedAt: null,
    };

    if (notificationType) {
      where.notificationType = notificationType;
    }

    if (channel) {
      where.channel = channel;
    }

    await this.prisma.notificationUnsubscribe.updateMany({
      where,
      data: {
        resubscribedAt: new Date(),
      },
    });

    await this.invalidateCache(userProfileId);
    this.logger.log(
      `User ${userProfileId} resubscribed to ${
        notificationType || 'all'
      } notifications`,
    );
  }

  /**
   * Get notification statistics for user
   */
  async getUserNotificationStats(userProfileId: string) {
    const preferences = await this.getUserPreferences(userProfileId);

    const stats = await this.prisma.notification.groupBy({
      by: ['type', 'priority', 'isRead'],
      where: {
        userProfileId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      _count: true,
    });

    return {
      preferences,
      stats,
    };
  }

  /**
   * Toggle notification channel for user
   */
  async toggleChannel(
    userProfileId: string,
    channel: NotificationChannel,
    enabled: boolean,
  ) {
    const preferences = await this.getUserPreferences(userProfileId);

    let defaultChannels = preferences.defaultChannels || [];

    if (enabled) {
      // Add channel if not already present
      if (!defaultChannels.includes(channel)) {
        defaultChannels.push(channel);
      }
    } else {
      // Remove channel
      defaultChannels = defaultChannels.filter(
        (c: NotificationChannel) => c !== channel,
      );
    }

    const updated = await this.prisma.notificationPreference.update({
      where: { userProfileId },
      data: {
        defaultChannels,
      },
      include: {
        channelPreferences: true,
        unsubscriptions: true,
      },
    });

    await this.invalidateCache(userProfileId);
    this.logger.log(
      `Toggled channel ${channel} to ${enabled} for user ${userProfileId}`,
    );

    return updated;
  }

  /**
   * Invalidate cache for user preferences
   */
  private async invalidateCache(userProfileId: string) {
    await this.cache.del(`notification:preferences:${userProfileId}`);
  }
}
