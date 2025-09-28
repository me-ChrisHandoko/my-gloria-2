import { useEffect, useCallback, useRef } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { setUser, setPermissions, setRoles, clearAuth } from '@/store/slices/authSlice';
import { addNotification } from '@/store/slices/notificationSlice';
import { api } from '@/store/api/apiSliceWithHook';

/**
 * Message types for cross-tab communication
 */
export enum CrossTabMessageType {
  AUTH_UPDATE = 'AUTH_UPDATE',
  AUTH_LOGOUT = 'AUTH_LOGOUT',
  CACHE_INVALIDATE = 'CACHE_INVALIDATE',
  NOTIFICATION = 'NOTIFICATION',
  STATE_SYNC = 'STATE_SYNC',
  HEARTBEAT = 'HEARTBEAT',
  TAB_CLOSED = 'TAB_CLOSED',
  FORCE_REFRESH = 'FORCE_REFRESH',
}

/**
 * Cross-tab message structure
 */
export interface CrossTabMessage {
  type: CrossTabMessageType;
  payload?: any;
  timestamp: number;
  tabId: string;
  origin?: string;
}

/**
 * Cross-tab sync configuration
 */
export interface CrossTabSyncConfig {
  channelName?: string;
  heartbeatInterval?: number;
  enableHeartbeat?: boolean;
  onMessage?: (message: CrossTabMessage) => void;
  debug?: boolean;
}

/**
 * Hook for cross-tab synchronization
 */
