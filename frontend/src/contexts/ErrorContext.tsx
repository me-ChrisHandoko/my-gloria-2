'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ApplicationError, ErrorSeverity, ErrorCategory, handleError } from '@/lib/errors/errorHandler';

/**
 * Error record structure
 */
interface ErrorRecord {
  id: string;
  error: Error | ApplicationError;
  timestamp: Date;
  resolved: boolean;
}

/**
 * Error context state
 */
interface ErrorContextState {
  errors: ErrorRecord[];
  currentError: ErrorRecord | null;
  errorCount: number;
  addError: (error: Error | ApplicationError) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
  resolveError: (id: string) => void;
  getErrorById: (id: string) => ErrorRecord | undefined;
  hasErrors: boolean;
  hasCriticalErrors: boolean;
}

/**
 * Create the error context
 */
const ErrorContext = createContext<ErrorContextState | undefined>(undefined);

/**
 * Error context provider props
 */
interface ErrorProviderProps {
  children: ReactNode;
  maxErrors?: number;
  autoDismiss?: boolean;
  autoDismissDelay?: number;
}

/**
 * Error context provider component
 */
export function ErrorProvider({
  children,
  maxErrors = 10,
  autoDismiss = false,
  autoDismissDelay = 5000,
}: ErrorProviderProps) {
  const [errors, setErrors] = useState<ErrorRecord[]>([]);

  /**
   * Add error to the context
   */
  const addError = useCallback(
    (error: Error | ApplicationError) => {
      const errorRecord: ErrorRecord = {
        id: error instanceof ApplicationError ? error.id : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        error,
        timestamp: new Date(),
        resolved: false,
      };

      setErrors((prevErrors) => {
        // Limit the number of stored errors
        const newErrors = [errorRecord, ...prevErrors].slice(0, maxErrors);
        return newErrors;
      });

      // Handle the error (show toast, log to Sentry, etc.)
      handleError(error);

      // Auto-dismiss if enabled
      if (autoDismiss && error instanceof ApplicationError && error.severity === ErrorSeverity.LOW) {
        setTimeout(() => {
          resolveError(errorRecord.id);
        }, autoDismissDelay);
      }
    },
    [maxErrors, autoDismiss, autoDismissDelay]
  );

  /**
   * Remove error from the context
   */
  const removeError = useCallback((id: string) => {
    setErrors((prevErrors) => prevErrors.filter((error) => error.id !== id));
  }, []);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  /**
   * Mark error as resolved
   */
  const resolveError = useCallback((id: string) => {
    setErrors((prevErrors) =>
      prevErrors.map((error) =>
        error.id === id ? { ...error, resolved: true } : error
      )
    );
  }, []);

  /**
   * Get error by ID
   */
  const getErrorById = useCallback(
    (id: string) => {
      return errors.find((error) => error.id === id);
    },
    [errors]
  );

  /**
   * Check if there are any unresolved errors
   */
  const hasErrors = errors.some((error) => !error.resolved);

  /**
   * Check if there are any critical errors
   */
  const hasCriticalErrors = errors.some(
    (error) =>
      !error.resolved &&
      error.error instanceof ApplicationError &&
      (error.error.severity === ErrorSeverity.CRITICAL ||
        error.error.severity === ErrorSeverity.HIGH)
  );

  /**
   * Get current error (most recent unresolved)
   */
  const currentError = errors.find((error) => !error.resolved) || null;

  const value: ErrorContextState = {
    errors,
    currentError,
    errorCount: errors.length,
    addError,
    removeError,
    clearErrors,
    resolveError,
    getErrorById,
    hasErrors,
    hasCriticalErrors,
  };

  return <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>;
}

/**
 * Hook to use the error context
 */
export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}

/**
 * Hook to handle async operations with error handling
 */
export function useAsyncError() {
  const { addError } = useError();

  return useCallback(
    (error: Error) => {
      addError(error);
    },
    [addError]
  );
}

/**
 * Hook to create error handler for specific category
 */
export function useCategorizedError(category: ErrorCategory) {
  const { addError } = useError();

  return useCallback(
    (message: string, severity: ErrorSeverity = ErrorSeverity.MEDIUM, details?: any) => {
      const error = new ApplicationError(message, {
        category,
        severity,
        details,
      });
      addError(error);
    },
    [addError, category]
  );
}

/**
 * Hook for network error handling
 */
export function useNetworkError() {
  return useCategorizedError(ErrorCategory.NETWORK);
}

/**
 * Hook for validation error handling
 */
export function useValidationError() {
  return useCategorizedError(ErrorCategory.VALIDATION);
}

/**
 * Hook for auth error handling
 */
export function useAuthError() {
  return useCategorizedError(ErrorCategory.AUTHENTICATION);
}