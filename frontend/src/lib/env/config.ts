/**
 * Environment Configuration and Validation
 *
 * This module provides centralized environment configuration with:
 * - Runtime validation
 * - Type safety
 * - Default values
 * - Error handling
 */

import { z } from 'zod';

// --------------------------------------------
// Environment Variable Schema
// --------------------------------------------
const envSchema = z.object({
  // API Configuration
  NEXT_PUBLIC_API_URL: z.string().url().min(1),
  NEXT_PUBLIC_API_TIMEOUT: z.string().transform(Number).pipe(z.number().min(1000).max(120000)).default('30000'),
  NEXT_PUBLIC_API_VERSION: z.string().default('v1'),

  // Clerk Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1).optional(), // Server-side only
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/sign-up'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default('/dashboard'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default('/dashboard'),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  // Application Configuration
  NEXT_PUBLIC_APP_URL: z.string().url().min(1),
  NEXT_PUBLIC_APP_NAME: z.string().default('Gloria System'),
  NEXT_PUBLIC_APP_VERSION: z.string().default('1.0.0'),
  NEXT_PUBLIC_ENV: z.enum(['development', 'staging', 'production']).default('development'),

  // Monitoring & Analytics
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.string().transform((val) => val === 'true').default('false'),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),

  // Feature Flags
  NEXT_PUBLIC_ENABLE_PWA: z.string().transform((val) => val === 'true').default('false'),
  NEXT_PUBLIC_ENABLE_MAINTENANCE_MODE: z.string().transform((val) => val === 'true').default('false'),
  NEXT_PUBLIC_ENABLE_BETA_FEATURES: z.string().transform((val) => val === 'true').default('false'),
  NEXT_PUBLIC_ENABLE_DEBUG_MODE: z.string().transform((val) => val === 'true').default('false'),

  // Security & Session
  SESSION_SECRET: z.string().min(32).optional(),
  SESSION_MAX_AGE: z.string().transform(Number).pipe(z.number().min(0)).default('86400'),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().min(0)).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().min(1)).default('100'),

  // Storage & CDN
  NEXT_PUBLIC_CDN_URL: z.string().url().optional().or(z.literal('')),
  STORAGE_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_BUCKET_NAME: z.string().optional(),
  STORAGE_REGION: z.string().optional(),

  // Redis Configuration
  REDIS_URL: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).pipe(z.number().min(0).max(15)).default('0'),

  // Email Service
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_REPLY_TO: z.string().email().optional(),

  // Localization
  NEXT_PUBLIC_DEFAULT_LOCALE: z.string().default('en'),
  NEXT_PUBLIC_SUPPORTED_LOCALES: z.string().default('en,id'),

  // Development Tools
  ANALYZE: z.string().transform((val) => val === 'true').default('false'),
  VERCEL_URL: z.string().optional(),
  VERCEL_ENV: z.string().optional(),
});

// --------------------------------------------
// Environment Variable Types
// --------------------------------------------
export type EnvConfig = z.infer<typeof envSchema>;

// --------------------------------------------
// Validation Function
// --------------------------------------------
function validateEnv(): EnvConfig {
  try {
    // Parse and validate environment variables
    const env = envSchema.parse(process.env);

    // Additional custom validations
    if (env.NEXT_PUBLIC_ENV === 'production') {
      // Production-specific required fields
      const requiredProdFields = [
        'NEXT_PUBLIC_SENTRY_DSN',
        'SESSION_SECRET',
        'REDIS_URL',
      ] as const;

      for (const field of requiredProdFields) {
        if (!env[field]) {
          throw new Error(`Missing required production environment variable: ${field}`);
        }
      }
    }

    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');

      console.error('❌ Environment validation failed:\n', errorMessage);

      // In development, show detailed error
      if (process.env.NODE_ENV === 'development') {
        throw new Error(`Environment validation failed:\n${errorMessage}`);
      }

      // In production, throw generic error
      throw new Error('Invalid environment configuration');
    }
    throw error;
  }
}

// --------------------------------------------
// Configuration Export
// --------------------------------------------
let cachedConfig: EnvConfig | null = null;

export function getConfig(): EnvConfig {
  if (!cachedConfig) {
    cachedConfig = validateEnv();
  }
  return cachedConfig;
}

// Convenience export for direct access
export const config = (() => {
  try {
    return getConfig();
  } catch (error) {
    // During build time or in environments where env vars might not be fully available
    console.warn('⚠️  Environment configuration not available:', error);
    return {} as EnvConfig;
  }
})();

// --------------------------------------------
// Helper Functions
// --------------------------------------------
export const isDevelopment = () => config.NEXT_PUBLIC_ENV === 'development';
export const isStaging = () => config.NEXT_PUBLIC_ENV === 'staging';
export const isProduction = () => config.NEXT_PUBLIC_ENV === 'production';

export const isDebugMode = () => config.NEXT_PUBLIC_ENABLE_DEBUG_MODE;
export const isMaintenanceMode = () => config.NEXT_PUBLIC_ENABLE_MAINTENANCE_MODE;
export const isBetaFeatures = () => config.NEXT_PUBLIC_ENABLE_BETA_FEATURES;
export const isAnalyticsEnabled = () => config.NEXT_PUBLIC_ENABLE_ANALYTICS;

// Parse CORS origins
export const getCorsOrigins = (): string[] => {
  if (!config.CORS_ALLOWED_ORIGINS) return [];
  return config.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
};

// Parse supported locales
export const getSupportedLocales = (): string[] => {
  if (!config.NEXT_PUBLIC_SUPPORTED_LOCALES) return ['en'];
  return config.NEXT_PUBLIC_SUPPORTED_LOCALES.split(',').map(locale => locale.trim());
};

// --------------------------------------------
// Environment Info for Debugging
// --------------------------------------------
export const getEnvironmentInfo = () => ({
  environment: config.NEXT_PUBLIC_ENV,
  version: config.NEXT_PUBLIC_APP_VERSION,
  apiUrl: config.NEXT_PUBLIC_API_URL,
  debugMode: config.NEXT_PUBLIC_ENABLE_DEBUG_MODE,
  features: {
    pwa: config.NEXT_PUBLIC_ENABLE_PWA,
    analytics: config.NEXT_PUBLIC_ENABLE_ANALYTICS,
    beta: config.NEXT_PUBLIC_ENABLE_BETA_FEATURES,
    maintenance: config.NEXT_PUBLIC_ENABLE_MAINTENANCE_MODE,
  },
});

// Log environment info in development
if (isDevelopment() && isDebugMode()) {
  console.log('🔧 Environment Configuration:', getEnvironmentInfo());
}