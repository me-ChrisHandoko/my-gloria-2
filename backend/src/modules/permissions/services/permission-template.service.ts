import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { PermissionCacheService } from './permission-cache.service';
import { RolePermissionsService } from './permission-roles.service';
import { UserPermissionsService } from './permission-users.service';
import { v7 as uuidv7 } from 'uuid';
import { Prisma } from '@prisma/client';
import {
  CreatePermissionTemplateDto,
  UpdatePermissionTemplateDto,
  ApplyTemplateDto,
  RevokeTemplateApplicationDto,
  GetTemplatesFilterDto,
  TemplateTargetType,
} from '../dto/permission-template.dto';

@Injectable()
export class PermissionTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: PermissionCacheService,
    private readonly rolePermissionsService: RolePermissionsService,
    private readonly userPermissionsService: UserPermissionsService,
  ) {}

  /**
   * Create permission template
   */
  async createTemplate(dto: CreatePermissionTemplateDto, createdBy: string) {
    // Check for duplicate code
    const existing = await this.prisma.permissionTemplate.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Template with code ${dto.code} already exists`);
    }

    const template = await this.prisma.permissionTemplate.create({
      data: {
        id: uuidv7(),
        code: dto.code,
        name: dto.name,
        description: dto.description || null,
        category: dto.category || 'general',
        permissions: dto.permissions,
        moduleAccess: dto.moduleAccess,
        isSystem: dto.isSystem || false,
        version: 1,
        createdBy,
      },
    });

    // Record change history
    await this.prisma.permissionChangeHistory.create({
      data: {
        id: uuidv7(),
        entityType: 'TEMPLATE',
        entityId: template.id,
        operation: 'CREATE',
        previousState: Prisma.JsonNull,
        newState: {
          code: dto.code,
          name: dto.name,
          category: dto.category,
        },
        performedBy: createdBy,
      },
    });

    return {
      success: true,
      message: 'Permission template created successfully',
      data: template,
    };
  }

  /**
   * Get templates with filters and pagination
   */
  async getTemplates(
    filters: GetTemplatesFilterDto,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.isSystem !== undefined) {
      where.isSystem = filters.isSystem;
    }

    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [templates, total] = await Promise.all([
      this.prisma.permissionTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.permissionTemplate.count({ where }),
    ]);

    return {
      data: templates,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string) {
    const template = await this.prisma.permissionTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    // Get application count
    const applicationCount = await this.prisma.permissionTemplateApplication.count({
      where: { templateId, isActive: true },
    });

    return {
      ...template,
      applicationCount,
    };
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    dto: UpdatePermissionTemplateDto,
    updatedBy: string,
  ) {
    const existing = await this.prisma.permissionTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existing) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    if (existing.isSystem) {
      throw new BadRequestException('Cannot update system template');
    }

    const updated = await this.prisma.permissionTemplate.update({
      where: { id: templateId },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        permissions: dto.permissions,
        moduleAccess: dto.moduleAccess,
        isActive: dto.isActive,
      },
    });

    // Record change history
    await this.prisma.permissionChangeHistory.create({
      data: {
        id: uuidv7(),
        entityType: 'TEMPLATE',
        entityId: templateId,
        operation: 'UPDATE',
        previousState: existing as Prisma.InputJsonValue,
        newState: dto as Prisma.InputJsonValue,
        performedBy: updatedBy,
        metadata: { changes: dto } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      success: true,
      message: 'Template updated successfully',
      data: updated,
    };
  }

  /**
   * Delete template (soft delete if has applications)
   */
  async deleteTemplate(templateId: string, deletedBy: string) {
    const template = await this.prisma.permissionTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    if (template.isSystem) {
      throw new BadRequestException('Cannot delete system template');
    }

    // Check for active applications
    const activeApplications = await this.prisma.permissionTemplateApplication.count({
      where: { templateId, isActive: true },
    });

    if (activeApplications > 0) {
      // Soft delete
      await this.prisma.permissionTemplate.update({
        where: { id: templateId },
        data: { isActive: false },
      });

      return {
        success: true,
        message: `Template deactivated (${activeApplications} active applications exist)`,
        deactivated: true,
      };
    }

    // Hard delete if no applications
    await this.prisma.permissionTemplate.delete({
      where: { id: templateId },
    });

    return {
      success: true,
      message: 'Template deleted successfully',
      deleted: true,
    };
  }

  /**
   * Apply template to target (role, user, department, position)
   */
  async applyTemplate(
    templateId: string,
    dto: ApplyTemplateDto,
    appliedBy: string,
  ) {
    const template = await this.prisma.permissionTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || !template.isActive) {
      throw new NotFoundException(`Template ${templateId} not found or inactive`);
    }

    // Validate target exists
    await this.validateTarget(dto.targetType, dto.targetId);

    // Check for existing application
    const existing = await this.prisma.permissionTemplateApplication.findFirst({
      where: {
        templateId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        isActive: true,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Template already applied to this ${dto.targetType.toLowerCase()}`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Create template application record
      const application = await tx.permissionTemplateApplication.create({
        data: {
          id: uuidv7(),
          templateId,
          targetType: dto.targetType,
          targetId: dto.targetId,
          appliedBy,
          notes: dto.notes,
        },
      });

      // Apply permissions based on target type
      const appliedPermissions = await this.applyPermissionsToTarget(
        template,
        dto.targetType,
        dto.targetId,
        appliedBy,
        tx,
      );

      return { application, appliedPermissions };
    });

    // Invalidate relevant caches
    await this.invalidateCacheForTarget(dto.targetType, dto.targetId);

    return {
      success: true,
      message: `Template applied successfully to ${dto.targetType.toLowerCase()}`,
      data: result.application,
      appliedPermissions: result.appliedPermissions,
    };
  }

  /**
   * Preview template application without applying
   */
  async previewTemplate(
    templateId: string,
    targetType: TemplateTargetType,
    targetId: string,
  ) {
    const template = await this.prisma.permissionTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    await this.validateTarget(targetType, targetId);

    return {
      template: {
        id: template.id,
        code: template.code,
        name: template.name,
        description: template.description,
      },
      targetType,
      targetId,
      permissions: template.permissions,
      moduleAccess: template.moduleAccess,
      message: 'Preview only - not applied',
    };
  }

  /**
   * Get template applications
   */
  async getTemplateApplications(
    templateId: string,
    filters: any,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const where: any = { templateId };

    if (filters.targetType) {
      where.targetType = filters.targetType;
    }

    if (filters.isRevoked !== undefined) {
      where.isActive = !filters.isRevoked;
    }

    const [applications, total] = await Promise.all([
      this.prisma.permissionTemplateApplication.findMany({
        where,
        include: {
          template: true,
        },
        orderBy: { appliedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.permissionTemplateApplication.count({ where }),
    ]);

    return {
      data: applications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Revoke template application
   */
  async revokeTemplateApplication(
    applicationId: string,
    dto: RevokeTemplateApplicationDto,
    revokedBy: string,
  ) {
    const application = await this.prisma.permissionTemplateApplication.findUnique({
      where: { id: applicationId },
      include: { template: true },
    });

    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    if (!application.isActive) {
      throw new BadRequestException('Application already revoked');
    }

    await this.prisma.permissionTemplateApplication.update({
      where: { id: applicationId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedBy,
        notes: dto.revokedReason,
      },
    });

    // Invalidate cache
    await this.invalidateCacheForTarget(
      application.targetType as TemplateTargetType,
      application.targetId,
    );

    return {
      success: true,
      message: 'Template application revoked successfully',
    };
  }

  /**
   * Get template categories
   */
  async getTemplateCategories() {
    const categories = await this.prisma.permissionTemplate.groupBy({
      by: ['category'],
      where: {
        isActive: true,
      },
      _count: true,
    });

    return {
      categories: categories.map((c) => ({
        name: c.category,
        count: c._count,
      })),
      total: categories.length,
    };
  }

  /**
   * Create new template version
   */
  async createTemplateVersion(templateId: string, createdBy: string) {
    const existing = await this.prisma.permissionTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existing) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    const updated = await this.prisma.permissionTemplate.update({
      where: { id: templateId },
      data: {
        version: { increment: 1 },
      },
    });

    return {
      success: true,
      message: `Template version incremented to ${updated.version}`,
      data: updated,
    };
  }

  /**
   * Helper: Validate target exists
   */
  private async validateTarget(targetType: TemplateTargetType, targetId: string) {
    switch (targetType) {
      case TemplateTargetType.ROLE:
        const role = await this.prisma.role.findUnique({ where: { id: targetId } });
        if (!role) throw new NotFoundException(`Role ${targetId} not found`);
        break;
      case TemplateTargetType.USER:
        const user = await this.prisma.userProfile.findUnique({ where: { id: targetId } });
        if (!user) throw new NotFoundException(`User ${targetId} not found`);
        break;
      case TemplateTargetType.DEPARTMENT:
        const dept = await this.prisma.department.findUnique({ where: { id: targetId } });
        if (!dept) throw new NotFoundException(`Department ${targetId} not found`);
        break;
      case TemplateTargetType.POSITION:
        const pos = await this.prisma.position.findUnique({ where: { id: targetId } });
        if (!pos) throw new NotFoundException(`Position ${targetId} not found`);
        break;
    }
  }

  /**
   * Helper: Apply permissions to target based on type
   */
  private async applyPermissionsToTarget(
    template: any,
    targetType: TemplateTargetType,
    targetId: string,
    appliedBy: string,
    tx: any,
  ) {
    const permissions = template.permissions;
    const applied: string[] = [];

    if (permissions.permissions && Array.isArray(permissions.permissions)) {
      for (const permId of permissions.permissions) {
        if (targetType === TemplateTargetType.ROLE) {
          // Apply to role
          await this.rolePermissionsService.assignPermissionToRole(
            targetId,
            {
              permissionId: permId,
              isGranted: true,
              grantReason: `Applied from template: ${template.code}`,
            },
            appliedBy,
          );
        } else if (targetType === TemplateTargetType.USER) {
          // Apply to user
          await this.userPermissionsService.assignPermissionToUser(
            targetId,
            {
              permissionId: permId,
              isGranted: true,
              grantReason: `Applied from template: ${template.code}`,
            },
            appliedBy,
          );
        }
        applied.push(permId);
      }
    }

    return applied;
  }

  /**
   * Helper: Invalidate cache for target
   */
  private async invalidateCacheForTarget(
    targetType: TemplateTargetType,
    targetId: string,
  ) {
    if (targetType === TemplateTargetType.USER) {
      await this.cacheService.invalidateUserCache(targetId);
    } else if (targetType === TemplateTargetType.ROLE) {
      // Invalidate all users with this role
      const userRoles = await this.prisma.userRole.findMany({
        where: { roleId: targetId, isActive: true },
        select: { userProfileId: true },
      });

      for (const ur of userRoles) {
        await this.cacheService.invalidateUserCache(ur.userProfileId);
      }
    }
  }
}
