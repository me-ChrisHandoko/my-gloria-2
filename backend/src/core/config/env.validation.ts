import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsUrl,
  validateSync,
  IsNotEmpty,
  Min,
  Max,
  IsEmail,
  IsIn,
  Length,
  Matches,
} from 'class-validator';
import { plainToClass, Transform } from 'class-transformer';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
}

export enum LogLevel {
  Fatal = 'fatal',
  Error = 'error',
  Warn = 'warn',
  Info = 'info',
  Debug = 'debug',
  Verbose = 'verbose',
  Silly = 'silly',
}

export class EnvironmentVariables {
  // ==================== Core Application Settings ====================
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(0)
  @Max(65535)
  PORT: number = 3001;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  API_VERSION?: string = 'v1';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  APP_NAME?: string = 'Gloria Backend';

  // ==================== Database Configuration ====================
  @IsString()
  @IsNotEmpty()
  @Matches(/^postgresql:\/\//, {
    message: 'DATABASE_URL must be a valid PostgreSQL connection string',
  })
  DATABASE_URL: string;

  // Database Pool Settings
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(100)
  DATABASE_POOL_SIZE?: number = 5;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1000)
  @Max(60000)
  DATABASE_CONNECTION_TIMEOUT?: number = 5000;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1000)
  @Max(60000)
  DATABASE_POOL_TIMEOUT?: number = 10000;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1000)
  @Max(120000)
  DATABASE_STATEMENT_TIMEOUT?: number = 30000;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1000)
  @Max(60000)
  DATABASE_QUERY_TIMEOUT?: number = 10000;

  // Database Retry Configuration
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(0)
  @Max(10)
  DATABASE_MAX_RETRIES?: number = 3;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(100)
  @Max(10000)
  DATABASE_RETRY_DELAY?: number = 1000;

  // Database Monitoring
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  DATABASE_ENABLE_QUERY_LOGGING?: boolean = false;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  DATABASE_ENABLE_SLOW_QUERY_LOGGING?: boolean = true;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(100)
  @Max(10000)
  DATABASE_SLOW_QUERY_THRESHOLD?: number = 500;

  // Read Replica (Optional)
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  DATABASE_ENABLE_READ_REPLICA?: boolean = false;

  @IsOptional()
  @IsString()
  @Matches(/^postgresql:\/\//, {
    message:
      'DATABASE_READ_REPLICA_URL must be a valid PostgreSQL connection string',
  })
  DATABASE_READ_REPLICA_URL?: string;

  // Circuit Breaker
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  DATABASE_ENABLE_CIRCUIT_BREAKER?: boolean = false;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(20)
  DATABASE_CIRCUIT_BREAKER_THRESHOLD?: number = 5;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(10000)
  @Max(300000)
  DATABASE_CIRCUIT_BREAKER_TIMEOUT?: number = 60000;

  // ==================== Authentication (Clerk) ====================
  @IsString()
  @IsNotEmpty()
  @Matches(/^pk_(test|live)_/, {
    message: 'CLERK_PUBLISHABLE_KEY must start with pk_test_ or pk_live_',
  })
  CLERK_PUBLISHABLE_KEY: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^sk_(test|live)_/, {
    message: 'CLERK_SECRET_KEY must start with sk_test_ or sk_live_',
  })
  CLERK_SECRET_KEY: string;

  // ==================== Redis Cache (Optional) ====================
  @IsOptional()
  @IsString()
  @Matches(/^redis(s)?:\/\//, {
    message: 'REDIS_URL must be a valid Redis connection string',
  })
  REDIS_URL?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(0)
  @Max(86400)
  CACHE_TTL?: number = 3600;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(0)
  @Max(604800)
  SESSION_TTL?: number = 86400;

  // ==================== Email Service (Postmark - Optional) ====================
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  POSTMARK_API_KEY?: string;

  @IsOptional()
  @IsEmail()
  POSTMARK_FROM_EMAIL?: string;

  @IsOptional()
  @IsEmail()
  POSTMARK_REPLY_TO_EMAIL?: string;

  // ==================== Security Configuration ====================
  @IsString()
  @IsNotEmpty()
  @Length(32, 64)
  @Matches(/^[a-fA-F0-9]+$/, {
    message: 'JWT_SECRET must be a hex string',
  })
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  @IsIn(['1d', '7d', '14d', '30d'])
  JWT_EXPIRES_IN?: string = '7d';

  @IsString()
  @IsNotEmpty()
  @Length(32, 64)
  @Matches(/^[a-fA-F0-9]+$/, {
    message: 'ENCRYPTION_KEY must be a hex string',
  })
  ENCRYPTION_KEY: string;

  @IsOptional()
  @IsString()
  @IsIn(['aes-256-gcm', 'aes-256-cbc', 'aes-128-gcm'])
  ENCRYPTION_ALGORITHM?: string = 'aes-256-gcm';

  // ==================== CORS Configuration ====================
  @IsOptional()
  @IsString()
  ALLOWED_ORIGINS?: string = 'http://localhost:3000,http://localhost:3001';

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  CORS_CREDENTIALS?: boolean = true;

  // ==================== Rate Limiting ====================
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1000)
  @Max(3600000)
  RATE_LIMIT_TTL?: number = 60000;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(1000)
  RATE_LIMIT_MAX?: number = 100;

  // ==================== API Documentation ====================
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  SWAGGER_ENABLED?: boolean = true;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-_/]+$/, {
    message:
      'SWAGGER_PATH must contain only lowercase letters, numbers, hyphens, underscores, and slashes',
  })
  SWAGGER_PATH?: string = '/api/docs';

  @IsOptional()
  @IsString()
  SWAGGER_TITLE?: string = 'Gloria API Documentation';

  @IsOptional()
  @IsString()
  SWAGGER_DESCRIPTION?: string = 'Gloria Backend API';

  // ==================== Development Tools ====================
  @IsOptional()
  @IsEnum(LogLevel)
  LOG_LEVEL?: LogLevel = LogLevel.Info;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  PRETTY_LOGS?: boolean = true;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  ENABLE_DEBUG_MODE?: boolean = false;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  MOCK_EXTERNAL_SERVICES?: boolean = false;

  // ==================== Feature Flags ====================
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  FEATURE_WORKFLOW_ENGINE?: boolean = true;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  FEATURE_NOTIFICATIONS?: boolean = true;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  FEATURE_AUDIT_LOG?: boolean = true;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  FEATURE_PERMISSION_CACHE?: boolean = true;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  FEATURE_EMAIL_VERIFICATION?: boolean = false;

  // ==================== Health Check ====================
  @IsOptional()
  @IsString()
  @Matches(/^\/[a-z0-9-_/]*$/, {
    message: 'HEALTH_CHECK_PATH must be a valid URL path',
  })
  HEALTH_CHECK_PATH?: string = '/health';

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  HEALTH_CHECK_DATABASE?: boolean = true;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  HEALTH_CHECK_REDIS?: boolean = false;

  // ==================== Monitoring (Optional) ====================
  @IsOptional()
  @IsUrl({ protocols: ['https'] })
  SENTRY_DSN?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  APM_ENABLED?: boolean = false;

  @IsOptional()
  @IsString()
  APM_SERVICE_NAME?: string = 'gloria-backend';

  @IsOptional()
  @IsString()
  APM_SECRET_TOKEN?: string;

  // ==================== File Upload Settings ====================
  @IsOptional()
  @IsString()
  @Matches(/^\.?(\/[a-zA-Z0-9._-]+)+\/?$/, {
    message: 'UPLOAD_DIR must be a valid directory path',
  })
  UPLOAD_DIR?: string = './uploads';

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1024)
  @Max(104857600) // Max 100MB
  MAX_FILE_SIZE?: number = 10485760; // 10MB

  @IsOptional()
  @IsString()
  ALLOWED_FILE_TYPES?: string = 'jpg,jpeg,png,pdf,doc,docx,xls,xlsx';

  // ==================== System Limits ====================
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]+(mb|kb|gb)$/, {
    message: 'MAX_REQUEST_SIZE must be a size string (e.g., 50mb)',
  })
  MAX_REQUEST_SIZE?: string = '50mb';

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(5000)
  @Max(300000)
  REQUEST_TIMEOUT?: number = 30000;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(10)
  @Max(10000)
  MAX_CONCURRENT_REQUESTS?: number = 1000;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => {
        const constraints = error.constraints;
        if (constraints) {
          return `${error.property}: ${Object.values(constraints).join(', ')}`;
        }
        return `${error.property}: validation failed`;
      })
      .join('\n');

    throw new Error(`Configuration validation error:\n${errorMessages}`);
  }

  return validatedConfig;
}
