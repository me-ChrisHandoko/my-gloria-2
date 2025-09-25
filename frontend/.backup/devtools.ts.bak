import { StoreEnhancer } from '@reduxjs/toolkit';

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: () => StoreEnhancer;
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: (options: any) => typeof compose;
  }
}

interface DevToolsConfig {
  actionSanitizer?: (action: any, id: number) => any;
  stateSanitizer?: (state: any, index: number) => any;
  trace?: boolean;
  traceLimit?: number;
  features?: {
    pause?: boolean;
    lock?: boolean;
    persist?: boolean;
    export?: boolean | 'custom';
    import?: boolean | 'custom';
    jump?: boolean;
    skip?: boolean;
    reorder?: boolean;
    dispatch?: boolean;
    test?: boolean;
  };
  maxAge?: number;
  latency?: number;
  name?: string;
  serialize?: boolean | {
    options?: any;
    replacer?: (key: string, value: any) => any;
    reviver?: (key: string, value: any) => any;
    immutable?: any;
    refs?: any[];
  };
}

/**
 * Setup Redux DevTools with custom configuration
 * Sanitizes sensitive data and provides debugging features
 */
export const setupDevTools = (): DevToolsConfig | undefined => {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') {
    return undefined;
  }

  // List of sensitive keys to redact
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'auth',
    'credential',
    'private',
    'ssn',
    'creditCard',
    'cvv',
    'pin',
  ];

  // List of action types to skip logging (too noisy)
  const skipActions = [
    'persist/PERSIST',
    'persist/REHYDRATE',
    'api/executeQuery/pending',
    'api/executeQuery/fulfilled',
  ];

  // Custom action sanitizer to remove sensitive data
  const actionSanitizer = (action: any, id: number): any => {
    // Skip certain actions entirely
    if (skipActions.some(skipAction => action.type?.includes(skipAction))) {
      return { ...action, payload: '[SKIPPED]' };
    }

    // Deep clone the action to avoid mutations
    const sanitized = JSON.parse(JSON.stringify(action));

    // Recursively sanitize objects
    const sanitizeObject = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;

      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }

      const result: any = {};
      for (const key in obj) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = sanitizeObject(obj[key]);
        }
      }
      return result;
    };

    if (sanitized.payload) {
      sanitized.payload = sanitizeObject(sanitized.payload);
    }

    if (sanitized.meta) {
      sanitized.meta = sanitizeObject(sanitized.meta);
    }

    return sanitized;
  };

  // Custom state sanitizer to remove sensitive data
  const stateSanitizer = (state: any, index: number): any => {
    if (!state) return state;

    // Deep clone the state to avoid mutations
    const sanitized = JSON.parse(JSON.stringify(state));

    // Sanitize auth state
    if (sanitized.auth?.user) {
      const user = sanitized.auth.user;
      sensitiveKeys.forEach(key => {
        if (user[key]) {
          user[key] = '[REDACTED]';
        }
      });
    }

    // Sanitize API cache
    if (sanitized.api) {
      // Only show API cache structure, not actual data
      sanitized.api = {
        ...sanitized.api,
        queries: Object.keys(sanitized.api.queries || {}).reduce((acc: any, key) => {
          acc[key] = {
            status: sanitized.api.queries[key].status,
            endpointName: sanitized.api.queries[key].endpointName,
          };
          return acc;
        }, {}),
        mutations: Object.keys(sanitized.api.mutations || {}).reduce((acc: any, key) => {
          acc[key] = {
            status: sanitized.api.mutations[key].status,
            endpointName: sanitized.api.mutations[key].endpointName,
          };
          return acc;
        }, {}),
      };
    }

    // Sanitize preferences
    if (sanitized.preferences?.privacy) {
      sanitized.preferences.privacy = {
        ...sanitized.preferences.privacy,
        // Keep structure but redact sensitive preferences
      };
    }

    return sanitized;
  };

  // DevTools configuration
  const config: DevToolsConfig = {
    actionSanitizer,
    stateSanitizer,
    trace: true,
    traceLimit: 25,
    features: {
      pause: true, // Allow pausing actions
      lock: true, // Allow locking changes
      persist: true, // Persist state across reloads
      export: true, // Allow exporting state
      import: 'custom', // Allow importing state with validation
      jump: true, // Allow jumping to different actions
      skip: true, // Allow skipping actions
      reorder: true, // Allow reordering actions
      dispatch: true, // Allow dispatching actions from DevTools
      test: true, // Allow generating tests
    },
    maxAge: 50, // Maximum number of actions to keep
    latency: 500, // Update frequency in ms
    name: 'Gloria Frontend', // Instance name
    serialize: {
      options: {
        undefined: true,
        function: false,
        symbol: true,
      },
      // Custom replacer for serialization
      replacer: (key: string, value: any) => {
        // Handle special types
        if (value instanceof Date) {
          return { __type: 'Date', value: value.toISOString() };
        }
        if (value instanceof RegExp) {
          return { __type: 'RegExp', value: value.toString() };
        }
        if (value instanceof Set) {
          return { __type: 'Set', value: Array.from(value) };
        }
        if (value instanceof Map) {
          return { __type: 'Map', value: Array.from(value.entries()) };
        }
        return value;
      },
      // Custom reviver for deserialization
      reviver: (key: string, value: any) => {
        if (value && typeof value === 'object' && value.__type) {
          switch (value.__type) {
            case 'Date':
              return new Date(value.value);
            case 'RegExp':
              const match = value.value.match(/^\/(.*)\/([gimuy]*)$/);
              return match ? new RegExp(match[1], match[2]) : value.value;
            case 'Set':
              return new Set(value.value);
            case 'Map':
              return new Map(value.value);
          }
        }
        return value;
      },
    },
  };

  return config;
};

/**
 * Helper to compose with Redux DevTools Extension
 */
export const composeWithDevTools = (config?: DevToolsConfig) => {
  if (typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) {
    return window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__(config || setupDevTools());
  }
  return (f: any) => f;
};

/**
 * Monitor performance and detect issues
 */
export const createPerformanceMonitor = () => {
  let slowActionThreshold = 50; // ms
  let previousState: any = null;

  return (store: any) => (next: any) => (action: any) => {
    const start = performance.now();

    // Get state before action
    const stateBefore = store.getState();

    // Execute action
    const result = next(action);

    // Get state after action
    const stateAfter = store.getState();

    // Measure time
    const duration = performance.now() - start;

    // Detect slow actions
    if (duration > slowActionThreshold) {
      console.warn(
        `⚠️ Slow Redux action detected:`,
        {
          action: action.type,
          duration: `${duration.toFixed(2)}ms`,
          threshold: `${slowActionThreshold}ms`,
        }
      );
    }

    // Detect large state changes
    if (previousState) {
      const stateSize = JSON.stringify(stateAfter).length;
      const previousSize = JSON.stringify(previousState).length;
      const sizeDiff = Math.abs(stateSize - previousSize);

      if (sizeDiff > 100000) { // 100KB change
        console.warn(
          `⚠️ Large state change detected:`,
          {
            action: action.type,
            sizeDiff: `${(sizeDiff / 1024).toFixed(2)}KB`,
            currentSize: `${(stateSize / 1024).toFixed(2)}KB`,
          }
        );
      }
    }

    previousState = stateAfter;
    return result;
  };
};