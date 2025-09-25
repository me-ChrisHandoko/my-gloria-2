'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { wsClient, WebSocketClient, ConnectionState, WebSocketConfig, WebSocketError } from '@/lib/websocket/client';

export interface WebSocketContextValue {
  client: WebSocketClient;
  connectionState: ConnectionState;
  isConnected: boolean;
  error: WebSocketError | null;
  connect: (token?: string) => Promise<void>;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  request: <T = any>(event: string, data?: any, timeout?: number) => Promise<T>;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  sendToRoom: (room: string, data: any) => void;
  metrics: ReturnType<WebSocketClient['getMetrics']>;
}

interface WebSocketProviderProps {
  children: React.ReactNode;
  config?: WebSocketConfig;
  autoConnect?: boolean;
  token?: string;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

/**
 * WebSocket Provider Component
 */
export function WebSocketProvider({
  children,
  config,
  autoConnect = false,
  token
}: WebSocketProviderProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<WebSocketError | null>(null);
  const [metrics, setMetrics] = useState(wsClient.getMetrics());
  const clientRef = useRef<WebSocketClient>(wsClient);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Initialize client with config if provided
  useEffect(() => {
    if (config) {
      // Note: In production, you might want to create a new instance
      // instead of using the singleton if config differs
      console.warn('[WebSocket] Custom config provided but using singleton instance');
    }
  }, [config]);

  // Setup event listeners
  useEffect(() => {
    const client = clientRef.current;

    const handleStateChange = ({ newState }: { newState: ConnectionState }) => {
      setConnectionState(newState);

      // Clear error on successful connection
      if (newState === ConnectionState.CONNECTED) {
        setError(null);
        reconnectAttemptsRef.current = 0;
      }
    };

    const handleError = (err: WebSocketError) => {
      setError(err);
      console.error('[WebSocket Provider] Error:', err);
    };

    const handleConnectionError = (err: WebSocketError) => {
      setError(err);

      // Auto-reconnect logic
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

        console.log(`[WebSocket Provider] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

        setTimeout(() => {
          client.connect(token).catch((error) => {
            console.error('[WebSocket Provider] Reconnection failed:', error);
          });
        }, delay);
      }
    };

    const handleConnected = () => {
      console.log('[WebSocket Provider] Connected successfully');
      setError(null);
      reconnectAttemptsRef.current = 0;
    };

    const handleDisconnected = (reason: string) => {
      console.log('[WebSocket Provider] Disconnected:', reason);

      // Only auto-reconnect for certain disconnect reasons
      const autoReconnectReasons = ['io server disconnect', 'transport close', 'transport error'];
      if (autoReconnectReasons.includes(reason) && reconnectAttemptsRef.current < maxReconnectAttempts) {
        handleConnectionError({
          message: `Disconnected: ${reason}`,
          type: 'disconnect',
        });
      }
    };

    const updateMetrics = () => {
      setMetrics(client.getMetrics());
    };

    // Attach event listeners
    client.on('state_change', handleStateChange);
    client.on('error', handleError);
    client.on('connection_error', handleConnectionError);
    client.on('connected', handleConnected);
    client.on('disconnected', handleDisconnected);
    client.on('message', updateMetrics);
    client.on('message_sent', updateMetrics);

    // Update initial state
    setConnectionState(client.getState());

    // Update metrics periodically
    const metricsInterval = setInterval(updateMetrics, 5000);

    // Auto-connect if enabled
    if (autoConnect && client.getState() === ConnectionState.DISCONNECTED) {
      client.connect(token).catch((error) => {
        console.error('[WebSocket Provider] Initial connection failed:', error);
      });
    }

    // Cleanup
    return () => {
      client.off('state_change', handleStateChange);
      client.off('error', handleError);
      client.off('connection_error', handleConnectionError);
      client.off('connected', handleConnected);
      client.off('disconnected', handleDisconnected);
      client.off('message', updateMetrics);
      client.off('message_sent', updateMetrics);
      clearInterval(metricsInterval);

      // Optionally disconnect on unmount
      // client.disconnect();
    };
  }, [autoConnect, token]);

  // Connection methods
  const connect = useCallback(async (authToken?: string) => {
    try {
      setError(null);
      await clientRef.current.connect(authToken || token);
    } catch (err) {
      const error: WebSocketError = {
        message: err instanceof Error ? err.message : 'Connection failed',
        type: 'connection_error',
        details: err,
      };
      setError(error);
      throw err;
    }
  }, [token]);

  const disconnect = useCallback(() => {
    clientRef.current.disconnect();
    reconnectAttemptsRef.current = 0;
  }, []);

  // Message methods
  const emit = useCallback((event: string, data?: any) => {
    clientRef.current.emit(event, data);
  }, []);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    clientRef.current.on(event, callback);
  }, []);

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    clientRef.current.off(event, callback);
  }, []);

  const request = useCallback(<T = any>(event: string, data?: any, timeout?: number) => {
    return clientRef.current.request<T>(event, data, timeout);
  }, []);

  // Room methods
  const joinRoom = useCallback((room: string) => {
    clientRef.current.joinRoom(room);
  }, []);

  const leaveRoom = useCallback((room: string) => {
    clientRef.current.leaveRoom(room);
  }, []);

  const sendToRoom = useCallback((room: string, data: any) => {
    clientRef.current.sendToRoom(room, data);
  }, []);

  const value: WebSocketContextValue = {
    client: clientRef.current,
    connectionState,
    isConnected: connectionState === ConnectionState.CONNECTED,
    error,
    connect,
    disconnect,
    emit,
    on,
    off,
    request,
    joinRoom,
    leaveRoom,
    sendToRoom,
    metrics,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

/**
 * Hook to use WebSocket context
 */
export function useWebSocket() {
  const context = useContext(WebSocketContext);

  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }

  return context;
}

/**
 * Hook for WebSocket connection status
 */
export function useWebSocketConnection() {
  const { connectionState, isConnected, error, connect, disconnect } = useWebSocket();

  return {
    connectionState,
    isConnected,
    error,
    connect,
    disconnect,
  };
}

/**
 * Hook for WebSocket events
 */
export function useWebSocketEvent<T = any>(
  event: string,
  callback: (data: T) => void,
  deps: React.DependencyList = []
) {
  const { on, off } = useWebSocket();

  useEffect(() => {
    on(event, callback);

    return () => {
      off(event, callback);
    };
  }, [event, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Hook for WebSocket rooms
 */
export function useWebSocketRoom(roomName: string) {
  const { joinRoom, leaveRoom, sendToRoom, on, off } = useWebSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const [members, setMembers] = useState<string[]>([]);

  useEffect(() => {
    // Join room on mount
    joinRoom(roomName);

    // Setup room event listeners
    const handleRoomMessage = (data: { room: string; message: any }) => {
      if (data.room === roomName) {
        setMessages((prev) => [...prev, data.message]);
      }
    };

    const handleRoomMembers = (data: { room: string; members: string[] }) => {
      if (data.room === roomName) {
        setMembers(data.members);
      }
    };

    on('room_message', handleRoomMessage);
    on('room_members', handleRoomMembers);

    // Leave room on unmount
    return () => {
      leaveRoom(roomName);
      off('room_message', handleRoomMessage);
      off('room_members', handleRoomMembers);
    };
  }, [roomName]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback((message: any) => {
    sendToRoom(roomName, message);
  }, [roomName, sendToRoom]);

  return {
    messages,
    members,
    sendMessage,
  };
}

/**
 * Connection status display component
 */
export function WebSocketStatus() {
  const { connectionState, error } = useWebSocketConnection();

  const getStatusColor = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return 'bg-green-500';
      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        return 'bg-yellow-500';
      case ConnectionState.ERROR:
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return 'Connected';
      case ConnectionState.CONNECTING:
        return 'Connecting...';
      case ConnectionState.RECONNECTING:
        return 'Reconnecting...';
      case ConnectionState.ERROR:
        return error?.message || 'Connection Error';
      case ConnectionState.DISCONNECTED:
        return 'Disconnected';
      default:
        return connectionState;
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`} />
      <span className="text-muted-foreground">{getStatusText()}</span>
    </div>
  );
}