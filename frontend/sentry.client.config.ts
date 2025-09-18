import * as Sentry from '@sentry/nextjs';

/**
 * Sentry client-side configuration
 * This file configures Sentry for the browser environment
 */

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENV || 'development';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Only initialize Sentry if DSN is provided
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,

    // Performance Monitoring
    tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0, // 10% in production, 100% in development

    // Session Replay
    replaysSessionSampleRate: IS_PRODUCTION ? 0.1 : 0, // 10% in production, disabled in development
    replaysOnErrorSampleRate: 1.0, // 100% when errors occur

    // Release tracking
    release: process.env.NEXT_PUBLIC_RELEASE || 'unknown',

    // Integrations
    integrations: [
      new Sentry.BrowserTracing({
        // Set tracingOrigins to control what URLs are traced
        tracingOrigins: [
          'localhost',
          process.env.NEXT_PUBLIC_APP_URL || '',
          /^\//,
        ],
        // Disable automatic route change tracking in Next.js
        routingInstrumentation: Sentry.nextRouterInstrumentation,
      }),
      new Sentry.Replay({
        // Mask sensitive content
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: false,

        // Sampling
        sessionSampleRate: IS_PRODUCTION ? 0.1 : 0,
        errorSampleRate: 1.0,

        // Network details
        networkDetailAllowUrls: [
          process.env.NEXT_PUBLIC_APP_URL || '',
          process.env.NEXT_PUBLIC_API_URL || '',
        ],
      }),
    ],

    // Filtering
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',

      // Network errors
      'Network request failed',
      'NetworkError',
      'Failed to fetch',

      // Script errors
      'Script error',
      'Cross-origin',

      // Chunk load errors (handled separately)
      'ChunkLoadError',
      'Loading chunk',
      'Failed to fetch dynamically imported module',
    ],

    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,

      // Other browsers
      /^moz-extension:\/\//i,
      /^ms-browser-extension:\/\//i,
    ],

    // Before sending event to Sentry
    beforeSend(event, hint) {
      // Filter out certain errors
      const error = hint.originalException;

      // Don't send events in development unless explicitly enabled
      if (!IS_PRODUCTION && !process.env.NEXT_PUBLIC_SENTRY_DEBUG) {
        return null;
      }

      // Filter out non-application errors
      if (error && typeof error === 'object' && 'isAxiosError' in error) {
        // Handle Axios errors specially
        const axiosError = error as any;
        if (axiosError.response?.status === 401) {
          // Don't report authentication errors
          return null;
        }
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
        }
      }

      // Add user context if available
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          event.user = {
            id: user.id,
            email: user.email,
            username: user.name,
          };
        }
      } catch {
        // Ignore errors when accessing localStorage
      }

      return event;
    },

    // Breadcrumbs configuration
    beforeBreadcrumb(breadcrumb) {
      // Filter out noisy breadcrumbs
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }

      // Don't log navigation to sign-in/sign-up pages (may contain sensitive URLs)
      if (breadcrumb.category === 'navigation') {
        const url = breadcrumb.data?.to;
        if (url && (url.includes('/sign-in') || url.includes('/sign-up'))) {
          breadcrumb.data.to = '[REDACTED]';
        }
      }

      return breadcrumb;
    },
  });

  // Set initial user context if available
  if (typeof window !== 'undefined') {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        Sentry.setUser({
          id: user.id,
          email: user.email,
          username: user.name,
        });
      }
    } catch {
      // Ignore errors when accessing localStorage
    }
  }
}