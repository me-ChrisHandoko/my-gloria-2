/**
 * Cache system type definitions
 * Production-ready caching types for Gloria System
 */

export enum CacheStrategy {
  MEMORY = 'memory',
  LOCAL_STORAGE = 'localStorage',
  SESSION_STORAGE = 'sessionStorage',
  INDEXED_DB = 'indexedDB',
  HYBRID = 'hybrid', // Combines multiple strategies
}

export enum CachePriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}

export interface CacheConfig {
  strategy?: CacheStrategy;
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size in bytes
  maxItems?: number; // Maximum number of items
  priority?: CachePriority;
  compress?: boolean; // Enable compression for large data
  encrypt?: boolean; // Enable encryption for sensitive data
  persistOnUnload?: boolean; // Persist cache on page unload
  syncAcrossTabs?: boolean; // Sync cache across browser tabs
}

export interface CacheItem<T = any> {
  key: string;
  data: T;
  metadata: CacheMetadata;
}

export interface CacheMetadata {
  timestamp: number;
  ttl: number;
  hits: number; // Access count
  size: number; // Size in bytes
  priority: CachePriority;
  compressed: boolean;
  encrypted: boolean;
  etag?: string; // For HTTP cache validation
  lastModified?: number;
  tags?: string[]; // For grouped invalidation
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  itemCount: number;
  evictions: number;
  errors: number;
  lastCleaned: number;
}

export interface CacheStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, config?: CacheConfig): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  size(): Promise<number>;
  keys(): Promise<string[]>;
  getMetadata(key: string): Promise<CacheMetadata | null>;
  updateMetadata(key: string, metadata: Partial<CacheMetadata>): Promise<void>;
}

export interface CacheInvalidationStrategy {
  shouldInvalidate(item: CacheItem): boolean;
  onInvalidate?(item: CacheItem): void;
}

export interface CacheEventMap {
  hit: { key: string; value: any };
  miss: { key: string };
  set: { key: string; value: any };
  delete: { key: string };
  clear: void;
  evict: { key: string; reason: string };
  error: { error: Error; operation: string };
}

export type CacheEventListener<K extends keyof CacheEventMap> = (
  event: CacheEventMap[K]
) => void;

export interface CacheSyncMessage {
  type: 'set' | 'delete' | 'clear';
  key?: string;
  value?: any;
  config?: CacheConfig;
  timestamp: number;
  tabId: string;
}

// Cache key patterns for different data types
export const CACHE_KEYS = {
  // API responses
  API_PREFIX: 'api:',
  USER: 'api:user:',
  USERS_LIST: 'api:users:list',
  ORGANIZATION: 'api:org:',
  PERMISSIONS: 'api:permissions:',
  WORKFLOWS: 'api:workflows:',
  NOTIFICATIONS: 'api:notifications:',

  // UI state
  UI_PREFIX: 'ui:',
  THEME: 'ui:theme',
  PREFERENCES: 'ui:preferences',
  FILTERS: 'ui:filters:',
  SORT: 'ui:sort:',

  // Auth
  AUTH_PREFIX: 'auth:',
  TOKEN: 'auth:token',
  SESSION: 'auth:session',
  USER_PROFILE: 'auth:profile',

  // Temporary data
  TEMP_PREFIX: 'temp:',
  FORM_DRAFT: 'temp:form:',
  UPLOAD_PROGRESS: 'temp:upload:',
} as const;

// Cache TTL presets (in milliseconds)
export const CACHE_TTL = {
  IMMEDIATE: 0,
  SHORT: 30 * 1000, // 30 seconds
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
  HOUR: 60 * 60 * 1000, // 1 hour
  DAY: 24 * 60 * 60 * 1000, // 24 hours
  WEEK: 7 * 24 * 60 * 60 * 1000, // 7 days
  MONTH: 30 * 24 * 60 * 60 * 1000, // 30 days
  PERMANENT: Infinity,
} as const;

// Cache size limits
export const CACHE_LIMITS = {
  MAX_MEMORY_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_STORAGE_SIZE: 10 * 1024 * 1024, // 10MB per storage
  MAX_ITEM_SIZE: 1 * 1024 * 1024, // 1MB per item
  MAX_ITEMS: 1000,
  CLEANUP_THRESHOLD: 0.9, // Cleanup when 90% full
} as const;