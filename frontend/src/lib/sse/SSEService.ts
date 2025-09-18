/**
 * SSE Service Implementation
 * Production-ready Server-Sent Events service with automatic reconnection,
 * authentication, and error handling
 */

import {
  SSEConnectionOptions,
  SSEConnectionState,
  SSEConnectionStatus,
  SSEEventHandler,
  SSEEventType,
  SSEMessage,
  ISSEService
} from '@/types/sse';

/**
 * Production-ready SSE Service Class
 */
export class SSEService implements ISSEService {
  private eventSource: EventSource | null = null;
  private options: SSEConnectionOptions;
  private state: SSEConnectionState;
  private eventListeners: Map<SSEEventType, Set<SSEEventHandler>>;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionUrl: string;
  private authToken: string | null = null;
  private isOnline: boolean = true;
  private connectionAttempts: number = 0;
  private lastErrorTime: number = 0;
  private errorCount: number = 0;

  /**
   * Default configuration values
   */
  private static readonly DEFAULTS = {
    RECONNECT_INTERVAL: 5000,
    MAX_RECONNECT_ATTEMPTS: 10,
    HEARTBEAT_INTERVAL: 30000,
    HEARTBEAT_TIMEOUT: 45000,
    MIN_RECONNECT_INTERVAL: 1000,
    MAX_RECONNECT_INTERVAL: 30000,
    BACKOFF_MULTIPLIER: 1.5,
    CIRCUIT_BREAKER_THRESHOLD: 5,
    CIRCUIT_BREAKER_RESET_TIME: 60000,
  };

  constructor(baseUrl: string, options?: Partial<SSEConnectionOptions>) {
    this.connectionUrl = baseUrl;
    this.options = {
      url: baseUrl,
      withCredentials: true,
      reconnectInterval: SSEService.DEFAULTS.RECONNECT_INTERVAL,
      maxReconnectAttempts: SSEService.DEFAULTS.MAX_RECONNECT_ATTEMPTS,
      heartbeatInterval: SSEService.DEFAULTS.HEARTBEAT_INTERVAL,
      ...options,
    };

    this.state = {
      status: SSEConnectionStatus.DISCONNECTED,
      reconnectAttempts: 0,
    };

    this.eventListeners = new Map();

    // Setup network connectivity monitoring
    this.setupNetworkMonitoring();
  }

  /**
   * Set authentication token for SSE connection
   */
  public setAuthToken(token: string | null): void {
    this.authToken = token;

    // Reconnect with new token if already connected
    if (this.state.status === SSEConnectionStatus.CONNECTED && token !== this.authToken) {
      this.reconnect();
    }
  }

  /**
   * Connect to SSE endpoint
   */
  public connect(options?: Partial<SSEConnectionOptions>): void {
    if (this.state.status === SSEConnectionStatus.CONNECTED) {
      console.warn('[SSE] Already connected');
      return;
    }

    // Check network connectivity first
    if (!this.isOnline) {
      console.warn('[SSE] Cannot connect: No network connectivity');
      this.updateStatus(SSEConnectionStatus.ERROR);
      this.state.error = new Error('No network connectivity');
      return;
    }

    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      console.warn('[SSE] Circuit breaker is open, delaying connection attempt');
      this.scheduleCircuitBreakerReset();
      return;
    }

    // Merge options
    if (options) {
      this.options = { ...this.options, ...options };
    }

    this.updateStatus(SSEConnectionStatus.CONNECTING);
    this.connectionAttempts++;

