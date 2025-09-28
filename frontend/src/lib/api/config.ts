/**
 * Production-ready API Configuration Module
 * Handles environment-specific configurations with validation and type safety
 */

import { z } from 'zod';

// Environment types
export type Environment = 'development' | 'staging' | 'production' | 'test';

// Configuration schema for validation
const ApiConfigSchema = z.object({
  baseUrl: z.string().url(),
  apiVersion: z.string().regex(/^v\d+$/),
  timeout: z.number().positive().max(120000), // Max 2 minutes
  retryAttempts: z.number().min(0).max(5),
  retryDelay: z.number().min(100).max(30000),
  enableMocking: z.boolean(),
  enableLogging: z.boolean(),
  enableMetrics: z.boolean(),
  rateLimitPerMinute: z.number().positive(),
  healthCheckInterval: z.number().positive(),
});

export type ApiConfig = z.infer<typeof ApiConfigSchema>;

// Environment detection
export function detectEnvironment(): Environment {
  if (process.env.NODE_ENV === 'test') return 'test';
  if (process.env.NEXT_PUBLIC_ENVIRONMENT) {
    return process.env.NEXT_PUBLIC_ENVIRONMENT as Environment;
  }

  // Fallback to domain-based detection
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'development';
    if (hostname.includes('staging') || hostname.includes('stg')) return 'staging';
    if (hostname.includes('gloria') || hostname.includes('prod')) return 'production';
  }

  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

// Environment-specific configurations
const configs: Record<Environment, ApiConfig> = {
  development: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    apiVersion: 'v1',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    enableMocking: process.env.NEXT_PUBLIC_ENABLE_MOCKING === 'true',
    enableLogging: true,
    enableMetrics: true,
    rateLimitPerMinute: 100,
    healthCheckInterval: 60000, // 1 minute
  },
  staging: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://staging-api.gloria.id',
    apiVersion: 'v1',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    enableMocking: false,
    enableLogging: true,
    enableMetrics: true,
    rateLimitPerMinute: 200,
    healthCheckInterval: 300000, // 5 minutes
  },
  production: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api.gloria.id',
    apiVersion: 'v1',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    enableMocking: false,
    enableLogging: false,
    enableMetrics: true,
    rateLimitPerMinute: 500,
    healthCheckInterval: 600000, // 10 minutes
  },
  test: {
    baseUrl: 'http://localhost:3001',
    apiVersion: 'v1',
    timeout: 5000,
    retryAttempts: 0,
    retryDelay: 0,
    enableMocking: true,
    enableLogging: false,
    enableMetrics: false,
    rateLimitPerMinute: 1000,
    healthCheckInterval: 0,
  },
};

// Configuration validation
function validateConfig(config: ApiConfig): ApiConfig {
  try {
    return ApiConfigSchema.parse(config);
  } catch (error) {
    console.error('Invalid API configuration:', error);
    throw new Error('API configuration validation failed');
  }
}

// Configuration class with singleton pattern
class ApiConfiguration {
  private static instance: ApiConfiguration;
  private config: ApiConfig;
  private environment: Environment;
  private overrides: Partial<ApiConfig> = {};

  private constructor() {
    this.environment = detectEnvironment();
    this.config = this.loadConfiguration();
  }

  public static getInstance(): ApiConfiguration {
    if (!ApiConfiguration.instance) {
      ApiConfiguration.instance = new ApiConfiguration();
    }
    return ApiConfiguration.instance;
  }

  private loadConfiguration(): ApiConfig {
    const baseConfig = configs[this.environment];
    const mergedConfig = { ...baseConfig, ...this.overrides };
    return validateConfig(mergedConfig);
  }

  public getConfig(): ApiConfig {
    return { ...this.config };
  }

  public getEnvironment(): Environment {
    return this.environment;
  }

  public getBaseUrl(): string {
    return `${this.config.baseUrl}/api/${this.config.apiVersion}`;
  }

  public getDocumentationUrl(): string {
    return `${this.config.baseUrl}/api/docs`;
  }

  public override(overrides: Partial<ApiConfig>): void {
    this.overrides = { ...this.overrides, ...overrides };
    this.config = this.loadConfiguration();
  }

  public reset(): void {
    this.overrides = {};
    this.config = this.loadConfiguration();
  }

  public isProduction(): boolean {
    return this.environment === 'production';
  }

  public isDevelopment(): boolean {
    return this.environment === 'development';
  }

  public isStaging(): boolean {
    return this.environment === 'staging';
  }

  public isTest(): boolean {
    return this.environment === 'test';
  }

  // Feature flags based on environment
  public getFeatureFlags() {
    return {
      enableDebugMode: !this.isProduction(),
      enableMockData: this.config.enableMocking,
      enableDetailedErrors: !this.isProduction(),
      enableRequestLogging: this.config.enableLogging,
      enablePerformanceMetrics: this.config.enableMetrics,
      enableOfflineMode: this.isDevelopment(),
      enableExperimentalFeatures: this.isDevelopment() || this.isStaging(),
    };
  }

  // Get specific timeout for different operations
  public getTimeout(operation: 'default' | 'upload' | 'download' | 'longPoll' = 'default'): number {
    const timeouts = {
      default: this.config.timeout,
      upload: this.config.timeout * 2,
      download: this.config.timeout * 2,
      longPoll: this.config.timeout * 4,
    };
    return timeouts[operation];
  }

