/**
 * OAuth Logger Utility
 *
 * Provides structured logging for OAuth authentication flows
 * with enhanced debugging for Microsoft OAuth issues
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface OAuthLogEntry {
  timestamp: string;
  level: LogLevel;
  provider?: 'google' | 'microsoft';
  step: string;
  message: string;
  data?: any;
  error?: any;
}

class OAuthLogger {
  private logs: OAuthLogEntry[] = [];
  private isDevelopment = process.env.NODE_ENV === 'development';
  private maxLogs = 50; // Keep last 50 logs in memory for debugging

  /**
   * Log an OAuth event
   */
  private log(level: LogLevel, step: string, message: string, data?: any, error?: any) {
    const entry: OAuthLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      step,
      message,
      data,
      error: error ? this.sanitizeError(error) : undefined
    };

    // Add to in-memory logs
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output based on environment
    if (this.isDevelopment || level === 'error') {
      const consoleMethod = level === 'error' ? console.error :
                           level === 'warn' ? console.warn :
                           console.log;

      consoleMethod(`[OAuth ${step}]`, message, data || '', error || '');
    }

    // Store critical errors in sessionStorage for debugging
    if (level === 'error' && typeof window !== 'undefined') {
      try {
        const errorKey = `oauth_error_${Date.now()}`;
        sessionStorage.setItem(errorKey, JSON.stringify(entry));

        // Clean up old error logs (keep last 5)
        this.cleanupSessionStorage();
      } catch (e) {
        console.warn('Failed to store OAuth error in session', e);
      }
    }
  }

  /**
   * Sanitize error objects for logging
   */
  private sanitizeError(error: any): any {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
        name: error.name
      };
    }

    // Clerk-specific error handling
    if (error?.errors) {
      return {
        clerkErrors: error.errors.map((e: any) => ({
          message: e.message,
          code: e.code,
          meta: e.meta
        }))
      };
    }

    return error;
  }

  /**
   * Clean up old error logs from sessionStorage
   */
  private cleanupSessionStorage() {
    if (typeof window === 'undefined') return;

    const keys = Object.keys(sessionStorage);
    const errorKeys = keys
      .filter(key => key.startsWith('oauth_error_'))
      .sort();

    // Keep only the last 5 error logs
    if (errorKeys.length > 5) {
      errorKeys.slice(0, errorKeys.length - 5).forEach(key => {
        sessionStorage.removeItem(key);
      });
    }
  }

  // Public methods for different log levels
  debug(step: string, message: string, data?: any) {
    this.log('debug', step, message, data);
  }

  info(step: string, message: string, data?: any) {
    this.log('info', step, message, data);
  }

  warn(step: string, message: string, data?: any) {
    this.log('warn', step, message, data);
  }

  error(step: string, message: string, error?: any, data?: any) {
    this.log('error', step, message, data, error);
  }

  /**
   * Log Microsoft-specific OAuth events
   */
  microsoftOAuth(step: string, message: string, data?: any, error?: any) {
    const enrichedData = {
      ...data,
      provider: 'microsoft',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      timestamp: new Date().toISOString()
    };

    if (error) {
      this.error(`Microsoft OAuth - ${step}`, message, error, enrichedData);
    } else {
      this.info(`Microsoft OAuth - ${step}`, message, enrichedData);
    }
  }

  /**
   * Log Google-specific OAuth events
   */
  googleOAuth(step: string, message: string, data?: any, error?: any) {
    const enrichedData = {
      ...data,
      provider: 'google',
      timestamp: new Date().toISOString()
    };

    if (error) {
      this.error(`Google OAuth - ${step}`, message, error, enrichedData);
    } else {
      this.info(`Google OAuth - ${step}`, message, enrichedData);
    }
  }

  /**
   * Get recent logs for debugging
   */
  getRecentLogs(count: number = 10): OAuthLogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Export logs for debugging (development only)
   */
  exportLogs(): string {
    if (!this.isDevelopment) {
      return 'Log export is only available in development mode';
    }
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];

    // Clear sessionStorage error logs
    if (typeof window !== 'undefined') {
      const keys = Object.keys(sessionStorage);
      keys
        .filter(key => key.startsWith('oauth_error_'))
        .forEach(key => sessionStorage.removeItem(key));
    }
  }
}

// Export singleton instance
export const oauthLogger = new OAuthLogger();

/**
 * Helper function to format OAuth error messages for users
 */
export function formatOAuthError(error: any, provider?: string): string {
  const providerName = provider || 'OAuth provider';

  // Common OAuth error patterns
  if (error?.message?.includes('user_not_found')) {
    return `Your ${providerName} account is not registered in the system. Please contact HR for access.`;
  }

  if (error?.message?.includes('invalid_credentials')) {
    return `Invalid credentials for ${providerName}. Please try again.`;
  }

  if (error?.message?.includes('account_inactive')) {
    return `Your account is inactive. Please contact HR to reactivate your access.`;
  }

  if (error?.status === 403 || error?.message?.includes('forbidden')) {
    return `Access denied. Your ${providerName} account may not be authorized for this system.`;
  }

  if (error?.status === 429 || error?.message?.includes('rate_limit')) {
    return 'Too many login attempts. Please wait a moment and try again.';
  }

  if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }

  // Clerk-specific errors
  if (error?.errors?.[0]?.message) {
    return error.errors[0].message;
  }

  // Generic fallback with provider name
  return `Unable to sign in with ${providerName}. Please try again or contact support.`;
}