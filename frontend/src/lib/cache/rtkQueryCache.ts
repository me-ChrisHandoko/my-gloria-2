/**
 * RTK Query Cache Configuration
 * Optimized caching for API state management
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { cacheManager } from './CacheManager';
import { CACHE_TTL, CACHE_KEYS, CachePriority } from './types';

// Cache time configuration for different endpoint types
export const RTK_CACHE_CONFIG = {
  // User data caching
  users: {
    list: CACHE_TTL.MEDIUM, // 5 minutes
    detail: CACHE_TTL.LONG, // 30 minutes
    current: CACHE_TTL.HOUR, // 1 hour
  },
  // Organization data caching
  organizations: {
    list: CACHE_TTL.LONG, // 30 minutes
    detail: CACHE_TTL.HOUR, // 1 hour
    members: CACHE_TTL.MEDIUM, // 5 minutes
  },
  // Permissions caching (rarely changes)
  permissions: {
    list: CACHE_TTL.DAY, // 24 hours
    userPermissions: CACHE_TTL.HOUR, // 1 hour
    roles: CACHE_TTL.DAY, // 24 hours
  },
  // Workflow caching
  workflows: {
    list: CACHE_TTL.MEDIUM, // 5 minutes
    detail: CACHE_TTL.LONG, // 30 minutes
    executions: CACHE_TTL.SHORT, // 30 seconds
  },
  // Notifications (real-time, minimal caching)
  notifications: {
    list: CACHE_TTL.SHORT, // 30 seconds
    unread: CACHE_TTL.IMMEDIATE, // No caching
  },
  // System configuration
  system: {
    config: CACHE_TTL.DAY, // 24 hours
    features: CACHE_TTL.DAY, // 24 hours
    health: CACHE_TTL.SHORT, // 30 seconds
  },
};

// Enhanced fetchBaseQuery with caching integration
export const createCachedBaseQuery = (baseUrl: string) => {
  const baseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: async (headers, { getState }) => {
      // Add auth token from cache or state
      const token = await cacheManager.get<string>(CACHE_KEYS.TOKEN);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      // Add cache control headers
      headers.set('Cache-Control', 'no-cache');
      headers.set('Pragma', 'no-cache');

      // Add request ID for tracing
      headers.set('X-Request-ID', `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

      return headers;
    },
    responseHandler: async (response) => {
      // Store response in cache for offline support
      const url = response.url;
      const data = await response.json();

      // Cache successful responses
      if (response.ok) {
        const cacheKey = `${CACHE_KEYS.API_PREFIX}${url}`;
        await cacheManager.set(cacheKey, data, {
          ttl: getCacheTTL(url),
          priority: getCachePriority(url),
        });
      }

      return data;
    },
  });

  // Wrapper with offline support
  return async (args: any, api: any, extraOptions: any) => {
    try {
      // Try to fetch from network
      const result = await baseQuery(args, api, extraOptions);

      // Update cache statistics
      if (result.data) {
        await cacheManager.set(`${CACHE_KEYS.API_PREFIX}last_sync`, Date.now(), {
          ttl: CACHE_TTL.HOUR,
        });
      }

      return result;
    } catch (error) {
      // If offline, try to get from cache
      if (!navigator.onLine) {
        const cacheKey = `${CACHE_KEYS.API_PREFIX}${args.url || args}`;
        const cachedData = await cacheManager.get(cacheKey);

        if (cachedData) {
          return { data: cachedData };
        }
      }

      throw error;
    }
  };
};

// Helper function to determine cache TTL based on endpoint
function getCacheTTL(url: string): number {
  // Parse URL to determine endpoint type
  if (url.includes('/users')) {
    if (url.includes('/me')) return RTK_CACHE_CONFIG.users.current;
    if (url.match(/\/users\/[^/]+$/)) return RTK_CACHE_CONFIG.users.detail;
    return RTK_CACHE_CONFIG.users.list;
  }

  if (url.includes('/organizations')) {
    if (url.includes('/members')) return RTK_CACHE_CONFIG.organizations.members;
    if (url.match(/\/organizations\/[^/]+$/)) return RTK_CACHE_CONFIG.organizations.detail;
    return RTK_CACHE_CONFIG.organizations.list;
  }

  if (url.includes('/permissions')) {
    if (url.includes('/roles')) return RTK_CACHE_CONFIG.permissions.roles;
    if (url.includes('/user')) return RTK_CACHE_CONFIG.permissions.userPermissions;
    return RTK_CACHE_CONFIG.permissions.list;
  }

  if (url.includes('/workflows')) {
    if (url.includes('/executions')) return RTK_CACHE_CONFIG.workflows.executions;
    if (url.match(/\/workflows\/[^/]+$/)) return RTK_CACHE_CONFIG.workflows.detail;
    return RTK_CACHE_CONFIG.workflows.list;
  }

  if (url.includes('/notifications')) {
    if (url.includes('/unread')) return RTK_CACHE_CONFIG.notifications.unread;
    return RTK_CACHE_CONFIG.notifications.list;
  }

  if (url.includes('/system')) {
    if (url.includes('/config')) return RTK_CACHE_CONFIG.system.config;
    if (url.includes('/features')) return RTK_CACHE_CONFIG.system.features;
    if (url.includes('/health')) return RTK_CACHE_CONFIG.system.health;
  }

  // Default cache TTL
  return CACHE_TTL.MEDIUM;
}

// Helper function to determine cache priority
function getCachePriority(url: string): CachePriority {
  // Critical endpoints
  if (url.includes('/auth') || url.includes('/me')) {
    return CachePriority.CRITICAL;
  }

  // High priority endpoints
  if (url.includes('/permissions') || url.includes('/config')) {
    return CachePriority.HIGH;
  }

  // Low priority endpoints
  if (url.includes('/notifications') || url.includes('/health')) {
    return CachePriority.LOW;
  }

  // Default medium priority
  return CachePriority.MEDIUM;
}

// RTK Query cache utilities
export const rtkCacheUtils = {
  // Invalidate specific tags in RTK Query cache
  invalidateTags: (api: any, tags: string[]) => {
    api.util.invalidateTags(tags);
  },

  // Prefetch queries for better performance
  prefetchQueries: async (api: any, queries: Array<{ endpoint: string; args: any }>) => {
    const promises = queries.map(({ endpoint, args }) =>
      api.util.prefetch(endpoint, args, { force: false })
    );
    await Promise.all(promises);
  },

  // Update cache optimistically
  optimisticUpdate: (api: any, endpoint: string, args: any, data: any) => {
    api.util.updateQueryData(endpoint, args, (draft: any) => {
      Object.assign(draft, data);
    });
  },

  // Manual cache update
  manualCacheUpdate: async (endpoint: string, data: any, ttl?: number) => {
    const cacheKey = `${CACHE_KEYS.API_PREFIX}${endpoint}`;
    await cacheManager.set(cacheKey, data, {
      ttl: ttl || CACHE_TTL.MEDIUM,
      priority: CachePriority.HIGH,
    });
  },

  // Get cache statistics
  getCacheStats: async () => {
    const stats = await cacheManager.getDetailedStats();
    return {
      ...stats,
      rtkQuery: {
        // Add RTK Query specific stats if available
      },
    };
  },

  // Clear all API caches
  clearApiCache: async () => {
    await cacheManager.invalidate(CACHE_KEYS.API_PREFIX);
  },

  // Warm up cache with initial data
  warmupCache: async (initialData: Array<{ endpoint: string; data: any }>) => {
    const cacheEntries = initialData.map(({ endpoint, data }) => ({
      key: `${CACHE_KEYS.API_PREFIX}${endpoint}`,
      value: data,
      config: {
        ttl: getCacheTTL(endpoint),
        priority: getCachePriority(endpoint),
      },
    }));

    await cacheManager.warmup(cacheEntries);
  },
};

// Export enhanced createApi with caching
export const createCachedApi = (config: any) => {
  return createApi({
    ...config,
    baseQuery: createCachedBaseQuery(config.baseUrl || process.env.NEXT_PUBLIC_API_URL || ''),
    keepUnusedDataFor: 60, // Keep cached data for 60 seconds after component unmounts
    refetchOnMountOrArgChange: 30, // Refetch if data is older than 30 seconds
    refetchOnFocus: true, // Refetch when window regains focus
    refetchOnReconnect: true, // Refetch when reconnecting to network
  });
};

// Middleware for cache synchronization
export const cacheMiddleware = (store: any) => (next: any) => (action: any) => {
  // Track API calls for analytics
  if (action.type?.endsWith('/pending')) {
    cacheManager.on('miss', ({ key }) => {
      console.debug(`Cache miss for: ${key}`);
    });
  }

  if (action.type?.endsWith('/fulfilled')) {
    cacheManager.on('hit', ({ key }) => {
      console.debug(`Cache hit for: ${key}`);
    });
  }

  // Clear cache on logout
  if (action.type === 'auth/logout') {
    cacheManager.clear();
  }

  return next(action);
};