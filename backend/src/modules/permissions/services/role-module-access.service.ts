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
  GrantRoleModuleAccessDto,
  BulkGrantRoleModuleAccessDto,
  UpdateRoleModuleAccessDto,
  RoleModuleAccessResponseDto,
} from '../dto/role-module-access.dto';

@Injectable()
export class RoleModuleAccessService {
  private readonly logger = new Logger(RoleModuleAccessService.name);
  private readonly cachePrefix = 'role-module-access:';
  private readonly cacheTTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async grant(
    dto: GrantRoleModuleAccessDto,
    grantedBy: string,
  ): Promise<RoleModuleAccessResponseDto> {
    try {
      // Verify role exists
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });

      if (!role) {
        throw new NotFoundException(`Role with ID ${dto.roleId} not found`);
      }

      // Verify module exists
      const module = await this.prisma.module.findUnique({
        where: { id: dto.moduleId },
      });

      if (!module) {
        throw new NotFoundException(`Module with ID ${dto.moduleId} not found`);
      }

      // Verify position exists if provided
      if (dto.positionId) {
        const position = await this.prisma.position.findUnique({
          where: { id: dto.positionId },
        });

        if (!position) {
          throw new NotFoundException(
            `Position with ID ${dto.positionId} not found`,
          );
        }
      }

      // Check for duplicate
      const existing = await this.prisma.roleModuleAccess.findFirst({
        where: {
          roleId: dto.roleId,
          moduleId: dto.moduleId,
          positionId: dto.positionId || null,
        },
      });

      if (existing) {
        throw new ConflictException(
          `Role module access already exists for this role-module${dto.positionId ? '-position' : ''} combination`,
        );
      }

      const access = await this.prisma.roleModuleAccess.create({
        data: {
          id: uuidv7(),
          roleId: dto.roleId,
          moduleId: dto.moduleId,
          positionId: dto.positionId,
          permissions: dto.permissions as any,
          isActive: dto.isActive ?? true,
          createdBy: grantedBy,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          role: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          module: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          position: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

      await this.invalidateCache(dto.roleId, dto.moduleId);

      const positionName = access.position ? access.position.name : '';
      this.logger.log(
        `Granted module access: ${role.name} → ${module.name}${dto.positionId ? ` (${positionName})` : ''}`,
      );

      return this.formatResponse(access);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to grant role module access: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to grant role module access');
    }
  }

  async bulkGrant(
    dto: BulkGrantRoleModuleAccessDto,
    grantedBy: string,
  ): Promise<RoleModuleAccessResponseDto[]> {
    const results: RoleModuleAccessResponseDto[] = [];

    for (const moduleId of dto.moduleIds) {
      try {
        const access = await this.grant(
          {
            roleId: dto.roleId,
            moduleId,
            permissions: dto.permissions,
            isActive: dto.isActive,
          },
          grantedBy,
        );
        results.push(access);
      } catch (error) {
        this.logger.warn(
          `Skipped module ${moduleId} for role ${dto.roleId}: ${error.message}`,
        );
      }
    }

    return results;
  }

  async findByRole(roleId: string): Promise<RoleModuleAccessResponseDto[]> {
    const cacheKey = `${this.cachePrefix}role:${roleId}`;
    const cached =
      await this.cache.get<RoleModuleAccessResponseDto[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const accesses = await this.prisma.roleModuleAccess.findMany({
      where: { roleId },
      include: {
        role: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        module: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        position: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: [{ module: { code: 'asc' } }],
    });

    const result = accesses.map((a) => this.formatResponse(a));

    await this.cache.set(cacheKey, result, this.cacheTTL);

    return result;
  }

  async findByModule(moduleId: string): Promise<RoleModuleAccessResponseDto[]> {
    const cacheKey = `${this.cachePrefix}module:${moduleId}`;
    const cached =
      await this.cache.get<RoleModuleAccessResponseDto[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const accesses = await this.prisma.roleModuleAccess.findMany({
      where: { moduleId },
      include: {
        role: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        module: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        position: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: [{ role: { code: 'asc' } }],
    });

    const result = accesses.map((a) => this.formatResponse(a));

    await this.cache.set(cacheKey, result, this.cacheTTL);

    return result;
  }

  async findOne(id: string): Promise<RoleModuleAccessResponseDto> {
    const access = await this.prisma.roleModuleAccess.findUnique({
      where: { id },
      include: {
        role: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        module: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        position: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!access) {
      throw new NotFoundException(
        `Role module access with ID ${id} not found`,
      );
    }

    return this.formatResponse(access);
  }

  async update(
    id: string,
    dto: UpdateRoleModuleAccessDto,
  ): Promise<RoleModuleAccessResponseDto> {
    const existing = await this.prisma.roleModuleAccess.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        `Role module access with ID ${id} not found`,
      );
    }

    const updated = await this.prisma.roleModuleAccess.update({
      where: { id },
      data: {
        permissions: (dto.permissions ?? existing.permissions) as any,
        isActive: dto.isActive ?? existing.isActive,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
      include: {
        role: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        module: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        position: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    await this.invalidateCache(updated.roleId, updated.moduleId);

    this.logger.log(`Updated role module access: ${id}`);

    return this.formatResponse(updated);
  }

  async revoke(id: string): Promise<void> {
    const access = await this.prisma.roleModuleAccess.findUnique({
      where: { id },
    });

    if (!access) {
      throw new NotFoundException(
        `Role module access with ID ${id} not found`,
      );
    }

    await this.prisma.roleModuleAccess.delete({
      where: { id },
    });

    await this.invalidateCache(access.roleId, access.moduleId);

    this.logger.log(`Revoked role module access: ${id}`);
  }

  private async invalidateCache(roleId: string, moduleId: string): Promise<void> {
    await this.cache.del(`${this.cachePrefix}role:${roleId}`);
    await this.cache.del(`${this.cachePrefix}module:${moduleId}`);
  }

  private formatResponse(access: any): RoleModuleAccessResponseDto {
    return {
      id: access.id,
      roleId: access.role_id,
      moduleId: access.module_id,
      positionId: access.position_id,
      permissions: access.permissions,
      isActive: access.is_active,
      createdAt: access.created_at,
      updatedAt: access.updated_at,
      createdBy: access.created_by,
      version: access.version,
      role: access.role
        ? {
            id: access.role.id,
            code: access.role.code,
            name: access.role.name,
          }
        : undefined,
      module: access.module
        ? {
            id: access.module.id,
            code: access.module.code,
            name: access.module.name,
          }
        : undefined,
      position: access.position
        ? {
            id: access.position.id,
            code: access.position.code,
            name: access.position.name,
          }
        : undefined,
    };
  }
}
