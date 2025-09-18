import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

export interface DatabaseConfig {
  connectionUrl: string;
  connectionPoolSize: number;
  connectionTimeout: number;
  poolTimeout: number;
  statementTimeout: number;
  queryTimeout: number;
  maxRetries: number;
  retryDelay: number;
  enableQueryLogging: boolean;
  enableSlowQueryLogging: boolean;
  slowQueryThreshold: number;
  enableReadReplica: boolean;
  readReplicaUrl?: string;
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

@Injectable()
export class DatabaseConfigService {
  private readonly config: DatabaseConfig;

  constructor(private configService: ConfigService) {
    this.config = this.loadConfiguration();
  }

  private loadConfiguration(): DatabaseConfig {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const isDevelopment = nodeEnv === 'development';
    const isProduction = nodeEnv === 'production';
    const isTest = nodeEnv === 'test';

    return {
      connectionUrl: this.configService.get<string>('DATABASE_URL', ''),
      connectionPoolSize: this.configService.get<number>(
        'DATABASE_POOL_SIZE',
        isProduction ? 20 : 5,
      ),
      connectionTimeout: this.configService.get<number>(
        'DATABASE_CONNECTION_TIMEOUT',
        5000,
      ),
      poolTimeout: this.configService.get<number>(
        'DATABASE_POOL_TIMEOUT',
        10000,
      ),
      statementTimeout: this.configService.get<number>(
        'DATABASE_STATEMENT_TIMEOUT',
        30000,
      ),
      queryTimeout: this.configService.get<number>(
        'DATABASE_QUERY_TIMEOUT',
        10000,
      ),
      maxRetries: this.configService.get<number>('DATABASE_MAX_RETRIES', 3),
      retryDelay: this.configService.get<number>('DATABASE_RETRY_DELAY', 1000),
      enableQueryLogging: this.configService.get<boolean>(
        'DATABASE_ENABLE_QUERY_LOGGING',
        isDevelopment,
      ),
      enableSlowQueryLogging: this.configService.get<boolean>(
        'DATABASE_ENABLE_SLOW_QUERY_LOGGING',
        true,
      ),
      slowQueryThreshold: this.configService.get<number>(
        'DATABASE_SLOW_QUERY_THRESHOLD',
        isProduction ? 1000 : 500,
      ),
      enableReadReplica: this.configService.get<boolean>(
        'DATABASE_ENABLE_READ_REPLICA',
        false,
      ),
      readReplicaUrl: this.configService.get<string>(
        'DATABASE_READ_REPLICA_URL',
        '',
      ),
      enableCircuitBreaker: this.configService.get<boolean>(
        'DATABASE_ENABLE_CIRCUIT_BREAKER',
        isProduction,
      ),
      circuitBreakerThreshold: this.configService.get<number>(
        'DATABASE_CIRCUIT_BREAKER_THRESHOLD',
        5,
      ),
      circuitBreakerTimeout: this.configService.get<number>(
        'DATABASE_CIRCUIT_BREAKER_TIMEOUT',
        60000,
      ),
    };
  }

  get databaseConfig(): DatabaseConfig {
    return this.config;
  }

  get connectionUrl(): string {
    // Add connection pool parameters to the URL
    const url = new URL(this.config.connectionUrl);
    url.searchParams.set(
      'connection_limit',
      this.config.connectionPoolSize.toString(),
    );
    url.searchParams.set(
      'connect_timeout',
      (this.config.connectionTimeout / 1000).toString(),
    );
    url.searchParams.set(
      'pool_timeout',
      (this.config.poolTimeout / 1000).toString(),
    );
    url.searchParams.set(
      'statement_timeout',
      this.config.statementTimeout.toString(),
    );

    // Add schema parameter if not present
    if (!url.searchParams.has('schema')) {
      url.searchParams.set('schema', 'gloria_ops,gloria_master');
    }

    return url.toString();
  }

  get readReplicaUrl(): string | undefined {
    if (!this.config.enableReadReplica || !this.config.readReplicaUrl) {
      return undefined;
    }

    const url = new URL(this.config.readReplicaUrl);
    url.searchParams.set(
      'connection_limit',
      Math.floor(this.config.connectionPoolSize / 2).toString(),
    );
    url.searchParams.set(
      'connect_timeout',
      (this.config.connectionTimeout / 1000).toString(),
    );

    return url.toString();
  }

  get logLevel(): Prisma.LogLevel[] {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    if (nodeEnv === 'test') {
      return [];
    }

    if (nodeEnv === 'production') {
      return ['error', 'warn'];
    }

    if (this.config.enableQueryLogging) {
      return ['query', 'info', 'warn', 'error'];
    }

    return ['info', 'warn', 'error'];
  }

  get errorFormat(): 'pretty' | 'colorless' | 'minimal' {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    return nodeEnv === 'production' ? 'minimal' : 'pretty';
  }
}
