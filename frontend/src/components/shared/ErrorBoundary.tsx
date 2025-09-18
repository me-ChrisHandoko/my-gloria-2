'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  errorId?: string;
  isChunkLoadError: boolean;
  errorHistory: Array<{ error: Error; timestamp: Date }>;
}

/**
 * Production-ready Error Boundary component
 * Catches JavaScript errors anywhere in the child component tree
 * Logs error information and displays a fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      isChunkLoadError: false,
      errorHistory: [],
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Check if it's a chunk load error (common in production)
    const isChunkLoadError =
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('ChunkLoadError');

    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      isChunkLoadError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Generate error ID for tracking
    const errorId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Update state with error details and history
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
      errorId,
      errorHistory: [
        ...prevState.errorHistory.slice(-4), // Keep last 5 errors
        { error, timestamp: new Date() }
      ]
    }));

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send to Sentry in production
    if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.withScope((scope) => {
        scope.setContext('errorBoundary', {
          errorId,
          errorCount: this.state.errorCount + 1,
          componentStack: errorInfo.componentStack,
        });
        scope.setLevel('error');
        scope.setTag('error.boundary', true);

        // Add user context if available
        const userId = this.getUserId();
        if (userId) {
          scope.setUser({ id: userId });
        }

        Sentry.captureException(error);
      });
    }
  }

  handleReset = () => {
    // For chunk load errors, reload the page
    if (this.state.isChunkLoadError) {
      window.location.reload();
      return;
    }

    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isChunkLoadError: false,
    });
  };

  handleReport = () => {
    // Send user feedback to Sentry
    if (this.state.errorId) {
      const dialog = Sentry.showReportDialog({
        eventId: this.state.errorId,
        title: 'It looks like we\'re having issues.',
        subtitle: 'Our team has been notified.',
        subtitle2: 'If you\'d like to help, tell us what happened below.',
        labelName: 'Name',
        labelEmail: 'Email',
        labelComments: 'What happened?',
        labelClose: 'Close',
        labelSubmit: 'Submit',
        successMessage: 'Your feedback has been sent. Thank you!',
      });
    }
  };

  getUserId = (): string | null => {
    // Try to get user ID from various sources
    try {
      // Check localStorage for user data
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.id || user.email || null;
      }
    } catch {
      // Ignore errors when accessing localStorage
    }
    return null;
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 border border-red-200 dark:border-red-800">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Something went wrong
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    An unexpected error occurred while rendering this component
                  </p>
                </div>
              </div>

              {/* Error details in development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <p className="text-sm font-mono text-red-600 dark:text-red-400">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                        Component Stack
                      </summary>
                      <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Special handling for chunk load errors */}
              {this.state.isChunkLoadError && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    A new version of the application is available. Please refresh the page to continue.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <Button
                  onClick={this.handleReset}
                  variant="default"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {this.state.isChunkLoadError ? 'Refresh Page' : 'Try Again'}
                </Button>
                <Link href="/dashboard" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <Home className="h-4 w-4 mr-2" />
                    Go to Dashboard
                  </Button>
                </Link>
              </div>

              {/* Report button for production */}
              {process.env.NODE_ENV === 'production' && this.state.errorId && (
                <div className="mt-3">
                  <Button
                    onClick={this.handleReport}
                    variant="ghost"
                    size="sm"
                    className="w-full text-gray-600 dark:text-gray-400"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Report this issue
                  </Button>
                </div>
              )}

              {/* Error count warning */}
              {this.state.errorCount > 2 && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    This component has crashed {this.state.errorCount} times.
                    If the problem persists, please contact support.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to wrap functional components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  return React.forwardRef<any, P>((props, ref) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} ref={ref} />
    </ErrorBoundary>
  ));
}