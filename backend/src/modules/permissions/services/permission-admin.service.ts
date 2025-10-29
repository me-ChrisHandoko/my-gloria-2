import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { PermissionCacheService } from './permission-cache.service';
import {
  SystemOverviewDto,
  PermissionConflictDto,
  OrphanedPermissionDto,
  UnusedPermissionDto,
  HealthCheckResultDto,
  OptimizeCacheDto,
  CacheOptimizationResultDto,
  DetailedStatisticsDto,
} from '../dto/permission-admin.dto';

@Injectable()
export class PermissionAdminService {
  constructor(
    private prisma: PrismaService,
    private cacheService: PermissionCacheService,
  ) {}

  /**
   * Get system-wide permission overview
   */
  async getSystemOverview(): Promise<SystemOverviewDto> {
    const [
      totalPermissions,
      activePermissions,
      totalGroups,
      totalRoles,
      usersWithPermissions,
      resourcePermissions,
      activeDelegations,
      totalTemplates,
      totalDependencies,
    ] = await Promise.all([
      this.prisma.permission.count(),
      this.prisma.permission.count({ where: { isActive: true } }),
      this.prisma.permissionGroup.count(),
      this.prisma.role.count(),
      this.prisma.userPermission.groupBy({
        by: ['userProfileId'],
      }),
      this.prisma.resourcePermission.count(),
      this.prisma.permissionDelegation.count({
        where: {
          isActive: true,
          validUntil: { gte: new Date() },
        },
      }),
      this.prisma.permissionTemplate.count(),
      this.prisma.permissionDependency.count(),
    ]);

    // Perform health check
    const health = await this.performHealthCheck();

    return {
      totalPermissions,
      activePermissions,
      totalGroups,
      totalRoles,
      totalUsersWithPermissions: usersWithPermissions.length,
      totalResourcePermissions: resourcePermissions,
      activeDelegations,
      totalTemplates,
      totalDependencies,
      healthStatus: health.status,
      healthIssues: health.checks
        .filter((c) => c.status !== 'pass')
        .map((c) => c.message),
    };
  }

