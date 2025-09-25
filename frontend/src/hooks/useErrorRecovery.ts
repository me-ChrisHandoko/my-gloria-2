import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError, isRetryableError } from '@/lib/api/errors';
import { logger } from '@/lib/errors/errorLogger';
import { retryWithBackoff } from '@/lib/errors/errorHandler';

export interface RecoveryStrategy {
  name: string;
  description: string;
  action: () => Promise<void> | void;
  icon?: React.ReactNode;
}

export interface UseErrorRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onSuccess?: () => void;
  onFailure?: (error: Error) => void;
  autoRetry?: boolean;
  strategies?: RecoveryStrategy[];
}

export interface ErrorRecoveryState {
  error: Error | null;
  isRecovering: boolean;
  retryCount: number;
  lastRetry: Date | null;
  recoverySuccess: boolean;
}

/**
 * Hook for advanced error recovery with multiple strategies
 */
export function useErrorRecovery(options: UseErrorRecoveryOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onSuccess,
    onFailure,
    autoRetry = false,
    strategies = [],
  } = options;

  const router = useRouter();
  const [state, setState] = useState<ErrorRecoveryState>({
    error: null,
    isRecovering: false,
    retryCount: 0,
    lastRetry: null,
    recoverySuccess: false,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Default recovery strategies
   */
  const defaultStrategies: RecoveryStrategy[] = [
    {
      name: 'Retry',
      description: 'Try the operation again',
      action: async () => {
        if (state.error && state.retryCount < maxRetries) {
          await handleRetry();
        }
      },
    },
    {
      name: 'Refresh',
      description: 'Refresh the page',
      action: () => {
        window.location.reload();
      },
    },
    {
      name: 'Go Back',
      description: 'Return to previous page',
      action: () => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push('/dashboard');
        }
      },
    },
    {
      name: 'Clear Cache',
      description: 'Clear local data and retry',
      action: () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      },
    },
    {
      name: 'Contact Support',
      description: 'Report this issue',
      action: () => {
        // Open support dialog or redirect to support page
        window.open('/support', '_blank');
      },
    },
  ];

  const allStrategies = [...strategies, ...defaultStrategies];

  /**
   * Handle error with recovery options
   */
  const handleError = useCallback(
    async (error: Error, operation?: () => Promise<any>) => {
      if (!isMountedRef.current) return;

      logger.error('Error occurred, attempting recovery', error);

      setState((prev) => ({
        ...prev,
        error,
        isRecovering: autoRetry,
        recoverySuccess: false,
      }));

      // Auto-retry if enabled and error is retryable
      if (autoRetry && operation && error instanceof ApiError && error.isRetryable) {
        await handleRetry(operation);
      }
    },
    [autoRetry]
  );

  /**
   * Retry the failed operation
   */
  const handleRetry = useCallback(
    async (operation?: () => Promise<any>) => {
      if (!isMountedRef.current) return;

      if (state.retryCount >= maxRetries) {
        toast.error('Maximum retry attempts reached');
        if (onFailure) {
          onFailure(state.error!);
        }
        return;
      }

      setState((prev) => ({
        ...prev,
        isRecovering: true,
        lastRetry: new Date(),
      }));

      try {
        if (operation) {
          // Use exponential backoff for retries
          await retryWithBackoff(operation, {
            maxRetries: maxRetries - state.retryCount,
            initialDelay: retryDelay,
            onRetry: (attempt) => {
              logger.info(`Retry attempt ${attempt}/${maxRetries}`);
              toast.loading(`Retrying... (${attempt}/${maxRetries})`, {
                id: 'retry-toast',
              });
            },
          });

          // Success
          toast.success('Operation successful!', { id: 'retry-toast' });

          setState((prev) => ({
            ...prev,
            isRecovering: false,
            recoverySuccess: true,
            error: null,
          }));

          if (onSuccess) {
            onSuccess();
          }
        }
      } catch (error) {
        logger.error('Retry failed', error as Error);
        toast.error('Retry failed', { id: 'retry-toast' });

        setState((prev) => ({
          ...prev,
          isRecovering: false,
          retryCount: prev.retryCount + 1,
          error: error as Error,
        }));

        if (state.retryCount + 1 >= maxRetries && onFailure) {
          onFailure(error as Error);
        }
      }
    },
    [state.retryCount, maxRetries, retryDelay, onSuccess, onFailure]
  );

  /**
   * Execute a recovery strategy
   */
  const executeStrategy = useCallback(
    async (strategy: RecoveryStrategy) => {
      if (!isMountedRef.current) return;

      logger.info(`Executing recovery strategy: ${strategy.name}`);

      setState((prev) => ({
        ...prev,
        isRecovering: true,
      }));

      try {
        await strategy.action();

        setState((prev) => ({
          ...prev,
          isRecovering: false,
          recoverySuccess: true,
        }));

        toast.success(`Recovery strategy "${strategy.name}" executed successfully`);
      } catch (error) {
        logger.error(`Recovery strategy "${strategy.name}" failed`, error as Error);

        setState((prev) => ({
          ...prev,
          isRecovering: false,
          error: error as Error,
        }));

        toast.error(`Recovery strategy "${strategy.name}" failed`);
      }
    },
    []
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState({
      error: null,
      isRecovering: false,
      retryCount: 0,
      lastRetry: null,
      recoverySuccess: false,
    });
  }, []);

  /**
   * Check if error is recoverable
   */
  const isRecoverable = useCallback((error: Error): boolean => {
    if (error instanceof ApiError) {
      return error.isRetryable || error.statusCode >= 500;
    }

    // Network errors are usually recoverable
    if (error.message?.includes('Network') || error.message?.includes('Failed to fetch')) {
      return true;
    }

    return false;
  }, []);

  /**
   * Get suggested recovery strategies based on error type
   */
  const getSuggestedStrategies = useCallback(
    (error: Error): RecoveryStrategy[] => {
      const suggested: RecoveryStrategy[] = [];

      if (isRecoverable(error)) {
        // Add retry strategy first for recoverable errors
        const retryStrategy = allStrategies.find((s) => s.name === 'Retry');
        if (retryStrategy && state.retryCount < maxRetries) {
          suggested.push(retryStrategy);
        }
      }

      if (error instanceof ApiError) {
        switch (error.statusCode) {
          case 401: // Unauthorized
            suggested.push({
              name: 'Sign In',
              description: 'Sign in to continue',
              action: () => {
                router.push('/sign-in');
              },
            });
            break;

          case 403: // Forbidden
            suggested.push({
              name: 'Request Access',
              description: 'Request permission to access this resource',
              action: () => {
                router.push('/request-access');
              },
            });
            break;

          case 404: // Not Found
            suggested.push({
              name: 'Go to Dashboard',
              description: 'Return to dashboard',
              action: () => {
                router.push('/dashboard');
              },
            });
            break;

          case 429: // Rate Limited
            if (error instanceof ApiError && (error as any).retryAfter) {
              const retryAfter = (error as any).retryAfter;
              suggested.push({
                name: 'Wait and Retry',
                description: `Wait ${retryAfter} seconds and try again`,
                action: async () => {
                  toast.loading(`Waiting ${retryAfter} seconds...`, {
                    duration: retryAfter * 1000,
                    id: 'rate-limit-wait',
                  });
                  await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                  window.location.reload();
                },
              });
            }
            break;
        }
      }

      // Add remaining strategies
      const suggestedNames = new Set(suggested.map((s) => s.name));
      allStrategies.forEach((strategy) => {
        if (!suggestedNames.has(strategy.name)) {
          suggested.push(strategy);
        }
      });

      return suggested;
    },
    [allStrategies, state.retryCount, maxRetries, router]
  );

  return {
    state,
    handleError,
    handleRetry,
    executeStrategy,
    clearError,
    isRecoverable,
    getSuggestedStrategies,
    strategies: allStrategies,
  };
}

