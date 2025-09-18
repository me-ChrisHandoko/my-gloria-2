import { Module, Global } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { HealthIndicatorService } from './health-indicator.service';
import { SecurityMonitorService } from './security-monitor.service';
import { PrismaModule } from '../database/prisma.module';

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'gloria_',
        },
      },
      defaultLabels: {
        app: 'gloria-backend',
        env: process.env.NODE_ENV || 'development',
      },
      path: '/metrics',
      pushgateway: process.env.PUSHGATEWAY_URL
        ? {
            url: process.env.PUSHGATEWAY_URL,
          }
        : undefined,
    }),
    PrismaModule,
  ],
  controllers: [MonitoringController],
  providers: [
    MonitoringService,
    MetricsInterceptor,
    HealthIndicatorService,
    SecurityMonitorService,
  ],
  exports: [
    MonitoringService,
    MetricsInterceptor,
    HealthIndicatorService,
    SecurityMonitorService,
  ],
})
export class MonitoringModule {}
