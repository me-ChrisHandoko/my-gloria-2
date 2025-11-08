import { Injectable } from '@nestjs/common';
import { InAppChannelService } from './channels/in-app-channel.service';
import { PushChannelService } from './channels/push-channel.service';
import { SmsChannelService } from './channels/sms-channel.service';
import { LoggingService } from '@/core/logging/logging.service';

export type NotificationChannel = 'email' | 'inApp' | 'push' | 'sms';

interface ChannelService {
  send(recipient: any, notification: any): Promise<boolean>;
}

@Injectable()
export class NotificationChannelsService {
  private channels: Map<NotificationChannel, ChannelService>;

  constructor(
    private readonly inAppChannel: InAppChannelService,
    private readonly pushChannel: PushChannelService,
    private readonly smsChannel: SmsChannelService,
    private readonly logger: LoggingService,
  ) {
    this.channels = new Map<NotificationChannel, ChannelService>([
      ['inApp', this.inAppChannel],
      ['push', this.pushChannel],
      ['sms', this.smsChannel],
    ]);
  }

  async sendToChannel(
    channel: NotificationChannel,
    recipient: any,
    notification: any,
  ): Promise<boolean> {
    try {
      const channelService = this.channels.get(channel);

      if (!channelService) {
        this.logger.warn(`Unknown notification channel: ${channel}`);
        return false;
      }

      const result = await channelService.send(recipient, notification);

      if (result) {
        this.logger.log(
          `Notification ${notification.id} sent via ${channel}`,
          'NotificationChannelsService',
        );
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to send notification via ${channel}`, error);
      return false;
    }
  }

  async sendToMultipleChannels(
    channels: NotificationChannel[],
    recipient: any,
    notification: any,
  ): Promise<Record<NotificationChannel, boolean>> {
    const results: Record<string, boolean> = {};

    await Promise.all(
      channels.map(async (channel) => {
        results[channel] = await this.sendToChannel(
          channel,
          recipient,
          notification,
        );
      }),
    );

    return results;
  }

  isChannelAvailable(channel: NotificationChannel): boolean {
    return this.channels.has(channel);
  }

  getAvailableChannels(): NotificationChannel[] {
    return Array.from(this.channels.keys());
  }
}