  /**
   * Detect permission conflicts
   */
  async detectConflicts(): Promise<PermissionConflictDto[]> {
    const conflicts: PermissionConflictDto[] = [];

    // Find users with explicit deny and grant for same permission
    const userPermissions = await this.prisma.userPermission.findMany({
      where: { isActive: true },
      include: {
        permission: true,
        userProfile: true,
      },
    });

    // Group by user and permission
    const permissionsByUser = new Map<string, Map<string, any[]>>();

    for (const up of userPermissions) {
      if (!permissionsByUser.has(up.userProfileId)) {
        permissionsByUser.set(up.userProfileId, new Map());
      }

      const userMap = permissionsByUser.get(up.userProfileId)!;
      if (!userMap.has(up.permissionId)) {
        userMap.set(up.permissionId, []);
      }

      userMap.get(up.permissionId)!.push(up);
    }

    // Check for conflicts
    for (const [userId, permMap] of permissionsByUser) {
      for (const [permId, assignments] of permMap) {
        if (assignments.length > 1) {
          const hasGrant = assignments.some((a) => a.isGranted);
          const hasDeny = assignments.some((a) => !a.isGranted);

          if (hasGrant && hasDeny) {
            conflicts.push({
              userProfileId: userId,
              permissionCode: assignments[0].permission.code,
              conflictType: 'explicit_deny',
              description: 'User has both grant and deny for this permission',
              sources: assignments.map((a) => ({
                type: 'user' as const,
                id: a.id,
                name: `User Permission`,
                isGranted: a.isGranted,
                priority: a.priority,
              })),
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Find orphaned permissions (no longer referenced)
   */
  async findOrphanedPermissions(): Promise<OrphanedPermissionDto[]> {
    const orphaned: OrphanedPermissionDto[] = [];

    // Find permissions with no group
    const permissionsWithoutGroup = await this.prisma.permission.findMany({
      where: {
        groupId: null,
        isActive: true,
      },
    });

    for (const perm of permissionsWithoutGroup) {
      orphaned.push({
        id: perm.id,
        code: perm.code,
        name: perm.name,
        reason: 'No permission group assigned',
        createdAt: perm.createdAt,
      });
    }

    // Find permissions not assigned to any role or user
    const allPermissions = await this.prisma.permission.findMany({
      where: { isActive: true },
      include: {
        rolePermissions: { where: { isActive: true }, take: 1 },
        userPermissions: { where: { isActive: true }, take: 1 },
        resourcePermissions: { take: 1 },
      },
    });

    for (const perm of allPermissions) {
      if (
        perm.rolePermissions.length === 0 &&
        perm.userPermissions.length === 0 &&
        perm.resourcePermissions.length === 0
      ) {
        orphaned.push({
          id: perm.id,
          code: perm.code,
          name: perm.name,
          reason: 'Not assigned to any role, user, or resource',
          createdAt: perm.createdAt,
        });
      }
    }

    return orphaned;
  }

  /**
   * Find unused permissions (rarely or never used)
   */
  async findUnusedPermissions(
    daysThreshold: number = 30,
  ): Promise<UnusedPermissionDto[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

    const allPermissions = await this.prisma.permission.findMany({
      where: { isActive: true },
      include: {
        checkLogs: {
          where: {
            checkedAt: { gte: cutoffDate },
          },
        },
      },
    });

    const unused: UnusedPermissionDto[] = [];

    for (const perm of allPermissions) {
      const totalUsage = perm.checkLogs.length;
      const lastCheck = perm.checkLogs[0]?.checkedAt;

      let daysSinceLastUse = daysThreshold;
      if (lastCheck) {
        const diffMs = Date.now() - lastCheck.getTime();
        daysSinceLastUse = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }

      if (totalUsage === 0 || daysSinceLastUse >= daysThreshold) {
        unused.push({
          id: perm.id,
          code: perm.code,
          name: perm.name,
          daysSinceLastUse,
          totalUsage,
        });
      }
    }

    return unused.sort((a, b) => b.daysSinceLastUse - a.daysSinceLastUse);
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResultDto> {
    const startTime = Date.now();
    const checks: HealthCheckResultDto['checks'] = [];

    // Check 1: Database connectivity
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.push({
        name: 'Database Connection',
        status: 'pass',
        message: 'Database is accessible',
      });
    } catch (error) {
      checks.push({
        name: 'Database Connection',
        status: 'fail',
        message: 'Database connection failed',
        details: error.message,
      });
    }

    // Check 2: Inactive permissions count
    const inactiveCount = await this.prisma.permission.count({
      where: { isActive: false },
    });
    if (inactiveCount > 100) {
      checks.push({
        name: 'Inactive Permissions',
        status: 'warning',
        message: `${inactiveCount} inactive permissions found (consider cleanup)`,
        details: { inactiveCount },
      });
    } else {
      checks.push({
        name: 'Inactive Permissions',
        status: 'pass',
        message: 'Inactive permission count is acceptable',
      });
    }

    // Check 3: Expired delegations
    const expiredDelegations = await this.prisma.permissionDelegation.count({
      where: {
        isActive: true,
        validUntil: { lt: new Date() },
      },
    });
    if (expiredDelegations > 0) {
      checks.push({
        name: 'Expired Delegations',
        status: 'warning',
        message: `${expiredDelegations} expired delegations need cleanup`,
        details: { expiredDelegations },
      });
    } else {
      checks.push({
        name: 'Expired Delegations',
        status: 'pass',
        message: 'No expired delegations found',
      });
    }

    // Check 4: Orphaned permissions
    const orphaned = await this.findOrphanedPermissions();
    if (orphaned.length > 10) {
      checks.push({
        name: 'Orphaned Permissions',
        status: 'warning',
        message: `${orphaned.length} orphaned permissions found`,
        details: { orphanedCount: orphaned.length },
      });
    } else {
      checks.push({
        name: 'Orphaned Permissions',
        status: 'pass',
        message: 'Orphaned permission count is acceptable',
      });
    }

    // Check 5: Permission conflicts
    const conflicts = await this.detectConflicts();
    if (conflicts.length > 0) {
      checks.push({
        name: 'Permission Conflicts',
        status: 'warning',
        message: `${conflicts.length} permission conflicts detected`,
        details: { conflictCount: conflicts.length },
      });
    } else {
      checks.push({
        name: 'Permission Conflicts',
        status: 'pass',
        message: 'No permission conflicts found',
      });
    }

    // Determine overall status
    const hasFailures = checks.some((c) => c.status === 'fail');
    const hasWarnings = checks.some((c) => c.status === 'warning');
    const status = hasFailures ? 'critical' : hasWarnings ? 'warning' : 'healthy';

    return {
      status,
      checks,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }

  /**
   * Optimize permission cache
   */
  async optimizeCache(
    dto: OptimizeCacheDto,
  ): Promise<CacheOptimizationResultDto> {
    const startTime = Date.now();
    let keysCleared = 0;
    let keysRebuilt = 0;

    if (dto.clearAll) {
      // Clear all permission-related cache keys
      await this.cacheService.invalidateAll();
      keysCleared = -1; // Indicate full clear
    }

    if (dto.rebuildAll) {
      // Rebuild cache for all active users
      const users = await this.prisma.userProfile.findMany({
        where: { isActive: true },
        select: { id: true },
        take: 1000, // Limit to prevent performance issues
      });

      for (const user of users) {
        await this.cacheService.invalidateUserCache(user.id);
        keysRebuilt++;
      }
    }

    return {
      keysCleared,
      keysRebuilt,
      duration: Date.now() - startTime,
      message:
        keysCleared === -1
          ? 'All cache cleared and rebuilt successfully'
          : `Cache optimization complete: ${keysCleared} keys cleared, ${keysRebuilt} keys rebuilt`,
    };
  }

  /**
   * Get detailed statistics for admin dashboard
   */
  async getDetailedStatistics(): Promise<DetailedStatisticsDto> {
    // Permission statistics
    const [totalPerms, activePerms, inactivePerms, permsByResource, permsByAction] =
      await Promise.all([
        this.prisma.permission.count(),
        this.prisma.permission.count({ where: { isActive: true } }),
        this.prisma.permission.count({ where: { isActive: false } }),
        this.prisma.permission.groupBy({
          by: ['resource'],
          _count: true,
        }),
        this.prisma.permission.groupBy({
          by: ['action'],
          _count: true,
        }),
      ]);

    // Role statistics
    const [totalRoles, activeRoles, rolesByLevel] = await Promise.all([
      this.prisma.role.count(),
      this.prisma.role.count({ where: { isActive: true } }),
      this.prisma.role.groupBy({
        by: ['hierarchyLevel'],
        _count: true,
      }),
    ]);

    // User permission statistics
    const [totalUserPerms, tempUserPerms, avgPriority] = await Promise.all([
      this.prisma.userPermission.count({ where: { isActive: true } }),
      this.prisma.userPermission.count({
        where: { isActive: true, isTemporary: true },
      }),
      this.prisma.userPermission.aggregate({
        where: { isActive: true },
        _avg: { priority: true },
      }),
    ]);

    // Resource permission statistics
    const [totalResourcePerms, resourcePermsByType, expiredResourcePerms] =
      await Promise.all([
        this.prisma.resourcePermission.count(),
        this.prisma.resourcePermission.groupBy({
          by: ['resourceType'],
          _count: true,
        }),
        this.prisma.resourcePermission.count({
          where: { validUntil: { lt: new Date() } },
        }),
      ]);

    // Delegation statistics
    const [activeDelegations, expiredDelegations, expiringSoon] =
      await Promise.all([
        this.prisma.permissionDelegation.count({
          where: {
            isActive: true,
            validUntil: { gte: new Date() },
          },
        }),
        this.prisma.permissionDelegation.count({
          where: {
            isActive: true,
            validUntil: { lt: new Date() },
          },
        }),
        this.prisma.permissionDelegation.count({
          where: {
            isActive: true,
            validUntil: {
              gte: new Date(),
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

    // Template statistics
    const [totalTemplates, activeTemplates, systemTemplates, totalApplications] =
      await Promise.all([
        this.prisma.permissionTemplate.count(),
        this.prisma.permissionTemplate.count({ where: { isActive: true } }),
        this.prisma.permissionTemplate.count({
          where: { isActive: true, isSystem: true },
        }),
        this.prisma.permissionTemplateApplication.count(),
      ]);

    // Audit statistics
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [totalChanges, totalChecks, avgCheckDuration, deniedChecks] =
      await Promise.all([
        this.prisma.permissionChangeHistory.count(),
        this.prisma.permissionCheckLog.count(),
        this.prisma.permissionCheckLog.aggregate({
          _avg: { checkDuration: true },
        }),
        this.prisma.permissionCheckLog.count({
          where: {
            isAllowed: false,
            checkedAt: { gte: last24h },
          },
        }),
      ]);

    return {
      permissions: {
        total: totalPerms,
        active: activePerms,
        inactive: inactivePerms,
        byResource: permsByResource.reduce(
          (acc, item) => {
            acc[item.resource] = item._count;
            return acc;
          },
          {} as Record<string, number>,
        ),
        byAction: permsByAction.reduce(
          (acc, item) => {
            acc[item.action] = item._count;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
      roles: {
        total: totalRoles,
        active: activeRoles,
        byHierarchyLevel: rolesByLevel.reduce(
          (acc, item) => {
            acc[item.hierarchyLevel] = item._count;
            return acc;
          },
          {} as Record<number, number>,
        ),
      },
      userPermissions: {
        total: totalUserPerms,
        temporary: tempUserPerms,
        permanent: totalUserPerms - tempUserPerms,
        avgPriorityScore: avgPriority._avg.priority || 0,
      },
      resourcePermissions: {
        total: totalResourcePerms,
        byResourceType: resourcePermsByType.reduce(
          (acc, item) => {
            acc[item.resourceType] = item._count;
            return acc;
          },
          {} as Record<string, number>,
        ),
        expired: expiredResourcePerms,
      },
      delegations: {
        active: activeDelegations,
        expired: expiredDelegations,
        expiringIn7Days: expiringSoon,
      },
      templates: {
        total: totalTemplates,
        active: activeTemplates,
        system: systemTemplates,
        totalApplications,
      },
      audit: {
        totalChanges,
        totalChecks,
        avgCheckDuration: avgCheckDuration._avg.checkDuration || 0,
        deniedChecksLast24h: deniedChecks,
      },
    };
  }
}
