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
import { UserPermissionsService } from '../services/permission-users.service';
import {
  AssignUserPermissionDto,
  UpdateUserPermissionDto,
  BulkAssignUserPermissionsDto,
  BulkRemoveUserPermissionsDto,
  UpdateUserPermissionPriorityDto,
} from '../dto/user-permission.dto';
import { PermissionAction } from '@prisma/client';

@ApiTags('User Permissions')
@ApiBearerAuth()
@Controller('users/:userId/permissions')
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class UserPermissionsController {
  constructor(
    private readonly userPermissionsService: UserPermissionsService,
  ) {}

  @Post()
  @RequiredPermission('permissions', PermissionAction.CREATE)
  @DataModificationAudit('user_permission.assign', 'user_permission')
  @ApiOperation({ summary: 'Assign permission to user' })
  @ApiParam({ name: 'userId', description: 'User Profile ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Permission assigned to user successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Permission already assigned to user',
  })
  async assignPermissionToUser(
    @Param('userId') userId: string,
    @Body() dto: AssignUserPermissionDto,
    @CurrentUser() user: any,
  ) {
    return this.userPermissionsService.assignPermissionToUser(
      userId,
      dto,
      user.id,
    );
  }

  @Delete(':permissionId')
  @RequiredPermission('permissions', PermissionAction.DELETE)
  @AuditLog({
    action: 'user_permission.revoke',
    resource: 'user_permission',
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.HIGH,
  })
  @ApiOperation({ summary: 'Revoke permission from user' })
  @ApiParam({ name: 'userId', description: 'User Profile ID' })
  @ApiParam({ name: 'permissionId', description: 'Permission ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission revoked from user successfully',
  })
  async revokeUserPermission(
    @Param('userId') userId: string,
    @Param('permissionId') permissionId: string,
    @CurrentUser() user: any,
  ) {
    return this.userPermissionsService.revokeUserPermission(
      userId,
      permissionId,
      user.id,
    );
  }

  @Get()
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get user permissions',
    description:
      'Retrieves permissions directly assigned to a user with pagination',
  })
  @ApiParam({ name: 'userId', description: 'User Profile ID' })
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
    name: 'isTemporary',
    required: false,
    type: Boolean,
    description: 'Filter temporary permissions',
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
    description: 'User permissions retrieved successfully',
  })
  async getUserPermissions(
    @Param('userId') userId: string,
    @Query('isGranted') isGranted?: boolean,
    @Query('isActive') isActive?: boolean,
    @Query('isTemporary') isTemporary?: boolean,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const filters = {
      ...(isGranted !== undefined && { isGranted }),
      ...(isActive !== undefined && { isActive }),
      ...(isTemporary !== undefined && { isTemporary }),
    };

    return this.userPermissionsService.getUserPermissions(
      userId,
      filters,
      page || 1,
      limit || 10,
    );
  }

  @Put(':permissionId')
  @RequiredPermission('permissions', PermissionAction.UPDATE)
  @DataModificationAudit('user_permission.update', 'user_permission')
  @ApiOperation({ summary: 'Update user permission' })
  @ApiParam({ name: 'userId', description: 'User Profile ID' })
  @ApiParam({ name: 'permissionId', description: 'Permission ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User permission updated successfully',
  })
  async updateUserPermission(
    @Param('userId') userId: string,
    @Param('permissionId') permissionId: string,
    @Body() dto: UpdateUserPermissionDto,
    @CurrentUser() user: any,
  ) {
    return this.userPermissionsService.updateUserPermission(
      userId,
      permissionId,
      dto,
      user.id,
    );
  }

  @Get('effective')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get effective user permissions',
    description:
      'Retrieves all effective permissions for a user including permissions from roles with priority resolution',
  })
  @ApiParam({ name: 'userId', description: 'User Profile ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Effective user permissions retrieved successfully',
  })
  async getEffectiveUserPermissions(@Param('userId') userId: string) {
    return this.userPermissionsService.getEffectiveUserPermissions(userId);
  }

  @Get('temporary')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get temporary permissions',
    description: 'Retrieves only temporary (time-limited) permissions for a user',
  })
  @ApiParam({ name: 'userId', description: 'User Profile ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Temporary permissions retrieved successfully',
  })
  async getTemporaryPermissions(@Param('userId') userId: string) {
    return this.userPermissionsService.getTemporaryPermissions(userId);
  }

  @Post('bulk-assign')
  @RequiredPermission('permissions', PermissionAction.CREATE)
  @AuditLog({
    action: 'user_permission.bulk_assign',
    resource: 'user_permission',
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.HIGH,
    includeBody: true,
  })
  @ApiOperation({ summary: 'Bulk assign permissions to user' })
  @ApiParam({ name: 'userId', description: 'User Profile ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permissions assigned to user successfully',
  })
  async bulkAssignPermissions(
    @Param('userId') userId: string,
    @Body() dto: BulkAssignUserPermissionsDto,
    @CurrentUser() user: any,
  ) {
    return this.userPermissionsService.bulkAssignUserPermissions(
      userId,
      dto,
      user.id,
    );
  }

  @Post('bulk-remove')
  @RequiredPermission('permissions', PermissionAction.DELETE)
  @AuditLog({
    action: 'user_permission.bulk_remove',
    resource: 'user_permission',
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.HIGH,
    includeBody: true,
  })
  @ApiOperation({ summary: 'Bulk remove permissions from user' })
  @ApiParam({ name: 'userId', description: 'User Profile ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permissions removed from user successfully',
  })
  async bulkRemovePermissions(
    @Param('userId') userId: string,
    @Body() dto: BulkRemoveUserPermissionsDto,
    @CurrentUser() user: any,
  ) {
    return this.userPermissionsService.bulkRemoveUserPermissions(
      userId,
      dto,
      user.id,
    );
  }

  @Put(':permissionId/priority')
  @RequiredPermission('permissions', PermissionAction.UPDATE)
  @DataModificationAudit('user_permission.update_priority', 'user_permission')
  @ApiOperation({
    summary: 'Update user permission priority',
    description:
      'Updates priority for conflict resolution. Higher priority wins when multiple permissions conflict.',
  })
  @ApiParam({ name: 'userId', description: 'User Profile ID' })
  @ApiParam({ name: 'permissionId', description: 'Permission ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission priority updated successfully',
  })
  async updatePermissionPriority(
    @Param('userId') userId: string,
    @Param('permissionId') permissionId: string,
    @Body() dto: UpdateUserPermissionPriorityDto,
    @CurrentUser() user: any,
  ) {
    return this.userPermissionsService.updateUserPermissionPriority(
      userId,
      permissionId,
      dto,
      user.id,
    );
  }
}
