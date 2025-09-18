import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '../config';
import Redis from 'ioredis';
import { Queue } from 'bullmq';

@Injectable()
export class HealthIndicatorService extends HealthIndicator {
  private redisClient: Redis | null = null;
  private queues: Map<string, Queue> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super();
    this.initializeRedisClient();
  }

  private initializeRedisClient(): void {
    const redisUrl = this.configService.get('cache.redis.url');
    if (redisUrl) {
      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        showFriendlyErrorStack: true,
      });
    }
  }

  async checkDatabase(): Promise<HealthIndicatorResult> {
    const key = 'database';
    const startTime = Date.now();

    try {
      // Simple query to check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;

      const responseTime = Date.now() - startTime;

      return this.getStatus(key, true, {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
      });
    } catch (error) {
      throw new HealthCheckError(
        'Database health check failed',
        this.getStatus(key, false, {
          status: 'unhealthy',
          error: error.message,
        }),
      );
    }
  }

  async checkRedis(): Promise<HealthIndicatorResult> {
    const key = 'redis';

    if (!this.redisClient) {
      return this.getStatus(key, true, {
        status: 'not_configured',
        message: 'Redis is not configured',
      });
    }

    const startTime = Date.now();

    try {
      await this.redisClient.ping();
      const responseTime = Date.now() - startTime;

      return this.getStatus(key, true, {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
      });
    } catch (error) {
      throw new HealthCheckError(
        'Redis health check failed',
        this.getStatus(key, false, {
          status: 'unhealthy',
          error: error.message,
        }),
      );
    }
  }

  async checkQueue(queueName: string): Promise<HealthIndicatorResult> {
    const key = `queue_${queueName}`;

    try {
      let queue = this.queues.get(queueName);

      if (!queue) {
        const redisUrl =
          this.configService.get('queue.redis.url') ||
          this.configService.get('cache.redis.url');

        if (!redisUrl) {
          return this.getStatus(key, true, {
            status: 'not_configured',
            message: 'Queue Redis is not configured',
          });
        }

        const url = new URL(redisUrl);
        queue = new Queue(queueName, {
          connection: {
            host: url.hostname,
            port: parseInt(url.port || '6379', 10),
            password: url.password || undefined,
            username: url.username || undefined,
            db: parseInt(url.pathname?.substring(1) || '0', 10),
          },
        });
        this.queues.set(queueName, queue);
      }

      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      return this.getStatus(key, true, {
        status: 'healthy',
        stats: {
          waiting,
          active,
          completed,
          failed,
          delayed,
        },
      });
    } catch (error) {
      throw new HealthCheckError(
        `Queue ${queueName} health check failed`,
        this.getStatus(key, false, {
          status: 'unhealthy',
          error: error.message,
        }),
      );
    }
  }

  async checkMemory(): Promise<HealthIndicatorResult> {
    const key = 'memory';
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    // Warning if memory usage is above 80%
    const isHealthy = memoryUsagePercent < 80;
    const status = isHealthy ? 'healthy' : 'warning';

    return this.getStatus(key, isHealthy, {
      status,
      usage: {
        heapTotal: `${Math.round(totalMemory / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(usedMemory / 1024 / 1024)}MB`,
        percentage: `${memoryUsagePercent.toFixed(2)}%`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      },
    });
  }

  async checkDiskSpace(): Promise<HealthIndicatorResult> {
    const key = 'disk';

    try {
      // This is a simplified check - in production, you might want to use a library like 'diskusage'
      const uploadPath = this.configService.get('upload.path') || './uploads';

      return this.getStatus(key, true, {
        status: 'healthy',
        path: uploadPath,
        message: 'Disk space monitoring configured',
      });
    } catch (error) {
      return this.getStatus(key, false, {
        status: 'error',
        error: error.message,
      });
    }
  }

  async checkExternalServices(): Promise<HealthIndicatorResult> {
    const key = 'external_services';
    const services = {
      clerk: false,
      postmark: false,
    };

    // Check Clerk
    const clerkSecretKey = this.configService.get('auth.clerk.secretKey');
    if (clerkSecretKey) {
      services.clerk = true;
    }

    // Check Postmark
    const postmarkApiKey = this.configService.get('email.postmark.apiKey');
    if (postmarkApiKey) {
      services.postmark = true;
    }

    return this.getStatus(key, true, {
      status: 'configured',
      services,
    });
  }

  async checkCustom(
    name: string,
    checkFn: () => Promise<boolean>,
  ): Promise<HealthIndicatorResult> {
    const key = name;
    const startTime = Date.now();

    try {
      const isHealthy = await checkFn();
      const responseTime = Date.now() - startTime;

      return this.getStatus(key, isHealthy, {
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime: `${responseTime}ms`,
      });
    } catch (error) {
      throw new HealthCheckError(
        `${name} health check failed`,
        this.getStatus(key, false, {
          status: 'error',
          error: error.message,
        }),
      );
    }
  }

  // Cleanup method
  async onModuleDestroy(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }

    for (const queue of this.queues.values()) {
      await queue.close();
    }
  }
}
