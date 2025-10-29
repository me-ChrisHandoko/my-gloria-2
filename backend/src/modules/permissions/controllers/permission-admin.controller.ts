import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '@/core/auth/guards/clerk-auth.guard';
import { PermissionsGuard } from '@/core/auth/guards/permissions.guard';
import { RequiredPermission, PermissionAction } from '@/core/auth/decorators/permissions.decorator';
import { PermissionAdminService } from '../services/permission-admin.service';
import {
  SystemOverviewDto,
  PermissionConflictDto,
  OrphanedPermissionDto,
  UnusedPermissionDto,
  HealthCheckResultDto,
  OptimizeCacheDto,
  CacheOptimizationResultDto,
  DetailedStatisticsDto,
} from '../dto/permission-admin.dto';

@ApiTags('Permission Admin')
@ApiBearerAuth()
@Controller('admin/permissions')
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class PermissionAdminController {
  constructor(private readonly adminService: PermissionAdminService) {}

  @Get('overview')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'System-wide permission overview',
    description:
      'Get comprehensive overview of permission system including counts, health status, and key metrics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Overview retrieved successfully',
    type: SystemOverviewDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  async getSystemOverview() {
    return this.adminService.getSystemOverview();
  }

  @Get('conflicts')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Detect permission conflicts',
    description:
      'Find users with conflicting permission assignments (both grant and deny for same permission)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conflicts detected successfully',
    type: [PermissionConflictDto],
  })
  async detectConflicts() {
    return this.adminService.detectConflicts();
  }

  @Get('orphaned')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Find orphaned permissions',
    description:
      'Identify permissions that are not assigned to any group or not referenced by any role/user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Orphaned permissions found',
    type: [OrphanedPermissionDto],
  })
  async findOrphanedPermissions() {
    return this.adminService.findOrphanedPermissions();
  }

  @Get('unused')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Find unused permissions',
    description:
      'Identify permissions that have not been used recently or have very low usage',
  })
  @ApiQuery({
    name: 'daysThreshold',
    required: false,
    description: 'Number of days to consider for unused permissions',
    example: 30,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Unused permissions found',
    type: [UnusedPermissionDto],
  })
  async findUnusedPermissions(@Query('daysThreshold') daysThreshold?: number) {
    return this.adminService.findUnusedPermissions(
      daysThreshold ? parseInt(String(daysThreshold)) : 30,
    );
  }

  @Post('health-check')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'System health check',
    description:
      'Perform comprehensive health check of permission system including database connectivity, data integrity, and potential issues',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Health check completed',
    type: HealthCheckResultDto,
  })
  async performHealthCheck() {
    return this.adminService.performHealthCheck();
  }

  @Post('optimize')
  @HttpCode(HttpStatus.OK)
  @RequiredPermission('permissions', PermissionAction.UPDATE)
  @ApiOperation({
    summary: 'Optimize permission cache',
    description:
      'Clear and rebuild permission cache to improve performance and resolve cache-related issues',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache optimized successfully',
    type: CacheOptimizationResultDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Requires PERMISSION_ADMIN_MANAGE permission',
  })
  async optimizeCache(@Body() dto: OptimizeCacheDto) {
    return this.adminService.optimizeCache(dto);
  }

  @Get('statistics/detailed')
  @RequiredPermission('permissions', PermissionAction.READ)
  @ApiOperation({
    summary: 'Detailed statistics dashboard',
    description:
      'Get comprehensive statistics for admin dashboard including permissions, roles, users, resources, delegations, templates, and audit data',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    type: DetailedStatisticsDto,
  })
  async getDetailedStatistics() {
    return this.adminService.getDetailedStatistics();
  }
}
