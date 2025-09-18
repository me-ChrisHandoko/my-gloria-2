'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Home, ArrowLeft, Bug, Network, ServerCrash, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ErrorCategory, ErrorSeverity } from '@/lib/errors/errorHandler';

interface ErrorFallbackProps {
  error?: Error | any;
  reset?: () => void;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  showDetails?: boolean;
  customActions?: React.ReactNode;
}

/**
 * Production-ready error fallback component with recovery options
 */
export function ErrorFallback({
  error,
  reset,
  category = ErrorCategory.UNKNOWN,
  severity = ErrorSeverity.MEDIUM,
  showDetails = process.env.NODE_ENV === 'development',
  customActions,
}: ErrorFallbackProps) {
  const router = useRouter();

  // Get error icon based on category
  const getErrorIcon = () => {
    switch (category) {
      case ErrorCategory.NETWORK:
        return <Network className="h-8 w-8" />;
      case ErrorCategory.SERVER:
        return <ServerCrash className="h-8 w-8" />;
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
        return <ShieldAlert className="h-8 w-8" />;
      case ErrorCategory.VALIDATION:
        return <AlertTriangle className="h-8 w-8" />;
      default:
        return <AlertCircle className="h-8 w-8" />;
    }
  };

  // Get error title based on category
  const getErrorTitle = () => {
    switch (category) {
      case ErrorCategory.NETWORK:
        return 'Network Error';
      case ErrorCategory.SERVER:
        return 'Server Error';
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication Required';
      case ErrorCategory.AUTHORIZATION:
        return 'Access Denied';
      case ErrorCategory.VALIDATION:
        return 'Validation Error';
      default:
        return 'Something went wrong';
    }
  };

  // Get error description based on category
  const getErrorDescription = () => {
    switch (category) {
      case ErrorCategory.NETWORK:
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      case ErrorCategory.SERVER:
        return 'The server encountered an error. Our team has been notified and is working on a fix.';
      case ErrorCategory.AUTHENTICATION:
        return 'You need to sign in to access this page.';
      case ErrorCategory.AUTHORIZATION:
        return 'You don\'t have permission to access this resource.';
      case ErrorCategory.VALIDATION:
        return 'There was an issue with the data provided. Please check your input and try again.';
      default:
        return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
    }
  };

  // Get severity color
  const getSeverityColor = () => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'text-red-600 dark:text-red-400';
      case ErrorSeverity.HIGH:
        return 'text-orange-600 dark:text-orange-400';
      case ErrorSeverity.MEDIUM:
        return 'text-yellow-600 dark:text-yellow-400';
      case ErrorSeverity.LOW:
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  const handleRefresh = () => {
    if (reset) {
      reset();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={getSeverityColor()}>
              {getErrorIcon()}
            </div>
            <div>
              <CardTitle>{getErrorTitle()}</CardTitle>
              <CardDescription className="mt-1">
                {getErrorDescription()}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {/* Error details for development */}
        {showDetails && error && (
          <CardContent>
            <Alert>
              <Bug className="h-4 w-4" />
              <AlertTitle>Debug Information</AlertTitle>
              <AlertDescription className="mt-2">
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold">Error:</span>{' '}
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                      {error.name || 'Error'}
                    </code>
                  </div>
                  <div>
                    <span className="font-semibold">Message:</span>{' '}
                    <span className="text-sm">{error.message}</span>
                  </div>
                  {error.statusCode && (
                    <div>
                      <span className="font-semibold">Status:</span>{' '}
                      <code className="text-sm bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                        {error.statusCode}
                      </code>
                    </div>
                  )}
                  {error.stack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                        Stack Trace
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-40">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        )}

        <CardFooter className="flex gap-2">
          {/* Custom actions */}
          {customActions}

          {/* Default actions based on category */}
          {category === ErrorCategory.AUTHENTICATION ? (
            <>
              <Link href="/sign-in" className="flex-1">
                <Button className="w-full">
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </Link>
              <Button variant="outline" onClick={handleGoBack} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </>
          ) : category === ErrorCategory.AUTHORIZATION ? (
            <>
              <Button onClick={handleGoBack} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Link href="/dashboard" className="flex-1">
                <Button variant="outline" className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Button onClick={handleRefresh} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={handleGoBack} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Link href="/dashboard" className="flex-1">
                <Button variant="outline" className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

/**
 * Async error boundary for server components
 */
export function AsyncErrorFallback({ error }: { error: Error }) {
  return (
    <ErrorFallback
      error={error}
      category={ErrorCategory.SERVER}
      severity={ErrorSeverity.HIGH}
    />
  );
}

/**
 * 404 Not Found fallback
 */
export function NotFoundFallback() {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-gray-400" />
            <div>
              <CardTitle>Page Not Found</CardTitle>
              <CardDescription className="mt-1">
                The page you're looking for doesn't exist or has been moved.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardFooter className="flex gap-2">
          <Link href="/dashboard" className="flex-1">
            <Button className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

/**
 * Offline fallback
 */
export function OfflineFallback() {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Network className="h-8 w-8 text-gray-400" />
            <div>
              <CardTitle>You're Offline</CardTitle>
              <CardDescription className="mt-1">
                Please check your internet connection and try again.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => window.location.reload()} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}