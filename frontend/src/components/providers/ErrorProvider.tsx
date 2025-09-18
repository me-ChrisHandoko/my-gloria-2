'use client';

import { useEffect } from 'react';
import { ErrorProvider as ErrorContextProvider } from '@/contexts/ErrorContext';
import { installGlobalErrorHandlers } from '@/lib/errors/errorHandler';
import { logger } from '@/lib/errors/errorLogger';

/**
 * Global error provider that sets up error handling for the entire application
 */
export function ErrorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Install global error handlers
    installGlobalErrorHandlers();

    // Log application start
    logger.info('Application started', {
      environment: process.env.NODE_ENV,
      version: process.env.NEXT_PUBLIC_RELEASE || 'unknown',
    });

    // Clean up on unmount
    return () => {
      logger.info('Application stopped');
    };
  }, []);

  return (
    <ErrorContextProvider maxErrors={10} autoDismiss={true} autoDismissDelay={5000}>
      {children}
    </ErrorContextProvider>
  );
}