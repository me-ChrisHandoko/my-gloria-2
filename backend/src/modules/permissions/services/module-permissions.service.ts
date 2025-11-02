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
  CreateModulePermissionDto,
  UpdateModulePermissionDto,
  QueryModulePermissionDto,
  ModulePermissionResponseDto,
} from '../dto/module-permission.dto';

@Injectable()
export class ModulePermissionsService {
  private readonly logger = new Logger(ModulePermissionsService.name);
  private readonly cachePrefix = 'module-permission:';
  private readonly cacheTTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async create(
    dto: CreateModulePermissionDto,
  ): Promise<ModulePermissionResponseDto> {
    try {
      // Verify module exists
      const module = await this.prisma.module.findUnique({
        where: { id: dto.moduleId },
      });

      if (!module) {
        throw new NotFoundException(`Module with ID ${dto.moduleId} not found`);
      }

      // Check for duplicate
      const existing = await this.prisma.modulePermission.findFirst({
        where: {
          moduleId: dto.moduleId,
          action: dto.action,
          scope: dto.scope,
        },
      });

      if (existing) {
        throw new ConflictException(
          `Module permission with action ${dto.action} and scope ${dto.scope} already exists for this module`,
        );
      }

      const modulePermission = await this.prisma.modulePermission.create({
        data: {
          id: uuidv7(),
          moduleId: dto.moduleId,
          action: dto.action,
          scope: dto.scope,
          description: dto.description,
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
      });

      await this.invalidateModuleCache(dto.moduleId);

      this.logger.log(
        `Created module permission: ${module.name} - ${dto.action}:${dto.scope}`,
      );

      return this.formatResponse(modulePermission);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to create module permission: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to create module permission');
    }
  }

  async findAll(
    query?: QueryModulePermissionDto,
  ): Promise<ModulePermissionResponseDto[]> {
    const cacheKey = `${this.cachePrefix}list:${JSON.stringify(query || {})}`;
    const cached =
      await this.cache.get<ModulePermissionResponseDto[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const where: any = {};

    if (query?.moduleId) {
      where.moduleId = query.moduleId;
    }

    if (query?.action) {
      where.action = query.action;
    }

    if (query?.scope) {
      where.scope = query.scope;
    }

    const permissions = await this.prisma.modulePermission.findMany({
      where,
      include: {
        module: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: [{ moduleId: 'asc' }, { action: 'asc' }, { scope: 'asc' }],
    });

    const result = permissions.map((p) => this.formatResponse(p));

    await this.cache.set(cacheKey, result, this.cacheTTL);

    return result;
  }

  async findOne(id: string): Promise<ModulePermissionResponseDto> {
    const permission = await this.prisma.modulePermission.findUnique({
      where: { id },
      include: {
        module: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException(
        `Module permission with ID ${id} not found`,
      );
    }

    return this.formatResponse(permission);
  }

  async findByModule(moduleId: string): Promise<ModulePermissionResponseDto[]> {
    const cacheKey = `${this.cachePrefix}module:${moduleId}`;
    const cached =
      await this.cache.get<ModulePermissionResponseDto[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const permissions = await this.prisma.modulePermission.findMany({
      where: { moduleId },
      include: {
        module: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: [{ action: 'asc' }, { scope: 'asc' }],
    });

    const result = permissions.map((p) => this.formatResponse(p));

    await this.cache.set(cacheKey, result, this.cacheTTL);

    return result;
  }

  async update(
    id: string,
    dto: UpdateModulePermissionDto,
  ): Promise<ModulePermissionResponseDto> {
    const existing = await this.prisma.modulePermission.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        `Module permission with ID ${id} not found`,
      );
    }

    const updated = await this.prisma.modulePermission.update({
      where: { id },
      data: {
        description: dto.description,
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
    });

    await this.invalidateModuleCache(updated.moduleId);

    this.logger.log(`Updated module permission: ${id}`);

    return this.formatResponse(updated);
  }

  async remove(id: string): Promise<void> {
    const permission = await this.prisma.modulePermission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(
        `Module permission with ID ${id} not found`,
      );
    }

    await this.prisma.modulePermission.delete({
      where: { id },
    });

    await this.invalidateModuleCache(permission.moduleId);

    this.logger.log(`Deleted module permission: ${id}`);
  }

  private async invalidateModuleCache(moduleId: string): Promise<void> {
    await this.cache.del(`${this.cachePrefix}module:${moduleId}`);
    await this.cache.del(`${this.cachePrefix}list`);
  }

  private formatResponse(permission: any): ModulePermissionResponseDto {
    return {
      id: permission.id,
      moduleId: permission.module_id,
      action: permission.action,
      scope: permission.scope,
      description: permission.description,
      module: permission.module
        ? {
            id: permission.module.id,
            code: permission.module.code,
            name: permission.module.name,
          }
        : undefined,
    };
  }
}
