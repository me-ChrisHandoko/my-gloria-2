'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  closeable?: boolean;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  updateToast: (id: string, updates: Partial<Toast>) => void;
  position: ToastPosition;
  setPosition: (position: ToastPosition) => void;
  maxToasts: number;
  setMaxToasts: (max: number) => void;
  pauseOnHover: boolean;
  setPauseOnHover: (pause: boolean) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: React.ReactNode;
  defaultPosition?: ToastPosition;
  defaultMaxToasts?: number;
  defaultDuration?: number;
  defaultPauseOnHover?: boolean;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  defaultPosition = 'top-right',
  defaultMaxToasts = 5,
  defaultDuration = 5000,
  defaultPauseOnHover = true,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [position, setPosition] = useState<ToastPosition>(defaultPosition);
  const [maxToasts, setMaxToasts] = useState(defaultMaxToasts);
  const [pauseOnHover, setPauseOnHover] = useState(defaultPauseOnHover);
  const [hoveredToastId, setHoveredToastId] = useState<string | null>(null);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Generate unique toast ID
  const generateToastId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Clear timeout for a toast
  const clearToastTimeout = useCallback((id: string) => {
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }
  }, []);

  // Set timeout for a toast
  const setToastTimeout = useCallback((toast: Toast) => {
    if (toast.duration && toast.duration > 0) {
      const timeout = setTimeout(() => {
        removeToast(toast.id);
      }, toast.duration);
      timeoutRefs.current.set(toast.id, timeout);
    }
  }, []);

  // Show toast
  const showToast = useCallback((toastData: Omit<Toast, 'id' | 'createdAt'>) => {
    const id = generateToastId();
    const newToast: Toast = {
      ...toastData,
      id,
      duration: toastData.duration ?? defaultDuration,
      closeable: toastData.closeable ?? true,
      createdAt: Date.now(),
    };

    setToasts(prev => {
      // Remove oldest toasts if exceeding max
      let updatedToasts = [...prev];
      if (updatedToasts.length >= maxToasts) {
        const toRemove = updatedToasts.slice(0, updatedToasts.length - maxToasts + 1);
        toRemove.forEach(toast => clearToastTimeout(toast.id));
        updatedToasts = updatedToasts.slice(updatedToasts.length - maxToasts + 1);
      }
      return [...updatedToasts, newToast];
    });

    // Set timeout for auto-dismiss
    setToastTimeout(newToast);

    return id;
  }, [generateToastId, defaultDuration, maxToasts, clearToastTimeout, setToastTimeout]);

  // Remove toast
  const removeToast = useCallback((id: string) => {
    clearToastTimeout(id);
    setToasts(prev => {
      const toast = prev.find(t => t.id === id);
      if (toast?.onClose) {
        toast.onClose();
      }
      return prev.filter(t => t.id !== id);
    });
  }, [clearToastTimeout]);

  // Clear all toasts
  const clearToasts = useCallback(() => {
    toasts.forEach(toast => {
      clearToastTimeout(toast.id);
      if (toast.onClose) {
        toast.onClose();
      }
    });
    setToasts([]);
  }, [toasts, clearToastTimeout]);

  // Update toast
  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    setToasts(prev => prev.map(toast =>
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  }, []);

  // Handle pause on hover
  useEffect(() => {
    if (!pauseOnHover || !hoveredToastId) return;

    const toast = toasts.find(t => t.id === hoveredToastId);
    if (toast) {
      clearToastTimeout(toast.id);
    }

    return () => {
      if (toast && !hoveredToastId) {
        setToastTimeout(toast);
      }
    };
  }, [hoveredToastId, pauseOnHover, toasts, clearToastTimeout, setToastTimeout]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  const contextValue: ToastContextType = {
    toasts,
    showToast,
    removeToast,
    clearToasts,
    updateToast,
    position,
    setPosition,
    maxToasts,
    setMaxToasts,
    pauseOnHover,
    setPauseOnHover,
  };

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  // Icon components
  const icons = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon,
  };

  // Colors for toast types
  const typeStyles = {
    success: 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
  };

  const iconColors = {
    success: 'text-green-600 dark:text-green-400',
    error: 'text-red-600 dark:text-red-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    info: 'text-blue-600 dark:text-blue-400',
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        className={`fixed z-50 pointer-events-none ${positionClasses[position]}`}
        style={{ maxWidth: position.includes('center') ? '90vw' : '420px' }}
      >
        <AnimatePresence mode="sync">
          {toasts.map((toast) => {
            const Icon = icons[toast.type];

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: position.includes('bottom') ? 20 : -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                className="pointer-events-auto"
                onMouseEnter={() => setHoveredToastId(toast.id)}
                onMouseLeave={() => setHoveredToastId(null)}
              >
                <div
                  className={`
                    mb-3 flex items-start gap-3 rounded-lg border p-4 shadow-lg
                    backdrop-blur-sm transition-all duration-200
                    ${typeStyles[toast.type]}
                  `}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconColors[toast.type]}`} />

                  <div className="flex-1 min-w-0">
                    {toast.title && (
                      <h4 className="font-medium text-sm mb-1">
                        {toast.title}
                      </h4>
                    )}
                    <p className="text-sm opacity-90">
                      {toast.message}
                    </p>
                    {toast.action && (
                      <button
                        onClick={toast.action.onClick}
                        className="mt-2 text-sm font-medium underline hover:no-underline focus:outline-none"
                      >
                        {toast.action.label}
                      </button>
                    )}
                  </div>

                  {toast.closeable && (
                    <button
                      onClick={() => removeToast(toast.id)}
                      className="flex-shrink-0 ml-2 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                      aria-label="Close notification"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

// Hook to use toast context
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Utility hooks for common toast operations
export const useSuccessToast = () => {
  const { showToast } = useToast();
  return useCallback((message: string, options?: Partial<Toast>) => {
    return showToast({
      type: 'success',
      message,
      ...options,
    });
  }, [showToast]);
};

export const useErrorToast = () => {
  const { showToast } = useToast();
  return useCallback((message: string, options?: Partial<Toast>) => {
    return showToast({
      type: 'error',
      message,
      duration: 7000, // Errors stay longer
      ...options,
    });
  }, [showToast]);
};

export const useWarningToast = () => {
  const { showToast } = useToast();
  return useCallback((message: string, options?: Partial<Toast>) => {
    return showToast({
      type: 'warning',
      message,
      ...options,
    });
  }, [showToast]);
};

export const useInfoToast = () => {
  const { showToast } = useToast();
  return useCallback((message: string, options?: Partial<Toast>) => {
    return showToast({
      type: 'info',
      message,
      ...options,
    });
  }, [showToast]);
};

// Promise-based toast for async operations
export const toast = {
  promise: <T,>(
    promise: Promise<T>,
    msgs: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    const { showToast, updateToast, removeToast } = useToast();

    const id = showToast({
      type: 'info',
      message: msgs.loading,
      duration: 0, // Don't auto-dismiss
      closeable: false,
    });

    promise
      .then((data) => {
        removeToast(id);
        showToast({
          type: 'success',
          message: typeof msgs.success === 'function' ? msgs.success(data) : msgs.success,
        });
        return data;
      })
      .catch((error) => {
        removeToast(id);
        showToast({
          type: 'error',
          message: typeof msgs.error === 'function' ? msgs.error(error) : msgs.error,
        });
        throw error;
      });

    return promise;
  },
};