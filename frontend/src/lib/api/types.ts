// API Response Types

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status: 'success' | 'error';
  timestamp: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  hasMore: boolean;
}

export interface ErrorResponse {
  error: {
    message: string;
    code: string;
    details?: Record<string, any>;
    timestamp: string;
    path?: string;
    statusCode: number;
  };
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  filters?: Record<string, any>;
  include?: string[];
}

export interface ApiRequestConfig {
  retry?: boolean;
  retryCount?: number;
  retryDelay?: number;
  withCredentials?: boolean;
  signal?: AbortSignal;
  onUploadProgress?: (progressEvent: ProgressEvent) => void;
  onDownloadProgress?: (progressEvent: ProgressEvent) => void;
}

export interface ApiErrorInfo {
  message: string;
  statusCode: number;
  code: string;
  details?: any;
  timestamp: string;
  requestId?: string;
  retry?: boolean;
}

// Request tracking
export interface RequestTracker {
  id: string;
  method: string;
  url: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status?: number;
  error?: boolean;
}

// File upload types
export interface FileUploadResponse {
  url: string;
  key: string;
  size: number;
  mimeType: string;
  filename: string;
  uploadedAt: string;
}

// Batch operation types
export interface BatchRequest<T = any> {
  operations: Array<{
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    body?: T;
    headers?: Record<string, string>;
  }>;
}

export interface BatchResponse<T = any> {
  results: Array<{
    status: number;
    data?: T;
    error?: ErrorResponse;
  }>;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  token?: string; // For backward compatibility
  expiresIn: number;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  confirmPassword: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  avatar?: string;
  role: string;
  roles?: string[];
  permissions?: string[];
  department?: string;
  position?: string;
  organizationId?: string;
  organizationName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  token?: string; // For backward compatibility
  expiresIn: number;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface TwoFactorSetupResponse {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

export interface TwoFactorVerifyRequest {
  code: string;
}

export interface Session {
  id: string;
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  lastActivity: string;
  createdAt: string;
}