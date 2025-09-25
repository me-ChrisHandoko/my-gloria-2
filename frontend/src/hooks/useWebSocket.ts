/**
 * useWebSocket Hook
 * Production-ready React hook for WebSocket connections with Clerk authentication
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { wsClient, ConnectionState, WebSocketClient } from '@/lib/websocket/client';
import { toast } from 'sonner';

/**
 * WebSocket event data types
 */
export interface NotificationData {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface UserStatusData {
  userId: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen?: number;
  metadata?: Record<string, any>;
}

export interface WorkflowUpdateData {
  workflowId: string;
  instanceId: string;
  status: 'started' | 'running' | 'completed' | 'failed' | 'paused';
  progress?: number;
  currentStep?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface SystemAnnouncementData {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  startTime: number;
  endTime?: number;
  affectedServices?: string[];
}

export interface PresenceUpdateData {
  room: string;
  users: Array<{
    userId: string;
    username: string;
    status: string;
    joinedAt: number;
  }>;
  totalCount: number;
}

/**
 * Hook options
 */
export interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectOnFocus?: boolean;
  reconnectOnOnline?: boolean;
  enableHeartbeat?: boolean;
  heartbeatInterval?: number;
  onConnectionChange?: (state: ConnectionState) => void;
  enableLogging?: boolean;
  room?: string | string[];
}

/**
 * Hook return type
 */
export interface UseWebSocketReturn {
  state: ConnectionState;
  isConnected: boolean;
  isReconnecting: boolean;
  error: Error | null;
  socketId: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  emit: (event: string, data?: any, callback?: (response: any) => void) => void;
  on: (event: string, handler: (...args: any[]) => void) => () => void;
  off: (event: string, handler?: (...args: any[]) => void) => void;
  request: <T = any>(event: string, data?: any, timeout?: number) => Promise<T>;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  sendToRoom: (room: string, data: any) => void;
  metrics: {
    messagesReceived: number;
    messagesSent: number;
    bytesReceived: number;
    bytesSent: number;
    uptime: number;
    reconnectAttempts: number;
  };
}

/**
 * Production-ready WebSocket Hook with Clerk Authentication
 */
export const useWebSocket = (
  endpoint: string = '/',
  options: UseWebSocketOptions = {}
): UseWebSocketReturn => {
  const {
    autoConnect = true,
    reconnectOnFocus = true,
    reconnectOnOnline = true,
    enableHeartbeat = true,
    heartbeatInterval = 30000,
    onConnectionChange,
    enableLogging = process.env.NODE_ENV === 'development',
    room,
  } = options;

  const { getToken, isSignedIn } = useAuth();
  const dispatch = useAppDispatch();

  const [state, setState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<Error | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    messagesReceived: 0,
    messagesSent: 0,
    bytesReceived: 0,
    bytesSent: 0,
    uptime: 0,
    reconnectAttempts: 0,
  });

