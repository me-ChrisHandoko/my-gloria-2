import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import { PermissionCacheService } from './permission-cache.service';
import { v7 as uuidv7 } from 'uuid';
import {
  GrantResourcePermissionDto,
  UpdateResourcePermissionDto,
  CheckResourcePermissionDto,
  BulkGrantResourcePermissionDto,
  BulkRevokeResourcePermissionDto,
  GetUserResourcePermissionsDto,
  GetResourceAccessListDto,
  TransferResourcePermissionsDto,
} from '../dto/resource-permission.dto';

@Injectable()
export class ResourcePermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: PermissionCacheService,
  ) {}

  /**
   * Grant a resource-specific permission to a user
   */
  async grantResourcePermission(
    dto: GrantResourcePermissionDto,
    grantedBy: string,
  ) {
    // Validate user exists
    const user = await this.prisma.userProfile.findUnique({
      where: { id: dto.userProfileId },
    });
    if (!user) {
      throw new NotFoundException(
        `User with ID ${dto.userProfileId} not found`,
      );
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
        `Permission ${permission.code} is not active`,
      );
    }

    // Check for existing resource permission
    const existing = await this.prisma.resourcePermission.findFirst({
      where: {
        userProfileId: dto.userProfileId,
        permissionId: dto.permissionId,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Resource permission already exists for user ${dto.userProfileId} on ${dto.resourceType}:${dto.resourceId}`,
      );
    }

    // Validate date ranges
    if (dto.validFrom && dto.validUntil && dto.validFrom > dto.validUntil) {
      throw new BadRequestException('validFrom must be before validUntil');
    }

    // Create resource permission
    const resourcePermission = await this.prisma.resourcePermission.create({
      data: {
        id: uuidv7(),
        userProfileId: dto.userProfileId,
        permissionId: dto.permissionId,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        isGranted: dto.isGranted ?? true,
        validFrom: dto.validFrom,
        validUntil: dto.validUntil,
        grantReason: dto.grantReason,
        grantedBy,
      },
      include: {
        permission: true,
        userProfile: {
          select: { id: true },
        },
      },
    });

    // Invalidate user cache
    await this.cacheService.invalidateUserCache(dto.userProfileId);

    // Record change history
    await this.prisma.permissionChangeHistory.create({
      data: {
        id: uuidv7(),
        entityType: 'RESOURCE_PERMISSION',
        entityId: resourcePermission.id,
        operation: 'GRANT',
        previousState: Prisma.JsonNull,
        newState: {
          permissionId: dto.permissionId,
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          userProfileId: dto.userProfileId,
        },
        performedBy: grantedBy,
        metadata: {
          grantReason: dto.grantReason,
        },
      },
    });

    return {
      success: true,
      message: 'Resource permission granted successfully',
      data: resourcePermission,
    };
  }

  /**
   * Revoke a resource permission
   */
  async revokeResourcePermission(
    resourcePermissionId: string,
    reason: string,
    revokedBy: string,
  ) {
    const resourcePermission =
      await this.prisma.resourcePermission.findUnique({
        where: { id: resourcePermissionId },
        include: { permission: true },
      });

    if (!resourcePermission) {
      throw new NotFoundException(
        `Resource permission with ID ${resourcePermissionId} not found`,
      );
    }

    await this.prisma.resourcePermission.delete({
      where: { id: resourcePermissionId },
    });

    // Invalidate user cache
    await this.cacheService.invalidateUserCache(
      resourcePermission.userProfileId,
    );

    // Record change history
    await this.prisma.permissionChangeHistory.create({
      data: {
        id: uuidv7(),
        entityType: 'RESOURCE_PERMISSION',
        entityId: resourcePermissionId,
        operation: 'REVOKE',
        previousState: {
          permissionId: resourcePermission.permissionId,
          resourceType: resourcePermission.resourceType,
          resourceId: resourcePermission.resourceId,
          userProfileId: resourcePermission.userProfileId,
        },
        newState: Prisma.JsonNull,
        performedBy: revokedBy,
        metadata: {
          reason,
        },
      },
    });

    return {
      success: true,
      message: 'Resource permission revoked successfully',
    };
  }

  /**
   * Get all resource permissions for a user with filters and pagination
   */
  async getUserResourcePermissions(
    userId: string,
    filters: GetUserResourcePermissionsDto,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      userProfileId: userId,
    };

    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.permissionId) {
      where.permissionId = filters.permissionId;
    }

    if (filters.isGranted !== undefined) {
      where.isGranted = filters.isGranted;
    }

    if (filters.isActive !== undefined) {
      const now = new Date();
      if (filters.isActive) {
        where.AND = [
          {
            OR: [{ validFrom: null }, { validFrom: { lte: now } }],
          },
          {
            OR: [{ validUntil: null }, { validUntil: { gte: now } }],
          },
        ];
      } else {
        where.OR = [
          { validFrom: { gt: now } },
          { validUntil: { lt: now } },
        ];
      }
    }

    const [permissions, total] = await Promise.all([
      this.prisma.resourcePermission.findMany({
        where,
        include: {
          permission: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.resourcePermission.count({ where }),
    ]);

    return {
      data: permissions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a resource permission
   */
  async updateResourcePermission(
    resourcePermissionId: string,
    dto: UpdateResourcePermissionDto,
    updatedBy: string,
  ) {
    const existing = await this.prisma.resourcePermission.findUnique({
      where: { id: resourcePermissionId },
    });

    if (!existing) {
      throw new NotFoundException(
        `Resource permission with ID ${resourcePermissionId} not found`,
      );
    }

    // Validate date ranges if both provided
    if (dto.validFrom && dto.validUntil && dto.validFrom > dto.validUntil) {
      throw new BadRequestException('validFrom must be before validUntil');
    }

    const updated = await this.prisma.resourcePermission.update({
      where: { id: resourcePermissionId },
      data: {
        isGranted: dto.isGranted,
        validFrom: dto.validFrom,
        validUntil: dto.validUntil,
      },
      include: {
        permission: true,
        userProfile: {
          select: { id: true },
        },
      },
    });

    // Invalidate user cache
    await this.cacheService.invalidateUserCache(existing.userProfileId);

    // Record change history
    await this.prisma.permissionChangeHistory.create({
      data: {
        id: uuidv7(),
        entityType: 'RESOURCE_PERMISSION',
        entityId: resourcePermissionId,
        operation: 'UPDATE',
        previousState: {
          permissionId: existing.permissionId,
          resourceType: existing.resourceType,
          resourceId: existing.resourceId,
        },
        newState: dto as Prisma.InputJsonValue,
        performedBy: updatedBy,
        metadata: {
          reason: dto.reason || 'Resource permission updated',
        },
      },
    });

    return {
      success: true,
      message: 'Resource permission updated successfully',
      data: updated,
    };
  }

  /**
   * Check if user has specific resource permission
   */
  async checkResourcePermission(dto: CheckResourcePermissionDto) {
    const now = new Date();

    const resourcePermission = await this.prisma.resourcePermission.findFirst({
      where: {
        userProfileId: dto.userId,
        permissionId: dto.permissionId,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        isGranted: true,
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
      },
      include: {
        permission: true,
      },
    });

    const hasPermission = !!resourcePermission;

    // Conditions evaluation removed - not in schema
    const conditionsMet = true;

    // Log permission check
    await this.prisma.permissionCheckLog.create({
      data: {
        id: uuidv7(),
        userProfileId: dto.userId,
        resource: dto.resourceType,
        action: 'CHECK',
        resourceId: dto.resourceId,
        isAllowed: hasPermission && conditionsMet,
        deniedReason: hasPermission && conditionsMet ? null : 'Permission not found or conditions not met',
        checkDuration: 0,
        metadata: dto.context as Prisma.InputJsonValue,
      },
    });

    return {
      hasPermission: hasPermission && conditionsMet,
      resourcePermission: hasPermission ? resourcePermission : null,
      conditionsMet,
      evaluatedAt: new Date(),
    };
  }

  /**
   * Get all users with access to a specific resource
   */
  async getResourceAccessList(
    dto: GetResourceAccessListDto,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      resourceType: dto.resourceType,
      resourceId: dto.resourceId,
    };

    if (dto.permissionId) {
      where.permissionId = dto.permissionId;
    }

    if (dto.isGranted !== undefined) {
      where.isGranted = dto.isGranted;
    }

    const [permissions, total] = await Promise.all([
      this.prisma.resourcePermission.findMany({
        where,
        include: {
          permission: true,
          userProfile: {
            select: {
              id: true,
              nip: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.resourcePermission.count({ where }),
    ]);

    return {
      data: permissions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        totalUsers: total,
      },
    };
  }

  /**
   * Bulk grant resource permissions
   */
  async bulkGrantResourcePermissions(
    dto: BulkGrantResourcePermissionDto,
    grantedBy: string,
  ) {
    // Validate permission exists
    const permission = await this.prisma.permission.findUnique({
      where: { id: dto.permissionId },
    });
    if (!permission || !permission.isActive) {
      throw new BadRequestException('Permission not found or not active');
    }

    // Validate users exist
    const users = await this.prisma.userProfile.findMany({
      where: { id: { in: dto.userProfileIds } },
      select: { id: true },
    });
    if (users.length !== dto.userProfileIds.length) {
      throw new BadRequestException('One or more users not found');
    }

    // Validate date ranges
    if (dto.validFrom && dto.validUntil && dto.validFrom > dto.validUntil) {
      throw new BadRequestException('validFrom must be before validUntil');
    }

    // Check for existing permissions to avoid duplicates
    const existing = await this.prisma.resourcePermission.findMany({
      where: {
        userProfileId: { in: dto.userProfileIds },
        permissionId: dto.permissionId,
        resourceType: dto.resourceType,
        resourceId: { in: dto.resourceIds },
      },
      select: {
        userProfileId: true,
        resourceId: true,
      },
    });

    const existingSet = new Set(
      existing.map((e) => `${e.userProfileId}:${e.resourceId}`),
    );

    // Create permissions for all combinations that don't exist
    const permissionsToCreate: any[] = [];
    for (const userId of dto.userProfileIds) {
      for (const resourceId of dto.resourceIds) {
        const key = `${userId}:${resourceId}`;
        if (!existingSet.has(key)) {
          permissionsToCreate.push({
            id: uuidv7(),
            userProfileId: userId,
            permissionId: dto.permissionId,
            resourceType: dto.resourceType,
            resourceId,
            isGranted: dto.isGranted ?? true,
            validFrom: dto.validFrom,
            validUntil: dto.validUntil,
            grantReason: dto.grantReason,
            grantedBy,
          });
        }
      }
    }

    if (permissionsToCreate.length === 0) {
      return {
        success: true,
        message: 'All resource permissions already exist',
        created: 0,
        skipped: existing.length,
      };
    }

    // Bulk create in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.resourcePermission.createMany({
        data: permissionsToCreate,
      });

      // Record change history
      await tx.permissionChangeHistory.create({
        data: {
          id: uuidv7(),
          entityType: 'RESOURCE_PERMISSION',
          entityId: `bulk_${Date.now()}`,
          operation: 'BULK_GRANT',
          previousState: Prisma.JsonNull,
          newState: {
            permissionId: dto.permissionId,
            userProfileIds: dto.userProfileIds,
            resourceType: dto.resourceType,
            resourceIds: dto.resourceIds,
            created: created.count,
            skipped: existing.length,
          },
          performedBy: grantedBy,
          metadata: {
            grantReason: dto.grantReason,
          },
        },
      });

      return created;
    });

    // Invalidate caches for all affected users
    await Promise.all(
      dto.userProfileIds.map((userId) =>
        this.cacheService.invalidateUserCache(userId),
      ),
    );

    return {
      success: true,
      message: `Bulk granted ${result.count} resource permissions`,
      created: result.count,
      skipped: existing.length,
    };
  }

  /**
   * Bulk revoke resource permissions
   */
  async bulkRevokeResourcePermissions(
    dto: BulkRevokeResourcePermissionDto,
    revokedBy: string,
  ) {
    const deleted = await this.prisma.$transaction(async (tx) => {
      const result = await tx.resourcePermission.deleteMany({
        where: {
          userProfileId: { in: dto.userProfileIds },
          permissionId: dto.permissionId,
          resourceType: dto.resourceType,
          resourceId: { in: dto.resourceIds },
        },
      });

      // Record change history
      await tx.permissionChangeHistory.create({
        data: {
          id: uuidv7(),
          entityType: 'RESOURCE_PERMISSION',
          entityId: `bulk_${Date.now()}`,
          operation: 'BULK_REVOKE',
          previousState: {
            permissionId: dto.permissionId,
            userProfileIds: dto.userProfileIds,
            resourceType: dto.resourceType,
            resourceIds: dto.resourceIds,
          },
          newState: Prisma.JsonNull,
          performedBy: revokedBy,
          metadata: {
            reason: dto.reason,
            revoked: result.count,
          },
        },
      });

      return result;
    });

    // Invalidate caches for all affected users
    await Promise.all(
      dto.userProfileIds.map((userId) =>
        this.cacheService.invalidateUserCache(userId),
      ),
    );

    return {
      success: true,
      message: `Bulk revoked ${deleted.count} resource permissions`,
      revoked: deleted.count,
    };
  }

  /**
   * Transfer resource permissions from one user to another
   */
  async transferResourcePermissions(
    dto: TransferResourcePermissionsDto,
    transferredBy: string,
  ) {
    // Validate users exist
    const [fromUser, toUser] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { id: dto.fromUserId } }),
      this.prisma.userProfile.findUnique({ where: { id: dto.toUserId } }),
    ]);

    if (!fromUser) {
      throw new NotFoundException(`Source user ${dto.fromUserId} not found`);
    }
    if (!toUser) {
      throw new NotFoundException(`Target user ${dto.toUserId} not found`);
    }

    const where: any = {
      userProfileId: dto.fromUserId,
      resourceType: dto.resourceType,
    };

    if (dto.resourceIds && dto.resourceIds.length > 0) {
      where.resourceId = { in: dto.resourceIds };
    }

    // Get source permissions
    const sourcePermissions = await this.prisma.resourcePermission.findMany({
      where,
    });

    if (sourcePermissions.length === 0) {
      throw new NotFoundException(
        'No resource permissions found to transfer',
      );
    }

    // Check for conflicts in target user
    const existingTarget = await this.prisma.resourcePermission.findMany({
      where: {
        userProfileId: dto.toUserId,
        resourceType: dto.resourceType,
        resourceId: {
          in: sourcePermissions.map((p) => p.resourceId),
        },
      },
      select: { resourceId: true, permissionId: true },
    });

    const existingTargetSet = new Set(
      existingTarget.map((e) => `${e.permissionId}:${e.resourceId}`),
    );

    const result = await this.prisma.$transaction(async (tx) => {
      let transferred = 0;
      let skipped = 0;

      for (const sourcePerm of sourcePermissions) {
        const key = `${sourcePerm.permissionId}:${sourcePerm.resourceId}`;

        if (!existingTargetSet.has(key)) {
          // Create for target user
          await tx.resourcePermission.create({
            data: {
              id: uuidv7(),
              userProfileId: dto.toUserId,
              permissionId: sourcePerm.permissionId,
              resourceType: sourcePerm.resourceType,
              resourceId: sourcePerm.resourceId,
              isGranted: sourcePerm.isGranted,
              validFrom: sourcePerm.validFrom,
              validUntil: sourcePerm.validUntil,
              grantReason: dto.transferReason,
              grantedBy: transferredBy,
            },
          });
          transferred++;
        } else {
          skipped++;
        }

        // Revoke from source if requested
        if (dto.revokeFromSource !== false) {
          await tx.resourcePermission.delete({
            where: { id: sourcePerm.id },
          });
        }
      }

      // Record change history
      await tx.permissionChangeHistory.create({
        data: {
          id: uuidv7(),
          entityType: 'RESOURCE_PERMISSION',
          entityId: `transfer_${Date.now()}`,
          operation: 'TRANSFER',
          previousState: {
            fromUserId: dto.fromUserId,
          },
          newState: {
            toUserId: dto.toUserId,
            resourceType: dto.resourceType,
            resourceIds: dto.resourceIds,
            transferred,
            skipped,
          },
          performedBy: transferredBy,
          metadata: {
            transferReason: dto.transferReason,
            revokedFromSource: dto.revokeFromSource !== false,
          },
        },
      });

      return { transferred, skipped };
    });

    // Invalidate caches for both users
    await Promise.all([
      this.cacheService.invalidateUserCache(dto.fromUserId),
      this.cacheService.invalidateUserCache(dto.toUserId),
    ]);

    return {
      success: true,
      message: `Transferred ${result.transferred} resource permissions`,
      transferred: result.transferred,
      skipped: result.skipped,
      revokedFromSource: dto.revokeFromSource !== false,
    };
  }

  /**
   * Evaluate conditions against context
   * Simple equality check for MVP - can be enhanced with complex rules
   */
  private evaluateConditions(
    conditions: Record<string, any>,
    context: Record<string, any>,
  ): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      if (context[key] === undefined) {
        return false; // Required condition not present in context
      }

      // Simple equality check
      if (typeof value === 'object' && value !== null) {
        // Support for operators like { $gte: 100, $lte: 1000 }
        if (value.$gte !== undefined && context[key] < value.$gte) {
          return false;
        }
        if (value.$lte !== undefined && context[key] > value.$lte) {
          return false;
        }
        if (value.$gt !== undefined && context[key] <= value.$gt) {
          return false;
        }
        if (value.$lt !== undefined && context[key] >= value.$lt) {
          return false;
        }
        if (value.$eq !== undefined && context[key] !== value.$eq) {
          return false;
        }
      } else {
        // Direct equality
        if (context[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }
}
