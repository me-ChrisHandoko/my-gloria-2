import crypto from 'crypto';
import { z } from 'zod';

/**
 * CSRF Token Configuration
 */
export interface CSRFConfig {
  secretKey: string;
  tokenLength?: number;
  tokenLifetime?: number; // in milliseconds
  cookieName?: string;
  headerName?: string;
  parameterName?: string;
  sameSite?: 'strict' | 'lax' | 'none';
  secure?: boolean;
  httpOnly?: boolean;
  domain?: string;
  path?: string;
}

/**
 * CSRF Token Data
 */
interface CSRFTokenData {
  token: string;
  expiresAt: number;
  sessionId?: string;
  userId?: string;
}

/**
 * CSRF Validation Result
 */
export interface CSRFValidationResult {
  valid: boolean;
  reason?: string;
  newToken?: string;
}

/**
 * CSRF Protection Service
 */
class CSRFProtection {
  private readonly defaultConfig: Partial<CSRFConfig> = {
    tokenLength: 32,
    tokenLifetime: 3600000, // 1 hour
    cookieName: 'csrf-token',
    headerName: 'X-CSRF-Token',
    parameterName: '_csrf',
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    path: '/',
  };

  private tokenStore = new Map<string, CSRFTokenData>();
  private readonly maxTokensPerSession = 5;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTask();
  }

  /**
   * Generate a new CSRF token
   */
  generateToken(config: CSRFConfig, sessionId?: string, userId?: string): string {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const tokenBytes = crypto.randomBytes(mergedConfig.tokenLength || 32);
    const token = tokenBytes.toString('base64url');

    // Create token data
    const tokenData: CSRFTokenData = {
      token,
      expiresAt: Date.now() + (mergedConfig.tokenLifetime || 3600000),
      sessionId,
      userId,
    };

    // Store token with hash for security
    const tokenHash = this.hashToken(token, config.secretKey);
    this.tokenStore.set(tokenHash, tokenData);

    // Clean up old tokens for this session
    if (sessionId) {
      this.cleanupSessionTokens(sessionId);
    }

    return token;
  }

  /**
   * Validate a CSRF token
   */
  validateToken(
    token: string,
    config: CSRFConfig,
    sessionId?: string,
    userId?: string
  ): CSRFValidationResult {
    if (!token) {
      return {
        valid: false,
        reason: 'Missing CSRF token',
      };
    }

    // Hash the token for lookup
    const tokenHash = this.hashToken(token, config.secretKey);
    const tokenData = this.tokenStore.get(tokenHash);

    if (!tokenData) {
      return {
        valid: false,
        reason: 'Invalid CSRF token',
      };
    }

    // Check if token has expired
    if (Date.now() > tokenData.expiresAt) {
      this.tokenStore.delete(tokenHash);
      return {
        valid: false,
        reason: 'CSRF token expired',
      };
    }

    // Validate session binding if provided
    if (sessionId && tokenData.sessionId !== sessionId) {
      return {
        valid: false,
        reason: 'CSRF token session mismatch',
      };
    }

    // Validate user binding if provided
    if (userId && tokenData.userId !== userId) {
      return {
        valid: false,
        reason: 'CSRF token user mismatch',
      };
    }

    // Token is valid - optionally rotate it
    const rotateToken = this.shouldRotateToken(tokenData);
    if (rotateToken) {
      this.tokenStore.delete(tokenHash);
      const newToken = this.generateToken(config, sessionId, userId);
      return {
        valid: true,
        newToken,
      };
    }

    return {
      valid: true,
    };
  }

  /**
   * Extract CSRF token from request
   */
  extractToken(
    headers: Record<string, string>,
    body: any,
    query: any,
    config: CSRFConfig
  ): string | null {
    const mergedConfig = { ...this.defaultConfig, ...config };

    // Check header first (preferred method)
    if (mergedConfig.headerName) {
      const headerToken = headers[mergedConfig.headerName.toLowerCase()] ||
                          headers[mergedConfig.headerName];
      if (headerToken) {
        return headerToken;
      }
    }

    // Check body parameter
    if (mergedConfig.parameterName && body && body[mergedConfig.parameterName]) {
      return body[mergedConfig.parameterName];
    }

    // Check query parameter
    if (mergedConfig.parameterName && query && query[mergedConfig.parameterName]) {
      return query[mergedConfig.parameterName];
    }

    return null;
  }

  /**
   * Hash token for secure storage
   */
  private hashToken(token: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(token)
      .digest('hex');
  }

  /**
   * Determine if token should be rotated
   */
  private shouldRotateToken(tokenData: CSRFTokenData): boolean {
    // Rotate if token is halfway through its lifetime
    const halfLifetime = (tokenData.expiresAt - Date.now()) / 2;
    return Date.now() > tokenData.expiresAt - halfLifetime;
  }

  /**
   * Clean up old tokens for a session
   */
  private cleanupSessionTokens(sessionId: string): void {
    const sessionTokens = Array.from(this.tokenStore.entries())
      .filter(([_, data]) => data.sessionId === sessionId)
      .sort((a, b) => b[1].expiresAt - a[1].expiresAt);

    // Keep only the most recent tokens
    if (sessionTokens.length > this.maxTokensPerSession) {
      sessionTokens
        .slice(this.maxTokensPerSession)
        .forEach(([hash]) => this.tokenStore.delete(hash));
    }
  }

  /**
   * Start periodic cleanup task
   */
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      Array.from(this.tokenStore.entries()).forEach(([hash, data]) => {
        if (now > data.expiresAt) {
          this.tokenStore.delete(hash);
        }
      });
    }, 300000); // Run every 5 minutes
  }

  /**
   * Stop cleanup task
   */
  stopCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clear all tokens
   */
  clearAllTokens(): void {
    this.tokenStore.clear();
  }

  /**
   * Get token statistics
   */
  getStats(): {
    totalTokens: number;
    activeTokens: number;
    expiredTokens: number;
  } {
    const now = Date.now();
    let activeTokens = 0;
    let expiredTokens = 0;

    this.tokenStore.forEach(data => {
      if (now > data.expiresAt) {
        expiredTokens++;
      } else {
        activeTokens++;
      }
    });

    return {
      totalTokens: this.tokenStore.size,
      activeTokens,
      expiredTokens,
    };
  }
}

