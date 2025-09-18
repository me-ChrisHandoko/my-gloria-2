import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  sandboxMode?: boolean;
  messageStream?: string;
  trackOpens?: boolean;
  trackLinks?: 'None' | 'HtmlAndText' | 'HtmlOnly' | 'TextOnly';
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject?: string;
  variables?: Record<string, any>;
}

@Injectable()
export class EmailConfigService {
  constructor(private readonly configService: ConfigService) {}

  getEmailConfig(): EmailConfig {
    return {
      apiKey: this.configService.get<string>('POSTMARK_API_KEY', ''),
      fromEmail: this.configService.get<string>(
        'POSTMARK_FROM_EMAIL',
        'noreply@gloria.com',
      ),
      fromName: this.configService.get<string>(
        'POSTMARK_FROM_NAME',
        'Gloria System',
      ),
      replyToEmail: this.configService.get<string>('POSTMARK_REPLY_TO_EMAIL'),
      sandboxMode: this.configService.get<string>('NODE_ENV') !== 'production',
      messageStream: this.configService.get<string>(
        'POSTMARK_MESSAGE_STREAM',
        'outbound',
      ),
      trackOpens: this.configService.get<boolean>('POSTMARK_TRACK_OPENS', true),
      trackLinks: this.configService.get<
        'None' | 'HtmlAndText' | 'HtmlOnly' | 'TextOnly'
      >('POSTMARK_TRACK_LINKS', 'HtmlAndText'),
    };
  }

  isEmailEnabled(): boolean {
    const apiKey = this.configService.get<string>('POSTMARK_API_KEY');
    const featureEnabled = this.configService.get<boolean>(
      'FEATURE_EMAIL_VERIFICATION',
      false,
    );
    return Boolean(apiKey) && featureEnabled;
  }

  getTemplates(): Record<string, EmailTemplate> {
    return {
      WELCOME: {
        id: 'welcome',
        name: 'Welcome Email',
        subject: 'Welcome to Gloria',
        variables: {
          name: '',
          loginUrl: '',
        },
      },
      PASSWORD_RESET: {
        id: 'password-reset',
        name: 'Password Reset',
        subject: 'Reset Your Password',
        variables: {
          name: '',
          resetUrl: '',
          expiresIn: '24 hours',
        },
      },
      EMAIL_VERIFICATION: {
        id: 'email-verification',
        name: 'Email Verification',
        subject: 'Verify Your Email Address',
        variables: {
          name: '',
          verificationUrl: '',
        },
      },
      NOTIFICATION: {
        id: 'notification',
        name: 'General Notification',
        subject: 'New Notification',
        variables: {
          name: '',
          message: '',
          actionUrl: '',
          actionText: '',
        },
      },
      WORKFLOW_APPROVAL: {
        id: 'workflow-approval',
        name: 'Workflow Approval Request',
        subject: 'Approval Required',
        variables: {
          name: '',
          workflowName: '',
          requesterName: '',
          description: '',
          approvalUrl: '',
        },
      },
      WORKFLOW_APPROVED: {
        id: 'workflow-approved',
        name: 'Workflow Approved',
        subject: 'Your Request Has Been Approved',
        variables: {
          name: '',
          workflowName: '',
          approverName: '',
          comments: '',
        },
      },
      WORKFLOW_REJECTED: {
        id: 'workflow-rejected',
        name: 'Workflow Rejected',
        subject: 'Your Request Has Been Rejected',
        variables: {
          name: '',
          workflowName: '',
          rejectorName: '',
          reason: '',
        },
      },
      DAILY_DIGEST: {
        id: 'daily-digest',
        name: 'Daily Activity Digest',
        subject: 'Your Daily Summary',
        variables: {
          name: '',
          date: '',
          activities: [],
          pendingTasks: [],
        },
      },
      SYSTEM_ALERT: {
        id: 'system-alert',
        name: 'System Alert',
        subject: 'System Alert',
        variables: {
          alertType: '',
          message: '',
          severity: '',
          timestamp: '',
        },
      },
    };
  }

  getRateLimits() {
    return {
      perSecond: this.configService.get<number>(
        'EMAIL_RATE_LIMIT_PER_SECOND',
        10,
      ),
      perMinute: this.configService.get<number>(
        'EMAIL_RATE_LIMIT_PER_MINUTE',
        100,
      ),
      perHour: this.configService.get<number>(
        'EMAIL_RATE_LIMIT_PER_HOUR',
        1000,
      ),
      perDay: this.configService.get<number>('EMAIL_RATE_LIMIT_PER_DAY', 10000),
    };
  }

  getRetryConfig() {
    return {
      maxRetries: this.configService.get<number>('EMAIL_MAX_RETRIES', 3),
      retryDelay: this.configService.get<number>('EMAIL_RETRY_DELAY', 1000),
      retryMultiplier: this.configService.get<number>(
        'EMAIL_RETRY_MULTIPLIER',
        2,
      ),
    };
  }
}
