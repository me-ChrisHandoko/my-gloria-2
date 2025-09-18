'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Home, WifiOff, ShieldAlert, ServerCrash, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ErrorCategory, ErrorSeverity, ApplicationError } from '@/lib/errors/errorHandler';

/**
 * Props for ErrorRecovery component
 */
interface ErrorRecoveryProps {
  error: Error | ApplicationError;
  onRetry?: () => void;
  onReset?: () => void;
  className?: string;
}

/**
 * Error recovery component with different UI based on error type
 */
export function ErrorRecovery({ error, onRetry, onReset, className = '' }: ErrorRecoveryProps) {
  const isApplicationError = error instanceof ApplicationError;
  const category = isApplicationError ? error.category : ErrorCategory.UNKNOWN;
  const severity = isApplicationError ? error.severity : ErrorSeverity.MEDIUM;

  // Get error-specific icon and color
  const { icon: Icon, color, bgColor } = getErrorStyle(category);

  return (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <div className="max-w-md w-full">
        <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 border ${bgColor}`}>
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0">
              <Icon className={`h-8 w-8 ${color}`} />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {getErrorTitle(category)}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {getErrorDescription(error, category)}
              </p>
            </div>
          </div>

          {/* Error details in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
              <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                {error.message}
              </p>
              {isApplicationError && error.details && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                    Details
                  </summary>
                  <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                    {JSON.stringify(error.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Recovery actions */}
          <div className="mt-6">
            {getRecoveryActions(category, onRetry, onReset)}
          </div>

          {/* Additional help text for critical errors */}
          {severity === ErrorSeverity.CRITICAL && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">
                This is a critical error. If the problem persists, please contact support immediately.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Get error-specific styling
 */
function getErrorStyle(category: ErrorCategory) {
  switch (category) {
    case ErrorCategory.NETWORK:
      return {
        icon: WifiOff,
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'border-orange-200 dark:border-orange-800',
      };
    case ErrorCategory.AUTHENTICATION:
    case ErrorCategory.AUTHORIZATION:
      return {
        icon: ShieldAlert,
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'border-yellow-200 dark:border-yellow-800',
      };
    case ErrorCategory.SERVER:
      return {
        icon: ServerCrash,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'border-red-200 dark:border-red-800',
      };
    case ErrorCategory.VALIDATION:
      return {
        icon: AlertCircle,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'border-blue-200 dark:border-blue-800',
      };
    case ErrorCategory.CLIENT:
      return {
        icon: Bug,
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'border-purple-200 dark:border-purple-800',
      };
    default:
      return {
        icon: AlertCircle,
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'border-gray-200 dark:border-gray-800',
      };
  }
}

/**
 * Get error title based on category
 */
function getErrorTitle(category: ErrorCategory): string {
  switch (category) {
    case ErrorCategory.NETWORK:
      return 'Network Error';
    case ErrorCategory.AUTHENTICATION:
      return 'Authentication Required';
    case ErrorCategory.AUTHORIZATION:
      return 'Access Denied';
    case ErrorCategory.SERVER:
      return 'Server Error';
    case ErrorCategory.VALIDATION:
      return 'Validation Error';
    case ErrorCategory.CLIENT:
      return 'Application Error';
    default:
      return 'Something went wrong';
  }
}

/**
 * Get error description based on category
 */
function getErrorDescription(error: Error | ApplicationError, category: ErrorCategory): string {
  // Use custom message if available
  if (error instanceof ApplicationError && error.message) {
    return error.message;
  }

  // Default messages by category
  switch (category) {
    case ErrorCategory.NETWORK:
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    case ErrorCategory.AUTHENTICATION:
      return 'Your session has expired. Please sign in again to continue.';
    case ErrorCategory.AUTHORIZATION:
      return 'You do not have permission to access this resource.';
    case ErrorCategory.SERVER:
      return 'The server encountered an error. Our team has been notified.';
    case ErrorCategory.VALIDATION:
      return 'Please check your input and try again.';
    case ErrorCategory.CLIENT:
      return 'An unexpected error occurred in the application.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Get recovery actions based on error category
 */
function getRecoveryActions(
  category: ErrorCategory,
  onRetry?: () => void,
  onReset?: () => void
): React.ReactNode {
  switch (category) {
    case ErrorCategory.NETWORK:
      return (
        <div className="flex gap-3">
          <Button onClick={onRetry} variant="default" className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="flex-1"
          >
            Refresh Page
          </Button>
        </div>
      );

    case ErrorCategory.AUTHENTICATION:
      return (
        <div className="flex gap-3">
          <Link href="/sign-in" className="flex-1">
            <Button variant="default" className="w-full">
              Sign In
            </Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>
      );

    case ErrorCategory.AUTHORIZATION:
      return (
        <div className="flex gap-3">
          <Link href="/dashboard" className="flex-1">
            <Button variant="default" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
          <Button onClick={() => window.history.back()} variant="outline" className="flex-1">
            Go Back
          </Button>
        </div>
      );

    case ErrorCategory.SERVER:
      return (
        <div className="flex gap-3">
          <Button onClick={onRetry || (() => window.location.reload())} variant="default" className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Link href="/dashboard" className="flex-1">
            <Button variant="outline" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>
      );

    case ErrorCategory.VALIDATION:
      return (
        <Button onClick={onReset || (() => window.history.back())} variant="default" className="w-full">
          Go Back and Try Again
        </Button>
      );

    default:
      return (
        <div className="flex gap-3">
          {onRetry && (
            <Button onClick={onRetry} variant="default" className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          <Link href="/dashboard" className="flex-1">
            <Button variant="outline" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      );
  }
}

/**
 * Minimal error fallback component
 */
export function ErrorFallback({ error }: { error?: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Oops! Something went wrong
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {error?.message || 'An unexpected error occurred'}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => window.location.reload()} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload Page
          </Button>
          <Link href="/">
            <Button variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}