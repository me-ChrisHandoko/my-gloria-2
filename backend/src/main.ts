import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import {
  ValidationPipe,
  VersioningType,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { v7 as uuidv7 } from 'uuid';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import { AppModule } from './app.module';

// Import production-ready components
import { AllExceptionsFilter } from './core/filters/all-exceptions.filter';
import { LoggingInterceptor } from './core/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './core/interceptors/timeout.interceptor';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';
import { PrismaService } from './core/database/prisma.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  let app: NestFastifyApplication;

  try {
    // Create app with Fastify adapter for better performance
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter({
        logger: process.env.NODE_ENV === 'development',
        requestIdLogLabel: 'requestId',
        requestIdHeader: 'x-request-id',
        genReqId: (req: any) => req.headers['x-request-id'] || uuidv7(),
        trustProxy: true, // Important for production behind reverse proxy
        bodyLimit: 10485760, // 10MB body limit
      }),
      {
        bufferLogs: true, // Buffer logs until logger is attached
      },
    );

    // Get config service
    const configService = app.get(ConfigService);

    // Use built-in logger
    app.useLogger(logger);

    // Security middleware - Enhanced configuration
    await app.register(helmet, {
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production'
          ? {
              directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:'],
              },
            }
          : false,
      crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production',
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    });

    // Rate limiting for production
    if (process.env.NODE_ENV === 'production') {
      await app.register(rateLimit, {
        max: configService.get<number>('rateLimit.max', 100),
        timeWindow: configService.get<number>('rateLimit.windowMs', 60000),
        allowList: configService.get<string[]>('rateLimit.whitelist', []),
        skipOnError: true,
        addHeadersOnExceeding: {
          'x-ratelimit-limit': true,
          'x-ratelimit-remaining': true,
          'x-ratelimit-reset': true,
        },
        hook: 'onRequest',
        keyGenerator: (request: any) => {
          return (
            request.headers['x-forwarded-for'] ||
            request.headers['x-real-ip'] ||
            request.ip
          );
        },
      });
    }

    // Compression with optimized settings
    await app.register(compress, {
      encodings: ['gzip', 'deflate', 'br'],
      threshold: 1024,
      customTypes: /^text\/|application\/json/,
      removeContentLengthHeader: false,
    });

    // CORS configuration
    const corsOrigins = configService.get<string[]>('cors.origins');
    const corsCredentials = configService.get<boolean>('cors.credentials');

    app.enableCors({
      origin: corsOrigins,
      credentials: corsCredentials,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
      exposedHeaders: ['x-request-id'],
    });

    // API Versioning
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
      prefix: 'api/v',
    });

    // // Global prefix
    // app.setGlobalPrefix('api/v1', {
    //   exclude: ['health', 'health/live', 'health/ready', 'metrics'],
    // });

    // Global pipes - Enhanced validation configuration
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        disableErrorMessages: process.env.NODE_ENV === 'production',
        validationError: {
          target: false,
          value: false,
        },
        exceptionFactory: (errors) => {
          const messages = errors.map((error) => ({
            field: error.property,
            errors: Object.values(error.constraints || {}),
          }));
          return new BadRequestException({
            statusCode: 400,
            message: 'Validation failed',
            error: 'Bad Request', // ← FIXED: Add error field for AllExceptionsFilter
            errors: messages,
          });
        },
      }),
    );

    // Global exception filter
    app.useGlobalFilters(new AllExceptionsFilter(configService));

    // Global interceptors
    app.useGlobalInterceptors(
      new LoggingInterceptor(configService),
      new TimeoutInterceptor(configService),
      new TransformInterceptor(),
    );

    // Swagger documentation
    const swaggerEnabled = configService.get<boolean>('swagger.enabled');
    if (swaggerEnabled) {
      const swaggerConfig = new DocumentBuilder()
        .setTitle(configService.get('swagger.title') || 'Gloria API')
        .setDescription(
          configService.get('swagger.description') ||
            'Gloria System API Documentation',
        )
        .setVersion(configService.get('swagger.version') || '1.0.0')
        .addBearerAuth()
        .addApiKey(
          { type: 'apiKey', name: 'x-api-key', in: 'header' },
          'api-key',
        )
        .addServer(
          `http://localhost:${configService.get('app.port')}`,
          'Local Development',
        )
        .addServer('https://api.gloria.dev', 'Development')
        .addServer('https://api.gloria.staging', 'Staging')
        .addServer('https://api.gloria.com', 'Production')
        .build();

      const document = SwaggerModule.createDocument(app, swaggerConfig);
      SwaggerModule.setup(
        configService.get('swagger.path') || 'docs',
        app,
        document,
        {
          swaggerOptions: {
            persistAuthorization: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
          },
        },
      );

      logger.log(
        `Swagger documentation available at /${configService.get('swagger.path')}`,
      );
    }

    // Graceful shutdown with proper cleanup
    app.enableShutdownHooks();

    // Store server instance for cleanup
    const prismaService = app.get(PrismaService);

    // Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      logger.log(`Received ${signal}, starting graceful shutdown...`);

      try {
        // Stop accepting new connections
        await app.close();

        // Close database connections
        await prismaService.$disconnect();

        logger.log('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    // Register shutdown handlers for different signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon restart

    // Handle uncaught exceptions - Enhanced error handling
    process.on('uncaughtException', (error: Error) => {
      logger.error(`Uncaught Exception: ${error.message}`, error.stack);

      // Log to external service if configured
      if (process.env.SENTRY_DSN) {
        // Sentry or other error tracking service would log here
      }

      // Attempt graceful shutdown
      gracefulShutdown('uncaughtException').finally(() => {
        process.exit(1);
      });
    });

    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);

      // Log to external service if configured
      if (process.env.SENTRY_DSN) {
        // Sentry or other error tracking service would log here
      }

      // Don't exit on unhandled rejection in development
      if (process.env.NODE_ENV === 'production') {
        gracefulShutdown('unhandledRejection').finally(() => {
          process.exit(1);
        });
      }
    });

    // Memory monitoring for production
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => {
        const memUsage = process.memoryUsage();
        const memoryThreshold = configService.get(
          'monitoring.memoryThreshold',
          1000,
        ); // MB

        if (memUsage.heapUsed / 1024 / 1024 > memoryThreshold) {
          logger.warn('Memory usage high:', {
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          });
        }
      }, 60000); // Check every minute
    }

    // Start server
    const port = configService.get<number>('app.port') || 3000;
    const host = '0.0.0.0'; // Listen on all network interfaces

    await app.listen(port, host);

    // Application startup information
    logger.log('════════════════════════════════════════════════════════');
    logger.log(`🚀 Application started successfully`);
    logger.log('────────────────────────────────────────────────────────');
    logger.log(`📍 Server:      http://localhost:${port}`);
    logger.log(`🌍 Environment: ${configService.get('app.environment')}`);
    logger.log(`📊 Log Level:   ${configService.get('logging.level')}`);
    logger.log(`🔄 API Version: v1`);

    if (configService.get<boolean>('swagger.enabled')) {
      logger.log(
        `📚 API Docs:    http://localhost:${port}/${configService.get('swagger.path')}`,
      );
    }

    logger.log('────────────────────────────────────────────────────────');
    logger.log('🏥 Health Endpoints:');
    logger.log(`   • Health:    http://localhost:${port}/health`);
    logger.log(`   • Liveness:  http://localhost:${port}/health/live`);
    logger.log(`   • Readiness: http://localhost:${port}/health/ready`);
    logger.log(`   • Metrics:   http://localhost:${port}/health/metrics`);
    logger.log('════════════════════════════════════════════════════════');

    // Log all registered routes in development
    if (process.env.NODE_ENV === 'development') {
      const server = app.getHttpServer() as any;
      const router = server._core || server;
      if (router && router.printRoutes) {
        logger.debug('📋 Registered routes:');
        console.log(router.printRoutes());
      }
    }

    // Perform readiness check
    try {
      const healthCheck = await prismaService.healthCheck();
      if (healthCheck.status === 'healthy') {
        logger.log('✅ Database connection established successfully');
      } else {
        logger.warn(`⚠️ Database connection degraded: ${healthCheck.message}`);
      }
    } catch (error) {
      logger.error('❌ Database connection failed:', error);
    }

    // Log memory usage on startup
    const memUsage = process.memoryUsage();
    logger.log('💾 Memory Usage:', {
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    });
  } catch (error) {
    logger.error('❌ Failed to start application:', error);

    // Attempt to provide more context about the error
    if (error instanceof Error) {
      if (error.message.includes('port')) {
        const port = process.env.PORT || 3000;
        logger.error(`Port ${port} might be in use`);
        logger.error('Try: lsof -i :3000 to find the process using the port');
      } else if (error.message.includes('database')) {
        logger.error('Database connection failed. Check DATABASE_URL in .env');
      } else if (error.message.includes('module')) {
        logger.error(
          'Module initialization failed. Check your imports and dependencies',
        );
      }
    }

    process.exit(1);
  }
}

bootstrap();
