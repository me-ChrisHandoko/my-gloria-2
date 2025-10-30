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
  BadRequestException,
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
import { PermissionsService } from '../services/permission.service';
import { PermissionValidationService } from '../services/permission-validation.service';
import { RolePermissionsService } from '../services/permission-roles.service';
import { UserPermissionsService } from '../services/permission-users.service';
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
@Controller('permissions')
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly validationService: PermissionValidationService,
    private readonly rolePermissionsService: RolePermissionsService,
    private readonly userPermissionsService: UserPermissionsService,
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
    return this.permissionsService.findAll({ includeInactive });
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
    // Route to appropriate service based on targetType
    switch (dto.targetType) {
      case 'user':
        return this.userPermissionsService.bulkAssignUserPermissions(
          dto.targetId,
          {
            permissionIds: dto.permissionIds,
            grantReason: dto.grantReason || 'Bulk assignment',
            effectiveUntil: dto.effectiveUntil,
            isGranted: true,
          },
          user.id,
        );

      case 'role':
        return this.rolePermissionsService.bulkAssignRolePermissions(
          dto.targetId,
          {
            permissionIds: dto.permissionIds,
            grantReason: dto.grantReason,
            effectiveUntil: dto.effectiveUntil,
            isGranted: true,
          },
          user.id,
        );

      case 'position':
        // Position-based permissions not supported in schema
        throw new BadRequestException(
          'Position-based permissions not supported. Use role-based or user-based assignments.',
        );

      default:
        throw new BadRequestException(
          `Invalid targetType: ${dto.targetType}`,
        );
    }
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

}
