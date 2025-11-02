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
import { PermissionsService } from '../services/permissions.service';
import { PermissionCheckerService } from '../services/permission-checker.service';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  QueryPermissionDto,
  PermissionResponseDto,
  PaginatedPermissionResponseDto,
} from '../dto/permission.dto';
import {
  CheckPermissionDto,
  CheckPermissionResponseDto,
  BulkCheckPermissionsDto,
  BulkCheckPermissionsResponseDto,
} from '../dto/check-permission.dto';
import {
  RequiredPermission,
  PermissionAction,
} from '../../../core/auth/decorators/permissions.decorator';
import { AuditLog } from '../../../core/auth/decorators/audit-log.decorator';

@ApiTags('Permissions - Permissions')
@ApiBearerAuth()
@Controller({
  path: 'permissions',
  version: '1',
})
@UseInterceptors(ClassSerializerInterceptor)
export class PermissionsController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly permissionCheckerService: PermissionCheckerService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiredPermission('permissions', PermissionAction.CREATE)
  @AuditLog({ action: 'CREATE_PERMISSION' })
  @ApiOperation({
    summary: 'Create a new permission',
    description:
      'Creates a new permission with resource, action, and scope definition.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Permission created successfully',
    type: PermissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description:
      'Permission with the same code or resource+action+scope combination already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid permission data provided',
  })
  async create(
    @Body() createPermissionDto: CreatePermissionDto,
  ): Promise<PermissionResponseDto> {
    return this.permissionsService.create(createPermissionDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get all permissions',
    description:
      'Retrieves a paginated list of permissions with optional filtering and sorting.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permissions retrieved successfully',
    type: PaginatedPermissionResponseDto,
  })
  async findAll(
    @Query() query: QueryPermissionDto,
  ): Promise<PaginatedPermissionResponseDto> {
    return this.permissionsService.findAll(query);
  }

  @Get('grouped')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get permissions grouped by resource or category',
    description:
      'Retrieves all active permissions organized by resource or category for easier management.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Grouped permissions retrieved successfully',
  })
  async findGrouped(
    @Query('groupBy') groupBy: 'resource' | 'category' = 'resource',
  ) {
    const allPermissions = await this.permissionsService.findAll({
      page: 1,
      limit: 1000,
      isActive: true,
    });

    const grouped = allPermissions.data.reduce(
      (acc, permission) => {
        const key =
          groupBy === 'category' ? permission.category : permission.resource;
        const groupKey = key || 'uncategorized';

        if (!acc[groupKey]) {
          acc[groupKey] = [];
        }
        acc[groupKey].push(permission);
        return acc;
      },
      {} as Record<string, PermissionResponseDto[]>,
    );

    return {
      groupBy,
      groups: grouped,
      totalGroups: Object.keys(grouped).length,
      totalPermissions: allPermissions.data.length,
    };
  }

  @Get('by-code/:code')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get permission by code',
    description: 'Retrieves a single permission by its unique code.',
  })
  @ApiParam({
    name: 'code',
    description: 'Permission code',
    type: String,
    example: 'users:create',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission retrieved successfully',
    type: PermissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Permission not found',
  })
  async findByCode(
    @Param('code') code: string,
  ): Promise<PermissionResponseDto> {
    return this.permissionsService.findByCode(code);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get permission by ID',
    description: 'Retrieves a single permission by its ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Permission UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission retrieved successfully',
    type: PermissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Permission not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PermissionResponseDto> {
    return this.permissionsService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('permissions', PermissionAction.UPDATE)
  @AuditLog({ action: 'UPDATE_PERMISSION' })
  @ApiOperation({
    summary: 'Update permission',
    description:
      'Updates an existing permission. System permissions have restricted update capabilities.',
  })
  @ApiParam({
    name: 'id',
    description: 'Permission UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission updated successfully',
    type: PermissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Permission not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot modify system permission critical fields',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    return this.permissionsService.update(id, updatePermissionDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('permissions', PermissionAction.DELETE)
  @AuditLog({ action: 'DELETE_PERMISSION' })
  @ApiOperation({
    summary: 'Delete permission (soft delete)',
    description:
      'Soft deletes a permission by setting isActive to false. Cannot delete system permissions or permissions in use.',
  })
  @ApiParam({
    name: 'id',
    description: 'Permission UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission deleted successfully',
    type: PermissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Permission not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete system permission or permission in use',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PermissionResponseDto> {
    return this.permissionsService.remove(id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('permissions', PermissionAction.UPDATE)
  @AuditLog({ action: 'RESTORE_PERMISSION' })
  @ApiOperation({
    summary: 'Restore deleted permission',
    description:
      'Restores a soft-deleted permission by setting isActive to true.',
  })
  @ApiParam({
    name: 'id',
    description: 'Permission UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission restored successfully',
    type: PermissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Permission not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Permission is already active',
  })
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PermissionResponseDto> {
    return this.permissionsService.restore(id);
  }

  // Permission Checking

  @Post('check')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Check user permission',
    description: 'Checks if a user has a specific permission with optional scope and resource context.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission check completed',
    type: CheckPermissionResponseDto,
  })
  async checkPermission(
    @Body() dto: CheckPermissionDto,
  ): Promise<CheckPermissionResponseDto> {
    return this.permissionCheckerService.checkPermission(dto);
  }

  @Post('check/bulk')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Check multiple user permissions',
    description: 'Checks multiple permissions for a user in a single request.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk permission check completed',
    type: BulkCheckPermissionsResponseDto,
  })
  async checkMultiplePermissions(
    @Body() dto: BulkCheckPermissionsDto,
  ): Promise<BulkCheckPermissionsResponseDto> {
    return this.permissionCheckerService.checkMultiplePermissions(dto);
  }

  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get user permissions',
    description: 'Retrieves all effective permissions for a user from all sources (direct, roles, positions).',
  })
  @ApiParam({
    name: 'userId',
    description: 'User Profile UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User permissions retrieved successfully',
  })
  async getUserPermissions(@Param('userId', ParseUUIDPipe) userProfileId: string) {
    const permissions = await this.permissionCheckerService.getUserPermissions(userProfileId);

    return {
      userProfileId,
      permissions: permissions.map((p) => ({
        resource: p.resource,
        action: p.action,
        scope: p.scope,
        source: p.source,
        priority: p.priority,
      })),
      totalPermissions: permissions.length,
    };
  }
}
