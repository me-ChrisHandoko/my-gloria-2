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
  CreateModuleDto,
  UpdateModuleDto,
  QueryModuleDto,
  ModuleResponseDto,
  PaginatedModuleResponseDto,
} from '../dto/module.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ModulesService {
  private readonly logger = new Logger(ModulesService.name);
  private readonly cachePrefix = 'module:';
  private readonly cacheTTL = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async create(createModuleDto: CreateModuleDto): Promise<ModuleResponseDto> {
    try {
      // Check for duplicate code
      const existingModule = await this.prisma.module.findUnique({
        where: { code: createModuleDto.code },
      });

      if (existingModule) {
        throw new ConflictException(
          `Module with code ${createModuleDto.code} already exists`,
        );
      }

      // Validate parent exists if parentId is provided
      if (createModuleDto.parentId) {
        const parentModule = await this.prisma.module.findUnique({
          where: { id: createModuleDto.parentId },
        });

        if (!parentModule) {
          throw new BadRequestException(
            `Parent module with ID ${createModuleDto.parentId} not found`,
          );
        }

        if (!parentModule.isActive) {
          throw new BadRequestException('Parent module is not active');
        }
      }

      const module = await this.prisma.module.create({
        data: {
          id: uuidv7(),
          code: createModuleDto.code,
          name: createModuleDto.name,
          category: createModuleDto.category,
          description: createModuleDto.description,
          icon: createModuleDto.icon,
          path: createModuleDto.path,
          parentId: createModuleDto.parentId,
          sortOrder: createModuleDto.sortOrder ?? 0,
          isActive: true,
          isVisible: createModuleDto.isVisible ?? true,
          version: 0,
          updatedAt: new Date(),
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}list`);
      await this.cache.del(`${this.cachePrefix}tree`);

      this.logger.log(`Created module: ${module.name} (${module.code})`);
      return this.formatModuleResponse(module);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to create module: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to create module');
    }
  }

  async findAll(query: QueryModuleDto): Promise<PaginatedModuleResponseDto> {
    const cacheKey = `${this.cachePrefix}list:${JSON.stringify(query)}`;
    const cached = await this.cache.get<PaginatedModuleResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const {
      page = 1,
      limit = 10,
      sortBy = 'sortOrder',
      sortOrder = 'asc',
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ModuleWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.isVisible !== undefined) {
      where.isVisible = query.isVisible;
    }

    if (query.parentId !== undefined) {
      where.parentId = query.parentId;
    }

    // Include deleted modules only if explicitly requested
    if (!query.includeDeleted) {
      where.deletedAt = null;
    }

    const [modules, total] = await Promise.all([
      this.prisma.module.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          _count: {
            select: {
              children: true,
              modulePermissions: true,
            },
          },
        },
      }),
      this.prisma.module.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    const result: PaginatedModuleResponseDto = {
      data: modules.map((module) => this.formatModuleResponse(module)),
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

  async findOne(id: string): Promise<ModuleResponseDto> {
    const cacheKey = `${this.cachePrefix}${id}`;
    const cached = await this.cache.get<ModuleResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const module = await this.prisma.module.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            children: true,
            modulePermissions: true,
          },
        },
      },
    });

    if (!module) {
      throw new NotFoundException(`Module with ID ${id} not found`);
    }

    const result = this.formatModuleResponse(module);
    await this.cache.set(cacheKey, result, this.cacheTTL);
    return result;
  }

  async findTree(): Promise<ModuleResponseDto[]> {
    const cacheKey = `${this.cachePrefix}tree`;
    const cached = await this.cache.get<ModuleResponseDto[]>(cacheKey);

    if (cached) {
      return cached;
    }

    // Get all active modules
    const modules = await this.prisma.module.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            children: true,
            modulePermissions: true,
          },
        },
      },
    });

    // Build tree structure
    const moduleMap = new Map<string, any>();
    const rootModules: any[] = [];

    // First pass: Create map of all modules
    modules.forEach((module) => {
      moduleMap.set(module.id, {
        ...this.formatModuleResponse(module),
        children: [],
      });
    });

    // Second pass: Build parent-child relationships
    modules.forEach((module) => {
      const moduleNode = moduleMap.get(module.id);
      if (module.parentId && moduleMap.has(module.parentId)) {
        const parent = moduleMap.get(module.parentId);
        parent.children.push(moduleNode);
      } else {
        rootModules.push(moduleNode);
      }
    });

    await this.cache.set(cacheKey, rootModules, this.cacheTTL);
    return rootModules;
  }

  async update(
    id: string,
    updateModuleDto: UpdateModuleDto,
  ): Promise<ModuleResponseDto> {
    try {
      const existingModule = await this.prisma.module.findUnique({
        where: { id },
      });

      if (!existingModule) {
        throw new NotFoundException(`Module with ID ${id} not found`);
      }

      // Check for duplicate code if code is being updated
      if (
        updateModuleDto.code &&
        updateModuleDto.code !== existingModule.code
      ) {
        const duplicateCode = await this.prisma.module.findUnique({
          where: { code: updateModuleDto.code },
        });

        if (duplicateCode) {
          throw new ConflictException(
            `Module with code ${updateModuleDto.code} already exists`,
          );
        }
      }

      // Validate parent exists and prevent circular references
      if (updateModuleDto.parentId !== undefined) {
        if (updateModuleDto.parentId === id) {
          throw new BadRequestException('Module cannot be its own parent');
        }

        if (updateModuleDto.parentId) {
          const parentModule = await this.prisma.module.findUnique({
            where: { id: updateModuleDto.parentId },
          });

          if (!parentModule) {
            throw new BadRequestException(
              `Parent module with ID ${updateModuleDto.parentId} not found`,
            );
          }

          // Check for circular reference by checking if the new parent is a child
          const isCircular = await this.checkCircularReference(
            id,
            updateModuleDto.parentId,
          );

          if (isCircular) {
            throw new BadRequestException(
              'Circular reference detected: parent module is a descendant of this module',
            );
          }
        }
      }

      const module = await this.prisma.module.update({
        where: { id },
        data: {
          ...(updateModuleDto.code && { code: updateModuleDto.code }),
          ...(updateModuleDto.name && { name: updateModuleDto.name }),
          ...(updateModuleDto.category && {
            category: updateModuleDto.category,
          }),
          ...(updateModuleDto.description !== undefined && {
            description: updateModuleDto.description,
          }),
          ...(updateModuleDto.icon !== undefined && {
            icon: updateModuleDto.icon,
          }),
          ...(updateModuleDto.path !== undefined && {
            path: updateModuleDto.path,
          }),
          ...(updateModuleDto.parentId !== undefined && {
            parentId: updateModuleDto.parentId,
          }),
          ...(updateModuleDto.sortOrder !== undefined && {
            sortOrder: updateModuleDto.sortOrder,
          }),
          ...(updateModuleDto.isVisible !== undefined && {
            isVisible: updateModuleDto.isVisible,
          }),
          updatedAt: new Date(),
        },
        include: {
          _count: {
            select: {
              children: true,
              modulePermissions: true,
            },
          },
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}${id}`);
      await this.cache.del(`${this.cachePrefix}list`);
      await this.cache.del(`${this.cachePrefix}tree`);

      this.logger.log(`Updated module: ${module.name} (${id})`);
      return this.formatModuleResponse(module);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to update module: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to update module');
    }
  }

  async remove(id: string): Promise<ModuleResponseDto> {
    try {
      const module = await this.prisma.module.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              children: true,
              modulePermissions: true,
              roleModuleAccess: true,
              userModuleAccess: true,
            },
          },
        },
      });

      if (!module) {
        throw new NotFoundException(`Module with ID ${id} not found`);
      }

      // Check if module has child modules
      if (module._count.children > 0) {
        throw new BadRequestException(
          'Cannot delete module that has child modules',
        );
      }

      // Soft delete with version increment
      const deletedModule = await this.prisma.module.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: new Date(),
          version: module.version + 1,
          updatedAt: new Date(),
        },
        include: {
          _count: {
            select: {
              children: true,
              modulePermissions: true,
            },
          },
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}${id}`);
      await this.cache.del(`${this.cachePrefix}list`);
      await this.cache.del(`${this.cachePrefix}tree`);

      this.logger.log(`Soft deleted module: ${deletedModule.name} (${id})`);
      return this.formatModuleResponse(deletedModule);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to delete module: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to delete module');
    }
  }

  async restore(id: string): Promise<ModuleResponseDto> {
    try {
      const module = await this.prisma.module.findUnique({
        where: { id },
      });

      if (!module) {
        throw new NotFoundException(`Module with ID ${id} not found`);
      }

      if (!module.deletedAt) {
        throw new BadRequestException('Module is not deleted');
      }

      // Check if parent is active if parentId exists
      if (module.parentId) {
        const parentModule = await this.prisma.module.findUnique({
          where: { id: module.parentId },
        });

        if (!parentModule || !parentModule.isActive || parentModule.deletedAt) {
          throw new BadRequestException(
            'Cannot restore module: parent module is not active',
          );
        }
      }

      const restoredModule = await this.prisma.module.update({
        where: { id },
        data: {
          isActive: true,
          deletedAt: null,
          deletedBy: null,
          deleteReason: null,
          updatedAt: new Date(),
        },
        include: {
          _count: {
            select: {
              children: true,
              modulePermissions: true,
            },
          },
        },
      });

      // Invalidate cache
      await this.cache.del(`${this.cachePrefix}${id}`);
      await this.cache.del(`${this.cachePrefix}list`);
      await this.cache.del(`${this.cachePrefix}tree`);

      this.logger.log(`Restored module: ${restoredModule.name} (${id})`);
      return this.formatModuleResponse(restoredModule);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to restore module: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to restore module');
    }
  }

  private async checkCircularReference(
    moduleId: string,
    potentialParentId: string,
  ): Promise<boolean> {
    let currentId = potentialParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === moduleId) {
        return true; // Circular reference detected
      }

      if (visited.has(currentId)) {
        break; // Already checked this path
      }

      visited.add(currentId);

      const currentModule = await this.prisma.module.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      if (!currentModule || !currentModule.parentId) {
        break;
      }

      currentId = currentModule.parentId;
    }

    return false;
  }

  private formatModuleResponse(module: any): ModuleResponseDto {
    return {
      id: module.id,
      code: module.code,
      name: module.name,
      category: module.category,
      description: module.description,
      icon: module.icon,
      path: module.path,
      parentId: module.parentId,
      sortOrder: module.sortOrder,
      isActive: module.isActive,
      isVisible: module.isVisible,
      version: module.version,
      deletedAt: module.deletedAt,
      createdAt: module.createdAt,
      updatedAt: module.updatedAt,
      createdBy: module.createdBy,
      updatedBy: module.updatedBy,
      childModuleCount: module._count?.children,
      permissionCount: module._count?.modulePermissions,
    };
  }
}
