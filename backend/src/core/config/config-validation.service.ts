import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Joi from 'joi';

/**
 * Configuration Validation Service
 * Validates environment variables and configuration at application startup
 * Ensures all required configuration is present and valid
 */
@Injectable()
export class ConfigValidationService {
  private readonly logger = new Logger(ConfigValidationService.name);

  /**
   * Configuration schema for validation
   */
  private readonly configSchema = Joi.object({
    // Core Configuration
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test', 'staging')
      .default('development'),
    PORT: Joi.number().port().default(3001),

    // API Configuration
    API_PREFIX: Joi.string().default('api'),
    API_VERSION: Joi.string().default('v1'),

    // Database Configuration
    DATABASE_URL: Joi.string()
      .uri({ scheme: ['postgresql', 'postgres'] })
      .required()
      .description('PostgreSQL connection string'),

    // Authentication (Clerk)
    CLERK_SECRET_KEY: Joi.string()
      .required()
      .pattern(/^sk_(test|live)_/)
      .description('Clerk secret key for authentication'),
    CLERK_WEBHOOK_SECRET: Joi.string()
      .optional()
      .description('Clerk webhook signing secret'),

    // Email Service (Postmark)
    POSTMARK_API_KEY: Joi.string()
      .optional()
      .description('Postmark API key for email service'),
    POSTMARK_FROM_EMAIL: Joi.string()
      .email()
      .optional()
      .description('Default from email address'),

    // Redis Configuration
    REDIS_URL: Joi.string()
      .uri({ scheme: ['redis', 'rediss'] })
      .optional()
      .description('Redis connection URL for caching'),

    // Security Configuration
    JWT_SECRET: Joi.string()
      .min(32)
      .optional()
      .description('JWT secret for token generation'),
    ENCRYPTION_KEY: Joi.string()
      .min(32)
      .optional()
      .description('Encryption key for sensitive data'),

    // CORS Configuration
    CORS_ORIGINS: Joi.string()
      .optional()
      .default('http://localhost:3000')
      .description('Comma-separated list of allowed origins'),

    // Rate Limiting
    RATE_LIMIT_ENABLED: Joi.boolean().default(true),
    RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

    // File Upload
    UPLOAD_DIR: Joi.string()
      .default('./uploads')
      .description('Directory for file uploads'),
    MAX_FILE_SIZE: Joi.number()
      .default(10 * 1024 * 1024) // 10MB
      .description('Maximum file size in bytes'),

    // Monitoring
    SENTRY_DSN: Joi.string()
      .uri({ scheme: ['https'] })
      .optional()
      .description('Sentry DSN for error tracking'),
    LOG_LEVEL: Joi.string()
      .valid('error', 'warn', 'info', 'debug', 'verbose')
      .default('info'),

    // Feature Flags
    ENABLE_SWAGGER: Joi.boolean().default(true),
    ENABLE_METRICS: Joi.boolean().default(true),
    ENABLE_HEALTH_CHECK: Joi.boolean().default(true),
    ENABLE_AUDIT_LOG: Joi.boolean().default(true),
  });

  constructor(private readonly configService: ConfigService) {}

  /**
   * Validates all configuration at startup
   * @throws {Error} If configuration is invalid
   */
  validateConfig(): void {
    this.logger.log('Starting configuration validation...');

    const config = this.getCurrentConfig();
    const validationResult = this.configSchema.validate(config, {
      abortEarly: false,
      allowUnknown: true,
    });

    if (validationResult.error) {
      const errors = validationResult.error.details
        .map((detail) => `  - ${detail.path.join('.')}: ${detail.message}`)
        .join('\n');

      this.logger.error(`Configuration validation failed:\n${errors}`);
      throw new Error(`Configuration validation failed:\n${errors}`);
    }

    this.logger.log('✅ Configuration validation successful');
    this.logConfigurationSummary(validationResult.value);
  }

  /**
   * Validates a specific configuration key
   * @param key Configuration key to validate
   * @returns Validation result
   */
  validateKey(key: string): { valid: boolean; error?: string } {
    const value = this.configService.get(key);
    const schema = this.getSchemaForKey(key);

    if (!schema) {
      return { valid: true }; // Unknown keys are allowed
    }

    const result = schema.validate(value);

    if (result.error) {
      return {
        valid: false,
        error: result.error.details[0].message,
      };
    }

    return { valid: true };
  }

  /**
   * Gets all required configuration keys
   * @returns Array of required configuration keys
   */
  getRequiredKeys(): string[] {
    const requiredKeys: string[] = [];
    const schemaDescription = this.configSchema.describe();

    Object.entries(schemaDescription.keys).forEach(
      ([key, schema]: [string, any]) => {
        if (schema.flags && schema.flags.presence === 'required') {
          requiredKeys.push(key);
        }
      },
    );

    return requiredKeys;
  }

