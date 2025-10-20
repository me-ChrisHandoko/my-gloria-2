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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '@/core/auth/guards/clerk-auth.guard';
import { PermissionsGuard } from '@/core/auth/guards/permissions.guard';
import { RequiredPermission } from '@/core/auth/decorators/permissions.decorator';
import { CurrentUser } from '@/core/auth/decorators/current-user.decorator';
import {
  AuditLog,
  CriticalAudit,
  DataModificationAudit,
  AuditCategory,
  AuditSeverity,
} from '@/core/auth/decorators/audit-log.decorator';
import { RolesService } from '../services/roles.service';
import { RoleHierarchyService } from '../services/role-hierarchy.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  AssignRoleDto,
  AssignRolePermissionDto,
  BulkAssignRolePermissionsDto,
  CreateRoleTemplateDto,
  ApplyRoleTemplateDto,
  CreateRoleHierarchyDto,
} from '../dto/role.dto';
import { PermissionAction } from '@prisma/client';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly hierarchyService: RoleHierarchyService,
  ) {}

  @Post()
  @RequiredPermission('roles', PermissionAction.CREATE)
  @DataModificationAudit('role.create', 'role')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Role created successfully',
  })
  async createRole(@Body() dto: CreateRoleDto, @CurrentUser() user: any) {
    return this.rolesService.createRole(dto, user.id);
  }

  @Get()
  @RequiredPermission('roles', PermissionAction.READ)
  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Roles retrieved successfully',
  })
  async getRoles(@Query('includeInactive') includeInactive?: boolean) {
    return this.rolesService.findAll(includeInactive);
  }

  @Get('statistics')
  @RequiredPermission('roles', PermissionAction.READ)
  @ApiOperation({ summary: 'Get role statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics() {
    return this.rolesService.getStatistics();
  }

  @Get(':id')
  @RequiredPermission('roles', PermissionAction.READ)
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role retrieved successfully',
  })
  async getRoleById(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  @Get('code/:code')
  @RequiredPermission('roles', PermissionAction.READ)
  @ApiOperation({ summary: 'Get role by code' })
  @ApiParam({ name: 'code', description: 'Role code' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role retrieved successfully',
  })
  async getRoleByCode(@Param('code') code: string) {
    return this.rolesService.findByCode(code);
  }

  @Put(':id')
  @RequiredPermission('roles', PermissionAction.UPDATE)
  @DataModificationAudit('role.update', 'role')
  @ApiOperation({ summary: 'Update role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role updated successfully',
  })
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: any,
  ) {
    return this.rolesService.updateRole(id, dto, user.id);
  }

  @Post('assign')
  @RequiredPermission('roles', PermissionAction.UPDATE)
  @AuditLog({
    action: 'role.assign',
    resource: 'user_role',
    category: AuditCategory.AUTHORIZATION,
    severity: AuditSeverity.HIGH,
    includeBody: true,
  })
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role assigned successfully',
  })
  async assignRole(@Body() dto: AssignRoleDto, @CurrentUser() user: any) {
    return this.rolesService.assignRole(dto, user.id);
  }

  @Delete(':id')
  @RequiredPermission('roles', PermissionAction.DELETE)
  @AuditLog({
    action: 'role.delete',
    resource: 'role',
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.HIGH,
    alert: true,
  })
  @ApiOperation({
    summary: 'Soft delete role',
    description:
      'Marks a role as inactive. The role must not have any active user assignments.',
  })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete role with active assignments or system role',
  })
  async deleteRole(@Param('id') id: string, @CurrentUser() user: any) {
    return this.rolesService.deleteRole(id, user.id);
  }

  @Delete('users/:userProfileId/roles/:roleId')
  @RequiredPermission('roles', PermissionAction.UPDATE)
  @AuditLog({
    action: 'role.remove',
    resource: 'user_role',
    category: AuditCategory.AUTHORIZATION,
    severity: AuditSeverity.HIGH,
  })
  @ApiOperation({ summary: 'Remove role from user' })
  @ApiParam({ name: 'userProfileId', description: 'User Profile ID' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Role removed from user successfully',
  })
  async removeRoleFromUser(
    @Param('userProfileId') userProfileId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: any,
  ) {
    await this.rolesService.removeRole(userProfileId, roleId, user.id);
  }

  @Post(':roleId/permissions')
  @RequiredPermission('roles', PermissionAction.UPDATE)
  @AuditLog({
    action: 'role.permission.assign',
    resource: 'role_permission',
    category: AuditCategory.AUTHORIZATION,
    severity: AuditSeverity.HIGH,
    includeBody: true,
  })
  @ApiOperation({ summary: 'Assign permission to role' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission assigned to role successfully',
  })
  async assignPermissionToRole(
    @Param('roleId') roleId: string,
    @Body() dto: AssignRolePermissionDto,
    @CurrentUser() user: any,
  ) {
    return this.rolesService.assignPermissionToRole(roleId, dto, user.id);
  }

  @Post(':roleId/permissions/bulk')
  @RequiredPermission('roles', PermissionAction.UPDATE)
  @CriticalAudit('role.permission.bulk_assign')
  @ApiOperation({ summary: 'Bulk assign permissions to role' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permissions assigned successfully',
  })
  async bulkAssignPermissionsToRole(
    @Param('roleId') roleId: string,
    @Body() dto: BulkAssignRolePermissionsDto,
    @CurrentUser() user: any,
  ) {
    return this.rolesService.bulkAssignPermissionsToRole(roleId, dto, user.id);
  }

  @Delete(':roleId/permissions/:permissionId')
  @RequiredPermission('roles', PermissionAction.UPDATE)
  @AuditLog({
    action: 'role.permission.remove',
    resource: 'role_permission',
    category: AuditCategory.AUTHORIZATION,
    severity: AuditSeverity.HIGH,
  })
  @ApiOperation({ summary: 'Remove permission from role' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiParam({ name: 'permissionId', description: 'Permission ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Permission removed from role',
  })
  async removePermissionFromRole(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
    @CurrentUser() user: any,
  ) {
    await this.rolesService.removePermissionFromRole(
      roleId,
      permissionId,
      user.id,
    );
  }

  @Post(':roleId/hierarchy')
  @RequiredPermission('roles', PermissionAction.UPDATE)
  @AuditLog({
    action: 'role.hierarchy.create',
    resource: 'role_hierarchy',
    category: AuditCategory.AUTHORIZATION,
    severity: AuditSeverity.HIGH,
    includeBody: true,
  })
  @ApiOperation({ summary: 'Create role hierarchy' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Role hierarchy created successfully',
  })
  async createRoleHierarchy(
    @Param('roleId') roleId: string,
    @Body() dto: CreateRoleHierarchyDto,
    @CurrentUser() user: any,
  ) {
    return this.hierarchyService.createHierarchy(
      roleId,
      dto.parentRoleId,
      dto.inheritPermissions,
    );
  }

  @Get(':roleId/hierarchy')
  @RequiredPermission('roles', PermissionAction.READ)
  @ApiOperation({ summary: 'Get role hierarchy' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role hierarchy retrieved successfully',
  })
  async getRoleHierarchy(@Param('roleId') roleId: string) {
    return this.hierarchyService.getRoleHierarchy(roleId);
  }

  @Post('templates')
  @RequiredPermission('roles', PermissionAction.CREATE)
  @DataModificationAudit('role.template.create', 'role_template')
  @ApiOperation({ summary: 'Create role template' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Role template created successfully',
  })
  async createRoleTemplate(
    @Body() dto: CreateRoleTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.rolesService.createRoleTemplate(dto, user.id);
  }

  @Post('templates/apply')
  @RequiredPermission('roles', PermissionAction.UPDATE)
  @CriticalAudit('role.template.apply')
  @ApiOperation({ summary: 'Apply role template' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role template applied successfully',
  })
  async applyRoleTemplate(
    @Body() dto: ApplyRoleTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.rolesService.applyRoleTemplate(dto, user.id);
  }

  @Get('user/:userProfileId')
  @RequiredPermission('roles', PermissionAction.READ)
  @ApiOperation({ summary: 'Get user roles' })
  @ApiParam({ name: 'userProfileId', description: 'User Profile ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User roles retrieved successfully',
  })
  async getUserRoles(@Param('userProfileId') userProfileId: string) {
    return this.rolesService.getUserRoles(userProfileId);
  }
}
