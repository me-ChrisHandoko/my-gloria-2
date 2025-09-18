import { Injectable, Logger } from '@nestjs/common';
import * as postmark from 'postmark';
import { EmailConfigService, EmailTemplate } from './email.config';
import { LoggingService } from '../logging/logging.service';

export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: EmailAttachment[];
  tag?: string;
  metadata?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface EmailAttachment {
  name: string;
  content: string; // Base64 encoded content
  contentType: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  submittedAt?: Date;
}

export interface BulkEmailResult {
  successCount: number;
  failureCount: number;
  results: EmailResult[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private client: postmark.ServerClient | null = null;
  private isInitialized = false;
  private templates: Record<string, EmailTemplate>;

  constructor(
    private readonly emailConfig: EmailConfigService,
    private readonly loggingService: LoggingService,
  ) {
    this.templates = this.emailConfig.getTemplates();
    this.initialize();
  }

  private initialize() {
    try {
      const config = this.emailConfig.getEmailConfig();

      if (!config.apiKey) {
        this.logger.warn(
          'Postmark API key not configured. Email service disabled.',
        );
        return;
      }

      this.client = new postmark.ServerClient(config.apiKey);
      this.isInitialized = true;
      this.logger.log('Email service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize email service:', error);
    }
  }

  async sendEmail(
    subject: string,
    htmlBody: string,
    textBody: string,
    options: EmailOptions,
  ): Promise<EmailResult> {
    if (!this.isInitialized || !this.client) {
      this.logger.warn('Email service not initialized. Skipping email send.');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    try {
      const config = this.emailConfig.getEmailConfig();
      const to = Array.isArray(options.to) ? options.to.join(',') : options.to;
      const cc = options.cc
        ? Array.isArray(options.cc)
          ? options.cc.join(',')
          : options.cc
        : undefined;
      const bcc = options.bcc
        ? Array.isArray(options.bcc)
          ? options.bcc.join(',')
          : options.bcc
        : undefined;

      const emailData: postmark.Message = {
        From: `${config.fromName} <${config.fromEmail}>`,
        To: to,
        Cc: cc,
        Bcc: bcc,
        Subject: subject,
        HtmlBody: htmlBody,
        TextBody: textBody,
        ReplyTo: options.replyTo || config.replyToEmail,
        Tag: options.tag,
        TrackOpens: config.trackOpens,
        TrackLinks: config.trackLinks as any,
        Headers: Array.isArray(options.headers)
          ? options.headers
          : options.headers
            ? Object.entries(options.headers).map(([Name, Value]) => ({
                Name,
                Value,
              }))
            : [],
        Metadata: options.metadata || {},
        MessageStream: config.messageStream,
      };

      // Add attachments if provided
      if (options.attachments && options.attachments.length > 0) {
        emailData.Attachments = options.attachments.map((att) => ({
          Name: att.name,
          Content: att.content,
          ContentType: att.contentType,
          ContentID: null,
        }));
      }

      // Send in sandbox mode if configured
      if (config.sandboxMode) {
        this.logger.debug('Sandbox mode enabled. Email would be sent:', {
          to,
          subject,
          tag: options.tag,
        });

        return {
          success: true,
          messageId: 'sandbox-' + Date.now(),
          submittedAt: new Date(),
        };
      }

      const result = await this.client.sendEmail(emailData);

      this.loggingService.logAudit(
        'EMAIL_SENT',
        'Email',
        result.MessageID,
        to,
        {
          subject,
          tag: options.tag,
        },
      );

      return {
        success: true,
        messageId: result.MessageID,
        submittedAt: new Date(result.SubmittedAt),
      };
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      this.loggingService.logError(error as Error, {
        context: 'EmailService',
        operation: 'sendEmail',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendTemplateEmail(
    templateId: string,
    variables: Record<string, any>,
    options: EmailOptions,
  ): Promise<EmailResult> {
    const template = this.templates[templateId];

    if (!template) {
      return {
        success: false,
        error: `Template ${templateId} not found`,
      };
    }

    // Generate HTML and text bodies from template
    const { htmlBody, textBody } = this.renderTemplate(template, variables);
    const subject = this.interpolateVariables(
      template.subject || '',
      variables,
    );

    return this.sendEmail(subject, htmlBody, textBody, options);
  }

  async sendBulkEmails(
    emails: Array<{
      subject: string;
      htmlBody: string;
      textBody: string;
      options: EmailOptions;
    }>,
  ): Promise<BulkEmailResult> {
    if (!this.isInitialized || !this.client) {
      return {
        successCount: 0,
        failureCount: emails.length,
        results: emails.map(() => ({
          success: false,
          error: 'Email service not configured',
        })),
      };
    }

    const results: EmailResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Process in batches to respect rate limits
    const batchSize = 10;
    const rateLimits = this.emailConfig.getRateLimits();
    const delayBetweenBatches = 1000 / rateLimits.perSecond;

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map((email) =>
          this.sendEmail(
            email.subject,
            email.htmlBody,
            email.textBody,
            email.options,
          ),
        ),
      );

      results.push(...batchResults);

      batchResults.forEach((result) => {
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      });

      // Rate limiting delay
      if (i + batchSize < emails.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, delayBetweenBatches),
        );
      }
    }

    return {
      successCount,
      failureCount,
      results,
    };
  }

  async sendNotificationEmail(
    to: string | string[],
    title: string,
    message: string,
    actionUrl?: string,
    actionText?: string,
  ): Promise<EmailResult> {
    return this.sendTemplateEmail(
      'NOTIFICATION',
      {
        name: 'User',
        message,
        actionUrl,
        actionText: actionText || 'View Details',
      },
      { to },
    );
  }

  async sendWorkflowApprovalEmail(
    to: string | string[],
    workflowName: string,
    requesterName: string,
    description: string,
    approvalUrl: string,
  ): Promise<EmailResult> {
    return this.sendTemplateEmail(
      'WORKFLOW_APPROVAL',
      {
        name: 'Approver',
        workflowName,
        requesterName,
        description,
        approvalUrl,
      },
      { to, tag: 'workflow-approval' },
    );
  }

  async sendWelcomeEmail(
    to: string,
    name: string,
    loginUrl: string,
  ): Promise<EmailResult> {
    return this.sendTemplateEmail(
      'WELCOME',
      {
        name,
        loginUrl,
      },
      { to, tag: 'welcome' },
    );
  }

  async verifyEmailAddress(email: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      // Note: This is a placeholder. Postmark doesn't provide email verification
      // You might want to use a service like ZeroBounce or NeverBounce for this
      this.logger.debug(`Email verification for ${email} - not implemented`);
      return true;
    } catch (error) {
      this.logger.error('Email verification failed:', error);
      return false;
    }
  }

  async getEmailStats(): Promise<any> {
    if (!this.client) {
      return null;
    }

    try {
      const stats = await this.client.getOutboundOverview();
      return stats;
    } catch (error) {
      this.logger.error('Failed to get email stats:', error);
      return null;
    }
  }

  async getBounces(count = 100, offset = 0): Promise<any> {
    if (!this.client) {
      return [];
    }

    try {
      const bounces = await this.client.getBounces({
        count,
        offset,
      });
      return bounces.Bounces;
    } catch (error) {
      this.logger.error('Failed to get bounces:', error);
      return [];
    }
  }

  private renderTemplate(
    template: EmailTemplate,
    variables: Record<string, any>,
  ): { htmlBody: string; textBody: string } {
    // This is a simple template renderer. In production, you might want to use
    // a proper template engine like Handlebars or Pug

    const htmlBody = this.generateHtmlTemplate(template, variables);
    const textBody = this.generateTextTemplate(template, variables);

    return { htmlBody, textBody };
  }

  private generateHtmlTemplate(
    template: EmailTemplate,
    variables: Record<string, any>,
  ): string {
    // Basic HTML template
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${template.subject || template.name}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4A90E2; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f5f5f5; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        .button { display: inline-block; padding: 10px 20px; background: #4A90E2; color: white; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Gloria System</h1>
        </div>
        <div class="content">
            ${this.renderTemplateContent(template.id, variables)}
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} Gloria System. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private generateTextTemplate(
    template: EmailTemplate,
    variables: Record<string, any>,
  ): string {
    return `
Gloria System
============

${this.renderTemplateContent(template.id, variables, true)}

---
© ${new Date().getFullYear()} Gloria System. All rights reserved.
This is an automated message. Please do not reply to this email.
    `;
  }

  private renderTemplateContent(
    templateId: string,
    variables: Record<string, any>,
    isText = false,
  ): string {
    // Template-specific content rendering
    switch (templateId) {
      case 'welcome':
        return isText
          ? `Welcome ${variables.name}!\n\nYour account has been created successfully.\n\nLogin here: ${variables.loginUrl}`
          : `<h2>Welcome ${variables.name}!</h2><p>Your account has been created successfully.</p><p><a href="${variables.loginUrl}" class="button">Login to Your Account</a></p>`;

      case 'notification':
        return isText
          ? `Hello ${variables.name},\n\n${variables.message}\n\n${variables.actionUrl ? `View details: ${variables.actionUrl}` : ''}`
          : `<h2>Hello ${variables.name},</h2><p>${variables.message}</p>${variables.actionUrl ? `<p><a href="${variables.actionUrl}" class="button">${variables.actionText || 'View Details'}</a></p>` : ''}`;

      case 'workflow-approval':
        return isText
          ? `Hello ${variables.name},\n\n${variables.requesterName} has submitted a ${variables.workflowName} request that requires your approval.\n\nDescription: ${variables.description}\n\nApprove or reject: ${variables.approvalUrl}`
          : `<h2>Approval Required</h2><p>Hello ${variables.name},</p><p>${variables.requesterName} has submitted a <strong>${variables.workflowName}</strong> request that requires your approval.</p><p><strong>Description:</strong> ${variables.description}</p><p><a href="${variables.approvalUrl}" class="button">Review Request</a></p>`;

      default:
        return isText
          ? JSON.stringify(variables, null, 2)
          : `<pre>${JSON.stringify(variables, null, 2)}</pre>`;
    }
  }

  private interpolateVariables(
    text: string,
    variables: Record<string, any>,
  ): string {
    let result = text;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    });

    return result;
  }

  isConfigured(): boolean {
    return this.isInitialized;
  }
}
