import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import { NotificationChannelsService } from './notification-channels.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationChannel } from '@prisma/client';

@Injectable()
export class NotificationDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
    private readonly channelsService: NotificationChannelsService,
    private readonly preferencesService: NotificationPreferencesService,
    private readonly queueService: NotificationQueueService,
  ) {}

  async scheduleDelivery(notification: any) {
    try {
      // Add to queue for async processing
      await this.queueService.addToQueue(notification);
    } catch (error) {
      this.logger.error('Failed to schedule notification delivery', error);
      throw error;
    }
  }

  async deliverNotification(notificationId: string) {
    try {
      const notification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
        include: {
          userProfile: true,
        },
      });

      if (!notification) {
        throw new Error(`Notification ${notificationId} not found`);
      }

      // Check user preferences
      const shouldSend = await this.preferencesService.shouldSendNotification(
        notification.userProfileId,
        notification.type,
        NotificationChannel.IN_APP,
      );

      if (!shouldSend) {
        return { success: false, reason: 'User preferences' };
      }

      // Determine channels to use
      const channels = this.determineChannels(notification);

      // Send to channels
      const results = await this.channelsService.sendToMultipleChannels(
        channels,
        notification.userProfile,
        notification,
      );

      // Update status based on results
      const anySuccess = Object.values(results).some((r) => r === true);

      if (!anySuccess) {
        this.logger.error(`Failed to deliver notification ${notificationId}`);
      }

      return { success: anySuccess, results };
    } catch (error) {
      this.logger.error('Failed to deliver notification', error);
      throw error;
    }
  }

  async retryDelivery(notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error(`Notification ${notificationId} not found`);
    }

    await this.scheduleDelivery(notification);
  }

  private determineChannels(
    notification: any,
  ): ('email' | 'inApp' | 'push' | 'sms')[] {
    const channels: ('email' | 'inApp' | 'push' | 'sms')[] = [];

    // Always include in-app
    channels.push('inApp');

    // Add other channels based on priority
    if (
      notification.priority === 'HIGH' ||
      notification.priority === 'URGENT'
    ) {
      channels.push('email');

      if (notification.priority === 'URGENT') {
        channels.push('push');
      }
    }

    return channels;
  }
}
