import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

/**
 * WebSocket connection states
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

/**
 * WebSocket client configuration
 */
export interface WebSocketConfig {
  url?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
  transports?: string[];
  debug?: boolean;
  auth?: Record<string, any>;
  query?: Record<string, any>;
}

/**
 * WebSocket message
 */
export interface WebSocketMessage<T = any> {
  event: string;
  data: T;
  timestamp: number;
  id?: string;
}

/**
 * WebSocket error
 */
export interface WebSocketError {
  message: string;
  type: string;
  code?: string;
  details?: any;
}

/**
 * Room management
 */
export interface Room {
  name: string;
  joined: boolean;
  members?: string[];
}

class WebSocketClient extends EventEmitter {
  private socket: Socket | null = null;
  private config: WebSocketConfig;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private rooms: Map<string, Room> = new Map();
  private messageQueue: WebSocketMessage[] = [];
  private reconnectAttempts = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private connectionTimeoutId: NodeJS.Timeout | null = null;
  private errorHandlerAttached = false;
  private metrics = {
    messagesReceived: 0,
    messagesSent: 0,
    bytesReceived: 0,
    bytesSent: 0,
    connectionTime: 0,
    lastActivity: Date.now(),
  };

  constructor(config: WebSocketConfig = {}) {
    super();

    // Validate and setup WebSocket URL
    const wsUrl = this.validateAndGetWsUrl(config.url);

    this.config = {
      url: wsUrl,
      autoConnect: config.autoConnect ?? false, // Default to false for better control
      reconnection: config.reconnection ?? true,
      reconnectionAttempts: config.reconnectionAttempts ?? 10, // More attempts for production
      reconnectionDelay: config.reconnectionDelay ?? 1000,
      reconnectionDelayMax: config.reconnectionDelayMax ?? 30000, // Higher max for production
      timeout: config.timeout ?? 20000,
      transports: config.transports || ['polling', 'websocket'], // Polling first for reliability
      debug: config.debug ?? (process.env.NODE_ENV === 'development'),
      auth: config.auth || {},
      query: config.query || {},
    };

    // Setup default error handler to prevent unhandled errors
    this.setupDefaultErrorHandler();

    // Only auto-connect if explicitly enabled and in browser
    if (this.config.autoConnect && typeof window !== 'undefined') {
      // Delay connection to ensure proper initialization
      setTimeout(() => this.connect(), 100);
    }
  }

  /**
   * Validate and get WebSocket URL
   */
  private validateAndGetWsUrl(customUrl?: string): string {
    if (customUrl) {
      return customUrl;
    }

    // Check environment variable
    const envUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (envUrl) {
      // Convert ws:// to http:// for Socket.IO compatibility
      return envUrl.replace(/^ws(s)?:\/\//, 'http$1://');
    }

    // Fallback to API URL if available
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
      return apiUrl;
    }

    // Default fallback
    console.warn('[WebSocket] No URL configured, using default localhost:3001');
    return 'http://localhost:3001';
  }

  /**
   * Setup default error handler
   */
  private setupDefaultErrorHandler(): void {
    if (!this.errorHandlerAttached) {
      // Add a default error handler to prevent unhandled errors
      this.on('error', (error) => {
        if (this.config.debug) {
          console.error('[WebSocket] Error:', error);
        }
      });
      this.errorHandlerAttached = true;
    }
  }

  /**
   * Connect to WebSocket server with retry logic
   */
  async connect(token?: string): Promise<void> {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      this.log('Cannot connect: not in browser environment');
      return;
    }

    if (this.state === ConnectionState.CONNECTED || this.state === ConnectionState.CONNECTING) {
      this.log(`Already ${this.state}`);
      return;
    }

    this.setState(ConnectionState.CONNECTING);

    // Clear any existing timeouts
    this.clearTimeouts();

