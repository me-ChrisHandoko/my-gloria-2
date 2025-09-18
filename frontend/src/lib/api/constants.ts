// API Constants and Configuration
import { apiConfig } from './config';

// Get configuration from the new config module
const config = apiConfig.getConfig();
const retryConfig = apiConfig.getRetryConfig();
const features = apiConfig.getFeatureFlags();

export const API_CONFIG = {
  // Base configuration
  BASE_URL: apiConfig.getBaseUrl(),
  TIMEOUT: config.timeout,

  // Retry configuration
  RETRY: {
    ENABLED: retryConfig.enabled,
    MAX_ATTEMPTS: retryConfig.maxAttempts,
    BASE_DELAY: retryConfig.baseDelay,
    MAX_DELAY: retryConfig.maxDelay,
    FACTOR: retryConfig.factor,
  },

  // Request configuration
  REQUEST: {
    WITH_CREDENTIALS: process.env.NEXT_PUBLIC_API_WITH_CREDENTIALS === 'true',
    MAX_REDIRECTS: parseInt(process.env.NEXT_PUBLIC_API_MAX_REDIRECTS || '5', 10),
  },

  // Development configuration
  DEV: {
    LOG_REQUESTS: features.enableRequestLogging,
    LOG_RESPONSES: features.enableRequestLogging,
    LOG_ERRORS: true,
    MOCK_DELAY: parseInt(process.env.NEXT_PUBLIC_API_MOCK_DELAY || '0', 10),
  },
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  // Client errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server errors
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// API Headers
export const API_HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  AUTHORIZATION: 'Authorization',
  REQUEST_ID: 'X-Request-ID',
  CORRELATION_ID: 'X-Correlation-ID',
  API_VERSION: 'X-API-Version',
  CLIENT_VERSION: 'X-Client-Version',
  USER_AGENT: 'User-Agent',
  ACCEPT: 'Accept',
  ACCEPT_LANGUAGE: 'Accept-Language',
  RATE_LIMIT_LIMIT: 'X-RateLimit-Limit',
  RATE_LIMIT_REMAINING: 'X-RateLimit-Remaining',
  RATE_LIMIT_RESET: 'X-RateLimit-Reset',
  RETRY_AFTER: 'Retry-After',
} as const;

// Content Types
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  URL_ENCODED: 'application/x-www-form-urlencoded',
  TEXT: 'text/plain',
  HTML: 'text/html',
  XML: 'application/xml',
  PDF: 'application/pdf',
  OCTET_STREAM: 'application/octet-stream',
} as const;

// API Endpoints - Use the configuration module for endpoints
export const API_ENDPOINTS = apiConfig.getEndpoints();

// Error Codes
export const ERROR_CODES = {
  // Authentication
  AUTH_FAILED: 'AUTH_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',

  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',

  // Business logic
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  WORKFLOW_ERROR: 'WORKFLOW_ERROR',
  NOTIFICATION_FAILED: 'NOTIFICATION_FAILED',
} as const;

// Request Methods
export const REQUEST_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS',
} as const;

// Cache Keys
export const CACHE_KEYS = {
  USER_PROFILE: 'user:profile',
  ORGANIZATIONS: 'organizations:list',
  PERMISSIONS: 'permissions:list',
  NOTIFICATIONS: 'notifications:list',
  WORKFLOWS: 'workflows:list',
  SYSTEM_CONFIG: 'system:config',
  FEATURE_FLAGS: 'system:features',
} as const;

// Default pagination
export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// File upload limits
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  CHUNK_SIZE: 1024 * 1024, // 1MB chunks for large files
} as const;