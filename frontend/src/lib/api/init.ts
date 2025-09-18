/**
 * API Initialization Module
 * Sets up API configuration, validation, and monitoring on app startup
 */

import { apiConfig } from './config';
import { configValidator } from './config-validator';
import { healthMonitor } from './health-monitor';
import apiClient from './client';

export interface InitializationOptions {
  validateConfig?: boolean;
  startHealthMonitoring?: boolean;
  logConfiguration?: boolean;
  strictMode?: boolean;
}

export interface InitializationResult {
  success: boolean;
  environment: string;
  baseUrl: string;
  errors: string[];
  warnings: string[];
}

/**
 * Initialize API configuration and services
 */
export async function initializeApi(
  options: InitializationOptions = {}
): Promise<InitializationResult> {
  const {
    validateConfig = true,
    startHealthMonitoring = true,
    logConfiguration = false,
    strictMode = false,
  } = options;

  const result: InitializationResult = {
    success: true,
    environment: apiConfig.getEnvironment(),
    baseUrl: apiConfig.getBaseUrl(),
    errors: [],
    warnings: [],
  };

  try {
    // Log configuration if requested
    if (logConfiguration) {
      console.group('🚀 API Configuration');
      console.log('Environment:', result.environment);
      console.log('Base URL:', result.baseUrl);
      console.log('Features:', apiConfig.getFeatureFlags());
      console.log('Retry Config:', apiConfig.getRetryConfig());
      console.log('Rate Limits:', apiConfig.getRateLimitConfig());
      console.groupEnd();
    }

    // Validate configuration
    if (validateConfig) {
      console.log('🔍 Validating API configuration...');
      const validation = await configValidator.validateConfiguration();

      result.errors = [...validation.errors];
      result.warnings = [...validation.warnings];

      if (!validation.valid) {
        console.error('❌ API configuration validation failed:', validation.errors);

        if (strictMode) {
          result.success = false;
          throw new Error('API configuration validation failed in strict mode');
        }
      } else {
        console.log('✅ API configuration is valid');
      }

      if (validation.warnings.length > 0) {
        console.warn('⚠️ API configuration warnings:', validation.warnings);
      }
    }

    // Start health monitoring
    if (startHealthMonitoring && !apiConfig.isTest()) {
      console.log('🏥 Starting API health monitoring...');
      healthMonitor.start();

      // Subscribe to health status changes
      healthMonitor.subscribe((status) => {
        if (status.status === 'unhealthy') {
          console.error('🚨 API is unhealthy:', status);
          // You could trigger additional actions here:
          // - Show user notification
          // - Switch to offline mode
          // - Use fallback API
        } else if (status.status === 'degraded') {
          console.warn('⚠️ API performance is degraded:', status);
        }
      });

      // Perform initial health check
      const healthCheck = await healthMonitor.performHealthCheck();
      if (!healthCheck.success) {
        result.warnings.push('Initial API health check failed');
        console.warn('⚠️ Initial API health check failed');
      } else {
        console.log('✅ API is healthy');
      }
    }

    // Initialize API client with proper auth token handling
    if (typeof window !== 'undefined') {
      // Set up periodic token refresh if Clerk is available
      // This will be called from the app's auth provider
      console.log('✅ API client initialized');
    }

    // Log summary
    if (result.success) {
      console.log(
        `✨ API initialized successfully in ${result.environment} mode`
      );
    }
  } catch (error) {
    console.error('💥 Failed to initialize API:', error);
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}

/**
 * Shutdown API services gracefully
 */
export function shutdownApi(): void {
  console.log('🛑 Shutting down API services...');

  // Stop health monitoring
  healthMonitor.stop();

  // Cancel all pending requests
  apiClient.cancelAllRequests();

  console.log('✅ API services shut down');
}

/**
 * Reset API configuration to defaults
 */
export function resetApiConfiguration(): void {
  console.log('🔄 Resetting API configuration...');

  // Reset configuration
  apiConfig.reset();

  // Reset health monitor
  healthMonitor.reset();

  console.log('✅ API configuration reset');
}

/**
 * Get API initialization status
 */
export function getApiStatus() {
  return {
    environment: apiConfig.getEnvironment(),
    baseUrl: apiConfig.getBaseUrl(),
    isHealthy: healthMonitor.isHealthy(),
    isAvailable: healthMonitor.isAvailable(),
    healthStatus: healthMonitor.getStatus(),
    features: apiConfig.getFeatureFlags(),
  };
}

/**
 * Debug helper to export all API configuration
 */
export function exportApiDebugInfo(): string {
  const debugInfo = {
    configuration: apiConfig.exportConfig(),
    health: healthMonitor.exportHealthData(),
    validation: configValidator.generateValidationReport(),
    timestamp: new Date().toISOString(),
  };

  return JSON.stringify(debugInfo, null, 2);
}

// Auto-initialize in browser environment (non-test)
if (typeof window !== 'undefined' && !apiConfig.isTest()) {
  // Only auto-initialize in development with validation
  if (apiConfig.isDevelopment()) {
    initializeApi({
      validateConfig: true,
      startHealthMonitoring: true,
      logConfiguration: true,
      strictMode: false,
    }).catch((error) => {
      console.error('Failed to auto-initialize API:', error);
    });
  } else {
    // In production, initialize with less verbose output
    initializeApi({
      validateConfig: false,
      startHealthMonitoring: true,
      logConfiguration: false,
      strictMode: false,
    }).catch((error) => {
      console.error('Failed to auto-initialize API:', error);
    });
  }

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    shutdownApi();
  });
}

// Export convenience functions
export { apiConfig, healthMonitor, configValidator };
export { isApiHealthy, isApiAvailable } from './health-monitor';
export { getApiConfig, getApiBaseUrl, getApiEndpoints } from './config';