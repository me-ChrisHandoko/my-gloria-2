/**
 * Token Management Utilities
 * Handles secure token storage, refresh, and validation
 */

import { AuthService } from '@/lib/api/services/auth.service';
import apiClient from '@/lib/api/client';

// Token storage keys
const TOKEN_KEY = 'gloria_auth_token';
const REFRESH_TOKEN_KEY = 'gloria_refresh_token';
const TOKEN_EXPIRY_KEY = 'gloria_token_expiry';
const USER_DATA_KEY = 'gloria_user_data';

// Token storage options
export enum TokenStorage {
  MEMORY = 'memory',
  SESSION = 'session',
  LOCAL = 'local',
  SECURE_COOKIE = 'secure_cookie',
}

// In-memory token storage for maximum security
class MemoryTokenStore {
  private token: string | null = null;
  private refreshToken: string | null = null;
  private expiry: number | null = null;

  setToken(token: string, expiry?: number) {
    this.token = token;
    this.expiry = expiry || Date.now() + 3600000; // Default 1 hour
  }

  setRefreshToken(token: string) {
    this.refreshToken = token;
  }

  getToken(): string | null {
    if (this.expiry && Date.now() > this.expiry) {
      this.clear();
      return null;
    }
    return this.token;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  clear() {
    this.token = null;
    this.refreshToken = null;
    this.expiry = null;
  }

  isExpired(): boolean {
    return this.expiry ? Date.now() > this.expiry : true;
  }
}

// Singleton token manager
class TokenManager {
  private static instance: TokenManager;
  private memoryStore = new MemoryTokenStore();
  private storageType: TokenStorage = TokenStorage.MEMORY;
  private refreshTimer: NodeJS.Timeout | null = null;
  private authService = AuthService.getInstance();

  private constructor() {
    // Initialize storage type based on environment
    if (typeof window !== 'undefined') {
      // Check if we should use secure storage
      const isSecureContext = window.isSecureContext;
      this.storageType = isSecureContext ? TokenStorage.SESSION : TokenStorage.MEMORY;
    }
  }

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Set the storage type for tokens
   */
  setStorageType(type: TokenStorage) {
    this.storageType = type;
  }

  /**
   * Store tokens securely
   */
  setTokens(accessToken: string, refreshToken?: string, expiresIn?: number) {
    const expiry = Date.now() + (expiresIn ? expiresIn * 1000 : 3600000);

    // Always store in memory for immediate access
    this.memoryStore.setToken(accessToken, expiry);
    if (refreshToken) {
      this.memoryStore.setRefreshToken(refreshToken);
    }

    // Additional storage based on configuration
    switch (this.storageType) {
      case TokenStorage.SESSION:
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(TOKEN_KEY, accessToken);
          sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
          if (refreshToken) {
            sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
          }
        }
        break;

      case TokenStorage.LOCAL:
        if (typeof window !== 'undefined') {
          // Encrypt tokens before storing in localStorage
          const encryptedToken = this.encrypt(accessToken);
          localStorage.setItem(TOKEN_KEY, encryptedToken);
          localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
          if (refreshToken) {
            const encryptedRefresh = this.encrypt(refreshToken);
            localStorage.setItem(REFRESH_TOKEN_KEY, encryptedRefresh);
          }
        }
        break;

      case TokenStorage.SECURE_COOKIE:
        // This would require server-side handling for httpOnly cookies
        // Implement via API endpoint
        break;
    }

    // Set token in API client
    apiClient.setAuthToken(accessToken, expiresIn || 3600);

    // Schedule token refresh
    this.scheduleTokenRefresh(expiresIn || 3600);
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    // First check memory store
    let token = this.memoryStore.getToken();
    if (token) return token;

    // Fallback to other storage
    switch (this.storageType) {
      case TokenStorage.SESSION:
        if (typeof window !== 'undefined') {
          const storedToken = sessionStorage.getItem(TOKEN_KEY);
          const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
          if (storedToken && expiry) {
            if (Date.now() < parseInt(expiry)) {
              // Restore to memory store
              this.memoryStore.setToken(storedToken, parseInt(expiry));
              return storedToken;
            } else {
              // Token expired, clear storage
              this.clearTokens();
            }
          }
        }
        break;

      case TokenStorage.LOCAL:
        if (typeof window !== 'undefined') {
          const encryptedToken = localStorage.getItem(TOKEN_KEY);
          const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
          if (encryptedToken && expiry) {
            if (Date.now() < parseInt(expiry)) {
              const decryptedToken = this.decrypt(encryptedToken);
              // Restore to memory store
              this.memoryStore.setToken(decryptedToken, parseInt(expiry));
              return decryptedToken;
            } else {
              // Token expired, clear storage
              this.clearTokens();
            }
          }
        }
        break;
    }

