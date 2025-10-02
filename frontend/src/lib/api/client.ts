import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { toast } from 'sonner';
import { API_CONFIG, API_HEADERS, HTTP_STATUS } from './constants';
import {
  ApiError,
  NetworkError,
  TimeoutError,
  UnauthorizedError,
  RateLimitError,
  isRetryableError,
} from './errors';
import type {
  ApiRequestConfig,
  RequestTracker,
  QueryParams,
  BatchRequest,
  BatchResponse,
} from './types';
import { apiMonitor } from '@/lib/monitoring/apiMonitor';
import { deduplicator } from './deduplicator';
import { requestSigner, createAxiosSigningInterceptor } from '@/lib/security/requestSigning';

// Client-side token storage
let authToken: string | null = null;
let tokenExpiresAt: number | null = null;

// Request tracking for debugging and monitoring
const activeRequests = new Map<string, RequestTracker>();

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];
  private requestQueue = new Map<string, AbortController>();

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      withCredentials: API_CONFIG.REQUEST.WITH_CREDENTIALS,
      maxRedirects: API_CONFIG.REQUEST.MAX_REDIRECTS,
      headers: {
        [API_HEADERS.CONTENT_TYPE]: 'application/json',
        [API_HEADERS.ACCEPT]: 'application/json',
        [API_HEADERS.CLIENT_VERSION]: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const requestId = this.generateRequestId();
        const tracker: RequestTracker = {
          id: requestId,
          method: config.method?.toUpperCase() || 'GET',
          url: config.url || '',
          startTime: Date.now(),
        };

        // Add request tracking
        activeRequests.set(requestId, tracker);

        // Add request ID header
        config.headers[API_HEADERS.REQUEST_ID] = requestId;

        // Add auth token if available
        const token = await this.getAuthToken();
        if (token) {
          config.headers[API_HEADERS.AUTHORIZATION] = `Bearer ${token}`;
        }

        // Add correlation ID if exists
        const correlationId = this.getCorrelationId();
        if (correlationId) {
          config.headers[API_HEADERS.CORRELATION_ID] = correlationId;
        }

        // Development logging
        if (API_CONFIG.DEV.LOG_REQUESTS) {
          console.log(`[API Request] ${tracker.method} ${tracker.url}`, {
            headers: config.headers,
            data: config.data,
            params: config.params,
          });
        }

        // Add mock delay in development
        if (API_CONFIG.DEV.MOCK_DELAY > 0 && process.env.NODE_ENV === 'development') {
          await new Promise(resolve => setTimeout(resolve, API_CONFIG.DEV.MOCK_DELAY));
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        const requestId = response.config.headers?.[API_HEADERS.REQUEST_ID] as string;
        const tracker = activeRequests.get(requestId);

        if (tracker) {
          tracker.endTime = Date.now();
          tracker.duration = tracker.endTime - tracker.startTime;
          tracker.status = response.status;

          // Track metrics
          apiMonitor.track({
            endpoint: tracker.url,
            method: tracker.method,
            statusCode: tracker.status,
            duration: tracker.duration,
            timestamp: Date.now(),
            requestId,
          });

          // Development logging
          if (API_CONFIG.DEV.LOG_RESPONSES) {
            console.log(`[API Response] ${tracker.method} ${tracker.url}`, {
              duration: `${tracker.duration}ms`,
              status: tracker.status,
              data: response.data,
            });
          }

          activeRequests.delete(requestId);
        }

        // Check for rate limit headers
        this.handleRateLimitHeaders(response);

        return response;
      },
      async (error: AxiosError) => {
        const requestId = error.config?.headers?.[API_HEADERS.REQUEST_ID] as string;
        const tracker = activeRequests.get(requestId);

        if (tracker) {
          tracker.endTime = Date.now();
          tracker.duration = tracker.endTime - tracker.startTime;
          tracker.status = error.response?.status || 0;
          tracker.error = true;

          // Track error metrics
          apiMonitor.track({
            endpoint: tracker.url,
            method: tracker.method,
            statusCode: tracker.status,
            duration: tracker.duration,
            timestamp: Date.now(),
            requestId,
            error: true,
            errorMessage: error.message,
          });

          activeRequests.delete(requestId);
        }

        // Development error logging
        if (API_CONFIG.DEV.LOG_ERRORS) {
          console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
          });
        }

        // Handle different error types
        return this.handleError(error);
      }
    );
  }

  private async handleError(error: AxiosError): Promise<never> {
    // Network error
    if (!error.response && error.code === 'ERR_NETWORK') {
      throw new NetworkError('Network connection failed. Please check your internet connection.');
    }

    // Timeout error
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_TIMEOUT') {
      throw new TimeoutError('Request timed out. Please try again.');
    }

    const status = error.response?.status;
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (status === HTTP_STATUS.UNAUTHORIZED) {
      // Try to refresh token
      if (originalRequest && !originalRequest.headers?.['X-Retry-Auth']) {
        try {
          await this.refreshAuthToken();
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers['X-Retry-Auth'] = 'true';
          return this.client.request(originalRequest);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          this.handleUnauthorized();
          throw new UnauthorizedError();
        }
      }
      this.handleUnauthorized();
      throw new UnauthorizedError();
    }

    // Handle 403 Forbidden
    if (status === HTTP_STATUS.FORBIDDEN) {
      toast.error('You do not have permission to perform this action');
    }

    // Handle 429 Rate Limit
    if (status === HTTP_STATUS.TOO_MANY_REQUESTS) {
      const retryAfter = error.response?.headers?.['retry-after'];
      const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : undefined;
      toast.error(`Too many requests. Please try again ${retryAfter ? `in ${retryAfter} seconds` : 'later'}.`);
      throw new RateLimitError(retryAfterMs);
    }

    // Handle 5xx Server Errors with retry
    if (status && status >= 500 && originalRequest && API_CONFIG.RETRY.ENABLED) {
      const retryCount = (originalRequest as any).retryCount || 0;

      if (retryCount < API_CONFIG.RETRY.MAX_ATTEMPTS && isRetryableError(status)) {
        (originalRequest as any).retryCount = retryCount + 1;

        // Calculate exponential backoff delay
        const delay = Math.min(
          API_CONFIG.RETRY.BASE_DELAY * Math.pow(API_CONFIG.RETRY.FACTOR, retryCount),
          API_CONFIG.RETRY.MAX_DELAY
        );

        await new Promise(resolve => setTimeout(resolve, delay));

        return this.client.request(originalRequest);
      }
    }

    // Convert to ApiError
    const apiError = ApiError.fromAxiosError(error);

    // Show user-friendly error message
    if (status && status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (status === HTTP_STATUS.NOT_FOUND) {
      toast.error('The requested resource was not found.');
    } else if (status === HTTP_STATUS.UNPROCESSABLE_ENTITY) {
      toast.error('Validation failed. Please check your input.');
    }

    throw apiError;
  }

  private handleRateLimitHeaders(response: AxiosResponse) {
    const limit = response.headers?.[API_HEADERS.RATE_LIMIT_LIMIT.toLowerCase()];
    const remaining = response.headers?.[API_HEADERS.RATE_LIMIT_REMAINING.toLowerCase()];
    const reset = response.headers?.[API_HEADERS.RATE_LIMIT_RESET.toLowerCase()];

    if (remaining && parseInt(remaining) < 10) {
      console.warn(`[API] Rate limit warning: ${remaining} requests remaining`);

      if (parseInt(remaining) === 0 && reset) {
        const resetTime = new Date(parseInt(reset) * 1000);
        toast(`Rate limit reached. Resets at ${resetTime.toLocaleTimeString()}`, {
          icon: '⚠️',
        });
      }
    }
  }

  private handleUnauthorized() {
    // Clear auth state
    authToken = null;
    tokenExpiresAt = null;

    // Only redirect if not already on auth page
    if (!window.location.pathname.startsWith('/sign-')) {
      window.location.href = '/sign-in';
    }
  }

  private async refreshAuthToken(): Promise<void> {
    if (this.isRefreshing) {
      // Wait for the ongoing refresh to complete
      return new Promise((resolve) => {
        this.refreshSubscribers.push((token: string) => {
          authToken = token;
          resolve();
        });
      });
    }

    this.isRefreshing = true;

    try {
      // In a real app, this would call Clerk's getToken() or similar
      // For now, we'll simulate a token refresh
      const newToken = await this.getNewAuthToken();

      authToken = newToken;
      tokenExpiresAt = Date.now() + 3600000; // 1 hour from now

      // Notify all waiting requests
      this.refreshSubscribers.forEach(callback => callback(newToken));
      this.refreshSubscribers = [];
    } finally {
      this.isRefreshing = false;
    }
  }

  private async getAuthToken(): Promise<string | null> {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      // Server-side: This should be handled differently
      // You might want to pass the token from the server component
      return null;
    }

    // Check if token is expired
    if (tokenExpiresAt && Date.now() >= tokenExpiresAt) {
      authToken = null;
      tokenExpiresAt = null;
    }

    // If we have a valid token, return it
    if (authToken) {
      return authToken;
    }

    // Try to get token from Clerk (client-side)
    try {
      // This is a placeholder - in a real app, you'd use Clerk's useAuth hook
      // or get the token from a context/store
      const token = await this.getNewAuthToken();
      authToken = token;
      tokenExpiresAt = Date.now() + 3600000; // 1 hour from now
      return token;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  private async getNewAuthToken(): Promise<string> {
    // This is a placeholder for getting a new token from Clerk
    // In a real implementation, you would:
    // 1. Import Clerk's client-side SDK
    // 2. Call the appropriate method to get a fresh token
    // 3. Return the token

    // For now, we'll return a placeholder
    // In production, replace this with actual Clerk integration
    return 'placeholder-token';
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private getCorrelationId(): string | null {
    // Get correlation ID from context or generate new one for the session
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('correlationId');
      if (stored) return stored;

      const newId = `session-${this.generateRequestId()}`;
      sessionStorage.setItem('correlationId', newId);
      return newId;
    }
    return null;
  }

  // Public method to set auth token (for use with Clerk)
  public setAuthToken(token: string, expiresIn: number = 3600) {
    authToken = token;
    tokenExpiresAt = Date.now() + (expiresIn * 1000);
  }

  // Public method to clear auth token
  public clearAuthToken() {
    authToken = null;
    tokenExpiresAt = null;
  }

  // Cancel a request
  public cancelRequest(requestId: string) {
    const controller = this.requestQueue.get(requestId);
    if (controller) {
      controller.abort();
      this.requestQueue.delete(requestId);
    }
  }

  // Cancel all pending requests
  public cancelAllRequests() {
    this.requestQueue.forEach((controller) => controller.abort());
    this.requestQueue.clear();
  }

  // HTTP methods with enhanced typing and features
  async get<T>(url: string, config?: AxiosRequestConfig & ApiRequestConfig): Promise<T> {
    const controller = new AbortController();
    const requestConfig: AxiosRequestConfig = {
      ...config,
      signal: config?.signal || controller.signal,
    };

    const requestId = this.generateRequestId();
    this.requestQueue.set(requestId, controller);

    try {
      const response = await this.client.get<T>(url, requestConfig);
      return response.data;
    } finally {
      this.requestQueue.delete(requestId);
    }
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig & ApiRequestConfig): Promise<T> {
    const controller = new AbortController();
    const requestConfig: AxiosRequestConfig = {
      ...config,
      signal: config?.signal || controller.signal,
    };

    const requestId = this.generateRequestId();
    this.requestQueue.set(requestId, controller);

    try {
      const response = await this.client.post<T>(url, data, requestConfig);
      return response.data;
    } finally {
      this.requestQueue.delete(requestId);
    }
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig & ApiRequestConfig): Promise<T> {
    const controller = new AbortController();
    const requestConfig: AxiosRequestConfig = {
      ...config,
      signal: config?.signal || controller.signal,
    };

    const requestId = this.generateRequestId();
    this.requestQueue.set(requestId, controller);

    try {
      const response = await this.client.put<T>(url, data, requestConfig);
      return response.data;
    } finally {
      this.requestQueue.delete(requestId);
    }
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig & ApiRequestConfig): Promise<T> {
    const controller = new AbortController();
    const requestConfig: AxiosRequestConfig = {
      ...config,
      signal: config?.signal || controller.signal,
    };

    const requestId = this.generateRequestId();
    this.requestQueue.set(requestId, controller);

    try {
      const response = await this.client.patch<T>(url, data, requestConfig);
      return response.data;
    } finally {
      this.requestQueue.delete(requestId);
    }
  }

  async delete<T>(url: string, config?: AxiosRequestConfig & ApiRequestConfig): Promise<T> {
    const controller = new AbortController();
    const requestConfig: AxiosRequestConfig = {
      ...config,
      signal: config?.signal || controller.signal,
    };

    const requestId = this.generateRequestId();
    this.requestQueue.set(requestId, controller);

    try {
      const response = await this.client.delete<T>(url, requestConfig);
      return response.data;
    } finally {
      this.requestQueue.delete(requestId);
    }
  }

  // Utility method for file uploads
  async uploadFile(
    url: string,
    file: File,
    additionalData?: Record<string, any>,
    onProgress?: (progress: number) => void
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    // Append additional data if provided
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
    }

    return this.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }

  // Utility method for file downloads
  async downloadFile(url: string, filename?: string): Promise<Blob> {
    const response = await this.get<Blob>(url, {
      responseType: 'blob',
    });

    // If filename is provided, trigger browser download
    if (filename && typeof window !== 'undefined') {
      const urlObject = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = urlObject;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(urlObject);
    }

    return response;
  }

  // Batch request support
  async batch<T>(requests: BatchRequest): Promise<BatchResponse<T>> {
    return this.post('/batch', requests);
  }

  // Get active requests (for debugging)
  getActiveRequests(): RequestTracker[] {
    return Array.from(activeRequests.values());
  }

  // Build query string from params
  buildQueryString(params?: QueryParams): string {
    if (!params) return '';

    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.sort) searchParams.append('sort', params.sort);
    if (params.order) searchParams.append('order', params.order);

    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(`filter[${key}]`, value.toString());
        }
      });
    }

    if (params.include) {
      searchParams.append('include', params.include.join(','));
    }

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }
}

// Create singleton instance
const apiClient = new ApiClient();

// Export singleton instance as default
export default apiClient;

// Export class for testing or multiple instances
export { ApiClient };

// Export helper function for Clerk integration
export function initializeApiClient(getToken: () => Promise<string | null>) {
  // This function can be called from a React component with Clerk's useAuth hook
  const intervalId = setInterval(async () => {
    try {
      const token = await getToken();
      if (token) {
        apiClient.setAuthToken(token);
      } else {
        apiClient.clearAuthToken();
      }
    } catch (error) {
      console.error('Failed to refresh auth token:', error);
      apiClient.clearAuthToken();
    }
  }, 5 * 60 * 1000); // Refresh every 5 minutes

  // Initial token fetch
  getToken().then((token) => {
    if (token) {
      apiClient.setAuthToken(token);
    }
  });

  // Return cleanup function
  return () => clearInterval(intervalId);
}