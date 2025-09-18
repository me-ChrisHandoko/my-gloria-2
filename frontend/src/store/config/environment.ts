/**
 * Environment Configuration
 * Centralized environment checks to avoid circular dependencies
 */

/**
 * Check if running in development environment
 */
export const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Check if debug mode is enabled
 */
export const isDebugMode = process.env.NEXT_PUBLIC_DEBUG === 'true';

/**
 * Check if running in production environment
 */
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Check if running in test environment
 */
export const isTest = process.env.NODE_ENV === 'test';

/**
 * Check if running in browser environment
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * Check if Redux DevTools extension is available
 */
export const hasReduxDevTools = isBrowser && !!(window as any).__REDUX_DEVTOOLS_EXTENSION__;

/**
 * Environment configuration object
 */
export const environment = {
  isDevelopment,
  isDebugMode,
  isProduction,
  isTest,
  isBrowser,
  hasReduxDevTools,
} as const;

export default environment;