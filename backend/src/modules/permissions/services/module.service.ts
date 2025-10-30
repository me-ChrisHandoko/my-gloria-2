import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import {
  UserModuleAccess,
  RoleModuleAccess,
  ModulePermission,
  PermissionAction,
  PermissionScope,
} from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class ModuleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Grant module access to user
   * Fixed: Use findFirst + conditional create/update instead of broken upsert
   */
  async grantUserModuleAccess(
    userProfileId: string,
    moduleId: string,
    canRead: boolean,
    canWrite: boolean,
    canDelete: boolean,
    canShare: boolean,
    grantedBy: string,
    effectiveUntil?: Date,
  ): Promise<UserModuleAccess> {
    try {
      const permissions = {
        canRead,
        canWrite,
        canDelete,
        canShare,
      };

      // Find existing active access
      const existing = await this.prisma.userModuleAccess.findFirst({
        where: {
          userProfileId,
          moduleId,
          isActive: true,
        },
      });

      let moduleAccess: UserModuleAccess;

      if (existing) {
        // Update existing record
        moduleAccess = await this.prisma.userModuleAccess.update({
          where: { id: existing.id },
          data: {
            permissions,
            grantedBy,
            effectiveUntil,
            updatedAt: new Date(),
          },
        });

        this.logger.log(
          `Module access updated for user ${userProfileId} on module ${moduleId}`,
          'ModuleService',
        );
      } else {
        // Create new record with uuidv7
        moduleAccess = await this.prisma.userModuleAccess.create({
          data: {
            id: uuidv7(),
            userProfileId,
            moduleId,
            permissions,
            grantedBy,
            effectiveUntil,
          },
        });

        this.logger.log(
          `Module access granted for user ${userProfileId} on module ${moduleId}`,
          'ModuleService',
        );
      }

      return moduleAccess;
    } catch (error) {
      this.logger.error(
        'Error granting module access',
        error.stack,
        'ModuleService',
      );
      throw error;
    }
  }

  /**
   * Get user module access
   */
  async getUserModuleAccess(
    userProfileId: string,
  ): Promise<UserModuleAccess[]> {
    return this.prisma.userModuleAccess.findMany({
      where: {
        userProfileId,
        isActive: true,
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
      },
      include: {
        module: true,
      },
    });
  }

  /**
   * Check if user has access to module
   */
  async checkModuleAccess(
    userProfileId: string,
    moduleId: string,
    accessType: 'read' | 'write' | 'delete' | 'share',
  ): Promise<boolean> {
    const access = await this.prisma.userModuleAccess.findFirst({
      where: {
        userProfileId,
        moduleId,
        isActive: true,
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
      },
    });

    if (!access) {
      return false;
    }

    const permissions = access.permissions as any;
    if (!permissions) {
      return false;
    }

    switch (accessType) {
      case 'read':
        return permissions.canRead || false;
      case 'write':
        return permissions.canWrite || false;
      case 'delete':
        return permissions.canDelete || false;
      case 'share':
        return permissions.canShare || false;
      default:
        return false;
    }
  }

  /**
   * Grant module access to role
   */
  async grantRoleModuleAccess(
    roleId: string,
    moduleId: string,
    canRead: boolean,
    canWrite: boolean,
    canDelete: boolean,
    canShare: boolean,
    createdBy: string,
    effectiveUntil?: Date,
  ): Promise<RoleModuleAccess> {
    try {
      const permissions = {
        canRead,
        canWrite,
        canDelete,
        canShare,
      };

      // Find existing active access
      const existing = await this.prisma.roleModuleAccess.findFirst({
        where: {
          roleId,
          moduleId,
          isActive: true,
        },
      });

      let roleModuleAccess: RoleModuleAccess;

      if (existing) {
        // Update existing record
        roleModuleAccess = await this.prisma.roleModuleAccess.update({
          where: { id: existing.id },
          data: {
            permissions,
            version: { increment: 1 },
            updatedAt: new Date(),
          },
        });

        this.logger.log(
          `Module access updated for role ${roleId} on module ${moduleId}`,
          'ModuleService',
        );
      } else {
        // Create new record with uuidv7
        roleModuleAccess = await this.prisma.roleModuleAccess.create({
          data: {
            id: uuidv7(),
            roleId,
            moduleId,
            permissions,
            createdBy,
            version: 0,
          },
        });

        this.logger.log(
          `Module access granted for role ${roleId} on module ${moduleId}`,
          'ModuleService',
        );
      }

      return roleModuleAccess;
    } catch (error) {
      this.logger.error(
        'Error granting role module access',
        error.stack,
        'ModuleService',
      );
      throw error;
    }
  }

  /**
   * Get role module access
   */
  async getRoleModuleAccess(roleId: string): Promise<RoleModuleAccess[]> {
    return this.prisma.roleModuleAccess.findMany({
      where: {
        roleId,
        isActive: true,
      },
      include: {
        module: true,
        role: true,
        position: true,
      },
    });
  }

  /**
   * Revoke role module access
   */
  async revokeRoleModuleAccess(
    roleId: string,
    moduleId: string,
  ): Promise<RoleModuleAccess> {
    const access = await this.prisma.roleModuleAccess.findFirst({
      where: {
        roleId,
        moduleId,
        isActive: true,
      },
    });

    if (!access) {
      throw new Error('Role module access not found');
    }

    const revoked = await this.prisma.roleModuleAccess.update({
      where: { id: access.id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `Module access revoked for role ${roleId} on module ${moduleId}`,
      'ModuleService',
    );

    return revoked;
  }

  /**
   * Check if role has access to module
   */
  async checkRoleModuleAccess(
    roleId: string,
    moduleId: string,
    accessType: 'read' | 'write' | 'delete' | 'share',
  ): Promise<boolean> {
    const access = await this.prisma.roleModuleAccess.findFirst({
      where: {
        roleId,
        moduleId,
        isActive: true,
      },
    });

    if (!access) {
      return false;
    }

    const permissions = access.permissions as any;
    if (!permissions) {
      return false;
    }

    switch (accessType) {
      case 'read':
        return permissions.canRead || false;
      case 'write':
        return permissions.canWrite || false;
      case 'delete':
        return permissions.canDelete || false;
      case 'share':
        return permissions.canShare || false;
      default:
        return false;
    }
  }

  /**
   * Create module permission
   */
  async createModulePermission(
    moduleId: string,
    action: PermissionAction,
    scope: PermissionScope,
    description: string,
    createdBy: string,
  ): Promise<ModulePermission> {
    // Verify module exists
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module || module.deletedAt) {
      throw new NotFoundException(`Module with ID ${moduleId} not found`);
    }

    const permission = await this.prisma.modulePermission.create({
      data: {
        id: uuidv7(),
        moduleId,
        action,
        scope,
        description,
      },
    });

    this.logger.log(
      `Permission ${action} created for module ${moduleId}`,
      'ModuleService',
    );

    return permission;
  }

  /**
   * Get module permissions
   */
  async getModulePermissions(moduleId: string): Promise<ModulePermission[]> {
    return this.prisma.modulePermission.findMany({
      where: {
        moduleId,
      },
      orderBy: [{ action: 'asc' }, { scope: 'asc' }],
    });
  }

  /**
   * Remove module permission
   */
  async removeModulePermission(
    moduleId: string,
    permissionId: string,
  ): Promise<ModulePermission> {
    const permission = await this.prisma.modulePermission.findFirst({
      where: {
        id: permissionId,
        moduleId,
      },
    });

    if (!permission) {
      throw new NotFoundException('Module permission not found');
    }

    const removed = await this.prisma.modulePermission.delete({
      where: { id: permissionId },
    });

    this.logger.log(
      `Permission ${permission.action} removed from module ${moduleId}`,
      'ModuleService',
    );

    return removed;
  }

  /**
   * Get module hierarchy (ancestors + self + descendants)
   */
  async getModuleHierarchy(moduleId: string) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module || module.deletedAt) {
      throw new NotFoundException(`Module with ID ${moduleId} not found`);
    }

    // Get ancestors (parent chain)
    const ancestors = await this.getAncestors(moduleId);

    // Get descendants (children recursively)
    const descendants = await this.getDescendants(moduleId);

    return {
      ancestors,
      current: module,
      descendants,
    };
  }

  /**
   * Get module ancestors (parent chain)
   */
  private async getAncestors(moduleId: string) {
    const ancestors: Array<{
      id: string;
      code: string;
      name: string;
      parentId: string | null;
    }> = [];
    let currentId: string | null = moduleId;

    while (currentId) {
      const module = await this.prisma.module.findUnique({
        where: { id: currentId },
        select: {
          id: true,
          code: true,
          name: true,
          parentId: true,
        },
      });

      if (!module || !module.parentId) {
        break;
      }

      const parent = await this.prisma.module.findUnique({
        where: { id: module.parentId },
        select: {
          id: true,
          code: true,
          name: true,
          parentId: true,
          deletedAt: true,
        },
      });

      if (parent && !parent.deletedAt) {
        ancestors.unshift({
          id: parent.id,
          code: parent.code,
          name: parent.name,
          parentId: parent.parentId,
        });
        currentId = parent.parentId;
      } else {
        break;
      }
    }

    return ancestors;
  }

  /**
   * Get module descendants (recursive)
   */
  private async getDescendants(moduleId: string) {
    const descendants: Array<{
      id: string;
      code: string;
      name: string;
      sortOrder: number;
    }> = [];
    const children = await this.prisma.module.findMany({
      where: {
        parentId: moduleId,
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    for (const child of children) {
      descendants.push({
        id: child.id,
        code: child.code,
        name: child.name,
        sortOrder: child.sortOrder,
      });
      const childDescendants = await this.getDescendants(child.id);
      descendants.push(...childDescendants);
    }

    return descendants;
  }
}
