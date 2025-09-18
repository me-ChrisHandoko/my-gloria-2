'use client';

import { useEffect } from 'react';
import { ErrorFallback } from '@/components/shared/ErrorRecovery';
import { logger } from '@/lib/errors/errorLogger';
import * as Sentry from '@sentry/nextjs';

/**
 * Global error boundary for the entire application
 * This component replaces the entire page when a critical error occurs
 * It must include html and body tags as it replaces the root layout
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error
    logger.error('Critical global error occurred', error, {
      digest: error.digest,
    });

    // Report to Sentry
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error, {
        tags: {
          location: 'global_error_boundary',
          severity: 'critical',
        },
        contexts: {
          error: {
            digest: error.digest,
          },
        },
      });
    }
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>Error - Gloria System</title>
      </head>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-2xl w-full px-4">
            <ErrorFallback error={error} />
          </div>
        </div>
      </body>
    </html>
  );
}