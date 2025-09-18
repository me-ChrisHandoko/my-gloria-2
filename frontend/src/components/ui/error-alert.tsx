'use client';

import React from 'react';
import { XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ErrorAlertProps {
  error?: any;
  title?: string;
  message?: string;
  type?: 'error' | 'warning';
  onRetry?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  title,
  message,
  type = 'error',
  onRetry,
  dismissible = false,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  if (!isVisible) return null;

  // Extract error message from various error formats
  const getErrorMessage = () => {
    if (message) return message;

    if (error) {
      if (typeof error === 'string') return error;
      if (error.message) return error.message;
      if (error.data?.message) return error.data.message;
      if (error.error) return error.error;
    }

    return 'An unexpected error occurred. Please try again.';
  };

  const getTitle = () => {
    if (title) return title;
    return type === 'error' ? 'Error' : 'Warning';
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const bgColor = type === 'error'
    ? 'bg-red-50 dark:bg-red-900/20'
    : 'bg-yellow-50 dark:bg-yellow-900/20';

  const borderColor = type === 'error'
    ? 'border-red-200 dark:border-red-800'
    : 'border-yellow-200 dark:border-yellow-800';

  const textColor = type === 'error'
    ? 'text-red-800 dark:text-red-200'
    : 'text-yellow-800 dark:text-yellow-200';

  const iconColor = type === 'error'
    ? 'text-red-400 dark:text-red-300'
    : 'text-yellow-400 dark:text-yellow-300';

  const Icon = type === 'error' ? XCircleIcon : ExclamationTriangleIcon;

  return (
    <div className={`rounded-lg border ${bgColor} ${borderColor} p-4`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${textColor}`}>
            {getTitle()}
          </h3>
          <div className={`mt-2 text-sm ${textColor}`}>
            <p>{getErrorMessage()}</p>
          </div>
          {(onRetry || dismissible) && (
            <div className="mt-4 flex space-x-3">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className={`text-sm font-medium ${textColor} hover:underline focus:outline-none`}
                >
                  Try again
                </button>
              )}
              {dismissible && (
                <button
                  type="button"
                  onClick={handleDismiss}
                  className={`text-sm font-medium ${textColor} hover:underline focus:outline-none`}
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Default export for lazy loading
export default ErrorAlert;