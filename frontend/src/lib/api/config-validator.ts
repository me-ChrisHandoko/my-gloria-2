/**
 * API Configuration Validator
 * Validates and ensures proper configuration at runtime
 */

import { apiConfig } from './config';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ConfigValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * Validate the entire API configuration
   */
  public async validateConfiguration(): Promise<ValidationResult> {
    this.errors = [];
    this.warnings = [];

    // Run all validation checks
    await Promise.all([
      this.validateBaseUrl(),
      this.validateApiVersion(),
      this.validateTimeouts(),
      this.validateRetryConfig(),
      this.validateRateLimits(),
      this.validateEnvironment(),
      this.validateConnectivity(),
    ]);

    return {
      valid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings],
    };
  }

  /**
   * Validate base URL configuration
   */
  private async validateBaseUrl(): Promise<void> {
    const config = apiConfig.getConfig();

    // Check if URL is properly formatted
    try {
      const url = new URL(config.baseUrl);

      // Check protocol
      if (apiConfig.isProduction() && url.protocol !== 'https:') {
        this.errors.push('Production API must use HTTPS protocol');
      }

      // Check localhost in production
      if (apiConfig.isProduction() && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
        this.errors.push('Production API cannot use localhost');
      }

      // Warn about using HTTP in non-production
      if (!apiConfig.isProduction() && url.protocol === 'http:' && url.hostname !== 'localhost') {
        this.warnings.push('Consider using HTTPS even in non-production environments');
      }
    } catch (error) {
      this.errors.push(`Invalid base URL: ${config.baseUrl}`);
    }
  }

  /**
   * Validate API version format
   */
  private async validateApiVersion(): Promise<void> {
    const config = apiConfig.getConfig();

    if (!config.apiVersion.match(/^v\d+$/)) {
      this.errors.push(`Invalid API version format: ${config.apiVersion}. Expected format: v1, v2, etc.`);
    }
  }

  /**
   * Validate timeout configurations
   */
  private async validateTimeouts(): Promise<void> {
    const config = apiConfig.getConfig();

    if (config.timeout < 1000) {
      this.errors.push('Timeout must be at least 1000ms (1 second)');
    }

    if (config.timeout > 120000) {
      this.warnings.push('Timeout exceeds 2 minutes, which may lead to poor user experience');
    }

    // Check specific operation timeouts
    const uploadTimeout = apiConfig.getTimeout('upload');
    if (uploadTimeout < 5000) {
      this.warnings.push('Upload timeout may be too short for large files');
    }
  }

  /**
   * Validate retry configuration
   */
  private async validateRetryConfig(): Promise<void> {
    const config = apiConfig.getConfig();
    const retryConfig = apiConfig.getRetryConfig();

    if (config.retryAttempts < 0 || config.retryAttempts > 5) {
      this.errors.push('Retry attempts must be between 0 and 5');
    }

    if (config.retryDelay < 100) {
      this.errors.push('Retry delay must be at least 100ms');
    }

    if (retryConfig.maxDelay > 30000) {
      this.warnings.push('Maximum retry delay exceeds 30 seconds');
    }

    // Check exponential backoff
    const maxPossibleDelay = config.retryDelay * Math.pow(retryConfig.factor, config.retryAttempts);
    if (maxPossibleDelay > 60000) {
      this.warnings.push('Exponential backoff may result in delays over 1 minute');
    }
  }

  /**
   * Validate rate limit configuration
   */
  private async validateRateLimits(): Promise<void> {
    const config = apiConfig.getConfig();
    const rateLimitConfig = apiConfig.getRateLimitConfig();

    if (config.rateLimitPerMinute < 10) {
      this.errors.push('Rate limit per minute must be at least 10');
    }

    if (rateLimitConfig.burstSize > config.rateLimitPerMinute) {
      this.warnings.push('Burst size exceeds rate limit per minute');
    }

    // Check production rate limits
    if (apiConfig.isProduction() && config.rateLimitPerMinute < 100) {
      this.warnings.push('Production rate limit may be too restrictive');
    }
  }

  /**
   * Validate environment configuration
   */
  private async validateEnvironment(): Promise<void> {
    const environment = apiConfig.getEnvironment();
    const config = apiConfig.getConfig();

    // Check for development settings in production
    if (apiConfig.isProduction()) {
      if (config.enableLogging) {
        this.warnings.push('Logging is enabled in production, may impact performance');
      }

      if (config.enableMocking) {
        this.errors.push('Mocking must be disabled in production');
      }

      if (!config.enableMetrics) {
        this.warnings.push('Metrics are disabled in production, consider enabling for monitoring');
      }
    }

    // Check test environment
    if (apiConfig.isTest()) {
      if (config.retryAttempts > 0) {
        this.warnings.push('Retry attempts should be 0 in test environment');
      }

      if (!config.enableMocking) {
        this.warnings.push('Consider enabling mocking in test environment');
      }
    }

    // Validate environment variables
    if (process.env.NEXT_PUBLIC_ENVIRONMENT && !['development', 'staging', 'production', 'test'].includes(process.env.NEXT_PUBLIC_ENVIRONMENT)) {
      this.errors.push(`Invalid environment: ${process.env.NEXT_PUBLIC_ENVIRONMENT}`);
    }
  }

  /**
   * Validate API connectivity
   */
  private async validateConnectivity(): Promise<void> {
    const healthConfig = apiConfig.getHealthCheckConfig();

    if (!healthConfig.enabled) {
      this.warnings.push('Health check is disabled, API connectivity will not be monitored');
      return;
    }

    try {
      // Attempt to reach the health endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), healthConfig.timeout);

      const response = await fetch(healthConfig.endpoint, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.warnings.push(`Health check endpoint returned status ${response.status}`);
      }
    } catch (error) {
      // Don't treat connectivity issues as errors in development
      if (apiConfig.isProduction()) {
        this.errors.push(`Cannot reach API health endpoint: ${healthConfig.endpoint}`);
      } else {
        this.warnings.push(`Cannot reach API health endpoint: ${healthConfig.endpoint}`);
      }
    }
  }

  /**
   * Validate CORS configuration
   */
  public validateCorsConfig(): ValidationResult {
    const corsConfig = apiConfig.getCorsConfig();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check credentials setting
    if (corsConfig.credentials === 'include' && !apiConfig.getConfig().baseUrl.startsWith('https') && apiConfig.isProduction()) {
      errors.push('Credentials require HTTPS in production');
    }

    // Check required headers
    const requiredHeaders = ['Content-Type', 'Accept'];
    const configHeaders = Object.keys(corsConfig.headers);

    for (const header of requiredHeaders) {
      if (!configHeaders.includes(header)) {
        errors.push(`Missing required CORS header: ${header}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate security headers
   */
  public validateSecurityHeaders(): ValidationResult {
    const securityHeaders = apiConfig.getSecurityHeaders();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required security headers in production
    if (apiConfig.isProduction()) {
      const requiredHeaders = [
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection',
        'Strict-Transport-Security',
      ];

      for (const header of requiredHeaders) {
        if (!securityHeaders[header]) {
          errors.push(`Missing required security header in production: ${header}`);
        }
      }
    }

    // Validate HSTS settings
    if (securityHeaders['Strict-Transport-Security']) {
      const hstsValue = securityHeaders['Strict-Transport-Security'];
      const maxAge = hstsValue.match(/max-age=(\d+)/)?.[1];

      if (maxAge && parseInt(maxAge) < 31536000) {
        warnings.push('HSTS max-age should be at least 1 year (31536000 seconds)');
      }

      if (!hstsValue.includes('includeSubDomains')) {
        warnings.push('Consider adding includeSubDomains to HSTS header');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate cache configuration
   */
  public validateCacheConfig(): ValidationResult {
    const cacheConfig = apiConfig.getCacheConfig();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check cache size
    if (cacheConfig.maxSize > 100 * 1024 * 1024) {
      warnings.push('Cache size exceeds 100MB, may impact memory usage');
    }

    if (cacheConfig.maxSize < 1024 * 1024) {
      warnings.push('Cache size less than 1MB may not be effective');
    }

    // Check TTL values
    if (cacheConfig.defaultTTL < 1000) {
      errors.push('Default TTL must be at least 1 second');
    }

    if (cacheConfig.defaultTTL > 3600000) {
      warnings.push('Default TTL exceeds 1 hour, cached data may become stale');
    }

    // Validate cache strategies
    const validStrategies = ['networkFirst', 'cacheFirst', 'staleWhileRevalidate', 'networkOnly'];
    const configuredStrategies = Object.keys(cacheConfig.strategies);

    for (const strategy of configuredStrategies) {
      if (!validStrategies.includes(strategy)) {
        errors.push(`Invalid cache strategy: ${strategy}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Run all validations and generate a report
   */
  public async generateValidationReport(): Promise<string> {
    const mainValidation = await this.validateConfiguration();
    const corsValidation = this.validateCorsConfig();
    const securityValidation = this.validateSecurityHeaders();
    const cacheValidation = this.validateCacheConfig();

    const report = {
      timestamp: new Date().toISOString(),
      environment: apiConfig.getEnvironment(),
      baseUrl: apiConfig.getBaseUrl(),
      validations: {
        main: mainValidation,
        cors: corsValidation,
        security: securityValidation,
        cache: cacheValidation,
      },
      summary: {
        totalErrors:
          mainValidation.errors.length +
          corsValidation.errors.length +
          securityValidation.errors.length +
          cacheValidation.errors.length,
        totalWarnings:
          mainValidation.warnings.length +
          corsValidation.warnings.length +
          securityValidation.warnings.length +
          cacheValidation.warnings.length,
        valid:
          mainValidation.valid &&
          corsValidation.valid &&
          securityValidation.valid &&
          cacheValidation.valid,
      },
    };

    return JSON.stringify(report, null, 2);
  }
}

// Create singleton instance
export const configValidator = new ConfigValidator();

// Convenience export for validation
export async function validateApiConfiguration(): Promise<ValidationResult> {
  return configValidator.validateConfiguration();
}

// Auto-validate in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  configValidator.validateConfiguration().then((result) => {
    if (!result.valid) {
      console.error('API Configuration Validation Failed:', result.errors);
    }
    if (result.warnings.length > 0) {
      console.warn('API Configuration Warnings:', result.warnings);
    }
  });
}