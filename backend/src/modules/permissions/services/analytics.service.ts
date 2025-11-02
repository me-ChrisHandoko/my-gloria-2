import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CacheService } from '../../../core/cache/cache.service';

interface PermissionUsageStatistics {
  totalPermissions: number;
  activePermissions: number;
  systemPermissions: number;
  permissionsByResource: Array<{
    resource: string;
    count: number;
  }>;
  permissionsByAction: Array<{
    action: string;
    count: number;
  }>;
  mostUsedPermissions: Array<{
    permission: {
      id: string;
      resource: string;
      action: string;
    };
    roleCount: number;
    userCount: number;
  }>;
}

interface RoleUsageStatistics {
  totalRoles: number;
  activeRoles: number;
  systemRoles: number;
  rolesByHierarchyLevel: Array<{
    level: number;
    count: number;
  }>;
  rolesWithMostPermissions: Array<{
    role: {
      id: string;
      code: string;
      name: string;
    };
    permissionCount: number;
  }>;
  rolesWithMostUsers: Array<{
    role: {
      id: string;
      code: string;
      name: string;
    };
    userCount: number;
  }>;
}

interface UserPermissionAudit {
  userProfile: {
    id: string;
    nip: string;
  };
  directRoles: Array<{
    role: {
      id: string;
      code: string;
      name: string;
    };
    assignedAt: Date;
    assignedBy: string;
  }>;
  effectivePermissions: Array<{
    permission: {
      id: string;
      resource: string;
      action: string;
    };
    source: 'DIRECT_USER' | 'ROLE' | 'INHERITED';
    sourceDetails: string;
    scope: string | null;
    priority: number;
  }>;
  moduleAccess: Array<{
    module: {
      id: string;
      code: string;
      name: string;
    };
    permissions: Record<string, any>;
    grantedBy: string;
    grantedAt: Date;
  }>;
  summary: {
    totalRoles: number;
    totalPermissions: number;
    totalModules: number;
  };
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly cachePrefix = 'analytics:';
  private readonly cacheTTL = 600; // 10 minutes for analytics

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Get permission usage statistics
   */
  async getPermissionUsageStatistics(): Promise<PermissionUsageStatistics> {
    const cacheKey = `${this.cachePrefix}permission-usage`;
    const cached =
      await this.cache.get<PermissionUsageStatistics>(cacheKey);

    if (cached) {
      return cached;
    }

    this.logger.log('Calculating permission usage statistics...');

    const [
      totalPermissions,
      activePermissions,
      systemPermissions,
      permissionsByResource,
      permissionsByAction,
      rolePermissions,
      userPermissions,
    ] = await Promise.all([
      this.prisma.permission.count(),
      this.prisma.permission.count({ where: { isActive: true } }),
      this.prisma.permission.count({ where: { isSystemPermission: true } }),
      this.prisma.permission.groupBy({
        by: ['resource'],
        _count: true,
        where: { isActive: true },
      }),
      this.prisma.permission.groupBy({
        by: ['action'],
        _count: true,
        where: { isActive: true },
      }),
      this.prisma.rolePermission.findMany({
        where: {
          isGranted: true,
          permission: { isActive: true },
        },
        include: {
          permission: {
            select: {
              id: true,
              resource: true,
              action: true,
            },
          },
        },
      }),
      this.prisma.userPermission.findMany({
        where: {
          isGranted: true,
          permission: { isActive: true },
        },
        include: {
          permission: {
            select: {
              id: true,
              resource: true,
              action: true,
            },
          },
        },
      }),
    ]);

    // Calculate most used permissions
    const permissionUsage = new Map<
      string,
      { permission: any; roleCount: number; userCount: number }
    >();

    for (const rp of rolePermissions) {
      const key = rp.permissionId;
      if (!permissionUsage.has(key)) {
        permissionUsage.set(key, {
          permission: rp.permission,
          roleCount: 0,
          userCount: 0,
        });
      }
      permissionUsage.get(key)!.roleCount++;
    }

    for (const up of userPermissions) {
      const key = up.permissionId;
      if (!permissionUsage.has(key)) {
        permissionUsage.set(key, {
          permission: up.permission,
          roleCount: 0,
          userCount: 0,
        });
      }
      permissionUsage.get(key)!.userCount++;
    }

    const mostUsedPermissions = Array.from(permissionUsage.values())
      .sort((a, b) => b.roleCount + b.userCount - (a.roleCount + a.userCount))
      .slice(0, 10);

    const result: PermissionUsageStatistics = {
      totalPermissions,
      activePermissions,
      systemPermissions,
      permissionsByResource: permissionsByResource.map((p) => ({
        resource: p.resource,
        count: p._count,
      })),
      permissionsByAction: permissionsByAction.map((p) => ({
        action: p.action,
        count: p._count,
      })),
      mostUsedPermissions,
    };

    await this.cache.set(cacheKey, result, this.cacheTTL);

    return result;
  }

