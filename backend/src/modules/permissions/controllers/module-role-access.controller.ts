import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
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

@ApiTags('Modules - Role Access')
@ApiBearerAuth()
@Controller('modules/role-access')
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class ModuleRoleAccessController {
  constructor(private readonly moduleService: ModuleService) {}

  @Post('grant')
  @RequiredPermission('modules', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Grant module access to role' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module access granted to role successfully',
  })
  async grantRoleModuleAccess(@Body() dto: any, @CurrentUser() user: any) {
    return this.moduleService.grantRoleModuleAccess(
      dto.roleId,
      dto.moduleId,
      dto.canRead,
      dto.canWrite,
      dto.canDelete,
      dto.canShare,
      user.id,
      dto.effectiveUntil,
    );
  }

  @Get('role/:roleId')
  @RequiredPermission('modules', PermissionAction.READ)
  @ApiOperation({ summary: 'Get role module access' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role module access retrieved successfully',
  })
  async getRoleModuleAccess(@Param('roleId', ParseUUIDPipe) roleId: string) {
    return this.moduleService.getRoleModuleAccess(roleId);
  }

  @Delete(':roleId/:moduleId')
  @RequiredPermission('modules', PermissionAction.DELETE)
  @ApiOperation({ summary: 'Revoke role module access' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role module access revoked successfully',
  })
  async revokeRoleModuleAccess(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ) {
    return this.moduleService.revokeRoleModuleAccess(roleId, moduleId);
  }

  @Get('check/:roleId/:moduleId/:accessType')
  @RequiredPermission('modules', PermissionAction.READ)
  @ApiOperation({ summary: 'Check role module access' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  @ApiParam({
    name: 'accessType',
    description: 'Access type (read/write/delete/share)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Access check result' })
  async checkRoleModuleAccess(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Param('accessType') accessType: 'read' | 'write' | 'delete' | 'share',
  ) {
    const hasAccess = await this.moduleService.checkRoleModuleAccess(
      roleId,
      moduleId,
      accessType,
    );
    return { hasAccess };
  }
}
