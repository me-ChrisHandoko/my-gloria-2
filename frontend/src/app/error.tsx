'use client';

import { useEffect } from 'react';
import { ErrorFallback } from '@/components/shared/ErrorRecovery';
import { logger } from '@/lib/errors/errorLogger';
import * as Sentry from '@sentry/nextjs';

/**
 * Global error page component
 * This component is displayed when an unhandled error occurs in the application
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
    logger.error('Global error occurred', error, {
      digest: error.digest,
    });

    // Report to Sentry
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error, {
        tags: {
          location: 'global_error_page',
        },
        contexts: {
          error: {
            digest: error.digest,
          },
        },
      });
    }
  }, [error]);

  return <ErrorFallback error={error} />;
}