    try {
      // Build URL with authentication
      const url = this.buildConnectionUrl();

      console.log('[SSE] Attempting connection to:', url.replace(/token=[^&]*/, 'token=***'));

      // Create EventSource with credentials
      this.eventSource = new EventSource(url, {
        withCredentials: this.options.withCredentials,
      });

      this.setupEventListeners();
      this.startHeartbeat();
    } catch (error) {
      console.error('[SSE] Connection initialization failed:', error);
      this.handleError(error as Error, 'INIT_ERROR');
    }
  }

  /**
   * Disconnect from SSE endpoint
   */
  public disconnect(): void {
    this.cleanup();
    this.updateStatus(SSEConnectionStatus.DISCONNECTED);
    this.options.onClose?.();
  }

  /**
   * Reconnect to SSE endpoint with exponential backoff
   */
  public reconnect(): void {
    if (this.state.status === SSEConnectionStatus.RECONNECTING) {
      return;
    }

    // Check network connectivity
    if (!this.isOnline) {
      console.log('[SSE] Delaying reconnection: No network connectivity');
      this.scheduleNetworkCheck();
      return;
    }

    this.cleanup();
    this.updateStatus(SSEConnectionStatus.RECONNECTING);

    // Check reconnect attempts
    if (this.state.reconnectAttempts >= (this.options.maxReconnectAttempts || SSEService.DEFAULTS.MAX_RECONNECT_ATTEMPTS)) {
      console.error('[SSE] Max reconnection attempts reached');
      this.updateStatus(SSEConnectionStatus.ERROR);
      this.state.error = new Error('Max reconnection attempts reached');
      this.triggerCircuitBreaker();
      return;
    }

    this.state.reconnectAttempts++;
    this.options.onReconnect?.(this.state.reconnectAttempts);

    // Calculate exponential backoff delay
    const baseDelay = this.options.reconnectInterval || SSEService.DEFAULTS.RECONNECT_INTERVAL;
    const delay = this.calculateBackoffDelay(baseDelay, this.state.reconnectAttempts);

    console.log(`[SSE] Scheduling reconnection attempt ${this.state.reconnectAttempts} in ${delay}ms`);

    // Schedule reconnection
    this.reconnectTimer = setTimeout(() => {
      console.log(`[SSE] Reconnection attempt ${this.state.reconnectAttempts}/${this.options.maxReconnectAttempts || SSEService.DEFAULTS.MAX_RECONNECT_ATTEMPTS}`);
      this.connect();
    }, delay);
  }

  /**
   * Get current connection status
   */
  public getStatus(): SSEConnectionStatus {
    return this.state.status;
  }

  /**
   * Add event listener for specific event type
   */
  public addEventListener<T = any>(event: SSEEventType, handler: SSEEventHandler<T>): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    this.eventListeners.get(event)!.add(handler as SSEEventHandler);

    // Return unsubscribe function
    return () => {
      this.removeEventListener(event, handler);
    };
  }

  /**
   * Remove event listener
   */
  public removeEventListener<T = any>(event: SSEEventType, handler: SSEEventHandler<T>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(handler as SSEEventHandler);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  /**
   * Send data to server (if supported by backend)
   */
  public send(data: any): void {
    // SSE is typically one-way, but this can be used for sending data via separate HTTP request
    console.warn('[SSE] Send operation not implemented for SSE. Use HTTP requests for bidirectional communication.');
  }

  /**
   * Build connection URL with authentication and query parameters
   */
  private buildConnectionUrl(): string {
    const url = new URL(this.options.url);

    // Add authentication token
    if (this.authToken) {
      url.searchParams.append('token', this.authToken);
    }

    // Add last event ID for resuming
    if (this.state.lastEventId) {
      url.searchParams.append('lastEventId', this.state.lastEventId);
    }

    // Add timestamp to prevent caching
    url.searchParams.append('t', Date.now().toString());

    return url.toString();
  }

  /**
   * Setup EventSource event listeners
   */
  private setupEventListeners(): void {
    if (!this.eventSource) return;

    // Connection opened
    this.eventSource.onopen = () => {
      console.log('[SSE] Connection established');
      this.updateStatus(SSEConnectionStatus.CONNECTED);
      this.state.connectedAt = new Date();
      this.state.reconnectAttempts = 0;
      this.options.onOpen?.();
    };

    // Generic message handler
    this.eventSource.onmessage = (event) => {
      try {
        const message: SSEMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('[SSE] Failed to parse message:', error, event.data);
      }
    };

    // Error handler with enhanced error information
    this.eventSource.onerror = (event) => {
      const errorInfo = this.extractErrorInfo(event);
      console.error('[SSE] Connection error:', errorInfo);

      if (this.eventSource?.readyState === EventSource.CLOSED) {
        this.handleError(new Error('Connection closed by server'), 'CONNECTION_CLOSED');
      } else if (this.eventSource?.readyState === EventSource.CONNECTING) {
        this.handleError(new Error('Failed to establish connection'), 'CONNECTION_FAILED');
      } else {
        this.handleError(new Error(`Connection error: ${errorInfo.type}`), 'UNKNOWN_ERROR');
      }
    };

    // Register specific event type listeners
    this.registerEventTypeListeners();
  }

  /**
   * Register listeners for specific event types
   */
  private registerEventTypeListeners(): void {
    if (!this.eventSource) return;

    // Register all event types
    Object.values(SSEEventType).forEach((eventType) => {
      this.eventSource!.addEventListener(eventType, (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          this.dispatchEvent(eventType as SSEEventType, data);
        } catch (error) {
          console.error(`[SSE] Failed to handle ${eventType} event:`, error);
        }
      });
    });
  }

  /**
   * Handle incoming SSE message
   */
  private handleMessage(message: SSEMessage): void {
    // Update last event ID
    if (message.id) {
      this.state.lastEventId = message.id;
    }

    // Handle heartbeat
    if (message.type === SSEEventType.HEARTBEAT) {
      this.handleHeartbeat();
      return;
    }

    // Dispatch to listeners
    this.dispatchEvent(message.type, message.data);

    // Call generic message handler
    this.options.onMessage?.(message);
  }

  /**
   * Dispatch event to registered listeners
   */
  private dispatchEvent(eventType: SSEEventType, data: any): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners && listeners.size > 0) {
      listeners.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[SSE] Error in event handler for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Handle connection errors with error type classification
   */
  private handleError(error: Error, errorType: string = 'UNKNOWN'): void {
    this.state.error = error;
    this.errorCount++;
    this.lastErrorTime = Date.now();

    // Log structured error information
    console.error('[SSE] Error details:', {
      type: errorType,
      message: error.message,
      status: this.state.status,
      reconnectAttempts: this.state.reconnectAttempts,
      errorCount: this.errorCount,
      isOnline: this.isOnline,
    });

    this.options.onError?.(error);

    // Determine if we should attempt reconnection
    const shouldReconnect = this.shouldAttemptReconnection(errorType);

    if (shouldReconnect) {
      this.reconnect();
    } else {
      console.warn('[SSE] Not attempting reconnection due to error type:', errorType);
      this.updateStatus(SSEConnectionStatus.ERROR);
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    // Set heartbeat timeout
    this.heartbeatTimer = setTimeout(() => {
      console.warn('[SSE] Heartbeat timeout - reconnecting');
      this.reconnect();
    }, SSEService.DEFAULTS.HEARTBEAT_TIMEOUT);
  }

  /**
   * Handle heartbeat message
   */
  private handleHeartbeat(): void {
    this.state.lastHeartbeat = new Date();
    this.startHeartbeat(); // Reset timer
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Update connection status
   */
  private updateStatus(status: SSEConnectionStatus): void {
    const previousStatus = this.state.status;
    this.state.status = status;

    // Log status changes
    if (previousStatus !== status) {
      console.log(`[SSE] Status changed: ${previousStatus} -> ${status}`);
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    // Close EventSource
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();
  }

  /**
   * Setup network connectivity monitoring
   */
  private setupNetworkMonitoring(): void {
    if (typeof window !== 'undefined') {
      // Monitor online/offline events
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));

      // Check initial network state
      this.isOnline = navigator.onLine;
    }
  }

  /**
   * Handle network online event
   */
  private handleOnline(): void {
    console.log('[SSE] Network connectivity restored');
    this.isOnline = true;

    // Attempt to reconnect if we were disconnected
    if (this.state.status === SSEConnectionStatus.ERROR ||
        this.state.status === SSEConnectionStatus.DISCONNECTED) {
      this.connect();
    }
  }

  /**
   * Handle network offline event
   */
  private handleOffline(): void {
    console.log('[SSE] Network connectivity lost');
    this.isOnline = false;

    // Disconnect if connected
    if (this.state.status === SSEConnectionStatus.CONNECTED) {
      this.disconnect();
      this.state.error = new Error('Network connectivity lost');
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(baseDelay: number, attempt: number): number {
    const multiplier = Math.pow(SSEService.DEFAULTS.BACKOFF_MULTIPLIER, attempt - 1);
    const delay = Math.min(
      baseDelay * multiplier,
      SSEService.DEFAULTS.MAX_RECONNECT_INTERVAL
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(): boolean {
    if (this.errorCount < SSEService.DEFAULTS.CIRCUIT_BREAKER_THRESHOLD) {
      return false;
    }

    const timeSinceLastError = Date.now() - this.lastErrorTime;
    return timeSinceLastError < SSEService.DEFAULTS.CIRCUIT_BREAKER_RESET_TIME;
  }

  /**
   * Trigger circuit breaker
   */
  private triggerCircuitBreaker(): void {
    console.warn('[SSE] Circuit breaker triggered after', this.errorCount, 'errors');
    this.updateStatus(SSEConnectionStatus.ERROR);
  }

  /**
   * Schedule circuit breaker reset
   */
  private scheduleCircuitBreakerReset(): void {
    const resetTime = SSEService.DEFAULTS.CIRCUIT_BREAKER_RESET_TIME;
    setTimeout(() => {
      console.log('[SSE] Resetting circuit breaker');
      this.errorCount = 0;
      this.lastErrorTime = 0;

      // Attempt to reconnect if still disconnected
      if (this.state.status === SSEConnectionStatus.ERROR) {
        this.connect();
      }
    }, resetTime);
  }

  /**
   * Schedule network connectivity check
   */
  private scheduleNetworkCheck(): void {
    setTimeout(() => {
      if (this.isOnline && this.state.status !== SSEConnectionStatus.CONNECTED) {
        console.log('[SSE] Network restored, attempting reconnection');
        this.reconnect();
      }
    }, 5000);
  }

  /**
   * Determine if reconnection should be attempted based on error type
   */
  private shouldAttemptReconnection(errorType: string): boolean {
    // Don't reconnect for authentication errors
    if (errorType === 'AUTH_ERROR' || errorType === 'FORBIDDEN') {
      return false;
    }

    // Don't reconnect if circuit breaker is open
    if (this.isCircuitBreakerOpen()) {
      return false;
    }

    // Don't reconnect if offline
    if (!this.isOnline) {
      return false;
    }

    // Reconnect for connection errors
    return this.state.status === SSEConnectionStatus.CONNECTED ||
           this.state.status === SSEConnectionStatus.CONNECTING;
  }

  /**
   * Extract error information from Event
   */
  private extractErrorInfo(event: Event): any {
    const info: any = {
      type: event.type,
      timestamp: new Date().toISOString(),
      readyState: this.eventSource?.readyState,
      readyStateText: this.getReadyStateText(this.eventSource?.readyState),
    };

    // Try to extract additional error details if available
    if (event.target && 'url' in event.target) {
      info.url = (event.target as any).url;
    }

    return info;
  }

  /**
   * Get human-readable ready state text
   */
  private getReadyStateText(readyState?: number): string {
    switch (readyState) {
      case EventSource.CONNECTING:
        return 'CONNECTING';
      case EventSource.OPEN:
        return 'OPEN';
      case EventSource.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Destroy service and cleanup all resources
   */
  public destroy(): void {
    this.disconnect();
    this.eventListeners.clear();

    // Remove network event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this));
      window.removeEventListener('offline', this.handleOffline.bind(this));
    }
  }
}

/**
 * Singleton instance factory
 */
let sseServiceInstance: SSEService | null = null;

export const createSSEService = (
  baseUrl: string,
  options?: Partial<SSEConnectionOptions>
): SSEService => {
  if (!sseServiceInstance) {
    sseServiceInstance = new SSEService(baseUrl, options);
  }
  return sseServiceInstance;
};

export const getSSEService = (): SSEService | null => {
  return sseServiceInstance;
};

export const destroySSEService = (): void => {
  if (sseServiceInstance) {
    sseServiceInstance.destroy();
    sseServiceInstance = null;
  }
};