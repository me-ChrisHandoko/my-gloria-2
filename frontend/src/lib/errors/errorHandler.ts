import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Error categories for better organization
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NETWORK = 'network',
  SERVER = 'server',
  CLIENT = 'client',
  UNKNOWN = 'unknown',
}

/**
 * Custom error class with additional metadata
 */
export class ApplicationError extends Error {
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly statusCode?: number;
  public readonly details?: any;
  public readonly timestamp: Date;
  public readonly id: string;

  constructor(
    message: string,
    options?: {
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      statusCode?: number;
      details?: any;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.severity = options?.severity || ErrorSeverity.MEDIUM;
    this.category = options?.category || ErrorCategory.UNKNOWN;
    this.statusCode = options?.statusCode;
    this.details = options?.details;
    this.timestamp = new Date();
    this.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Set the cause if provided (ES2022 feature)
    if (options?.cause) {
      this.cause = options.cause;
    }

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApplicationError);
    }
  }
}

/**
 * Global error handler configuration
 */
interface ErrorHandlerConfig {
  showToast?: boolean;
  logToConsole?: boolean;
  sendToSentry?: boolean;
  customHandler?: (error: Error) => void;
}

/**
 * Main error handler function
 */
export function handleError(
  error: Error | ApplicationError,
  config: ErrorHandlerConfig = {}
): void {
  const {
    showToast = true,
    logToConsole = process.env.NODE_ENV === 'development',
    sendToSentry = process.env.NODE_ENV === 'production',
    customHandler,
  } = config;

  // Log to console in development
  if (logToConsole) {
    console.error('Error occurred:', error);
  }

  // Determine error details
  const isApplicationError = error instanceof ApplicationError;
  const severity = isApplicationError ? error.severity : ErrorSeverity.MEDIUM;
  const category = isApplicationError ? error.category : ErrorCategory.UNKNOWN;

  // Show toast notification based on severity
  if (showToast) {
    const message = getErrorMessage(error);

    switch (severity) {
      case ErrorSeverity.CRITICAL:
        toast.error(message, {
          duration: 10000,
          icon: '🚨',
        });
        break;
      case ErrorSeverity.HIGH:
        toast.error(message, {
          duration: 7000,
        });
        break;
      case ErrorSeverity.MEDIUM:
        toast.error(message, {
          duration: 5000,
        });
        break;
      case ErrorSeverity.LOW:
        toast(message, {
          duration: 3000,
          icon: 'ℹ️',
        });
        break;
    }
  }

  // Send to Sentry
  if (sendToSentry && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.withScope((scope) => {
      // Set error metadata
      scope.setLevel(getSentryLevel(severity));
      scope.setTag('error.category', category);

      if (isApplicationError) {
        scope.setContext('error', {
          id: error.id,
          severity: error.severity,
          category: error.category,
          statusCode: error.statusCode,
          details: error.details,
          timestamp: error.timestamp,
        });
      }

      // Capture the exception
      Sentry.captureException(error);
    });
  }

  // Call custom handler if provided
  if (customHandler) {
    customHandler(error);
  }
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: Error | ApplicationError): string {
  // Handle specific error types
  if (error instanceof ApplicationError) {
    switch (error.category) {
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication failed. Please sign in again.';
      case ErrorCategory.AUTHORIZATION:
        return 'You do not have permission to perform this action.';
      case ErrorCategory.VALIDATION:
        return error.message || 'Please check your input and try again.';
      case ErrorCategory.NETWORK:
        return 'Network error. Please check your connection.';
      case ErrorCategory.SERVER:
        return 'Server error. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  // Handle axios errors
  if ('response' in error && typeof error.response === 'object') {
    const axiosError = error as any;
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
    if (axiosError.response?.status === 404) {
      return 'Resource not found.';
    }
    if (axiosError.response?.status === 500) {
      return 'Server error. Please try again later.';
    }
  }

  // Handle network errors
  if (error.message === 'Network Error' || error.message === 'Failed to fetch') {
    return 'Network connection error. Please check your internet connection.';
  }

  // Default message
  return error.message || 'An unexpected error occurred.';
}

/**
 * Convert error severity to Sentry level
 */
function getSentryLevel(severity: ErrorSeverity): Sentry.SeverityLevel {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      return 'fatal';
    case ErrorSeverity.HIGH:
      return 'error';
    case ErrorSeverity.MEDIUM:
      return 'warning';
    case ErrorSeverity.LOW:
      return 'info';
    default:
      return 'error';
  }
}

/**
 * Create error from HTTP response
 */
export function createErrorFromResponse(
  response: any,
  defaultMessage = 'Request failed'
): ApplicationError {
  const status = response?.status || response?.statusCode;
  const message = response?.data?.message || response?.message || defaultMessage;

  let category = ErrorCategory.SERVER;
  let severity = ErrorSeverity.MEDIUM;

  // Determine category and severity based on status code
  if (status === 401) {
    category = ErrorCategory.AUTHENTICATION;
    severity = ErrorSeverity.HIGH;
  } else if (status === 403) {
    category = ErrorCategory.AUTHORIZATION;
    severity = ErrorSeverity.MEDIUM;
  } else if (status === 400 || status === 422) {
    category = ErrorCategory.VALIDATION;
    severity = ErrorSeverity.LOW;
  } else if (status >= 500) {
    category = ErrorCategory.SERVER;
    severity = ErrorSeverity.HIGH;
  } else if (!status) {
    category = ErrorCategory.NETWORK;
    severity = ErrorSeverity.HIGH;
  }

  return new ApplicationError(message, {
    category,
    severity,
    statusCode: status,
    details: response?.data,
  });
}

/**
 * Retry failed operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = Math.min(initialDelay * Math.pow(factor, attempt - 1), maxDelay);

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Error recovery strategies
 */
export const ErrorRecovery = {
  /**
   * Reload the page
   */
  reload: () => {
    window.location.reload();
  },

  /**
   * Navigate to home
   */
  goHome: () => {
    window.location.href = '/';
  },

  /**
   * Navigate to dashboard
   */
  goDashboard: () => {
    window.location.href = '/dashboard';
  },

  /**
   * Clear local storage and reload
   */
  clearAndReload: () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  },

  /**
   * Sign out and redirect to login
   */
  signOut: () => {
    // Clear auth tokens
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    // Redirect to sign-in
    window.location.href = '/sign-in';
  },
};

/**
 * Install global error handlers
 */
export function installGlobalErrorHandlers(): void {
  // Handle unhandled promise rejections
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);

      handleError(
        new ApplicationError('Unhandled promise rejection', {
          severity: ErrorSeverity.HIGH,
          category: ErrorCategory.CLIENT,
          details: event.reason,
        })
      );

      // Prevent default browser behavior
      event.preventDefault();
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      // Skip cross-origin script errors
      if (event.message === 'Script error.' && !event.filename) {
        return;
      }

      console.error('Global error:', event.error);

      handleError(
        new ApplicationError(event.message, {
          severity: ErrorSeverity.HIGH,
          category: ErrorCategory.CLIENT,
          details: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        })
      );
    });
  }
}