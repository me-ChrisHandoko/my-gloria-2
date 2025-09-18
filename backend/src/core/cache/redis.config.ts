import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisOptions } from 'ioredis';

@Injectable()
export class RedisConfig {
  constructor(private readonly configService: ConfigService) {}

  getRedisOptions(): RedisOptions {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (redisUrl) {
      const url = new URL(redisUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port || '6379'),
        password: url.password || undefined,
        username: url.username || undefined,
        db: parseInt(url.pathname?.slice(1) || '0'),
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError: (err: Error) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true;
          }
          return false;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        connectTimeout: 10000,
        disconnectTimeout: 2000,
        commandTimeout: 5000,
        enableOfflineQueue: true,
        lazyConnect: false,
        keyPrefix: this.configService.get<string>(
          'REDIS_KEY_PREFIX',
          'gloria:',
        ),
        showFriendlyErrorStack:
          this.configService.get<string>('NODE_ENV') !== 'production',
      };
    }

    // Default configuration for local development
    return {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
      keyPrefix: this.configService.get<string>('REDIS_KEY_PREFIX', 'gloria:'),
      showFriendlyErrorStack:
        this.configService.get<string>('NODE_ENV') !== 'production',
    };
  }

  getCacheOptions() {
    return {
      ttl: this.configService.get<number>('CACHE_TTL', 3600), // 1 hour default
      max: this.configService.get<number>('CACHE_MAX_ITEMS', 1000),
      isGlobal: true,
    };
  }
}
