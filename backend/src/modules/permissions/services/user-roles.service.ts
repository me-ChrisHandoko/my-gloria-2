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
  AssignUserRoleDto,
  BulkAssignUserRolesDto,
  UserRoleResponseDto,
} from '../dto/user-role.dto';

@Injectable()
export class UserRolesService {
  private readonly logger = new Logger(UserRolesService.name);
  private readonly cachePrefix = 'user-role:';
  private readonly cacheTTL = 300;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async assign(
    dto: AssignUserRoleDto,
    assignedBy?: string,
  ): Promise<UserRoleResponseDto> {
    try {
      const [user, role] = await Promise.all([
        this.prisma.userProfile.findUnique({ where: { id: dto.userProfileId } }),
        this.prisma.role.findUnique({ where: { id: dto.roleId } }),
      ]);

      if (!user) throw new NotFoundException(`User profile with ID ${dto.userProfileId} not found`);
      if (!role) throw new NotFoundException(`Role with ID ${dto.roleId} not found`);

      const existing = await this.prisma.userRole.findUnique({
        where: {
          userProfileId_roleId: {
            userProfileId: dto.userProfileId,
            roleId: dto.roleId,
          },
        },
      });

      let userRole;
      if (existing) {
        userRole = await this.prisma.userRole.update({
          where: { id: existing.id },
          data: {
            isActive: dto.isActive ?? true,
            assignedBy: assignedBy,
            effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
            effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : undefined,
          },
          include: {
            userProfile: { select: { id: true, nip: true } },
            role: { select: { id: true, code: true, name: true, hierarchyLevel: true } },
          },
        });
      } else {
        userRole = await this.prisma.userRole.create({
          data: {
            id: uuidv7(),
            userProfileId: dto.userProfileId,
            roleId: dto.roleId,
            assignedBy: assignedBy,
            isActive: dto.isActive ?? true,
            effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
            effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : undefined,
          },
          include: {
            userProfile: { select: { id: true, nip: true } },
            role: { select: { id: true, code: true, name: true, hierarchyLevel: true } },
          },
        });
      }

      await this.invalidateUserCache(dto.userProfileId);
      this.logger.log(`Assigned role ${role.name} to user ${user.nip}`);
      return this.formatUserRoleResponse(userRole);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) throw error;
      this.logger.error(`Failed to assign user role: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to assign user role');
    }
  }

  async bulkAssign(dto: BulkAssignUserRolesDto, assignedBy?: string): Promise<UserRoleResponseDto[]> {
    const results: UserRoleResponseDto[] = [];
    for (const roleId of dto.roleIds) {
      const assignment = await this.assign(
        { userProfileId: dto.userProfileId, roleId, isActive: dto.isActive },
        assignedBy,
      );
      results.push(assignment);
    }
    return results;
  }

  async revoke(userProfileId: string, roleId: string): Promise<void> {
    const userRole = await this.prisma.userRole.findUnique({
      where: { userProfileId_roleId: { userProfileId: userProfileId, roleId: roleId } },
    });

    if (!userRole) {
      throw new NotFoundException(`User role assignment not found`);
    }

    await this.prisma.userRole.delete({ where: { id: userRole.id } });
    await this.invalidateUserCache(userProfileId);
    this.logger.log(`Revoked role ${roleId} from user ${userProfileId}`);
  }

  async getUserRoles(userProfileId: string): Promise<UserRoleResponseDto[]> {
    const cacheKey = `${this.cachePrefix}user:${userProfileId}`;
    const cached = await this.cache.get<UserRoleResponseDto[]>(cacheKey);
    if (cached) return cached;

    const userRoles = await this.prisma.userRole.findMany({
      where: { userProfileId: userProfileId, isActive: true },
      include: {
        userProfile: { select: { id: true, nip: true } },
        role: { select: { id: true, code: true, name: true, hierarchyLevel: true } },
      },
      orderBy: { role: { hierarchyLevel: 'desc' } },
    });

    const result = userRoles.map((ur) => this.formatUserRoleResponse(ur));
    await this.cache.set(cacheKey, result, this.cacheTTL);
    return result;
  }

  private async invalidateUserCache(userProfileId: string): Promise<void> {
    await this.cache.del(`${this.cachePrefix}user:${userProfileId}`);
    await this.cache.del(`user-permission:${userProfileId}`);
  }

  private formatUserRoleResponse(userRole: any): UserRoleResponseDto {
    return {
      id: userRole.id,
      userProfileId: userRole.user_profile_id,
      roleId: userRole.role_id,
      assignedAt: userRole.assigned_at,
      assignedBy: userRole.assigned_by,
      isActive: userRole.isActive,
      effectiveFrom: userRole.effective_from,
      effectiveUntil: userRole.effective_until,
      userProfile: userRole.user_profiles,
      role: userRole.roles ? {
        id: userRole.role.id,
        code: userRole.role.code,
        name: userRole.role.name,
        hierarchyLevel: userRole.role.hierarchyLevel,
      } : undefined,
    };
  }
}
