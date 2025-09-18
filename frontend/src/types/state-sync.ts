/**
 * Type definitions for state synchronization and persistence
 */

/**
 * Configuration for state synchronization across components and tabs
 */
export interface StateSyncConfig {
  /** Unique channel identifier for BroadcastChannel */
  channel: string;
  /** List of allowed action types to sync */
  actions: string[];
  /** Debounce delay in milliseconds */
  debounce?: number;
  /** Enable cross-tab synchronization */
  enableCrossTab?: boolean;
}

/**
 * Message structure for cross-tab communication
 */
export interface StateSyncMessage {
  /** Action type identifier */
  type: string;
  /** Optional payload data */
  payload?: any;
  /** Timestamp of the message */
  timestamp: number;
  /** Unique tab identifier */
  tabId: string;
  /** Redux action to dispatch */
  action?: any;
  /** RTK Query cache tags to invalidate */
  tags?: string[];
}

/**
 * Return type for useStateSync hook
 */
export interface StateSyncReturn {
  /** Broadcast a message to other tabs */
  broadcast: (type: string, payload?: any) => void;
  /** Broadcast a state update action */
  broadcastStateUpdate: (action: any) => void;
  /** Broadcast cache invalidation */
  broadcastCacheInvalidation: (tags: string[]) => void;
  /** Broadcast refetch request */
  broadcastRefetch: () => void;
  /** Broadcast cache clear */
  broadcastCacheClear: (endpoint: string, args: any) => void;
  /** Current tab identifier */
  tabId: string;
  /** Connection status */
  isConnected: boolean;
}

/**
 * Options for persistent state management
 */
export interface PersistentStateOptions<T> {
  /** Storage mechanism (localStorage or sessionStorage) */
  storage?: Storage;
  /** Custom serialization function */
  serialize?: (value: T) => string;
  /** Custom deserialization function */
  deserialize?: (value: string) => T;
  /** Enable synchronization across browser tabs */
  syncAcrossTabs?: boolean;
  /** Fallback value in case of errors */
  fallbackValue?: T;
}

/**
 * Temporary storage value with expiration
 */
export interface TemporaryStorageValue<T> {
  /** Stored value */
  value: T;
  /** Expiration timestamp */
  expiry: number;
}

/**
 * User preference configuration
 */
export interface UserPreferenceConfig {
  /** Preference category */
  category: 'display' | 'notification' | 'workspace' | 'accessibility' | 'privacy';
  /** Preference key within the category */
  key: string;
  /** Default value if preference not set */
  defaultValue: any;
}

/**
 * State sync event types
 */
export enum StateSyncEventType {
  /** Invalidate RTK Query cache */
  INVALIDATE_CACHE = 'INVALIDATE_CACHE',
  /** Update Redux state */
  UPDATE_STATE = 'UPDATE_STATE',
  /** Refetch all queries */
  REFETCH = 'REFETCH',
  /** Clear specific cache entries */
  CLEAR_CACHE = 'CLEAR_CACHE',
  /** User preference updated */
  PREFERENCE_UPDATE = 'PREFERENCE_UPDATE',
  /** Theme changed */
  THEME_CHANGE = 'THEME_CHANGE',
  /** User logged in */
  USER_LOGIN = 'USER_LOGIN',
  /** User logged out */
  USER_LOGOUT = 'USER_LOGOUT',
  /** Notification received */
  NOTIFICATION_RECEIVED = 'NOTIFICATION_RECEIVED',
  /** Workflow state changed */
  WORKFLOW_STATE_CHANGE = 'WORKFLOW_STATE_CHANGE',
}

/**
 * Cache synchronization configuration
 */
export interface CacheSyncConfig {
  /** RTK Query endpoints to sync */
  endpoints: string[];
  /** Cache tags to monitor */
  tags: string[];
  /** Auto-invalidate on specific actions */
  autoInvalidateOn?: string[];
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
}

/**
 * State persistence configuration
 */
export interface StatePersistenceConfig {
  /** Keys to persist */
  whitelist?: string[];
  /** Keys to exclude from persistence */
  blacklist?: string[];
  /** Storage key prefix */
  keyPrefix?: string;
  /** Migration function for version updates */
  migrate?: (state: any, version: number) => any;
  /** Current version number */
  version?: number;
  /** Transform state before saving */
  transformOnSave?: (state: any) => any;
  /** Transform state after loading */
  transformOnLoad?: (state: any) => any;
}

/**
 * Sync status information
 */
export interface SyncStatus {
  /** Last sync timestamp */
  lastSync: number | null;
  /** Sync in progress */
  isSyncing: boolean;
  /** Sync error if any */
  error: Error | null;
  /** Number of pending sync operations */
  pendingOperations: number;
  /** Connected tabs count */
  connectedTabs: number;
}

/**
 * Storage quota information
 */
export interface StorageQuota {
  /** Used storage in bytes */
  used: number;
  /** Total available storage in bytes */
  total: number;
  /** Percentage of storage used */
  percentage: number;
  /** Storage type */
  type: 'localStorage' | 'sessionStorage' | 'indexedDB';
}

/**
 * Sync middleware configuration
 */
export interface SyncMiddlewareConfig {
  /** Enable automatic state sync */
  enabled: boolean;
  /** Actions to sync automatically */
  syncActions: string[] | ((action: any) => boolean);
  /** Channels to use for different action types */
  channels?: Record<string, string>;
  /** Global debounce for all syncs */
  globalDebounce?: number;
  /** Error handler */
  onError?: (error: Error) => void;
  /** Success handler */
  onSync?: (action: any) => void;
}