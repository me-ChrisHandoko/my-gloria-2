import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseIntPipe,
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
import { ResourcePermissionsService } from '../services/permission-resources.service';
import {
  GrantResourcePermissionDto,
  UpdateResourcePermissionDto,
  CheckResourcePermissionDto,
  BulkGrantResourcePermissionDto,
  BulkRevokeResourcePermissionDto,
  GetUserResourcePermissionsDto,
  GetResourceAccessListDto,
  TransferResourcePermissionsDto,
} from '../dto/resource-permission.dto';
import { PermissionAction } from '@prisma/client';

@ApiTags('Resource Permissions')
@ApiBearerAuth()
@Controller('resource-permissions')
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class ResourcePermissionsController {
  constructor(
    private readonly resourcePermissionsService: ResourcePermissionsService,
  ) {}

  @Post()
  @RequiredPermission('permissions', PermissionAction.CREATE)
  @DataModificationAudit('resource_permission.grant', 'resource_permission')
  @ApiOperation({
    summary: 'Grant resource-specific permission to user',
    description:
      'Grants fine-grained permission for a specific resource instance (e.g., document, project, invoice)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Resource permission granted successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Resource permission already exists',
  })
  async grantResourcePermission(
    @Body() dto: GrantResourcePermissionDto,
    @CurrentUser() user: any,
  ) {
    return this.resourcePermissionsService.grantResourcePermission(
      dto,
      user.id,
    );
  }

  @Delete(':id')
  @RequiredPermission('permissions', PermissionAction.DELETE)
  @AuditLog({
    action: 'resource_permission.revoke',
    resource: 'resource_permission',
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.HIGH,
  })
  @ApiOperation({ summary: 'Revoke resource permission' })
  @ApiParam({ name: 'id', description: 'Resource permission ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resource permission revoked successfully',
  })
  async revokeResourcePermission(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.resourcePermissionsService.revokeResourcePermission(
      id,
      reason || 'Resource permission revoked',
      user.id,
    );
  }

  @Get('user/:userId')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get resource permissions for a user',
    description:
      'Retrieves all resource-specific permissions for a user with filtering and pagination',
  })
  @ApiParam({ name: 'userId', description: 'User Profile ID' })
  @ApiQuery({
    name: 'resourceType',
    required: false,
    description: 'Filter by resource type',
  })
  @ApiQuery({
    name: 'resourceId',
    required: false,
    description: 'Filter by resource ID',
  })
  @ApiQuery({
    name: 'permissionId',
    required: false,
    description: 'Filter by permission ID',
  })
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
    description: 'Resource permissions retrieved successfully',
  })
  async getUserResourcePermissions(
    @Param('userId') userId: string,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('permissionId') permissionId?: string,
    @Query('isGranted') isGranted?: boolean,
    @Query('isActive') isActive?: boolean,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const filters: GetUserResourcePermissionsDto = {
      resourceType,
      resourceId,
      permissionId,
      isGranted,
      isActive,
    };

    return this.resourcePermissionsService.getUserResourcePermissions(
      userId,
      filters,
      page || 1,
      limit || 10,
    );
  }

  @Put(':id')
  @RequiredPermission('permissions', PermissionAction.UPDATE)
  @DataModificationAudit(
    'resource_permission.update',
    'resource_permission',
  )
  @ApiOperation({ summary: 'Update resource permission' })
  @ApiParam({ name: 'id', description: 'Resource permission ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resource permission updated successfully',
  })
  async updateResourcePermission(
    @Param('id') id: string,
    @Body() dto: UpdateResourcePermissionDto,
    @CurrentUser() user: any,
  ) {
    return this.resourcePermissionsService.updateResourcePermission(
      id,
      dto,
      user.id,
    );
  }

  @Post('check')
  @AuditLog({
    action: 'resource_permission.check',
    resource: 'permission_validation',
    category: AuditCategory.AUTHORIZATION,
    severity: AuditSeverity.MEDIUM,
    includeBody: true,
  })
  @ApiOperation({
    summary: 'Check if user has resource permission',
    description:
      'Validates if a user has permission for a specific resource instance with optional context evaluation',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission check result',
  })
  async checkResourcePermission(@Body() dto: CheckResourcePermissionDto) {
    return this.resourcePermissionsService.checkResourcePermission(dto);
  }

  @Get('resource/:resourceType/:resourceId')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get access list for a resource',
    description:
      'Retrieves all users who have permissions for a specific resource',
  })
  @ApiParam({ name: 'resourceType', description: 'Resource type' })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  @ApiQuery({
    name: 'permissionId',
    required: false,
    description: 'Filter by permission ID',
  })
  @ApiQuery({
    name: 'isGranted',
    required: false,
    type: Boolean,
    description: 'Filter by grant status',
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
    description: 'Resource access list retrieved successfully',
  })
  async getResourceAccessList(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Query('permissionId') permissionId?: string,
    @Query('isGranted') isGranted?: boolean,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const filters: GetResourceAccessListDto = {
      resourceType,
      resourceId,
      permissionId,
      isGranted,
    };

    return this.resourcePermissionsService.getResourceAccessList(
      filters,
      page || 1,
      limit || 10,
    );
  }

  @Post('bulk-grant')
  @RequiredPermission('permissions', PermissionAction.CREATE)
  @AuditLog({
    action: 'resource_permission.bulk_grant',
    resource: 'resource_permission',
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.HIGH,
    includeBody: true,
  })
  @ApiOperation({
    summary: 'Bulk grant resource permissions',
    description:
      'Grants permissions to multiple users for multiple resource instances in a single operation',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resource permissions granted successfully',
  })
  async bulkGrantResourcePermissions(
    @Body() dto: BulkGrantResourcePermissionDto,
    @CurrentUser() user: any,
  ) {
    return this.resourcePermissionsService.bulkGrantResourcePermissions(
      dto,
      user.id,
    );
  }

  @Post('bulk-revoke')
  @RequiredPermission('permissions', PermissionAction.DELETE)
  @AuditLog({
    action: 'resource_permission.bulk_revoke',
    resource: 'resource_permission',
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.HIGH,
    includeBody: true,
  })
  @ApiOperation({
    summary: 'Bulk revoke resource permissions',
    description:
      'Revokes permissions from multiple users for multiple resource instances',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resource permissions revoked successfully',
  })
  async bulkRevokeResourcePermissions(
    @Body() dto: BulkRevokeResourcePermissionDto,
    @CurrentUser() user: any,
  ) {
    return this.resourcePermissionsService.bulkRevokeResourcePermissions(
      dto,
      user.id,
    );
  }

  @Post('transfer')
  @RequiredPermission('permissions', PermissionAction.UPDATE)
  @AuditLog({
    action: 'resource_permission.transfer',
    resource: 'resource_permission',
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.HIGH,
    includeBody: true,
  })
  @ApiOperation({
    summary: 'Transfer resource permissions between users',
    description:
      'Transfers resource permissions from one user to another (e.g., role change, employee departure)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resource permissions transferred successfully',
  })
  async transferResourcePermissions(
    @Body() dto: TransferResourcePermissionsDto,
    @CurrentUser() user: any,
  ) {
    return this.resourcePermissionsService.transferResourcePermissions(
      dto,
      user.id,
    );
  }
}
