/**
 * WebSocket module exports
 */

// Client and types
export {
  WebSocketClient,
  wsClient,
  ConnectionState,
  useWebSocket as useWebSocketHook,
  type WebSocketConfig,
  type WebSocketMessage,
  type WebSocketError,
  type Room,
} from './client';

// Configuration
export {
  getWebSocketConfig,
  WS_EVENTS,
  WS_ROOMS,
  WS_TIMEOUTS,
  WS_RETRY,
  WS_HEALTH,
  calculateRetryDelay,
} from './config';

// Re-export context hooks from context file for convenience
// Note: These should be imported from @/contexts/WebSocketContext in components
export type { WebSocketContextValue as WSContextValue } from '@/contexts/WebSocketContext';