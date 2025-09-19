import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConfigValidationService } from './config-validation.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Configuration Validation Controller
 * Provides endpoints for configuration health and validation
 */
@ApiTags('Configuration')
@Controller('config')
export class ConfigValidationController {
  constructor(
    private readonly configValidationService: ConfigValidationService,
  ) {}

  /**
   * Gets configuration health status
   */
  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Get configuration health status' })
  @ApiResponse({
    status: 200,
    description: 'Configuration health status',
    schema: {
      properties: {
        healthy: { type: 'boolean' },
        required: { type: 'number' },
        missing: { type: 'number' },
        warnings: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  getConfigHealth() {
    return this.configValidationService.getHealthStatus();
  }

  /**
   * Gets required configuration keys
   */
  @Get('required')
  @Public()
  @ApiOperation({ summary: 'Get required configuration keys' })
  @ApiResponse({
    status: 200,
    description: 'List of required configuration keys',
    type: [String],
  })
  getRequiredKeys() {
    return {
      keys: this.configValidationService.getRequiredKeys(),
      count: this.configValidationService.getRequiredKeys().length,
    };
  }

  /**
   * Gets missing configuration keys
   */
  @Get('missing')
  @Public()
  @ApiOperation({ summary: 'Get missing configuration keys' })
  @ApiResponse({
    status: 200,
    description: 'List of missing configuration keys',
    type: [String],
  })
  getMissingKeys() {
    const missing = this.configValidationService.getMissingKeys();
    return {
      missing,
      count: missing.length,
      complete: missing.length === 0,
    };
  }

  /**
   * Exports sanitized configuration (admin only)
   */
  @Get('export')
  @UseGuards(ClerkAuthGuard)
  @RequirePermission('system.config.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export sanitized configuration (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Sanitized configuration export',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  exportConfig() {
    return {
      config: this.configValidationService.exportConfig(),
      timestamp: new Date().toISOString(),
    };
  }
}
