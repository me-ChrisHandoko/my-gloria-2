import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
  ApiParam,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '@/modules/auth/guards/clerk-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequiredPermissions } from '../decorators/permissions.decorator';
import { PermissionCheckLogService } from '../services/permission-check-log.service';
import {
  GetCheckLogFilterDto,
  ExportCheckLogsDto,
  CheckLogResponseDto,
  AccessSummaryDto,
  SlowCheckDto,
  UserAccessHistoryDto,
  ResourceAccessHistoryDto,
} from '../dto/permission-check-log.dto';

@ApiTags('Permission Check Logs')
@ApiBearerAuth()
@Controller('permission-check-logs')
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class PermissionCheckLogController {
  constructor(private readonly checkLogService: PermissionCheckLogService) {}

  @Get()
  @RequiredPermissions('PERMISSION_CHECK_LOG_VIEW')
  @ApiOperation({
    summary: 'List permission checks (admin)',
    description: 'Get paginated list of all permission check attempts with optional filters',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Check logs retrieved successfully',
    type: [CheckLogResponseDto],
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  async getCheckLogs(@Query() filters: GetCheckLogFilterDto) {
    return this.checkLogService.getCheckLogs(filters);
  }

  @Get('denied')
  @RequiredPermissions('PERMISSION_CHECK_LOG_VIEW')
  @ApiOperation({
    summary: 'List denied access attempts',
    description: 'Get all permission checks that resulted in denied access',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Denied access attempts retrieved successfully',
    type: [CheckLogResponseDto],
  })
  async getDeniedAccessAttempts(@Query() filters: Partial<GetCheckLogFilterDto>) {
    return this.checkLogService.getDeniedAccessAttempts(filters);
  }

  @Get('users/:userId')
  @RequiredPermissions('PERMISSION_CHECK_LOG_VIEW')
  @ApiOperation({
    summary: "Get user's access history",
    description: 'Get all permission checks performed by a specific user',
  })
  @ApiParam({
    name: 'userId',
    description: 'User profile ID',
    example: 'cm123abc456def',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User access history retrieved successfully',
    type: [CheckLogResponseDto],
  })
  async getUserAccessHistory(
    @Param('userId') userId: string,
    @Query() filters: UserAccessHistoryDto,
  ) {
    return this.checkLogService.getUserAccessHistory(userId, filters);
  }

  @Get('resources/:resource')
  @RequiredPermissions('PERMISSION_CHECK_LOG_VIEW')
  @ApiOperation({
    summary: 'Get resource access history',
    description: 'Get all access attempts for a specific resource type',
  })
  @ApiParam({
    name: 'resource',
    description: 'Resource type',
    example: 'documents',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resource access history retrieved successfully',
    type: [CheckLogResponseDto],
  })
  async getResourceAccessHistory(
    @Param('resource') resource: string,
    @Query() filters: ResourceAccessHistoryDto,
  ) {
    return this.checkLogService.getResourceAccessHistory(resource, filters);
  }

  @Get('slow')
  @RequiredPermissions('PERMISSION_CHECK_LOG_VIEW')
  @ApiOperation({
    summary: 'Get slow permission checks',
    description:
      'Get permission checks that took longer than the specified threshold (default: 100ms)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Slow checks retrieved successfully',
    type: [CheckLogResponseDto],
  })
  async getSlowChecks(@Query() filters: SlowCheckDto) {
    return this.checkLogService.getSlowChecks(filters);
  }

  @Get('summary')
  @RequiredPermissions('PERMISSION_CHECK_LOG_VIEW')
  @ApiOperation({
    summary: 'Get access summary statistics',
    description:
      'Get aggregated statistics about permission checks including allow/deny rates, performance metrics, and top resources',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Access summary retrieved successfully',
    type: AccessSummaryDto,
  })
  async getAccessSummary(@Query() filters: Partial<GetCheckLogFilterDto>) {
    return this.checkLogService.getAccessSummary(filters);
  }

  @Get('users/:userId/denied')
  @RequiredPermissions('PERMISSION_CHECK_LOG_VIEW')
  @ApiOperation({
    summary: "Get user's denied attempts",
    description: 'Get all denied access attempts for a specific user',
  })
  @ApiParam({
    name: 'userId',
    description: 'User profile ID',
    example: 'cm123abc456def',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User denied attempts retrieved successfully',
    type: [CheckLogResponseDto],
  })
  async getUserDeniedAttempts(
    @Param('userId') userId: string,
    @Query() filters: Partial<UserAccessHistoryDto>,
  ) {
    return this.checkLogService.getUserDeniedAttempts(userId, filters);
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @RequiredPermissions('PERMISSION_CHECK_LOG_EXPORT')
  @ApiOperation({
    summary: 'Export check logs for compliance',
    description:
      'Export permission check logs in CSV or JSON format for compliance auditing and security analysis',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Check logs exported successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid export parameters',
  })
  async exportCheckLogs(@Body() dto: ExportCheckLogsDto) {
    return this.checkLogService.exportCheckLogs(dto);
  }
}
