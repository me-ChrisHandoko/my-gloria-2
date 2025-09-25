// Custom API Error Classes

import { AxiosError } from 'axios';
import { ApiErrorInfo } from './types';

export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;
  public timestamp: string;
  public requestId?: string;
  public isRetryable: boolean;

  constructor(info: ApiErrorInfo) {
    super(info.message);
    this.name = 'ApiError';
    this.statusCode = info.statusCode;
    this.code = info.code;
    this.details = info.details;
    this.timestamp = info.timestamp;
    this.requestId = info.requestId;
    this.isRetryable = info.retry || false;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  static fromAxiosError(error: AxiosError<any>): ApiError {
    const response = error.response;
    const requestId = response?.headers?.['x-request-id'] ||
                     error.config?.headers?.['X-Request-ID'] as string;

    // Handle different error response formats
    if (response?.data?.error) {
      return new ApiError({
        message: response.data.error.message || 'An error occurred',
        statusCode: response.status,
        code: response.data.error.code || 'UNKNOWN_ERROR',
        details: response.data.error.details,
        timestamp: response.data.error.timestamp || new Date().toISOString(),
        requestId,
        retry: isRetryableError(response.status),
      });
    }

    // Fallback for non-standard error responses
    return new ApiError({
      message: response?.data?.message || error.message || 'An error occurred',
      statusCode: response?.status || 0,
      code: error.code || 'UNKNOWN_ERROR',
      details: response?.data,
      timestamp: new Date().toISOString(),
      requestId,
      retry: isRetryableError(response?.status || 0),
    });
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      requestId: this.requestId,
      isRetryable: this.isRetryable,
    };
  }
}

