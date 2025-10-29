import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import {
  AssignRolePermissionDto,
  UpdateRolePermissionDto,
  BulkAssignRolePermissionsDto,
  BulkRemoveRolePermissionsDto,
} from '../dto/role-permission.dto';
import { PermissionCacheService } from './permission-cache.service';
import { Prisma } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class RolePermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: PermissionCacheService,
  ) {}

  /**
   * Assign a permission to a role
   */
  async assignPermissionToRole(
    roleId: string,
    dto: AssignRolePermissionDto,
    grantedBy: string,
  ) {
    // Validate role exists and is active
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    if (!role.isActive) {
      throw new BadRequestException(`Role ${role.name} is inactive`);
    }

    // Validate permission exists and is active
    const permission = await this.prisma.permission.findUnique({
      where: { id: dto.permissionId },
    });

    if (!permission) {
      throw new NotFoundException(
        `Permission with ID ${dto.permissionId} not found`,
      );
    }

    if (!permission.isActive) {
      throw new BadRequestException(
        `Permission ${permission.name} is inactive`,
      );
    }

    // Check if assignment already exists
    const existing = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId: dto.permissionId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Permission ${permission.name} is already assigned to role ${role.name}`,
      );
    }

    // Validate validUntil is after validFrom
    if (dto.validFrom && dto.validUntil && dto.validUntil <= dto.validFrom) {
      throw new BadRequestException(
        'validUntil must be after validFrom',
      );
    }

    // Create role permission assignment
    const rolePermission = await this.prisma.rolePermission.create({
      data: {
        id: uuidv7(),
        roleId,
        permissionId: dto.permissionId,
        isGranted: dto.isGranted ?? true,
        conditions: dto.conditions ? (dto.conditions as Prisma.InputJsonValue) : Prisma.DbNull,
        validFrom: dto.validFrom || new Date(),
        validUntil: dto.validUntil || null,
        grantedBy,
        grantReason: dto.grantReason || null,
      },
      include: {
        permission: true,
        role: true,
      },
    });

    // Invalidate cache for all users with this role
    await this.invalidateRoleCache(roleId);

    // Record change in history
    await this.recordChangeHistory(
      'ROLE_PERMISSION',
      rolePermission.id,
      'ASSIGN',
      null,
      rolePermission,
      grantedBy,
    );

    return rolePermission;
  }

  /**
   * Remove permission from role
   */
  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
    userId: string,
  ) {
    const rolePermission = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
      include: {
        permission: true,
        role: true,
      },
    });

    if (!rolePermission) {
      throw new NotFoundException(
        `Permission assignment not found for role ${roleId} and permission ${permissionId}`,
      );
    }

    // Record state before deletion
    const previousState = { ...rolePermission };

    // Delete role permission
    await this.prisma.rolePermission.delete({
      where: { id: rolePermission.id },
    });

    // Invalidate cache
    await this.invalidateRoleCache(roleId);

    // Record change in history
    await this.recordChangeHistory(
      'ROLE_PERMISSION',
      rolePermission.id,
      'REMOVE',
      previousState,
      null,
      userId,
    );

    return { message: 'Permission removed from role successfully' };
  }

  /**
   * Get role permissions with pagination
   */
  async getRolePermissions(
    roleId: string,
    filters: {
      isGranted?: boolean;
      isActive?: boolean;
    } = {},
    page: number = 1,
    limit: number = 10,
  ) {
    // Validate role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const where: Prisma.RolePermissionWhereInput = {
      roleId,
      ...(filters.isGranted !== undefined && { isGranted: filters.isGranted }),
    };

    // Add active filter based on validUntil
    if (filters.isActive !== undefined && filters.isActive) {
      where.OR = [
        { validUntil: null },
        { validUntil: { gte: new Date() } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.rolePermission.findMany({
        where,
        include: {
          permission: {
            select: {
              id: true,
              code: true,
              name: true,
              resource: true,
              action: true,
              scope: true,
              description: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.rolePermission.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update role permission
   */
  async updateRolePermission(
    roleId: string,
    permissionId: string,
    dto: UpdateRolePermissionDto,
    userId: string,
  ) {
    const rolePermission = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    if (!rolePermission) {
      throw new NotFoundException(
        `Permission assignment not found for role ${roleId} and permission ${permissionId}`,
      );
    }

    // Validate validUntil is after validFrom if both are provided
    const validFrom = dto.validFrom || rolePermission.validFrom;
    const validUntil = dto.validUntil !== undefined ? dto.validUntil : rolePermission.validUntil;

    if (validFrom && validUntil && validUntil <= validFrom) {
      throw new BadRequestException('validUntil must be after validFrom');
    }

    // Record previous state
    const previousState = { ...rolePermission };

    // Update role permission
    const updated = await this.prisma.rolePermission.update({
      where: { id: rolePermission.id },
      data: {
        ...(dto.isGranted !== undefined && { isGranted: dto.isGranted }),
        ...(dto.conditions !== undefined && { conditions: dto.conditions }),
        ...(dto.validFrom && { validFrom: dto.validFrom }),
        ...(dto.validUntil !== undefined && { validUntil: dto.validUntil }),
        updatedAt: new Date(),
      },
      include: {
        permission: true,
        role: true,
      },
    });

    // Invalidate cache
    await this.invalidateRoleCache(roleId);

    // Record change in history
    await this.recordChangeHistory(
      'ROLE_PERMISSION',
      updated.id,
      'UPDATE',
      previousState,
      updated,
      userId,
    );

    return updated;
  }

  /**
   * Get effective permissions for a role (including hierarchy)
   */
  async getEffectiveRolePermissions(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          where: {
            isGranted: true,
            OR: [
              { validUntil: null },
              { validUntil: { gte: new Date() } },
            ],
          },
          include: {
            permission: true,
          },
        },
        parentRoles: {
          where: {
            inheritPermissions: true,
          },
          include: {
            parentRole: {
              include: {
                rolePermissions: {
                  where: {
                    isGranted: true,
                    OR: [
                      { validUntil: null },
                      { validUntil: { gte: new Date() } },
                    ],
                  },
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Collect all permissions from role and inherited from parent roles
    const permissionsMap = new Map();

    // Add direct role permissions
    role.rolePermissions.forEach((rp) => {
      permissionsMap.set(rp.permissionId, {
        ...rp.permission,
        source: 'direct',
        rolePermissionId: rp.id,
      });
    });

    // Add inherited permissions from parent roles
    role.parentRoles.forEach((rh) => {
      rh.parentRole.rolePermissions.forEach((rp) => {
        if (!permissionsMap.has(rp.permissionId)) {
          permissionsMap.set(rp.permissionId, {
            ...rp.permission,
            source: 'inherited',
            inheritedFrom: rh.parentRole.name,
            rolePermissionId: rp.id,
          });
        }
      });
    });

    return {
      roleId: role.id,
      roleName: role.name,
      permissions: Array.from(permissionsMap.values()),
      totalPermissions: permissionsMap.size,
    };
  }

  /**
   * Bulk assign permissions to role
   */
  async bulkAssignRolePermissions(
    roleId: string,
    dto: BulkAssignRolePermissionsDto,
    grantedBy: string,
  ) {
    // Validate role exists and is active
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    if (!role.isActive) {
      throw new BadRequestException(`Role ${role.name} is inactive`);
    }

    // Validate all permissions exist and are active
    const permissions = await this.prisma.permission.findMany({
      where: {
        id: { in: dto.permissionIds },
      },
    });

    if (permissions.length !== dto.permissionIds.length) {
      throw new BadRequestException(
        'One or more permission IDs are invalid',
      );
    }

    const inactivePermissions = permissions.filter((p) => !p.isActive);
    if (inactivePermissions.length > 0) {
      throw new BadRequestException(
        `Inactive permissions: ${inactivePermissions.map((p) => p.name).join(', ')}`,
      );
    }

    // Check for existing assignments
    const existing = await this.prisma.rolePermission.findMany({
      where: {
        roleId,
        permissionId: { in: dto.permissionIds },
      },
    });

    const existingPermissionIds = new Set(existing.map((e) => e.permissionId));
    const newPermissionIds = dto.permissionIds.filter(
      (id) => !existingPermissionIds.has(id),
    );

    if (newPermissionIds.length === 0) {
      throw new BadRequestException(
        'All permissions are already assigned to this role',
      );
    }

    // Validate date range
    if (dto.validFrom && dto.validUntil && dto.validUntil <= dto.validFrom) {
      throw new BadRequestException('validUntil must be after validFrom');
    }

    // Bulk create role permissions in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const created = await Promise.all(
        newPermissionIds.map((permissionId) =>
          tx.rolePermission.create({
            data: {
              id: uuidv7(),
              roleId,
              permissionId,
              isGranted: dto.isGranted ?? true,
              conditions: dto.conditions ? (dto.conditions as Prisma.InputJsonValue) : Prisma.DbNull,
              validFrom: dto.validFrom || new Date(),
              validUntil: dto.validUntil || null,
              grantedBy,
              grantReason: dto.grantReason || null,
            },
            include: {
              permission: true,
            },
          }),
        ),
      );

      // Record change history for bulk operation
      await tx.permissionChangeHistory.create({
        data: {
          id: uuidv7(),
          entityType: 'ROLE_PERMISSION',
          entityId: roleId,
          operation: 'BULK_ASSIGN',
          previousState: Prisma.JsonNull,
          newState: {
            roleId,
            permissionIds: newPermissionIds,
            count: created.length,
          },
          metadata: {
            skippedCount: dto.permissionIds.length - newPermissionIds.length,
            existingPermissions: Array.from(existingPermissionIds),
          },
          performedBy: grantedBy,
        },
      });

      return created;
    });

    // Invalidate cache
    await this.invalidateRoleCache(roleId);

    return {
      success: true,
      assigned: result.length,
      skipped: dto.permissionIds.length - newPermissionIds.length,
      permissions: result,
    };
  }

  /**
   * Bulk remove permissions from role
   */
  async bulkRemoveRolePermissions(
    roleId: string,
    dto: BulkRemoveRolePermissionsDto,
    userId: string,
  ) {
    // Validate role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Find existing assignments
    const existing = await this.prisma.rolePermission.findMany({
      where: {
        roleId,
        permissionId: { in: dto.permissionIds },
      },
      include: {
        permission: true,
      },
    });

    if (existing.length === 0) {
      throw new BadRequestException(
        'None of the specified permissions are assigned to this role',
      );
    }

    // Bulk delete in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: {
          roleId,
          permissionId: { in: dto.permissionIds },
        },
      });

      // Record change history
      await tx.permissionChangeHistory.create({
        data: {
          id: uuidv7(),
          entityType: 'ROLE_PERMISSION',
          entityId: roleId,
          operation: 'BULK_REMOVE',
          previousState: {
            roleId,
            permissions: existing,
            count: existing.length,
          },
          newState: Prisma.JsonNull,
          metadata: {
            reason: dto.reason || null,
          },
          performedBy: userId,
        },
      });

      return existing;
    });

    // Invalidate cache
    await this.invalidateRoleCache(roleId);

    return {
      success: true,
      removed: result.length,
      notFound: dto.permissionIds.length - result.length,
    };
  }

  /**
   * Invalidate cache for all users with this role
   */
  private async invalidateRoleCache(roleId: string) {
    // Get all users with this role
    const userRoles = await this.prisma.userRole.findMany({
      where: { roleId, isActive: true },
      select: { userProfileId: true },
    });

    // Invalidate cache for each user
    await Promise.all(
      userRoles.map((ur) =>
        this.cacheService.invalidateUserCache(ur.userProfileId),
      ),
    );
  }

  /**
   * Record change in permission history
   */
  private async recordChangeHistory(
    entityType: string,
    entityId: string,
    operation: string,
    previousState: any,
    newState: any,
    performedBy: string,
  ) {
    await this.prisma.permissionChangeHistory.create({
      data: {
        id: uuidv7(),
        entityType,
        entityId,
        operation,
        previousState,
        newState,
        performedBy,
      },
    });
  }
}
