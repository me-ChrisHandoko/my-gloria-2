import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { LoggingService } from '@/core/logging/logging.service';

@Injectable()
export class NotificationQueueService {
  constructor(
    @InjectQueue('notifications') private notificationQueue: Queue,
    private readonly logger: LoggingService,
  ) {}

  async addToQueue(notification: any, options?: any) {
    try {
      const job = await this.notificationQueue.add(
        'send-notification',
        notification,
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
          ...options,
        },
      );

      this.logger.log(
        `Notification ${notification.id} added to queue with job ID ${job.id}`,
        'NotificationQueueService',
      );

      return job;
    } catch (error) {
      this.logger.error('Failed to add notification to queue', error);
      throw error;
    }
  }

  async addBulkToQueue(notifications: any[]) {
    const jobs = notifications.map((notification) => ({
      name: 'send-notification',
      data: notification,
      opts: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }));

    try {
      const results = await this.notificationQueue.addBulk(jobs);
      this.logger.log(`Added ${results.length} notifications to queue`);
      return results;
    } catch (error) {
      this.logger.error('Failed to add bulk notifications to queue', error);
      throw error;
    }
  }

  async scheduleNotification(notification: any, delay: number) {
    try {
      const job = await this.notificationQueue.add(
        'send-notification',
        notification,
        {
          delay,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );

      this.logger.log(
        `Notification ${notification.id} scheduled with delay ${delay}ms (job ID: ${job.id})`,
        'NotificationQueueService',
      );

      return job;
    } catch (error) {
      this.logger.error('Failed to schedule notification', error);
      throw error;
    }
  }

  async getQueueStatus() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.notificationQueue.getWaitingCount(),
      this.notificationQueue.getActiveCount(),
      this.notificationQueue.getCompletedCount(),
      this.notificationQueue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed,
    };
  }

  async retryFailedJob(jobId: string) {
    const job = await this.notificationQueue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    await job.retry();
    this.logger.log(`Job ${jobId} retried`, 'NotificationQueueService');
  }

  async removeJob(jobId: string) {
    const job = await this.notificationQueue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    await job.remove();
    this.logger.log(`Job ${jobId} removed`, 'NotificationQueueService');
  }
}