// Create singleton instance
export const csrfProtection = new CSRFProtection();

/**
 * Express/Next.js middleware for CSRF protection
 */
export function createCSRFMiddleware(config: CSRFConfig) {
  const skipMethods = ['GET', 'HEAD', 'OPTIONS'];

  return async (req: any, res: any, next: any) => {
    // Skip CSRF check for safe methods
    if (skipMethods.includes(req.method)) {
      // Generate token for GET requests
      if (req.method === 'GET') {
        const token = csrfProtection.generateToken(
          config,
          req.session?.id,
          req.user?.id
        );
        res.locals.csrfToken = token;
      }
      return next();
    }

    // Extract token from request
    const token = csrfProtection.extractToken(
      req.headers,
      req.body,
      req.query,
      config
    );

    if (!token) {
      return res.status(403).json({
        error: 'CSRF token missing',
        message: 'Request requires valid CSRF token',
      });
    }

    // Validate token
    const result = csrfProtection.validateToken(
      token,
      config,
      req.session?.id,
      req.user?.id
    );

    if (!result.valid) {
      return res.status(403).json({
        error: 'Invalid CSRF token',
        message: result.reason,
      });
    }

    // Set new token if rotated
    if (result.newToken) {
      res.locals.csrfToken = result.newToken;
      res.setHeader(config.headerName || 'X-CSRF-Token', result.newToken);
    }

    next();
  };
}

/**
 * React hook for CSRF protection
 */
