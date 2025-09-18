'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
  startTime: number;
  estimatedTime?: number;
}

interface LoadingContextType {
  // Global loading state
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean, message?: string) => void;

  // Named loading states
  loadingStates: Map<string, LoadingState>;
  startLoading: (key: string, message?: string, estimatedTime?: number) => void;
  stopLoading: (key: string) => void;
  updateLoadingProgress: (key: string, progress: number) => void;
  updateLoadingMessage: (key: string, message: string) => void;
  isLoading: (key: string) => boolean;
  getLoadingState: (key: string) => LoadingState | undefined;

  // Batch loading
  startBatchLoading: (keys: string[], message?: string) => void;
  stopBatchLoading: (keys: string[]) => void;

  // Loading utilities
  clearAllLoading: () => void;
  getActiveLoadingCount: () => number;
  getLoadingKeys: () => string[];

  // Configuration
  minimumLoadingTime: number;
  setMinimumLoadingTime: (time: number) => void;
  showProgressBar: boolean;
  setShowProgressBar: (show: boolean) => void;
  showSpinner: boolean;
  setShowSpinner: (show: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: React.ReactNode;
  defaultMinimumLoadingTime?: number;
  defaultShowProgressBar?: boolean;
  defaultShowSpinner?: boolean;
  spinnerComponent?: React.ComponentType<{ message?: string; progress?: number }>;
  progressBarComponent?: React.ComponentType<{ progress: number }>;
}

// Default spinner component
const DefaultSpinner: React.FC<{ message?: string; progress?: number }> = ({ message, progress }) => (
  <div className="flex flex-col items-center justify-center space-y-4">
    <div className="relative">
      <div className="h-12 w-12 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
      <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
    </div>
    {message && (
      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
    )}
    {progress !== undefined && (
      <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    )}
  </div>
);

// Default progress bar component
const DefaultProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200 dark:bg-gray-800">
    <motion.div
      className="h-full bg-blue-500"
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
      transition={{ duration: 0.3 }}
    />
  </div>
);

