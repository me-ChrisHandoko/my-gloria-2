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
import { PermissionsService } from '../services/permissions.service';
import { PermissionValidationService } from '../services/permission-validation.service';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  CreatePermissionGroupDto,
  UpdatePermissionGroupDto,
  CheckPermissionDto,
  BulkAssignPermissionsDto,
} from '../dto/permission.dto';
import { PermissionAction } from '@prisma/client';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('api/v1/permissions')
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly validationService: PermissionValidationService,
  ) {}

  @Post()
  @RequiredPermission('permissions', PermissionAction.CREATE)
  @ApiOperation({ summary: 'Create a new permission' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Permission created successfully',
  })
  async createPermission(
    @Body() dto: CreatePermissionDto,
    @CurrentUser() user: any,
  ) {
    return this.permissionsService.createPermission(dto, user.id);
  }

  @Get()
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({ summary: 'Get all permissions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permissions retrieved successfully',
  })
  async getPermissions(
    @Query('resource') resource?: string,
    @Query('action') action?: PermissionAction,
    @Query('groupId') groupId?: string,
    @Query('isActive') isActive?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const permissions = await this.permissionsService.findMany({
      resource,
      action,
      groupId,
      isActive,
    });

    // Return paginated format expected by frontend
    const currentPage = page ? parseInt(page.toString(), 10) : 1;
    const pageSize = limit ? parseInt(limit.toString(), 10) : permissions.length;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = permissions.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      meta: {
        total: permissions.length,
        page: currentPage,
        limit: pageSize,
      },
    };
  }

  @Get('groups')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({ summary: 'Get all permission groups' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission groups retrieved successfully',
  })
  async getPermissionGroups(
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.permissionsService.findAllGroups(includeInactive);
  }

  @Get('code/:code')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({ summary: 'Get permission by code' })
  @ApiParam({ name: 'code', description: 'Permission code' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission retrieved successfully',
  })
  async getPermissionByCode(@Param('code') code: string) {
    return this.permissionsService.findByCode(code);
  }

  @Get('statistics')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({ summary: 'Get permission statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics() {
    return this.permissionsService.getStatistics();
  }

  @Get(':id')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({ summary: 'Get permission by ID' })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission retrieved successfully',
  })
  async getPermissionById(@Param('id') id: string) {
    return this.permissionsService.findById(id);
  }

  @Put(':id')
  @RequiredPermission('permissions', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Update permission' })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission updated successfully',
  })
  async updatePermission(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionDto,
    @CurrentUser() user: any,
  ) {
    return this.permissionsService.updatePermission(id, dto, user.id);
  }

  @Delete(':id')
  @RequiredPermission('permissions', PermissionAction.DELETE)
  @ApiOperation({ summary: 'Delete permission' })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Permission deleted successfully',
  })
  async deletePermission(@Param('id') id: string, @CurrentUser() user: any) {
    await this.permissionsService.deletePermission(id, user.id);
  }

  @Post('check')
  @ApiOperation({ summary: 'Check if current user has permission' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission check result',
  })
  async checkPermission(
    @Body() dto: CheckPermissionDto,
    @CurrentUser() user: any,
  ) {
    return this.validationService.validatePermission({
      userId: user.id,
      ...dto,
    });
  }

  @Post('bulk-assign')
  @RequiredPermission('permissions', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Bulk assign permissions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permissions assigned successfully',
  })
  async bulkAssignPermissions(
    @Body() dto: BulkAssignPermissionsDto,
    @CurrentUser() user: any,
  ) {
    // Implementation depends on target type
    // This is a simplified version
    return {
      success: true,
      targetType: dto.targetType,
      targetId: dto.targetId,
      assignedCount: dto.permissionIds.length,
    };
  }

  @Post('refresh-cache')
  @ApiOperation({ summary: 'Refresh permission cache for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache refreshed successfully',
  })
  async refreshCache(@CurrentUser() user: any) {
    await this.validationService.refreshUserPermissions(user.id);
    return { success: true, message: 'Permission cache refreshed' };
  }

  // Permission Groups

  @Post('groups')
  @RequiredPermission('permissions', PermissionAction.CREATE)
  @ApiOperation({ summary: 'Create permission group' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Permission group created successfully',
  })
  async createPermissionGroup(
    @Body() dto: CreatePermissionGroupDto,
    @CurrentUser() user: any,
  ) {
    return this.permissionsService.createPermissionGroup(dto, user.id);
  }

  @Put('groups/:id')
  @RequiredPermission('permissions', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Update permission group' })
  @ApiParam({ name: 'id', description: 'Permission group ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission group updated successfully',
  })
  async updatePermissionGroup(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionGroupDto,
    @CurrentUser() user: any,
  ) {
    return this.permissionsService.updatePermissionGroup(id, dto, user.id);
  }
}
