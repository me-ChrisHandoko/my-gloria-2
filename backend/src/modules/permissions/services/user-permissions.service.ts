import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { PrismaService } from '../../../core/database/prisma.service';
import { CacheService } from '../../../core/cache/cache.service';
import {
  GrantUserPermissionDto,
  BulkGrantUserPermissionsDto,
  UserPermissionResponseDto,
  QueryUserPermissionDto,
} from '../dto/user-permission.dto';

@Injectable()
export class UserPermissionsService {
  private readonly logger = new Logger(UserPermissionsService.name);
  private readonly cachePrefix = 'user-permission:';
  private readonly cacheTTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Grant direct permission to user
   */
  async grant(
    dto: GrantUserPermissionDto,
    grantedBy: string,
  ): Promise<UserPermissionResponseDto> {
    try {
      // Validate user exists
      const user = await this.prisma.userProfile.findUnique({
        where: { id: dto.userProfileId },
      });

      if (!user) {
        throw new NotFoundException(
          `User profile with ID ${dto.userProfileId} not found`,
        );
      }

      // Validate permission exists
      const permission = await this.prisma.permission.findUnique({
        where: { id: dto.permissionId },
      });

      if (!permission) {
        throw new NotFoundException(
          `Permission with ID ${dto.permissionId} not found`,
        );
      }

      // Check for existing permission with same resource context
      const existing = await this.prisma.userPermission.findFirst({
        where: {
          userProfileId: dto.userProfileId,
          permissionId: dto.permissionId,
          resourceType: dto.resourceType || null,
          resourceId: dto.resourceId || null,
        },
      });

      let userPermission;

      if (existing) {
        // Update existing permission
        userPermission = await this.prisma.userPermission.update({
          where: { id: existing.id },
          data: {
            isGranted: dto.isGranted ?? true,
            conditions: dto.conditions ? JSON.parse(dto.conditions) : undefined,
            grantedBy: grantedBy,
            grantReason: dto.grantReason,
            priority: dto.priority ?? 200,
            isTemporary: dto.isTemporary ?? false,
            effectiveFrom: dto.effectiveFrom
              ? new Date(dto.effectiveFrom)
              : new Date(),
            effectiveUntil: dto.effectiveUntil
              ? new Date(dto.effectiveUntil)
              : undefined,
            updatedAt: new Date(),
          },
          include: {
            userProfile: {
              select: { id: true, nip: true },
            },
            permission: {
              select: {
                id: true,
                code: true,
                name: true,
                resource: true,
                action: true,
                scope: true,
              },
            },
          },
        });
      } else {
        // Create new permission
        userPermission = await this.prisma.userPermission.create({
          data: {
            id: uuidv7(),
            userProfileId: dto.userProfileId,
            permissionId: dto.permissionId,
            isGranted: dto.isGranted ?? true,
            conditions: dto.conditions ? JSON.parse(dto.conditions) : undefined,
            grantedBy: grantedBy,
            grantReason: dto.grantReason,
            priority: dto.priority ?? 200,
            isTemporary: dto.isTemporary ?? false,
            resourceId: dto.resourceId,
            resourceType: dto.resourceType,
            effectiveFrom: dto.effectiveFrom
              ? new Date(dto.effectiveFrom)
              : new Date(),
            effectiveUntil: dto.effectiveUntil
              ? new Date(dto.effectiveUntil)
              : undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          include: {
            userProfile: {
              select: { id: true, nip: true },
            },
            permission: {
              select: {
                id: true,
                code: true,
                name: true,
                resource: true,
                action: true,
                scope: true,
              },
            },
          },
        });
      }

      // Invalidate cache
      await this.invalidateUserCache(dto.userProfileId);

      this.logger.log(
        `Granted permission ${permission.name} to user ${user.nip}`,
      );

      return this.formatUserPermissionResponse(userPermission);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to grant user permission: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to grant user permission');
    }
  }

  /**
   * Bulk grant permissions to user
   */
  async bulkGrant(
    dto: BulkGrantUserPermissionsDto,
    grantedBy: string,
  ): Promise<UserPermissionResponseDto[]> {
    const results: UserPermissionResponseDto[] = [];

    for (const permissionId of dto.permissionIds) {
      const grantDto: GrantUserPermissionDto = {
        userProfileId: dto.userProfileId,
        permissionId,
        isGranted: dto.isGranted,
        grantReason: dto.grantReason,
        isTemporary: dto.isTemporary,
      };

      const result = await this.grant(grantDto, grantedBy);
      results.push(result);
    }

    return results;
  }

  /**
   * Revoke permission from user
   */
  async revoke(
    userProfileId: string,
    permissionId: string,
    resourceType?: string,
    resourceId?: string,
  ): Promise<void> {
    const where: any = {
      userProfileId: userProfileId,
      permissionId: permissionId,
    };

    if (resourceType !== undefined) {
      where.resource_type = resourceType;
    }

    if (resourceId !== undefined) {
      where.resource_id = resourceId;
    }

    const userPermission = await this.prisma.userPermission.findFirst({
      where,
    });

    if (!userPermission) {
      throw new NotFoundException(`User permission not found`);
    }

    await this.prisma.userPermission.delete({
      where: { id: userPermission.id },
    });

    await this.invalidateUserCache(userProfileId);

    this.logger.log(
      `Revoked permission ${permissionId} from user ${userProfileId}`,
    );
  }

  /**
   * Get user's direct permissions
   */
  async getUserPermissions(
    userProfileId: string,
    query?: QueryUserPermissionDto,
  ): Promise<UserPermissionResponseDto[]> {
    const cacheKey = `${this.cachePrefix}user:${userProfileId}:${JSON.stringify(query || {})}`;
    const cached = await this.cache.get<UserPermissionResponseDto[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const where: any = {
      userProfileId: userProfileId,
    };

    // Apply filters
    if (query?.isGranted !== undefined) {
      where.isGranted = query.isGranted;
    }

    if (query?.resourceType) {
      where.resourceType = query.resourceType;
    }

    if (query?.resourceId) {
      where.resourceId = query.resourceId;
    }

    // Handle expired permissions
    if (!query?.includeExpired) {
      where.OR = [
        { effectiveUntil: null },
        { effectiveUntil: { gte: new Date() } },
      ];
    }

    // Handle denied permissions
    if (!query?.includeDenied) {
      where.isGranted = true;
    }

    const userPermissions = await this.prisma.userPermission.findMany({
      where,
      include: {
        userProfile: {
          select: { id: true, nip: true },
        },
        permission: {
          select: {
            id: true,
            code: true,
            name: true,
            resource: true,
            action: true,
            scope: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    const result = userPermissions.map((up) =>
      this.formatUserPermissionResponse(up),
    );

    await this.cache.set(cacheKey, result, this.cacheTTL);

    return result;
  }

  /**
   * Get specific user permission
   */
  async findOne(id: string): Promise<UserPermissionResponseDto> {
    const userPermission = await this.prisma.userPermission.findUnique({
      where: { id },
      include: {
        userProfile: {
          select: { id: true, nip: true },
        },
        permission: {
          select: {
            id: true,
            code: true,
            name: true,
            resource: true,
            action: true,
            scope: true,
          },
        },
      },
    });

    if (!userPermission) {
      throw new NotFoundException(`User permission with ID ${id} not found`);
    }

    return this.formatUserPermissionResponse(userPermission);
  }

  /**
   * Clean up expired temporary permissions
   */
  async cleanupExpiredPermissions(): Promise<number> {
    const result = await this.prisma.userPermission.deleteMany({
      where: {
        isTemporary: true,
        effectiveUntil: {
          lt: new Date(),
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired temporary permissions`);

    return result.count;
  }

  /**
   * Invalidate user permission cache
   */
  private async invalidateUserCache(userProfileId: string): Promise<void> {
    // Pattern-based cache deletion for all user permission queries
    const pattern = `${this.cachePrefix}user:${userProfileId}:*`;

    // Simple cache invalidation - delete specific user's permission cache
    await this.cache.del(`${this.cachePrefix}${userProfileId}`);

    this.logger.debug(`Invalidated permission cache for user ${userProfileId}`);
  }

  /**
   * Format user permission response
   */
  private formatUserPermissionResponse(
    userPermission: any,
  ): UserPermissionResponseDto {
    return {
      id: userPermission.id,
      userProfileId: userPermission.userProfileId,
      permissionId: userPermission.permissionId,
      isGranted: userPermission.isGranted,
      conditions: userPermission.conditions,
      grantedBy: userPermission.grantedBy,
      grantReason: userPermission.grantReason,
      priority: userPermission.priority,
      isTemporary: userPermission.isTemporary,
      resourceType: userPermission.resourceType,
      resourceId: userPermission.resourceId,
      effectiveFrom: userPermission.effectiveFrom,
      effectiveUntil: userPermission.effectiveUntil,
      createdAt: userPermission.createdAt,
      updatedAt: userPermission.updatedAt,
      userProfile: userPermission.userProfile
        ? {
            id: userPermission.userProfile.id,
            nip: userPermission.userProfile.nip,
          }
        : undefined,
      permission: userPermission.permission
        ? {
            id: userPermission.permission.id,
            code: userPermission.permission.code,
            name: userPermission.permission.name,
            resource: userPermission.permission.resource,
            action: userPermission.permission.action,
          }
        : undefined,
    };
  }
}
