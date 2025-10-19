import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { AuditService } from '@/core/audit/audit.service';
import { LoggingService } from '@/core/logging/logging.service';
import {
  Permission,
  PermissionGroup,
  Prisma,
  PermissionAction,
  PermissionScope,
  AuditAction,
} from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  CreatePermissionGroupDto,
  UpdatePermissionGroupDto,
} from '../dto/permission.dto';
import { IPermissionFilter } from '../interfaces/permission.interface';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Create a new permission
   */
  async createPermission(
    dto: CreatePermissionDto,
    createdBy: string,
  ): Promise<Permission> {
    try {
      // Check for duplicate permission
      const existing = await this.prisma.permission.findFirst({
        where: {
          OR: [
            { code: dto.code },
            {
              resource: dto.resource,
              action: dto.action,
              scope: dto.scope || null,
            },
          ],
        },
      });

      if (existing) {
        throw new ConflictException(
          `Permission with code ${dto.code} or resource/action/scope combination already exists`,
        );
      }

      const permission = await this.prisma.permission.create({
        data: {
          id: uuidv7(),
          code: dto.code,
          name: dto.name,
          description: dto.description,
          resource: dto.resource,
          action: dto.action,
          scope: dto.scope,
          groupId: dto.groupId,
          conditions: dto.conditions,
          metadata: dto.metadata,
          isSystemPermission: dto.isSystemPermission || false,
          createdBy,
        },
        include: {
          group: true,
        },
      });

      await this.auditService.log({
        action: AuditAction.CREATE,
        module: 'permissions',
        entityType: 'Permission',
        entityId: permission.id,
        metadata: {
          code: permission.code,
          resource: permission.resource,
          action: permission.action,
        },
        context: {
          actorId: createdBy,
        },
      });

      this.logger.log(
        `Permission created: ${permission.code}`,
        'PermissionsService',
      );
      return permission;
    } catch (error) {
      this.logger.error(
        'Error creating permission',
        error.stack,
        'PermissionsService',
      );
      throw error;
    }
  }

  /**
   * Update an existing permission
   */
  async updatePermission(
    id: string,
    dto: UpdatePermissionDto,
    modifiedBy: string,
  ): Promise<Permission> {
    try {
      const existing = await this.findById(id);

      if (existing.isSystemPermission) {
        throw new BadRequestException('System permissions cannot be modified');
      }

      const permission = await this.prisma.permission.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          scope: dto.scope,
          groupId: dto.groupId,
          conditions: dto.conditions,
          metadata: dto.metadata,
          isActive: dto.isActive,
          updatedAt: new Date(),
        },
        include: {
          group: true,
        },
      });

      await this.auditService.log({
        action: AuditAction.UPDATE,
        module: 'permissions',
        entityType: 'Permission',
        entityId: permission.id,
        metadata: {
          changes: dto,
        },
        context: {
          actorId: modifiedBy,
        },
      });

      this.logger.log(
        `Permission updated: ${permission.code}`,
        'PermissionsService',
      );
      return permission;
    } catch (error) {
      this.logger.error(
        'Error updating permission',
        error.stack,
        'PermissionsService',
      );
      throw error;
    }
  }

  /**
   * Find permission by ID
   */
  async findById(id: string): Promise<Permission> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
      include: {
        group: true,
        dependencies: {
          include: {
            dependsOn: true,
          },
        },
        dependentOn: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    return permission;
  }

  /**
   * Find permission by code
   */
  async findByCode(code: string): Promise<Permission> {
    const permission = await this.prisma.permission.findUnique({
      where: { code },
      include: {
        group: true,
      },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with code ${code} not found`);
    }

    return permission;
  }

  /**
   * Find permissions with filters
   */
  async findMany(filter: IPermissionFilter = {}): Promise<Permission[]> {
    const where: Prisma.PermissionWhereInput = {
      ...(filter.resource && { resource: filter.resource }),
      ...(filter.action && { action: filter.action }),
      ...(filter.scope && { scope: filter.scope }),
      ...(filter.groupId && { groupId: filter.groupId }),
      ...(filter.isActive !== undefined && { isActive: filter.isActive }),
      ...(filter.isSystemPermission !== undefined && {
        isSystemPermission: filter.isSystemPermission,
      }),
    };

    return this.prisma.permission.findMany({
      where,
      include: {
        group: true,
      },
      orderBy: [
        { group: { sortOrder: 'asc' } },
        { resource: 'asc' },
        { action: 'asc' },
      ],
    });
  }

  /**
   * Delete a permission (soft delete by deactivating)
   */
  async deletePermission(id: string, deletedBy: string): Promise<void> {
    try {
      const permission = await this.findById(id);

      if (permission.isSystemPermission) {
        throw new BadRequestException('System permissions cannot be deleted');
      }

      // Check for dependencies
      const dependentCount = await this.prisma.permissionDependency.count({
        where: { dependsOnId: id },
      });

      if (dependentCount > 0) {
        throw new BadRequestException(
          `Cannot delete permission: ${dependentCount} other permissions depend on it`,
        );
      }

      await this.prisma.permission.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      await this.auditService.log({
        action: AuditAction.DELETE,
        module: 'permissions',
        entityType: 'Permission',
        entityId: id,
        metadata: {
          code: permission.code,
        },
        context: {
          actorId: deletedBy,
        },
      });

      this.logger.log(
        `Permission deleted: ${permission.code}`,
        'PermissionsService',
      );
    } catch (error) {
      this.logger.error(
        'Error deleting permission',
        error.stack,
        'PermissionsService',
      );
      throw error;
    }
  }

  /**
   * Create a permission group
   */
  async createPermissionGroup(
    dto: CreatePermissionGroupDto,
    createdBy: string,
  ): Promise<PermissionGroup> {
    try {
      const existing = await this.prisma.permissionGroup.findUnique({
        where: { code: dto.code },
      });

      if (existing) {
        throw new ConflictException(
          `Permission group with code ${dto.code} already exists`,
        );
      }

      const group = await this.prisma.permissionGroup.create({
        data: {
          id: uuidv7(),
          code: dto.code,
          name: dto.name,
          description: dto.description,
          category: dto.category,
          icon: dto.icon,
          sortOrder: dto.sortOrder || 0,
          createdBy,
        },
      });

      await this.auditService.log({
        action: AuditAction.CREATE,
        module: 'permissions',
        entityType: 'PermissionGroup',
        entityId: group.id,
        metadata: {
          code: group.code,
          name: group.name,
        },
        context: {
          actorId: createdBy,
        },
      });

      this.logger.log(
        `Permission group created: ${group.code}`,
        'PermissionsService',
      );
      return group;
    } catch (error) {
      this.logger.error(
        'Error creating permission group',
        error.stack,
        'PermissionsService',
      );
      throw error;
    }
  }

  /**
   * Update a permission group
   */
  async updatePermissionGroup(
    id: string,
    dto: UpdatePermissionGroupDto,
    modifiedBy: string,
  ): Promise<PermissionGroup> {
    try {
      const existing = await this.prisma.permissionGroup.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException(`Permission group with ID ${id} not found`);
      }

      const group = await this.prisma.permissionGroup.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          category: dto.category,
          icon: dto.icon,
          sortOrder: dto.sortOrder,
          isActive: dto.isActive,
          updatedAt: new Date(),
        },
      });

      await this.auditService.log({
        action: AuditAction.UPDATE,
        module: 'permissions',
        entityType: 'PermissionGroup',
        entityId: group.id,
        metadata: {
          changes: dto,
        },
        context: {
          actorId: modifiedBy,
        },
      });

      this.logger.log(
        `Permission group updated: ${group.code}`,
        'PermissionsService',
      );
      return group;
    } catch (error) {
      this.logger.error(
        'Error updating permission group',
        error.stack,
        'PermissionsService',
      );
      throw error;
    }
  }

  /**
   * Find all permission groups
   */
  async findAllGroups(includeInactive = false): Promise<PermissionGroup[]> {
    return this.prisma.permissionGroup.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        permissions: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Add permission dependency
   */
  async addDependency(
    permissionId: string,
    dependsOnId: string,
    isRequired = true,
  ): Promise<void> {
    try {
      // Check for circular dependencies
      await this.checkCircularDependency(permissionId, dependsOnId);

      await this.prisma.permissionDependency.create({
        data: {
          id: uuidv7(),
          permissionId,
          dependsOnId,
          isRequired,
        },
      });

      this.logger.log(
        `Permission dependency added: ${permissionId} depends on ${dependsOnId}`,
        'PermissionsService',
      );
    } catch (error) {
      this.logger.error(
        'Error adding permission dependency',
        error.stack,
        'PermissionsService',
      );
      throw error;
    }
  }

  /**
   * Check for circular dependencies
   */
  private async checkCircularDependency(
    permissionId: string,
    dependsOnId: string,
    visited = new Set<string>(),
  ): Promise<void> {
    if (permissionId === dependsOnId) {
      throw new BadRequestException('Permission cannot depend on itself');
    }

    if (visited.has(dependsOnId)) {
      throw new BadRequestException('Circular dependency detected');
    }

    visited.add(dependsOnId);

    const dependencies = await this.prisma.permissionDependency.findMany({
      where: { permissionId: dependsOnId },
    });

    for (const dep of dependencies) {
      await this.checkCircularDependency(
        permissionId,
        dep.dependsOnId,
        visited,
      );
    }
  }

  /**
   * Get permission statistics
   */
  /**
   * Debug permission chain for a specific user
   */
  async debugUserPermissions(
    userProfileId: string,
    resource?: string,
    action?: PermissionAction,
  ): Promise<any> {
    // Get user info
    const user = await this.prisma.userProfile.findUnique({
      where: { id: userProfileId },
      select: {
        id: true,
        clerkUserId: true,
        nip: true,
        isSuperadmin: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Build permission filter
    const permissionFilter: any = {};
    if (resource) permissionFilter.resource = resource;
    if (action) permissionFilter.action = action;

    // Get all permissions (or filtered)
    const permissions = await this.prisma.permission.findMany({
      where: {
        ...permissionFilter,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        resource: true,
        action: true,
        scope: true,
      },
    });

    // Get user's roles
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userProfileId,
        isActive: true,
      },
      include: {
        role: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    // Get role permissions for all user's roles
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        roleId: { in: userRoles.map((ur) => ur.roleId) },
        isGranted: true,
      },
      include: {
        permission: {
          select: {
            id: true,
            code: true,
            resource: true,
            action: true,
            scope: true,
            isActive: true,
          },
        },
        role: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    // Get direct user permissions
    const userPermissions = await this.prisma.userPermission.findMany({
      where: {
        userProfileId,
        isGranted: true,
      },
      include: {
        permission: {
          select: {
            id: true,
            code: true,
            resource: true,
            action: true,
            scope: true,
            isActive: true,
          },
        },
      },
    });

    // Check which permissions from the filter the user has access to
    const permissionAccess = permissions.map((perm) => {
      const hasDirectPermission = userPermissions.some(
        (up) => up.permissionId === perm.id,
      );
      const hasRolePermission = rolePermissions.some(
        (rp) => rp.permissionId === perm.id,
      );
      const rolesGranting = rolePermissions
        .filter((rp) => rp.permissionId === perm.id)
        .map((rp) => rp.role.name);

      return {
        permission: perm,
        hasAccess: hasDirectPermission || hasRolePermission,
        grantedBy: {
          directPermission: hasDirectPermission,
          roles: rolesGranting,
        },
      };
    });

    return {
      user: {
        id: user.id,
        clerkUserId: user.clerkUserId,
        nip: user.nip,
        isSuperadmin: user.isSuperadmin,
        isActive: user.isActive,
      },
      roles: userRoles.map((ur) => ({
        id: ur.role.id,
        code: ur.role.code,
        name: ur.role.name,
        isActive: ur.role.isActive,
        assignedAt: ur.assignedAt,
        validFrom: ur.validFrom,
        validUntil: ur.validUntil,
      })),
      directPermissionsCount: userPermissions.length,
      rolePermissionsCount: rolePermissions.length,
      permissionAccess,
      summary: {
        totalPermissionsChecked: permissions.length,
        permissionsGranted: permissionAccess.filter((p) => p.hasAccess).length,
        permissionsDenied: permissionAccess.filter((p) => !p.hasAccess).length,
        rolesCount: userRoles.length,
      },
    };
  }

  async getStatistics(): Promise<any> {
    const [
      totalPermissions,
      activePermissions,
      systemPermissions,
      totalGroups,
      permissionsByAction,
      permissionsByScope,
    ] = await Promise.all([
      this.prisma.permission.count(),
      this.prisma.permission.count({ where: { isActive: true } }),
      this.prisma.permission.count({ where: { isSystemPermission: true } }),
      this.prisma.permissionGroup.count({ where: { isActive: true } }),
      this.prisma.permission.groupBy({
        by: ['action'],
        _count: true,
      }),
      this.prisma.permission.groupBy({
        by: ['scope'],
        _count: true,
        where: { scope: { not: null } },
      }),
    ]);

    return {
      totalPermissions,
      activePermissions,
      systemPermissions,
      totalGroups,
      permissionsByAction: permissionsByAction.map((item) => ({
        action: item.action,
        count: item._count,
      })),
      permissionsByScope: permissionsByScope.map((item) => ({
        scope: item.scope,
        count: item._count,
      })),
    };
  }
}
