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
  GrantUserModuleAccessDto,
  BulkGrantUserModuleAccessDto,
  UpdateUserModuleAccessDto,
  UserModuleAccessResponseDto,
} from '../dto/user-module-access.dto';

@Injectable()
export class UserModuleAccessService {
  private readonly logger = new Logger(UserModuleAccessService.name);
  private readonly cachePrefix = 'user-module-access:';
  private readonly cacheTTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async grant(
    dto: GrantUserModuleAccessDto,
    grantedBy: string,
  ): Promise<UserModuleAccessResponseDto> {
    try {
      // Verify user exists
      const user = await this.prisma.userProfile.findUnique({
        where: { id: dto.userProfileId },
      });

      if (!user) {
        throw new NotFoundException(
          `User profile with ID ${dto.userProfileId} not found`,
        );
      }

      // Verify module exists
      const module = await this.prisma.module.findUnique({
        where: { id: dto.moduleId },
      });

      if (!module) {
        throw new NotFoundException(`Module with ID ${dto.moduleId} not found`);
      }

      // Check for duplicate
      const existing = await this.prisma.userModuleAccess.findFirst({
        where: {
          userProfileId: dto.userProfileId,
          moduleId: dto.moduleId,
        },
      });

      if (existing) {
        throw new ConflictException(
          `User module access already exists for this user-module combination`,
        );
      }

      // Parse dates if provided
      const effectiveFrom = dto.effectiveFrom
        ? new Date(dto.effectiveFrom)
        : new Date();

      const effectiveUntil = dto.effectiveUntil
        ? new Date(dto.effectiveUntil)
        : undefined;

      const access = await this.prisma.userModuleAccess.create({
        data: {
          id: uuidv7(),
          userProfileId: dto.userProfileId,
          moduleId: dto.moduleId,
          permissions: dto.permissions as any,
          grantedBy,
          reason: dto.reason,
          isActive: dto.isActive ?? true,
          effectiveFrom,
          effectiveUntil,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          userProfile: {
            select: {
              id: true,
              nip: true,
            },
          },
          module: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

      await this.invalidateCache(dto.userProfileId, dto.moduleId);

      this.logger.log(
        `Granted module access: User ${user.nip} → ${module.name}${dto.reason ? ` (${dto.reason})` : ''}`,
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
        `Failed to grant user module access: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to grant user module access');
    }
  }

  async bulkGrant(
    dto: BulkGrantUserModuleAccessDto,
    grantedBy: string,
  ): Promise<UserModuleAccessResponseDto[]> {
    const results: UserModuleAccessResponseDto[] = [];

    for (const moduleId of dto.moduleIds) {
      try {
        const access = await this.grant(
          {
            userProfileId: dto.userProfileId,
            moduleId,
            permissions: dto.permissions,
            reason: dto.reason,
            isActive: dto.isActive,
          },
          grantedBy,
        );
        results.push(access);
      } catch (error) {
        this.logger.warn(
          `Skipped module ${moduleId} for user ${dto.userProfileId}: ${error.message}`,
        );
      }
    }

    return results;
  }

  async findByUser(
    userProfileId: string,
    includeInactive = false,
  ): Promise<UserModuleAccessResponseDto[]> {
    const cacheKey = `${this.cachePrefix}user:${userProfileId}:${includeInactive}`;
    const cached =
      await this.cache.get<UserModuleAccessResponseDto[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const where: any = { userProfileId };

    if (!includeInactive) {
      where.isActive = true;
      where.OR = [
        { effectiveUntil: null },
        { effectiveUntil: { gte: new Date() } },
      ];
    }

    const accesses = await this.prisma.userModuleAccess.findMany({
      where,
      include: {
        userProfile: {
          select: {
            id: true,
            nip: true,
          },
        },
        module: {
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

  async findByModule(moduleId: string): Promise<UserModuleAccessResponseDto[]> {
    const cacheKey = `${this.cachePrefix}module:${moduleId}`;
    const cached =
      await this.cache.get<UserModuleAccessResponseDto[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const accesses = await this.prisma.userModuleAccess.findMany({
      where: {
        moduleId,
        isActive: true,
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
      },
      include: {
        userProfile: {
          select: {
            id: true,
            nip: true,
          },
        },
        module: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: [{ userProfile: { nip: 'asc' } }],
    });

    const result = accesses.map((a) => this.formatResponse(a));

    await this.cache.set(cacheKey, result, this.cacheTTL);

    return result;
  }

  async findOne(id: string): Promise<UserModuleAccessResponseDto> {
    const access = await this.prisma.userModuleAccess.findUnique({
      where: { id },
      include: {
        userProfile: {
          select: {
            id: true,
            nip: true,
          },
        },
        module: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!access) {
      throw new NotFoundException(`User module access with ID ${id} not found`);
    }

    return this.formatResponse(access);
  }

  async update(
    id: string,
    dto: UpdateUserModuleAccessDto,
  ): Promise<UserModuleAccessResponseDto> {
    const existing = await this.prisma.userModuleAccess.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`User module access with ID ${id} not found`);
    }

    const effectiveUntil = dto.effectiveUntil
      ? new Date(dto.effectiveUntil)
      : undefined;

    const updated = await this.prisma.userModuleAccess.update({
      where: { id },
      data: {
        permissions: (dto.permissions ?? existing.permissions) as any,
        reason: dto.reason ?? existing.reason,
        isActive: dto.isActive ?? existing.isActive,
        effectiveUntil: effectiveUntil ?? existing.effectiveUntil,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
      include: {
        userProfile: {
          select: {
            id: true,
            nip: true,
          },
        },
        module: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    await this.invalidateCache(updated.userProfileId, updated.moduleId);

    this.logger.log(`Updated user module access: ${id}`);

    return this.formatResponse(updated);
  }

  async revoke(id: string): Promise<void> {
    const access = await this.prisma.userModuleAccess.findUnique({
      where: { id },
    });

    if (!access) {
      throw new NotFoundException(`User module access with ID ${id} not found`);
    }

    await this.prisma.userModuleAccess.delete({
      where: { id },
    });

    await this.invalidateCache(access.userProfileId, access.moduleId);

    this.logger.log(`Revoked user module access: ${id}`);
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.userModuleAccess.updateMany({
      where: {
        isActive: true,
        effectiveUntil: {
          lt: new Date(),
        },
      },
      data: {
        isActive: false,
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Deactivated ${result.count} expired user module accesses`,
      );
    }

    return result.count;
  }

  private async invalidateCache(
    userProfileId: string,
    moduleId: string,
  ): Promise<void> {
    await this.cache.del(`${this.cachePrefix}user:${userProfileId}:true`);
    await this.cache.del(`${this.cachePrefix}user:${userProfileId}:false`);
    await this.cache.del(`${this.cachePrefix}module:${moduleId}`);
  }

  private formatResponse(access: any): UserModuleAccessResponseDto {
    return {
      id: access.id,
      userProfileId: access.user_profile_id,
      moduleId: access.module_id,
      permissions: access.permissions,
      grantedBy: access.granted_by,
      reason: access.reason,
      isActive: access.is_active,
      createdAt: access.created_at,
      updatedAt: access.updated_at,
      version: access.version,
      effectiveFrom: access.effective_from,
      effectiveUntil: access.effective_until,
      userProfile: access.userProfile
        ? {
            id: access.userProfile.id,
            nip: access.userProfile.nip,
          }
        : undefined,
      module: access.module
        ? {
            id: access.module.id,
            code: access.module.code,
            name: access.module.name,
          }
        : undefined,
    };
  }
}