export const useCrossTabSync = (config?: CrossTabSyncConfig) => {
  const dispatch = useAppDispatch();
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>(`tab-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isLeaderRef = useRef<boolean>(false);
  const tabsRef = useRef<Set<string>>(new Set());

  const channelName = config?.channelName || 'gloria-sync';
  const heartbeatInterval = config?.heartbeatInterval || 30000; // 30 seconds
  const enableHeartbeat = config?.enableHeartbeat ?? true;
  const debug = config?.debug ?? false;

  /**
   * Log debug messages
   */
  const log = useCallback((...args: any[]) => {
    if (debug) {
      console.log(`[CrossTabSync:${tabIdRef.current}]`, ...args);
    }
  }, [debug]);

  /**
   * Handle incoming messages
   */
  const handleMessage = useCallback((event: MessageEvent<CrossTabMessage>) => {
    const message = event.data;

    // Ignore own messages
    if (message.tabId === tabIdRef.current) {
      return;
    }

    log('Received message:', message);

    // Custom message handler
    if (config?.onMessage) {
      config.onMessage(message);
    }

    // Handle message types
    switch (message.type) {
      case CrossTabMessageType.AUTH_UPDATE:
        if (message.payload) {
          dispatch(setUser(message.payload.user));
          if (message.payload.permissions) {
            dispatch(setPermissions(message.payload.permissions));
          }
          if (message.payload.roles) {
            dispatch(setRoles(message.payload.roles));
          }
        }
        break;

      case CrossTabMessageType.AUTH_LOGOUT:
        dispatch(clearAuth());
        // Optionally redirect to login
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/sign-')) {
          window.location.href = '/sign-in';
        }
        break;

      case CrossTabMessageType.CACHE_INVALIDATE:
        if (message.payload?.tags) {
          dispatch(api.util.invalidateTags(message.payload.tags));
        }
        break;

      case CrossTabMessageType.NOTIFICATION:
        if (message.payload) {
          dispatch(addNotification(message.payload));
        }
        break;

      case CrossTabMessageType.HEARTBEAT:
        // Track active tabs
        tabsRef.current.add(message.tabId);
        // Check if we should become leader
        checkLeadership();
        break;

      case CrossTabMessageType.TAB_CLOSED:
        // Remove tab from active list
        tabsRef.current.delete(message.tabId);
        // Check if we should become leader
        checkLeadership();
        break;

      case CrossTabMessageType.FORCE_REFRESH:
        // Force refresh the page
        window.location.reload();
        break;

      case CrossTabMessageType.STATE_SYNC:
        // Sync Redux state (implement based on your needs)
        if (message.payload?.state) {
          // Handle state synchronization
          log('State sync received:', message.payload.state);
        }
        break;
    }
  }, [dispatch, config, log]);

  /**
   * Check if this tab should become the leader
   */
  const checkLeadership = useCallback(() => {
    const activeTabs = Array.from(tabsRef.current);
    activeTabs.push(tabIdRef.current);
    activeTabs.sort();

    const shouldBeLeader = activeTabs[0] === tabIdRef.current;

    if (shouldBeLeader !== isLeaderRef.current) {
      isLeaderRef.current = shouldBeLeader;
      log(`Leadership changed: ${shouldBeLeader ? 'Leader' : 'Follower'}`);

      if (shouldBeLeader) {
        // Perform leader-specific tasks
        onBecomeLeader();
      }
    }
  }, [log]);

  /**
   * Handle becoming the leader tab
   */
  const onBecomeLeader = useCallback(() => {
    // Leader-specific initialization
    // For example, start WebSocket connections, etc.
    log('Became leader tab');
  }, [log]);

  /**
   * Broadcast a message to other tabs
   */
  const broadcast = useCallback((
    type: CrossTabMessageType,
    payload?: any,
    includeOrigin = false
  ) => {
    if (!channelRef.current) {
      log('Channel not initialized');
      return;
    }

    const message: CrossTabMessage = {
      type,
      payload,
      timestamp: Date.now(),
      tabId: tabIdRef.current,
      origin: includeOrigin ? window.location.href : undefined,
    };

    try {
      channelRef.current.postMessage(message);
      log('Broadcasted message:', message);
    } catch (error) {
      console.error('Failed to broadcast message:', error);
    }
  }, [log]);

  /**
   * Send heartbeat
   */
  const sendHeartbeat = useCallback(() => {
    broadcast(CrossTabMessageType.HEARTBEAT);
  }, [broadcast]);

  /**
   * Initialize BroadcastChannel
   */
  useEffect(() => {
    // Check if BroadcastChannel is supported
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
      log('BroadcastChannel not supported');
      return;
    }

    try {
      // Create channel
      const channel = new BroadcastChannel(channelName);
      channelRef.current = channel;

      // Set up message handler
      channel.onmessage = handleMessage;

      log('Channel initialized');

      // Send initial heartbeat
      if (enableHeartbeat) {
        sendHeartbeat();

        // Set up heartbeat interval
        heartbeatIntervalRef.current = setInterval(sendHeartbeat, heartbeatInterval);
      }

      // Check initial leadership
      checkLeadership();

    } catch (error) {
      console.error('Failed to create BroadcastChannel:', error);
    }

    // Cleanup
    return () => {
      // Send tab closed message
      if (channelRef.current) {
        broadcast(CrossTabMessageType.TAB_CLOSED);
        channelRef.current.close();
        channelRef.current = null;
      }

      // Clear heartbeat interval
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      log('Channel closed');
    };
  }, [channelName, enableHeartbeat, heartbeatInterval, handleMessage, sendHeartbeat, checkLeadership, broadcast, log]);

  /**
   * Broadcast auth update
   */
  const broadcastAuthUpdate = useCallback((user: any, permissions?: string[], roles?: string[]) => {
    broadcast(CrossTabMessageType.AUTH_UPDATE, {
      user,
      permissions,
      roles,
    });
  }, [broadcast]);

  /**
   * Broadcast logout
   */
  const broadcastLogout = useCallback(() => {
    broadcast(CrossTabMessageType.AUTH_LOGOUT);
  }, [broadcast]);

  /**
   * Broadcast cache invalidation
   */
  const broadcastCacheInvalidation = useCallback((tags: string[]) => {
    broadcast(CrossTabMessageType.CACHE_INVALIDATE, { tags });
  }, [broadcast]);

  /**
   * Broadcast notification
   */
  const broadcastNotification = useCallback((notification: any) => {
    broadcast(CrossTabMessageType.NOTIFICATION, notification);
  }, [broadcast]);

  /**
   * Force refresh all tabs
   */
  const forceRefreshAllTabs = useCallback(() => {
    broadcast(CrossTabMessageType.FORCE_REFRESH);
    // Also refresh current tab
    setTimeout(() => window.location.reload(), 100);
  }, [broadcast]);

  /**
   * Get tab info
   */
  const getTabInfo = useCallback(() => ({
    tabId: tabIdRef.current,
    isLeader: isLeaderRef.current,
    activeTabs: tabsRef.current.size + 1, // +1 for current tab
  }), []);

  return {
    broadcast,
    broadcastAuthUpdate,
    broadcastLogout,
    broadcastCacheInvalidation,
    broadcastNotification,
    forceRefreshAllTabs,
    getTabInfo,
    isLeader: isLeaderRef.current,
    tabId: tabIdRef.current,
  };
};

/**
 * Fallback implementation using localStorage for older browsers
 */
export const useCrossTabSyncFallback = (config?: CrossTabSyncConfig) => {
  const dispatch = useAppDispatch();
  const tabIdRef = useRef<string>(`tab-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);

  const storageKey = config?.channelName || 'gloria-sync';

  /**
   * Handle storage events
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) return;

      try {
        const message: CrossTabMessage = JSON.parse(event.newValue);

        // Ignore own messages
        if (message.tabId === tabIdRef.current) return;

        // Handle message (similar to BroadcastChannel implementation)
        if (config?.onMessage) {
          config.onMessage(message);
        }

        // Dispatch Redux actions based on message type
        // ... (similar logic as above)

      } catch (error) {
        console.error('Failed to parse storage message:', error);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [config, dispatch, storageKey]);

  /**
   * Broadcast using localStorage
   */
  const broadcast = useCallback((
    type: CrossTabMessageType,
    payload?: any
  ) => {
    if (typeof window === 'undefined') return;

    const message: CrossTabMessage = {
      type,
      payload,
      timestamp: Date.now(),
      tabId: tabIdRef.current,
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(message));
      // Clear after a short delay to prevent storage bloat
      setTimeout(() => {
        localStorage.removeItem(storageKey);
      }, 100);
    } catch (error) {
      console.error('Failed to broadcast via localStorage:', error);
    }
  }, [storageKey]);

  // Return similar interface as the main hook
  return {
    broadcast,
    tabId: tabIdRef.current,
    isLeader: false, // Simplified - no leader election in fallback
  };
};

/**
 * Auto-select the appropriate implementation
 */
export const useCrossTabSyncAuto = (config?: CrossTabSyncConfig) => {
  const hasBroadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window;

  if (hasBroadcastChannel) {
    return useCrossTabSync(config);
  } else {
    return useCrossTabSyncFallback(config);
  }
};