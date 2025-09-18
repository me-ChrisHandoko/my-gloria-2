/**
 * API Type Definitions
 *
 * Production-ready TypeScript types for Gloria API integration.
 * These types ensure type safety across all API operations.
 */

// ============================================================
// Core API Response Types
// ============================================================

/**
 * Standard API response wrapper
 * Used for single entity responses
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  timestamp: string;
  requestId?: string;
  status?: 'success' | 'error' | 'warning';
  metadata?: Record<string, any>;
}

/**
 * Paginated API response
 * Used for list endpoints with pagination
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  nextPage?: number | null;
  prevPage?: number | null;
  metadata?: {
    executionTime?: number;
    filters?: Record<string, any>;
    sort?: {
      field: string;
      order: 'asc' | 'desc';
    };
  };
}

/**
 * Error response structure
 * Consistent error format across all endpoints
 */
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  errors?: ValidationError[];
  requestId?: string;
  stack?: string; // Only in development
  details?: Record<string, any>;
  retryable?: boolean;
  retryAfter?: number; // Seconds until retry is allowed
}

/**
 * Field validation error
 * Used for detailed validation feedback
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  code?: string;
  constraints?: Record<string, string>;
}

// ============================================================
// Request Parameter Types
// ============================================================

/**
 * Standard query parameters for list endpoints
 */
export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
  include?: string[]; // Relations to include
  exclude?: string[]; // Fields to exclude
  fields?: string[]; // Specific fields to return
  groupBy?: string;
  startDate?: string | Date;
  endDate?: string | Date;
}

/**
 * Bulk operation request
 */
export interface BulkOperationRequest<T> {
  operations: Array<{
    action: 'create' | 'update' | 'delete';
    data: T;
    id?: string;
  }>;
  transactional?: boolean;
  continueOnError?: boolean;
}

/**
 * Bulk operation response
 */
export interface BulkOperationResponse<T> {
  successful: Array<{
    action: string;
    id: string;
    data: T;
  }>;
  failed: Array<{
    action: string;
    id?: string;
    error: ErrorResponse;
  }>;
  totalProcessed: number;
  totalSuccessful: number;
  totalFailed: number;
}

// ============================================================
// File Upload Types
// ============================================================

/**
 * File upload request
 */
export interface FileUploadRequest {
  file: File;
  purpose?: string;
  metadata?: Record<string, any>;
  public?: boolean;
}

/**
 * File upload response
 */
export interface FileUploadResponse {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
  uploadedAt: string;
}

// ============================================================
// Real-time Event Types
// ============================================================

/**
 * WebSocket/SSE event structure
 */
export interface RealtimeEvent<T = any> {
  id: string;
  type: string;
  data: T;
  timestamp: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Subscription request
 */
export interface SubscriptionRequest {
  events: string[];
  filters?: Record<string, any>;
  userId?: string;
  organizationId?: string;
}

// ============================================================
// Authentication Types
// ============================================================

/**
 * Login request
 */
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  mfaCode?: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  permissions?: string[];
  roles?: string[];
  requiresMfa?: boolean;
}

/**
 * Token refresh request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Token refresh response
 */
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * User profile
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  permissions: string[];
  roles: string[];
  organizationId?: string;
  departmentId?: string;
  positionId?: string;
  preferences?: Record<string, any>;
  lastLogin?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  mfaEnabled?: boolean;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Search Types
// ============================================================

/**
 * Global search request
 */
export interface SearchRequest {
  query: string;
  types?: string[]; // Entity types to search
  page?: number;
  limit?: number;
  filters?: Record<string, any>;
  highlight?: boolean;
}

/**
 * Search result item
 */
export interface SearchResult<T = any> {
  id: string;
  type: string;
  score: number;
  data: T;
  highlights?: Record<string, string[]>;
  metadata?: Record<string, any>;
}

/**
 * Search response
 */
export interface SearchResponse<T = any> {
  results: SearchResult<T>[];
  total: number;
  page: number;
  limit: number;
  query: string;
  executionTime: number;
  suggestions?: string[];
  facets?: Record<string, Array<{
    value: string;
    count: number;
  }>>;
}

