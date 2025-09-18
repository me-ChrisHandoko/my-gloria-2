/**
 * Redux DevTools Configuration
 * Production-ready DevTools setup with advanced debugging capabilities
 */

import { Middleware, isRejectedWithValue } from '@reduxjs/toolkit';
import { isDevelopment, isDebugMode, isBrowser, hasReduxDevTools } from '../config/environment';

// Re-export for backward compatibility
export { isDevelopment, isDebugMode } from '../config/environment';

/**
 * Sensitive data patterns for redaction
 */
const SENSITIVE_PATTERNS = [
  'password',
  'token',
  'secret',
  'api_key',
  'apiKey',
  'private',
  'credential',
  'authorization',
  'bearer',
  'refresh_token',
  'access_token',
  'client_secret',
  'ssn',
  'social_security',
  'credit_card',
  'card_number',
];

/**
 * Check if a key contains sensitive data
 */
const isSensitiveKey = (key: string): boolean => {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_PATTERNS.some(pattern => lowerKey.includes(pattern));
};

/**
 * Recursively sanitize an object by redacting sensitive data
 */
const sanitizeObject = (obj: any, depth = 0, maxDepth = 10): any => {
  if (depth >= maxDepth) return '[MAX_DEPTH_EXCEEDED]';

  if (obj === null || obj === undefined) return obj;

  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1, maxDepth));
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, depth + 1, maxDepth);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Action sanitizer for Redux DevTools
 * Removes sensitive data from actions before displaying
 */
export const actionSanitizer = (action: any): any => {
  // Skip sanitization for specific safe actions
  const safeActions = ['@@INIT', '@@redux/', 'persist/'];
  if (safeActions.some(safe => action.type?.startsWith(safe))) {
    return action;
  }

  return {
    ...action,
    payload: action.payload ? sanitizeObject(action.payload) : action.payload,
    meta: action.meta ? sanitizeObject(action.meta) : action.meta,
  };
};

/**
 * State sanitizer for Redux DevTools
 * Removes sensitive data from state before displaying
 */
export const stateSanitizer = (state: any): any => {
  if (!state) return state;

  const sanitized: any = {};

  for (const [slice, sliceState] of Object.entries(state)) {
    // Special handling for auth slice
    if (slice === 'auth' && typeof sliceState === 'object' && sliceState !== null) {
      sanitized[slice] = {
        ...(sliceState as any),
        user: (sliceState as any).user ? {
          ...(sliceState as any).user,
          password: '[REDACTED]',
          email: (sliceState as any).user.email?.replace(/(.{2}).*(@.*)/, '$1***$2'),
        } : null,
        tokens: '[REDACTED]',
      };
    }
    // Special handling for API slice
    else if (slice === 'api' && typeof sliceState === 'object' && sliceState !== null) {
      sanitized[slice] = {
        ...(sliceState as any),
        queries: '[SIMPLIFIED]',
        mutations: '[SIMPLIFIED]',
        provided: '[SIMPLIFIED]',
        subscriptions: '[SIMPLIFIED]',
      };
    }
    // Default sanitization for other slices
    else {
      sanitized[slice] = sanitizeObject(sliceState);
    }
  }

  return sanitized;
};

/**
 * Performance monitoring configuration
 */
export interface PerformanceMetrics {
  actionType: string;
  startTime: number;
  endTime: number;
  duration: number;
  stateSize: number;
  error?: boolean;
}

/**
 * Performance monitor middleware
 * Tracks action execution time and state size
 */
export const performanceMonitor: Middleware = (store) => (next) => (action) => {
  if (!isDevelopment) return next(action);

  const startTime = performance.now();
  const prevStateSize = JSON.stringify(store.getState()).length;

  const result = next(action);

  const endTime = performance.now();
  const duration = endTime - startTime;
  const nextStateSize = JSON.stringify(store.getState()).length;

  // Log slow actions (>16ms - one frame at 60fps)
  if (duration > 16) {
    console.warn(`[SLOW_ACTION] ${action.type} took ${duration.toFixed(2)}ms`);
  }

  // Log large state changes (>10KB)
  const sizeDiff = nextStateSize - prevStateSize;
  if (Math.abs(sizeDiff) > 10240) {
    console.warn(
      `[LARGE_STATE_CHANGE] ${action.type} changed state by ${(sizeDiff / 1024).toFixed(2)}KB`
    );
  }

  // Store metrics for DevTools
  if (isBrowser && window.__REDUX_DEVTOOLS_EXTENSION__) {
    window.__PERFORMANCE_METRICS__ = window.__PERFORMANCE_METRICS__ || [];
    window.__PERFORMANCE_METRICS__.push({
      actionType: action.type,
      startTime,
      endTime,
      duration,
      stateSize: nextStateSize,
      error: isRejectedWithValue(action),
    });

    // Keep only last 100 metrics
    if (window.__PERFORMANCE_METRICS__.length > 100) {
      window.__PERFORMANCE_METRICS__.shift();
    }
  }

  return result;
};

/**
 * State diff logger middleware
 * Logs state changes for debugging
 */
