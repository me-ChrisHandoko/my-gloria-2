import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { PrismaService } from '../../../core/database/prisma.service';
import { CacheService } from '../../../core/cache/cache.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  QueryRoleDto,
  RoleResponseDto,
  PaginatedRoleResponseDto,
} from '../dto/role.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);
  private readonly cachePrefix = 'role:';
  private readonly cacheTTL = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
    try {
      // Check for duplicate code
      const existingRole = await this.prisma.role.findUnique({
        where: { code: createRoleDto.code },
      });

      if (existingRole) {
        throw new ConflictException(
          `Role with code ${createRoleDto.code} already exists`,
        );
      }

      const role = await this.prisma.role.create({
        data: {
          id: uuidv7(),
          code: createRoleDto.code,
          name: createRoleDto.name,
          description: createRoleDto.description,
          hierarchyLevel: createRoleDto.hierarchyLevel,
          isSystemRole: createRoleDto.isSystemRole ?? false,
          isActive: true,
          updatedAt: new Date(),
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}list`);

      this.logger.log(`Created role: ${role.name} (${role.code})`);
      return this.formatRoleResponse(role);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Failed to create role: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create role');
    }
  }

  async findAll(query: QueryRoleDto): Promise<PaginatedRoleResponseDto> {
    const cacheKey = `${this.cachePrefix}list:${JSON.stringify(query)}`;
    const cached = await this.cache.get<PaginatedRoleResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc' } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.RoleWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.name) {
      where.name = { equals: query.name, mode: 'insensitive' };
    }

    if (query.code) {
      where.code = { equals: query.code, mode: 'insensitive' };
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.isSystemRole !== undefined) {
      where.isSystemRole = query.isSystemRole;
    }

    if (query.minHierarchyLevel !== undefined) {
      where.hierarchyLevel = {
        ...(where.hierarchyLevel as any || {}),
        gte: query.minHierarchyLevel,
      };
    }

    if (query.maxHierarchyLevel !== undefined) {
      where.hierarchyLevel = {
        ...(where.hierarchyLevel as any || {}),
        lte: query.maxHierarchyLevel,
      };
    }

    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy === 'hierarchyLevel' ? 'hierarchyLevel' : sortBy]: sortOrder,
        },
        include: {
          _count: {
            select: {
              rolePermissions: true,
              userRoles: true,
              childRoles: true,
              parentRoles: true,
            },
          },
        },
      }),
      this.prisma.role.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    const result: PaginatedRoleResponseDto = {
      data: roles.map((role) => this.formatRoleResponse(role)),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext,
        hasPrevious,
      },
    };

    await this.cache.set(cacheKey, result, this.cacheTTL);
    return result;
  }

  async findOne(id: string): Promise<RoleResponseDto> {
    const cacheKey = `${this.cachePrefix}${id}`;
    const cached = await this.cache.get<RoleResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            rolePermissions: true,
            userRoles: true,
            childRoles: true,
            parentRoles: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    const result = this.formatRoleResponse(role);
    await this.cache.set(cacheKey, result, this.cacheTTL);
    return result;
  }

  async update(
    id: string,
    updateRoleDto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    try {
      const existingRole = await this.prisma.role.findUnique({
        where: { id },
      });

      if (!existingRole) {
        throw new NotFoundException(`Role with ID ${id} not found`);
      }

      // Don't allow updating system roles' critical fields
      if (existingRole.isSystemRole) {
        if (updateRoleDto.code || updateRoleDto.hierarchyLevel !== undefined) {
          throw new BadRequestException(
            'Cannot modify code or hierarchy level of system roles',
          );
        }
      }

      // Check for duplicate code if code is being updated
      if (updateRoleDto.code && updateRoleDto.code !== existingRole.code) {
        const duplicateCode = await this.prisma.role.findUnique({
          where: { code: updateRoleDto.code },
        });

        if (duplicateCode) {
          throw new ConflictException(
            `Role with code ${updateRoleDto.code} already exists`,
          );
        }
      }

      const role = await this.prisma.role.update({
        where: { id },
        data: {
          ...(updateRoleDto.code && { code: updateRoleDto.code }),
          ...(updateRoleDto.name && { name: updateRoleDto.name }),
          ...(updateRoleDto.description !== undefined && {
            description: updateRoleDto.description,
          }),
          ...(updateRoleDto.hierarchyLevel !== undefined && {
            hierarchyLevel: updateRoleDto.hierarchyLevel,
          }),
          updatedAt: new Date(),
        },
        include: {
          _count: {
            select: {
              rolePermissions: true,
              userRoles: true,
              childRoles: true,
              parentRoles: true,
            },
          },
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}${id}`);
      await this.cache.del(`${this.cachePrefix}list`);

      this.logger.log(`Updated role: ${role.name} (${id})`);
      return this.formatRoleResponse(role);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Failed to update role: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to update role');
    }
  }

  async remove(id: string): Promise<RoleResponseDto> {
    try {
      const role = await this.prisma.role.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              rolePermissions: true,
              userRoles: true,
            },
          },
        },
      });

      if (!role) {
        throw new NotFoundException(`Role with ID ${id} not found`);
      }

      // Prevent deleting system roles
      if (role.isSystemRole) {
        throw new BadRequestException('Cannot delete system roles');
      }

      // Check if role is in use
      if (role._count.rolePermissions > 0 || role._count.userRoles > 0) {
        throw new BadRequestException(
          'Cannot delete role that is assigned to users or has permissions',
        );
      }

      const deletedRole = await this.prisma.role.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
        include: {
          _count: {
            select: {
              rolePermissions: true,
              userRoles: true,
              childRoles: true,
              parentRoles: true,
            },
          },
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}${id}`);
      await this.cache.del(`${this.cachePrefix}list`);

      this.logger.log(`Soft deleted role: ${deletedRole.name} (${id})`);
      return this.formatRoleResponse(deletedRole);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Failed to delete role: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to delete role');
    }
  }

  async restore(id: string): Promise<RoleResponseDto> {
    try {
      const role = await this.prisma.role.findUnique({
        where: { id },
      });

      if (!role) {
        throw new NotFoundException(`Role with ID ${id} not found`);
      }

      if (role.isActive) {
        throw new BadRequestException('Role is already active');
      }

      const restoredRole = await this.prisma.role.update({
        where: { id },
        data: {
          isActive: true,
          updatedAt: new Date(),
        },
        include: {
          _count: {
            select: {
              rolePermissions: true,
              userRoles: true,
              childRoles: true,
              parentRoles: true,
            },
          },
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}${id}`);
      await this.cache.del(`${this.cachePrefix}list`);

      this.logger.log(`Restored role: ${restoredRole.name} (${id})`);
      return this.formatRoleResponse(restoredRole);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to restore role: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to restore role');
    }
  }

  private formatRoleResponse(role: any): RoleResponseDto {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      hierarchyLevel: role.hierarchyLevel,
      isSystemRole: role.isSystemRole,
      isActive: role.isActive,
      createdAt: role.created_at,
      updatedAt: role.updated_at,
      createdBy: role.created_by,
      permissionCount: role._count?.role_permissions,
      userCount: role._count?.user_roles,
      parentRoleCount:
        role._count?.roleHierarchy_roleHierarchy_role_idToroles,
      childRoleCount:
        role._count?.roleHierarchy_roleHierarchy_parent_role_idToroles,
    };
  }
}