// Specific error classes for common scenarios
export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized access') {
    super({
      message,
      statusCode: 401,
      code: 'UNAUTHORIZED',
      timestamp: new Date().toISOString(),
      retry: false,
    });
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Access forbidden') {
    super({
      message,
      statusCode: 403,
      code: 'FORBIDDEN',
      timestamp: new Date().toISOString(),
      retry: false,
    });
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super({
      message: `${resource} not found`,
      statusCode: 404,
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString(),
      retry: false,
    });
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends ApiError {
  constructor(details: Record<string, any>) {
    super({
      message: 'Validation failed',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details,
      timestamp: new Date().toISOString(),
      retry: false,
    });
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends ApiError {
  public retryAfter?: number;

  constructor(retryAfter?: number) {
    super({
      message: 'Rate limit exceeded',
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      timestamp: new Date().toISOString(),
      retry: true,
    });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class NetworkError extends ApiError {
  constructor(message = 'Network error occurred') {
    super({
      message,
      statusCode: 0,
      code: 'NETWORK_ERROR',
      timestamp: new Date().toISOString(),
      retry: true,
    });
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends ApiError {
  constructor(message = 'Request timeout') {
    super({
      message,
      statusCode: 408,
      code: 'TIMEOUT',
      timestamp: new Date().toISOString(),
      retry: true,
    });
    this.name = 'TimeoutError';
  }
}

export class ServerError extends ApiError {
  constructor(statusCode = 500, message = 'Internal server error') {
    super({
      message,
      statusCode,
      code: 'SERVER_ERROR',
      timestamp: new Date().toISOString(),
      retry: statusCode >= 500 && statusCode < 600,
    });
    this.name = 'ServerError';
  }
}

// Helper functions
export function isRetryableError(statusCode: number): boolean {
  // Retry on 5xx errors and specific 4xx errors
  return (
    statusCode === 408 || // Request Timeout
    statusCode === 429 || // Too Many Requests
    statusCode === 502 || // Bad Gateway
    statusCode === 503 || // Service Unavailable
    statusCode === 504 || // Gateway Timeout
    (statusCode >= 500 && statusCode < 600)
  );
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return true;
  }
  if (error instanceof AxiosError) {
    return !error.response && error.code === 'ERR_NETWORK';
  }
  return false;
}

export function isTimeoutError(error: unknown): boolean {
  if (error instanceof TimeoutError) {
    return true;
  }
  if (error instanceof AxiosError) {
    return error.code === 'ECONNABORTED' || error.code === 'ERR_TIMEOUT';
  }
  return false;
}

/**
 * Production-ready API error handler
 * Transforms various error types into standardized ApiError format
 * @param error - The error to handle (unknown type)
 * @returns ApiError instance with proper error details
 */
export function handleApiError(error: unknown): ApiError {
  // If it's already an ApiError, return it as-is
  if (error instanceof ApiError) {
    logError(error);
    return error;
  }

  // Handle Axios errors
  if (error instanceof AxiosError) {
    const apiError = transformAxiosError(error);
    logError(apiError);
    return apiError;
  }

  // Handle standard JavaScript errors
  if (error instanceof Error) {
    const apiError = new ApiError({
      message: error.message,
      statusCode: 0,
      code: 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString(),
      retry: false,
      details: {
        name: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    });
    logError(apiError);
    return apiError;
  }

  // Handle string errors
  if (typeof error === 'string') {
    const apiError = new ApiError({
      message: error,
      statusCode: 0,
      code: 'STRING_ERROR',
      timestamp: new Date().toISOString(),
      retry: false,
    });
    logError(apiError);
    return apiError;
  }

  // Fallback for unknown error types
  const apiError = new ApiError({
    message: 'An unexpected error occurred',
    statusCode: 0,
    code: 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString(),
    retry: false,
    details: error,
  });
  logError(apiError);
  return apiError;
}

/**
 * Transform Axios errors into ApiError instances
 * Handles network errors, timeouts, and HTTP response errors
 */
function transformAxiosError(error: AxiosError): ApiError {
  // Handle network errors (no response)
  if (!error.response) {
    if (error.code === 'ERR_NETWORK' || error.code === 'ENOTFOUND') {
      return new NetworkError(
        'Unable to connect to the server. Please check your internet connection.'
      );
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_TIMEOUT') {
      return new TimeoutError(
        'The request took too long to complete. Please try again.'
      );
    }
    return new NetworkError(error.message || 'Network error occurred');
  }

  // Handle specific HTTP status codes
  const status = error.response.status;
  const data = error.response.data as any;

  // Check for rate limiting
  if (status === 429) {
    const retryAfter = error.response.headers['retry-after'];
    return new RateLimitError(
      retryAfter ? parseInt(retryAfter, 10) : undefined
    );
  }

  // Check for authentication errors
  if (status === 401) {
    return new UnauthorizedError(
      data?.message || data?.error?.message || 'Authentication required'
    );
  }

  // Check for authorization errors
  if (status === 403) {
    return new ForbiddenError(
      data?.message || data?.error?.message || 'Access denied'
    );
  }

  // Check for not found errors
  if (status === 404) {
    const resource = data?.resource || 'Resource';
    return new NotFoundError(resource);
  }

  // Check for validation errors
  if (status === 400 && (data?.errors || data?.validation)) {
    return new ValidationError(data.errors || data.validation || data);
  }

  // Check for timeout errors
  if (status === 408) {
    return new TimeoutError(
      data?.message || data?.error?.message || 'Request timeout'
    );
  }

  // Check for server errors
  if (status >= 500 && status < 600) {
    return new ServerError(
      status,
      data?.message || data?.error?.message || `Server error (${status})`
    );
  }

  // Default to ApiError.fromAxiosError for other cases
  return ApiError.fromAxiosError(error);
}

/**
 * Log errors for monitoring and debugging
 * In production, this would send to a logging service
 */
function logError(error: ApiError): void {
  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('[API Error]', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      requestId: error.requestId,
      timestamp: error.timestamp,
      details: error.details,
      stack: error.stack,
    });
  }

  // In production, you would send to a logging service like Sentry, LogRocket, etc.
  // Example:
  // if (process.env.NODE_ENV === 'production') {
  //   Sentry.captureException(error, {
  //     tags: {
  //       code: error.code,
  //       statusCode: error.statusCode,
  //       requestId: error.requestId,
  //     },
  //     extra: {
  //       details: error.details,
  //       timestamp: error.timestamp,
  //     },
  //   });
  // }
}