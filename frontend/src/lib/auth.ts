import { LoginResponse, AuthError } from '@/types/auth';
import { apiEndpoints, defaultHeaders, apiConfig } from '@/config/api';
import { requestDeduplication } from '@/lib/request-deduplication';
import { rateLimitHandler } from '@/lib/rate-limit-handler';

/**
 * Validate user with backend after Clerk authentication
 * This ensures the user exists in DataKaryawan with statusAktif='Aktif'
 * Now with request deduplication and rate limit handling
 */
export async function validateUserWithBackend(clerkToken: string): Promise<LoginResponse> {
  // Use deduplicated request with rate limit handling
  return requestDeduplication.execute<LoginResponse>(
    apiEndpoints.auth.login,
    {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({ clerkToken }),
      ...(apiConfig.withCredentials && { credentials: 'include' }),
    },
    async (url, options) => {
      // Execute with rate limit handling
      // The rate limit handler now properly handles network errors and HTTP errors
      return rateLimitHandler.executeWithRateLimitHandling<LoginResponse>(
        async () => {
          // This will now throw for network errors, which are caught by the handler
          return fetch(url, options);
        },
        url,
        options?.method || 'POST',
        {
          initialDelay: 2000,
          maxDelay: 60000,
          factor: 2,
          jitter: true,
          maxAttempts: 3
        }
      );
    }
  );
}

/**
 * Store user session data in localStorage for quick access
 * Note: Sensitive data should not be stored in localStorage in production
 */
export function storeUserSession(data: LoginResponse): void {
  if (typeof window !== 'undefined') {
    const sessionData = {
      user: data.user,
      expiresAt: data.expiresAt
    };

    localStorage.setItem('gloria_session', JSON.stringify(sessionData));
    // Keep backward compatibility
    localStorage.setItem('gloria_user', JSON.stringify(data.user));
    localStorage.setItem('gloria_session_expires', data.expiresAt);
  }
}

/**
 * Clear user session from localStorage
 */
export function clearUserSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('gloria_session');
    localStorage.removeItem('gloria_user');
    localStorage.removeItem('gloria_session_expires');
  }
}

/**
 * Get stored user session from localStorage
 */
export function getStoredUserSession() {
  if (typeof window === 'undefined') return null;

  const userStr = localStorage.getItem('gloria_user');
  const expiresAt = localStorage.getItem('gloria_session_expires');

  if (!userStr || !expiresAt) return null;

  // Check if session is expired
  if (new Date(expiresAt) < new Date()) {
    clearUserSession();
    return null;
  }

  try {
    return JSON.parse(userStr);
  } catch {
    clearUserSession();
    return null;
  }
}

/**
 * Determine error reason from error message
 */
export function getErrorReason(errorMessage: string): string {
  if (errorMessage.toLowerCase().includes('not registered')) {
    return 'not_registered';
  }
  if (errorMessage.toLowerCase().includes('inactive')) {
    return 'inactive';
  }
  if (errorMessage.toLowerCase().includes('access denied') ||
      errorMessage.toLowerCase().includes('forbidden')) {
    return 'validation_failed';
  }
  return 'unknown';
}

/**
 * Format error message for display
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize email for consistency
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}