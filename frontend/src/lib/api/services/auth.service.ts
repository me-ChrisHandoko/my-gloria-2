/**
 * Authentication Service
 * Production-ready authentication API service
 */

import apiClient from '../client';
import { authEndpoints } from '../endpoints';
import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  RefreshTokenResponse,
  ChangePasswordRequest,
  ResetPasswordRequest,
  TwoFactorSetupResponse,
  TwoFactorVerifyRequest,
  Session,
} from '../types';
import { handleApiError } from '../errors';
import { retryWithBackoff } from '../retry';

/**
 * Authentication Service Class
 * Handles all authentication-related API operations
 */
class AuthServiceClass {
  private static instance: AuthServiceClass;

  /**
   * Get singleton instance
   */
  static getInstance(): AuthServiceClass {
    if (!AuthServiceClass.instance) {
      AuthServiceClass.instance = new AuthServiceClass();
    }
    return AuthServiceClass.instance;
  }
  /**
   * User login
   */
  async login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await apiClient.post<ApiResponse<LoginResponse>>(
        authEndpoints.login(),
        data
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * User logout
   */
  async logout(): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post<ApiResponse<void>>(
        authEndpoints.logout()
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<ApiResponse<RefreshTokenResponse>> {
    try {
      const response = await retryWithBackoff(
        () => apiClient.post<ApiResponse<RefreshTokenResponse>>(
          authEndpoints.refresh()
        ),
        3,
        1000
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const response = await apiClient.get<ApiResponse<User>>(
        authEndpoints.me()
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Check authentication service health
   */
  async checkHealth(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    try {
      const response = await apiClient.get<ApiResponse<{ status: string; timestamp: string }>>(
        authEndpoints.health()
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Register new user
   */
  async register(data: RegisterRequest): Promise<ApiResponse<User>> {
    try {
      const response = await apiClient.post<ApiResponse<User>>(
        authEndpoints.register(),
        data
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await apiClient.post<ApiResponse<{ message: string }>>(
        authEndpoints.forgotPassword(),
        { email }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(data: ResetPasswordRequest): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await apiClient.post<ApiResponse<{ message: string }>>(
        authEndpoints.resetPassword(),
        data
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await apiClient.post<ApiResponse<{ message: string }>>(
        authEndpoints.verifyEmail(),
        { token }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Resend verification email
   */
  async resendVerification(email: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await apiClient.post<ApiResponse<{ message: string }>>(
        authEndpoints.resendVerification(),
        { email }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(data: ChangePasswordRequest): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await apiClient.post<ApiResponse<{ message: string }>>(
        authEndpoints.changePassword(),
        data
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Setup two-factor authentication
   */
  async setupTwoFactor(): Promise<ApiResponse<TwoFactorSetupResponse>> {
    try {
      const response = await apiClient.post<ApiResponse<TwoFactorSetupResponse>>(
        authEndpoints.twoFactorSetup()
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Verify two-factor authentication code
   */
  async verifyTwoFactor(data: TwoFactorVerifyRequest): Promise<ApiResponse<{ verified: boolean }>> {
    try {
      const response = await apiClient.post<ApiResponse<{ verified: boolean }>>(
        authEndpoints.twoFactorVerify(),
        data
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(password: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await apiClient.post<ApiResponse<{ message: string }>>(
        authEndpoints.twoFactorDisable(),
        { password }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get all active sessions
   */
  async getSessions(): Promise<ApiResponse<Session[]>> {
    try {
      const response = await apiClient.get<ApiResponse<Session[]>>(
        authEndpoints.sessions()
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await apiClient.post<ApiResponse<{ message: string }>>(
        authEndpoints.revokeSession(sessionId)
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

/**
 * Export singleton instance
 */
export const authService = AuthServiceClass.getInstance();

/**
 * Export service class for testing/extension
 */
export const AuthService = AuthServiceClass;
export default AuthServiceClass;