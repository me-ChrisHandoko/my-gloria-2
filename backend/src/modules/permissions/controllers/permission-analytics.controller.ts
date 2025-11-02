import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AnalyticsService } from '../services/analytics.service';
import { BulkOperationsService } from '../services/bulk-operations.service';
import {
  RequiredPermission,
  PermissionAction,
} from '../../../core/auth/decorators/permissions.decorator';
import { AuditLog } from '../../../core/auth/decorators/audit-log.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import {
  PermissionUsageStatistics,
  RoleUsageStatistics,
  UserPermissionAudit,
} from '../types/analytics.types';
import {
  BulkOperationResult,
  BulkUserRoleAssignment,
  BulkPermissionAssignment,
} from '../services/bulk-operations.service';

@ApiTags('Permissions - Analytics & Bulk Operations')
@ApiBearerAuth()
@Controller({
  path: 'permissions',
  version: '1',
})
@UseInterceptors(ClassSerializerInterceptor)
export class PermissionAnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly bulkOperationsService: BulkOperationsService,
  ) {}

  // Analytics Endpoints

  @Get('usage-statistics')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get permission usage statistics',
    description:
      'Retrieves comprehensive statistics about permission usage across the system.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission usage statistics retrieved successfully',
  })
  async getPermissionUsageStatistics(): Promise<PermissionUsageStatistics> {
    return this.analyticsService.getPermissionUsageStatistics();
  }

  @Get('roles/usage-statistics')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('roles', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get role usage statistics',
    description:
      'Retrieves comprehensive statistics about role usage across the system.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role usage statistics retrieved successfully',
  })
  async getRoleUsageStatistics(): Promise<RoleUsageStatistics> {
    return this.analyticsService.getRoleUsageStatistics();
  }

  @Get('users/permission-audit/:userId')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get user permission audit',
    description:
      'Retrieves comprehensive permission audit for a specific user including roles, permissions, and module access.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User Profile UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User permission audit retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async getUserPermissionAudit(
    @Param('userId', ParseUUIDPipe) userProfileId: string,
  ): Promise<UserPermissionAudit> {
    return this.analyticsService.getUserPermissionAudit(userProfileId);
  }

  // Bulk Operations Endpoints

  @Post('bulk/assign-roles')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('roles', PermissionAction.CREATE)
  @AuditLog({ action: 'BULK_ASSIGN_ROLES' })
  @ApiOperation({
    summary: 'Bulk assign role to users',
    description: 'Assigns a role to multiple users at once.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk role assignment completed',
  })
  async bulkAssignRolesToUsers(
    @Body()
    data: {
      userProfileIds: string[];
      roleId: string;
    },
    @CurrentUser() currentUser: any,
  ) {
    return this.bulkOperationsService.bulkAssignRolesToUsers(
      data,
      currentUser.userProfileId || currentUser.id,
    );
  }

  @Post('bulk/assign-permissions')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('permissions', PermissionAction.CREATE)
  @AuditLog({ action: 'BULK_ASSIGN_PERMISSIONS' })
  @ApiOperation({
    summary: 'Bulk assign permissions to role',
    description: 'Assigns multiple permissions to a role at once.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk permission assignment completed',
  })
  async bulkAssignPermissionsToRole(
    @Body()
    data: {
      roleId: string;
      permissionIds: string[];
    },
  ) {
    return this.bulkOperationsService.bulkAssignPermissionsToRole(data);
  }

  @Post('bulk/revoke-roles')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('roles', PermissionAction.DELETE)
  @AuditLog({ action: 'BULK_REVOKE_ROLES' })
  @ApiOperation({
    summary: 'Bulk revoke role from users',
    description: 'Revokes a role from multiple users at once.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk role revocation completed',
  })
  async bulkRevokeRolesFromUsers(
    @Body()
    data: {
      userProfileIds: string[];
      roleId: string;
    },
  ) {
    return this.bulkOperationsService.bulkRevokeRolesFromUsers(data);
  }

  @Get('export')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Export permissions data',
    description:
      'Exports all permissions, roles, and role permissions for backup or migration.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permissions data exported successfully',
  })
  async exportPermissions() {
    return this.bulkOperationsService.exportPermissions();
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('permissions', PermissionAction.CREATE)
  @AuditLog({ action: 'IMPORT_PERMISSIONS' })
  @ApiOperation({
    summary: 'Import permissions data',
    description:
      'Imports permissions, roles, and role permissions from exported data.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permissions data imported successfully',
  })
  async importPermissions(
    @Body()
    data: {
      permissions?: any[];
      roles?: any[];
      rolePermissions?: any[];
    },
  ) {
    return this.bulkOperationsService.importPermissions(data);
  }
}
