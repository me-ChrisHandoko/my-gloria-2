import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import {
  Permission,
  PermissionAction,
  PermissionScope,
  UserRole,
  RolePermission,
  UserPermission,
  UserPosition,
  Position,
  ResourcePermission,
  PermissionDelegation,
} from '@prisma/client';
import {
  IPermissionCheck,
  IPermissionResult,
  IComputedPermissions,
} from '../interfaces/permission.interface';

@Injectable()
export class PermissionCalculationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Check if user has specific permission
   */
  async checkPermission(check: IPermissionCheck): Promise<IPermissionResult> {
    try {
      // Check direct user permissions first (highest priority)
      const directPermission = await this.checkDirectPermission(check);
      if (directPermission) {
        return directPermission;
      }

      // Check delegated permissions
      const delegatedPermission = await this.checkDelegatedPermission(check);
      if (delegatedPermission) {
        return delegatedPermission;
      }

      // Check resource-specific permissions
      if (check.resourceId) {
        const resourcePermission = await this.checkResourcePermission(check);
        if (resourcePermission) {
          return resourcePermission;
        }
      }

      // Check role-based permissions
      const rolePermission = await this.checkRolePermission(check);
      if (rolePermission) {
        return rolePermission;
      }

      // Check position-based permissions
      const positionPermission = await this.checkPositionPermission(check);
      if (positionPermission) {
        return positionPermission;
      }

      // No permission found
      return {
        hasPermission: false,
        reason: 'No matching permission found',
      };
    } catch (error) {
      this.logger.error(
        `Error checking permission for user ${check.userId}`,
        error.stack,
        'PermissionCalculationService',
      );
      throw error;
    }
  }

  /**
   * Check direct user permissions
   */
  private async checkDirectPermission(
    check: IPermissionCheck,
  ): Promise<IPermissionResult | null> {
    const userPermission = await this.prisma.userPermission.findFirst({
      where: {
        userProfileId: check.userId,
        permission: {
          resource: check.resource,
          action: check.action,
          scope: check.scope || null,
        },
        isGranted: true,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      include: {
        permission: true,
      },
      orderBy: {
        priority: 'desc', // Higher priority first
      },
    });

    if (userPermission) {
      // Evaluate conditions if present
      if (userPermission.conditions && check.context) {
        const conditionsMet = this.evaluateConditions(
          userPermission.conditions,
          check.context,
        );
        if (!conditionsMet) {
          return null;
        }
      }

      return {
        hasPermission: true,
        permission: userPermission.permission,
        source: 'direct',
        conditions: userPermission.conditions,
        validUntil: userPermission.validUntil,
        reason: `Direct permission: ${userPermission.permission.code}`,
      };
    }

    return null;
  }

  /**
   * Check delegated permissions
   */
  private async checkDelegatedPermission(
    check: IPermissionCheck,
  ): Promise<IPermissionResult | null> {
    const delegations = await this.prisma.permissionDelegation.findMany({
      where: {
        delegateId: check.userId,
        isRevoked: false,
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() },
      },
    });

    for (const delegation of delegations) {
      const permissions = delegation.permissions as any[];
      const matchingPermission = permissions?.find(
        (p) =>
          p.resource === check.resource &&
          p.action === check.action &&
          (!check.scope || p.scope === check.scope),
      );

      if (matchingPermission) {
        return {
          hasPermission: true,
          source: 'delegation',
          validUntil: delegation.validUntil,
          reason: `Delegated permission from ${delegation.delegatorId}`,
        };
      }
    }

    return null;
  }

  /**
   * Check resource-specific permissions
   */
  private async checkResourcePermission(
    check: IPermissionCheck,
  ): Promise<IPermissionResult | null> {
    if (!check.resourceId) {
      return null;
    }

    const resourcePermission = await this.prisma.resourcePermission.findFirst({
      where: {
        userProfileId: check.userId,
        resourceType: check.resource,
        resourceId: check.resourceId,
        permission: {
          action: check.action,
        },
        isGranted: true,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      include: {
        permission: true,
      },
    });

    if (resourcePermission) {
      return {
        hasPermission: true,
        permission: resourcePermission.permission,
        source: 'resource',
        validUntil: resourcePermission.validUntil,
        reason: `Resource-specific permission for ${check.resourceId}`,
      };
    }

    return null;
  }

  /**
   * Check role-based permissions
   */
  private async checkRolePermission(
    check: IPermissionCheck,
  ): Promise<IPermissionResult | null> {
    // Get user's active roles
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userProfileId: check.userId,
        isActive: true,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              where: {
                isGranted: true,
                OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
              },
              include: {
                permission: true,
              },
            },
            parentRoles: {
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
        },
      },
      orderBy: {
        role: {
          hierarchyLevel: 'asc', // Higher level roles first
        },
      },
    });

    for (const userRole of userRoles) {
      // Check direct role permissions
      const rolePermission = userRole.role.rolePermissions.find(
        (rp) =>
          rp.permission.resource === check.resource &&
          rp.permission.action === check.action &&
          (!check.scope ||
            rp.permission.scope === check.scope ||
            this.isScopeSufficient(rp.permission.scope, check.scope)),
      );

      if (rolePermission) {
        // Evaluate conditions if present
        if (rolePermission.conditions && check.context) {
          const conditionsMet = this.evaluateConditions(
            rolePermission.conditions,
            check.context,
          );
          if (!conditionsMet) {
            continue;
          }
        }

        return {
          hasPermission: true,
          permission: rolePermission.permission,
          source: 'role',
          conditions: rolePermission.conditions,
          validUntil: this.getEarliestExpiry(
            userRole.validUntil,
            rolePermission.validUntil,
          ),
          reason: `Role permission from ${userRole.role.name}`,
        };
      }

      // Check inherited permissions from parent roles
      for (const parentRelation of userRole.role.parentRoles) {
        if (!parentRelation.inheritPermissions) {
          continue;
        }

        const parentPermission = parentRelation.parentRole.rolePermissions.find(
          (rp) =>
            rp.permission.resource === check.resource &&
            rp.permission.action === check.action &&
            (!check.scope ||
              rp.permission.scope === check.scope ||
              this.isScopeSufficient(rp.permission.scope, check.scope)),
        );

        if (parentPermission) {
          // Evaluate conditions if present
          if (parentPermission.conditions && check.context) {
            const conditionsMet = this.evaluateConditions(
              parentPermission.conditions,
              check.context,
            );
            if (!conditionsMet) {
              continue;
            }
          }

          return {
            hasPermission: true,
            permission: parentPermission.permission,
            source: 'role',
            conditions: parentPermission.conditions,
            validUntil: this.getEarliestExpiry(
              userRole.validUntil,
              parentPermission.validUntil,
            ),
            reason: `Inherited permission from parent role ${parentRelation.parentRole.name}`,
          };
        }
      }
    }

    return null;
  }

  /**
   * Check position-based permissions
   */
  private async checkPositionPermission(
    check: IPermissionCheck,
  ): Promise<IPermissionResult | null> {
    // Get user's active positions
    const userPositions = await this.prisma.userPosition.findMany({
      where: {
        userProfileId: check.userId,
        isActive: true,
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      include: {
        position: {
          include: {
            department: {
              include: {
                school: true,
              },
            },
          },
        },
      },
    });

    for (const userPosition of userPositions) {
      // Check if position has permission scope
      const scopeMatch = this.checkPositionScope(
        userPosition,
        check.scope,
        check.context,
      );

      if (scopeMatch) {
        // Look for permission based on position hierarchy
        const permission = await this.findPositionPermission(
          userPosition.position,
          check.resource,
          check.action,
        );

        if (permission) {
          return {
            hasPermission: true,
            permission,
            source: 'position',
            validUntil: userPosition.endDate,
            reason: `Position permission from ${userPosition.position.name}`,
          };
        }
      }
    }

    return null;
  }

  /**
   * Find permission based on position hierarchy
   */
  private async findPositionPermission(
    position: Position,
    resource: string,
    action: PermissionAction,
  ): Promise<Permission | null> {
    // This is a simplified implementation
    // In production, you might want to have a PositionPermission table
    // or derive permissions based on position hierarchy level

    // Check if position has high enough hierarchy level for the action
    const requiredLevel = this.getRequiredHierarchyLevel(action);
    if (position.hierarchyLevel <= requiredLevel) {
      const permission = await this.prisma.permission.findFirst({
        where: {
          resource,
          action,
          isActive: true,
        },
      });
      return permission;
    }

    return null;
  }

  /**
   * Get required hierarchy level for action
   */
  private getRequiredHierarchyLevel(action: PermissionAction): number {
    const levelMap: Partial<Record<PermissionAction, number>> = {
      [PermissionAction.READ]: 10,
      [PermissionAction.CREATE]: 5,
      [PermissionAction.UPDATE]: 5,
      [PermissionAction.DELETE]: 3,
      [PermissionAction.APPROVE]: 2,
      [PermissionAction.EXPORT]: 4,
      [PermissionAction.IMPORT]: 3,
      [PermissionAction.PRINT]: 5,
      [PermissionAction.ASSIGN]: 3,
      [PermissionAction.CLOSE]: 4,
    };

    return levelMap[action] || 5;
  }

  /**
   * Check if position scope matches requested scope
   */
  private checkPositionScope(
    userPosition: any,
    requestedScope: PermissionScope | undefined,
    context: Record<string, any> | undefined,
  ): boolean {
    if (!requestedScope) {
      return true;
    }

    // Position-based scope hierarchy
    const positionScope =
      userPosition.permissionScope || PermissionScope.DEPARTMENT;

    return this.isScopeSufficient(positionScope, requestedScope);
  }

  /**
   * Check if user scope is sufficient for requested scope
   */
  private isScopeSufficient(
    userScope: PermissionScope | null,
    requestedScope: PermissionScope,
  ): boolean {
    if (!userScope) {
      return false;
    }

    const scopeHierarchy = {
      [PermissionScope.OWN]: 1,
      [PermissionScope.DEPARTMENT]: 2,
      [PermissionScope.SCHOOL]: 3,
      [PermissionScope.ALL]: 4,
    };

    return scopeHierarchy[userScope] >= scopeHierarchy[requestedScope];
  }

  /**
   * Evaluate permission conditions
   */
  private evaluateConditions(
    conditions: any,
    context: Record<string, any>,
  ): boolean {
    if (!conditions || typeof conditions !== 'object') {
      return true;
    }

    // Simple condition evaluation
    // In production, you might want to use a more sophisticated rules engine
    for (const [key, value] of Object.entries(conditions)) {
      const contextValue = context[key];

      if (typeof value === 'object' && value !== null) {
        // Handle complex conditions
        const operator = Object.keys(value)[0];
        const expectedValue = (value as any)[operator];

        switch (operator) {
          case 'eq':
            if (contextValue !== expectedValue) return false;
            break;
          case 'neq':
            if (contextValue === expectedValue) return false;
            break;
          case 'gt':
            if (contextValue <= expectedValue) return false;
            break;
          case 'gte':
            if (contextValue < expectedValue) return false;
            break;
          case 'lt':
            if (contextValue >= expectedValue) return false;
            break;
          case 'lte':
            if (contextValue > expectedValue) return false;
            break;
          case 'in':
            if (!expectedValue.includes(contextValue)) return false;
            break;
          case 'nin':
            if (expectedValue.includes(contextValue)) return false;
            break;
          case 'contains':
            if (!contextValue?.includes(expectedValue)) return false;
            break;
          default:
            return false;
        }
      } else {
        // Simple equality check
        if (contextValue !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<IComputedPermissions> {
    try {
      const permissions: IPermissionResult[] = [];
      const processedPermissions = new Set<string>();

      // Get direct user permissions
      const userPermissions = await this.prisma.userPermission.findMany({
        where: {
          userProfileId: userId,
          isGranted: true,
          OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
        },
        include: {
          permission: true,
        },
      });

      for (const up of userPermissions) {
        const key = `${up.permission.resource}-${up.permission.action}-${up.permission.scope}`;
        if (!processedPermissions.has(key)) {
          processedPermissions.add(key);
          permissions.push({
            hasPermission: true,
            permission: up.permission,
            source: 'direct',
            conditions: up.conditions,
            validUntil: up.validUntil,
          });
        }
      }

      // Get role-based permissions
      const userRoles = await this.prisma.userRole.findMany({
        where: {
          userProfileId: userId,
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
      });

      for (const userRole of userRoles) {
        for (const rp of userRole.role.rolePermissions) {
          const key = `${rp.permission.resource}-${rp.permission.action}-${rp.permission.scope}`;
          if (!processedPermissions.has(key)) {
            processedPermissions.add(key);
            permissions.push({
              hasPermission: true,
              permission: rp.permission,
              source: 'role',
              conditions: rp.conditions,
              validUntil: this.getEarliestExpiry(
                userRole.validUntil,
                rp.validUntil,
              ),
            });
          }
        }
      }

      const computedAt = new Date();
      const expiresAt = new Date(computedAt.getTime() + 3600000); // 1 hour cache

      return {
        userId,
        permissions,
        computedAt,
        expiresAt,
        cacheKey: `permissions:${userId}:${computedAt.getTime()}`,
      };
    } catch (error) {
      this.logger.error(
        `Error computing permissions for user ${userId}`,
        error.stack,
        'PermissionCalculationService',
      );
      throw error;
    }
  }

  /**
   * Get earliest expiry date
   */
  private getEarliestExpiry(
    date1: Date | null,
    date2: Date | null,
  ): Date | undefined {
    if (!date1 && !date2) return undefined;
    if (!date1) return date2!;
    if (!date2) return date1;
    return date1 < date2 ? date1 : date2;
  }

  /**
   * Clear computed permissions cache for a user
   */
  async clearUserPermissionsCache(userId: string): Promise<void> {
    await this.prisma.permissionCache.updateMany({
      where: {
        userProfileId: userId,
      },
      data: {
        isValid: false,
      },
    });

    this.logger.log(
      `Cleared permission cache for user ${userId}`,
      'PermissionCalculationService',
    );
  }
}
