import {
  Controller,
  Get,
  Post,
  Param,
  Body,
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
import { ModuleService } from '../services/module.service';
import { PermissionAction } from '@prisma/client';

@ApiTags('Modules')
@ApiBearerAuth()
@Controller('modules')
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  @Post('grant')
  @RequiredPermission('modules', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Grant module access to user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module access granted successfully',
  })
  async grantModuleAccess(@Body() dto: any, @CurrentUser() user: any) {
    return this.moduleService.grantUserModuleAccess(
      dto.userProfileId,
      dto.moduleId,
      dto.canRead,
      dto.canWrite,
      dto.canDelete,
      dto.canShare,
      user.id,
      dto.validUntil,
    );
  }

  @Get('user/:userProfileId')
  @RequiredPermission('modules', PermissionAction.READ)
  @ApiOperation({ summary: 'Get user module access' })
  @ApiParam({ name: 'userProfileId', description: 'User Profile ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module access retrieved successfully',
  })
  async getUserModuleAccess(@Param('userProfileId') userProfileId: string) {
    return this.moduleService.getUserModuleAccess(userProfileId);
  }

  @Get('check/:userProfileId/:moduleId/:accessType')
  @RequiredPermission('modules', PermissionAction.READ)
  @ApiOperation({ summary: 'Check module access' })
  @ApiParam({ name: 'userProfileId', description: 'User Profile ID' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  @ApiParam({
    name: 'accessType',
    description: 'Access type (read/write/delete/share)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Access check result' })
  async checkModuleAccess(
    @Param('userProfileId') userProfileId: string,
    @Param('moduleId') moduleId: string,
    @Param('accessType') accessType: 'read' | 'write' | 'delete' | 'share',
  ) {
    const hasAccess = await this.moduleService.checkModuleAccess(
      userProfileId,
      moduleId,
      accessType,
    );
    return { hasAccess };
  }
}