export const LoadingProvider: React.FC<LoadingProviderProps> = ({
  children,
  defaultMinimumLoadingTime = 300,
  defaultShowProgressBar = true,
  defaultShowSpinner = true,
  spinnerComponent: SpinnerComponent = DefaultSpinner,
  progressBarComponent: ProgressBarComponent = DefaultProgressBar,
}) => {
  const [globalLoading, setGlobalLoadingState] = useState(false);
  const [globalMessage, setGlobalMessage] = useState<string>();
  const [loadingStates, setLoadingStates] = useState<Map<string, LoadingState>>(new Map());
  const [minimumLoadingTime, setMinimumLoadingTime] = useState(defaultMinimumLoadingTime);
  const [showProgressBar, setShowProgressBar] = useState(defaultShowProgressBar);
  const [showSpinner, setShowSpinner] = useState(defaultShowSpinner);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const progressIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      progressIntervals.current.forEach(interval => clearInterval(interval));
    };
  }, []);

  // Set global loading
  const setGlobalLoading = useCallback((loading: boolean, message?: string) => {
    setGlobalLoadingState(loading);
    setGlobalMessage(message);
  }, []);

  // Start loading for a specific key
  const startLoading = useCallback((key: string, message?: string, estimatedTime?: number) => {
    setLoadingStates(prev => {
      const newStates = new Map(prev);
      newStates.set(key, {
        isLoading: true,
        message,
        progress: 0,
        startTime: Date.now(),
        estimatedTime,
      });
      return newStates;
    });

    // Auto progress if estimated time is provided
    if (estimatedTime && estimatedTime > 0) {
      const interval = setInterval(() => {
        setLoadingStates(prev => {
          const state = prev.get(key);
          if (!state || !state.isLoading) {
            clearInterval(interval);
            progressIntervals.current.delete(key);
            return prev;
          }

          const elapsed = Date.now() - state.startTime;
          const progress = Math.min(95, (elapsed / estimatedTime) * 100);

          const newStates = new Map(prev);
          newStates.set(key, { ...state, progress });
          return newStates;
        });
      }, 100);

      progressIntervals.current.set(key, interval);
    }
  }, []);

  // Stop loading for a specific key
  const stopLoading = useCallback((key: string) => {
    const state = loadingStates.get(key);
    if (!state) return;

    const elapsed = Date.now() - state.startTime;
    const remainingTime = Math.max(0, minimumLoadingTime - elapsed);

    // Clear any progress interval
    const interval = progressIntervals.current.get(key);
    if (interval) {
      clearInterval(interval);
      progressIntervals.current.delete(key);
    }

    // Clear any existing timeout
    const existingTimeout = timeoutRefs.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    if (remainingTime > 0) {
      // Set to 100% progress immediately
      setLoadingStates(prev => {
        const newStates = new Map(prev);
        const currentState = newStates.get(key);
        if (currentState) {
          newStates.set(key, { ...currentState, progress: 100 });
        }
        return newStates;
      });

      // Delay the actual removal
      const timeout = setTimeout(() => {
        setLoadingStates(prev => {
          const newStates = new Map(prev);
          newStates.delete(key);
          return newStates;
        });
        timeoutRefs.current.delete(key);
      }, remainingTime);

      timeoutRefs.current.set(key, timeout);
    } else {
      // Remove immediately
      setLoadingStates(prev => {
        const newStates = new Map(prev);
        newStates.delete(key);
        return newStates;
      });
    }
  }, [loadingStates, minimumLoadingTime]);

  // Update loading progress
  const updateLoadingProgress = useCallback((key: string, progress: number) => {
    setLoadingStates(prev => {
      const state = prev.get(key);
      if (!state) return prev;

      const newStates = new Map(prev);
      newStates.set(key, { ...state, progress: Math.min(100, Math.max(0, progress)) });
      return newStates;
    });
  }, []);

  // Update loading message
  const updateLoadingMessage = useCallback((key: string, message: string) => {
    setLoadingStates(prev => {
      const state = prev.get(key);
      if (!state) return prev;

      const newStates = new Map(prev);
      newStates.set(key, { ...state, message });
      return newStates;
    });
  }, []);

  // Check if specific key is loading
  const isLoading = useCallback((key: string) => {
    return loadingStates.has(key);
  }, [loadingStates]);

  // Get loading state for a specific key
  const getLoadingState = useCallback((key: string) => {
    return loadingStates.get(key);
  }, [loadingStates]);

  // Start batch loading
  const startBatchLoading = useCallback((keys: string[], message?: string) => {
    keys.forEach(key => startLoading(key, message));
  }, [startLoading]);

  // Stop batch loading
  const stopBatchLoading = useCallback((keys: string[]) => {
    keys.forEach(key => stopLoading(key));
  }, [stopLoading]);

  // Clear all loading states
  const clearAllLoading = useCallback(() => {
    // Clear all timeouts and intervals
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    progressIntervals.current.forEach(interval => clearInterval(interval));
    timeoutRefs.current.clear();
    progressIntervals.current.clear();

    setLoadingStates(new Map());
    setGlobalLoadingState(false);
    setGlobalMessage(undefined);
  }, []);

  // Get active loading count
  const getActiveLoadingCount = useCallback(() => {
    return loadingStates.size;
  }, [loadingStates]);

  // Get all loading keys
  const getLoadingKeys = useCallback(() => {
    return Array.from(loadingStates.keys());
  }, [loadingStates]);

  // Calculate overall progress
  const overallProgress = React.useMemo(() => {
    if (loadingStates.size === 0) return 100;

    let totalProgress = 0;
    loadingStates.forEach(state => {
      totalProgress += state.progress || 0;
    });

    return totalProgress / loadingStates.size;
  }, [loadingStates]);

  // Determine if anything is loading
  const isAnythingLoading = globalLoading || loadingStates.size > 0;

  // Get primary message
  const primaryMessage = globalMessage ||
    (loadingStates.size === 1 ? Array.from(loadingStates.values())[0].message : undefined) ||
    (loadingStates.size > 1 ? `Loading ${loadingStates.size} items...` : undefined);

  const contextValue: LoadingContextType = {
    globalLoading,
    setGlobalLoading,
    loadingStates,
    startLoading,
    stopLoading,
    updateLoadingProgress,
    updateLoadingMessage,
    isLoading,
    getLoadingState,
    startBatchLoading,
    stopBatchLoading,
    clearAllLoading,
    getActiveLoadingCount,
    getLoadingKeys,
    minimumLoadingTime,
    setMinimumLoadingTime,
    showProgressBar,
    setShowProgressBar,
    showSpinner,
    setShowSpinner,
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}

      {/* Global progress bar */}
      {showProgressBar && isAnythingLoading && (
        <ProgressBarComponent progress={overallProgress} />
      )}

      {/* Global spinner overlay */}
      <AnimatePresence>
        {showSpinner && globalLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
          >
            <SpinnerComponent message={primaryMessage} progress={overallProgress} />
          </motion.div>
        )}
      </AnimatePresence>
    </LoadingContext.Provider>
  );
};

// Hook to use loading context
export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

// Utility hook for loading with automatic cleanup
export const useLoadingState = (key: string, message?: string) => {
  const { startLoading, stopLoading, isLoading, getLoadingState } = useLoading();

  useEffect(() => {
    return () => {
      stopLoading(key);
    };
  }, [key, stopLoading]);

  const start = useCallback((msg?: string) => {
    startLoading(key, msg || message);
  }, [key, message, startLoading]);

  const stop = useCallback(() => {
    stopLoading(key);
  }, [key, stopLoading]);

  return {
    isLoading: isLoading(key),
    state: getLoadingState(key),
    startLoading: start,
    stopLoading: stop,
  };
};

// Utility hook for async operations with loading state
export const useAsyncLoading = <T,>(
  key: string,
  asyncFn: () => Promise<T>,
  options?: {
    message?: string;
    onSuccess?: (data: T) => void;
    onError?: (error: any) => void;
    estimatedTime?: number;
  }
) => {
  const { startLoading, stopLoading, updateLoadingProgress } = useLoading();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<any>(null);

  const execute = useCallback(async () => {
    setError(null);
    startLoading(key, options?.message, options?.estimatedTime);

    try {
      const result = await asyncFn();
      setData(result);
      options?.onSuccess?.(result);
      updateLoadingProgress(key, 100);
      return result;
    } catch (err) {
      setError(err);
      options?.onError?.(err);
      throw err;
    } finally {
      stopLoading(key);
    }
  }, [key, asyncFn, options, startLoading, stopLoading, updateLoadingProgress]);

  return {
    execute,
    data,
    error,
    isLoading: useLoading().isLoading(key),
  };
};