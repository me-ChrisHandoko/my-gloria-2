import { Injectable } from '@nestjs/common';
import { LoggingService } from '@/core/logging/logging.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsChannelService {
  constructor(
    private readonly logger: LoggingService,
    private readonly configService: ConfigService,
  ) {}

  async send(recipient: any, notification: any): Promise<boolean> {
    try {
      if (!recipient.phone) {
        this.logger.warn(
          `Recipient ${recipient.id} has no phone number`,
          'SmsChannelService',
        );
        return false;
      }

      // TODO: Integrate with actual SMS service
      // (e.g., Twilio, AWS SNS, MessageBird)

      const message = this.formatSmsMessage(notification);

      // For now, just log the attempt
      this.logger.log(
        `SMS notification would be sent to ${this.maskPhoneNumber(recipient.phone)} for notification ${notification.id} (${message.length} chars)`,
        'SmsChannelService',
      );

      // Simulate successful delivery
      return true;
    } catch (error) {
      this.logger.error('Failed to send SMS notification', error);
      return false;
    }
  }

  private formatSmsMessage(notification: any): string {
    let message = notification.title || '';

    if (notification.content) {
      message += `\n${notification.content}`;
    }

    // SMS messages have character limits (160 for standard, 70 for unicode)
    // Truncate if necessary
    const maxLength = 160;
    if (message.length > maxLength) {
      message = message.substring(0, maxLength - 3) + '...';
    }

    return message;
  }

  private maskPhoneNumber(phone: string): string {
    // Mask phone number for logging (show only last 4 digits)
    if (phone.length <= 4) {
      return '****';
    }
    return '*'.repeat(phone.length - 4) + phone.slice(-4);
  }

  async validatePhoneNumber(phone: string): Promise<boolean> {
    // Basic phone number validation
    // In production, use a proper validation library or service
    const phoneRegex =
      /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone);
  }
}
