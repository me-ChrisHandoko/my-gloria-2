import { Controller, Get, Query, UseGuards, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SecurityMonitorService } from './security-monitor.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/guards/clerk-auth.guard';

@ApiTags('monitoring')
@Controller('monitoring')
@ApiBearerAuth()
export class MonitoringController {
  constructor(private readonly securityMonitor: SecurityMonitorService) {}

  /**
   * Get security statistics and alerts
   */
  @Get('security/stats')
  @ApiOperation({
    summary: 'Get security statistics',
    description: 'Retrieves security monitoring statistics and recent alerts',
  })
  @ApiQuery({
    name: 'hours',
    required: false,
    type: Number,
    description: 'Number of hours to look back (default: 24)',
    example: 24,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Security statistics retrieved',
    schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            failedLogins: { type: 'number' },
            unauthorizedAccess: { type: 'number' },
            threatLevel: { type: 'string' },
            periodHours: { type: 'number' },
          },
        },
        recentAlerts: { type: 'array' },
        topOffenders: { type: 'array' },
      },
    },
  })
  async getSecurityStats(
    @Query('hours') hours?: number,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    // Only allow superadmins or users with security monitoring permission
    // In production, add proper permission checking here

    const hoursBack = hours || 24;
    return this.securityMonitor.getSecurityStats(hoursBack);
  }

  /**
   * Health check for monitoring service
   */
  @Get('health')
  @ApiOperation({
    summary: 'Monitoring service health check',
    description: 'Check if monitoring services are operational',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'monitoring' },
        timestamp: { type: 'string' },
      },
    },
  })
  health() {
    return {
      status: 'ok',
      service: 'monitoring',
      timestamp: new Date().toISOString(),
    };
  }
}
