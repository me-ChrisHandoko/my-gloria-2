import apiClient from '../client';
import { API_ENDPOINTS } from '../constants';
import type { PaginatedResponse, QueryParams } from '../types';

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: 'ADMIN' | 'USER' | 'VIEWER';
  organizationId?: string;
  departmentId?: string;
  positionId?: string;
  nip?: string;
  phoneNumber?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: 'ADMIN' | 'USER' | 'VIEWER';
  organizationId?: string;
  departmentId?: string;
  positionId?: string;
  nip?: string;
  phoneNumber?: string;
}

export interface UpdateUserDto {
  name?: string;
  firstName?: string;
  lastName?: string;
  role?: 'ADMIN' | 'USER' | 'VIEWER';
  organizationId?: string;
  departmentId?: string;
  positionId?: string;
  nip?: string;
  phoneNumber?: string;
  isActive?: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  timezone: string;
}

// User service class
class UserService {
  /**
   * Get paginated list of users
   */
  async getUsers(params?: QueryParams): Promise<PaginatedResponse<User>> {
    const queryString = apiClient.buildQueryString(params);
    return apiClient.get<PaginatedResponse<User>>(`${API_ENDPOINTS.USERS.BASE}${queryString}`);
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User> {
    return apiClient.get<User>(API_ENDPOINTS.USERS.BY_ID(id));
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    return apiClient.get<User>(API_ENDPOINTS.USERS.ME);
  }

  /**
   * Create a new user
   */
  async createUser(data: CreateUserDto): Promise<User> {
    return apiClient.post<User>(API_ENDPOINTS.USERS.BASE, data);
  }

  /**
   * Update user by ID
   */
  async updateUser(id: string, data: UpdateUserDto): Promise<User> {
    return apiClient.patch<User>(API_ENDPOINTS.USERS.BY_ID(id), data);
  }

  /**
   * Delete user by ID
   */
  async deleteUser(id: string): Promise<void> {
    return apiClient.delete<void>(API_ENDPOINTS.USERS.BY_ID(id));
  }

  /**
   * Update user avatar
   */
  async updateAvatar(userId: string, file: File): Promise<{ url: string }> {
    return apiClient.uploadFile(API_ENDPOINTS.USERS.AVATAR(userId), file);
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(): Promise<UserPreferences> {
    return apiClient.get<UserPreferences>(API_ENDPOINTS.USERS.PREFERENCES);
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    return apiClient.patch<UserPreferences>(API_ENDPOINTS.USERS.PREFERENCES, preferences);
  }

  /**
   * Bulk create users
   */
  async bulkCreateUsers(users: CreateUserDto[]): Promise<User[]> {
    return apiClient.post<User[]>(`${API_ENDPOINTS.USERS.BASE}/bulk`, { users });
  }

  /**
   * Bulk delete users
   */
  async bulkDeleteUsers(userIds: string[]): Promise<void> {
    return apiClient.post<void>(`${API_ENDPOINTS.USERS.BASE}/bulk-delete`, { ids: userIds });
  }

  /**
   * Export users to CSV
   */
  async exportUsers(params?: QueryParams): Promise<Blob> {
    const queryString = apiClient.buildQueryString(params);
    const response = await apiClient.get<ArrayBuffer>(
      `${API_ENDPOINTS.USERS.BASE}/export${queryString}`,
      { responseType: 'arraybuffer' }
    );
    return new Blob([response], { type: 'text/csv' });
  }

  /**
   * Search users by query
   */
  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    return apiClient.get<User[]>(`${API_ENDPOINTS.USERS.BASE}/search`, {
      params: { q: query, limit },
    });
  }

  /**
   * Check if email is available
   */
  async checkEmailAvailability(email: string): Promise<{ available: boolean }> {
    return apiClient.post<{ available: boolean }>(`${API_ENDPOINTS.USERS.BASE}/check-email`, {
      email,
    });
  }
}

// Export singleton instance
export const userService = new UserService();