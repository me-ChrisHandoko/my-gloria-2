import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { RedisConfig } from './redis.config';
import { RedisService } from './redis.service';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const ttl = configService.get<number>('CACHE_TTL', 3600) * 1000; // Convert to milliseconds

        if (!redisUrl) {
          // Fallback to in-memory cache if Redis is not configured
          return {
            ttl,
            max: configService.get<number>('CACHE_MAX_ITEMS', 1000),
          };
        }

        const url = new URL(redisUrl);

        return {
          store: await redisStore({
            socket: {
              host: url.hostname,
              port: parseInt(url.port || '6379'),
            },
            password: url.password || undefined,
            username: url.username || undefined,
            database: parseInt(url.pathname?.slice(1) || '0'),
            ttl,
          }),
        };
      },
    }),
  ],
  providers: [RedisConfig, RedisService, CacheService],
  exports: [RedisService, CacheService, NestCacheModule],
})
export class CacheModule {}