  // Rate limiting configuration
  public getRateLimitConfig() {
    return {
      maxRequestsPerMinute: this.config.rateLimitPerMinute,
      maxRequestsPerSecond: Math.ceil(this.config.rateLimitPerMinute / 60),
      burstSize: Math.ceil(this.config.rateLimitPerMinute / 10),
    };
  }

  // Retry configuration with exponential backoff
  public getRetryConfig() {
    return {
      enabled: !this.isTest(),
      maxAttempts: this.config.retryAttempts,
      baseDelay: this.config.retryDelay,
      maxDelay: this.config.retryDelay * Math.pow(2, this.config.retryAttempts),
      factor: 2,
      retryableStatuses: [408, 429, 500, 502, 503, 504],
      retryableErrors: ['ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'],
    };
  }

  // CORS configuration
  public getCorsConfig() {
    return {
      credentials: 'include' as RequestCredentials,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    };
  }

  // Security headers
  public getSecurityHeaders() {
    const headers: Record<string, string> = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    };

    if (this.isProduction()) {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    }

    return headers;
  }

  // API endpoints configuration
  public getEndpoints() {
    const base = this.getBaseUrl();
    return {
      auth: {
        login: `${base}/auth/login`,
        logout: `${base}/auth/logout`,
        refresh: `${base}/auth/refresh`,
        me: `${base}/auth/me`,
        health: `${base}/auth/health`,
      },
      users: {
        base: `${base}/users`,
        byId: (id: string) => `${base}/users/${id}`,
        me: `${base}/users/me`,
        byNip: (nip: string) => `${base}/users/by-nip/${nip}`,
        stats: `${base}/users/stats`,
      },
      organizations: {
        schools: `${base}/schools`,
        departments: `${base}/departments`,
        positions: `${base}/positions`,
      },
      permissions: {
        permissions: `${base}/permissions`,
        roles: `${base}/roles`,
        moduleAccess: `${base}/module-access`,
      },
      workflows: {
        workflows: `${base}/workflows`,
        templates: `${base}/workflow-templates`,
        instances: `${base}/workflow-instances`,
      },
      notifications: {
        notifications: `${base}/notifications`,
        preferences: `${base}/notification-preferences`,
        templates: `${base}/notification-templates`,
      },
      audit: {
        logs: `${base}/audit`,
        export: `${base}/audit/export`,
      },
      system: {
        featureFlags: `${base}/feature-flags`,
        config: `${base}/system-config`,
        health: `${base}/health`,
        status: `${base}/status`,
      },
    };
  }

  // Monitoring configuration
  public getMonitoringConfig() {
    return {
      enabled: this.config.enableMetrics,
      samplingRate: this.isProduction() ? 0.1 : 1, // 10% in production, 100% otherwise
      errorReporting: {
        enabled: true,
        includeUserContext: !this.isProduction(),
        includeRequestBody: !this.isProduction(),
      },
      performance: {
        enabled: this.config.enableMetrics,
        slowRequestThreshold: 3000, // 3 seconds
        criticalRequestThreshold: 10000, // 10 seconds
      },
    };
  }

  // Cache configuration
  public getCacheConfig() {
    return {
      enabled: !this.isTest(),
      defaultTTL: this.isProduction() ? 300000 : 60000, // 5 min in prod, 1 min otherwise
      maxSize: 50 * 1024 * 1024, // 50MB
      strategies: {
        networkFirst: ['auth', 'users/me'],
        cacheFirst: ['system-config', 'feature-flags'],
        staleWhileRevalidate: ['users', 'organizations'],
        networkOnly: ['notifications', 'audit'],
      },
    };
  }

  // WebSocket configuration
  public getWebSocketConfig() {
    const wsProtocol = this.config.baseUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = this.config.baseUrl.replace(/^https?:\/\//, '');

    return {
      url: `${wsProtocol}://${wsHost}/ws`,
      reconnect: true,
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      messageTimeout: 5000,
    };
  }


  // Health check configuration
  public getHealthCheckConfig() {
    return {
      enabled: this.config.healthCheckInterval > 0,
      interval: this.config.healthCheckInterval,
      timeout: 5000,
      endpoint: `${this.getBaseUrl()}/health`,
      retryOnFailure: true,
      maxConsecutiveFailures: 3,
    };
  }

  // Export configuration for debugging
  public exportConfig(): string {
    return JSON.stringify({
      environment: this.environment,
      config: this.config,
      endpoints: this.getEndpoints(),
      features: this.getFeatureFlags(),
    }, null, 2);
  }
}

// Export singleton instance
export const apiConfig = ApiConfiguration.getInstance();

// Export types and utilities
export type { ApiConfiguration };

// Convenience exports
export const getApiConfig = () => apiConfig.getConfig();
export const getApiBaseUrl = () => apiConfig.getBaseUrl();
export const getApiEndpoints = () => apiConfig.getEndpoints();
export const getApiEnvironment = () => apiConfig.getEnvironment();
export const isProduction = () => apiConfig.isProduction();
export const isDevelopment = () => apiConfig.isDevelopment();