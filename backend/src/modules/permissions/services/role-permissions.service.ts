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
  AssignRolePermissionDto,
  BulkAssignRolePermissionsDto,
  RolePermissionResponseDto,
} from '../dto/role-permission.dto';

@Injectable()
export class RolePermissionsService {
  private readonly logger = new Logger(RolePermissionsService.name);
  private readonly cachePrefix = 'role-permission:';
  private readonly cacheTTL = 300; // 5 minutes for permission data

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async assign(
    dto: AssignRolePermissionDto,
    assignedBy?: string,
  ): Promise<RolePermissionResponseDto> {
    try {
      // Verify role exists
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });

      if (!role) {
        throw new NotFoundException(`Role with ID ${dto.roleId} not found`);
      }

      // Verify permission exists
      const permission = await this.prisma.permission.findUnique({
        where: { id: dto.permissionId },
      });

      if (!permission) {
        throw new NotFoundException(
          `Permission with ID ${dto.permissionId} not found`,
        );
      }

      // Check for existing assignment
      const existingAssignment = await this.prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: dto.roleId,
            permissionId: dto.permissionId,
          },
        },
      });

      let rolePermission;

      if (existingAssignment) {
        // Update existing assignment
        rolePermission = await this.prisma.rolePermission.update({
          where: { id: existingAssignment.id },
          data: {
            isGranted: dto.isGranted ?? true,
            conditions: dto.conditions ? JSON.parse(dto.conditions) : undefined,
            grantReason: dto.grantReason,
            grantedBy: assignedBy,
            effectiveFrom: dto.effectiveFrom
              ? new Date(dto.effectiveFrom)
              : undefined,
            effectiveUntil: dto.effectiveUntil
              ? new Date(dto.effectiveUntil)
              : undefined,
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
            permission: {
              select: {
                id: true,
                code: true,
                name: true,
                resource: true,
                action: true,
              },
            },
          },
        });
      } else {
        // Create new assignment
        rolePermission = await this.prisma.rolePermission.create({
          data: {
            id: uuidv7(),
            roleId: dto.roleId,
            permissionId: dto.permissionId,
            isGranted: dto.isGranted ?? true,
            conditions: dto.conditions ? JSON.parse(dto.conditions) : undefined,
            grantReason: dto.grantReason,
            grantedBy: assignedBy,
            effectiveFrom: dto.effectiveFrom
              ? new Date(dto.effectiveFrom)
              : new Date(),
            effectiveUntil: dto.effectiveUntil
              ? new Date(dto.effectiveUntil)
              : undefined,
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
            permission: {
              select: {
                id: true,
                code: true,
                name: true,
                resource: true,
                action: true,
              },
            },
          },
        });
      }

      // Invalidate cache
      await this.invalidateRoleCache(dto.roleId);

      this.logger.log(
        `${existingAssignment ? 'Updated' : 'Created'} role permission: Role ${role.name} → Permission ${permission.name}`,
      );
      return this.formatRolePermissionResponse(rolePermission);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to assign role permission: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to assign role permission');
    }
  }

  async bulkAssign(
    dto: BulkAssignRolePermissionsDto,
    assignedBy?: string,
  ): Promise<RolePermissionResponseDto[]> {
    try {
      // Verify role exists
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });

      if (!role) {
        throw new NotFoundException(`Role with ID ${dto.roleId} not found`);
      }

      // Verify all permissions exist
      const foundPermissions = await this.prisma.permission.findMany({
        where: {
          id: { in: dto.permissionIds },
        },
      });

      if (foundPermissions.length !== dto.permissionIds.length) {
        const foundIds = foundPermissions.map((p) => p.id);
        const missingIds = dto.permissionIds.filter(
          (id) => !foundIds.includes(id),
        );
        throw new BadRequestException(
          `Permissions not found: ${missingIds.join(', ')}`,
        );
      }

      const results: RolePermissionResponseDto[] = [];

      // Assign each permission
      for (const permissionId of dto.permissionIds) {
        const assignment = await this.assign(
          {
            roleId: dto.roleId,
            permissionId,
            isGranted: dto.isGranted,
            grantReason: dto.grantReason,
          },
          assignedBy,
        );
        results.push(assignment);
      }

      this.logger.log(
        `Bulk assigned ${dto.permissionIds.length} userPermissions to role ${role.name}`,
      );
      return results;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to bulk assign role permission: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        'Failed to bulk assign role userPermissions',
      );
    }
  }

  async revoke(roleId: string, permissionId: string): Promise<void> {
    try {
      const rolePermission = await this.prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: roleId,
            permissionId: permissionId,
          },
        },
      });

      if (!rolePermission) {
        throw new NotFoundException(
          `Role permission assignment not found for role ${roleId} and permission ${permissionId}`,
        );
      }

      await this.prisma.rolePermission.delete({
        where: { id: rolePermission.id },
      });

      // Invalidate cache
      await this.invalidateRoleCache(roleId);

      this.logger.log(`Revoked permission ${permissionId} from role ${roleId}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to revoke role permission: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to revoke role permission');
    }
  }

  async getRolePermissions(
    roleId: string,
  ): Promise<RolePermissionResponseDto[]> {
    const cacheKey = `${this.cachePrefix}role:${roleId}`;
    const cached = await this.cache.get<RolePermissionResponseDto[]>(cacheKey);

    if (cached) {
      return cached;
    }

    // Verify role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        roleId: roleId,
        isGranted: true,
      },
      include: {
        role: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        permission: {
          select: {
            id: true,
            code: true,
            name: true,
            resource: true,
            action: true,
          },
        },
      },
      orderBy: [
        { permission: { resource: 'asc' } },
        { permission: { action: 'asc' } },
      ],
    });

    const result = rolePermissions.map((rp) =>
      this.formatRolePermissionResponse(rp),
    );

    await this.cache.set(cacheKey, result, this.cacheTTL);
    return result;
  }

  async getEffectiveRolePermissions(
    roleId: string,
  ): Promise<RolePermissionResponseDto[]> {
    const now = new Date();

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        roleId: roleId,
        isGranted: true,
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: now } }],
      },
      include: {
        role: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        permission: {
          select: {
            id: true,
            code: true,
            name: true,
            resource: true,
            action: true,
          },
        },
      },
      orderBy: [
        { permission: { resource: 'asc' } },
        { permission: { action: 'asc' } },
      ],
    });

    return rolePermissions.map((rp) => this.formatRolePermissionResponse(rp));
  }

  private async invalidateRoleCache(roleId: string): Promise<void> {
    await this.cache.del(`${this.cachePrefix}role:${roleId}`);
    // Also invalidate user permission caches (they depend on role userPermissions)
    await this.cache.del('user-permission:*');
  }

  private formatRolePermissionResponse(
    rolePermission: any,
  ): RolePermissionResponseDto {
    return {
      id: rolePermission.id,
      roleId: rolePermission.role_id,
      permissionId: rolePermission.permission_id,
      isGranted: rolePermission.is_granted,
      conditions: rolePermission.conditions,
      grantedBy: rolePermission.granted_by,
      grantReason: rolePermission.grant_reason,
      effectiveFrom: rolePermission.effective_from,
      effectiveUntil: rolePermission.effective_until,
      createdAt: rolePermission.created_at,
      updatedAt: rolePermission.updated_at,
      role: rolePermission.roles,
      permission: rolePermission.permission,
    };
  }
}
