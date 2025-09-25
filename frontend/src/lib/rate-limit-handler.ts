/**
 * Rate Limit Handler with Exponential Backoff
 * Production-ready implementation for handling API rate limits
 */

interface RateLimitInfo {
  retryAfter: number; // Timestamp when retry is allowed
  attempts: number; // Number of attempts made
  lastAttempt: number; // Last attempt timestamp
}

interface BackoffOptions {
  initialDelay?: number; // Initial delay in ms (default: 1000)
  maxDelay?: number; // Maximum delay in ms (default: 60000)
  factor?: number; // Backoff factor (default: 2)
  jitter?: boolean; // Add random jitter (default: true)
  maxAttempts?: number; // Maximum retry attempts (default: 5)
}

class RateLimitHandler {
  private rateLimitMap: Map<string, RateLimitInfo> = new Map();
  private defaultOptions: BackoffOptions = {
    initialDelay: 1000,
    maxDelay: 60000,
    factor: 2,
    jitter: true,
    maxAttempts: 5
  };

  /**
   * Generate a key for the rate limit map
   */
  private generateKey(endpoint: string, method: string = 'GET'): string {
    return `${method}:${endpoint}`;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(
    attempt: number,
    options: BackoffOptions = {}
  ): number {
    const opts = { ...this.defaultOptions, ...options };

    // Calculate base delay with exponential backoff
    let delay = opts.initialDelay! * Math.pow(opts.factor!, attempt - 1);

    // Cap at maximum delay
    delay = Math.min(delay, opts.maxDelay!);

    // Add jitter to prevent thundering herd
    if (opts.jitter) {
      const jitterRange = delay * 0.3; // 30% jitter
      const jitter = Math.random() * jitterRange - jitterRange / 2;
      delay += jitter;
    }

    return Math.max(0, Math.round(delay));
  }

  /**
   * Check if we're currently rate limited for an endpoint
   */
  isRateLimited(endpoint: string, method: string = 'GET'): boolean {
    const key = this.generateKey(endpoint, method);
    const info = this.rateLimitMap.get(key);

    if (!info) return false;

    const now = Date.now();
    if (now < info.retryAfter) {
      return true;
    }

    // Clean up expired rate limit
    this.rateLimitMap.delete(key);
    return false;
  }

  /**
   * Get remaining wait time for a rate-limited endpoint
   */
  getRemainingWaitTime(endpoint: string, method: string = 'GET'): number {
    const key = this.generateKey(endpoint, method);
    const info = this.rateLimitMap.get(key);

    if (!info) return 0;

    const now = Date.now();
    const remaining = info.retryAfter - now;

    return remaining > 0 ? remaining : 0;
  }

  /**
   * Handle a rate limit response
   */
  handleRateLimitResponse(
    endpoint: string,
    method: string = 'GET',
    retryAfterHeader?: string | null,
    options?: BackoffOptions
  ): RateLimitInfo {
    const key = this.generateKey(endpoint, method);
    const now = Date.now();

    // Get existing info or create new
    const existingInfo = this.rateLimitMap.get(key);
    const attempts = (existingInfo?.attempts || 0) + 1;

    let retryAfter: number;

    if (retryAfterHeader) {
      // Use server-provided Retry-After header
      const retryAfterSeconds = parseInt(retryAfterHeader, 10);
      if (!isNaN(retryAfterSeconds)) {
        retryAfter = now + retryAfterSeconds * 1000;
      } else {
        // Might be a date string
        const retryAfterDate = new Date(retryAfterHeader).getTime();
        retryAfter = !isNaN(retryAfterDate) ? retryAfterDate : now + this.calculateBackoff(attempts, options);
      }
    } else {
      // Use exponential backoff
      retryAfter = now + this.calculateBackoff(attempts, options);
    }

    const info: RateLimitInfo = {
      retryAfter,
      attempts,
      lastAttempt: now
    };

    this.rateLimitMap.set(key, info);

    console.warn(`[RateLimit] Endpoint ${endpoint} rate limited. Retry after: ${new Date(retryAfter).toISOString()}, Attempts: ${attempts}`);

    return info;
  }

  /**
   * Wait for rate limit to expire
   */
  async waitForRateLimit(
    endpoint: string,
    method: string = 'GET'
  ): Promise<void> {
    const waitTime = this.getRemainingWaitTime(endpoint, method);

    if (waitTime > 0) {
      console.log(`[RateLimit] Waiting ${waitTime}ms before retrying ${endpoint}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Execute request with automatic rate limit handling
   */
  async executeWithRateLimitHandling<T>(
    request: () => Promise<Response>,
    endpoint: string,
    method: string = 'GET',
    options?: BackoffOptions
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= opts.maxAttempts!; attempt++) {
      // Check if we're rate limited
      if (this.isRateLimited(endpoint, method)) {
        await this.waitForRateLimit(endpoint, method);
      }

      try {
        let response: Response;

        try {
          response = await request();
        } catch (fetchError) {
          // Network error occurred (connection refused, CORS, timeout, etc.)
          const networkError = fetchError as Error;
          const errorMessage = this.getNetworkErrorMessage(networkError, endpoint);

          console.error(`[RateLimit] Network error on ${endpoint}:`, errorMessage);

          // If we have attempts left, retry with backoff
          if (attempt < opts.maxAttempts!) {
            const delay = this.calculateBackoff(attempt, opts);
            console.log(`[RateLimit] Retrying ${endpoint} after ${delay}ms due to network error (attempt ${attempt}/${opts.maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            lastError = new Error(errorMessage);
            continue;
          }

          // No more attempts, throw a user-friendly error
          throw new Error(errorMessage);
        }

        // Check for rate limit response
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const rateLimitInfo = this.handleRateLimitResponse(
            endpoint,
            method,
            retryAfter,
            opts
          );

          // If we've exceeded max attempts, throw error
          if (rateLimitInfo.attempts >= opts.maxAttempts!) {
            throw new Error(
              `Rate limit exceeded for ${endpoint} after ${rateLimitInfo.attempts} attempts. Please wait ${Math.ceil(this.getRemainingWaitTime(endpoint, method) / 1000)} seconds.`
            );
          }

          // Wait and retry
          await this.waitForRateLimit(endpoint, method);
          continue;
        }

        // Success - clear any rate limit info
        this.clearRateLimit(endpoint, method);

        // Handle HTTP error responses
        if (!response.ok) {
          let errorMessage: string;
          let errorData: any = null;

          try {
            errorData = await response.json();
            errorMessage = errorData.message || errorData.error || `Request failed with status ${response.status}`;
          } catch {
            errorMessage = `Request failed with status ${response.status}`;
          }

          // Check if this error should be retried
          if (!this.isRetryableError(response.status)) {
            // Non-retryable error (e.g., 401, 403, 404)
            console.error(`[RateLimit] Non-retryable error ${response.status} on ${endpoint}: ${errorMessage}`);
            throw new Error(errorMessage);
          }

          // Retryable error, will be handled by the catch block
          throw new Error(errorMessage);
        }

        // Parse and return successful response
        try {
          return await response.json();
        } catch (parseError) {
          console.error(`[RateLimit] Failed to parse response from ${endpoint}:`, parseError);
          throw new Error('Failed to parse server response. Please try again.');
        }

      } catch (error) {
        lastError = error as Error;

        // If it's a rate limit error, throw immediately
        if (lastError?.message?.includes('Rate limit')) {
          throw lastError;
        }

        // Check if this is a retryable error
        // We need to determine if it's an HTTP error or network error
        let isRetryable = false;

        // Try to extract HTTP status from error message if available
        const statusMatch = lastError?.message.match(/status (\d{3})/i);
        if (statusMatch) {
          const status = parseInt(statusMatch[1], 10);
          isRetryable = this.isRetryableError(status);
        } else if (lastError?.message) {
          // Assume it's a network error or other retryable error
          // unless the message indicates a non-retryable condition
          const nonRetryableKeywords = ['unauthorized', 'forbidden', 'not found', 'bad request', 'invalid', 'access denied'];
          const messageIsNonRetryable = nonRetryableKeywords.some(keyword =>
            lastError || new Error("Unknown error").message.toLowerCase().includes(keyword)
          );
          isRetryable = !messageIsNonRetryable;
        } else {
          // Unknown error, don't retry
          isRetryable = false;
        }

        // For retryable errors, if we have attempts left, retry with backoff
        if (isRetryable && attempt < opts.maxAttempts!) {
          const delay = this.calculateBackoff(attempt, opts);
          console.log(`[RateLimit] Retrying ${endpoint} after ${delay}ms (attempt ${attempt}/${opts.maxAttempts}): ${lastError.message}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Non-retryable error or no attempts left
        if (!isRetryable && lastError) {
          console.error(`[RateLimit] Non-retryable error on ${endpoint}: ${lastError.message}`);
        }

        throw error;
      }
    }

    throw lastError || new Error(`Failed to execute request after ${opts.maxAttempts} attempts`);
  }

  /**
   * Check if an HTTP status code or error should trigger a retry
   * @param status HTTP status code or null for network errors
   * @param error Error object for network errors
   * @returns true if the error is retryable, false otherwise
   */
  private isRetryableError(status: number | null, error?: Error): boolean {
    // Network errors are always retryable
    if (status === null && error) {
      return true;
    }

    // No status means unknown error, don't retry
    if (status === null) {
      return false;
    }

    // Rate limit errors are handled separately but are retryable
    if (status === 429) {
      return true;
    }

    // Server errors (5xx) are retryable
    if (status >= 500 && status < 600) {
      return true;
    }

    // Client errors (4xx) are NOT retryable
    // This includes:
    // - 400 Bad Request
    // - 401 Unauthorized
    // - 403 Forbidden
    // - 404 Not Found
    // - etc.
    if (status >= 400 && status < 500) {
      return false;
    }

    // Specific temporary error codes that might be retryable
    // 408 Request Timeout - client took too long
    // 502 Bad Gateway - temporary server issue
    // 503 Service Unavailable - temporary overload
    // 504 Gateway Timeout - upstream timeout
    if ([408, 502, 503, 504].includes(status)) {
      return true;
    }

    // Default: don't retry unknown status codes
    return false;
  }

  /**
   * Get user-friendly error message for network errors
   */
  private getNetworkErrorMessage(error: Error, endpoint: string): string {
    const errorString = error.toString().toLowerCase();
    const message = error.message?.toLowerCase() || '';

    // Check for specific network error types
    if (errorString.includes('failed to fetch') || message.includes('failed to fetch')) {
      // This is typically a CORS issue or network connectivity problem
      if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
        return 'Unable to connect to the backend server. Please ensure the backend is running and accessible.';
      }
      return 'Network connection failed. Please check your internet connection and try again.';
    }

    if (errorString.includes('cors') || message.includes('cors')) {
      return 'Cross-origin request blocked. Please contact your administrator to configure CORS settings.';
    }

    if (errorString.includes('timeout') || message.includes('timeout')) {
      return 'Request timed out. The server may be experiencing high load. Please try again later.';
    }

    if (errorString.includes('network') || message.includes('network')) {
      return 'Network error occurred. Please check your connection and try again.';
    }

    // Generic network error
    return 'Unable to connect to the server. Please check your connection and try again.';
  }

  /**
   * Clear rate limit for an endpoint
   */
  clearRateLimit(endpoint: string, method: string = 'GET'): void {
    const key = this.generateKey(endpoint, method);
    this.rateLimitMap.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.rateLimitMap.clear();
  }

  /**
   * Get current rate limit status for debugging
   */
  getStatus(): Map<string, RateLimitInfo> {
    return new Map(this.rateLimitMap);
  }

  /**
   * Clean up expired rate limits
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.rateLimitMap.forEach((info, key) => {
      if (now >= info.retryAfter) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.rateLimitMap.delete(key));
  }
}

// Export singleton instance
export const rateLimitHandler = new RateLimitHandler();

// Export class for testing
export { RateLimitHandler };

/**
 * Wrapper function for fetch with rate limit handling
 */
export async function fetchWithRateLimitHandling<T = any>(
  url: string,
  options?: RequestInit & { backoffOptions?: BackoffOptions }
): Promise<T> {
  const { backoffOptions, ...fetchOptions } = options || {};
  const method = fetchOptions.method || 'GET';

  return rateLimitHandler.executeWithRateLimitHandling<T>(
    () => fetch(url, fetchOptions),
    url,
    method,
    backoffOptions
  );
}

/**
 * React hook for rate limit status
 */
export function useRateLimitStatus(endpoint?: string, method: string = 'GET') {
  if (typeof window === 'undefined') {
    return {
      isRateLimited: false,
      remainingWaitTime: 0,
      cleanup: () => {}
    };
  }

  return {
    isRateLimited: endpoint ? rateLimitHandler.isRateLimited(endpoint, method) : false,
    remainingWaitTime: endpoint ? rateLimitHandler.getRemainingWaitTime(endpoint, method) : 0,
    cleanup: () => rateLimitHandler.cleanup()
  };
}