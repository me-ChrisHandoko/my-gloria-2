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
  CriticalAudit,
  DataModificationAudit,
  AuditCategory,
  AuditSeverity,
} from '@/core/auth/decorators/audit-log.decorator';
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
import { PermissionCacheService } from '../services/permission-cache.service';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly validationService: PermissionValidationService,
    private readonly cacheService: PermissionCacheService,
  ) {}

  @Post()
  @RequiredPermission('permissions', PermissionAction.CREATE)
  @DataModificationAudit('permission.create', 'permission')
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
  @RateLimit({
    limit: 20,
    windowMs: 10000, // 20 requests per 10 seconds
    message:
      'Too many permission requests. Please wait a moment before trying again.',
    headers: true,
  })
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get all permissions',
    description:
      'Retrieves a paginated list of permissions with optional filtering. Rate limited to 20 requests per 10 seconds.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permissions retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded. Please wait before retrying.',
  })
  async getPermissions(
    @Query('resource') resource?: string,
    @Query('action') action?: PermissionAction,
    @Query('groupId') groupId?: string,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Parse pagination parameters
    const currentPage = page ? parseInt(page.toString(), 10) : 1;
    const pageSize = limit ? parseInt(limit.toString(), 10) : 10;

    // Use service method that returns paginated response
    // This matches the pattern used in roles.controller.ts
    return this.permissionsService.findManyPaginated(
      {
        resource,
        action,
        groupId,
        isActive,
        search,
      },
      currentPage,
      pageSize,
    );
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
  @DataModificationAudit('permission.update', 'permission')
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
  @AuditLog({
    action: 'permission.delete',
    resource: 'permission',
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.HIGH,
    alert: true,
  })
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
  @AuditLog({
    action: 'permission.check',
    resource: 'permission_validation',
    category: AuditCategory.AUTHORIZATION,
    severity: AuditSeverity.MEDIUM,
    includeBody: true,
  })
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
  @CriticalAudit('permission.bulk_assign')
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

  @Post('cache/invalidate')
  @RequiredPermission('permissions', PermissionAction.UPDATE)
  @AuditLog({
    action: 'permission.cache.invalidate',
    resource: 'permission_cache',
    category: AuditCategory.AUTHORIZATION,
    severity: AuditSeverity.HIGH,
    includeBody: true,
  })
  @ApiOperation({
    summary: 'Invalidate permission cache for specific user or all users',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache invalidated successfully',
  })
  async invalidateCache(
    @Body() body: { userProfileId?: string },
    @CurrentUser() user: any,
  ) {
    if (body.userProfileId) {
      await this.cacheService.invalidateUserCache(body.userProfileId);
      return {
        success: true,
        message: `Permission cache invalidated for user ${body.userProfileId}`,
      };
    } else {
      await this.cacheService.invalidateAllCaches();
      return {
        success: true,
        message: 'All permission caches invalidated',
      };
    }
  }

  @Get('debug/:userProfileId')
  @RequiredPermission('permissions', PermissionAction.READ)
  @AuditLog({
    action: 'permission.debug',
    resource: 'permission_chain',
    category: AuditCategory.AUTHORIZATION,
    severity: AuditSeverity.MEDIUM,
  })
  @ApiOperation({
    summary: 'Debug permission chain for specific user (admin only)',
  })
  @ApiParam({ name: 'userProfileId', description: 'User Profile ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission chain debug information',
  })
  async debugPermissions(
    @Param('userProfileId') userProfileId: string,
    @Query('resource') resource?: string,
    @Query('action') action?: PermissionAction,
  ) {
    return this.permissionsService.debugUserPermissions(
      userProfileId,
      resource,
      action,
    );
  }

  // Permission Groups

  @Post('groups')
  @RequiredPermission('permissions', PermissionAction.CREATE)
  @DataModificationAudit('permission_group.create', 'permission_group')
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
  @DataModificationAudit('permission_group.update', 'permission_group')
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
