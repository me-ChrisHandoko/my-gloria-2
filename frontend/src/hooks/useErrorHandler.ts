'use client';

import { useCallback } from 'react';
import { ApplicationError, ErrorSeverity, ErrorCategory, handleError } from '@/lib/errors/errorHandler';
import { logger } from '@/lib/errors/errorLogger';

/**
 * Hook for handling errors in components
 */
export function useErrorHandler() {
  /**
   * Handle error with default configuration
   */
  const handleComponentError = useCallback((error: Error | ApplicationError, showToast = true) => {
    handleError(error, { showToast });
  }, []);

  /**
   * Handle async errors
   */
  const handleAsyncError = useCallback(async <T,>(
    promise: Promise<T>,
    options?: {
      fallback?: T;
      showToast?: boolean;
      retries?: number;
    }
  ): Promise<T | undefined> => {
    const { fallback, showToast = true, retries = 0 } = options || {};

    let lastError: Error | undefined;
    let attempts = 0;

    while (attempts <= retries) {
      try {
        return await promise;
      } catch (error) {
        lastError = error as Error;
        attempts++;

        if (attempts > retries) {
          handleError(lastError, { showToast });

          if (fallback !== undefined) {
            return fallback;
          }

          throw lastError;
        }

        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }

    return fallback;
  }, []);

  /**
   * Create an error with specific category
   */
  const createError = useCallback((
    message: string,
    category: ErrorCategory = ErrorCategory.CLIENT,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    details?: any
  ) => {
    return new ApplicationError(message, {
      category,
      severity,
      details,
    });
  }, []);

  /**
   * Handle form validation errors
   */
  const handleValidationError = useCallback((
    errors: Record<string, string | string[]>,
    showToast = true
  ) => {
    const firstError = Object.values(errors).flat()[0];
    const error = new ApplicationError(firstError || 'Validation failed', {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      details: errors,
    });

    handleError(error, { showToast });
  }, []);

  /**
   * Handle API errors
   */
  const handleApiError = useCallback((
    error: any,
    fallbackMessage = 'API request failed'
  ) => {
    let appError: ApplicationError;

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.message || fallbackMessage;

      if (status === 401) {
        appError = new ApplicationError(message, {
          category: ErrorCategory.AUTHENTICATION,
          severity: ErrorSeverity.HIGH,
          statusCode: status,
        });
      } else if (status === 403) {
        appError = new ApplicationError(message, {
          category: ErrorCategory.AUTHORIZATION,
          severity: ErrorSeverity.MEDIUM,
          statusCode: status,
        });
      } else if (status >= 500) {
        appError = new ApplicationError(message, {
          category: ErrorCategory.SERVER,
          severity: ErrorSeverity.HIGH,
          statusCode: status,
        });
      } else {
        appError = new ApplicationError(message, {
          category: ErrorCategory.CLIENT,
          severity: ErrorSeverity.MEDIUM,
          statusCode: status,
        });
      }
    } else if (error.request) {
      // Request made but no response
      appError = new ApplicationError('Network error. Please check your connection.', {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
      });
    } else {
      // Something else happened
      appError = new ApplicationError(error.message || fallbackMessage, {
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.MEDIUM,
      });
    }

    handleError(appError);
    return appError;
  }, []);

  /**
   * Log error without showing toast
   */
  const logError = useCallback((
    message: string,
    error?: Error,
    data?: any
  ) => {
    logger.error(message, error, data);
  }, []);

  /**
   * Log warning
   */
  const logWarning = useCallback((
    message: string,
    data?: any
  ) => {
    logger.warn(message, data);
  }, []);

  return {
    handleError: handleComponentError,
    handleAsyncError,
    createError,
    handleValidationError,
    handleApiError,
    logError,
    logWarning,
  };
}