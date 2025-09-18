/**
 * Server-Sent Events (SSE) Type Definitions
 * Production-ready types for real-time communication
 */

/**
 * SSE Event Types - Corresponds to backend event types
 */
export enum SSEEventType {
  // Connection Events
  CONNECTION_ESTABLISHED = 'connection_established',
  HEARTBEAT = 'heartbeat',

  // Notification Events
  NOTIFICATION_CREATED = 'notification.created',
  NOTIFICATION_UPDATED = 'notification.updated',
  NOTIFICATION_DELETED = 'notification.deleted',
  NOTIFICATION_BULK_UPDATE = 'notification.bulk_update',

  // User Events
  USER_STATUS_CHANGED = 'user.status_changed',
  USER_UPDATED = 'user.updated',
  USER_PRESENCE = 'user.presence',

  // Organization Events
  ORGANIZATION_UPDATED = 'organization.updated',
  ORGANIZATION_MEMBER_ADDED = 'organization.member_added',
  ORGANIZATION_MEMBER_REMOVED = 'organization.member_removed',

  // Workflow Events
  WORKFLOW_STARTED = 'workflow.started',
  WORKFLOW_COMPLETED = 'workflow.completed',
  WORKFLOW_FAILED = 'workflow.failed',
  WORKFLOW_STEP_COMPLETED = 'workflow.step_completed',
  WORKFLOW_APPROVAL_REQUIRED = 'workflow.approval_required',

  // System Events
  SYSTEM_ANNOUNCEMENT = 'system.announcement',
  SYSTEM_MAINTENANCE = 'system.maintenance',
  FEATURE_FLAG_CHANGED = 'feature_flag.changed',

  // Error Events
  ERROR = 'error',
  RECONNECT_REQUIRED = 'reconnect_required',
}

/**
 * Base SSE Message structure
 */
export interface SSEMessage<T = any> {
  id: string;
  type: SSEEventType;
  timestamp: string;
  data: T;
  retry?: number;
}

/**
 * Connection Status for SSE
 */
export enum SSEConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
  CLOSED = 'closed',
}

/**
 * SSE Connection Options
 */
export interface SSEConnectionOptions {
  url: string;
  withCredentials?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  onOpen?: () => void;
  onMessage?: (message: SSEMessage) => void;
  onError?: (error: Error) => void;
  onReconnect?: (attempt: number) => void;
  onClose?: () => void;
  headers?: Record<string, string>;
}

/**
 * SSE Connection State
 */
export interface SSEConnectionState {
  status: SSEConnectionStatus;
  lastEventId?: string;
  reconnectAttempts: number;
  error?: Error;
  connectedAt?: Date;
  lastHeartbeat?: Date;
}

/**
 * Notification SSE Data
 */
export interface NotificationSSEData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

/**
 * User Status SSE Data
 */
export interface UserStatusSSEData {
  userId: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen?: string;
  metadata?: {
    device?: string;
    location?: string;
  };
}

/**
 * Workflow SSE Data
 */
export interface WorkflowSSEData {
  workflowId: string;
  workflowName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep?: string;
  progress?: number;
  error?: string;
  completedAt?: string;
  metadata?: Record<string, any>;
}

/**
 * System Announcement SSE Data
 */
export interface SystemAnnouncementSSEData {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  startTime: string;
  endTime?: string;
  affectedServices?: string[];
}

/**
 * Feature Flag SSE Data
 */
export interface FeatureFlagSSEData {
  flagKey: string;
  enabled: boolean;
  variant?: string;
  metadata?: Record<string, any>;
}

/**
 * SSE Event Handler Type
 */
export type SSEEventHandler<T = any> = (data: T) => void | Promise<void>;

/**
 * SSE Event Listener Map
 */
export interface SSEEventListeners {
  [SSEEventType.NOTIFICATION_CREATED]?: SSEEventHandler<NotificationSSEData>;
  [SSEEventType.NOTIFICATION_UPDATED]?: SSEEventHandler<NotificationSSEData>;
  [SSEEventType.NOTIFICATION_DELETED]?: SSEEventHandler<{ id: string }>;
  [SSEEventType.USER_STATUS_CHANGED]?: SSEEventHandler<UserStatusSSEData>;
  [SSEEventType.WORKFLOW_STARTED]?: SSEEventHandler<WorkflowSSEData>;
  [SSEEventType.WORKFLOW_COMPLETED]?: SSEEventHandler<WorkflowSSEData>;
  [SSEEventType.WORKFLOW_FAILED]?: SSEEventHandler<WorkflowSSEData>;
  [SSEEventType.SYSTEM_ANNOUNCEMENT]?: SSEEventHandler<SystemAnnouncementSSEData>;
  [SSEEventType.FEATURE_FLAG_CHANGED]?: SSEEventHandler<FeatureFlagSSEData>;
  [key: string]: SSEEventHandler<any> | undefined;
}

/**
 * SSE Service Interface
 */
export interface ISSEService {
  connect(options?: Partial<SSEConnectionOptions>): void;
  disconnect(): void;
  reconnect(): void;
  getStatus(): SSEConnectionStatus;
  addEventListener<T = any>(event: SSEEventType, handler: SSEEventHandler<T>): () => void;
  removeEventListener<T = any>(event: SSEEventType, handler: SSEEventHandler<T>): void;
  send(data: any): void;
}

/**
 * SSE Context Value
 */
export interface SSEContextValue {
  service: ISSEService | null;
  status: SSEConnectionStatus;
  error?: Error;
  isConnected: boolean;
  isReconnecting: boolean;
  lastEventId?: string;
  lastHeartbeat?: Date;
}