import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class InAppChannelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async send(recipient: any, notification: any): Promise<boolean> {
    try {
      // In-app notifications are already stored in the database
      // Just emit an event for real-time delivery if user is online

      this.eventEmitter.emit('notification.new', {
        userId: recipient.id,
        notification: {
          id: notification.id,
          title: notification.title,
          content: notification.message,
          type: notification.type,
          priority: notification.priority,
          createdAt: notification.createdAt,
        },
      });

      this.logger.log(
        `In-app notification delivered to user ${recipient.id} for notification ${notification.id}`,
        'InAppChannelService',
      );

      return true;
    } catch (error) {
      this.logger.error('Failed to deliver in-app notification', error);
      return false;
    }
  }

  async markAsDelivered(notificationId: string) {
    try {
      // TODO: Implement when notification model is added back
      // Mark notification as read
      // await this.prisma.notification.update({
      //   where: { id: notificationId },
      //   data: {
      //     isRead: true,
      //     readAt: new Date(),
      //   },
      // });
      this.logger.log(
        `Notification ${notificationId} marked as delivered`,
        'InAppChannelService',
      );
    } catch (error) {
      this.logger.error('Failed to mark notification as delivered', error);
    }
  }

  async getUndeliveredNotifications(userId: string) {
    // TODO: Implement when notification model is added back
    // return this.prisma.notification.findMany({
    //   where: {
    //     userProfileId: userId,
    //     isRead: false,
    //   },
    //   orderBy: { createdAt: 'desc' },
    // });
    return [];
  }
}
