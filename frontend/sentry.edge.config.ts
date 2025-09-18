import * as Sentry from '@sentry/nextjs';

/**
 * Sentry Edge runtime configuration
 * This file configures Sentry for the Edge runtime (middleware)
 */

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENV || 'development';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Only initialize Sentry if DSN is provided
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,

    // Performance Monitoring
    tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,

    // Release tracking
    release: process.env.NEXT_PUBLIC_RELEASE || 'unknown',

    // Edge-specific options
    // Note: Some features may not be available in Edge runtime

    // Before sending event to Sentry
    beforeSend(event) {
      // Don't send events in development unless explicitly enabled
      if (!IS_PRODUCTION && !process.env.NEXT_PUBLIC_SENTRY_DEBUG) {
        return null;
      }

      // Remove sensitive data from edge runtime
      if (event.request) {
        // Remove cookies and headers
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['authorization'];
          delete event.request.headers['Cookie'];
          delete event.request.headers['cookie'];
        }
      }

      return event;
    },
  });
}