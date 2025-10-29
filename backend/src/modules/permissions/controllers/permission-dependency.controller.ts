import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
import {
  DataModificationAudit,
  AuditLog,
  AuditCategory,
  AuditSeverity,
} from '@/core/auth/decorators/audit-log.decorator';
import { PermissionDependencyService } from '../services/permission-dependency.service';
import {
  CreatePermissionDependencyDto,
  UpdatePermissionDependencyDto,
  CheckPermissionDependenciesDto,
} from '../dto/permission-dependency.dto';
import { PermissionAction } from '@prisma/client';

@ApiTags('Permission Dependencies')
@ApiBearerAuth()
@Controller('permission-dependencies')
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class PermissionDependencyController {
  constructor(
    private readonly dependencyService: PermissionDependencyService,
  ) {}

  @Post()
  @RequiredPermission('permissions', PermissionAction.CREATE)
  @DataModificationAudit(
    'permission_dependency.create',
    'permission_dependency',
  )
  @ApiOperation({
    summary: 'Create permission dependency',
    description:
      'Defines a dependency rule where one permission requires another (e.g., APPROVE requires READ)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Permission dependency created successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Dependency already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Would create circular dependency',
  })
  async createDependency(
    @Body() dto: CreatePermissionDependencyDto,
    @CurrentUser() user: any,
  ) {
    return this.dependencyService.createDependency(dto, user.id);
  }

  @Get('permission/:permissionId')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get permission dependencies',
    description:
      'Retrieves all required permissions for a specific permission',
  })
  @ApiParam({ name: 'permissionId', description: 'Permission ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dependencies retrieved successfully',
  })
  async getPermissionDependencies(@Param('permissionId') permissionId: string) {
    return this.dependencyService.getPermissionDependencies(permissionId);
  }

  @Get('permission/:permissionId/dependents')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get dependent permissions',
    description:
      'Retrieves all permissions that depend on this permission',
  })
  @ApiParam({ name: 'permissionId', description: 'Permission ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dependents retrieved successfully',
  })
  async getDependentPermissions(@Param('permissionId') permissionId: string) {
    return this.dependencyService.getDependentPermissions(permissionId);
  }

  @Get('permission/:permissionId/chain')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Get complete dependency chain',
    description:
      'Retrieves the complete recursive dependency chain for a permission',
  })
  @ApiParam({ name: 'permissionId', description: 'Permission ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dependency chain retrieved successfully',
  })
  async getDependencyChain(@Param('permissionId') permissionId: string) {
    return this.dependencyService.getDependencyChain(permissionId);
  }

  @Post('check')
  @AuditLog({
    action: 'permission_dependency.check',
    resource: 'permission_validation',
    category: AuditCategory.AUTHORIZATION,
    severity: AuditSeverity.MEDIUM,
    includeBody: true,
  })
  @ApiOperation({
    summary: 'Check user has all dependencies',
    description:
      'Validates if a user has all required dependencies for a permission',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dependency check result',
  })
  async checkUserDependencies(@Body() dto: CheckPermissionDependenciesDto) {
    return this.dependencyService.checkUserDependencies(dto);
  }

  @Put(':id')
  @RequiredPermission('permissions', PermissionAction.UPDATE)
  @DataModificationAudit(
    'permission_dependency.update',
    'permission_dependency',
  )
  @ApiOperation({ summary: 'Update permission dependency' })
  @ApiParam({ name: 'id', description: 'Dependency ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dependency updated successfully',
  })
  async updateDependency(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionDependencyDto,
    @CurrentUser() user: any,
  ) {
    return this.dependencyService.updateDependency(id, dto, user.id);
  }

  @Delete(':id')
  @RequiredPermission('permissions', PermissionAction.DELETE)
  @AuditLog({
    action: 'permission_dependency.delete',
    resource: 'permission_dependency',
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.HIGH,
  })
  @ApiOperation({ summary: 'Delete permission dependency' })
  @ApiParam({ name: 'id', description: 'Dependency ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dependency deleted successfully',
  })
  async deleteDependency(@Param('id') id: string, @CurrentUser() user: any) {
    return this.dependencyService.deleteDependency(id, user.id);
  }
}
