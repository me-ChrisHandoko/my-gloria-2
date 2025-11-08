import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
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
import { UserRolesService } from '../services/user-roles.service';
import {
  AssignUserRoleDto,
  BulkAssignUserRolesDto,
  UserRoleResponseDto,
} from '../dto/user-role.dto';
import {
  RequiredPermission,
  PermissionAction,
} from '../../../core/auth/decorators/permissions.decorator';
import { AuditLog } from '../../../core/auth/decorators/audit-log.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';

@ApiTags('Permissions - User Roles')
@ApiBearerAuth()
@Controller({
  path: 'permissions/users',
  version: '1',
})
@UseInterceptors(ClassSerializerInterceptor)
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  @Post(':userId/roles')
  @HttpCode(HttpStatus.CREATED)
  @RequiredPermission('user-roles', PermissionAction.CREATE)
  @AuditLog({ action: 'ASSIGN_USER_ROLE' })
  @ApiOperation({
    summary: 'Assign role to user',
    description: 'Assigns a role to a user with optional effective dates.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User Profile UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Role assigned successfully',
    type: UserRoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or role not found',
  })
  async assignRole(
    @Param('userId', ParseUUIDPipe) userProfileId: string,
    @Body() dto: Omit<AssignUserRoleDto, 'userProfileId'>,
    @CurrentUser() currentUser: any,
  ): Promise<UserRoleResponseDto> {
    return this.userRolesService.assign(
      {
        ...dto,
        userProfileId,
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      currentUser.userProfileId || currentUser.id,
    );
  }

  @Post(':userId/roles/bulk')
  @HttpCode(HttpStatus.CREATED)
  @RequiredPermission('user-roles', PermissionAction.CREATE)
  @AuditLog({ action: 'BULK_ASSIGN_USER_ROLES' })
  @ApiOperation({
    summary: 'Bulk assign roles to user',
    description: 'Assigns multiple roles to a user at once.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User Profile UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Roles assigned successfully',
    type: [UserRoleResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or some roles not found',
  })
  async bulkAssignRoles(
    @Param('userId', ParseUUIDPipe) userProfileId: string,
    @Body() dto: Omit<BulkAssignUserRolesDto, 'userProfileId'>,
    @CurrentUser() currentUser: any,
  ): Promise<UserRoleResponseDto[]> {
    return this.userRolesService.bulkAssign(
      {
        ...dto,
        userProfileId,
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      currentUser.userProfileId || currentUser.id,
    );
  }

  @Get(':userId/roles')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('user-roles', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get user roles',
    description: 'Retrieves all roles assigned to a user.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User Profile UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User roles retrieved successfully',
    type: [UserRoleResponseDto],
  })
  async getUserRoles(
    @Param('userId', ParseUUIDPipe) userProfileId: string,
  ): Promise<UserRoleResponseDto[]> {
    return this.userRolesService.getUserRoles(userProfileId);
  }

  @Delete(':userId/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiredPermission('user-roles', PermissionAction.DELETE)
  @AuditLog({ action: 'REVOKE_USER_ROLE' })
  @ApiOperation({
    summary: 'Revoke role from user',
    description: 'Removes a role from a user.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User Profile UUID',
    type: String,
  })
  @ApiParam({
    name: 'roleId',
    description: 'Role UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Role revoked successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User role assignment not found',
  })
  async revokeRole(
    @Param('userId', ParseUUIDPipe) userProfileId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ): Promise<void> {
    return this.userRolesService.revoke(userProfileId, roleId);
  }
}
