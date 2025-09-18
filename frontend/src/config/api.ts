/**
 * API Configuration
 * Centralized configuration for all API endpoints and settings
 */

/**
 * Get the base API URL with version prefix
 * Handles both development and production environments
 */
function getApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const apiVersion = process.env.NEXT_PUBLIC_API_VERSION || 'v1';

  // Remove trailing slash from base URL if present
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  // Construct the full API base URL with version
  return `${cleanBaseUrl}/api/${apiVersion}`;
}

/**
 * API Configuration object
 */
export const apiConfig = {
  baseUrl: getApiBaseUrl(),
  timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10),
  withCredentials: process.env.NEXT_PUBLIC_API_WITH_CREDENTIALS === 'true',
  retry: {
    enabled: process.env.NEXT_PUBLIC_API_RETRY_ENABLED === 'true',
    attempts: parseInt(process.env.NEXT_PUBLIC_API_RETRY_ATTEMPTS || '3', 10),
    delay: parseInt(process.env.NEXT_PUBLIC_API_RETRY_DELAY || '1000', 10),
    maxDelay: parseInt(process.env.NEXT_PUBLIC_API_RETRY_MAX_DELAY || '10000', 10),
    factor: parseInt(process.env.NEXT_PUBLIC_API_RETRY_FACTOR || '2', 10),
  },
} as const;

/**
 * Get the base URL without version prefix for endpoint construction
 */
function getBaseUrlOnly(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  // Remove trailing slash from base URL if present
  return baseUrl.replace(/\/$/, '');
}

/**
 * API Endpoints
 * Centralized endpoint definitions for maintainability
 */
export const apiEndpoints = {
  auth: {
    login: `${apiConfig.baseUrl}/auth/login`,
    logout: `${apiConfig.baseUrl}/auth/logout`,
    me: `${apiConfig.baseUrl}/auth/me`,
    validate: `${apiConfig.baseUrl}/auth/validate`,
    refreshPermissions: `${apiConfig.baseUrl}/auth/refresh-permissions`,
    health: `${apiConfig.baseUrl}/auth/health`,
  },
  users: {
    base: `${apiConfig.baseUrl}/users`,
    profile: `${apiConfig.baseUrl}/users/profile`,
    search: `${apiConfig.baseUrl}/users/search`,
  },
  permissions: {
    base: `${apiConfig.baseUrl}/permissions`,
    roles: `${apiConfig.baseUrl}/permissions/roles`,
    check: `${apiConfig.baseUrl}/permissions/check`,
  },
  workflows: {
    base: `${apiConfig.baseUrl}/workflows`,
    tasks: `${apiConfig.baseUrl}/workflows/tasks`,
    approvals: `${apiConfig.baseUrl}/workflows/approvals`,
  },
  organizations: {
    base: `${apiConfig.baseUrl}/organizations`,
    schools: `${apiConfig.baseUrl}/organizations/schools`,
    departments: `${apiConfig.baseUrl}/organizations/departments`,
    positions: `${apiConfig.baseUrl}/organizations/positions`,
  },
  notifications: {
    base: `${apiConfig.baseUrl}/notifications`,
    unread: `${apiConfig.baseUrl}/notifications/unread`,
    markRead: `${apiConfig.baseUrl}/notifications/mark-read`,
  },
} as const;

/**
 * Default headers for API requests
 */
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
} as const;

/**
 * Helper function to build API URL with query parameters
 */
export function buildApiUrl(endpoint: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return endpoint;
  }

  const queryString = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, String(value)])
  ).toString();

  return queryString ? `${endpoint}?${queryString}` : endpoint;
}

/**
 * Helper function for retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options = apiConfig.retry
): Promise<T> {
  let lastError: Error | undefined;
  let delay = options.delay;

  for (let attempt = 1; attempt <= options.attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === options.attempts) {
        throw lastError;
      }

      // Apply exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * options.factor, options.maxDelay);
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Check if the API is healthy
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(apiEndpoints.auth.health, {
      method: 'GET',
      headers: defaultHeaders,
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get full error message from API response
 */
export async function getApiErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.message || data.error || 'An error occurred';
  } catch {
    return `Request failed with status ${response.status}`;
  }
}