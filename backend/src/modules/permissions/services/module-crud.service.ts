import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import { CacheService } from '@/core/cache/cache.service';
import { Module, ModuleCategory } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';
import {
  CreateModuleDto,
  UpdateModuleDto,
} from '../dto/module.dto';

@Injectable()
export class ModuleCrudService {
  private readonly cachePrefix = 'module:';
  private readonly cacheTTL = 60; // 60 seconds - Type C standard

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Find modules with pagination and caching (Type C Pattern)
   */
  async findManyPaginated(
    filter: {
      search?: string;
      category?: ModuleCategory;
      isActive?: boolean;
      isVisible?: boolean;
      parentId?: string | null;
    },
    page: number,
    limit: number,
  ): Promise<{
    data: Module[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      // Validate pagination parameters
      if (page < 1) {
        throw new BadRequestException('Page must be greater than 0');
      }
      if (limit < 1 || limit > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }

      // Generate cache key based on all filter params
      const cacheKey = `${this.cachePrefix}list:${JSON.stringify({ filter, page, limit })}`;

      // Try to get from cache first
      const cached = await this.cache.get<{
        data: Module[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(cacheKey);
      if (cached) {
        this.logger.debug(
          `Module list retrieved from cache: ${cacheKey}`,
          'ModuleCrudService',
        );
        return cached;
      }

    // Build where clause
    const where: any = {
      deletedAt: null, // CRITICAL: Always filter soft-deleted
    };

    // Active filter
    if (filter.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    // Visible filter
    if (filter.isVisible !== undefined) {
      where.isVisible = filter.isVisible;
    }

    // Category filter
    if (filter.category) {
      where.category = filter.category;
    }

    // Parent filter (supports null for root modules)
    if (filter.parentId !== undefined) {
      where.parentId = filter.parentId;
    }

    // Search filter (case-insensitive across multiple fields)
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { code: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query with count (parallel for performance)
    const [data, total] = await Promise.all([
      this.prisma.module.findMany({
        where,
        include: {
          parent: {
            select: { id: true, code: true, name: true },
          },
          _count: {
            select: {
              children: true,
              permissions: true,
              userAccess: true,
              roleAccess: true,
            },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.module.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

      const result = {
        data,
        total,
        page,
        limit,
        totalPages,
      };

      // Cache the result (don't fail if cache fails)
      try {
        await this.cache.set(cacheKey, result, this.cacheTTL);
        this.logger.debug(
          `Module list retrieved from database and cached: ${cacheKey}`,
          'ModuleCrudService',
        );
      } catch (cacheError) {
        this.logger.warn(
          `Failed to cache module list: ${cacheError.message}`,
          'ModuleCrudService',
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Error in findManyPaginated: ${error.message}`,
        error.stack,
        'ModuleCrudService',
      );
      throw error;
    }
  }

  /**
   * Find module by ID with caching
   */
  async findById(id: string): Promise<Module> {
    const cacheKey = `${this.cachePrefix}${id}`;

    // Try cache first
    const cached = await this.cache.get<Module>(cacheKey);
    if (cached) {
      this.logger.debug(
        `Module retrieved from cache: ${cacheKey}`,
        'ModuleCrudService',
      );
      return cached;
    }

    const module = await this.prisma.module.findUnique({
      where: { id },
      include: {
        parent: {
          select: { id: true, code: true, name: true },
        },
        children: {
          where: { deletedAt: null, isActive: true },
          select: { id: true, code: true, name: true, sortOrder: true },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            permissions: true,
            userAccess: true,
            roleAccess: true,
            overrides: true,
          },
        },
      },
    });

    if (!module) {
      throw new NotFoundException(`Module with ID ${id} not found`);
    }

    if (module.deletedAt) {
      throw new NotFoundException(`Module with ID ${id} has been deleted`);
    }

    // Cache the result
    await this.cache.set(cacheKey, module, this.cacheTTL);

    return module;
  }

  /**
   * Find module by code with caching
   */
  async findByCode(code: string): Promise<Module> {
    const cacheKey = `${this.cachePrefix}code:${code}`;

    // Try cache first
    const cached = await this.cache.get<Module>(cacheKey);
    if (cached) {
      this.logger.debug(
        `Module retrieved from cache: ${cacheKey}`,
        'ModuleCrudService',
      );
      return cached;
    }

    const module = await this.prisma.module.findUnique({
      where: { code },
      include: {
        parent: {
          select: { id: true, code: true, name: true },
        },
        children: {
          where: { deletedAt: null, isActive: true },
          select: { id: true, code: true, name: true, sortOrder: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!module) {
      throw new NotFoundException(`Module with code ${code} not found`);
    }

    if (module.deletedAt) {
      throw new NotFoundException(`Module with code ${code} has been deleted`);
    }

    // Cache the result
    await this.cache.set(cacheKey, module, this.cacheTTL);

    return module;
  }

  /**
   * Create new module
   */
  async createModule(
    dto: CreateModuleDto,
    createdBy: string,
  ): Promise<Module> {
    // Validate unique code
    const existing = await this.prisma.module.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new BadRequestException(
        `Module with code ${dto.code} already exists`,
      );
    }

    // Validate parent exists if provided
    if (dto.parentId) {
      const parent = await this.prisma.module.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.deletedAt) {
        throw new NotFoundException(
          `Parent module with ID ${dto.parentId} not found`,
        );
      }
    }

    const module = await this.prisma.module.create({
      data: {
        id: uuidv7(),
        code: dto.code,
        name: dto.name,
        category: dto.category,
        description: dto.description,
        icon: dto.icon,
        path: dto.path,
        parentId: dto.parentId,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        isVisible: dto.isVisible ?? true,
        version: 0,
        createdBy,
      },
    });

    // Invalidate all list caches (pattern-based invalidation for all filter combinations)
    try {
      await this.cache.delPattern(`${this.cachePrefix}list:*`);
    } catch (cacheError) {
      this.logger.warn(
        `Failed to invalidate cache after module creation: ${cacheError.message}`,
        'ModuleCrudService',
      );
    }

    this.logger.log(`Module created: ${module.code}`, 'ModuleCrudService');
    return module;
  }

  /**
   * Update module with change history tracking
   */
  async updateModule(
    id: string,
    dto: UpdateModuleDto,
    modifiedBy: string,
  ): Promise<Module> {
    // Get current state for change history
    const current = await this.findById(id);

    // Validate code uniqueness if changed
    if (dto.code && dto.code !== current.code) {
      const existing = await this.prisma.module.findUnique({
        where: { code: dto.code },
      });
      if (existing) {
        throw new BadRequestException(
          `Module with code ${dto.code} already exists`,
        );
      }
    }

    // Validate parent if changed
    if (dto.parentId !== undefined && dto.parentId !== current.parentId) {
      // Prevent circular reference
      if (dto.parentId === id) {
        throw new BadRequestException('Module cannot be its own parent');
      }

      if (dto.parentId) {
        const parent = await this.prisma.module.findUnique({
          where: { id: dto.parentId },
        });
        if (!parent || parent.deletedAt) {
          throw new NotFoundException(
            `Parent module with ID ${dto.parentId} not found`,
          );
        }

        // Check if new parent is a descendant (would create circular ref)
        const descendants = await this.getDescendants(id);
        if (descendants.some((d) => d.id === dto.parentId)) {
          throw new BadRequestException(
            'Cannot set parent to a descendant module (circular reference)',
          );
        }
      }
    }

    const updated = await this.prisma.module.update({
      where: { id },
      data: {
        ...dto,
        version: { increment: 1 },
        updatedBy: modifiedBy,
        updatedAt: new Date(),
      },
    });

    // Record change history
    await this.prisma.moduleChangeHistory.create({
      data: {
        id: uuidv7(),
        moduleId: id,
        changeType: 'UPDATE',
        changeVersion: updated.version,
        previousData: current as any,
        newData: updated as any,
        changedFields: Object.keys(dto),
        changedBy: modifiedBy,
      },
    });

    // Invalidate ALL related caches
    try {
      await this.cache.del(`${this.cachePrefix}${id}`);
      await this.cache.del(`${this.cachePrefix}code:${updated.code}`);
      if (dto.code && dto.code !== current.code) {
        await this.cache.del(`${this.cachePrefix}code:${current.code}`);
      }
      // Invalidate all list caches (pattern-based)
      await this.cache.delPattern(`${this.cachePrefix}list:*`);
    } catch (cacheError) {
      this.logger.warn(
        `Failed to invalidate cache after module update: ${cacheError.message}`,
        'ModuleCrudService',
      );
    }

    this.logger.log(`Module updated: ${updated.code}`, 'ModuleCrudService');
    return updated;
  }

  /**
   * Soft delete module
   */
  async softDeleteModule(
    id: string,
    reason: string,
    deletedBy: string,
  ): Promise<Module> {
    const module = await this.findById(id);

    // Check if module has active children
    const activeChildren = await this.prisma.module.count({
      where: {
        parentId: id,
        deletedAt: null,
        isActive: true,
      },
    });

    if (activeChildren > 0) {
      throw new BadRequestException(
        `Cannot delete module with ${activeChildren} active child modules`,
      );
    }

    const deleted = await this.prisma.module.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
        deleteReason: reason,
        isActive: false,
        updatedAt: new Date(),
      },
    });

    // Invalidate ALL related caches
    try {
      await this.cache.del(`${this.cachePrefix}${id}`);
      await this.cache.del(`${this.cachePrefix}code:${module.code}`);
      // Invalidate all list caches (pattern-based)
      await this.cache.delPattern(`${this.cachePrefix}list:*`);
    } catch (cacheError) {
      this.logger.warn(
        `Failed to invalidate cache after module deletion: ${cacheError.message}`,
        'ModuleCrudService',
      );
    }

    this.logger.log(
      `Module soft deleted: ${module.code} - Reason: ${reason}`,
      'ModuleCrudService',
    );
    return deleted;
  }

  /**
   * Get module children
   */
  async getChildren(parentId: string): Promise<Module[]> {
    return this.prisma.module.findMany({
      where: {
        parentId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: { children: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get module ancestors (parent chain)
   */
  async getAncestors(moduleId: string): Promise<Module[]> {
    const ancestors: Module[] = [];
    let currentModule = await this.findById(moduleId);

    while (currentModule.parentId) {
      const parent = await this.findById(currentModule.parentId);
      ancestors.unshift(parent);
      currentModule = parent;
    }

    return ancestors;
  }

  /**
   * Get module descendants (recursive)
   */
  async getDescendants(moduleId: string): Promise<Module[]> {
    const descendants: Module[] = [];
    const children = await this.getChildren(moduleId);

    for (const child of children) {
      descendants.push(child);
      const childDescendants = await this.getDescendants(child.id);
      descendants.push(...childDescendants);
    }

    return descendants;
  }

  /**
   * Get full module tree
   */
  async getModuleTree(): Promise<Module[]> {
    // Get root modules
    const rootModules = await this.prisma.module.findMany({
      where: {
        parentId: null,
        deletedAt: null,
      },
      include: {
        children: {
          where: { deletedAt: null },
          include: {
            children: {
              where: { deletedAt: null },
              include: {
                children: {
                  where: { deletedAt: null },
                },
              },
            },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return rootModules;
  }

  /**
   * Move module to new parent
   */
  async moveToParent(
    moduleId: string,
    newParentId: string | null,
    modifiedBy: string,
  ): Promise<Module> {
    const module = await this.findById(moduleId);

    // Validate new parent
    if (newParentId) {
      if (newParentId === moduleId) {
        throw new BadRequestException('Module cannot be its own parent');
      }

      const newParent = await this.findById(newParentId);
      if (!newParent) {
        throw new NotFoundException(
          `Parent module with ID ${newParentId} not found`,
        );
      }

      // Check if new parent is a descendant
      const descendants = await this.getDescendants(moduleId);
      if (descendants.some((d) => d.id === newParentId)) {
        throw new BadRequestException(
          'Cannot move module to its own descendant (circular reference)',
        );
      }
    }

    // Use Prisma update directly to allow null value
    const updated = await this.prisma.module.update({
      where: { id: moduleId },
      data: {
        parentId: newParentId,
        version: { increment: 1 },
        updatedBy: modifiedBy,
        updatedAt: new Date(),
      },
    });

    // Invalidate caches
    try {
      await this.cache.del(`${this.cachePrefix}${moduleId}`);
      await this.cache.del(`${this.cachePrefix}code:${updated.code}`);
      // Invalidate all list caches (pattern-based)
      await this.cache.delPattern(`${this.cachePrefix}list:*`);
    } catch (cacheError) {
      this.logger.warn(
        `Failed to invalidate cache after module move: ${cacheError.message}`,
        'ModuleCrudService',
      );
    }

    return updated;
  }

  /**
   * Get change history for a module
   */
  async getChangeHistory(moduleId: string) {
    return this.prisma.moduleChangeHistory.findMany({
      where: { moduleId },
      orderBy: { changedAt: 'desc' },
      take: 50, // Limit to last 50 changes
    });
  }
}
