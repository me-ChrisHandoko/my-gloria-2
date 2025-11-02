import { Module, DynamicModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { join } from 'path';
import { redisStore } from 'cache-manager-redis-yet';

// Core Modules
import { ConfigModule, ConfigService } from './core/config';
import { PrismaModule } from './core/database';
import { AuthModule } from './core/auth';
import { HealthModule } from './core/health/health.module';
import { MonitoringModule } from './core/monitoring';
import { AuditModule } from './core/audit';
import { LoggingModule } from './core/logging/logging.module';

// Feature Modules
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PermissionModule } from './modules/permissions/permission.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule as AuditFeatureModule } from './modules/audit/audit.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';

// Removed Temporal Workflow Integration - no longer needed

// Core Performance & Security
import { PerformanceModule } from './core/performance/performance.module';
import { SecurityModule } from './core/security/security.module';

// Interceptors
import { LoggingInterceptor } from './core/interceptors/logging.interceptor';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';
import { TimeoutInterceptor } from './core/interceptors/timeout.interceptor';
import { MetricsInterceptor } from './core/monitoring/metrics.interceptor';
import { AuditInterceptor } from './core/audit/audit.interceptor';

// Exception Filters
import { AllExceptionsFilter } from './core/filters/all-exceptions.filter';
import { PrismaExceptionFilter } from './core/filters/prisma-exception.filter';
import { ValidationExceptionFilter } from './core/filters/validation-exception.filter';

// Utilities
import { CryptoUtil } from './core/utils/crypto.util';

@Module({
  imports: [
    // Configuration Module (Global)
    ConfigModule,

    // Logging Module (Global)
    LoggingModule.forRoot(),

    // Database Module (Global)
    PrismaModule,

    // Authentication Module (Global)
    AuthModule,

    // Health Check Module
    HealthModule,

    // Monitoring and Observability
    MonitoringModule,

    // Audit Logging
    AuditModule,

    // Performance & Security Core Modules
    PerformanceModule,
    SecurityModule,

    // Caching Module with Redis
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get('cache.redis.url');
        const ttl = configService.get('cache.ttl') || 3600;

        // Use Redis if available, otherwise fallback to in-memory cache
        if (redisUrl) {
          return {
            store: async () =>
              await redisStore({
                url: redisUrl,
                ttl,
              }),
            ttl,
            max: configService.get('cache.max') || 100,
          };
        }

        return {
          ttl,
          max: configService.get('cache.max') || 100,
        };
      },
      isGlobal: true,
    }),

    // Event-Driven Architecture Support
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),

    // Queue Processing with BullMQ
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl =
          configService.get('queue.redis.url') ||
          configService.get('cache.redis.url');

        if (!redisUrl) {
          return {
            connection: {
              host: 'localhost',
              port: 6379,
            },
          };
        }

        // Parse Redis URL
        const url = new URL(redisUrl);
        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port || '6379', 10),
            password: url.password || undefined,
            username: url.username || undefined,
            db: parseInt(url.pathname?.substring(1) || '0', 10),
          },
          defaultJobOptions: {
            removeOnComplete:
              configService.get('queue.removeOnComplete') !== false,
            removeOnFail: configService.get('queue.removeOnFail') !== false,
            attempts: configService.get('queue.attempts') || 3,
            backoff: {
              type: 'exponential',
              delay: configService.get('queue.backoffDelay') || 2000,
            },
          },
        };
      },
    }),

    // Scheduled Tasks Support
    ScheduleModule.forRoot(),

    // Static Files Serving (for uploads, etc.)
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uploadPath =
          configService.get('upload.path') || join(process.cwd(), 'uploads');
        const isProduction = configService.get('nodeEnv') === 'production';

        // Only serve static files in non-production environments or when explicitly enabled
        if (isProduction && !configService.get('upload.serveStatic')) {
          return [];
        }

        return [
          {
            rootPath: uploadPath,
            serveRoot: '/uploads',
            serveStaticOptions: {
              index: false,
              fallthrough: false,
            },
          },
        ];
      },
    }),

    // Rate Limiting with Advanced Configuration
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('nodeEnv') === 'production';

        // Different rate limits for different environments
        const defaultLimit = isProduction ? 100 : 1000;
        const defaultTtl = isProduction ? 60000 : 60000; // 1 minute

        return [
          {
            name: 'default',
            ttl: configService.get('rateLimit.ttl') || defaultTtl,
            limit: configService.get('rateLimit.limit') || defaultLimit,
          },
          {
            name: 'auth',
            ttl: 60000, // 1 minute
            limit: 5, // 5 attempts per minute for auth endpoints
          },
          {
            name: 'api',
            ttl: configService.get('rateLimit.api.ttl') || 1000,
            limit: configService.get('rateLimit.api.limit') || 30,
          },
        ];
      },
    }),

    // Feature Modules will be added here dynamically
    ...getFeatureModules(),
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // Utilities
    CryptoUtil,

    // Global Guards
    // ClerkAuthGuard is provided by AuthModule
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    // Global Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },

    // Global Exception Filters (Order matters - specific to general)
    {
      provide: APP_FILTER,
      useClass: ValidationExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {
  static forRoot(): DynamicModule {
    return {
      module: AppModule,
      global: true,
    };
  }
}

/**
 * Dynamically load feature modules based on configuration
 * This allows for modular deployment and feature toggling
 */
function getFeatureModules(): any[] {
  const modules: any[] = [];

  // These modules would be dynamically imported based on configuration

  // Users Module
  if (process.env.ENABLE_USERS_MODULE !== 'false') {
    modules.push(UsersModule);
  }

  // Organizations Module (Schools, Departments, Positions)
  if (process.env.ENABLE_ORGANIZATIONS_MODULE !== 'false') {
    modules.push(OrganizationsModule);
  }

  // Permissions Module
  if (process.env.ENABLE_PERMISSIONS_MODULE !== 'false') {
    modules.push(PermissionModule);
  }

  // Notifications Module
  if (process.env.ENABLE_NOTIFICATIONS_MODULE !== 'false') {
    modules.push(NotificationsModule);
  }

  // Audit Feature Module
  if (process.env.ENABLE_AUDIT_MODULE !== 'false') {
    modules.push(AuditFeatureModule);
  }

  // Feature Flags Module
  if (process.env.ENABLE_FEATURE_FLAGS_MODULE !== 'false') {
    modules.push(FeatureFlagsModule);
  }

  // System Configuration Module
  if (process.env.ENABLE_SYSTEM_CONFIG_MODULE !== 'false') {
    modules.push(SystemConfigModule);
  }

  // Approvals Module removed - was dependent on Temporal

  return modules;
}
