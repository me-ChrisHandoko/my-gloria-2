import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import { CacheService } from '@/core/cache/cache.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationTrackingService } from './notification-tracking.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
    private readonly cache: CacheService,
    private readonly deliveryService: NotificationDeliveryService,
    private readonly trackingService: NotificationTrackingService,
  ) {}

  async getUserNotifications(
    userId: string,
    options: { page: number; limit: number; unreadOnly?: boolean },
  ) {
    const { page, limit, unreadOnly } = options;
    const skip = (page - 1) * limit;

    const where = {
      userProfileId: userId,
      ...(unreadOnly && { readAt: null }),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getNotificationById(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userProfileId: userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async createNotification(data: any) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          ...data,
          isRead: false,
        },
      });

      await this.deliveryService.scheduleDelivery(notification);
      await this.trackingService.trackCreation(notification);

      this.logger.log(
        `Notification ${notification.id} created`,
        'NotificationsService',
      );
      return notification;
    } catch (error) {
      this.logger.error('Failed to create notification', error);
      throw error;
    }
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.getNotificationById(userId, notificationId);

    if (!notification.readAt) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { readAt: new Date() },
      });

      await this.invalidateUserCache(userId);
      await this.trackingService.trackRead(notificationId);
    }
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        userProfileId: userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    await this.invalidateUserCache(userId);
  }

  async deleteNotification(userId: string, notificationId: string) {
    await this.getNotificationById(userId, notificationId);

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    await this.invalidateUserCache(userId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const cacheKey = `notifications:unread:${userId}`;
    const cached = await this.cache.get<number>(cacheKey);

    if (cached !== null) {
      return cached;
    }

    const count = await this.prisma.notification.count({
      where: {
        userProfileId: userId,
        readAt: null,
      },
    });

    await this.cache.set(cacheKey, count, 300); // Cache for 5 minutes
    return count;
  }

  private async invalidateUserCache(userId: string) {
    await this.cache.del(`notifications:unread:${userId}`);
  }
}
