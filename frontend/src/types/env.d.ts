/**
 * Environment Variable Type Definitions
 *
 * This file provides TypeScript type definitions for environment variables
 * to ensure type safety throughout the application.
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // --------------------------------------------
      // API Configuration
      // --------------------------------------------
      NEXT_PUBLIC_API_URL: string;
      NEXT_PUBLIC_API_TIMEOUT?: string;
      NEXT_PUBLIC_API_VERSION?: string;

      // --------------------------------------------
      // Clerk Authentication
      // --------------------------------------------
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
      CLERK_SECRET_KEY?: string;
      NEXT_PUBLIC_CLERK_SIGN_IN_URL?: string;
      NEXT_PUBLIC_CLERK_SIGN_UP_URL?: string;
      NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL?: string;
      NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL?: string;
      CLERK_WEBHOOK_SECRET?: string;

      // --------------------------------------------
      // Application Configuration
      // --------------------------------------------
      NEXT_PUBLIC_APP_URL: string;
      NEXT_PUBLIC_APP_NAME?: string;
      NEXT_PUBLIC_APP_VERSION?: string;
      NEXT_PUBLIC_ENV?: 'development' | 'staging' | 'production';

      // --------------------------------------------
      // Monitoring & Analytics
      // --------------------------------------------
      NEXT_PUBLIC_SENTRY_DSN?: string;
      NEXT_PUBLIC_ENABLE_ANALYTICS?: string;
      NEXT_PUBLIC_GA_MEASUREMENT_ID?: string;
      NEXT_PUBLIC_POSTHOG_KEY?: string;
      NEXT_PUBLIC_POSTHOG_HOST?: string;

      // --------------------------------------------
      // Feature Flags
      // --------------------------------------------
      NEXT_PUBLIC_ENABLE_PWA?: string;
      NEXT_PUBLIC_ENABLE_MAINTENANCE_MODE?: string;
      NEXT_PUBLIC_ENABLE_BETA_FEATURES?: string;
      NEXT_PUBLIC_ENABLE_DEBUG_MODE?: string;

      // --------------------------------------------
      // Security & Session
      // --------------------------------------------
      SESSION_SECRET?: string;
      SESSION_MAX_AGE?: string;
      CORS_ALLOWED_ORIGINS?: string;
      RATE_LIMIT_WINDOW_MS?: string;
      RATE_LIMIT_MAX_REQUESTS?: string;

      // --------------------------------------------
      // Storage & CDN
      // --------------------------------------------
      NEXT_PUBLIC_CDN_URL?: string;
      STORAGE_ACCESS_KEY_ID?: string;
      STORAGE_SECRET_ACCESS_KEY?: string;
      STORAGE_BUCKET_NAME?: string;
      STORAGE_REGION?: string;

      // --------------------------------------------
      // Redis Configuration
      // --------------------------------------------
      REDIS_URL?: string;
      REDIS_PASSWORD?: string;
      REDIS_DB?: string;

      // --------------------------------------------
      // Database (if direct connection needed)
      // --------------------------------------------
      DATABASE_URL?: string;

      // --------------------------------------------
      // Email Service
      // --------------------------------------------
      EMAIL_FROM?: string;
      EMAIL_REPLY_TO?: string;

      // --------------------------------------------
      // Localization
      // --------------------------------------------
      NEXT_PUBLIC_DEFAULT_LOCALE?: string;
      NEXT_PUBLIC_SUPPORTED_LOCALES?: string;

      // --------------------------------------------
      // Development Tools
      // --------------------------------------------
      ANALYZE?: string;
      VERCEL_URL?: string;
      VERCEL_ENV?: string;

      // --------------------------------------------
      // Node.js Environment
      // --------------------------------------------
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

// Export empty object to make this a module
export {};