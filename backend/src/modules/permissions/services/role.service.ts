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
  Role,
  UserRole,
  RolePermission,
  RoleTemplate,
  Prisma,
} from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';
import {
  CreateRoleDto,
  UpdateRoleDto,
  AssignRoleDto,
  AssignRolePermissionDto,
  BulkAssignRolePermissionsDto,
  CreateRoleTemplateDto,
  ApplyRoleTemplateDto,
} from '../dto/role.dto';

@Injectable()
export class RolesService {
  private readonly cachePrefix = 'role:';
  private readonly cacheTTL = 60; // 60 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Create a new role
   */
  async createRole(dto: CreateRoleDto, createdBy: string): Promise<Role> {
    try {
      const existing = await this.prisma.role.findUnique({
        where: { code: dto.code },
      });

      if (existing) {
        throw new ConflictException(
          `Role with code ${dto.code} already exists`,
        );
      }

      const role = await this.prisma.role.create({
        data: {
          id: uuidv7(),
          code: dto.code,
          name: dto.name,
          description: dto.description,
          hierarchyLevel: dto.hierarchyLevel,
          isActive: dto.isActive ?? true, // Default true if not provided
          isSystemRole: dto.isSystemRole || false,
          createdBy,
        },
      });

      // Invalidate list cache
      await this.cache.del(`${this.cachePrefix}list`);

      this.logger.log(`Role created: ${role.code}`, 'RolesService');
      return role;
    } catch (error) {
      this.logger.error('Error creating role', error.stack, 'RolesService');
      throw error;
    }
  }