/**
 * Hook for circuit breaker pattern
 */
export function useCircuitBreaker(
  threshold: number = 5,
  timeout: number = 60000
) {
  const [isOpen, setIsOpen] = useState(false);
  const [failures, setFailures] = useState(0);
  const [lastFailure, setLastFailure] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const recordSuccess = useCallback(() => {
    setFailures(0);
    setIsOpen(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const recordFailure = useCallback(() => {
    const newFailures = failures + 1;
    setFailures(newFailures);
    setLastFailure(new Date());

    if (newFailures >= threshold) {
      setIsOpen(true);
      logger.warn(`Circuit breaker opened after ${newFailures} failures`);

      // Auto-close after timeout
      timeoutRef.current = setTimeout(() => {
        logger.info('Circuit breaker closing after timeout');
        setIsOpen(false);
        setFailures(0);
      }, timeout);
    }
  }, [failures, threshold, timeout]);

  const canExecute = useCallback(() => {
    if (!isOpen) return true;

    // Check if we should attempt a half-open state
    if (lastFailure && Date.now() - lastFailure.getTime() > timeout / 2) {
      logger.info('Circuit breaker attempting half-open state');
      return true;
    }

    return false;
  }, [isOpen, lastFailure, timeout]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isOpen,
    failures,
    lastFailure,
    recordSuccess,
    recordFailure,
    canExecute,
  };
}