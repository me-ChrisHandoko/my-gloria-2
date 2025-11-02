import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
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
import { RolesService } from '../services/roles.service';
import { RolePermissionsService } from '../services/role-permissions.service';
import { RoleModuleAccessService } from '../services/role-module-access.service';
import { RoleHierarchyService } from '../services/role-hierarchy.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  QueryRoleDto,
  RoleResponseDto,
  PaginatedRoleResponseDto,
} from '../dto/role.dto';
import {
  AssignRolePermissionDto,
  BulkAssignRolePermissionsDto,
  RolePermissionResponseDto,
} from '../dto/role-permission.dto';
import {
  GrantRoleModuleAccessDto,
  BulkGrantRoleModuleAccessDto,
  RoleModuleAccessResponseDto,
} from '../dto/role-module-access.dto';
import {
  RequiredPermission,
  PermissionAction,
} from '../../../core/auth/decorators/permissions.decorator';
import { AuditLog } from '../../../core/auth/decorators/audit-log.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';

@ApiTags('Permissions - Roles')
@ApiBearerAuth()
@Controller({
  path: 'permissions/roles',
  version: '1',
})
@UseInterceptors(ClassSerializerInterceptor)
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly rolePermissionsService: RolePermissionsService,
    private readonly roleModuleAccessService: RoleModuleAccessService,
    private readonly roleHierarchyService: RoleHierarchyService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiredPermission('roles', PermissionAction.CREATE)
  @AuditLog({ action: 'CREATE_ROLE' })
  @ApiOperation({
    summary: 'Create a new role',
    description:
      'Creates a new role with specified permissions and hierarchy level.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Role created successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Role with the same code already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid role data provided',
  })
  async create(@Body() createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('roles', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get all roles',
    description:
      'Retrieves a paginated list of roles with optional filtering and sorting.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Roles retrieved successfully',
    type: PaginatedRoleResponseDto,
  })
  async findAll(
    @Query() query: QueryRoleDto,
  ): Promise<PaginatedRoleResponseDto> {
    return this.rolesService.findAll(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('roles', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get role by ID',
    description: 'Retrieves a single role by its ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Role UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role retrieved successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoleResponseDto> {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('roles', PermissionAction.UPDATE)
  @AuditLog({ action: 'UPDATE_ROLE' })
  @ApiOperation({
    summary: 'Update role',
    description:
      'Updates an existing role. System roles have restricted update capabilities.',
  })
  @ApiParam({
    name: 'id',
    description: 'Role UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role updated successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot modify system role critical fields',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('roles', PermissionAction.DELETE)
  @AuditLog({ action: 'DELETE_ROLE' })
  @ApiOperation({
    summary: 'Delete role (soft delete)',
    description:
      'Soft deletes a role by setting isActive to false. Cannot delete system roles or roles in use.',
  })
  @ApiParam({
    name: 'id',
    description: 'Role UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role deleted successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete system role or role in use',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoleResponseDto> {
    return this.rolesService.remove(id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('roles', PermissionAction.UPDATE)
  @AuditLog({ action: 'RESTORE_ROLE' })
  @ApiOperation({
    summary: 'Restore deleted role',
    description: 'Restores a soft-deleted role by setting isActive to true.',
  })
  @ApiParam({
    name: 'id',
    description: 'Role UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role restored successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Role is already active',
  })
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoleResponseDto> {
    return this.rolesService.restore(id);
  }

  // Role Permission Management

  @Post(':id/permissions')
  @HttpCode(HttpStatus.CREATED)
  @RequiredPermission('roles', PermissionAction.UPDATE)
  @AuditLog({ action: 'ASSIGN_ROLE_PERMISSION' })
  @ApiOperation({
    summary: 'Assign permission to role',
    description:
      'Assigns a permission to a role with optional conditions and effective dates.',
  })
  @ApiParam({
    name: 'id',
    description: 'Role UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Permission assigned successfully',
    type: RolePermissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role or permission not found',
  })
  async assignPermission(
    @Param('id', ParseUUIDPipe) roleId: string,
    @Body() dto: Omit<AssignRolePermissionDto, 'roleId'>,
  ): Promise<RolePermissionResponseDto> {
    return this.rolePermissionsService.assign({
      ...dto,
      roleId,
    });
  }

  @Post(':id/permissions/bulk')
  @HttpCode(HttpStatus.CREATED)
  @RequiredPermission('roles', PermissionAction.UPDATE)
  @AuditLog({ action: 'BULK_ASSIGN_ROLE_PERMISSIONS' })
  @ApiOperation({
    summary: 'Bulk assign permissions to role',
    description: 'Assigns multiple permissions to a role at once.',
  })
  @ApiParam({
    name: 'id',
    description: 'Role UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Permissions assigned successfully',
    type: [RolePermissionResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role or some permissions not found',
  })
  async bulkAssignPermissions(
    @Param('id', ParseUUIDPipe) roleId: string,
    @Body() dto: Omit<BulkAssignRolePermissionsDto, 'roleId'>,
  ): Promise<RolePermissionResponseDto[]> {
    return this.rolePermissionsService.bulkAssign({
      ...dto,
      roleId,
    });
  }

  @Get(':id/permissions')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('roles', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get role permissions',
    description: 'Retrieves all permissions assigned to a role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Role UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role permissions retrieved successfully',
    type: [RolePermissionResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  async getRolePermissions(
    @Param('id', ParseUUIDPipe) roleId: string,
  ): Promise<RolePermissionResponseDto[]> {
    return this.rolePermissionsService.getRolePermissions(roleId);
  }

  @Delete(':id/permissions/:permissionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiredPermission('roles', PermissionAction.UPDATE)
  @AuditLog({ action: 'REVOKE_ROLE_PERMISSION' })
  @ApiOperation({
    summary: 'Revoke permission from role',
    description: 'Removes a permission from a role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Role UUID',
    type: String,
  })
  @ApiParam({
    name: 'permissionId',
    description: 'Permission UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Permission revoked successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role permission assignment not found',
  })
  async revokePermission(
    @Param('id', ParseUUIDPipe) roleId: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
  ): Promise<void> {
    return this.rolePermissionsService.revoke(roleId, permissionId);
  }

  // Role Module Access Management

  @Post(':id/modules')
  @HttpCode(HttpStatus.CREATED)
  @RequiredPermission('roles', PermissionAction.UPDATE)
  @AuditLog({ action: 'GRANT_ROLE_MODULE_ACCESS' })
  @ApiOperation({
    summary: 'Grant module access to role',
    description:
      'Grants access to a module for a role with specific permissions.',
  })
  @ApiParam({
    name: 'id',
    description: 'Role UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Module access granted successfully',
    type: RoleModuleAccessResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role or module not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Module access already exists',
  })
  async grantModuleAccess(
    @Param('id', ParseUUIDPipe) roleId: string,
    @Body() dto: Omit<GrantRoleModuleAccessDto, 'roleId'>,
    @CurrentUser() currentUser: any,
  ): Promise<RoleModuleAccessResponseDto> {
    return this.roleModuleAccessService.grant(
      {
        ...dto,
        roleId,
      },
      currentUser.userProfileId || currentUser.id,
    );
  }

  @Post(':id/modules/bulk')
  @HttpCode(HttpStatus.CREATED)
  @RequiredPermission('roles', PermissionAction.UPDATE)
  @AuditLog({ action: 'BULK_GRANT_ROLE_MODULE_ACCESS' })
  @ApiOperation({
    summary: 'Bulk grant module access to role',
    description: 'Grants access to multiple modules for a role at once.',
  })
  @ApiParam({
    name: 'id',
    description: 'Role UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Module accesses granted successfully',
    type: [RoleModuleAccessResponseDto],
  })
  async bulkGrantModuleAccess(
    @Param('id', ParseUUIDPipe) roleId: string,
    @Body() dto: Omit<BulkGrantRoleModuleAccessDto, 'roleId'>,
    @CurrentUser() currentUser: any,
  ): Promise<RoleModuleAccessResponseDto[]> {
    return this.roleModuleAccessService.bulkGrant(
      {
        ...dto,
        roleId,
      },
      currentUser.userProfileId || currentUser.id,
    );
  }

  @Get(':id/modules')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('roles', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get role module accesses',
    description: 'Retrieves all module accesses for a role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Role UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role module accesses retrieved successfully',
    type: [RoleModuleAccessResponseDto],
  })
  async getRoleModuleAccesses(
    @Param('id', ParseUUIDPipe) roleId: string,
  ): Promise<RoleModuleAccessResponseDto[]> {
    return this.roleModuleAccessService.findByRole(roleId);
  }

  @Delete(':id/modules/:moduleAccessId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiredPermission('roles', PermissionAction.UPDATE)
  @AuditLog({ action: 'REVOKE_ROLE_MODULE_ACCESS' })
  @ApiOperation({
    summary: 'Revoke module access from role',
    description: 'Removes module access from a role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Role UUID',
    type: String,
  })
  @ApiParam({
    name: 'moduleAccessId',
    description: 'Module Access UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Module access revoked successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module access not found',
  })
  async revokeModuleAccess(
    @Param('moduleAccessId', ParseUUIDPipe) moduleAccessId: string,
  ): Promise<void> {
    return this.roleModuleAccessService.revoke(moduleAccessId);
  }

  // Role Hierarchy Management

  @Post(':id/hierarchy')
  @HttpCode(HttpStatus.CREATED)
  @RequiredPermission('roles', PermissionAction.UPDATE)
  @AuditLog({ action: 'CREATE_ROLE_HIERARCHY' })
  @ApiOperation({
    summary: 'Create role hierarchy',
    description:
      'Creates parent-child relationship between roles with circular dependency prevention.',
  })
  @ApiParam({
    name: 'id',
    description: 'Child Role UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Role hierarchy created successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Would create circular dependency or invalid hierarchy level',
  })
  async createHierarchy(
    @Param('id', ParseUUIDPipe) childId: string,
    @Body('parentId') parentId: string,
  ): Promise<RoleResponseDto> {
    return this.roleHierarchyService.createHierarchy(childId, parentId);
  }

  @Get(':id/hierarchy/tree')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('roles', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get role hierarchy tree',
    description: 'Retrieves hierarchical tree structure for a role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Role UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role hierarchy tree retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  async getHierarchyTree(@Param('id', ParseUUIDPipe) roleId: string) {
    return this.roleHierarchyService.getHierarchyTree(roleId);
  }

  @Get(':id/hierarchy/inherited-permissions')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('roles', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get inherited permissions',
    description: 'Retrieves all permissions inherited from parent roles.',
  })
  @ApiParam({
    name: 'id',
    description: 'Role UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inherited permissions retrieved successfully',
    type: [RolePermissionResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  async getInheritedPermissions(
    @Param('id', ParseUUIDPipe) roleId: string,
  ): Promise<RolePermissionResponseDto[]> {
    return this.roleHierarchyService.getInheritedPermissions(roleId);
  }

  @Delete(':id/hierarchy')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('roles', PermissionAction.UPDATE)
  @AuditLog({ action: 'REMOVE_ROLE_HIERARCHY' })
  @ApiOperation({
    summary: 'Remove role hierarchy',
    description: 'Removes parent-child relationship from a role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Role UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role hierarchy removed successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Role does not have a parent',
  })
  async removeHierarchy(
    @Param('id', ParseUUIDPipe) roleId: string,
  ): Promise<RoleResponseDto> {
    return this.roleHierarchyService.removeHierarchy(roleId);
  }
}
