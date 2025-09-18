/**
 * React hooks for cache management
 * Production-ready cache utilities for Gloria System
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { cacheManager } from '@/lib/cache/CacheManager';
import {
  CacheConfig,
  CacheStrategy,
  CacheStats,
  CACHE_TTL,
  CachePriority,
} from '@/lib/cache/types';

/**
 * Hook for managing cached data
 */
export function useCache<T>(
  key: string,
  fetcher?: () => Promise<T>,
  config?: Partial<CacheConfig>
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load from cache
  const loadFromCache = useCallback(async () => {
    try {
      const cachedData = await cacheManager.get<T>(key, config);
      if (cachedData !== null) {
        setData(cachedData);
        setIsStale(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Cache load error:', err);
      return false;
    }
  }, [key, config]);

  // Fetch and cache data
  const fetchAndCache = useCallback(async () => {
    if (!fetcher) return;

    setLoading(true);
    setError(null);

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const freshData = await fetcher();

      // Cache the fresh data
      await cacheManager.set(key, freshData, config);

      setData(freshData);
      setIsStale(false);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled
      }
      setError(err as Error);

      // Try to use stale cache on error
      const staleData = await cacheManager.get<T>(key, config);
      if (staleData !== null) {
        setData(staleData);
        setIsStale(true);
      }
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, config]);

  // Refresh data
  const refresh = useCallback(async () => {
    await fetchAndCache();
  }, [fetchAndCache]);

  // Invalidate cache
  const invalidate = useCallback(async () => {
    await cacheManager.delete(key);
    setData(null);
    setIsStale(false);
  }, [key]);

  // Update cache
  const updateCache = useCallback(async (newData: T) => {
    await cacheManager.set(key, newData, config);
    setData(newData);
    setIsStale(false);
  }, [key, config]);

  // Initial load
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!mounted) return;

      const hasCache = await loadFromCache();

      if (!hasCache && fetcher) {
        await fetchAndCache();
      }
    };

    load();

    return () => {
      mounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    isStale,
    refresh,
    invalidate,
    updateCache,
  };
}

/**
 * Hook for optimistic updates with cache
 */
export function useOptimisticCache<T>(
  key: string,
  config?: Partial<CacheConfig>
) {
  const [optimisticData, setOptimisticData] = useState<T | null>(null);
  const [isOptimistic, setIsOptimistic] = useState(false);
  const rollbackDataRef = useRef<T | null>(null);

  // Optimistic update
  const optimisticUpdate = useCallback(async (
    updater: (current: T | null) => T,
    onSuccess?: (data: T) => Promise<void>,
    onError?: (error: Error) => void
  ) => {
    try {
      // Get current data
      const currentData = await cacheManager.get<T>(key, config);
      rollbackDataRef.current = currentData;

      // Apply optimistic update
      const newData = updater(currentData);
      setOptimisticData(newData);
      setIsOptimistic(true);

      // Update cache optimistically
      await cacheManager.set(key, newData, {
        ...config,
        ttl: CACHE_TTL.SHORT, // Short TTL for optimistic data
      });

      // Execute actual update
      if (onSuccess) {
        await onSuccess(newData);
        // Update cache with longer TTL after success
        await cacheManager.set(key, newData, config);
      }

      setIsOptimistic(false);
    } catch (error) {
      // Rollback on error
      if (rollbackDataRef.current !== null) {
        await cacheManager.set(key, rollbackDataRef.current, config);
        setOptimisticData(rollbackDataRef.current);
      }
      setIsOptimistic(false);

      if (onError) {
        onError(error as Error);
      }
    }
  }, [key, config]);

  return {
    optimisticData,
    isOptimistic,
    optimisticUpdate,
  };
}

/**
 * Hook for cache-first data fetching with background refresh
 */
