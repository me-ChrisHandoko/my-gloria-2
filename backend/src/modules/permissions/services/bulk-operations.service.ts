import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { UserRolesService } from './user-roles.service';
import { RolePermissionsService } from './role-permissions.service';
import { UserPermissionsService } from './user-permissions.service';

export interface BulkUserRoleAssignment {
  userProfileIds: string[];
  roleId: string;
}

export interface BulkPermissionAssignment {
  roleId: string;
  permissionIds: string[];
}

export interface BulkOperationResult<T> {
  successful: T[];
  failed: Array<{
    item: any;
    error: string;
  }>;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    duration: number; // milliseconds
  };
}

@Injectable()
export class BulkOperationsService {
  private readonly logger = new Logger(BulkOperationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userRolesService: UserRolesService,
    private readonly rolePermissionsService: RolePermissionsService,
    private readonly userPermissionsService: UserPermissionsService,
  ) {}

  /**
   * Bulk assign role to multiple users
   */
  async bulkAssignRolesToUsers(
    data: BulkUserRoleAssignment,
    assignedBy: string,
  ): Promise<BulkOperationResult<any>> {
    const startTime = Date.now();
    const successful: any[] = [];
    const failed: Array<{ item: any; error: string }> = [];

    this.logger.log(
      `Starting bulk role assignment: ${data.userProfileIds.length} users → Role ${data.roleId}`,
    );

    for (const userProfileId of data.userProfileIds) {
      try {
        const result = await this.userRolesService.assign(
          {
            userProfileId,
            roleId: data.roleId,
          },
          assignedBy,
        );
        successful.push(result);
      } catch (error) {
        this.logger.warn(
          `Failed to assign role ${data.roleId} to user ${userProfileId}: ${error.message}`,
        );
        failed.push({
          item: { userProfileId, roleId: data.roleId },
          error: error.message,
        });
      }
    }

    const duration = Date.now() - startTime;

    this.logger.log(
      `Bulk role assignment completed: ${successful.length}/${data.userProfileIds.length} succeeded in ${duration}ms`,
    );

    return {
      successful,
      failed,
      summary: {
        total: data.userProfileIds.length,
        succeeded: successful.length,
        failed: failed.length,
        duration,
      },
    };
  }

  /**
   * Bulk assign permissions to role
   */
  async bulkAssignPermissionsToRole(
    data: BulkPermissionAssignment,
  ): Promise<BulkOperationResult<any>> {
    const startTime = Date.now();
    const successful: any[] = [];
    const failed: Array<{ item: any; error: string }> = [];

    this.logger.log(
      `Starting bulk permission assignment: ${data.permissionIds.length} permissions → Role ${data.roleId}`,
    );

    for (const permissionId of data.permissionIds) {
      try {
        const result = await this.rolePermissionsService.assign({
          roleId: data.roleId,
          permissionId,
          isGranted: true,
        });
        successful.push(result);
      } catch (error) {
        this.logger.warn(
          `Failed to assign permission ${permissionId} to role ${data.roleId}: ${error.message}`,
        );
        failed.push({
          item: { permissionId, roleId: data.roleId },
          error: error.message,
        });
      }
    }

    const duration = Date.now() - startTime;

    this.logger.log(
      `Bulk permission assignment completed: ${successful.length}/${data.permissionIds.length} succeeded in ${duration}ms`,
    );

    return {
      successful,
      failed,
      summary: {
        total: data.permissionIds.length,
        succeeded: successful.length,
        failed: failed.length,
        duration,
      },
    };
  }

  /**
   * Bulk revoke roles from users
   */
  async bulkRevokeRolesFromUsers(
    data: BulkUserRoleAssignment,
  ): Promise<BulkOperationResult<void>> {
    const startTime = Date.now();
    const successful: void[] = [];
    const failed: Array<{ item: any; error: string }> = [];

    this.logger.log(
      `Starting bulk role revocation: ${data.userProfileIds.length} users → Role ${data.roleId}`,
    );

    for (const userProfileId of data.userProfileIds) {
      try {
        await this.userRolesService.revoke(userProfileId, data.roleId);
        successful.push();
      } catch (error) {
        this.logger.warn(
          `Failed to revoke role ${data.roleId} from user ${userProfileId}: ${error.message}`,
        );
        failed.push({
          item: { userProfileId, roleId: data.roleId },
          error: error.message,
        });
      }
    }

    const duration = Date.now() - startTime;

    this.logger.log(
      `Bulk role revocation completed: ${successful.length}/${data.userProfileIds.length} succeeded in ${duration}ms`,
    );

    return {
      successful,
      failed,
      summary: {
        total: data.userProfileIds.length,
        succeeded: successful.length,
        failed: failed.length,
        duration,
      },
    };
  }

