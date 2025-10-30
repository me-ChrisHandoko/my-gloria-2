import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import { CacheService } from '@/core/cache/cache.service';
import {
  Permission,
  Prisma,
  PermissionAction,
} from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
} from '../dto/permission.dto';
import { IPermissionFilter } from '../interfaces/permission.interface';

@Injectable()
export class PermissionsService {
  private readonly cachePrefix = 'permission:';
  private readonly cacheTTL = 60; // 60 seconds for permissions cache (checked frequently)

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Create a new permission
   */
  async createPermission(
    dto: CreatePermissionDto,
    createdBy: string,
  ): Promise<Permission> {
    try {
      // Check for duplicate permission
      const existing = await this.prisma.permission.findFirst({
        where: {
          OR: [
            { code: dto.code },
            {
              resource: dto.resource,
              action: dto.action,
              scope: dto.scope || null,
            },
          ],
        },
      });

      if (existing) {
        throw new ConflictException(
          `Permission with code ${dto.code} or resource/action/scope combination already exists`,
        );
      }

      const permission = await this.prisma.permission.create({
        data: {
          id: uuidv7(),
          code: dto.code,
          name: dto.name,
          description: dto.description,
          resource: dto.resource,
          action: dto.action,
          scope: dto.scope,
          category: dto.category,
          groupName: dto.groupName,
          groupIcon: dto.groupIcon,
          groupSortOrder: dto.groupSortOrder,
          conditions: dto.conditions,
          metadata: dto.metadata,
          isSystemPermission: dto.isSystemPermission || false,
          createdBy,
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}list`);

      this.logger.log(
        `Permission created: ${permission.code}`,
        'PermissionsService',
      );
      return permission;
    } catch (error) {
      this.logger.error(
        'Error creating permission',
        error.stack,
        'PermissionsService',
      );
      throw error;
    }
  }

  /**
   * Update an existing permission
   */
  async updatePermission(
    id: string,
    dto: UpdatePermissionDto,
    modifiedBy: string,
  ): Promise<Permission> {
    try {
      const existing = await this.findById(id);

      if (existing.isSystemPermission) {
        throw new BadRequestException('System permissions cannot be modified');
      }

      const permission = await this.prisma.permission.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          scope: dto.scope,
          category: dto.category,
          groupName: dto.groupName,
          groupIcon: dto.groupIcon,
          groupSortOrder: dto.groupSortOrder,
          conditions: dto.conditions,
          metadata: dto.metadata,
          isActive: dto.isActive,
          updatedAt: new Date(),
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}${id}`);
      await this.cache.del(`${this.cachePrefix}list`);
      await this.cache.del(`${this.cachePrefix}code:${permission.code}`);

      this.logger.log(
        `Permission updated: ${permission.code}`,
        'PermissionsService',
      );
      return permission;
    } catch (error) {
      this.logger.error(
        'Error updating permission',
        error.stack,
        'PermissionsService',
      );
      throw error;
    }
  }

  /**
   * Find permission by ID
   */
  async findById(id: string): Promise<Permission> {
    const cacheKey = `${this.cachePrefix}${id}`;
    const cached = await this.cache.get<Permission>(cacheKey);

    if (cached) {
      return cached;
    }

    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    await this.cache.set(cacheKey, permission, this.cacheTTL);
    return permission;
  }

  /**
   * Find permission by code
   */
  async findByCode(code: string): Promise<Permission> {
    const cacheKey = `${this.cachePrefix}code:${code}`;
    const cached = await this.cache.get<Permission>(cacheKey);

    if (cached) {
      return cached;
    }

    const permission = await this.prisma.permission.findUnique({
      where: { code },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with code ${code} not found`);
    }

    await this.cache.set(cacheKey, permission, this.cacheTTL);
    return permission;
  }

  /**
   * Find all permissions (for groups endpoint)
   */
  async findAll(options: { includeInactive?: boolean } = {}): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: options.includeInactive ? {} : { isActive: true },
      orderBy: [
        { groupSortOrder: 'asc' },
        { groupName: 'asc' },
        { resource: 'asc' },
        { action: 'asc' },
      ],
    });
  }

  /**
   * Find permissions with filters (returns all matches)
   */
  async findMany(filter: IPermissionFilter = {}): Promise<Permission[]> {
    const where: Prisma.PermissionWhereInput = {
      ...(filter.resource && { resource: filter.resource }),
      ...(filter.action && { action: filter.action }),
      ...(filter.scope && { scope: filter.scope }),
      ...(filter.groupId && { groupId: filter.groupId }),
      ...(filter.isActive !== undefined && { isActive: filter.isActive }),
      ...(filter.isSystemPermission !== undefined && {
        isSystemPermission: filter.isSystemPermission,
      }),
      ...(filter.search && {
        OR: [
          { code: { contains: filter.search, mode: 'insensitive' } },
          { name: { contains: filter.search, mode: 'insensitive' } },
          { description: { contains: filter.search, mode: 'insensitive' } },
          { resource: { contains: filter.search, mode: 'insensitive' } },
        ],
      }),
    };

    return this.prisma.permission.findMany({
      where,
      orderBy: [
        { groupSortOrder: 'asc' },
        { resource: 'asc' },
        { action: 'asc' },
      ],
    });
  }

  /**
   * Find permissions with pagination (returns PaginatedResponse format)
   * This method follows the same pattern as roles.service.findAll()
   */
  async findManyPaginated(
    filter: IPermissionFilter = {},
    page = 1,
    limit = 10,
  ): Promise<{
    data: Permission[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }> {
    const cacheKey = `${this.cachePrefix}list:${JSON.stringify({ filter, page, limit })}`;
    const cached = await this.cache.get<{
      data: Permission[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    // Get filtered permissions
    const allPermissions = await this.findMany(filter);

    // Calculate pagination
    const total = allPermissions.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // Paginate data
    const data = allPermissions.slice(startIndex, endIndex);

    const result = {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };

    await this.cache.set(cacheKey, result, this.cacheTTL);
    return result;
  }

  /**
   * Delete a permission (soft delete by deactivating)
   */
  async deletePermission(id: string, deletedBy: string): Promise<void> {
    try {
      const permission = await this.findById(id);

      if (permission.isSystemPermission) {
        throw new BadRequestException('System permissions cannot be deleted');
      }

      // Removed: dependency check - permissionDependency model no longer exists
      // const dependentCount = await this.prisma.permissionDependency.count({
      //   where: { dependsOnId: id },
      // });
      //
      // if (dependentCount > 0) {
      //   throw new BadRequestException(
      //     `Cannot delete permission: ${dependentCount} other permissions depend on it`,
      //   );
      // }

      await this.prisma.permission.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}${id}`);
      await this.cache.del(`${this.cachePrefix}list`);
      await this.cache.del(`${this.cachePrefix}code:${permission.code}`);

      this.logger.log(
        `Permission deleted: ${permission.code}`,
        'PermissionsService',
      );
    } catch (error) {
      this.logger.error(
        'Error deleting permission',
        error.stack,
        'PermissionsService',
      );
      throw error;
    }
  }


  // Removed: addDependency method - permissionDependency model no longer exists
  // /**
  //  * Add permission dependency
  //  */
  // async addDependency(
  //   permissionId: string,
  //   dependsOnId: string,
  //   isRequired = true,
  // ): Promise<void> {
  //   try {
  //     // Check for circular dependencies
  //     await this.checkCircularDependency(permissionId, dependsOnId);
  //
  //     await this.prisma.permissionDependency.create({
  //       data: {
  //         id: uuidv7(),
  //         permissionId,
  //         dependsOnId,
  //         isRequired,
  //       },
  //     });
  //
  //     this.logger.log(
  //       `Permission dependency added: ${permissionId} depends on ${dependsOnId}`,
  //       'PermissionsService',
  //     );
  //   } catch (error) {
  //     this.logger.error(
  //       'Error adding permission dependency',
  //       error.stack,
  //       'PermissionsService',
  //     );
  //     throw error;
  //   }
  // }

  // Removed: checkCircularDependency method - permissionDependency model no longer exists
  // /**
  //  * Check for circular dependencies
  //  */
  // private async checkCircularDependency(
  //   permissionId: string,
  //   dependsOnId: string,
  //   visited = new Set<string>(),
  // ): Promise<void> {
  //   if (permissionId === dependsOnId) {
  //     throw new BadRequestException('Permission cannot depend on itself');
  //   }
  //
  //   if (visited.has(dependsOnId)) {
  //     throw new BadRequestException('Circular dependency detected');
  //   }
  //
  //   visited.add(dependsOnId);
  //
  //   const dependencies = await this.prisma.permissionDependency.findMany({
  //     where: { permissionId: dependsOnId },
  //   });
  //
  //   for (const dep of dependencies) {
  //     await this.checkCircularDependency(
  //       permissionId,
  //       dep.dependsOnId,
  //       visited,
  //     );
  //   }
  // }

  /**
   * Get permission statistics
   */
  /**
   * Debug permission chain for a specific user
   */
  async debugUserPermissions(
    userProfileId: string,
    resource?: string,
    action?: PermissionAction,
  ): Promise<any> {
    // Get user info
    const user = await this.prisma.userProfile.findUnique({
      where: { id: userProfileId },
      select: {
        id: true,
        clerkUserId: true,
        nip: true,
        isSuperadmin: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Build permission filter
    const permissionFilter: any = {};
    if (resource) permissionFilter.resource = resource;
    if (action) permissionFilter.action = action;

    // Get all permissions (or filtered)
    const permissions = await this.prisma.permission.findMany({
      where: {
        ...permissionFilter,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        resource: true,
        action: true,
        scope: true,
      },
    });

    // Get user's roles
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
            isActive: true,
          },
        },
      },
    });