  /**
   * Gets all missing required configuration keys
   * @returns Array of missing configuration keys
   */
  getMissingKeys(): string[] {
    const requiredKeys = this.getRequiredKeys();
    const missingKeys: string[] = [];

    requiredKeys.forEach((key) => {
      if (!this.configService.get(key)) {
        missingKeys.push(key);
      }
    });

    return missingKeys;
  }

  /**
   * Checks if all required configuration is present
   * @returns True if all required configuration is present
   */
  isConfigComplete(): boolean {
    return this.getMissingKeys().length === 0;
  }

  /**
   * Gets configuration health status
   * @returns Configuration health status
   */
  getHealthStatus(): {
    healthy: boolean;
    required: number;
    missing: number;
    warnings: string[];
  } {
    const missingKeys = this.getMissingKeys();
    const warnings: string[] = [];

    // Check for development values in production
    if (this.configService.get('NODE_ENV') === 'production') {
      if (this.configService.get('CLERK_SECRET_KEY')?.startsWith('sk_test_')) {
        warnings.push('Using test Clerk key in production');
      }
      if (!this.configService.get('SENTRY_DSN')) {
        warnings.push('Sentry error tracking not configured for production');
      }
      if (!this.configService.get('REDIS_URL')) {
        warnings.push('Redis caching not configured for production');
      }
    }

    return {
      healthy: missingKeys.length === 0,
      required: this.getRequiredKeys().length,
      missing: missingKeys.length,
      warnings,
    };
  }

  /**
   * Exports current configuration (sanitized)
   * @returns Sanitized configuration object
   */
  exportConfig(): Record<string, any> {
    const config = this.getCurrentConfig();
    const sanitized: Record<string, any> = {};

    Object.keys(config).forEach((key) => {
      if (this.isSensitiveKey(key)) {
        sanitized[key] = this.maskSensitiveValue(config[key]);
      } else {
        sanitized[key] = config[key];
      }
    });

    return sanitized;
  }

  /**
   * Gets current configuration from environment
   * @returns Current configuration object
   */
  private getCurrentConfig(): Record<string, any> {
    const config: Record<string, any> = {};

    // Get all keys from schema
    const schemaKeys = Object.keys(this.configSchema.describe().keys);

    schemaKeys.forEach((key) => {
      const value = process.env[key] || this.configService.get(key);
      if (value !== undefined) {
        config[key] = value;
      }
    });

    return config;
  }

  /**
   * Gets schema for a specific key
   * @param key Configuration key
   * @returns Joi schema for the key
   */
  private getSchemaForKey(key: string): Joi.Schema | undefined {
    const schemaDescription = this.configSchema.describe();
    return schemaDescription.keys[key]
      ? Joi.object({ [key]: schemaDescription.keys[key] }).extract(key)
      : undefined;
  }

  /**
   * Checks if a key contains sensitive data
   * @param key Configuration key
   * @returns True if key contains sensitive data
   */
  private isSensitiveKey(key: string): boolean {
    const sensitivePatterns = [
      'SECRET',
      'KEY',
      'PASSWORD',
      'TOKEN',
      'DSN',
      'DATABASE_URL',
      'REDIS_URL',
    ];

    return sensitivePatterns.some((pattern) =>
      key.toUpperCase().includes(pattern),
    );
  }

  /**
   * Masks sensitive value for display
   * @param value Sensitive value
   * @returns Masked value
   */
  private maskSensitiveValue(value: any): string {
    if (!value) return 'not set';

    const str = String(value);
    if (str.length <= 8) {
      return '***';
    }

    return `${str.slice(0, 4)}...${str.slice(-4)}`;
  }

  /**
   * Logs configuration summary
   * @param config Validated configuration
   */
  private logConfigurationSummary(config: Record<string, any>): void {
    this.logger.log('Configuration Summary:');
    this.logger.log(`  Environment: ${config.NODE_ENV}`);
    this.logger.log(`  Port: ${config.PORT}`);
    this.logger.log(`  API: ${config.API_PREFIX}/${config.API_VERSION}`);
    this.logger.log(
      `  Database: ${this.maskSensitiveValue(config.DATABASE_URL)}`,
    );
    this.logger.log(
      `  Clerk: ${config.CLERK_SECRET_KEY ? 'Configured' : 'Not configured'}`,
    );
    this.logger.log(
      `  Email: ${config.POSTMARK_API_KEY ? 'Configured' : 'Not configured'}`,
    );
    this.logger.log(
      `  Redis: ${config.REDIS_URL ? 'Configured' : 'Not configured'}`,
    );
    this.logger.log(
      `  Monitoring: ${config.SENTRY_DSN ? 'Configured' : 'Not configured'}`,
    );
  }
}
