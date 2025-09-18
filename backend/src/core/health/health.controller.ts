import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';
import { DatabaseMetricsService } from '../database/database.metrics';

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  database: {
    status: string;
    responseTime?: number;
    circuitBreaker?: string;
    message?: string;
  };
  metrics?: {
    queries: any;
    connections: any;
    health: any;
  };
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: DatabaseMetricsService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        uptime: { type: 'number', example: 3600 },
      },
    },
  })
  async check(): Promise<HealthCheckResponse> {
    const dbHealth = await this.prisma.healthCheck();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    // Determine overall health status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (dbHealth.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (dbHealth.status === 'degraded') {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date(),
      uptime,
      database: {
        status: dbHealth.status,
        responseTime: dbHealth.metrics?.responseTime,
        circuitBreaker: dbHealth.metrics?.circuitBreakerState,
        message: dbHealth.message,
      },
    };
  }

  @Get('detailed')
  @Public()
  @ApiOperation({ summary: 'Detailed health check with metrics' })
  @ApiResponse({
    status: 200,
    description: 'Detailed health information with metrics',
  })
  async detailedCheck(): Promise<HealthCheckResponse> {
    const dbHealth = await this.prisma.healthCheck();
    const metrics = this.metricsService.getAllMetrics();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    // Determine overall health status based on multiple factors
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (dbHealth.status === 'unhealthy' || metrics.queries.errorRate > 20) {
      overallStatus = 'unhealthy';
    } else if (
      dbHealth.status === 'degraded' ||
      metrics.queries.errorRate > 5 ||
      metrics.queries.slowQueries > 10
    ) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date(),
      uptime,
      database: {
        status: dbHealth.status,
        responseTime: dbHealth.metrics?.responseTime,
        circuitBreaker: dbHealth.metrics?.circuitBreakerState,
        message: dbHealth.message,
      },
      metrics: {
        queries: metrics.queries,
        connections: metrics.connections,
        health: metrics.health,
      },
    };
  }

  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Kubernetes liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  @ApiResponse({ status: 503, description: 'Service is not alive' })
  async liveness(): Promise<{ status: string }> {
    // Simple check to see if the application is running
    return { status: 'ok' };
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Kubernetes readiness probe' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async readiness(): Promise<{ status: string; ready: boolean }> {
    try {
      const dbHealth = await this.prisma.healthCheck();
      const isReady = dbHealth.status !== 'unhealthy';

      if (!isReady) {
        throw new Error('Database is not ready');
      }

      return { status: 'ok', ready: true };
    } catch (error) {
      return { status: 'not ready', ready: false };
    }
  }

  @Get('metrics')
  @Public()
  @ApiOperation({ summary: 'Get database metrics' })
  @ApiResponse({
    status: 200,
    description: 'Database metrics',
  })
  async metrics() {
    return this.prisma.getMetrics();
  }
}
