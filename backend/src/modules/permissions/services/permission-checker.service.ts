import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CacheService } from '../../../core/cache/cache.service';
import { PermissionAction, PermissionScope } from '@prisma/client';
import {
  CheckPermissionDto,
  CheckPermissionResponseDto,
  BulkCheckPermissionsDto,
  BulkCheckPermissionsResponseDto,
} from '../dto/check-permission.dto';

interface UserPermission {
  id: string;
  resource: string;
  action: PermissionAction;
  scope: PermissionScope | null;
  source: string;
  priority: number;
  conditions?: any;
}

@Injectable()
export class PermissionCheckerService {
  private readonly logger = new Logger(PermissionCheckerService.name);
  private readonly cachePrefix = 'user-permission:';
  private readonly cacheTTL = 300; // 5 minutes

  // Scope hierarchy: OWN < DEPARTMENT < SCHOOL < ALL
  private readonly scopeHierarchy: Record<PermissionScope, number> = {
    [PermissionScope.OWN]: 1,
    [PermissionScope.DEPARTMENT]: 2,
    [PermissionScope.SCHOOL]: 3,
    [PermissionScope.ALL]: 4,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async checkPermission(
    dto: CheckPermissionDto,
  ): Promise<CheckPermissionResponseDto> {
    const startTime = Date.now();

    try {
      const userPermissions = await this.getUserPermissions(dto.userProfileId);

      // Filter permissions matching resource and action
      const matchingPermissions = userPermissions.filter(
        (p) => p.resource === dto.resource && p.action === dto.action,
      );

      if (matchingPermissions.length === 0) {
        return {
          hasPermission: false,
          sources: [],
          reason: 'No matching permission found',
          checkedAt: new Date(),
        };
      }

      // Find the permission with the highest scope
      const effectivePermission = this.getEffectivePermission(
        matchingPermissions,
        dto.scope,
      );

      if (!effectivePermission) {
        return {
          hasPermission: false,
          sources: matchingPermissions.map((p) => p.source),
          reason: `Insufficient scope. Required: ${dto.scope}, Available: ${matchingPermissions.map((p) => p.scope).join(', ')}`,
          checkedAt: new Date(),
        };
      }

      // Check resource-specific conditions if resourceId provided
      if (dto.resourceId && effectivePermission.conditions) {
        const conditionsMet = this.evaluateConditions(
          effectivePermission.conditions,
          dto,
        );

        if (!conditionsMet) {
          return {
            hasPermission: false,
            sources: [effectivePermission.source],
            reason: 'Permission conditions not met',
            checkedAt: new Date(),
          };
        }
      }

      const duration = Date.now() - startTime;
      this.logger.debug(
        `Permission check for ${dto.userProfileId}:${dto.resource}:${dto.action} completed in ${duration}ms`,
      );

      return {
        hasPermission: true,
        sources: [effectivePermission.source],
        effectiveScope: effectivePermission.scope || undefined,
        checkedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Permission check failed: ${error.message}`,
        error.stack,
      );
      return {
        hasPermission: false,
        sources: [],
        reason: 'Permission check error',
        checkedAt: new Date(),
      };
    }
  }

  async checkMultiplePermissions(
    dto: BulkCheckPermissionsDto,
  ): Promise<BulkCheckPermissionsResponseDto> {
    const results: Record<string, CheckPermissionResponseDto> = {};

    for (const permission of dto.permissions) {
      const key = `${permission.resource}:${permission.action}${permission.scope ? `:${permission.scope}` : ''}`;

      results[key] = await this.checkPermission({
        userProfileId: dto.userProfileId,
        ...permission,
      });
    }

    return {
      results,
      checkedAt: new Date(),
    };
  }

  async getUserPermissions(userProfileId: string): Promise<UserPermission[]> {
    const cacheKey = `${this.cachePrefix}${userProfileId}`;
    const cached = await this.cache.get<UserPermission[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const permissions: UserPermission[] = [];

    // 1. Get direct user permissions (highest priority)
    const userDirectPermissions = await this.prisma.userPermission.findMany({
      where: {
        userProfileId: userProfileId,
        isGranted: true,
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
      },
      include: {
        permission: true,
      },
    });

    for (const up of userDirectPermissions) {
      permissions.push({
        id: up.permission.id,
        resource: up.permission.resource,
        action: up.permission.action,
        scope: up.permission.scope,
        source: `direct:user_permission:${up.id}`,
        priority: up.priority || 200,
        conditions: up.conditions,
      });
    }

    // 2. Get role permissions (via user roles)
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userProfileId: userProfileId,
        isActive: true,
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              where: {
                isGranted: true,
                effectiveFrom: { lte: new Date() },
                OR: [
                  { effectiveUntil: null },
                  { effectiveUntil: { gte: new Date() } },
                ],
              },
              include: {
                permission: true,
              },
            },
          },
        },
      },
      orderBy: {
        role: {
          hierarchyLevel: 'desc',
        },
      },
    });

    for (const ur of userRoles) {
      for (const rp of ur.role.rolePermissions) {
        permissions.push({
          id: rp.permission.id,
          resource: rp.permission.resource,
          action: rp.permission.action,
          scope: rp.permission.scope,
          source: `role:${ur.role.code}:${rp.id}`,
          priority: 100 + ur.role.hierarchyLevel,
          conditions: rp.conditions,
        });
      }
    }

    // 3. Get position permissions (via user positions)
    // Note: This requires position_permissions table which may not exist yet
    // Implement when position permissions are added in later phases

    // Cache the results
    await this.cache.set(cacheKey, permissions, this.cacheTTL);

    return permissions;
  }

  async getUserEffectiveScope(
    userProfileId: string,
    resource: string,
    action: PermissionAction,
  ): Promise<PermissionScope | null> {
    const userPermissions = await this.getUserPermissions(userProfileId);

    const matchingPermissions = userPermissions.filter(
      (p) => p.resource === resource && p.action === action,
    );

    if (matchingPermissions.length === 0) {
      return null;
    }

    // Find the highest scope
    let highestScope: PermissionScope | null = null;
    let highestScopeLevel = 0;

    for (const permission of matchingPermissions) {
      if (permission.scope) {
        const scopeLevel = this.scopeHierarchy[permission.scope];
        if (scopeLevel > highestScopeLevel) {
          highestScopeLevel = scopeLevel;
          highestScope = permission.scope;
        }
      }
    }

    return highestScope;
  }

  async invalidateUserPermissions(userProfileId: string): Promise<void> {
    await this.cache.del(`${this.cachePrefix}${userProfileId}`);
    this.logger.debug(`Invalidated permission cache for user ${userProfileId}`);
  }

  private getEffectivePermission(
    permissions: UserPermission[],
    requiredScope?: PermissionScope,
  ): UserPermission | null {
    if (!requiredScope) {
      // If no specific scope required, return the permission with highest priority
      return permissions.reduce((prev, current) =>
        current.priority > prev.priority ? current : prev,
      );
    }

    // Filter permissions that meet or exceed the required scope
    const requiredScopeLevel = this.scopeHierarchy[requiredScope];

    const eligiblePermissions = permissions.filter((p) => {
      if (!p.scope) return false;
      const permissionScopeLevel = this.scopeHierarchy[p.scope];
      return permissionScopeLevel >= requiredScopeLevel;
    });

    if (eligiblePermissions.length === 0) {
      return null;
    }

    // Return the permission with highest priority among eligible ones
    return eligiblePermissions.reduce((prev, current) =>
      current.priority > prev.priority ? current : prev,
    );
  }

  private evaluateConditions(
    conditions: any,
    context: CheckPermissionDto,
  ): boolean {
    // Simple condition evaluation
    // This can be expanded based on specific business logic

    if (!conditions || typeof conditions !== 'object') {
      return true;
    }

    // Example: Check if resource type matches
    if (conditions.resourceType && context.resourceType) {
      if (conditions.resourceType !== context.resourceType) {
        return false;
      }
    }

    // Example: Check if resource ID matches
    if (conditions.resourceIds && context.resourceId) {
      if (Array.isArray(conditions.resourceIds)) {
        if (!conditions.resourceIds.includes(context.resourceId)) {
          return false;
        }
      }
    }

    return true;
  }
}
