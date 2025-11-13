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
  CreatePermissionDto,
  UpdatePermissionDto,
  QueryPermissionDto,
  PermissionResponseDto,
  PaginatedPermissionResponseDto,
} from '../dto/permission.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);
  private readonly cachePrefix = 'permission:';
  private readonly cacheTTL = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async create(
    createPermissionDto: CreatePermissionDto,
  ): Promise<PermissionResponseDto> {
    try {
      // Check for duplicate code
      const existingPermission = await this.prisma.permission.findUnique({
        where: { code: createPermissionDto.code },
      });

      if (existingPermission) {
        throw new ConflictException(
          `Permission with code ${createPermissionDto.code} already exists`,
        );
      }

      // Check for duplicate resource+action+scope combination
      const duplicateCombo = await this.prisma.permission.findFirst({
        where: {
          resource: createPermissionDto.resource,
          action: createPermissionDto.action,
          scope: createPermissionDto.scope,
        },
      });

      if (duplicateCombo) {
        throw new ConflictException(
          `Permission with resource ${createPermissionDto.resource}, action ${createPermissionDto.action}, and scope ${createPermissionDto.scope} already exists`,
        );
      }

      const permission = await this.prisma.permission.create({
        data: {
          id: uuidv7(),
          code: createPermissionDto.code,
          name: createPermissionDto.name,
          description: createPermissionDto.description,
          resource: createPermissionDto.resource,
          action: createPermissionDto.action,
          scope: createPermissionDto.scope,
          conditions: createPermissionDto.conditions
            ? JSON.parse(createPermissionDto.conditions)
            : undefined,
          metadata: createPermissionDto.metadata
            ? JSON.parse(createPermissionDto.metadata)
            : undefined,
          isSystemPermission: createPermissionDto.isSystemPermission ?? false,
          category: createPermissionDto.category,
          groupName: createPermissionDto.groupName,
          groupIcon: createPermissionDto.groupIcon,
          groupSortOrder: createPermissionDto.groupSortOrder ?? 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}list`);

      this.logger.log(
        `Created permission: ${permission.name} (${permission.code})`,
      );
      return this.formatPermissionResponse(permission);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(
        `Failed to create permission: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to create permission');
    }
  }

  async findAll(
    query: QueryPermissionDto,
  ): Promise<PaginatedPermissionResponseDto> {
    const cacheKey = `${this.cachePrefix}list:${JSON.stringify(query)}`;
    const cached =
      await this.cache.get<PaginatedPermissionResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc' } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PermissionWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.resource) {
      where.resource = { equals: query.resource, mode: 'insensitive' };
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.scope) {
      where.scope = query.scope;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.isSystemPermission !== undefined) {
      where.isSystemPermission = query.isSystemPermission;
    }

    const [permissions, total] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              rolePermissions: true,
              userPermissions: true,
            },
          },
        },
      }),
      this.prisma.permission.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    const result: PaginatedPermissionResponseDto = {
      data: permissions.map((permission) =>
        this.formatPermissionResponse(permission),
      ),
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrevious,
    };

    await this.cache.set(cacheKey, result, this.cacheTTL);
    return result;
  }

  async findOne(id: string): Promise<PermissionResponseDto> {
    const cacheKey = `${this.cachePrefix}${id}`;
    const cached = await this.cache.get<PermissionResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const permission = await this.prisma.permission.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            rolePermissions: true,
            userPermissions: true,
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    const result = this.formatPermissionResponse(permission);
    await this.cache.set(cacheKey, result, this.cacheTTL);
    return result;
  }

  async findByCode(code: string): Promise<PermissionResponseDto> {
    const cacheKey = `${this.cachePrefix}code:${code}`;
    const cached = await this.cache.get<PermissionResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const permission = await this.prisma.permission.findUnique({
      where: { code },
      include: {
        _count: {
          select: {
            rolePermissions: true,
            userPermissions: true,
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with code ${code} not found`);
    }

    const result = this.formatPermissionResponse(permission);
    await this.cache.set(cacheKey, result, this.cacheTTL);
    return result;
  }

  async update(
    id: string,
    updatePermissionDto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    try {
      const existingPermission = await this.prisma.permission.findUnique({
        where: { id },
      });

      if (!existingPermission) {
        throw new NotFoundException(`Permission with ID ${id} not found`);
      }

      // Don't allow updating system permissions' critical fields
      if (existingPermission.isSystemPermission) {
        if (
          updatePermissionDto.code ||
          updatePermissionDto.resource ||
          updatePermissionDto.action ||
          updatePermissionDto.scope
        ) {
          throw new BadRequestException(
            'Cannot modify core attributes of system permissions',
          );
        }
      }

      // Check for duplicate code if code is being updated
      if (
        updatePermissionDto.code &&
        updatePermissionDto.code !== existingPermission.code
      ) {
        const duplicateCode = await this.prisma.permission.findUnique({
          where: { code: updatePermissionDto.code },
        });

        if (duplicateCode) {
          throw new ConflictException(
            `Permission with code ${updatePermissionDto.code} already exists`,
          );
        }
      }

      const permission = await this.prisma.permission.update({
        where: { id },
        data: {
          ...(updatePermissionDto.code && { code: updatePermissionDto.code }),
          ...(updatePermissionDto.name && { name: updatePermissionDto.name }),
          ...(updatePermissionDto.description !== undefined && {
            description: updatePermissionDto.description,
          }),
          ...(updatePermissionDto.resource && {
            resource: updatePermissionDto.resource,
          }),
          ...(updatePermissionDto.action && {
            action: updatePermissionDto.action,
          }),
          ...(updatePermissionDto.scope !== undefined && {
            scope: updatePermissionDto.scope,
          }),
          ...(updatePermissionDto.conditions && {
            conditions: JSON.parse(updatePermissionDto.conditions),
          }),
          ...(updatePermissionDto.metadata && {
            metadata: JSON.parse(updatePermissionDto.metadata),
          }),
          ...(updatePermissionDto.category !== undefined && {
            category: updatePermissionDto.category,
          }),
          ...(updatePermissionDto.groupName !== undefined && {
            groupName: updatePermissionDto.groupName,
          }),
          ...(updatePermissionDto.groupIcon !== undefined && {
            groupIcon: updatePermissionDto.groupIcon,
          }),
          ...(updatePermissionDto.groupSortOrder !== undefined && {
            groupSortOrder: updatePermissionDto.groupSortOrder,
          }),
        },
        include: {
          _count: {
            select: {
              rolePermissions: true,
              userPermissions: true,
            },
          },
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}${id}`);
      await this.cache.del(
        `${this.cachePrefix}code:${existingPermission.code}`,
      );
      if (
        updatePermissionDto.code &&
        updatePermissionDto.code !== existingPermission.code
      ) {
        await this.cache.del(
          `${this.cachePrefix}code:${updatePermissionDto.code}`,
        );
      }
      await this.cache.del(`${this.cachePrefix}list`);

      this.logger.log(`Updated permission: ${permission.name} (${id})`);
      return this.formatPermissionResponse(permission);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to update permission: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to update permission');
    }
  }

  async remove(id: string): Promise<PermissionResponseDto> {
    try {
      const permission = await this.prisma.permission.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              rolePermissions: true,
              userPermissions: true,
            },
          },
        },
      });

      if (!permission) {
        throw new NotFoundException(`Permission with ID ${id} not found`);
      }

      // Prevent deleting system permissions
      if (permission.isSystemPermission) {
        throw new BadRequestException('Cannot delete system permissions');
      }

      // Check if permission is in use
      if (
        permission._count.rolePermissions > 0 ||
        permission._count.userPermissions > 0
      ) {
        throw new BadRequestException(
          'Cannot delete permission that is assigned to roles or users',
        );
      }

      const deletedPermission = await this.prisma.permission.update({
        where: { id },
        data: { isActive: false },
        include: {
          _count: {
            select: {
              rolePermissions: true,
              userPermissions: true,
            },
          },
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}${id}`);
      await this.cache.del(`${this.cachePrefix}code:${deletedPermission.code}`);
      await this.cache.del(`${this.cachePrefix}list`);

      this.logger.log(
        `Soft deleted permission: ${deletedPermission.name} (${id})`,
      );
      return this.formatPermissionResponse(deletedPermission);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to delete permission: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to delete permission');
    }
  }

  async restore(id: string): Promise<PermissionResponseDto> {
    try {
      const permission = await this.prisma.permission.findUnique({
        where: { id },
      });

      if (!permission) {
        throw new NotFoundException(`Permission with ID ${id} not found`);
      }

      if (permission.isActive) {
        throw new BadRequestException('Permission is already active');
      }

      const restoredPermission = await this.prisma.permission.update({
        where: { id },
        data: { isActive: true },
        include: {
          _count: {
            select: {
              rolePermissions: true,
              userPermissions: true,
            },
          },
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}${id}`);
      await this.cache.del(
        `${this.cachePrefix}code:${restoredPermission.code}`,
      );
      await this.cache.del(`${this.cachePrefix}list`);

      this.logger.log(
        `Restored permission: ${restoredPermission.name} (${id})`,
      );
      return this.formatPermissionResponse(restoredPermission);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to restore permission: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to restore permission');
    }
  }

  private formatPermissionResponse(permission: any): PermissionResponseDto {
    return {
      id: permission.id,
      code: permission.code,
      name: permission.name,
      description: permission.description,
      resource: permission.resource,
      action: permission.action,
      scope: permission.scope,
      conditions: permission.conditions,
      metadata: permission.metadata,
      isSystemPermission: permission.isSystemPermission,
      isActive: permission.isActive,
      category: permission.category,
      groupName: permission.group_name,
      groupIcon: permission.group_icon,
      groupSortOrder: permission.group_sort_order,
      createdAt: permission.created_at,
      updatedAt: permission.updated_at,
      createdBy: permission.created_by,
      roleCount: permission._count?.rolePermissions,
      userCount: permission._count?.userPermissions,
    };
  }
}