    // Get role permissions for all user's roles
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        roleId: { in: userRoles.map((ur) => ur.roleId) },
        isGranted: true,
      },
      include: {
        permission: {
          select: {
            id: true,
            code: true,
            resource: true,
            action: true,
            scope: true,
            isActive: true,
          },
        },
        role: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    // Get direct user permissions
    const userPermissions = await this.prisma.userPermission.findMany({
      where: {
        userProfileId,
        isGranted: true,
      },
      include: {
        permission: {
          select: {
            id: true,
            code: true,
            resource: true,
            action: true,
            scope: true,
            isActive: true,
          },
        },
      },
    });

    // Check which permissions from the filter the user has access to
    const permissionAccess = permissions.map((perm) => {
      const hasDirectPermission = userPermissions.some(
        (up) => up.permissionId === perm.id,
      );
      const hasRolePermission = rolePermissions.some(
        (rp) => rp.permissionId === perm.id,
      );
      const rolesGranting = rolePermissions
        .filter((rp) => rp.permissionId === perm.id)
        .map((rp) => rp.role.name);

      return {
        permission: perm,
        hasAccess: hasDirectPermission || hasRolePermission,
        grantedBy: {
          directPermission: hasDirectPermission,
          roles: rolesGranting,
        },
      };
    });

    return {
      user: {
        id: user.id,
        clerkUserId: user.clerkUserId,
        nip: user.nip,
        isSuperadmin: user.isSuperadmin,
        isActive: user.isActive,
      },
      roles: userRoles.map((ur) => ({
        id: ur.role.id,
        code: ur.role.code,
        name: ur.role.name,
        isActive: ur.role.isActive,
        assignedAt: ur.assignedAt,
        effectiveFrom: ur.effectiveFrom,
        effectiveUntil: ur.effectiveUntil,
      })),
      directPermissionsCount: userPermissions.length,
      rolePermissionsCount: rolePermissions.length,
      permissionAccess,
      summary: {
        totalPermissionsChecked: permissions.length,
        permissionsGranted: permissionAccess.filter((p) => p.hasAccess).length,
        permissionsDenied: permissionAccess.filter((p) => !p.hasAccess).length,
        rolesCount: userRoles.length,
      },
    };
  }

  async getStatistics(): Promise<any> {
    const [
      totalPermissions,
      activePermissions,
      systemPermissions,
      totalGroups,
      permissionsByAction,
      permissionsByScope,
    ] = await Promise.all([
      this.prisma.permission.count(),
      this.prisma.permission.count({ where: { isActive: true } }),
      this.prisma.permission.count({ where: { isSystemPermission: true } }),
      this.prisma.permission.groupBy({ by: ['groupName'], _count: true }).then(g => g.length),
      this.prisma.permission.groupBy({
        by: ['action'],
        _count: true,
      }),
      this.prisma.permission.groupBy({
        by: ['scope'],
        _count: true,
        where: { scope: { not: null } },
      }),
    ]);

    return {
      totalPermissions,
      activePermissions,
      systemPermissions,
      totalGroups,
      permissionsByAction: permissionsByAction.map((item) => ({
        action: item.action,
        count: item._count,
      })),
      permissionsByScope: permissionsByScope.map((item) => ({
        scope: item.scope,
        count: item._count,
      })),
    };
  }
}