    return null;
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    // First check memory store
    let token = this.memoryStore.getRefreshToken();
    if (token) return token;

    // Fallback to other storage
    switch (this.storageType) {
      case TokenStorage.SESSION:
        if (typeof window !== 'undefined') {
          return sessionStorage.getItem(REFRESH_TOKEN_KEY);
        }
        break;

      case TokenStorage.LOCAL:
        if (typeof window !== 'undefined') {
          const encryptedToken = localStorage.getItem(REFRESH_TOKEN_KEY);
          return encryptedToken ? this.decrypt(encryptedToken) : null;
        }
        break;
    }

    return null;
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    return this.memoryStore.isExpired();
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<string | null> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.authService.refreshToken();

      if (response.token) {
        this.setTokens(response.token, response.refreshToken, response.expiresIn);
        return response.token;
      }

      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      throw error;
    }
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(expiresIn: number) {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Schedule refresh 5 minutes before expiry
    const refreshTime = (expiresIn - 300) * 1000; // Convert to milliseconds
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(async () => {
        try {
          await this.refreshAccessToken();
        } catch (error) {
          console.error('Auto token refresh failed:', error);
        }
      }, refreshTime);
    }
  }

  /**
   * Clear all tokens
   */
  clearTokens() {
    // Clear memory store
    this.memoryStore.clear();

    // Clear timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Clear storage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
      sessionStorage.removeItem(USER_DATA_KEY);

      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      localStorage.removeItem(USER_DATA_KEY);
    }

    // Clear from API client
    apiClient.clearAuthToken();
  }

  /**
   * Store user data
   */
  setUserData(userData: any) {
    if (typeof window !== 'undefined') {
      const dataStr = JSON.stringify(userData);

      switch (this.storageType) {
        case TokenStorage.SESSION:
          sessionStorage.setItem(USER_DATA_KEY, dataStr);
          break;
        case TokenStorage.LOCAL:
          localStorage.setItem(USER_DATA_KEY, this.encrypt(dataStr));
          break;
      }
    }
  }

  /**
   * Get stored user data
   */
  getUserData(): any | null {
    if (typeof window === 'undefined') return null;

    let dataStr: string | null = null;

    switch (this.storageType) {
      case TokenStorage.SESSION:
        dataStr = sessionStorage.getItem(USER_DATA_KEY);
        break;
      case TokenStorage.LOCAL:
        const encrypted = localStorage.getItem(USER_DATA_KEY);
        dataStr = encrypted ? this.decrypt(encrypted) : null;
        break;
    }

    if (dataStr) {
      try {
        return JSON.parse(dataStr);
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Simple encryption (should use proper encryption library in production)
   */
  private encrypt(text: string): string {
    // In production, use a proper encryption library like crypto-js
    return btoa(text);
  }

  /**
   * Simple decryption (should use proper encryption library in production)
   */
  private decrypt(text: string): string {
    // In production, use a proper encryption library like crypto-js
    return atob(text);
  }

  /**
   * Validate token format
   */
  validateTokenFormat(token: string): boolean {
    // JWT format validation
    const parts = token.split('.');
    return parts.length === 3;
  }

  /**
   * Decode JWT token (without verification)
   */
  decodeToken(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  /**
   * Get token expiry time
   */
  getTokenExpiry(token: string): number | null {
    const decoded = this.decodeToken(token);
    return decoded?.exp ? decoded.exp * 1000 : null;
  }

  /**
   * Check if token will expire soon (within 5 minutes)
   */
  isTokenExpiringSoon(token?: string): boolean {
    const accessToken = token || this.getAccessToken();
    if (!accessToken) return true;

    const expiry = this.getTokenExpiry(accessToken);
    if (!expiry) return true;

    const timeUntilExpiry = expiry - Date.now();
    return timeUntilExpiry < 300000; // 5 minutes
  }
}

// Export singleton instance
export const tokenManager = TokenManager.getInstance();

// Export for convenience
export default tokenManager;