// ============================================================
// Export/Import Types
// ============================================================

/**
 * Export request
 */
export interface ExportRequest {
  format: 'csv' | 'json' | 'xlsx' | 'pdf';
  fields?: string[];
  filters?: QueryParams;
  includeHeaders?: boolean;
  timezone?: string;
}

/**
 * Export response
 */
export interface ExportResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  url?: string;
  expiresAt?: string;
  error?: string;
  progress?: number;
  metadata?: {
    totalRecords?: number;
    fileSize?: number;
    format?: string;
  };
}

/**
 * Import request
 */
export interface ImportRequest {
  file: File;
  format: 'csv' | 'json' | 'xlsx';
  mapping?: Record<string, string>;
  options?: {
    skipDuplicates?: boolean;
    validateOnly?: boolean;
    updateExisting?: boolean;
  };
}

/**
 * Import response
 */
export interface ImportResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed: number;
  successful: number;
  failed: number;
  errors?: Array<{
    row: number;
    field?: string;
    error: string;
  }>;
  warnings?: string[];
}

// ============================================================
// Analytics Types
// ============================================================

/**
 * Analytics data point
 */
export interface AnalyticsDataPoint {
  timestamp: string;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

/**
 * Analytics response
 */
export interface AnalyticsResponse {
  metric: string;
  period: {
    start: string;
    end: string;
  };
  data: AnalyticsDataPoint[];
  summary: {
    total?: number;
    average?: number;
    min?: number;
    max?: number;
    trend?: 'up' | 'down' | 'stable';
    changePercent?: number;
  };
  comparison?: {
    previousPeriod?: AnalyticsDataPoint[];
    changePercent?: number;
  };
}

// ============================================================
// Health Check Types
// ============================================================

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: Record<string, {
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    error?: string;
    lastCheck?: string;
  }>;
  metrics?: {
    cpu?: number;
    memory?: number;
    disk?: number;
    activeConnections?: number;
    requestRate?: number;
    errorRate?: number;
  };
}

// ============================================================
// Notification Types
// ============================================================

/**
 * Notification preference
 */
export interface NotificationPreference {
  type: string;
  channel: 'email' | 'sms' | 'push' | 'in-app';
  enabled: boolean;
  frequency?: 'immediate' | 'daily' | 'weekly';
  quietHours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

/**
 * Notification template
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  subject?: string;
  body: string;
  variables?: string[];
  channels: ('email' | 'sms' | 'push' | 'in-app')[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Helper Types
// ============================================================

/**
 * Sort configuration
 */
export interface SortConfig {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * Filter configuration
 */
export interface FilterConfig {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like' | 'between';
  value: any;
}

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  page: number;
  limit: number;
  offset?: number;
}

/**
 * API Request configuration
 */
export interface ApiRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  params?: QueryParams;
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cancelToken?: any;
}

/**
 * API Response metadata
 */
export interface ApiResponseMetadata {
  requestId: string;
  timestamp: string;
  duration: number;
  cached: boolean;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: string;
  };
}

// ============================================================
// Type Guards
// ============================================================

/**
 * Type guard for error response
 */
export function isErrorResponse(response: any): response is ErrorResponse {
  return (
    response &&
    typeof response === 'object' &&
    'error' in response &&
    'statusCode' in response
  );
}

/**
 * Type guard for paginated response
 */
export function isPaginatedResponse<T>(response: any): response is PaginatedResponse<T> {
  return (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    Array.isArray(response.data) &&
    'total' in response &&
    'page' in response
  );
}

/**
 * Type guard for API response
 */
export function isApiResponse<T>(response: any): response is ApiResponse<T> {
  return (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    'timestamp' in response
  );
}

// ============================================================
// Utility Types
// ============================================================

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extract keys with specific value types
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Nullable type helper
 */
export type Nullable<T> = T | null | undefined;

/**
 * Success/Error result type
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;