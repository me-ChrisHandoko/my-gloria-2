import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  ParseIntPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '@/core/auth/guards/clerk-auth.guard';
import { PermissionsGuard } from '@/core/auth/guards/permissions.guard';
import { RequiredPermission } from '@/core/auth/decorators/permissions.decorator';
import { CurrentUser } from '@/core/auth/decorators/current-user.decorator';
import {
  DataModificationAudit,
  AuditLog,
  AuditCategory,
  AuditSeverity,
} from '@/core/auth/decorators/audit-log.decorator';
import { RolePermissionsService } from '../services/permission-roles.service';
import {
  AssignRolePermissionDto,
  UpdateRolePermissionDto,
  BulkAssignRolePermissionsDto,
  BulkRemoveRolePermissionsDto,
} from '../dto/role-permission.dto';
import { PermissionAction } from '@prisma/client';

@ApiTags('Role Permissions')
@ApiBearerAuth()
@Controller('roles/:roleId/permissions')
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class RolePermissionsController {
  constructor(
    private readonly rolePermissionsService: RolePermissionsService,
  ) {}

  @Post()
  @RequiredPermission('permissions', PermissionAction.CREATE)
  @DataModificationAudit('role_permission.assign', 'role_permission')
  @ApiOperation({ summary: 'Assign permission to role' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Permission assigned to role successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Permission already assigned to role',
  })
  async assignPermissionToRole(
    @Param('roleId') roleId: string,
    @Body() dto: AssignRolePermissionDto,
    @CurrentUser() user: any,
  ) {
    return this.rolePermissionsService.assignPermissionToRole(
      roleId,
      dto,
      user.id,
    );
  }

  @Delete(':permissionId')
  @RequiredPermission('permissions', PermissionAction.DELETE)
  @AuditLog({
    action: 'role_permission.remove',
    resource: 'role_permission',
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.HIGH,
  })
  @ApiOperation({ summary: 'Remove permission from role' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiParam({ name: 'permissionId', description: 'Permission ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission removed from role successfully',
  })
  async removePermissionFromRole(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
    @CurrentUser() user: any,
  ) {
    return this.rolePermissionsService.removePermissionFromRole(
      roleId,
      permissionId,
      user.id,
    );
  }

  @Get()
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get role permissions',
    description: 'Retrieves permissions assigned to a role with pagination',
  })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiQuery({
    name: 'isGranted',
    required: false,
    type: Boolean,
    description: 'Filter by grant status',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by validity (not expired)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role permissions retrieved successfully',
  })
  async getRolePermissions(
    @Param('roleId') roleId: string,
    @Query('isGranted') isGranted?: boolean,
    @Query('isActive') isActive?: boolean,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const filters = {
      ...(isGranted !== undefined && { isGranted }),
      ...(isActive !== undefined && { isActive }),
    };

    return this.rolePermissionsService.getRolePermissions(
      roleId,
      filters,
      page || 1,
      limit || 10,
    );
  }

  @Put(':permissionId')
  @RequiredPermission('permissions', PermissionAction.UPDATE)
  @DataModificationAudit('role_permission.update', 'role_permission')
  @ApiOperation({ summary: 'Update role permission' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiParam({ name: 'permissionId', description: 'Permission ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role permission updated successfully',
  })
  async updateRolePermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
    @Body() dto: UpdateRolePermissionDto,
    @CurrentUser() user: any,
  ) {
    return this.rolePermissionsService.updateRolePermission(
      roleId,
      permissionId,
      dto,
      user.id,
    );
  }

  @Get('effective')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get effective role permissions',
    description:
      'Retrieves all effective permissions for a role including inherited permissions from parent roles',
  })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Effective role permissions retrieved successfully',
  })
  async getEffectiveRolePermissions(@Param('roleId') roleId: string) {
    return this.rolePermissionsService.getEffectiveRolePermissions(roleId);
  }

  @Post('bulk-assign')
  @RequiredPermission('permissions', PermissionAction.CREATE)
  @AuditLog({
    action: 'role_permission.bulk_assign',
    resource: 'role_permission',
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.HIGH,
    includeBody: true,
  })
  @ApiOperation({ summary: 'Bulk assign permissions to role' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permissions assigned to role successfully',
  })
  async bulkAssignPermissions(
    @Param('roleId') roleId: string,
    @Body() dto: BulkAssignRolePermissionsDto,
    @CurrentUser() user: any,
  ) {
    return this.rolePermissionsService.bulkAssignRolePermissions(
      roleId,
      dto,
      user.id,
    );
  }

  @Post('bulk-remove')
  @RequiredPermission('permissions', PermissionAction.DELETE)
  @AuditLog({
    action: 'role_permission.bulk_remove',
    resource: 'role_permission',
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.HIGH,
    includeBody: true,
  })
  @ApiOperation({ summary: 'Bulk remove permissions from role' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permissions removed from role successfully',
  })
  async bulkRemovePermissions(
    @Param('roleId') roleId: string,
    @Body() dto: BulkRemoveRolePermissionsDto,
    @CurrentUser() user: any,
  ) {
    return this.rolePermissionsService.bulkRemoveRolePermissions(
      roleId,
      dto,
      user.id,
    );
  }
}
