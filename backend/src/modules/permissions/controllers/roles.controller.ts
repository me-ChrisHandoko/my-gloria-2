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
  RequiredPermission,
  PermissionAction,
} from '../../../core/auth/decorators/permissions.decorator';
import { AuditLog } from '../../../core/auth/decorators/audit-log.decorator';

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
    description: 'Assigns a permission to a role with optional conditions and effective dates.',
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
}
