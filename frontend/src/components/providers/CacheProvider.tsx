'use client';

/**
 * Cache Provider Component
 * Provides cache context and service worker registration
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { cacheManager } from '@/lib/cache/CacheManager';
import { CacheStats } from '@/lib/cache/types';

interface CacheContextValue {
  isOffline: boolean;
  isCacheReady: boolean;
  cacheStats: CacheStats | null;
  serviceWorkerStatus: 'pending' | 'active' | 'error' | 'unsupported';
  updateAvailable: boolean;
  updateServiceWorker: () => void;
  clearAllCache: () => Promise<void>;
}

const CacheContext = createContext<CacheContextValue | undefined>(undefined);

export function CacheProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isCacheReady, setIsCacheReady] = useState(false);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<
    'pending' | 'active' | 'error' | 'unsupported'
  >('pending');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  // Initialize cache system
  useEffect(() => {
    const initCache = async () => {
      try {
        // Get initial cache stats
        const stats = cacheManager.getStats();
        setCacheStats(stats);
        setIsCacheReady(true);

        // Listen to cache events for stats updates
        const updateStats = () => {
          setCacheStats(cacheManager.getStats());
        };

        cacheManager.on('set', updateStats);
        cacheManager.on('delete', updateStats);
        cacheManager.on('clear', updateStats);

        return () => {
          cacheManager.off('set', updateStats);
          cacheManager.off('delete', updateStats);
          cacheManager.off('clear', updateStats);
        };
      } catch (error) {
        console.error('Failed to initialize cache:', error);
      }
    };

    initCache();
  }, []);

  // Register service worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      setServiceWorkerStatus('unsupported');
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/',
        });

        console.log('Service Worker registered successfully');

        // Check if there's an update available
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                setWaitingWorker(newWorker);
                setUpdateAvailable(true);
              }
            });
          }
        });

        // Check registration state
        if (registration.active) {
          setServiceWorkerStatus('active');
        }

        // Handle controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'SYNC_COMPLETE') {
            console.log('Background sync completed');
            // Refresh cache stats
            setCacheStats(cacheManager.getStats());
          }
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        setServiceWorkerStatus('error');
      }
    };

    registerServiceWorker();
  }, []);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      console.log('Network: Online');

      // Trigger background sync
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC',
          tag: 'sync-api-data',
        });
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      console.log('Network: Offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update service worker
  const updateServiceWorker = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setUpdateAvailable(false);
    }
  };

  // Clear all cache
  const clearAllCache = async () => {
    try {
      // Clear application cache
      await cacheManager.clear();

      // Clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Send message to service worker
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_CACHE',
        });
      }

      console.log('All caches cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  const value: CacheContextValue = {
    isOffline,
    isCacheReady,
    cacheStats,
    serviceWorkerStatus,
    updateAvailable,
    updateServiceWorker,
    clearAllCache,
  };

  return <CacheContext.Provider value={value}>{children}</CacheContext.Provider>;
}

export function useAppCache() {
  const context = useContext(CacheContext);
  if (context === undefined) {
    throw new Error('useAppCache must be used within a CacheProvider');
  }
  return context;
}

/**
 * Component to display cache status
 */
export function CacheStatusIndicator() {
  const { isOffline, serviceWorkerStatus, updateAvailable, updateServiceWorker } = useAppCache();

  if (isOffline) {
    return (
      <div className="fixed bottom-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
          />
        </svg>
        <span className="text-sm font-medium">Offline Mode</span>
      </div>
    );
  }

  if (updateAvailable) {
    return (
      <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <div>
            <p className="text-sm font-medium">Update Available</p>
            <p className="text-xs opacity-90">A new version is ready</p>
          </div>
          <button
            onClick={updateServiceWorker}
            className="ml-2 px-3 py-1 bg-white text-blue-500 rounded text-sm font-medium hover:bg-blue-50 transition-colors"
          >
            Update
          </button>
        </div>
      </div>
    );
  }

  if (serviceWorkerStatus === 'active') {
    return null; // Don't show anything when everything is working
  }

  if (serviceWorkerStatus === 'error') {
    return (
      <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-sm font-medium">Offline features unavailable</span>
      </div>
    );
  }

  return null;
}