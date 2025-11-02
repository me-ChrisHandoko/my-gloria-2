import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
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
  ApiQuery,
} from '@nestjs/swagger';
import { UserPermissionsService } from '../services/user-permissions.service';
import {
  GrantUserPermissionDto,
  BulkGrantUserPermissionsDto,
  UserPermissionResponseDto,
  QueryUserPermissionDto,
} from '../dto/user-permission.dto';
import {
  RequiredPermission,
  PermissionAction,
} from '../../../core/auth/decorators/permissions.decorator';
import { AuditLog } from '../../../core/auth/decorators/audit-log.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';

@ApiTags('Permissions - User Permissions')
@ApiBearerAuth()
@Controller({
  path: 'permissions/users',
  version: '1',
})
@UseInterceptors(ClassSerializerInterceptor)
export class UserPermissionsController {
  constructor(
    private readonly userPermissionsService: UserPermissionsService,
  ) {}

  @Post(':userId/permissions')
  @HttpCode(HttpStatus.CREATED)
  @RequiredPermission('user-permissions', PermissionAction.CREATE)
  @AuditLog({ action: 'GRANT_USER_PERMISSION' })
  @ApiOperation({
    summary: 'Grant direct permission to user',
    description:
      'Grants a specific permission directly to a user, with optional resource context, priority, and temporal restrictions.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User Profile UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Permission granted successfully',
    type: UserPermissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or permission not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid permission data provided',
  })
  async grantPermission(
    @Param('userId', ParseUUIDPipe) userProfileId: string,
    @Body() dto: Omit<GrantUserPermissionDto, 'userProfileId'>,
    @CurrentUser() currentUser: any,
  ): Promise<UserPermissionResponseDto> {
    return this.userPermissionsService.grant(
      {
        ...dto,
        userProfileId,
      },
      currentUser.userProfileId || currentUser.id,
    );
  }

  @Post(':userId/permissions/bulk')
  @HttpCode(HttpStatus.CREATED)
  @RequiredPermission('user-permissions', PermissionAction.CREATE)
  @AuditLog({ action: 'BULK_GRANT_USER_PERMISSIONS' })
  @ApiOperation({
    summary: 'Bulk grant permissions to user',
    description: 'Grants multiple permissions to a user at once.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User Profile UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Permissions granted successfully',
    type: [UserPermissionResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or some permissions not found',
  })
  async bulkGrantPermissions(
    @Param('userId', ParseUUIDPipe) userProfileId: string,
    @Body()
    dto: Omit<BulkGrantUserPermissionsDto, 'userProfileId'>,
    @CurrentUser() currentUser: any,
  ): Promise<UserPermissionResponseDto[]> {
    return this.userPermissionsService.bulkGrant(
      {
        ...dto,
        userProfileId,
      },
      currentUser.userProfileId || currentUser.id,
    );
  }

  @Get(':userId/permissions')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('user-permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get user direct permissions',
    description:
      'Retrieves all direct permissions granted to a user, with optional filtering.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User Profile UUID',
    type: String,
  })
  @ApiQuery({
    name: 'isGranted',
    required: false,
    type: Boolean,
    description: 'Filter by granted/denied status',
  })
  @ApiQuery({
    name: 'resourceType',
    required: false,
    type: String,
    description: 'Filter by resource type',
  })
  @ApiQuery({
    name: 'resourceId',
    required: false,
    type: String,
    description: 'Filter by resource ID',
  })
  @ApiQuery({
    name: 'includeExpired',
    required: false,
    type: Boolean,
    description: 'Include expired permissions',
  })
  @ApiQuery({
    name: 'includeDenied',
    required: false,
    type: Boolean,
    description: 'Include denied permissions',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User permissions retrieved successfully',
    type: [UserPermissionResponseDto],
  })
  async getUserPermissions(
    @Param('userId', ParseUUIDPipe) userProfileId: string,
    @Query() query: QueryUserPermissionDto,
  ): Promise<UserPermissionResponseDto[]> {
    return this.userPermissionsService.getUserPermissions(userProfileId, query);
  }

  @Get(':userId/permissions/:permissionId')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('user-permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get specific user permission',
    description: 'Retrieves details of a specific user permission assignment.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User Profile UUID',
    type: String,
  })
  @ApiParam({
    name: 'permissionId',
    description: 'User Permission UUID (assignment ID, not permission ID)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User permission retrieved successfully',
    type: UserPermissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User permission not found',
  })
  async getUserPermission(
    @Param('userId', ParseUUIDPipe) userProfileId: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
  ): Promise<UserPermissionResponseDto> {
    return this.userPermissionsService.findOne(permissionId);
  }

  @Delete(':userId/permissions/:permissionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiredPermission('user-permissions', PermissionAction.DELETE)
  @AuditLog({ action: 'REVOKE_USER_PERMISSION' })
  @ApiOperation({
    summary: 'Revoke permission from user',
    description: 'Removes a direct permission from a user.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User Profile UUID',
    type: String,
  })
  @ApiParam({
    name: 'permissionId',
    description: 'Permission UUID',
    type: String,
  })
  @ApiQuery({
    name: 'resourceType',
    required: false,
    type: String,
    description: 'Resource type for resource-specific permissions',
  })
  @ApiQuery({
    name: 'resourceId',
    required: false,
    type: String,
    description: 'Resource ID for resource-specific permissions',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Permission revoked successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User permission not found',
  })
  async revokePermission(
    @Param('userId', ParseUUIDPipe) userProfileId: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
  ): Promise<void> {
    return this.userPermissionsService.revoke(
      userProfileId,
      permissionId,
      resourceType,
      resourceId,
    );
  }
}