  /**
   * Update an existing role
   */
  async updateRole(
    id: string,
    dto: UpdateRoleDto,
    modifiedBy: string,
  ): Promise<Role> {
    try {
      const existing = await this.findById(id);

      if (existing.isSystemRole) {
        throw new BadRequestException('System roles cannot be modified');
      }

      const role = await this.prisma.role.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          hierarchyLevel: dto.hierarchyLevel,
          isActive: dto.isActive,
          updatedAt: new Date(),
        },
      });

      // Invalidate caches
      await this.cache.del(`${this.cachePrefix}${id}`);
      await this.cache.del(`${this.cachePrefix}code:${role.code}`);
      await this.cache.del(`${this.cachePrefix}list`);

      this.logger.log(`Role updated: ${role.code}`, 'RolesService');
      return role;
    } catch (error) {
      this.logger.error('Error updating role', error.stack, 'RolesService');
      throw error;
    }
  }

  /**
   * Soft delete a role (set isActive = false)
   * This will deactivate the role but keep it in the database
   */
  async deleteRole(id: string, deletedBy: string): Promise<Role> {
    try {
      const existing = await this.findById(id);

      if (existing.isSystemRole) {
        throw new BadRequestException('System roles cannot be deleted');
      }

      if (!existing.isActive) {
        throw new BadRequestException('Role is already inactive');
      }

      // Check if role is assigned to any active users
      const activeAssignments = await this.prisma.userRole.count({
        where: {
          roleId: id,
          isActive: true,
        },
      });

      if (activeAssignments > 0) {
        throw new BadRequestException(
          `Cannot delete role. It is currently assigned to ${activeAssignments} active user(s). Please remove all user assignments first.`,
        );
      }

      // Soft delete: set isActive = false
      const role = await this.prisma.role.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      // Invalidate caches
      await this.cache.del(`${this.cachePrefix}${id}`);
      await this.cache.del(`${this.cachePrefix}code:${role.code}`);
      await this.cache.del(`${this.cachePrefix}list`);

      this.logger.log(`Role soft deleted: ${role.code}`, 'RolesService');
      return role;
    } catch (error) {
      this.logger.error('Error deleting role', error.stack, 'RolesService');
      throw error;
    }
  }

  /**
   * Find role by ID
   */
  async findById(id: string): Promise<Role> {
    const cacheKey = `${this.cachePrefix}${id}`;

    // Try cache first
    const cached = await this.cache.get<Role>(cacheKey);
    if (cached) {
      this.logger.debug(
        `Role retrieved from cache: ${cacheKey}`,
        'RolesService',
      );
      return cached;
    }

    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        parentRoles: {
          include: {
            parentRole: true,
          },
        },
        childRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    // Cache the result
    await this.cache.set(cacheKey, role, this.cacheTTL);

    return role;
  }

  /**
   * Find role by code
   */
  async findByCode(code: string): Promise<Role> {
    const cacheKey = `${this.cachePrefix}code:${code}`;

    // Try cache first
    const cached = await this.cache.get<Role>(cacheKey);
    if (cached) {
      this.logger.debug(
        `Role retrieved from cache: ${cacheKey}`,
        'RolesService',
      );
      return cached;
    }

    const role = await this.prisma.role.findUnique({
      where: { code },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with code ${code} not found`);
    }

    // Cache the result
    await this.cache.set(cacheKey, role, this.cacheTTL);

    return role;
  }

  /**
   * Find all roles
   */
  async findAll(includeInactive = false): Promise<Role[]> {
    return this.prisma.role.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
          where: { isGranted: true },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
      orderBy: [{ hierarchyLevel: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Find roles with pagination and caching
   */
  async findManyPaginated(
    filter: {
      search?: string;
      includeInactive?: boolean;
      isActive?: boolean;
      hierarchyLevel?: number;
      isSystemRole?: boolean;
    },
    page: number,
    limit: number,
  ): Promise<{
    data: Role[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Generate cache key based on filter params
    const cacheKey = `${this.cachePrefix}list:${JSON.stringify({ filter, page, limit })}`;

    // Try to get from cache first
    const cached = await this.cache.get<{
      data: Role[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(cacheKey);

    if (cached) {
      this.logger.debug(
        `Role list retrieved from cache: ${cacheKey}`,
        'RolesService',
      );
      return cached;
    }

    // Build where clause
    const where: any = {};

    // Active filter - isActive takes precedence over includeInactive
    if (filter.isActive !== undefined) {
      // Explicit isActive filter (true = active only, false = inactive only)
      where.isActive = filter.isActive;
    } else if (!filter.includeInactive) {
      // Legacy includeInactive behavior (false = active only, true = all)
      where.isActive = true;
    }

    // Search filter (search in name, code, description)
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { code: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    // Hierarchy level filter
    if (filter.hierarchyLevel !== undefined) {
      where.hierarchyLevel = filter.hierarchyLevel;
    }

    // System role filter
    if (filter.isSystemRole !== undefined) {
      where.isSystemRole = filter.isSystemRole;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query with count
    const [data, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
            where: { isGranted: true },
          },
          _count: {
            select: {
              userRoles: true,
            },
          },
        },
        orderBy: [{ hierarchyLevel: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.role.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const result = {
      data,
      total,
      page,
      limit,
      totalPages,
    };

    // Cache the result
    await this.cache.set(cacheKey, result, this.cacheTTL);

    this.logger.debug(
      `Role list retrieved from database and cached: ${cacheKey}`,
      'RolesService',
    );

    return result;
  }

  /**
   * Assign role to user
   */
  async assignRole(dto: AssignRoleDto, assignedBy: string): Promise<UserRole> {
    try {
      // Check if user already has this role
      const existing = await this.prisma.userRole.findUnique({
        where: {
          userProfileId_roleId: {
            userProfileId: dto.userProfileId,
            roleId: dto.roleId,
          },
        },
      });

      if (existing && existing.isActive) {
        throw new ConflictException('User already has this role');
      }

      const userRole = await this.prisma.userRole.upsert({
        where: {
          userProfileId_roleId: {
            userProfileId: dto.userProfileId,
            roleId: dto.roleId,
          },
        },
        create: {
          id: uuidv7(),
          userProfileId: dto.userProfileId,
          roleId: dto.roleId,
          assignedBy,
          validFrom: dto.validFrom || new Date(),
          validUntil: dto.validUntil,
          isActive: true,
        },
        update: {
          isActive: true,
          assignedBy,
          validFrom: dto.validFrom || new Date(),
          validUntil: dto.validUntil,
        },
        include: {
          role: true,
          userProfile: true,
        },
      });

      this.logger.log(
        `Role ${userRole.role.code} assigned to user ${userRole.userProfile.id}`,
        'RolesService',
      );
      return userRole;
    } catch (error) {
      this.logger.error('Error assigning role', error.stack, 'RolesService');
      throw error;
    }
  }

  /**
   * Remove role from user
   */
  async removeRole(
    userProfileId: string,
    roleId: string,
    removedBy: string,
  ): Promise<void> {
    try {
      const userRole = await this.prisma.userRole.findUnique({
        where: {
          userProfileId_roleId: {
            userProfileId,
            roleId,
          },
        },
      });

      if (!userRole) {
        throw new NotFoundException('User role assignment not found');
      }

      await this.prisma.userRole.update({
        where: {
          userProfileId_roleId: {
            userProfileId,
            roleId,
          },
        },
        data: {
          isActive: false,
        },
      });

      this.logger.log(
        `Role ${roleId} removed from user ${userProfileId}`,
        'RolesService',
      );
    } catch (error) {
      this.logger.error('Error removing role', error.stack, 'RolesService');
      throw error;
    }
  }

  /**
   * Assign permission to role
   */
  async assignPermissionToRole(
    roleId: string,
    dto: AssignRolePermissionDto,
    grantedBy: string,
  ): Promise<RolePermission> {
    try {
      const rolePermission = await this.prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId: dto.permissionId,
          },
        },
        create: {
          id: uuidv7(),
          roleId,
          permissionId: dto.permissionId,
          isGranted: dto.isGranted ?? true,
          conditions: dto.conditions,
          validFrom: dto.validFrom || new Date(),
          validUntil: dto.validUntil,
          grantedBy,
          grantReason: dto.grantReason,
        },
        update: {
          isGranted: dto.isGranted ?? true,
          conditions: dto.conditions,
          validFrom: dto.validFrom || new Date(),
          validUntil: dto.validUntil,
          grantedBy,
          grantReason: dto.grantReason,
          updatedAt: new Date(),
        },
        include: {
          role: true,
          permission: true,
        },
      });

      this.logger.log(
        `Permission ${rolePermission.permission.code} assigned to role ${rolePermission.role.code}`,
        'RolesService',
      );
      return rolePermission;
    } catch (error) {
      this.logger.error(
        'Error assigning permission to role',
        error.stack,
        'RolesService',
      );
      throw error;
    }
  }

  /**
   * Bulk assign permissions to role
   */
  async bulkAssignPermissionsToRole(
    roleId: string,
    dto: BulkAssignRolePermissionsDto,
    grantedBy: string,
  ): Promise<RolePermission[]> {
    try {
      const results: RolePermission[] = [];

      for (const permission of dto.permissions) {
        const result = await this.assignPermissionToRole(
          roleId,
          permission,
          grantedBy,
        );
        results.push(result);
      }

      this.logger.log(
        `Bulk assigned ${results.length} permissions to role ${roleId}`,
        'RolesService',
      );
      return results;
    } catch (error) {
      this.logger.error(
        'Error bulk assigning permissions',
        error.stack,
        'RolesService',
      );
      throw error;
    }
  }

  /**
   * Remove permission from role
   */
  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
    removedBy: string,
  ): Promise<void> {
    try {
      await this.prisma.rolePermission.update({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId,
          },
        },
        data: {
          isGranted: false,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Permission ${permissionId} removed from role ${roleId}`,
        'RolesService',
      );
    } catch (error) {
      this.logger.error(
        'Error removing permission from role',
        error.stack,
        'RolesService',
      );
      throw error;
    }
  }

  /**
   * Create role template
   */
  async createRoleTemplate(
    dto: CreateRoleTemplateDto,
    createdBy: string,
  ): Promise<RoleTemplate> {
    try {
      const existing = await this.prisma.roleTemplate.findUnique({
        where: { code: dto.code },
      });

      if (existing) {
        throw new ConflictException(
          `Role template with code ${dto.code} already exists`,
        );
      }

      const template = await this.prisma.roleTemplate.create({
        data: {
          id: uuidv7(),
          code: dto.code,
          name: dto.name,
          description: dto.description,
          category: dto.category,
          permissions: dto.permissionIds,
          createdBy,
        },
      });

      this.logger.log(
        `Role template created: ${template.code}`,
        'RolesService',
      );
      return template;
    } catch (error) {
      this.logger.error(
        'Error creating role template',
        error.stack,
        'RolesService',
      );
      throw error;
    }
  }

  /**
   * Apply role template
   */
  async applyRoleTemplate(
    dto: ApplyRoleTemplateDto,
    appliedBy: string,
  ): Promise<RolePermission[]> {
    try {
      const template = await this.prisma.roleTemplate.findUnique({
        where: { id: dto.templateId },
      });

      if (!template) {
        throw new NotFoundException(
          `Role template with ID ${dto.templateId} not found`,
        );
      }

      // Remove existing permissions if overrideExisting is true
      if (dto.overrideExisting) {
        await this.prisma.rolePermission.updateMany({
          where: { roleId: dto.roleId },
          data: { isGranted: false },
        });
      }

      const permissionIds = template.permissions as string[];
      const results: RolePermission[] = [];

      for (const permissionId of permissionIds) {
        const rolePermission = await this.assignPermissionToRole(
          dto.roleId,
          {
            permissionId,
            isGranted: true,
            grantReason: `Applied from template: ${template.code}`,
          },
          appliedBy,
        );
        results.push(rolePermission);
      }

      this.logger.log(
        `Template ${template.code} applied to role ${dto.roleId}`,
        'RolesService',
      );
      return results;
    } catch (error) {
      this.logger.error(
        'Error applying role template',
        error.stack,
        'RolesService',
      );
      throw error;
    }
  }

  /**
   * Get user roles
   */
  async getUserRoles(userProfileId: string): Promise<UserRole[]> {
    return this.prisma.userRole.findMany({
      where: {
        userProfileId,
        isActive: true,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              where: { isGranted: true },
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get role statistics
   */
  async getStatistics(): Promise<any> {
    const [
      totalRoles,
      activeRoles,
      systemRoles,
      roleAssignments,
      rolesByLevel,
    ] = await Promise.all([
      this.prisma.role.count(),
      this.prisma.role.count({ where: { isActive: true } }),
      this.prisma.role.count({ where: { isSystemRole: true } }),
      this.prisma.userRole.count({ where: { isActive: true } }),
      this.prisma.role.groupBy({
        by: ['hierarchyLevel'],
        _count: true,
        orderBy: { hierarchyLevel: 'asc' },
      }),
    ]);

    return {
      totalRoles,
      activeRoles,
      systemRoles,
      roleAssignments,
      rolesByLevel: rolesByLevel.map((item) => ({
        level: item.hierarchyLevel,
        count: item._count,
      })),
    };
  }

  /**
   * Get all role templates with pagination
   */
  async getRoleTemplates(page = 1, limit = 10, search?: string) {
    try {
      const skip = (page - 1) * limit;
      const where: Prisma.RoleTemplateWhereInput = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [templates, total] = await Promise.all([
        this.prisma.roleTemplate.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.roleTemplate.count({ where }),
      ]);

      return {
        data: templates,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(
        'Error getting role templates',
        error.stack,
        'RolesService',
      );
      throw error;
    }
  }

  /**
   * Get role template by ID
   */
  async getRoleTemplateById(id: string): Promise<RoleTemplate> {
    try {
      const template = await this.prisma.roleTemplate.findUnique({
        where: { id },
      });

      if (!template) {
        throw new NotFoundException(`Role template with ID ${id} not found`);
      }

      return template;
    } catch (error) {
      this.logger.error(
        'Error getting role template by ID',
        error.stack,
        'RolesService',
      );
      throw error;
    }
  }

  /**
   * Delete role template
   */
  async deleteRoleTemplate(id: string): Promise<void> {
    try {
      const template = await this.prisma.roleTemplate.findUnique({
        where: { id },
      });

      if (!template) {
        throw new NotFoundException(`Role template with ID ${id} not found`);
      }

      await this.prisma.roleTemplate.delete({
        where: { id },
      });

      this.logger.log(
        `Role template deleted: ${template.code}`,
        'RolesService',
      );
    } catch (error) {
      this.logger.error(
        'Error deleting role template',
        error.stack,
        'RolesService',
      );
      throw error;
    }
  }

  /**
   * Update user role temporal settings
   */
  async updateUserRoleTemporal(
    userProfileId: string,
    roleId: string,
    validFrom?: Date,
    validUntil?: Date,
  ): Promise<UserRole> {
    try {
      const userRole = await this.prisma.userRole.findFirst({
        where: {
          userProfileId,
          roleId,
        },
      });

      if (!userRole) {
        throw new NotFoundException(
          `User role assignment not found for user ${userProfileId} and role ${roleId}`,
        );
      }

      const updated = await this.prisma.userRole.update({
        where: { id: userRole.id },
        data: {
          validFrom,
          validUntil,
        },
        include: {
          role: true,
          userProfile: true,
        },
      });

      this.logger.log(
        `User role temporal updated for user ${userProfileId} and role ${roleId}`,
        'RolesService',
      );
      return updated;
    } catch (error) {
      this.logger.error(
        'Error updating user role temporal',
        error.stack,
        'RolesService',
      );
      throw error;
    }
  }

  /**
   * Get users assigned to a role
   */
  async getRoleUsers(roleId: string, page = 1, limit = 20, search?: string) {
    try {
      const skip = (page - 1) * limit;
      const where: Prisma.UserRoleWhereInput = { roleId };

      if (search) {
        where.userProfile = {
          OR: [
            { id: { contains: search, mode: 'insensitive' } },
          ],
        };
      }

      const [userRoles, total] = await Promise.all([
        this.prisma.userRole.findMany({
          where,
          skip,
          take: limit,
          include: {
            role: true,
            userProfile: {
              include: {
                dataKaryawan: true,
              },
            },
          },
          orderBy: { assignedAt: 'desc' },
        }),
        this.prisma.userRole.count({ where }),
      ]);

      return {
        data: userRoles,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(
        'Error getting role users',
        error.stack,
        'RolesService',
      );
      throw error;
    }
  }

  /**
   * Get modules accessible by a role
   */
  async getRoleModules(roleId: string) {
    try {
      // Get all module role access for this role
      const moduleAccess = await this.prisma.roleModuleAccess.findMany({
        where: {
          roleId,
        },
        include: {
          module: true,
        },
      });

      // Return modules with access information
      return moduleAccess.map((access) => ({
        id: access.module.id,
        code: access.module.code,
        name: access.module.name,
        description: access.module.description,
        isActive: access.module.isActive,
        requiredPermissions: [], // Module model doesn't have this field
        hasAccess: true,
        permissions: access.permissions,
      }));
    } catch (error) {
      this.logger.error(
        'Error getting role modules',
        error.stack,
        'RolesService',
      );
      throw error;
    }
  }
}