export function useCacheFirst<T>(
  key: string,
  fetcher: () => Promise<T>,
  config?: Partial<CacheConfig> & { refreshInterval?: number }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load from cache immediately
  useEffect(() => {
    const loadCache = async () => {
      const cachedData = await cacheManager.get<T>(key, config);
      if (cachedData !== null) {
        setData(cachedData);
        setLoading(false);
      }
    };

    loadCache();
  }, [key]);

  // Background refresh
  const backgroundRefresh = useCallback(async () => {
    setBackgroundRefreshing(true);
    try {
      const freshData = await fetcher();
      await cacheManager.set(key, freshData, config);
      setData(freshData);
    } catch (error) {
      console.error('Background refresh failed:', error);
    } finally {
      setBackgroundRefreshing(false);
    }
  }, [key, fetcher, config]);

  // Initial fetch if no cache
  useEffect(() => {
    const initialFetch = async () => {
      const cachedData = await cacheManager.get<T>(key, config);

      if (cachedData === null) {
        try {
          const freshData = await fetcher();
          await cacheManager.set(key, freshData, config);
          setData(freshData);
        } catch (error) {
          console.error('Initial fetch failed:', error);
        }
      }

      setLoading(false);
    };

    initialFetch();
  }, [key, fetcher]);

  // Setup refresh interval
  useEffect(() => {
    if (config?.refreshInterval) {
      intervalRef.current = setInterval(() => {
        backgroundRefresh();
      }, config.refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [config?.refreshInterval, backgroundRefresh]);

  return {
    data,
    loading,
    backgroundRefreshing,
    refresh: backgroundRefresh,
  };
}

/**
 * Hook for managing cache statistics
 */
export function useCacheStats() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [detailedStats, setDetailedStats] = useState<any>(null);

  useEffect(() => {
    const updateStats = async () => {
      const globalStats = cacheManager.getStats();
      const detailed = await cacheManager.getDetailedStats();

      setStats(globalStats);
      setDetailedStats(detailed);
    };

    // Initial load
    updateStats();

    // Update every 10 seconds
    const interval = setInterval(updateStats, 10000);

    // Listen to cache events
    const handleCacheEvent = () => {
      updateStats();
    };

    cacheManager.on('set', handleCacheEvent);
    cacheManager.on('delete', handleCacheEvent);
    cacheManager.on('clear', handleCacheEvent);

    return () => {
      clearInterval(interval);
      cacheManager.off('set', handleCacheEvent);
      cacheManager.off('delete', handleCacheEvent);
      cacheManager.off('clear', handleCacheEvent);
    };
  }, []);

  const clearCache = useCallback(async (strategy?: CacheStrategy) => {
    await cacheManager.clear(strategy);
    const globalStats = cacheManager.getStats();
    setStats(globalStats);
  }, []);

  return {
    stats,
    detailedStats,
    clearCache,
  };
}

/**
 * Hook for preloading cache data
 */
export function useCachePreload() {
  const [preloading, setPreloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const preloadKeys = useCallback(async (
    keys: string[],
    config?: Partial<CacheConfig>
  ) => {
    setPreloading(true);
    setProgress(0);

    const total = keys.length;
    let loaded = 0;

    for (const key of keys) {
      await cacheManager.preload([key], config);
      loaded++;
      setProgress((loaded / total) * 100);
    }

    setPreloading(false);
    setProgress(100);
  }, []);

  const warmupCache = useCallback(async (
    data: Array<{ key: string; value: any; config?: Partial<CacheConfig> }>
  ) => {
    setPreloading(true);
    setProgress(0);

    const total = data.length;
    let loaded = 0;

    for (const item of data) {
      await cacheManager.set(item.key, item.value, item.config);
      loaded++;
      setProgress((loaded / total) * 100);
    }

    setPreloading(false);
    setProgress(100);
  }, []);

  return {
    preloading,
    progress,
    preloadKeys,
    warmupCache,
  };
}

/**
 * Hook for network-aware caching
 */
export function useNetworkCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  config?: Partial<CacheConfig>
) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const cache = useCache<T>(key, isOnline ? fetcher : undefined, config);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      cache.refresh(); // Refresh when coming online
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    ...cache,
    isOnline,
  };
}

/**
 * Hook for cache invalidation patterns
 */
export function useCacheInvalidation() {
  const invalidatePattern = useCallback(async (pattern: string | RegExp) => {
    await cacheManager.invalidate(pattern);
  }, []);

  const invalidateByTag = useCallback(async (tag: string) => {
    await cacheManager.invalidateByTag(tag);
  }, []);

  const invalidateMultiple = useCallback(async (keys: string[]) => {
    await Promise.all(keys.map(key => cacheManager.delete(key)));
  }, []);

  return {
    invalidatePattern,
    invalidateByTag,
    invalidateMultiple,
  };
}