  /**
   * Get role usage statistics
   */
  async getRoleUsageStatistics(): Promise<RoleUsageStatistics> {
    const cacheKey = `${this.cachePrefix}role-usage`;
    const cached = await this.cache.get<RoleUsageStatistics>(cacheKey);

    if (cached) {
      return cached;
    }

    this.logger.log('Calculating role usage statistics...');

    const [
      totalRoles,
      activeRoles,
      systemRoles,
      rolesByHierarchyLevel,
      rolesWithPermissions,
      rolesWithUsers,
    ] = await Promise.all([
      this.prisma.role.count(),
      this.prisma.role.count({ where: { isActive: true } }),
      this.prisma.role.count({ where: { isSystemRole: true } }),
      this.prisma.role.groupBy({
        by: ['hierarchyLevel'],
        _count: true,
        where: { isActive: true },
      }),
      this.prisma.role.findMany({
        where: { isActive: true },
        select: {
          id: true,
          code: true,
          name: true,
          _count: {
            select: {
              rolePermissions: {
                where: { isGranted: true },
              },
            },
          },
        },
      }),
      this.prisma.role.findMany({
        where: { isActive: true },
        select: {
          id: true,
          code: true,
          name: true,
          _count: {
            select: {
              userRoles: true,
            },
          },
        },
      }),
    ]);

    const rolesWithMostPermissions = rolesWithPermissions
      .map((r) => ({
        role: {
          id: r.id,
          code: r.code,
          name: r.name,
        },
        permissionCount: r._count.rolePermissions,
      }))
      .sort((a, b) => b.permissionCount - a.permissionCount)
      .slice(0, 10);

    const rolesWithMostUsers = rolesWithUsers
      .map((r) => ({
        role: {
          id: r.id,
          code: r.code,
          name: r.name,
        },
        userCount: r._count.userRoles,
      }))
      .sort((a, b) => b.userCount - a.userCount)
      .slice(0, 10);

    const result: RoleUsageStatistics = {
      totalRoles,
      activeRoles,
      systemRoles,
      rolesByHierarchyLevel: rolesByHierarchyLevel.map((r) => ({
        level: r.hierarchyLevel,
        count: r._count,
      })),
      rolesWithMostPermissions,
      rolesWithMostUsers,
    };

    await this.cache.set(cacheKey, result, this.cacheTTL);

    return result;
  }

  /**
   * Get comprehensive user permission audit
   */
  async getUserPermissionAudit(
    userProfileId: string,
  ): Promise<UserPermissionAudit> {
    this.logger.log(`Generating permission audit for user ${userProfileId}...`);

    const userProfile = await this.prisma.userProfile.findUnique({
      where: { id: userProfileId },
      select: {
        id: true,
        nip: true,
      },
    });

    if (!userProfile) {
      throw new Error(`User profile with ID ${userProfileId} not found`);
    }

    // Get direct roles
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
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    const directRoles = userRoles.map((ur) => ({
      role: ur.role,
      assignedAt: ur.assignedAt,
      assignedBy: ur.assignedBy || 'SYSTEM',
    }));

    // Get effective permissions from all sources
    const effectivePermissions: any[] = [];

    // 1. Direct user permissions
    const userPerms = await this.prisma.userPermission.findMany({
      where: {
        userProfileId,
        isGranted: true,
        OR: [
          { effectiveUntil: null },
          { effectiveUntil: { gte: new Date() } },
        ],
      },
      include: {
        permission: {
          select: {
            id: true,
            resource: true,
            action: true,
            scope: true,
          },
        },
      },
    });

    for (const up of userPerms) {
      effectivePermissions.push({
        permission: up.permission,
        source: 'DIRECT_USER',
        sourceDetails: 'Direct user permission',
        scope: up.permission.scope,
        priority: up.priority,
      });
    }

    // 2. Role permissions
    for (const userRole of userRoles) {
      const rolePerms = await this.prisma.rolePermission.findMany({
        where: {
          roleId: userRole.roleId,
          isGranted: true,
          OR: [
            { effectiveUntil: null },
            { effectiveUntil: { gte: new Date() } },
          ],
        },
        include: {
          permission: {
            select: {
              id: true,
              resource: true,
              action: true,
              scope: true,
            },
          },
          role: {
            select: {
              hierarchyLevel: true,
            },
          },
        },
      });

      for (const rp of rolePerms) {
        effectivePermissions.push({
          permission: rp.permission,
          source: 'ROLE',
          sourceDetails: `Role: ${userRole.role.name}`,
          scope: rp.permission.scope,
          priority: 100 + rp.role.hierarchyLevel,
        });
      }
    }

    // Get module access
    const moduleAccesses = await this.prisma.userModuleAccess.findMany({
      where: {
        userProfileId,
        isActive: true,
        OR: [
          { effectiveUntil: null },
          { effectiveUntil: { gte: new Date() } },
        ],
      },
      include: {
        module: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const moduleAccess = moduleAccesses.map((ma) => ({
      module: ma.module,
      permissions: ma.permissions as Record<string, any>,
      grantedBy: ma.grantedBy,
      grantedAt: ma.effectiveFrom,
    }));

    const result: UserPermissionAudit = {
      userProfile,
      directRoles,
      effectivePermissions,
      moduleAccess,
      summary: {
        totalRoles: directRoles.length,
        totalPermissions: effectivePermissions.length,
        totalModules: moduleAccess.length,
      },
    };

    return result;
  }
}
