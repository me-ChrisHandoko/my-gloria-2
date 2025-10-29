import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import {
  AssignUserPermissionDto,
  UpdateUserPermissionDto,
  BulkAssignUserPermissionsDto,
  BulkRemoveUserPermissionsDto,
  UpdateUserPermissionPriorityDto,
} from '../dto/user-permission.dto';
import { PermissionCacheService } from './permission-cache.service';
import { Prisma } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class UserPermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: PermissionCacheService,
  ) {}

  /**
   * Assign a permission to a user
   */
  async assignPermissionToUser(
    userId: string,
    dto: AssignUserPermissionDto,
    grantedBy: string,
  ) {
    // Validate user profile exists and is active
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { id: userId },
    });

    if (!userProfile) {
      throw new NotFoundException(`User profile with ID ${userId} not found`);
    }

    if (!userProfile.isActive) {
      throw new BadRequestException(`User profile is inactive`);
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
    const existing = await this.prisma.userPermission.findUnique({
      where: {
        userProfileId_permissionId: {
          userProfileId: userId,
          permissionId: dto.permissionId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Permission ${permission.name} is already assigned to this user`,
      );
    }

    // Validate temporary permissions require validUntil
    if (dto.isTemporary && !dto.validUntil) {
      throw new BadRequestException(
        'Temporary permissions must have validUntil date',
      );
    }

    // Validate validUntil is after validFrom
    if (dto.validFrom && dto.validUntil && dto.validUntil <= dto.validFrom) {
      throw new BadRequestException('validUntil must be after validFrom');
    }

    // Create user permission assignment
    const userPermission = await this.prisma.userPermission.create({
      data: {
        id: uuidv7(),
        userProfileId: userId,
        permissionId: dto.permissionId,
        isGranted: dto.isGranted ?? true,
        conditions: dto.conditions ? (dto.conditions as Prisma.InputJsonValue) : Prisma.DbNull,
        validFrom: dto.validFrom || new Date(),
        validUntil: dto.validUntil || null,
        grantedBy,
        grantReason: dto.grantReason,
        priority: dto.priority ?? 100,
        isTemporary: dto.isTemporary ?? false,
      },
      include: {
        permission: true,
        userProfile: {
          select: {
            id: true,
            nip: true,
            dataKaryawan: {
              select: {
                nama: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Invalidate user cache
    await this.cacheService.invalidateUserCache(userId);

    // Record change in history
    await this.recordChangeHistory(
      'USER_PERMISSION',
      userPermission.id,
      'ASSIGN',
      null,
      userPermission,
      grantedBy,
    );

    return userPermission;
  }

  /**
   * Revoke permission from user
   */
  async revokeUserPermission(
    userId: string,
    permissionId: string,
    performedBy: string,
  ) {
    const userPermission = await this.prisma.userPermission.findUnique({
      where: {
        userProfileId_permissionId: {
          userProfileId: userId,
          permissionId,
        },
      },
      include: {
        permission: true,
        userProfile: {
          select: {
            id: true,
            nip: true,
          },
        },
      },
    });

    if (!userPermission) {
      throw new NotFoundException(
        `Permission assignment not found for user ${userId} and permission ${permissionId}`,
      );
    }

    // Record state before deletion
    const previousState = { ...userPermission };

    // Delete user permission
    await this.prisma.userPermission.delete({
      where: { id: userPermission.id },
    });

    // Invalidate cache
    await this.cacheService.invalidateUserCache(userId);

    // Record change in history
    await this.recordChangeHistory(
      'USER_PERMISSION',
      userPermission.id,
      'REVOKE',
      previousState,
      null,
      performedBy,
    );

    return { message: 'Permission revoked from user successfully' };
  }

  /**
   * Get user permissions with pagination
   */
  async getUserPermissions(
    userId: string,
    filters: {
      isGranted?: boolean;
      isActive?: boolean;
      isTemporary?: boolean;
    } = {},
    page: number = 1,
    limit: number = 10,
  ) {
    // Validate user exists
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { id: userId },
    });

    if (!userProfile) {
      throw new NotFoundException(`User profile with ID ${userId} not found`);
    }

    const where: Prisma.UserPermissionWhereInput = {
      userProfileId: userId,
      ...(filters.isGranted !== undefined && { isGranted: filters.isGranted }),
      ...(filters.isTemporary !== undefined && {
        isTemporary: filters.isTemporary,
      }),
    };

    // Add active filter based on validUntil
    if (filters.isActive !== undefined && filters.isActive) {
      where.OR = [{ validUntil: null }, { validUntil: { gte: new Date() } }];
    }

    const [data, total] = await Promise.all([
      this.prisma.userPermission.findMany({
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
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.userPermission.count({ where }),
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
   * Update user permission
   */
  async updateUserPermission(
    userId: string,
    permissionId: string,
    dto: UpdateUserPermissionDto,
    performedBy: string,
  ) {
    const userPermission = await this.prisma.userPermission.findUnique({
      where: {
        userProfileId_permissionId: {
          userProfileId: userId,
          permissionId,
        },
      },
    });

    if (!userPermission) {
      throw new NotFoundException(
        `Permission assignment not found for user ${userId} and permission ${permissionId}`,
      );
    }

    // Validate validUntil is after validFrom if both are provided
    const validFrom = dto.validFrom || userPermission.validFrom;
    const validUntil =
      dto.validUntil !== undefined ? dto.validUntil : userPermission.validUntil;

    if (validFrom && validUntil && validUntil <= validFrom) {
      throw new BadRequestException('validUntil must be after validFrom');
    }

    // Record previous state
    const previousState = { ...userPermission };

    // Update user permission
    const updated = await this.prisma.userPermission.update({
      where: { id: userPermission.id },
      data: {
        ...(dto.isGranted !== undefined && { isGranted: dto.isGranted }),
        ...(dto.conditions !== undefined && { conditions: dto.conditions }),
        ...(dto.validFrom && { validFrom: dto.validFrom }),
        ...(dto.validUntil !== undefined && { validUntil: dto.validUntil }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        updatedAt: new Date(),
      },
      include: {
        permission: true,
        userProfile: {
          select: {
            id: true,
            nip: true,
          },
        },
      },
    });

    // Invalidate cache
    await this.cacheService.invalidateUserCache(userId);

    // Record change in history
    await this.recordChangeHistory(
      'USER_PERMISSION',
      updated.id,
      'UPDATE',
      previousState,
      updated,
      performedBy,
    );

    return updated;
  }

  /**
   * Get effective permissions for a user (user + role permissions with priority resolution)
   */
  async getEffectiveUserPermissions(userId: string) {
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { id: userId },
      include: {
        userPermissions: {
          where: {
            OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
          },
          include: {
            permission: true,
          },
          orderBy: { priority: 'desc' },
        },
        roles: {
          where: {
            isActive: true,
            OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
          },
          include: {
            role: {
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

    if (!userProfile) {
      throw new NotFoundException(`User profile with ID ${userId} not found`);
    }

    // Priority Resolution:
    // 1. Explicit user DENY (isGranted: false) → DENY (highest priority)
    // 2. Explicit user GRANT (isGranted: true) → GRANT (by priority value)
    // 3. Role permissions → GRANT (if no user permission exists)
    // 4. Default → DENY (if no permission found)

    const permissionsMap = new Map();

    // First pass: Add all user permissions (highest priority)
    userProfile.userPermissions.forEach((up) => {
      const existing = permissionsMap.get(up.permissionId);

      // User permission always takes precedence
      if (!existing) {
        permissionsMap.set(up.permissionId, {
          ...up.permission,
          source: 'user',
          isGranted: up.isGranted,
          priority: up.priority,
          isTemporary: up.isTemporary,
          userPermissionId: up.id,
          validUntil: up.validUntil,
        });
      } else if (existing.source === 'user') {
        // If both are user permissions, higher priority wins
        if (up.priority > existing.priority) {
          permissionsMap.set(up.permissionId, {
            ...up.permission,
            source: 'user',
            isGranted: up.isGranted,
            priority: up.priority,
            isTemporary: up.isTemporary,
            userPermissionId: up.id,
            validUntil: up.validUntil,
          });
        }
      }
    });

    // Second pass: Add role permissions (only if not overridden by user)
    userProfile.roles.forEach((ur) => {
      ur.role.rolePermissions.forEach((rp) => {
        const existing = permissionsMap.get(rp.permissionId);

        // Only add if no user permission exists for this permission
        if (!existing) {
          permissionsMap.set(rp.permissionId, {
            ...rp.permission,
            source: 'role',
            roleName: ur.role.name,
            roleId: ur.roleId,
            isGranted: rp.isGranted,
            rolePermissionId: rp.id,
          });
        }
      });
    });

    // Filter only granted permissions (explicit denies are excluded)
    const grantedPermissions = Array.from(permissionsMap.values()).filter(
      (p) => p.isGranted,
    );

    // Count denials
    const deniedPermissions = Array.from(permissionsMap.values()).filter(
      (p) => !p.isGranted,
    );

    return {
      userId: userProfile.id,
      nip: userProfile.nip,
      permissions: grantedPermissions,
      totalPermissions: grantedPermissions.length,
      deniedCount: deniedPermissions.length,
      sources: {
        directUser: userProfile.userPermissions.length,
        fromRoles: userProfile.roles.length,
      },
    };
  }

  /**
   * Get temporary permissions for a user
   */
  async getTemporaryPermissions(userId: string) {
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { id: userId },
    });

    if (!userProfile) {
      throw new NotFoundException(`User profile with ID ${userId} not found`);
    }

    const temporaryPermissions = await this.prisma.userPermission.findMany({
      where: {
        userProfileId: userId,
        isTemporary: true,
        validUntil: { gte: new Date() }, // Only non-expired
      },
      include: {
        permission: true,
      },
      orderBy: { validUntil: 'asc' }, // Soonest to expire first
    });

    return {
      userId,
      temporary: temporaryPermissions,
      count: temporaryPermissions.length,
    };
  }

  /**
   * Bulk assign permissions to user
   */
  async bulkAssignUserPermissions(
    userId: string,
    dto: BulkAssignUserPermissionsDto,
    grantedBy: string,
  ) {
    // Validate user profile exists and is active
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { id: userId },
    });

    if (!userProfile) {
      throw new NotFoundException(`User profile with ID ${userId} not found`);
    }

    if (!userProfile.isActive) {
      throw new BadRequestException(`User profile is inactive`);
    }

    // Validate all permissions exist and are active
    const permissions = await this.prisma.permission.findMany({
      where: {
        id: { in: dto.permissionIds },
      },
    });

    if (permissions.length !== dto.permissionIds.length) {
      throw new BadRequestException('One or more permission IDs are invalid');
    }

    const inactivePermissions = permissions.filter((p) => !p.isActive);
    if (inactivePermissions.length > 0) {
      throw new BadRequestException(
        `Inactive permissions: ${inactivePermissions.map((p) => p.name).join(', ')}`,
      );
    }

    // Validate temporary permissions require validUntil
    if (dto.isTemporary && !dto.validUntil) {
      throw new BadRequestException(
        'Temporary permissions must have validUntil date',
      );
    }

    // Check for existing assignments
    const existing = await this.prisma.userPermission.findMany({
      where: {
        userProfileId: userId,
        permissionId: { in: dto.permissionIds },
      },
    });

    const existingPermissionIds = new Set(existing.map((e) => e.permissionId));
    const newPermissionIds = dto.permissionIds.filter(
      (id) => !existingPermissionIds.has(id),
    );

    if (newPermissionIds.length === 0) {
      throw new BadRequestException(
        'All permissions are already assigned to this user',
      );
    }

    // Validate date range
    if (dto.validFrom && dto.validUntil && dto.validUntil <= dto.validFrom) {
      throw new BadRequestException('validUntil must be after validFrom');
    }

    // Bulk create user permissions in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const created = await Promise.all(
        newPermissionIds.map((permissionId) =>
          tx.userPermission.create({
            data: {
              id: uuidv7(),
              userProfileId: userId,
              permissionId,
              isGranted: dto.isGranted ?? true,
              conditions: dto.conditions ? (dto.conditions as Prisma.InputJsonValue) : Prisma.DbNull,
              validFrom: dto.validFrom || new Date(),
              validUntil: dto.validUntil || null,
              grantedBy,
              grantReason: dto.grantReason,
              priority: dto.priority ?? 100,
              isTemporary: dto.isTemporary ?? false,
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
          entityType: 'USER_PERMISSION',
          entityId: userId,
          operation: 'BULK_ASSIGN',
          previousState: Prisma.JsonNull,
          newState: {
            userProfileId: userId,
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
    await this.cacheService.invalidateUserCache(userId);

    return {
      success: true,
      assigned: result.length,
      skipped: dto.permissionIds.length - newPermissionIds.length,
      permissions: result,
    };
  }

  /**
   * Bulk remove permissions from user
   */
  async bulkRemoveUserPermissions(
    userId: string,
    dto: BulkRemoveUserPermissionsDto,
    performedBy: string,
  ) {
    // Validate user exists
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { id: userId },
    });

    if (!userProfile) {
      throw new NotFoundException(`User profile with ID ${userId} not found`);
    }

    // Find existing assignments
    const existing = await this.prisma.userPermission.findMany({
      where: {
        userProfileId: userId,
        permissionId: { in: dto.permissionIds },
      },
      include: {
        permission: true,
      },
    });

    if (existing.length === 0) {
      throw new BadRequestException(
        'None of the specified permissions are assigned to this user',
      );
    }

    // Bulk delete in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({
        where: {
          userProfileId: userId,
          permissionId: { in: dto.permissionIds },
        },
      });

      // Record change history
      await tx.permissionChangeHistory.create({
        data: {
          id: uuidv7(),
          entityType: 'USER_PERMISSION',
          entityId: userId,
          operation: 'BULK_REMOVE',
          previousState: {
            userProfileId: userId,
            permissions: existing,
            count: existing.length,
          },
          newState: Prisma.JsonNull,
          metadata: {
            reason: dto.reason || null,
          },
          performedBy,
        },
      });

      return existing;
    });

    // Invalidate cache
    await this.cacheService.invalidateUserCache(userId);

    return {
      success: true,
      removed: result.length,
      notFound: dto.permissionIds.length - result.length,
    };
  }

  /**
   * Update user permission priority
   */
  async updateUserPermissionPriority(
    userId: string,
    permissionId: string,
    dto: UpdateUserPermissionPriorityDto,
    performedBy: string,
  ) {
    const userPermission = await this.prisma.userPermission.findUnique({
      where: {
        userProfileId_permissionId: {
          userProfileId: userId,
          permissionId,
        },
      },
    });

    if (!userPermission) {
      throw new NotFoundException(
        `Permission assignment not found for user ${userId} and permission ${permissionId}`,
      );
    }

    // Record previous state
    const previousState = { ...userPermission };

    // Update priority
    const updated = await this.prisma.userPermission.update({
      where: { id: userPermission.id },
      data: {
        priority: dto.priority,
        updatedAt: new Date(),
      },
      include: {
        permission: true,
      },
    });

    // Invalidate cache
    await this.cacheService.invalidateUserCache(userId);

    // Record change in history
    await this.recordChangeHistory(
      'USER_PERMISSION',
      updated.id,
      'UPDATE_PRIORITY',
      previousState,
      updated,
      performedBy,
      {
        oldPriority: previousState.priority,
        newPriority: dto.priority,
        reason: dto.reason,
      },
    );

    return updated;
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
    metadata?: any,
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
        ...(metadata && { metadata }),
      },
    });
  }
}
