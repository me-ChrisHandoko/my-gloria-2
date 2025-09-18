import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis, { Redis as RedisClient } from 'ioredis';
import { RedisConfig } from './redis.config';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  nx?: boolean; // Only set if key doesn't exist
  xx?: boolean; // Only set if key exists
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClient;
  private subscriber: RedisClient;
  private publisher: RedisClient;
  private isConnected = false;

  constructor(private readonly redisConfig: RedisConfig) {}

  async onModuleInit() {
    try {
      await this.connect();
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
      // Don't throw - allow app to start without Redis
      // Will retry on first operation
    }
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    if (this.isConnected) return;

    const options = this.redisConfig.getRedisOptions();

    try {
      // Main client for general operations
      this.client = new Redis(options);

      // Separate clients for pub/sub to avoid blocking
      this.subscriber = new Redis(options);
      this.publisher = new Redis(options);

      // Set up error handlers with production-ready handling
      this.client.on('error', (err) => {
        this.logger.error('Redis client error:', err.message);
        // Don't crash the app on Redis errors
      });

      this.subscriber.on('error', (err) => {
        this.logger.error('Redis subscriber error:', err.message);
      });

      this.publisher.on('error', (err) => {
        this.logger.error('Redis publisher error:', err.message);
      });

      this.client.on('connect', () => {
        this.logger.log('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        this.logger.log('Redis client ready');
      });

      this.client.on('close', () => {
        this.logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', (delay) => {
        this.logger.log(`Redis client reconnecting in ${delay}ms...`);
      });

      // Wait for connection with timeout
      await Promise.race([
        this.client.ping(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Redis connection timeout')),
            10000,
          ),
        ),
      ]);

      this.logger.log('Redis connection established successfully');
    } catch (error) {
      this.logger.error('Failed to establish Redis connection:', error.message);
      // Clean up any partial connections
      await this.cleanupConnections();
      throw error;
    }
  }

  private async cleanupConnections() {
    try {
      if (this.client) {
        this.client.removeAllListeners();
        this.client.disconnect();
      }
      if (this.subscriber) {
        this.subscriber.removeAllListeners();
        this.subscriber.disconnect();
      }
      if (this.publisher) {
        this.publisher.removeAllListeners();
        this.publisher.disconnect();
      }
    } catch (error) {
      // Ignore cleanup errors
      this.logger.debug('Error during connection cleanup:', error.message);
    }
  }

  private async ensureConnection() {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  async disconnect() {
    try {
      // Check if we're actually connected before trying to quit
      if (!this.isConnected) {
        this.logger.debug('Redis already disconnected, skipping disconnect');
        return;
      }

      const disconnectPromises: Promise<any>[] = [];

      // Disconnect main client
      if (this.client && this.client.status === 'ready') {
        disconnectPromises.push(
          this.client.quit().catch((err) => {
            this.logger.debug('Error disconnecting Redis client:', err.message);
          }),
        );
      }

      // Disconnect subscriber
      if (this.subscriber && this.subscriber.status === 'ready') {
        disconnectPromises.push(
          this.subscriber.quit().catch((err) => {
            this.logger.debug(
              'Error disconnecting Redis subscriber:',
              err.message,
            );
          }),
        );
      }

      // Disconnect publisher
      if (this.publisher && this.publisher.status === 'ready') {
        disconnectPromises.push(
          this.publisher.quit().catch((err) => {
            this.logger.debug(
              'Error disconnecting Redis publisher:',
              err.message,
            );
          }),
        );
      }

      // Wait for all disconnections with timeout
      await Promise.race([
        Promise.all(disconnectPromises),
        new Promise((resolve) => setTimeout(resolve, 5000)), // 5 second timeout
      ]);

      this.isConnected = false;
      this.logger.log('Redis connections closed gracefully');
    } catch (error) {
      // Don't throw during shutdown, just log the error
      this.logger.warn(
        'Error during Redis disconnect (non-critical):',
        error.message,
      );
      this.isConnected = false;
    }
  }

  // Basic operations
  async get(key: string): Promise<string | null> {
    try {
      await this.ensureConnection();
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Failed to get key ${key}:`, error);
      return null;
    }
  }

  async set(
    key: string,
    value: string | number | Buffer,
    options?: CacheOptions,
  ): Promise<boolean> {
    try {
      await this.ensureConnection();

      const args: any[] = [key, value];

      if (options?.ttl) {
        args.push('EX', options.ttl);
      }

      if (options?.nx) {
        args.push('NX');
      } else if (options?.xx) {
        args.push('XX');
      }

      const result = await this.client.set(
        ...(args as [string, string, ...any[]]),
      );
      return result === 'OK';
    } catch (error) {
      this.logger.error(`Failed to set key ${key}:`, error);
      return false;
    }
  }

  async del(key: string | string[]): Promise<number> {
    try {
      await this.ensureConnection();
      const keys = Array.isArray(key) ? key : [key];
      return await this.client.del(...keys);
    } catch (error) {
      this.logger.error(`Failed to delete key(s) ${key}:`, error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check existence of key ${key}:`, error);
      return false;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      await this.ensureConnection();
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to set expiry for key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      await this.ensureConnection();
      return await this.client.ttl(key);
    } catch (error) {
      this.logger.error(`Failed to get TTL for key ${key}:`, error);
      return -2;
    }
  }

  // JSON operations
  async getJson<T>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Failed to get JSON for key ${key}:`, error);
      return null;
    }
  }

  async setJson<T>(
    key: string,
    value: T,
    options?: CacheOptions,
  ): Promise<boolean> {
    try {
      const jsonString = JSON.stringify(value);
      return await this.set(key, jsonString, options);
    } catch (error) {
      this.logger.error(`Failed to set JSON for key ${key}:`, error);
      return false;
    }
  }

  // Hash operations
  async hget(key: string, field: string): Promise<string | null> {
    try {
      await this.ensureConnection();
      return await this.client.hget(key, field);
    } catch (error) {
      this.logger.error(`Failed to hget ${key}:${field}:`, error);
      return null;
    }
  }

  async hset(key: string, field: string, value: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      const result = await this.client.hset(key, field, value);
      return result >= 0;
    } catch (error) {
      this.logger.error(`Failed to hset ${key}:${field}:`, error);
      return false;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    try {
      await this.ensureConnection();
      return await this.client.hgetall(key);
    } catch (error) {
      this.logger.error(`Failed to hgetall ${key}:`, error);
      return {};
    }
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    try {
      await this.ensureConnection();
      return await this.client.hdel(key, ...fields);
    } catch (error) {
      this.logger.error(`Failed to hdel ${key}:`, error);
      return 0;
    }
  }

  // List operations
  async lpush(key: string, ...values: string[]): Promise<number> {
    try {
      await this.ensureConnection();
      return await this.client.lpush(key, ...values);
    } catch (error) {
      this.logger.error(`Failed to lpush ${key}:`, error);
      return 0;
    }
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    try {
      await this.ensureConnection();
      return await this.client.rpush(key, ...values);
    } catch (error) {
      this.logger.error(`Failed to rpush ${key}:`, error);
      return 0;
    }
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      await this.ensureConnection();
      return await this.client.lrange(key, start, stop);
    } catch (error) {
      this.logger.error(`Failed to lrange ${key}:`, error);
      return [];
    }
  }

  async llen(key: string): Promise<number> {
    try {
      await this.ensureConnection();
      return await this.client.llen(key);
    } catch (error) {
      this.logger.error(`Failed to llen ${key}:`, error);
      return 0;
    }
  }

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      await this.ensureConnection();
      return await this.client.sadd(key, ...members);
    } catch (error) {
      this.logger.error(`Failed to sadd ${key}:`, error);
      return 0;
    }
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    try {
      await this.ensureConnection();
      return await this.client.srem(key, ...members);
    } catch (error) {
      this.logger.error(`Failed to srem ${key}:`, error);
      return 0;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      await this.ensureConnection();
      return await this.client.smembers(key);
    } catch (error) {
      this.logger.error(`Failed to smembers ${key}:`, error);
      return [];
    }
  }

  async sismember(key: string, member: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      const result = await this.client.sismember(key, member);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to sismember ${key}:${member}:`, error);
      return false;
    }
  }

  // Pub/Sub operations
  async publish(channel: string, message: string): Promise<number> {
    try {
      await this.ensureConnection();
      return await this.publisher.publish(channel, message);
    } catch (error) {
      this.logger.error(`Failed to publish to ${channel}:`, error);
      return 0;
    }
  }

  async subscribe(
    channel: string,
    callback: (message: string) => void,
  ): Promise<void> {
    try {
      await this.ensureConnection();
      await this.subscriber.subscribe(channel);

      this.subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          callback(message);
        }
      });
    } catch (error) {
      this.logger.error(`Failed to subscribe to ${channel}:`, error);
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    try {
      await this.ensureConnection();
      await this.subscriber.unsubscribe(channel);
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from ${channel}:`, error);
    }
  }

  // Pattern operations
  async keys(pattern: string): Promise<string[]> {
    try {
      await this.ensureConnection();
      return await this.client.keys(pattern);
    } catch (error) {
      this.logger.error(`Failed to get keys for pattern ${pattern}:`, error);
      return [];
    }
  }

  async scan(
    cursor: string,
    pattern?: string,
    count?: number,
  ): Promise<[string, string[]]> {
    try {
      await this.ensureConnection();
      const args: any[] = [cursor];

      if (pattern) {
        args.push('MATCH', pattern);
      }

      if (count) {
        args.push('COUNT', count);
      }

      return await this.client.scan(...(args as [string | number, ...any[]]));
    } catch (error) {
      this.logger.error(`Failed to scan:`, error);
      return ['0', []];
    }
  }

  // Atomic operations
  async incr(key: string): Promise<number> {
    try {
      await this.ensureConnection();
      return await this.client.incr(key);
    } catch (error) {
      this.logger.error(`Failed to incr ${key}:`, error);
      return 0;
    }
  }

  async decr(key: string): Promise<number> {
    try {
      await this.ensureConnection();
      return await this.client.decr(key);
    } catch (error) {
      this.logger.error(`Failed to decr ${key}:`, error);
      return 0;
    }
  }

  async incrby(key: string, increment: number): Promise<number> {
    try {
      await this.ensureConnection();
      return await this.client.incrby(key, increment);
    } catch (error) {
      this.logger.error(`Failed to incrby ${key}:`, error);
      return 0;
    }
  }

  // Pipeline operations for batch commands
  async pipeline(commands: Array<[string, ...any[]]>): Promise<any[]> {
    try {
      await this.ensureConnection();
      const pipeline = this.client.pipeline();

      for (const [command, ...args] of commands) {
        (pipeline as any)[command](...args);
      }

      const results = await pipeline.exec();
      return results
        ? results.map(([err, result]) => (err ? null : result))
        : [];
    } catch (error) {
      this.logger.error('Failed to execute pipeline:', error);
      return [];
    }
  }

  // Utility methods
  async flushdb(): Promise<void> {
    try {
      await this.ensureConnection();
      await this.client.flushdb();
      this.logger.warn('Redis database flushed');
    } catch (error) {
      this.logger.error('Failed to flush database:', error);
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.ensureConnection();
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Failed to ping Redis:', error);
      return false;
    }
  }

  async info(): Promise<string> {
    try {
      await this.ensureConnection();
      return await this.client.info();
    } catch (error) {
      this.logger.error('Failed to get Redis info:', error);
      return '';
    }
  }

  getClient(): RedisClient {
    return this.client;
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}