  /**
   * Export permissions data
   */
  async exportPermissions(): Promise<{
    permissions: any[];
    roles: any[];
    rolePermissions: any[];
    exportedAt: Date;
  }> {
    this.logger.log('Starting permissions export...');

    const [permissions, roles, rolePermissions] = await Promise.all([
      this.prisma.permission.findMany({
        where: { isActive: true },
        orderBy: [{ resource: 'asc' }, { action: 'asc' }],
      }),
      this.prisma.role.findMany({
        where: { isActive: true },
        orderBy: { hierarchyLevel: 'asc' },
      }),
      this.prisma.rolePermission.findMany({
        where: {
          role: { isActive: true },
          permission: { isActive: true },
        },
        include: {
          role: {
            select: {
              code: true,
              name: true,
            },
          },
          permission: {
            select: {
              resource: true,
              action: true,
            },
          },
        },
      }),
    ]);

    this.logger.log(
      `Export completed: ${permissions.length} permissions, ${roles.length} roles, ${rolePermissions.length} role permissions`,
    );

    return {
      permissions,
      roles,
      rolePermissions,
      exportedAt: new Date(),
    };
  }

  /**
   * Import permissions data (simplified version)
   */
  async importPermissions(data: {
    permissions?: any[];
    roles?: any[];
    rolePermissions?: any[];
  }): Promise<{
    imported: {
      permissions: number;
      roles: number;
      rolePermissions: number;
    };
    skipped: number;
    errors: string[];
  }> {
    this.logger.log('Starting permissions import...');

    const result = {
      imported: {
        permissions: 0,
        roles: 0,
        rolePermissions: 0,
      },
      skipped: 0,
      errors: [] as string[],
    };

    // Import permissions
    if (data.permissions) {
      for (const perm of data.permissions) {
        try {
          const existing = await this.prisma.permission.findFirst({
            where: {
              resource: perm.resource,
              action: perm.action,
            },
          });

          if (existing) {
            result.skipped++;
          } else {
            await this.prisma.permission.create({
              data: {
                id: perm.id,
                code: perm.code || `${perm.resource}:${perm.action}`,
                name: perm.name || `${perm.resource} ${perm.action}`,
                resource: perm.resource,
                action: perm.action,
                description: perm.description,
                isSystemPermission:
                  perm.isSystemPermission || perm.isSystem || false,
                isActive: perm.isActive !== false,
                createdAt: perm.createdAt
                  ? new Date(perm.createdAt)
                  : new Date(),
                updatedAt: perm.updatedAt
                  ? new Date(perm.updatedAt)
                  : new Date(),
              },
            });
            result.imported.permissions++;
          }
        } catch (error) {
          result.errors.push(
            `Failed to import permission ${perm.resource}.${perm.action}: ${error.message}`,
          );
        }
      }
    }

    // Import roles
    if (data.roles) {
      for (const role of data.roles) {
        try {
          const existing = await this.prisma.role.findUnique({
            where: { code: role.code },
          });

          if (existing) {
            result.skipped++;
          } else {
            await this.prisma.role.create({
              data: {
                id: role.id,
                code: role.code,
                name: role.name,
                description: role.description,
                hierarchyLevel: role.hierarchyLevel || role.hierarchy_level,
                isSystemRole:
                  role.isSystemRole || role.isSystem || role.is_system || false,
                isActive: role.isActive !== false && role.is_active !== false,
                createdAt: role.createdAt
                  ? new Date(role.createdAt)
                  : new Date(),
                updatedAt: role.updatedAt
                  ? new Date(role.updatedAt)
                  : new Date(),
              },
            });
            result.imported.roles++;
          }
        } catch (error) {
          result.errors.push(
            `Failed to import role ${role.code}: ${error.message}`,
          );
        }
      }
    }

    this.logger.log(
      `Import completed: ${result.imported.permissions} permissions, ${result.imported.roles} roles, ${result.skipped} skipped, ${result.errors.length} errors`,
    );

    return result;
  }
}
