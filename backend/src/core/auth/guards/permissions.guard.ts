import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { v7 as uuidv7 } from 'uuid';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { LoggingService } from '../../logging/logging.service';
import {
  PERMISSIONS_KEY,
  RequiredPermissionData,
  PermissionAction,
  PermissionScope,
} from '../decorators/permissions.decorator';

interface UserContext {
  id: string;
  clerkUserId: string;
  schoolId?: string;
  departmentId?: string;
  positionId?: string;
  roles?: Array<{ id: string; name: string }>;
}

interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  checkedPermissions?: Array<{
    resource: string;
    action: string;
    scope: string;
    allowed: boolean;
  }>;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly loggingService: LoggingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<
      RequiredPermissionData[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as UserContext;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // ✅ SUPERADMIN BYPASS: Users with hierarchy level 0 can do anything
    const userHasLevel0 = await this.checkHierarchyLevel0(user.id);
    if (userHasLevel0) {
      this.logger.debug(
        `User ${user.id} has hierarchy level 0 - bypassing permission check`,
      );
      return true;
    }

    // Check each required permission
    const results = await Promise.all(
      requiredPermissions.map((permission) =>
        this.checkPermission(user, permission, request),
      ),
    );

    const allowed = results.every((result) => result.allowed);

    // Log permission check
    await this.logPermissionCheck(user, requiredPermissions, results, allowed);

    if (!allowed) {
      const deniedPermissions = results
        .filter((r) => !r.allowed)
        .map((r) => r.reason)
        .join(', ');

      throw new ForbiddenException(
        `Insufficient permissions: ${deniedPermissions}`,
      );
    }

    return true;
  }

  private async checkPermission(
    user: UserContext,
    permission: RequiredPermissionData,
    request: any,
  ): Promise<PermissionCheckResult> {
    const cacheKey = this.generateCacheKey(user.id, permission);

    // Try to get from cache first
    const cached = await this.cacheService.get<PermissionCheckResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Check multiple permission sources in order of precedence
    const result = await this.performPermissionCheck(user, permission, request);

    // Cache the result for 5 minutes
    await this.cacheService.set(cacheKey, result, 300);

    return result;
  }

  private async performPermissionCheck(
    user: UserContext,
    permission: RequiredPermissionData,
    request: any,
  ): Promise<PermissionCheckResult> {
    // 1. Check user override permissions (highest priority)
    const userOverride = await this.checkUserOverride(user.id, permission);
    if (userOverride !== null) {
      return {
        allowed: userOverride,
        reason: userOverride
          ? 'Allowed by user override'
          : `Denied by user override for ${permission.resource}:${permission.action}`,
      };
    }

    // 2. Check direct user permissions
    const directPermission = await this.checkDirectUserPermission(
      user.id,
      permission,
    );
    if (directPermission) {
      return {
        allowed: true,
        reason: 'Allowed by direct user permission',
      };
    }

    // 3. Check role-based permissions
    const rolePermission = await this.checkRolePermissions(user.id, permission);
    if (rolePermission) {
      return {
        allowed: true,
        reason: 'Allowed by role permission',
      };
    }

    // 4. Check position-based permissions
    const positionPermission = await this.checkPositionPermissions(
      user,
      permission,
    );
    if (positionPermission) {
      return {
        allowed: true,
        reason: 'Allowed by position permission',
      };
    }

    // 5. Check scope-based permissions
    if (permission.scope) {
      const scopePermission = await this.checkScopePermission(
        user,
        permission,
        request,
      );
      if (scopePermission) {
        return {
          allowed: true,
          reason: `Allowed by ${permission.scope} scope`,
        };
      }
    }

    return {
      allowed: false,
      reason: `No permission for ${permission.resource}:${permission.action}`,
    };
  }

  private async checkUserOverride(
    userId: string,
    permission: RequiredPermissionData,
  ): Promise<boolean | null> {
    const override = await this.prisma.userOverride.findFirst({
      where: {
        userProfileId: userId,
        moduleId: permission.resource,
        permissionType: permission.action as any,
        OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
      },
    });

    if (!override) return null;
    return override.isGranted;
  }

  private async checkDirectUserPermission(
    userId: string,
    permission: RequiredPermissionData,
  ): Promise<boolean> {
    const userPermission = await this.prisma.userPermission.findFirst({
      where: {
        userProfileId: userId,
        permission: {
          resource: permission.resource,
          action: permission.action as any,
          isActive: true,
        },
        isGranted: true,
      },
    });

    return !!userPermission;
  }

  private async checkRolePermissions(
    userId: string,
    permission: RequiredPermissionData,
  ): Promise<boolean> {
    const rolePermissions = await this.prisma.userRole.findMany({
      where: {
        userProfileId: userId,
        isActive: true,
        role: {
          isActive: true,
        },
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              where: {
                isGranted: true,
                permission: {
                  resource: permission.resource,
                  action: permission.action as any,
                  isActive: true,
                },
              },
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    return rolePermissions.some((ur: any) =>
      ur.role.rolePermissions.some((rp: any) => {
        if (!permission.scope || !rp.permission.scope) {
          return true;
        }
        return this.isScopeSufficient(rp.permission.scope, permission.scope);
      }),
    );
  }

  private async checkPositionPermissions(
    user: UserContext,
    permission: RequiredPermissionData,
  ): Promise<boolean> {
    // Position-based permissions are not directly implemented in the current schema
    // Positions can inherit permissions through roles assigned to positions
    // This is a placeholder for future implementation
    return false;
  }

  private async checkParentPositionPermissions(
    parentId: string,
    permission: RequiredPermissionData,
  ): Promise<boolean> {
    // Position hierarchy permissions not directly implemented in current schema
    // This is a placeholder for future implementation
    return false;
  }

  private async checkScopePermission(
    user: UserContext,
    permission: RequiredPermissionData,
    request: any,
  ): Promise<boolean> {
    const scope = permission.scope || PermissionScope.OWN;
    const resourceId = this.extractResourceId(request, permission.resource);

    switch (scope) {
      case PermissionScope.OWN:
        return this.checkOwnScope(user.id, permission.resource, resourceId);

      case PermissionScope.DEPARTMENT:
        return this.checkDepartmentScope(
          user.departmentId,
          permission.resource,
          resourceId,
        );

      case PermissionScope.SCHOOL:
        return this.checkSchoolScope(
          user.schoolId,
          permission.resource,
          resourceId,
        );

      case PermissionScope.ALL:
        // ALL scope means no restrictions
        return true;

      default:
        return false;
    }
  }

  private async checkOwnScope(
    userId: string,
    resource: string,
    resourceId?: string,
  ): Promise<boolean> {
    if (!resourceId) return false;

    // Check if the user owns the resource
    // This is resource-specific logic
    switch (resource.toLowerCase()) {
      case 'user':
      case 'userprofile':
        return resourceId === userId;

      case 'workflow':
        // WorkflowInstance doesn't have initiatorId in current schema
        // This would need to be implemented based on actual business logic
        return false;

      case 'document':
        // Document model doesn't exist in current schema
        // This would need to be implemented when Document model is added
        return false;

      default:
        // For other resources, check if there's a userId field
        return false;
    }
  }

  private async checkDepartmentScope(
    userDepartmentId: string | undefined,
    resource: string,
    resourceId?: string,
  ): Promise<boolean> {
    if (!userDepartmentId || !resourceId) return false;

    // Check if the resource belongs to the same department
    switch (resource.toLowerCase()) {
      case 'user':
      case 'userprofile':
        const user = await this.prisma.userProfile.findUnique({
          where: { id: resourceId },
          include: {
            positions: {
              include: {
                position: true,
              },
            },
          },
        });
        return (
          user?.positions.some(
            (p) => p.position.departmentId === userDepartmentId,
          ) || false
        );

      default:
        return false;
    }
  }

  private async checkSchoolScope(
    userSchoolId: string | undefined,
    resource: string,
    resourceId?: string,
  ): Promise<boolean> {
    if (!userSchoolId || !resourceId) return false;

    // Check if the resource belongs to the same school
    switch (resource.toLowerCase()) {
      case 'user':
      case 'userprofile':
        const user = await this.prisma.userProfile.findUnique({
          where: { id: resourceId },
          include: {
            positions: {
              include: {
                position: {
                  include: {
                    department: true,
                  },
                },
              },
            },
          },
        });
        return (
          user?.positions.some(
            (p) => p.position.department?.schoolId === userSchoolId,
          ) || false
        );

      case 'department':
        const department = await this.prisma.department.findUnique({
          where: { id: resourceId },
        });
        return department?.schoolId === userSchoolId;

      default:
        return false;
    }
  }

  private isScopeSufficient(
    availableScope: string,
    requiredScope: string,
  ): boolean {
    const scopeHierarchy = {
      [PermissionScope.ALL]: 4,
      [PermissionScope.SCHOOL]: 3,
      [PermissionScope.DEPARTMENT]: 2,
      [PermissionScope.OWN]: 1,
    };

    const availableLevel = scopeHierarchy[availableScope] || 0;
    const requiredLevel = scopeHierarchy[requiredScope] || 0;

    return availableLevel >= requiredLevel;
  }

  private extractResourceId(
    request: any,
    resource: string,
  ): string | undefined {
    // Try to extract resource ID from various places in the request
    return (
      request.params?.id ||
      request.params?.[`${resource}Id`] ||
      request.body?.id ||
      request.body?.[`${resource}Id`] ||
      request.query?.id ||
      request.query?.[`${resource}Id`]
    );
  }

  private generateCacheKey(
    userId: string,
    permission: RequiredPermissionData,
  ): string {
    return this.cacheService.generateKey('permission', {
      prefix: 'check',
      params: {
        userId,
        resource: permission.resource,
        action: permission.action,
        scope: permission.scope || 'none',
      },
    });
  }

  private async logPermissionCheck(
    user: UserContext,
    requiredPermissions: RequiredPermissionData[],
    results: PermissionCheckResult[],
    allowed: boolean,
  ): Promise<void> {
    try {
      await this.prisma.permissionCheckLog.create({
        data: {
          id: uuidv7(),
          userProfileId: user.id,
          resource: requiredPermissions[0]?.resource || 'unknown',
          action: requiredPermissions[0]?.action || 'unknown',
          isAllowed: allowed,
          checkDuration: 0,
          metadata: {
            checkedPermissions: requiredPermissions.map((p, i) => ({
              resource: p.resource,
              action: p.action,
              scope: p.scope || 'none',
              allowed: results[i]?.allowed || false,
              reason: results[i]?.reason || '',
            })),
            schoolId: user.schoolId,
            departmentId: user.departmentId,
            positionId: user.positionId,
          },
        },
      });

      if (!allowed) {
        this.loggingService.logSecurity(
          `Permission denied for ${user.id}`,
          'medium',
          {
            userId: user.id,
            permissions: requiredPermissions,
          },
        );
      }
    } catch (error) {
      this.logger.error('Failed to log permission check:', error);
    }
  }

  async invalidateUserPermissionCache(userId: string): Promise<void> {
    const pattern = `permission:check:${userId}:*`;
    await this.cacheService.invalidatePattern(pattern);
    this.logger.debug(`Invalidated permission cache for user ${userId}`);
  }

  async invalidateAllPermissionCache(): Promise<void> {
    const pattern = 'permission:check:*';
    await this.cacheService.invalidatePattern(pattern);
    this.logger.debug('Invalidated all permission cache');
  }

  /**
   * Check if user has hierarchy level 0 (superadmin)
   * Users with level 0 bypass all permission checks
   */
  private async checkHierarchyLevel0(userId: string): Promise<boolean> {
    const cacheKey = this.cacheService.generateKey('hierarchy', {
      prefix: 'level0',
      params: { userId },
    });

    // Try cache first
    const cached = await this.cacheService.get<boolean>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Check if user has any role with hierarchyLevel = 0
    const level0Role = await this.prisma.userRole.findFirst({
      where: {
        userProfileId: userId,
        isActive: true,
        role: {
          hierarchyLevel: 0,
          isActive: true,
        },
      },
    });

    const hasLevel0 = !!level0Role;

    // Cache for 10 minutes
    await this.cacheService.set(cacheKey, hasLevel0, 600);

    return hasLevel0;
  }
}