export const stateDiffLogger: Middleware<{}, any> = (store) => (next) => (action) => {
  if (!isDevelopment || !isDebugMode) return next(action);

  const prevState = store.getState();
  const result = next(action);
  const nextState = store.getState();

  // Calculate diff for each slice
  const diffs: Record<string, any> = {};
  let hasChanges = false;

  for (const key in nextState) {
    if (prevState[key as keyof typeof prevState] !== nextState[key as keyof typeof nextState]) {
      diffs[key] = {
        prev: prevState[key as keyof typeof prevState],
        next: nextState[key as keyof typeof nextState],
      };
      hasChanges = true;
    }
  }

  if (hasChanges) {
    console.groupCollapsed(
      `%c ACTION %c ${action.type}`,
      'background: #222; color: #bada55; padding: 2px 4px; border-radius: 2px 0 0 2px;',
      'background: #444; color: #fff; padding: 2px 4px; border-radius: 0 2px 2px 0;'
    );
    console.log('%c prev state', 'color: #9E9E9E; font-weight: bold;', sanitizeObject(prevState));
    console.log('%c action', 'color: #03A9F4; font-weight: bold;', actionSanitizer(action));
    console.log('%c diff', 'color: #FFC107; font-weight: bold;', diffs);
    console.log('%c next state', 'color: #4CAF50; font-weight: bold;', sanitizeObject(nextState));
    console.groupEnd();
  }

  return result;
};

/**
 * Error logger middleware
 * Captures and logs Redux errors
 */
export const errorLogger: Middleware = () => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    console.error('[REDUX_ERROR]', {
      type: action.type,
      payload: action.payload,
      error: action.error,
      meta: action.meta,
    });

    // Send to error tracking service in production
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(new Error(`Redux Error: ${action.type}`), {
        extra: {
          action: actionSanitizer(action),
        },
      });
    }
  }

  return next(action);
};

/**
 * Redux DevTools configuration
 */
export interface DevToolsConfig {
  name?: string;
  maxAge?: number;
  trace?: boolean;
  traceLimit?: number;
  actionSanitizer?: typeof actionSanitizer;
  stateSanitizer?: typeof stateSanitizer;
  actionsBlacklist?: string[];
  actionsWhitelist?: string[];
  features?: {
    pause?: boolean;
    lock?: boolean;
    persist?: boolean;
    export?: boolean;
    import?: boolean;
    jump?: boolean;
    skip?: boolean;
    reorder?: boolean;
    dispatch?: boolean;
    test?: boolean;
  };
}

/**
 * Setup Redux DevTools with advanced configuration
 */
export const setupDevTools = (config?: Partial<DevToolsConfig>): DevToolsConfig | undefined => {
  if (!hasReduxDevTools) {
    return undefined;
  }

  const defaultConfig: DevToolsConfig = {
    name: 'Gloria State',
    maxAge: 50, // Maximum number of actions to keep
    trace: isDevelopment,
    traceLimit: 25,
    actionSanitizer,
    stateSanitizer,
    actionsBlacklist: [
      // Blacklist frequent/noisy actions
      '@@redux-toolkit/rtk-query/internal/middlewareRegistered',
      'persist/REHYDRATE',
      'persist/PERSIST',
    ],
    features: {
      pause: true, // Pause recording actions
      lock: true, // Lock changes
      persist: true, // Persist state on page reloading
      export: true, // Export history to file
      import: 'custom', // Import history from file
      jump: true, // Jump to any point in history
      skip: true, // Skip (cancel) actions
      reorder: true, // Reorder actions in history
      dispatch: true, // Dispatch custom actions
      test: true, // Generate tests for actions
    },
  };

  return { ...defaultConfig, ...config };
};

/**
 * State snapshot utility
 * Captures current state for debugging
 */
export const captureStateSnapshot = (
  state: any,
  label?: string
): void => {
  if (!isDevelopment || !isBrowser) return;

  const snapshot = {
    timestamp: new Date().toISOString(),
    label: label || 'State Snapshot',
    state: sanitizeObject(state),
  };

  // Store in session storage for inspection
  const snapshots = JSON.parse(
    sessionStorage.getItem('__STATE_SNAPSHOTS__') || '[]'
  );
  snapshots.push(snapshot);

  // Keep only last 10 snapshots
  if (snapshots.length > 10) {
    snapshots.shift();
  }

  sessionStorage.setItem('__STATE_SNAPSHOTS__', JSON.stringify(snapshots));

  console.log(`[STATE_SNAPSHOT] ${label || 'Captured'}`, snapshot);
};

/**
 * Get performance metrics
 */
export const getPerformanceMetrics = (): PerformanceMetrics[] => {
  if (typeof window === 'undefined') return [];
  return window.__PERFORMANCE_METRICS__ || [];
};

/**
 * Get state snapshots
 */
export const getStateSnapshots = (): any[] => {
  if (!isBrowser) return [];
  return JSON.parse(sessionStorage.getItem('__STATE_SNAPSHOTS__') || '[]');
};

/**
 * Clear performance metrics
 */
export const clearPerformanceMetrics = (): void => {
  if (typeof window !== 'undefined') {
    window.__PERFORMANCE_METRICS__ = [];
  }
};

/**
 * Clear state snapshots
 */
export const clearStateSnapshots = (): void => {
  if (isBrowser) {
    sessionStorage.removeItem('__STATE_SNAPSHOTS__');
  }
};

/**
 * Export state to file
 */
export const exportState = (state: any, filename?: string): void => {
  if (!isBrowser) return;

  const sanitizedState = stateSanitizer(state);
  const dataStr = JSON.stringify(sanitizedState, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

  const exportFileDefaultName = filename || `gloria-state-${Date.now()}.json`;

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

// Type declarations for window object
declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: any;
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: any;
    __PERFORMANCE_METRICS__?: PerformanceMetrics[];
    Sentry?: any;
  }
}