    try {
      // Validate server availability first (optional)
      await this.validateServerAvailability();

      // Create socket connection with exponential backoff
      this.socket = io(this.config.url!, {
        auth: {
          ...this.config.auth,
          ...(token ? { token } : {}),
        },
        query: this.config.query,
        transports: this.config.transports,
        reconnection: this.config.reconnection,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
        reconnectionDelayMax: this.config.reconnectionDelayMax,
        timeout: this.config.timeout,
        autoConnect: true,
        forceNew: true, // Force new connection
      });

      this.setupEventHandlers();
      this.metrics.connectionTime = Date.now();

      // Set connection timeout
      this.connectionTimeoutId = setTimeout(() => {
        if (this.state === ConnectionState.CONNECTING) {
          this.log('Connection timeout, attempting reconnect...');
          this.handleConnectionTimeout();
        }
      }, this.config.timeout!);

    } catch (error) {
      this.handleError('Connection initialization failed', error);
      this.setState(ConnectionState.ERROR);

      // Attempt reconnection with exponential backoff
      this.scheduleReconnect();

      throw error;
    }
  }

  /**
   * Validate server availability (optional)
   */
  private async validateServerAvailability(): Promise<void> {
    if (typeof window === 'undefined' || !this.config.url) {
      return;
    }

    try {
      // Convert WebSocket URL to HTTP for health check
      const healthUrl = this.config.url.replace(/^ws(s)?:\/\//, 'http$1://');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${healthUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        mode: 'cors',
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (!response || !response.ok) {
        this.log('Server health check failed, but continuing with connection attempt');
      }
    } catch (error) {
      // Health check is optional, don't fail the connection
      this.log('Server health check error:', error);
    }
  }

  /**
   * Handle connection timeout
   */
  private handleConnectionTimeout(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.setState(ConnectionState.ERROR);
    this.scheduleReconnect();
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (!this.config.reconnection || this.reconnectAttempts >= this.config.reconnectionAttempts!) {
      this.log('Max reconnection attempts reached');
      this.emit('max_reconnect_attempts');
      return;
    }

    const delay = Math.min(
      this.config.reconnectionDelay! * Math.pow(2, this.reconnectAttempts),
      this.config.reconnectionDelayMax!
    );

    this.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch((error) => {
        this.log('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Clear all timeouts
   */
  private clearTimeouts(): void {
    if (this.connectionTimeoutId) {
      clearTimeout(this.connectionTimeoutId);
      this.connectionTimeoutId = null;
    }

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.log('Disconnecting...');

      // Remove all listeners before disconnecting
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.clearHeartbeat();
    this.clearTimeouts();
    this.setState(ConnectionState.DISCONNECTED);
    this.rooms.clear();
    this.messageQueue = [];
    this.reconnectAttempts = 0;
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.log('Connected');

      // Clear connection timeout
      if (this.connectionTimeoutId) {
        clearTimeout(this.connectionTimeoutId);
        this.connectionTimeoutId = null;
      }

      this.setState(ConnectionState.CONNECTED);
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.flushMessageQueue();
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      this.log('Disconnected:', reason);
      this.clearHeartbeat();
      this.setState(ConnectionState.DISCONNECTED);
      this.emit('disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      // Don't emit error event here, just log it
      this.log('Connection error:', error.message);

      // Only set error state if not already reconnecting
      if (this.state !== ConnectionState.RECONNECTING) {
        this.setState(ConnectionState.ERROR);
      }

      // Emit a specific connection_error event instead
      this.emit('connection_error', {
        message: error.message,
        type: (error as any).type || 'TransportError',
        details: error,
      });
    });

    // Reconnection events
    this.socket.on('reconnect', (attemptNumber) => {
      this.log('Reconnected after', attemptNumber, 'attempts');
      this.setState(ConnectionState.CONNECTED);
      this.emit('reconnected', attemptNumber);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this.log('Reconnection attempt', attemptNumber);
      this.setState(ConnectionState.RECONNECTING);
      this.reconnectAttempts = attemptNumber;
      this.emit('reconnecting', attemptNumber);
    });

    this.socket.on('reconnect_error', (error) => {
      this.handleError('Reconnection error', error);
    });

    this.socket.on('reconnect_failed', () => {
      this.log('Reconnection failed');
      this.setState(ConnectionState.ERROR);
      this.emit('reconnect_failed');
    });

    // Custom events
    this.socket.on('message', (data: any) => {
      this.handleMessage('message', data);
    });

    this.socket.on('notification', (data: any) => {
      this.handleMessage('notification', data);
    });

    this.socket.on('error', (error: WebSocketError) => {
      this.handleError('Server error', error);
      this.emit('server_error', error);
    });

    // Room events
    this.socket.on('room_joined', (room: string) => {
      this.rooms.set(room, { name: room, joined: true });
      this.emit('room_joined', room);
    });

    this.socket.on('room_left', (room: string) => {
      this.rooms.delete(room);
      this.emit('room_left', room);
    });

    this.socket.on('room_message', (data: { room: string; message: any }) => {
      this.emit('room_message', data);
    });

    // Heartbeat
    this.socket.on('pong', () => {
      this.metrics.lastActivity = Date.now();
    });
  }

  /**
   * Send a message
   */
  emit(event: string, data?: any, callback?: (response: any) => void): boolean {
    const message: WebSocketMessage = {
      event,
      data,
      timestamp: Date.now(),
      id: this.generateMessageId(),
    };

    if (this.state !== ConnectionState.CONNECTED) {
      this.log('Not connected, queueing message');
      this.messageQueue.push(message);
      return false as any;
    }

    if (!this.socket) {
      this.handleError('Socket not initialized', null);
      return false as any;
    }

    try {
      if (callback) {
        this.socket.emit(event, data, callback);
      } else {
        this.socket.emit(event, data);
      }

      this.metrics.messagesSent++;
      this.metrics.bytesSent += JSON.stringify(data || {}).length;
      this.metrics.lastActivity = Date.now();

      super.emit('message_sent', message);
    } catch (error) {
      this.handleError(`Failed to send message: ${event}`, error);
    }
    return true;
  }

  /**
   * Listen to events
   */
  on(event: string, callback: (...args: any[]) => void): this {
    if (this.socket && !this.eventNames().includes(event)) {
      this.socket.on(event, callback);
    }
    return super.on(event, callback);
  }

  /**
   * Listen to event once
   */
  once(event: string, callback: (...args: any[]) => void): this {
    if (this.socket && !this.eventNames().includes(event)) {
      this.socket.once(event, callback);
    }
    return super.once(event, callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: (...args: any[]) => void): this {
    if (this.socket && callback) {
      this.socket.off(event, callback as any);
    }
    return super.off(event, callback as any);
  }

  /**
   * Join a room
   */
  joinRoom(room: string): void {
    if (!this.socket || this.state !== ConnectionState.CONNECTED) {
      this.log('Cannot join room: not connected');
      return;
    }

    this.socket.emit('join_room', room);
    this.log(`Joining room: ${room}`);
  }

  /**
   * Leave a room
   */
  leaveRoom(room: string): void {
    if (!this.socket || this.state !== ConnectionState.CONNECTED) {
      this.log('Cannot leave room: not connected');
      return;
    }

    this.socket.emit('leave_room', room);
    this.log(`Leaving room: ${room}`);
  }

  /**
   * Send message to room
   */
  sendToRoom(room: string, data: any): void {
    if (!this.socket || this.state !== ConnectionState.CONNECTED) {
      this.log('Cannot send to room: not connected');
      return;
    }

    this.socket.emit('room_message', { room, data });
  }

  /**
   * Request-response pattern
   */
  async request<T = any>(event: string, data?: any, timeout?: number): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket || this.state !== ConnectionState.CONNECTED) {
        reject(new Error('Not connected'));
        return;
      }

      const timeoutMs = timeout || this.config.timeout || 10000;
      let timeoutId: NodeJS.Timeout;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
      };

      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Request timeout: ${event}`));
      }, timeoutMs);

      this.socket.emit(event, data, (response: any) => {
        cleanup();

        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.data || response);
        }
      });
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(event: string, data: any): void {
    this.metrics.messagesReceived++;
    this.metrics.bytesReceived += JSON.stringify(data || {}).length;
    this.metrics.lastActivity = Date.now();

    const message: WebSocketMessage = {
      event,
      data,
      timestamp: Date.now(),
    };

    this.log(`Received ${event}:`, data);
    super.emit(event, data);
    super.emit('message', message);
  }

  /**
   * Handle errors safely
   */
  private handleError(context: string, error: any): void {
    const errorObj: WebSocketError = {
      message: error?.message || String(error) || 'Unknown error',
      type: context,
      details: error,
    };

    if (this.config.debug) {
      console.error(`[WebSocket] ${context}:`, errorObj);
    }

    // Check if there are any error listeners before emitting
    // This prevents the "Unhandled error" exception
    if (this.listenerCount('error') > 0) {
      super.emit('error', errorObj);
    } else {
      // Log the error if no listeners are attached
      console.warn('[WebSocket] Error occurred but no error handler attached:', errorObj);
    }
  }

  /**
   * Flush message queue
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    this.log(`Flushing ${this.messageQueue.length} queued messages`);

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.emit(message.event, message.data);
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.clearHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.state === ConnectionState.CONNECTED) {
        this.socket.emit('ping');
      }
    }, 30000); // 30 seconds
  }

  /**
   * Clear heartbeat
   */
  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Set connection state
   */
  private setState(state: ConnectionState): void {
    if (this.state !== state) {
      const oldState = this.state;
      this.state = state;
      this.emit('state_change', { oldState, newState: state });
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Log debug messages
   */
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[WebSocket]', ...args);
    }
  }

  // Getters

  /**
   * Get connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | null {
    return this.socket?.id || null;
  }

  /**
   * Get joined rooms
   */
  getRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Get connection metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: this.state === ConnectionState.CONNECTED
        ? Date.now() - this.metrics.connectionTime
        : 0,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      messagesReceived: 0,
      messagesSent: 0,
      bytesReceived: 0,
      bytesSent: 0,
      connectionTime: Date.now(),
      lastActivity: Date.now(),
    };
  }
}

// Create singleton instance
export const wsClient = new WebSocketClient();

// Export class for testing or multiple instances
export { WebSocketClient };

/**
 * React hook for WebSocket
 */
export function useWebSocket(config?: WebSocketConfig) {
  const [state, setState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [metrics, setMetrics] = useState(wsClient.getMetrics());
  const clientRef = useRef<WebSocketClient>(wsClient);

  useEffect(() => {
    const client = clientRef.current;

    const handleStateChange = ({ newState }: { newState: ConnectionState }) => {
      setState(newState);
    };

    const updateMetrics = () => {
      setMetrics(client.getMetrics());
    };

    client.on('state_change', handleStateChange);
    client.on('message', updateMetrics);
    client.on('message_sent', updateMetrics);

    // Update initial state
    setState(client.getState());

    // Update metrics periodically
    const metricsInterval = setInterval(updateMetrics, 5000);

    return () => {
      client.off('state_change', handleStateChange);
      client.off('message', updateMetrics);
      client.off('message_sent', updateMetrics);
      clearInterval(metricsInterval);
    };
  }, []);

  return {
    client: clientRef.current,
    state,
    metrics,
    isConnected: state === ConnectionState.CONNECTED,
    connect: (token?: string) => clientRef.current.connect(token),
    disconnect: () => clientRef.current.disconnect(),
    emit: (event: string, data?: any) => clientRef.current.emit(event, data),
    on: (event: string, callback: (...args: any[]) => void) => clientRef.current.on(event, callback),
    off: (event: string, callback?: (...args: any[]) => void) => clientRef.current.off(event, callback),
    request: <T = any>(event: string, data?: any, timeout?: number) =>
      clientRef.current.request<T>(event, data, timeout),
  };
}

// Import React hooks
import { useState, useEffect, useRef } from 'react';