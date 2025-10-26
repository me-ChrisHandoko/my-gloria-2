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
import { RateLimit } from '@/core/auth/decorators/rate-limit.decorator';
import { ModuleService } from '../services/module.service';
import { PermissionAction, PermissionScope } from '@prisma/client';

@ApiTags('Modules - Permissions')
@ApiBearerAuth()
@Controller('modules')
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class ModulePermissionController {
  constructor(private readonly moduleService: ModuleService) {}

  @Post(':moduleId/permissions')
  @RequiredPermission('module', PermissionAction.CREATE)
  @ApiOperation({ summary: 'Define permission for module' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Module permission created successfully',
  })
  async createModulePermission(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    return this.moduleService.createModulePermission(
      moduleId,
      dto.action,
      dto.scope,
      dto.description,
      user.id,
    );
  }

  @Get(':moduleId/permissions')
  @RateLimit({
    limit: 20,
    windowMs: 10000,
    message: 'Too many requests.',
    headers: true,
  })
  @RequiredPermission('module', PermissionAction.READ)
  @ApiOperation({ summary: 'Get module permissions' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module permissions retrieved successfully',
  })
  async getModulePermissions(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ) {
    return this.moduleService.getModulePermissions(moduleId);
  }

  @Delete(':moduleId/permissions/:permissionId')
  @RequiredPermission('module', PermissionAction.DELETE)
  @ApiOperation({ summary: 'Remove module permission' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  @ApiParam({ name: 'permissionId', description: 'Permission ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module permission removed successfully',
  })
  async removeModulePermission(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
  ) {
    return this.moduleService.removeModulePermission(moduleId, permissionId);
  }

  @Get(':moduleId/hierarchy')
  @RateLimit({
    limit: 20,
    windowMs: 10000,
    message: 'Too many requests.',
    headers: true,
  })
  @RequiredPermission('module', PermissionAction.READ)
  @ApiOperation({ summary: 'Get module hierarchy' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module hierarchy retrieved successfully',
  })
  async getModuleHierarchy(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ) {
    return this.moduleService.getModuleHierarchy(moduleId);
  }
}
