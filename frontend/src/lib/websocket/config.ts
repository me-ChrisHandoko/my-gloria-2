import { WebSocketConfig } from './client';

/**
 * WebSocket configuration for different environments
 */
export const getWebSocketConfig = (): WebSocketConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  // Base configuration
  const baseConfig: WebSocketConfig = {
    url: process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    autoConnect: false, // Always manually control connection
    reconnection: true,
    reconnectionAttempts: isProduction ? 10 : 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: isProduction ? 30000 : 10000,
    timeout: 20000,
    transports: isProduction ? ['polling', 'websocket'] : ['websocket', 'polling'],
    debug: isDevelopment,
    auth: {},
    query: {
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
    },
  };

  // Environment-specific overrides
  if (isProduction) {
    return {
      ...baseConfig,
      // Production optimizations
      reconnectionAttempts: 10,
      reconnectionDelayMax: 30000,
      transports: ['polling', 'websocket'], // Polling first for reliability
      debug: false,
    };
  }

  if (isDevelopment) {
    return {
      ...baseConfig,
      // Development conveniences
      debug: true,
      reconnectionAttempts: 5,
      reconnectionDelayMax: 10000,
      transports: ['websocket', 'polling'], // WebSocket first for speed
    };
  }

  // Test environment
  return {
    ...baseConfig,
    autoConnect: false,
    reconnection: false,
    debug: false,
  };
};

/**
 * WebSocket event names constants
 */
export const WS_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  RECONNECT: 'reconnect',
  RECONNECTING: 'reconnecting',
  RECONNECT_ERROR: 'reconnect_error',
  RECONNECT_FAILED: 'reconnect_failed',

  // Custom events
  MESSAGE: 'message',
  NOTIFICATION: 'notification',
  ERROR: 'error',
  PING: 'ping',
  PONG: 'pong',

  // Room events
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  ROOM_MESSAGE: 'room_message',
  ROOM_JOINED: 'room_joined',
  ROOM_LEFT: 'room_left',
  ROOM_MEMBERS: 'room_members',

  // Auth events
  AUTH_SUCCESS: 'auth_success',
  AUTH_ERROR: 'auth_error',
  TOKEN_REFRESH: 'token_refresh',

  // State events
  STATE_CHANGE: 'state_change',
  MESSAGE_SENT: 'message_sent',
} as const;

/**
 * WebSocket room names
 */
export const WS_ROOMS = {
  GLOBAL: 'global',
  USER: (userId: string) => `user:${userId}`,
  ORGANIZATION: (orgId: string) => `org:${orgId}`,
  PROJECT: (projectId: string) => `project:${projectId}`,
  NOTIFICATIONS: 'notifications',
} as const;

/**
 * WebSocket request timeout configurations
 */
export const WS_TIMEOUTS = {
  DEFAULT: 10000,
  QUICK: 5000,
  LONG: 30000,
  FILE_UPLOAD: 60000,
} as const;

/**
 * WebSocket retry configurations
 */
export const WS_RETRY = {
  MAX_ATTEMPTS: 10,
  INITIAL_DELAY: 1000,
  MAX_DELAY: 30000,
  BACKOFF_FACTOR: 2,
  JITTER: 0.3, // 30% jitter for retry delays
} as const;

/**
 * Calculate retry delay with exponential backoff and jitter
 */
export const calculateRetryDelay = (attempt: number): number => {
  const baseDelay = Math.min(
    WS_RETRY.INITIAL_DELAY * Math.pow(WS_RETRY.BACKOFF_FACTOR, attempt),
    WS_RETRY.MAX_DELAY
  );

  // Add jitter to prevent thundering herd
  const jitter = baseDelay * WS_RETRY.JITTER * Math.random();
  return Math.floor(baseDelay + jitter);
};

/**
 * WebSocket health check configuration
 */
export const WS_HEALTH = {
  INTERVAL: 30000, // 30 seconds
  TIMEOUT: 5000, // 5 seconds
  MAX_FAILURES: 3,
} as const;