import {
  Controller,
  Get,
  Post,
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
import { ResourcePermissionsService } from '../services/resource-permissions.service';
import { PermissionAction } from '@prisma/client';

@ApiTags('Resource Permissions')
@ApiBearerAuth()
@Controller('resource-permissions')
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class ResourcePermissionsController {
  constructor(
    private readonly resourcePermissionsService: ResourcePermissionsService,
  ) {}

  @Post('grant')
  @RequiredPermission('permissions', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Grant resource-specific permission' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission granted successfully',
  })
  async grantResourcePermission(@Body() dto: any, @CurrentUser() user: any) {
    return this.resourcePermissionsService.grantResourcePermission(
      dto.userProfileId,
      dto.permissionId,
      dto.resourceType,
      dto.resourceId,
      user.id,
      dto.grantReason,
      dto.validUntil,
    );
  }

  @Delete('revoke')
  @RequiredPermission('permissions', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Revoke resource-specific permission' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Permission revoked successfully',
  })
  async revokeResourcePermission(@Body() dto: any, @CurrentUser() user: any) {
    await this.resourcePermissionsService.revokeResourcePermission(
      dto.userProfileId,
      dto.permissionId,
      dto.resourceType,
      dto.resourceId,
      user.id,
    );
  }

  @Get('user/:userProfileId')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({ summary: 'Get user resource permissions' })
  @ApiParam({ name: 'userProfileId', description: 'User Profile ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permissions retrieved successfully',
  })
  async getUserResourcePermissions(
    @Param('userProfileId') userProfileId: string,
    @Query('resourceType') resourceType?: string,
  ) {
    return this.resourcePermissionsService.getUserResourcePermissions(
      userProfileId,
      resourceType,
    );
  }

  @Get('resource/:resourceType/:resourceId')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({ summary: 'Get users with permission on resource' })
  @ApiParam({ name: 'resourceType', description: 'Resource type' })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users retrieved successfully',
  })
  async getResourceUsers(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.resourcePermissionsService.getResourceUsers(
      resourceType,
      resourceId,
    );
  }
}
