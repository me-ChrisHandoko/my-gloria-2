/**
 * Request Deduplication Service
 * Prevents multiple identical requests from being sent simultaneously
 * Production-ready implementation with proper cleanup and error handling
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
  abortController?: AbortController;
}

class RequestDeduplicationService {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private readonly CACHE_DURATION = 5000; // 5 seconds for successful responses
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval to remove stale requests
    this.startCleanup();
  }

  /**
   * Generate a unique key for the request
   */
  private generateKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  /**
   * Start periodic cleanup of stale requests
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const staleKeys: string[] = [];

      this.pendingRequests.forEach((request, key) => {
        if (now - request.timestamp > this.REQUEST_TIMEOUT) {
          staleKeys.push(key);
          // Abort the request if it has an abort controller
          if (request.abortController) {
            request.abortController.abort();
          }
        }
      });

      // Remove stale requests
      staleKeys.forEach(key => this.pendingRequests.delete(key));
    }, 10000); // Run cleanup every 10 seconds
  }

  /**
   * Execute a deduplicated request
   * If an identical request is already in progress, returns the existing promise
   */
  async execute<T>(
    url: string,
    options?: RequestInit,
    fetcher?: (url: string, options?: RequestInit) => Promise<T>
  ): Promise<T> {
    const key = this.generateKey(url, options);

    // Check if we have a pending request
    const pending = this.pendingRequests.get(key);
    if (pending) {
      // If the request is still fresh, return the existing promise
      if (Date.now() - pending.timestamp < this.REQUEST_TIMEOUT) {
        console.debug(`[Deduplication] Returning existing request for: ${key}`);
        return pending.promise;
      }
      // Otherwise, remove the stale request
      this.pendingRequests.delete(key);
    }

    // Create abort controller for this request
    const abortController = new AbortController();

    // Merge abort signal with existing options
    const requestOptions: RequestInit = {
      ...options,
      signal: abortController.signal
    };

    // Create the request promise
    const requestPromise = (fetcher || fetch)(url, requestOptions)
      .then((response) => {
        // On success, keep the request cached for a short time
        // This prevents rapid re-requests after success
        setTimeout(() => {
          this.pendingRequests.delete(key);
        }, this.CACHE_DURATION);
        return response as T;
      })
      .catch((error) => {
        // On error, remove immediately to allow retry
        this.pendingRequests.delete(key);
        throw error;
      });

    // Store the pending request
    this.pendingRequests.set(key, {
      promise: requestPromise,
      timestamp: Date.now(),
      abortController
    });

    console.debug(`[Deduplication] New request initiated for: ${key}`);
    return requestPromise;
  }

  /**
   * Clear all pending requests
   * Useful for cleanup on unmount or logout
   */
  clearAll(): void {
    // Abort all pending requests
    this.pendingRequests.forEach((request) => {
      if (request.abortController) {
        request.abortController.abort();
      }
    });
    this.pendingRequests.clear();
  }

  /**
   * Clear a specific request by key
   */
  clear(url: string, options?: RequestInit): void {
    const key = this.generateKey(url, options);
    const pending = this.pendingRequests.get(key);

    if (pending) {
      if (pending.abortController) {
        pending.abortController.abort();
      }
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Get the number of pending requests
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Check if a specific request is pending
   */
  isPending(url: string, options?: RequestInit): boolean {
    const key = this.generateKey(url, options);
    const pending = this.pendingRequests.get(key);

    if (!pending) return false;

    // Check if the request is still fresh
    return Date.now() - pending.timestamp < this.REQUEST_TIMEOUT;
  }

  /**
   * Destroy the service and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clearAll();
  }
}

// Export singleton instance for app-wide deduplication
export const requestDeduplication = new RequestDeduplicationService();

// Export class for testing or multiple instances
export { RequestDeduplicationService };

/**
 * Deduplicated fetch wrapper
 * Use this instead of fetch to automatically deduplicate requests
 */
export async function deduplicatedFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  return requestDeduplication.execute(url, options);
}

/**
 * Hook for React component cleanup
 */
export function useRequestDeduplication() {
  // Clear pending requests on unmount
  if (typeof window !== 'undefined') {
    return {
      clear: (url: string, options?: RequestInit) =>
        requestDeduplication.clear(url, options),
      clearAll: () => requestDeduplication.clearAll(),
      isPending: (url: string, options?: RequestInit) =>
        requestDeduplication.isPending(url, options),
      getPendingCount: () => requestDeduplication.getPendingCount()
    };
  }

  // Server-side rendering fallback
  return {
    clear: () => {},
    clearAll: () => {},
    isPending: () => false,
    getPendingCount: () => 0
  };
}