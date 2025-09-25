import { useEffect, useCallback, useRef } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { apiSlice } from '@/store/api/apiSliceWithHook';

interface SyncConfig {
  channel: string;
  actions: string[];
  debounce?: number;
  enableCrossTab?: boolean;
}

interface SyncMessage {
  type: string;
  payload?: any;
  timestamp: number;
  tabId: string;
  action?: any;
  tags?: string[];
}

/**
 * Custom hook for state synchronization across components and tabs
 * Uses BroadcastChannel API for cross-tab communication
 */
export const useStateSync = (config: SyncConfig) => {
  const dispatch = useAppDispatch();
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>(`tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (!config.enableCrossTab || typeof BroadcastChannel === 'undefined') {
      return;
    }

    // Create broadcast channel
    const channel = new BroadcastChannel(config.channel);
    channelRef.current = channel;

    // Handle incoming messages
    channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      // Ignore messages from the same tab
      if (event.data.tabId === tabIdRef.current) {
        return;
      }

      // Check if action is in the allowed list
      if (!config.actions.includes(event.data.type)) {
        return;
      }

      // Apply debouncing if configured
      if (config.debounce) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          handleSync(event.data);
        }, config.debounce);
      } else {
        handleSync(event.data);
      }
    };

    // Handle sync based on message type
    const handleSync = (data: SyncMessage) => {
      switch (data.type) {
        case 'INVALIDATE_CACHE':
          // Invalidate RTK Query cache tags
          if (data.tags) {
            dispatch(apiSlice.util.invalidateTags(data.tags as any));
          }
          break;

        case 'UPDATE_STATE':
          // Dispatch action to update state
          if (data.action) {
            dispatch(data.action);
          }
          break;

        case 'REFETCH':
          // Reset API state to trigger refetch
          dispatch(apiSlice.util.resetApiState());
          break;

        case 'CLEAR_CACHE':
          // Clear specific cache entries
          if (data.payload && data.payload.endpoint && data.payload.args !== undefined) {
            try {
              // Use invalidateTags instead of updateQueryData for cache clearing
              dispatch(apiSlice.util.invalidateTags([{ type: data.payload.endpoint, id: data.payload.args }]));
            } catch (err) {
              console.error('Failed to clear cache:', err);
            }
          }
          break;

        default:
          // Custom action handling
          if (data.action) {
            dispatch(data.action);
          }
      }
    };

    // BroadcastChannel doesn't have an onerror property in the spec

    return () => {
      clearTimeout(debounceTimerRef.current);
      channel.close();
      channelRef.current = null;
    };
  }, [config.channel, config.actions, config.debounce, config.enableCrossTab, dispatch]);

  // Broadcast message to other tabs
  const broadcast = useCallback((type: string, payload?: any) => {
    if (!channelRef.current) {
      return;
    }

    const message: SyncMessage = {
      type,
      payload,
      timestamp: Date.now(),
      tabId: tabIdRef.current,
    };

    try {
      channelRef.current.postMessage(message);
    } catch (error) {
      console.error('Failed to broadcast message:', error);
    }
  }, []);

  // Broadcast state update
  const broadcastStateUpdate = useCallback((action: any) => {
    broadcast('UPDATE_STATE', { action });
  }, [broadcast]);

  // Broadcast cache invalidation
  const broadcastCacheInvalidation = useCallback((tags: string[]) => {
    broadcast('INVALIDATE_CACHE', { tags });
  }, [broadcast]);

  // Broadcast refetch request
  const broadcastRefetch = useCallback(() => {
    broadcast('REFETCH');
  }, [broadcast]);

  // Broadcast cache clear
  const broadcastCacheClear = useCallback((endpoint: string, args: any) => {
    broadcast('CLEAR_CACHE', { endpoint, args });
  }, [broadcast]);

  return {
    broadcast,
    broadcastStateUpdate,
    broadcastCacheInvalidation,
    broadcastRefetch,
    broadcastCacheClear,
    tabId: tabIdRef.current,
    isConnected: !!channelRef.current,
  };
};

/**
 * Hook for syncing specific Redux actions across tabs
 */
export const useSyncedActions = (actions: string[]) => {
  const { broadcastStateUpdate } = useStateSync({
    channel: 'gloria-state-sync',
    actions,
    enableCrossTab: true,
    debounce: 100,
  });

  return {
    syncAction: (action: any) => {
      if (actions.includes(action.type)) {
        broadcastStateUpdate(action);
      }
    },
  };
};

/**
 * Hook for syncing RTK Query cache across tabs
 */
export const useSyncedCache = (tags: string[]) => {
  const { broadcastCacheInvalidation } = useStateSync({
    channel: 'gloria-cache-sync',
    actions: ['INVALIDATE_CACHE'],
    enableCrossTab: true,
  });

  return {
    invalidateAndSync: (tagsToInvalidate: string[]) => {
      const matchingTags = tagsToInvalidate.filter(tag => tags.includes(tag));
      if (matchingTags.length > 0) {
        broadcastCacheInvalidation(matchingTags);
      }
    },
  };
};