  const clientRef = useRef<WebSocketClient>(wsClient);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const metricsTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Log helper
   */
  const log = useCallback((message: string, ...args: any[]) => {
    if (enableLogging) {
      console.log(`[useWebSocket] ${message}`, ...args);
    }
  }, [enableLogging]);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(async () => {
    if (!isSignedIn) {
      log('User not signed in, skipping WebSocket connection');
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }

      log('Connecting to WebSocket...');
      await clientRef.current.connect(token);
    } catch (err) {
      log('Failed to connect:', err);
      setError(err as Error);
    }
  }, [isSignedIn, getToken, log]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    log('Disconnecting from WebSocket...');
    clientRef.current.disconnect();
  }, [log]);

  /**
   * Emit event to server
   */
  const emit = useCallback((event: string, data?: any, callback?: (response: any) => void) => {
    clientRef.current.emit(event, data, callback);
  }, []);

  /**
   * Add event listener
   */
  const on = useCallback((event: string, handler: (...args: any[]) => void): (() => void) => {
    clientRef.current.on(event, handler);
    return () => {
      clientRef.current.off(event, handler);
    };
  }, []);

  /**
   * Remove event listener
   */
  const off = useCallback((event: string, handler?: (...args: any[]) => void) => {
    clientRef.current.off(event, handler);
  }, []);

  /**
   * Request-response pattern
   */
  const request = useCallback(<T = any>(event: string, data?: any, timeout?: number): Promise<T> => {
    return clientRef.current.request<T>(event, data, timeout);
  }, []);

  /**
   * Join room
   */
  const joinRoom = useCallback((roomName: string) => {
    clientRef.current.joinRoom(roomName);
  }, []);

  /**
   * Leave room
   */
  const leaveRoom = useCallback((roomName: string) => {
    clientRef.current.leaveRoom(roomName);
  }, []);

  /**
   * Send message to room
   */
  const sendToRoom = useCallback((roomName: string, data: any) => {
    clientRef.current.sendToRoom(roomName, data);
  }, []);

  /**
   * Setup heartbeat
   */
  const setupHeartbeat = useCallback(() => {
    if (!enableHeartbeat) return;

    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }

    heartbeatTimerRef.current = setInterval(() => {
      if (clientRef.current.isConnected()) {
        emit('heartbeat', { timestamp: Date.now() });
      }
    }, heartbeatInterval);
  }, [enableHeartbeat, heartbeatInterval, emit]);

  /**
   * Setup default event handlers
   */
  useEffect(() => {
    const client = clientRef.current;

    // State change handler
    const handleStateChange = ({ newState }: { newState: ConnectionState }) => {
      log('State changed:', newState);
      setState(newState);
      setError(null);
      onConnectionChange?.(newState);

      if (newState === ConnectionState.CONNECTED) {
        setSocketId(client.getSocketId());
        setupHeartbeat();

        // Join rooms if specified
        if (room) {
          const rooms = Array.isArray(room) ? room : [room];
          rooms.forEach(r => joinRoom(r));
        }
      } else {
        setSocketId(null);
      }
    };

    // Error handler
    const handleError = (err: any) => {
      log('WebSocket error:', err);
      setError(err);
      toast.error(`WebSocket error: ${err.message || 'Unknown error'}`);
    };

    // Notification handler
    const handleNotification = (data: NotificationData) => {
      log('Received notification:', data);

      // Show toast notification
      switch (data.type) {
        case 'success':
          toast.success(data.message);
          break;
        case 'error':
          toast.error(data.message);
          break;
        case 'warning':
          toast(data.message, { icon: '⚠️' });
          break;
        default:
          toast(data.message);
      }

      // Dispatch to Redux store
      dispatch({
        type: 'notifications/addNotification',
        payload: data,
      });
    };

    // User status handler
    const handleUserStatus = (data: UserStatusData) => {
      log('User status update:', data);
      dispatch({
        type: 'users/updateUserStatus',
        payload: data,
      });
    };

    // Workflow update handler
    const handleWorkflowUpdate = (data: WorkflowUpdateData) => {
      log('Workflow update:', data);

      if (data.status === 'completed') {
        toast.success(`Workflow ${data.workflowId} completed successfully`);
      } else if (data.status === 'failed') {
        toast.error(`Workflow ${data.workflowId} failed: ${data.error}`);
      }

      dispatch({
        type: 'workflows/updateWorkflow',
        payload: data,
      });
    };

    // System announcement handler
    const handleSystemAnnouncement = (data: SystemAnnouncementData) => {
      log('System announcement:', data);

      const icon = data.severity === 'critical' ? '🚨' :
                   data.severity === 'warning' ? '⚠️' : 'ℹ️';

      toast(data.message, {
        icon,
        duration: data.severity === 'critical' ? Infinity : 10000,
      });

      dispatch({
        type: 'system/addAnnouncement',
        payload: data,
      });
    };

    // Presence update handler
    const handlePresenceUpdate = (data: PresenceUpdateData) => {
      log('Presence update:', data);
      dispatch({
        type: 'presence/updateRoom',
        payload: data,
      });
    };

    // Add event listeners
    client.on('state_change', handleStateChange);
    client.on('error', handleError);
    client.on('notification', handleNotification);
    client.on('user_status', handleUserStatus);
    client.on('workflow_update', handleWorkflowUpdate);
    client.on('system_announcement', handleSystemAnnouncement);
    client.on('presence_update', handlePresenceUpdate);

    // Cleanup
    return () => {
      client.off('state_change', handleStateChange);
      client.off('error', handleError);
      client.off('notification', handleNotification);
      client.off('user_status', handleUserStatus);
      client.off('workflow_update', handleWorkflowUpdate);
      client.off('system_announcement', handleSystemAnnouncement);
      client.off('presence_update', handlePresenceUpdate);
    };
  }, [dispatch, log, onConnectionChange, room, joinRoom, setupHeartbeat]);

  /**
   * Update metrics periodically
   */
  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(clientRef.current.getMetrics());
    };

    // Update immediately
    updateMetrics();

    // Update every 5 seconds
    metricsTimerRef.current = setInterval(updateMetrics, 5000);

    return () => {
      if (metricsTimerRef.current) {
        clearInterval(metricsTimerRef.current);
      }
    };
  }, []);

  /**
   * Handle page visibility change
   */
  useEffect(() => {
    if (!reconnectOnFocus) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !clientRef.current.isConnected()) {
        log('Page became visible, reconnecting...');
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [reconnectOnFocus, connect, log]);

  /**
   * Handle online/offline events
   */
  useEffect(() => {
    if (!reconnectOnOnline) return;

    const handleOnline = () => {
      log('Network came online, reconnecting...');
      connect();
    };

    const handleOffline = () => {
      log('Network went offline');
      setState(ConnectionState.DISCONNECTED);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [reconnectOnOnline, connect, log]);

  /**
   * Auto-connect on mount if signed in
   */
  useEffect(() => {
    if (autoConnect && isSignedIn) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
      if (metricsTimerRef.current) {
        clearInterval(metricsTimerRef.current);
      }
    };
  }, [autoConnect, isSignedIn]); // Don't include connect to avoid loops

  return {
    state,
    isConnected: state === ConnectionState.CONNECTED,
    isReconnecting: state === ConnectionState.RECONNECTING,
    error,
    socketId,
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
};

/**
 * Convenience hook for chat/messaging
 */
export const useWebSocketChat = (
  roomName: string,
  onMessage?: (message: any) => void
) => {
  const ws = useWebSocket('/chat', { room: roomName });

  useEffect(() => {
    if (!onMessage) return;

    const unsubscribe = ws.on('room_message', (data: { room: string; message: any }) => {
      if (data.room === roomName) {
        onMessage(data.message);
      }
    });

    return unsubscribe;
  }, [ws, roomName, onMessage]);

  const sendMessage = useCallback((message: any) => {
    ws.sendToRoom(roomName, message);
  }, [ws, roomName]);

  return {
    ...ws,
    sendMessage,
  };
};

/**
 * Convenience hook for real-time collaboration
 */
export const useWebSocketCollaboration = (
  documentId: string,
  onUpdate?: (update: any) => void
) => {
  const ws = useWebSocket('/collaboration', { room: `doc:${documentId}` });

  useEffect(() => {
    if (!onUpdate) return;

    const unsubscribe = ws.on('document_update', onUpdate);
    return unsubscribe;
  }, [ws, onUpdate]);

  const sendUpdate = useCallback((update: any) => {
    ws.emit('document_update', { documentId, update });
  }, [ws, documentId]);

  return {
    ...ws,
    sendUpdate,
  };
};