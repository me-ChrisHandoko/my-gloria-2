import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { DatabaseConfigService } from './database.config';
import { DatabaseMetricsService } from './database.metrics';
import { CircuitBreakerService } from './circuit-breaker.service';
import { DatabaseErrorHandler } from './database.exceptions';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown
{
  private readonly logger = new Logger(PrismaService.name);
  private retryCount = 0;
  private maxRetries: number;
  private retryDelay: number;
  private prismaExtended: any;
  private readReplicaClient?: PrismaClient;
  private isShuttingDown = false;
  private healthCheckInterval?: NodeJS.Timeout;
  private connectionMonitorInterval?: NodeJS.Timeout;

  constructor(
    private readonly dbConfig: DatabaseConfigService,
    private readonly metrics: DatabaseMetricsService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {
    const config = dbConfig.databaseConfig;

    super({
      log: dbConfig.logLevel,
      errorFormat: dbConfig.errorFormat,
      datasources: {
        db: {
          url: dbConfig.connectionUrl,
        },
      },
    });

    this.maxRetries = config.maxRetries;
    this.retryDelay = config.retryDelay;

    // Initialize read replica if configured
    if (config.enableReadReplica && dbConfig.readReplicaUrl) {
      this.readReplicaClient = new PrismaClient({
        log: dbConfig.logLevel,
        errorFormat: dbConfig.errorFormat,
        datasources: {
          db: {
            url: dbConfig.readReplicaUrl,
          },
        },
      });
    }

    // Set up Prisma event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for query events if logging is enabled
    if (this.dbConfig.databaseConfig.enableQueryLogging) {
      (this.$on as any)('query', (e: any) => {
        this.logger.debug(
          `Query: ${e.query} - Params: ${e.params} - Duration: ${e.duration}ms`,
        );

        // Record query metrics
        this.metrics.recordQuery({
          operation: 'query',
          model: 'unknown',
          duration: e.duration,
          timestamp: new Date(),
          success: true,
        });
      });
    }
  }

  async onModuleInit() {
    await this.connectWithRetry();

    // Connect read replica if configured
    if (this.readReplicaClient) {
      try {
        await this.readReplicaClient.$connect();
        this.logger.log('Successfully connected to read replica database');
      } catch (error) {
        this.logger.error('Failed to connect to read replica', error);
        // Don't fail if read replica connection fails
      }
    }

    // Start health check monitoring
    this.startHealthMonitoring();

    // Start connection monitoring
    this.startConnectionMonitoring();

    // Configure extensions after connection
    this.prismaExtended = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const startTime = Date.now();

            try {
              // Use circuit breaker for database operations
              const result = await this.circuitBreaker.execute(async () => {
                // Soft delete middleware
                const softDeleteModels = [
                  'UserProfile',
                  'Role',
                  'Permission',
                  'School',
                  'Department',
                ];

                if (softDeleteModels.includes(model as string)) {
                  if (operation === 'delete') {
                    // Convert delete to update
                    return (query as any)({
                      ...args,
                      data: { isActive: false, deletedAt: new Date() },
                    });
                  }

                  if (operation === 'deleteMany') {
                    // Convert deleteMany to updateMany
                    return (query as any)({
                      ...args,
                      data: { isActive: false, deletedAt: new Date() },
                    });
                  }

                  // Exclude soft deleted records from find operations
                  if (
                    operation === 'findMany' ||
                    operation === 'findFirst' ||
                    operation === 'findUnique'
                  ) {
                    args.where = { ...args.where, isActive: { not: false } };
                  }
                }

                // Add query timeout
                if (this.dbConfig.databaseConfig.queryTimeout) {
                  const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(
                      () => reject(new Error('Query timeout')),
                      this.dbConfig.databaseConfig.queryTimeout,
                    );
                  });

                  return Promise.race([query(args), timeoutPromise]);
                }

                return query(args);
              });

              const executionTime = Date.now() - startTime;

              // Record metrics
              this.metrics.recordQuery({
                operation,
                model: model as string,
                duration: executionTime,
                timestamp: new Date(),
                success: true,
              });

              // Log slow queries
              if (
                this.dbConfig.databaseConfig.enableSlowQueryLogging &&
                executionTime > this.dbConfig.databaseConfig.slowQueryThreshold
              ) {
                this.logger.warn(
                  `Slow query detected: ${model}.${operation} took ${executionTime}ms`,
                  { args: JSON.stringify(args).slice(0, 200) },
                );
              }

              // Audit logging for write operations
              const auditActions = [
                'create',
                'update',
                'delete',
                'deleteMany',
                'updateMany',
                'upsert',
              ];
              if (
                process.env.NODE_ENV !== 'test' &&
                auditActions.includes(operation)
              ) {
                // This will be implemented when AuditLog model is available
                // Process audit logging asynchronously to not block the operation
                setImmediate(() => {
                  this.createAuditLog(
                    model as string,
                    operation,
                    executionTime,
                    args,
                  );
                });
              }

              return result;
            } catch (error) {
              const executionTime = Date.now() - startTime;

              // Record error metrics
              this.metrics.recordQuery({
                operation,
                model: model as string,
                duration: executionTime,
                timestamp: new Date(),
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              });

              // Handle Prisma errors with custom exceptions
              DatabaseErrorHandler.handlePrismaError(error);
              throw error;
            }
          },
        },
      },
    });
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;

    // Clear monitoring intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
    }

    // Disconnect clients
    await this.$disconnect();

    if (this.readReplicaClient) {
      await this.readReplicaClient.$disconnect();
    }
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Application shutting down with signal: ${signal}`);
    await this.onModuleDestroy();
  }

  private async connectWithRetry(): Promise<void> {
    try {
      await this.circuitBreaker.execute(async () => {
        await this.$connect();
      });

      this.logger.log('Successfully connected to database');
      this.retryCount = 0;

      // Record successful connection
      this.metrics.recordHealth({
        status: 'healthy',
        responseTime: 0,
        errorRate: 0,
        throughput: 0,
        timestamp: new Date(),
      });
    } catch (error) {
      this.retryCount++;

      if (this.retryCount <= this.maxRetries && !this.isShuttingDown) {
        this.logger.warn(
          `Failed to connect to database. Retry ${this.retryCount}/${this.maxRetries} in ${this.retryDelay}ms...`,
        );

        await new Promise((resolve) =>
          setTimeout(resolve, this.retryDelay * this.retryCount),
        );
        return this.connectWithRetry();
      }

      this.logger.error(
        'Failed to connect to database after maximum retries',
        error,
      );

      // Record unhealthy status
      this.metrics.recordHealth({
        status: 'unhealthy',
        responseTime: -1,
        errorRate: 100,
        throughput: 0,
        timestamp: new Date(),
      });

      throw error;
    }
  }

  // Get the extended Prisma client with middleware
  getClient() {
    return this.prismaExtended || this;
  }

  // Get read replica client for read operations
  getReadReplicaClient(): PrismaClient {
    if (!this.readReplicaClient) {
      // Fallback to main client if read replica is not configured
      return this.getClient();
    }
    return this.readReplicaClient;
  }

  // Execute read operation with read replica preference
  async executeRead<T>(
    operation: (client: PrismaClient) => Promise<T>,
  ): Promise<T> {
    const client = this.getReadReplicaClient();

    try {
      return await this.circuitBreaker.execute(async () => {
        return await operation(client);
      });
    } catch (error) {
      // If read replica fails, fallback to main database
      if (client === this.readReplicaClient) {
        this.logger.warn('Read replica failed, falling back to main database');
        return await operation(this.getClient());
      }
      throw error;
    }
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDatabase is not allowed in production environment');
    }

    this.logger.warn('Cleaning database - this will remove all data!');

    const tablenames = await this.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname IN ('gloria_ops', 'gloria_master')
    `;

    const tables = tablenames
      .map(({ tablename }) => tablename)
      .filter((name) => name !== '_prisma_migrations')
      .map((name) => `"${name}"`)
      .join(', ');

    if (tables.length > 0) {
      await this.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
      this.logger.log(`Cleaned ${tables.length} tables`);
    }
  }

  async healthCheck(): Promise<{
    status: string;
    message?: string;
    metrics?: any;
  }> {
    const startTime = Date.now();

    try {
      await this.circuitBreaker.execute(async () => {
        await this.$queryRaw`SELECT 1`;
      });

      const responseTime = Date.now() - startTime;
      const metrics = this.metrics.getAllMetrics();

      // Determine health status based on metrics
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (responseTime > 1000 || metrics.queries.errorRate > 5) {
        status = 'degraded';
      }

      if (
        this.circuitBreaker.getState() !== 'CLOSED' ||
        metrics.queries.errorRate > 20
      ) {
        status = 'unhealthy';
      }

      // Record health metrics
      this.metrics.recordHealth({
        status,
        responseTime,
        errorRate: metrics.queries.errorRate,
        throughput: metrics.queries.totalQueries,
        timestamp: new Date(),
      });

      return {
        status,
        metrics: {
          responseTime,
          circuitBreakerState: this.circuitBreaker.getState(),
          ...metrics,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error('Database health check failed', error);

      // Record unhealthy status
      this.metrics.recordHealth({
        status: 'unhealthy',
        responseTime,
        errorRate: 100,
        throughput: 0,
        timestamp: new Date(),
      });

      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          responseTime,
          circuitBreakerState: this.circuitBreaker.getState(),
        },
      };
    }
  }

  // Transaction helper with retry logic and circuit breaker
  async executeTransaction<T>(
    fn: (
      prisma: Omit<
        PrismaClient,
        '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
      >,
    ) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
      retryable?: boolean;
    },
  ): Promise<T> {
    const defaultOptions = {
      maxWait: 5000,
      timeout: this.dbConfig.databaseConfig.queryTimeout || 10000,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      retryable: false,
    };

    const mergedOptions = { ...defaultOptions, ...options };
    const startTime = Date.now();

    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await this.$transaction(fn, mergedOptions);
      });

      const executionTime = Date.now() - startTime;

      // Record transaction metrics
      this.metrics.recordQuery({
        operation: 'transaction',
        model: 'transaction',
        duration: executionTime,
        timestamp: new Date(),
        success: true,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Record transaction error
      this.metrics.recordQuery({
        operation: 'transaction',
        model: 'transaction',
        duration: executionTime,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle specific Prisma errors
        if (error.code === 'P2024') {
          this.logger.error('Transaction timeout exceeded', {
            duration: executionTime,
          });
        } else if (error.code === 'P2034') {
          this.logger.error('Transaction failed due to write conflict');

          // Retry if retryable and conflict occurred
          if (mergedOptions.retryable && this.retryCount < this.maxRetries) {
            this.retryCount++;
            this.logger.warn(
              `Retrying transaction ${this.retryCount}/${this.maxRetries}`,
            );
            await new Promise((resolve) =>
              setTimeout(resolve, this.retryDelay),
            );
            return this.executeTransaction(fn, options);
          }
        }
      }

      // Handle with custom exceptions
      DatabaseErrorHandler.handlePrismaError(error);
      throw error;
    }
  }

  // Monitoring methods
  private startHealthMonitoring(): void {
    if (this.isShuttingDown) return;

    const interval = this.dbConfig.databaseConfig.slowQueryThreshold || 30000;

    this.healthCheckInterval = setInterval(async () => {
      if (!this.isShuttingDown) {
        try {
          await this.healthCheck();
        } catch (error) {
          this.logger.error('Health check monitoring failed', error);
        }
      }
    }, interval);
  }

  private startConnectionMonitoring(): void {
    if (this.isShuttingDown) return;

    this.connectionMonitorInterval = setInterval(() => {
      if (!this.isShuttingDown) {
        // This is a placeholder for actual connection pool monitoring
        // In production, you would integrate with actual pool metrics
        const mockMetrics = {
          activeConnections: Math.floor(Math.random() * 10),
          idleConnections: Math.floor(Math.random() * 5),
          waitingRequests: Math.floor(Math.random() * 3),
          totalConnections: 15,
          timestamp: new Date(),
        };

        this.metrics.recordConnection(mockMetrics);
      }
    }, 10000); // Every 10 seconds
  }

  private async createAuditLog(
    modelName: string,
    action: string,
    executionTime: number,
    args: any,
  ): Promise<void> {
    try {
      // This will be implemented when AuditLog model is available
      // For now, just log to console in development
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug('Audit log (not persisted)', {
          modelName,
          action,
          executionTime,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
    }
  }

  // Get database metrics
  getMetrics() {
    return {
      circuitBreaker: this.circuitBreaker.getStats(),
      database: this.metrics.getAllMetrics(),
    };
  }

  // Force circuit breaker open (for testing/emergency)
  forceCircuitBreakerOpen(): void {
    this.circuitBreaker.forceOpen();
    this.logger.warn('Circuit breaker forced open');
  }

  // Force circuit breaker closed (for recovery)
  forceCircuitBreakerClosed(): void {
    this.circuitBreaker.forceClose();
    this.logger.warn('Circuit breaker forced closed');
  }
}