export function useCSRFToken(): {
  token: string | null;
  getToken: () => Promise<string>;
  refreshToken: () => Promise<string>;
} {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get initial token from meta tag or cookie
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (metaToken) {
      setToken(metaToken);
    }
  }, []);

  const getToken = async (): Promise<string> => {
    if (token) {
      return token;
    }

    // Fetch new token from server
    const response = await fetch('/api/csrf-token', {
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      setToken(data.token);
      return data.token;
    }

    throw new Error('Failed to get CSRF token');
  };

  const refreshToken = async (): Promise<string> => {
    const response = await fetch('/api/csrf-token', {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      setToken(data.token);
      return data.token;
    }

    throw new Error('Failed to refresh CSRF token');
  };

  return {
    token,
    getToken,
    refreshToken,
  };
}

/**
 * Axios interceptor for CSRF token
 */
export function createAxiosCSRFInterceptor(config: CSRFConfig) {
  let currentToken: string | null = null;

  return {
    request: async (axiosConfig: any) => {
      // Skip for safe methods
      if (['get', 'head', 'options'].includes(axiosConfig.method?.toLowerCase() || '')) {
        return axiosConfig;
      }

      // Get current token
      if (!currentToken) {
        // Try to get from meta tag
        currentToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || null;
      }

      if (currentToken) {
        // Add CSRF token to headers
        axiosConfig.headers = {
          ...axiosConfig.headers,
          [config.headerName || 'X-CSRF-Token']: currentToken,
        };
      }

      return axiosConfig;
    },
    response: (response: any) => {
      // Update token if server sends a new one
      const newToken = response.headers[config.headerName?.toLowerCase() || 'x-csrf-token'];
      if (newToken) {
        currentToken = newToken;
        // Update meta tag if exists
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
          metaTag.setAttribute('content', newToken);
        }
      }
      return response;
    },
  };
}

/**
 * Double Submit Cookie Pattern Implementation
 */
export class DoubleSubmitCSRF {
  private readonly cookieName: string;
  private readonly headerName: string;

  constructor(cookieName = '__csrf', headerName = 'X-CSRF-Token') {
    this.cookieName = cookieName;
    this.headerName = headerName;
  }

  /**
   * Generate and set CSRF cookie
   */
  generateCookie(): string {
    const token = crypto.randomBytes(32).toString('base64url');

    // In a real implementation, this would set an HTTP-only cookie
    // For client-side, we'll store in sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(this.cookieName, token);
    }

    return token;
  }

  /**
   * Validate double submit cookie
   */
  validate(cookieValue: string, headerValue: string): boolean {
    if (!cookieValue || !headerValue) {
      return false;
    }

    // Constant-time comparison
    return this.constantTimeCompare(cookieValue, headerValue);
  }

  /**
   * Constant-time string comparison
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}

/**
 * Synchronizer Token Pattern with Stateless Backend
 */
export class StatelessCSRF {
  private readonly secret: string;
  private readonly algorithm = 'aes-256-gcm';

  constructor(secret: string) {
    this.secret = secret;
  }

  /**
   * Generate encrypted token
   */
  generateToken(userId: string, sessionId: string): string {
    const payload = {
      userId,
      sessionId,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex'),
    };

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      Buffer.from(this.secret, 'hex'),
      iv
    );

    let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine iv, authTag, and encrypted data
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex'),
    ]);

    return combined.toString('base64url');
  }

  /**
   * Validate encrypted token
   */
  validateToken(
    token: string,
    userId: string,
    sessionId: string,
    maxAge = 3600000
  ): boolean {
    try {
      const combined = Buffer.from(token, 'base64url');

      const iv = combined.slice(0, 16);
      const authTag = combined.slice(16, 32);
      const encrypted = combined.slice(32);

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        Buffer.from(this.secret, 'hex'),
        iv
      );

      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      const payload = JSON.parse(decrypted);

      // Validate payload
      if (payload.userId !== userId || payload.sessionId !== sessionId) {
        return false;
      }

      // Check token age
      if (Date.now() - payload.timestamp > maxAge) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}

// Export types
export type { CSRFTokenData, CSRFProtection };

// For React 18
import { useState, useEffect } from 'react';