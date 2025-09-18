import { Injectable } from '@nestjs/common';
import { EmailService } from '@/core/email/email.service';
import { LoggingService } from '@/core/logging/logging.service';
import { NotificationTemplatesService } from '../notification-templates.service';
import { NotificationChannel } from '@prisma/client';

@Injectable()
export class EmailChannelService {
  constructor(
    private readonly emailService: EmailService,
    private readonly logger: LoggingService,
    private readonly templatesService: NotificationTemplatesService,
  ) {}

  async send(recipient: any, notification: any): Promise<boolean> {
    try {
      if (!recipient.email) {
        this.logger.warn(
          `Recipient ${recipient.id} has no email address`,
          'EmailChannelService',
        );
        return false;
      }

      let emailContent;

      if (notification.templateId) {
        const template = await this.templatesService.getTemplateById(
          notification.templateId,
        );
        emailContent = await this.templatesService.renderTemplate(
          template.code || notification.templateId,
          notification.variables || {},
          NotificationChannel.EMAIL,
        );
      } else {
        emailContent = {
          subject: notification.title || 'New Notification',
          body: notification.content || '',
        };
      }

      await this.emailService.sendEmail(
        emailContent.subject,
        this.formatHtmlEmail(emailContent.body, notification),
        this.stripHtml(emailContent.body),
        {
          to: recipient.email,
        },
      );

      this.logger.log(
        `Email notification sent to ${recipient.email} for notification ${notification.id}`,
        'EmailChannelService',
      );

      return true;
    } catch (error) {
      this.logger.error('Failed to send email notification', error);
      return false;
    }
  }

  private formatHtmlEmail(content: string, notification: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${notification.title || 'Notification'}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .footer { text-align: center; padding: 10px; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${notification.title || 'Notification'}</h2>
            </div>
            <div class="content">
              ${content}
              ${
                notification.actionUrl
                  ? `
                <p style="margin-top: 30px;">
                  <a href="${notification.actionUrl}" class="button">
                    ${notification.actionText || 'View Details'}
                  </a>
                </p>
              `
                  : ''
              }
            </div>
            <div class="footer">
              <p>This is an automated notification from Gloria System.</p>
              <p>© ${new Date().getFullYear()} Gloria. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }
}
