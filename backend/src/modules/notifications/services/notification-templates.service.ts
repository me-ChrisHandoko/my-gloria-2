import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { CacheService } from '@/core/cache/cache.service';
import { LoggingService } from '@/core/logging/logging.service';
import { NotificationType, NotificationChannel } from '@prisma/client';
import * as Handlebars from 'handlebars';

interface TemplateCreateDto {
  code: string;
  name: string;
  description?: string;
  type: NotificationType;
  channels: NotificationChannel[];
  subject?: string;
  body: string;
  htmlBody?: string;
  metadata?: any;
  variables?: string[];
  isActive?: boolean;
}

interface TemplateUpdateDto extends Partial<TemplateCreateDto> {}

interface TemplateRenderContext {
  user?: {
    name: string;
    email: string;
    position?: string;
    department?: string;
  };
  organization?: {
    name: string;
    logo?: string;
  };
  data?: Record<string, any>;
  actionUrl?: string;
  unsubscribeUrl?: string;
}

@Injectable()
export class NotificationTemplatesService {
  private compiledTemplates = new Map<string, HandlebarsTemplateDelegate>();
  private defaultTemplates = new Map<string, any>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly logger: LoggingService,
  ) {
    this.logger.setContext(NotificationTemplatesService.name);
    this.registerHandlebarsHelpers();
    this.initializeDefaultTemplates();
  }

  /**
   * Register Handlebars helpers for template rendering
   */
  private registerHandlebarsHelpers() {
    // Date formatting helper
    Handlebars.registerHelper(
      'formatDate',
      (date: Date | string, format: string) => {
        const d = new Date(date);
        if (format === 'short') {
          return d.toLocaleDateString('id-ID');
        }
        return d.toLocaleString('id-ID');
      },
    );

    // Conditional helper
    Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });

    // URL encoder
    Handlebars.registerHelper('encodeUrl', (str: string) => {
      return encodeURIComponent(str);
    });
  }

  /**
   * Initialize default notification templates
   */
  private async initializeDefaultTemplates() {
    const defaultTemplates = [
      {
        code: 'APPROVAL_REQUEST',
        name: 'Approval Request',
        type: NotificationType.APPROVAL_REQUEST,
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        subject: 'Approval Required: {{data.title}}',
        body: 'Hi {{user.name}},\n\nYou have a new approval request:\n\n{{data.description}}\n\nPlease review and take action.',
        htmlBody: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Approval Required</h2>
            <p>Hi {{user.name}},</p>
            <p>You have a new approval request:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>{{data.title}}</h3>
              <p>{{data.description}}</p>
            </div>
            <p>
              <a href="{{actionUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Review Request
              </a>
            </p>
            <p style="color: #666; font-size: 12px;">
              <a href="{{unsubscribeUrl}}">Unsubscribe from these notifications</a>
            </p>
          </div>
        `,
        variables: [
          'user.name',
          'data.title',
          'data.description',
          'actionUrl',
          'unsubscribeUrl',
        ],
      },
      {
        code: 'SYSTEM_ALERT',
        name: 'System Alert',
        type: NotificationType.SYSTEM_ALERT,
        channels: [
          NotificationChannel.EMAIL,
          NotificationChannel.IN_APP,
          NotificationChannel.PUSH,
        ],
        subject: 'System Alert: {{data.severity}} - {{data.title}}',
        body: '{{data.message}}',
        htmlBody: `
          <div style="font-family: Arial, sans-serif;">
            <div style="background: {{#ifEquals data.severity 'CRITICAL'}}#dc3545{{else}}#ffc107{{/ifEquals}}; color: white; padding: 10px; border-radius: 5px 5px 0 0;">
              <h2 style="margin: 0;">System Alert: {{data.severity}}</h2>
            </div>
            <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
              <h3>{{data.title}}</h3>
              <p>{{data.message}}</p>
              {{#if data.action}}
              <p>
                <strong>Action Required:</strong> {{data.action}}
              </p>
              {{/if}}
              <p style="color: #666; font-size: 12px;">
                Time: {{formatDate data.timestamp 'long'}}
              </p>
            </div>
          </div>
        `,
        variables: [
          'data.severity',
          'data.title',
          'data.message',
          'data.action',
          'data.timestamp',
        ],
      },
      {
        code: 'WORKFLOW_COMPLETED',
        name: 'Workflow Completed',
        type: NotificationType.APPROVAL_RESULT,
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        subject: 'Workflow Completed: {{data.workflowName}}',
        body: 'The workflow "{{data.workflowName}}" has been completed with status: {{data.status}}',
        htmlBody: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Workflow Completed</h2>
            <p>Hi {{user.name}},</p>
            <p>The workflow <strong>{{data.workflowName}}</strong> has been completed.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Status:</strong> 
                <span style="color: {{#ifEquals data.status 'APPROVED'}}#28a745{{else}}#dc3545{{/ifEquals}};">
                  {{data.status}}
                </span>
              </p>
              {{#if data.comments}}
              <p><strong>Comments:</strong> {{data.comments}}</p>
              {{/if}}
              <p><strong>Completed by:</strong> {{data.completedBy}}</p>
              <p><strong>Date:</strong> {{formatDate data.completedAt 'short'}}</p>
            </div>
            {{#if actionUrl}}
            <p>
              <a href="{{actionUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Details
              </a>
            </p>
            {{/if}}
          </div>
        `,
        variables: [
          'user.name',
          'data.workflowName',
          'data.status',
          'data.comments',
          'data.completedBy',
          'data.completedAt',
          'actionUrl',
        ],
      },
    ];

    // Store templates in cache for quick access
    for (const template of defaultTemplates) {
      const cacheKey = `notification:template:default:${template.code}`;
      await this.cache.set(cacheKey, template, 86400); // Cache for 24 hours

      // Compile template
      if (template.htmlBody) {
        this.compiledTemplates.set(
          `${template.code}_html`,
          Handlebars.compile(template.htmlBody),
        );
      }
      this.compiledTemplates.set(
        `${template.code}_text`,
        Handlebars.compile(template.body),
      );
      if (template.subject) {
        this.compiledTemplates.set(
          `${template.code}_subject`,
          Handlebars.compile(template.subject),
        );
      }
    }
  }

  /**
   * Get all templates with optional filtering
   */
  async getTemplates(options?: {
    page?: number;
    limit?: number;
    type?: NotificationType;
  }): Promise<any> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;

    // Initialize default templates if not already done
    if (this.defaultTemplates.size === 0) {
      await this.initializeDefaultTemplates();
    }

    const templates = Array.from(this.defaultTemplates.values())
      .filter((template) => {
        if (options?.type) {
          return template.type === options.type;
        }
        return true;
      })
      .slice((page - 1) * limit, page * limit);

    return {
      data: templates,
      meta: {
        page,
        limit,
        total: this.defaultTemplates.size,
      },
    };
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<any> {
    // First check default templates
    const defaultTemplate = this.defaultTemplates.get(id);
    if (defaultTemplate) {
      return defaultTemplate;
    }

    // In production, fetch from database
    // For now, throw not found
    throw new NotFoundException(`Template with id ${id} not found`);
  }

  /**
   * Get template by code and type
   */
  async getTemplate(code: string, type?: NotificationType): Promise<any> {
    const cacheKey = `notification:template:${code}:${type || 'any'}`;

    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Check default templates
    const defaultKey = `notification:template:default:${code}`;
    const defaultTemplate = await this.cache.get(defaultKey);
    if (defaultTemplate) {
      return defaultTemplate;
    }

    // In production, fetch from database
    // For now, throw not found
    throw new NotFoundException(`Template with code ${code} not found`);
  }

  /**
   * Render notification template with context
   */
  async renderTemplate(
    templateCode: string,
    context: TemplateRenderContext,
    channel: NotificationChannel,
  ): Promise<{
    subject?: string;
    body: string;
    htmlBody?: string;
  }> {
    try {
      const template = await this.getTemplate(templateCode);

      // Get compiled templates or compile on the fly
      let subjectTemplate = this.compiledTemplates.get(
        `${templateCode}_subject`,
      );
      let bodyTemplate = this.compiledTemplates.get(`${templateCode}_text`);
      let htmlTemplate = this.compiledTemplates.get(`${templateCode}_html`);

      if (!bodyTemplate) {
        bodyTemplate = Handlebars.compile(template.body);
        this.compiledTemplates.set(`${templateCode}_text`, bodyTemplate);
      }

      if (template.subject && !subjectTemplate) {
        subjectTemplate = Handlebars.compile(template.subject);
        this.compiledTemplates.set(`${templateCode}_subject`, subjectTemplate);
      }

      if (template.htmlBody && !htmlTemplate) {
        htmlTemplate = Handlebars.compile(template.htmlBody);
        this.compiledTemplates.set(`${templateCode}_html`, htmlTemplate);
      }

      // Render templates
      const result: any = {
        body: bodyTemplate(context),
      };

      if (subjectTemplate) {
        result.subject = subjectTemplate(context);
      }

      // Use HTML body for email channel
      if (channel === NotificationChannel.EMAIL && htmlTemplate) {
        result.htmlBody = htmlTemplate(context);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to render template ${templateCode}: ${error.message}`,
      );

      // Fallback to basic rendering
      return {
        subject: `Notification: ${templateCode}`,
        body: JSON.stringify(context.data || {}),
      };
    }
  }

  /**
   * Create custom template
   */
  async createTemplate(data: TemplateCreateDto): Promise<any> {
    // Validate template syntax
    try {
      Handlebars.compile(data.body);
      if (data.htmlBody) {
        Handlebars.compile(data.htmlBody);
      }
      if (data.subject) {
        Handlebars.compile(data.subject);
      }
    } catch (error) {
      throw new BadRequestException(
        `Invalid template syntax: ${error.message}`,
      );
    }

    // In production, save to database
    // For now, store in cache
    const template = {
      id: `template_${Date.now()}`,
      ...data,
      isActive: data.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const cacheKey = `notification:template:${template.code}`;
    await this.cache.set(cacheKey, template, 86400); // Cache for 24 hours

    // Compile and cache template
    this.compiledTemplates.set(
      `${template.code}_text`,
      Handlebars.compile(template.body),
    );

    if (template.htmlBody) {
      this.compiledTemplates.set(
        `${template.code}_html`,
        Handlebars.compile(template.htmlBody),
      );
    }

    if (template.subject) {
      this.compiledTemplates.set(
        `${template.code}_subject`,
        Handlebars.compile(template.subject),
      );
    }

    this.logger.log(`Created template: ${template.code}`);
    return template;
  }

  /**
   * Update existing template
   */
  async updateTemplate(code: string, data: TemplateUpdateDto): Promise<any> {
    const existing = await this.getTemplate(code);

    // Validate new template syntax if provided
    if (data.body) {
      try {
        Handlebars.compile(data.body);
      } catch (error) {
        throw new BadRequestException(
          `Invalid body template syntax: ${error.message}`,
        );
      }
    }

    if (data.htmlBody) {
      try {
        Handlebars.compile(data.htmlBody);
      } catch (error) {
        throw new BadRequestException(
          `Invalid HTML template syntax: ${error.message}`,
        );
      }
    }

    if (data.subject) {
      try {
        Handlebars.compile(data.subject);
      } catch (error) {
        throw new BadRequestException(
          `Invalid subject template syntax: ${error.message}`,
        );
      }
    }

    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };

    // Update cache
    const cacheKey = `notification:template:${code}`;
    await this.cache.set(cacheKey, updated, 86400);

    // Update compiled templates
    if (data.body) {
      this.compiledTemplates.set(`${code}_text`, Handlebars.compile(data.body));
    }

    if (data.htmlBody) {
      this.compiledTemplates.set(
        `${code}_html`,
        Handlebars.compile(data.htmlBody),
      );
    }

    if (data.subject) {
      this.compiledTemplates.set(
        `${code}_subject`,
        Handlebars.compile(data.subject),
      );
    }

    this.logger.log(`Updated template: ${code}`);
    return updated;
  }

  /**
   * Delete template
   */
  async deleteTemplate(code: string): Promise<void> {
    const cacheKey = `notification:template:${code}`;
    await this.cache.del(cacheKey);

    // Remove compiled templates
    this.compiledTemplates.delete(`${code}_text`);
    this.compiledTemplates.delete(`${code}_html`);
    this.compiledTemplates.delete(`${code}_subject`);

    this.logger.log(`Deleted template: ${code}`);
  }

  /**
   * List all templates
   */
  async listTemplates(
    options: {
      page?: number;
      limit?: number;
      type?: NotificationType;
      channel?: NotificationChannel;
      isActive?: boolean;
    } = {},
  ): Promise<any> {
    const { page = 1, limit = 10 } = options;

    // In production, query from database
    // For now, return default templates
    const templates: any[] = [];

    for (const code of [
      'APPROVAL_REQUEST',
      'SYSTEM_ALERT',
      'WORKFLOW_COMPLETED',
    ]) {
      const template = (await this.cache.get(
        `notification:template:default:${code}`,
      )) as any;
      if (template) {
        // Apply filters
        if (options.type && template.type !== options.type) continue;
        if (options.channel && !template.channels.includes(options.channel))
          continue;
        if (
          options.isActive !== undefined &&
          template.isActive !== options.isActive
        )
          continue;

        templates.push(template);
      }
    }

    return {
      data: templates.slice((page - 1) * limit, page * limit),
      meta: {
        page,
        limit,
        total: templates.length,
        totalPages: Math.ceil(templates.length / limit),
      },
    };
  }

  /**
   * Validate template variables
   */
  validateTemplateVariables(
    template: string,
    context: Record<string, any>,
  ): { valid: boolean; missing: string[] } {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const matches = template.matchAll(variableRegex);
    const missing: string[] = [];

    for (const match of matches) {
      const variable = match[1].trim();
      const path = variable.split('.');
      let value = context;

      for (const key of path) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          missing.push(variable);
          break;
        }
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}
