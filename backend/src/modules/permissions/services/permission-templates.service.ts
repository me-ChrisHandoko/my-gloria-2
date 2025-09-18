import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import {
  PermissionTemplate,
  PermissionTemplateApplication,
} from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class PermissionTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Create a permission template
   */
  async createTemplate(
    code: string,
    name: string,
    category: string,
    permissions: any,
    moduleAccess: any,
    description?: string,
    createdBy?: string,
  ): Promise<PermissionTemplate> {
    try {
      const existing = await this.prisma.permissionTemplate.findUnique({
        where: { code },
      });

      if (existing) {
        throw new ConflictException(
          `Template with code ${code} already exists`,
        );
      }

      const template = await this.prisma.permissionTemplate.create({
        data: {
          id: uuidv7(),
          code,
          name,
          description,
          category,
          permissions,
          moduleAccess,
          createdBy,
        },
      });

      this.logger.log(
        `Permission template created: ${template.code}`,
        'PermissionTemplatesService',
      );
      return template;
    } catch (error) {
      this.logger.error(
        'Error creating permission template',
        error.stack,
        'PermissionTemplatesService',
      );
      throw error;
    }
  }

  /**
   * Apply template to target
   */
  async applyTemplate(
    templateId: string,
    targetType: string,
    targetId: string,
    appliedBy: string,
  ): Promise<PermissionTemplateApplication> {
    try {
      const template = await this.prisma.permissionTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw new NotFoundException(`Template with ID ${templateId} not found`);
      }

      const application =
        await this.prisma.permissionTemplateApplication.upsert({
          where: {
            templateId_targetType_targetId: {
              templateId,
              targetType,
              targetId,
            },
          },
          create: {
            id: uuidv7(),
            templateId,
            targetType,
            targetId,
            appliedBy,
          },
          update: {
            isActive: true,
            appliedBy,
            appliedAt: new Date(),
            revokedBy: null,
            revokedAt: null,
          },
          include: {
            template: true,
          },
        });

      this.logger.log(
        `Template ${template.code} applied to ${targetType}:${targetId}`,
        'PermissionTemplatesService',
      );
      return application;
    } catch (error) {
      this.logger.error(
        'Error applying permission template',
        error.stack,
        'PermissionTemplatesService',
      );
      throw error;
    }
  }

  /**
   * Get all templates
   */
  async findAllTemplates(category?: string): Promise<PermissionTemplate[]> {
    return this.prisma.permissionTemplate.findMany({
      where: {
        ...(category && { category }),
        isActive: true,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }
}
