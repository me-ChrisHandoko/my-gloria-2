import * as Sentry from '@sentry/nextjs';

/**
 * Sentry server-side configuration
 * This file configures Sentry for the Node.js/Edge runtime
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

    // Integrations
    integrations: [
      // HTTP integration (tracing option is deprecated)
      Sentry.httpIntegration(),
    ],

    // Filtering
    ignoreErrors: [
      // Next.js specific
      'NEXT_NOT_FOUND',
      'NEXT_REDIRECT',

      // API errors
      'AbortError',
      'TypeError: Failed to fetch',
    ],

    // Before sending event to Sentry
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly enabled
      if (!IS_PRODUCTION && !process.env.NEXT_PUBLIC_SENTRY_DEBUG) {
        return null;
      }

      // Filter out 404 errors
      if (event.exception?.values?.[0]?.value?.includes('NEXT_NOT_FOUND')) {
        return null;
      }

      // Remove sensitive data
      if (event.request) {
        // Remove cookies
        delete event.request.cookies;

        // Remove authorization headers
        if (event.request.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['authorization'];
          delete event.request.headers['Cookie'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-api-key'];
        }

        // Remove sensitive query parameters
        if (event.request.query_string) {
          const params = new URLSearchParams(event.request.query_string);
          params.delete('token');
          params.delete('api_key');
          params.delete('secret');
          event.request.query_string = params.toString();
        }
      }

      // Remove sensitive environment variables
      if (event.contexts?.runtime) {
        const runtime = event.contexts.runtime as any;
        if (runtime.env) {
          const sensitiveKeys = [
            'DATABASE_URL',
            'CLERK_SECRET_KEY',
            'JWT_SECRET',
            'API_KEY',
            'AWS_SECRET',
          ];
          sensitiveKeys.forEach(key => {
            if (runtime.env[key]) {
              runtime.env[key] = '[REDACTED]';
            }
          });
        }
      }

      return event;
    },
  });
}