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
import { RateLimit } from '@/core/auth/decorators/rate-limit.decorator';
import {
  AuditLog,
  DataModificationAudit,
  AuditCategory,
  AuditSeverity,
} from '@/core/auth/decorators/audit-log.decorator';
import { RolesService } from '../services/role.service';
import { RoleHierarchyService } from '../services/role-hierarchy.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  AssignRoleDto,
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
  @RateLimit({
    limit: 20,
    windowMs: 10000, // 20 requests per 10 seconds
    message:
      'Too many role requests. Please wait a moment before trying again.',
    headers: true,
  })
  @RequiredPermission('roles', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get all roles',
    description:
      'Retrieves a paginated list of roles with optional filtering. Rate limited to 20 requests per 10 seconds.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Roles retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded. Please wait before retrying.',
  })
  async getRoles(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: boolean,
    @Query('isActive') isActive?: boolean,
    @Query('hierarchyLevel') hierarchyLevel?: number,
    @Query('isSystemRole') isSystemRole?: boolean,
  ) {
    // Parse pagination parameters
    const currentPage = page ? parseInt(page.toString(), 10) : 1;
    const pageSize = limit ? parseInt(limit.toString(), 10) : 10;

    // Use service method that returns paginated response
    // This matches the pattern used in permissions.controller.ts
    return this.rolesService.findManyPaginated(
      {
        search,
        includeInactive,
        isActive,
        hierarchyLevel,
        isSystemRole,
      },
      currentPage,
      pageSize,
    );
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

  @Delete(':roleId/hierarchy/:parentRoleId')
  @RequiredPermission('roles', PermissionAction.UPDATE)
  @DataModificationAudit('role.hierarchy.delete', 'role_hierarchy')
  @ApiOperation({ summary: 'Delete role hierarchy relationship' })
  @ApiParam({ name: 'roleId', description: 'Child Role ID' })
  @ApiParam({ name: 'parentRoleId', description: 'Parent Role ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role hierarchy deleted successfully',
  })
  async deleteRoleHierarchy(
    @Param('roleId') roleId: string,
    @Param('parentRoleId') parentRoleId: string,
  ) {
    return this.hierarchyService.deleteRoleHierarchy(roleId, parentRoleId);
  }

  @Get(':roleId/users')
  @RequiredPermission('roles', PermissionAction.READ)
  @ApiOperation({ summary: 'Get users assigned to a role' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role users retrieved successfully',
  })
  async getRoleUsers(
    @Param('roleId') roleId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    const currentPage = page ? parseInt(page.toString(), 10) : 1;
    const pageSize = limit ? parseInt(limit.toString(), 10) : 20;
    return this.rolesService.getRoleUsers(
      roleId,
      currentPage,
      pageSize,
      search,
    );
  }

  @Get(':roleId/modules')
  @RequiredPermission('roles', PermissionAction.READ)
  @ApiOperation({ summary: 'Get modules accessible by role' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role modules retrieved successfully',
  })
  async getRoleModules(@Param('roleId') roleId: string) {
    return this.rolesService.getRoleModules(roleId);
  }

  @Put('users/:userProfileId/roles/:roleId')
  @RequiredPermission('roles', PermissionAction.UPDATE)
  @DataModificationAudit('role.user.temporal.update', 'user_role')
  @ApiOperation({ summary: 'Update user role temporal settings' })
  @ApiParam({ name: 'userProfileId', description: 'User Profile ID' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User role temporal settings updated successfully',
  })
  async updateUserRoleTemporal(
    @Param('userProfileId') userProfileId: string,
    @Param('roleId') roleId: string,
    @Body() dto: { effectiveFrom?: string; effectiveUntil?: string },
  ) {
    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined;
    const effectiveUntil = dto.effectiveUntil ? new Date(dto.effectiveUntil) : undefined;
    return this.rolesService.updateUserRoleTemporal(
      userProfileId,
      roleId,
      effectiveFrom,
      effectiveUntil,
    );
  }

  // Removed: Template endpoints - RoleTemplate model no longer exists
  // @Post('templates')
  // @RequiredPermission('roles', PermissionAction.CREATE)
  // @DataModificationAudit('role.template.create', 'role_template')
  // @ApiOperation({ summary: 'Create role template' })
  // @ApiResponse({
  //   status: HttpStatus.CREATED,
  //   description: 'Role template created successfully',
  // })
  // async createRoleTemplate(
  //   @Body() dto: CreateRoleTemplateDto,
  //   @CurrentUser() user: any,
  // ) {
  //   return this.rolesService.createRoleTemplate(dto, user.id);
  // }

  // @Post('templates/apply')
  // @RequiredPermission('roles', PermissionAction.UPDATE)
  // @CriticalAudit('role.template.apply')
  // @ApiOperation({ summary: 'Apply role template' })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Role template applied successfully',
  // })
  // async applyRoleTemplate(
  //   @Body() dto: ApplyRoleTemplateDto,
  //   @CurrentUser() user: any,
  // ) {
  //   return this.rolesService.applyRoleTemplate(dto, user.id);
  // }

  // @Get('templates')
  // @RequiredPermission('roles', PermissionAction.READ)
  // @ApiOperation({ summary: 'Get all role templates' })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Role templates retrieved successfully',
  // })
  // async getRoleTemplates(
  //   @Query('page') page?: number,
  //   @Query('limit') limit?: number,
  //   @Query('search') search?: string,
  // ) {
  //   const currentPage = page ? parseInt(page.toString(), 10) : 1;
  //   const pageSize = limit ? parseInt(limit.toString(), 10) : 10;
  //   return this.rolesService.getRoleTemplates(currentPage, pageSize, search);
  // }

  // @Get('templates/:id')
  // @RequiredPermission('roles', PermissionAction.READ)
  // @ApiOperation({ summary: 'Get role template by ID' })
  // @ApiParam({ name: 'id', description: 'Role Template ID' })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Role template retrieved successfully',
  // })
  // async getRoleTemplateById(@Param('id') id: string) {
  //   return this.rolesService.getRoleTemplateById(id);
  // }

  // @Delete('templates/:id')
  // @RequiredPermission('roles', PermissionAction.DELETE)
  // @DataModificationAudit('role.template.delete', 'role_template')
  // @ApiOperation({ summary: 'Delete role template' })
  // @ApiParam({ name: 'id', description: 'Role Template ID' })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Role template deleted successfully',
  // })
  // async deleteRoleTemplate(@Param('id') id: string) {
  //   return this.rolesService.deleteRoleTemplate(id);
  // }

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
