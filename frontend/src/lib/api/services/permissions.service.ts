import apiClient from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { PaginatedResponse, QueryParams } from '../types';

// Permission types
export interface Permission {
  id: string;
  name: string;
  code: string;
  description?: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
  category?: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  permissions: Permission[];
  isSystem: boolean;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionCheck {
  resource: string;
  action: string;
  resourceId?: string;
  context?: Record<string, any>;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  conditions?: Record<string, any>;
}

export interface CreateRoleDto {
  name: string;
  code: string;
  description?: string;
  permissionIds: string[];
  organizationId?: string;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

// Permission service class
class PermissionService {
  /**
   * Get all permissions
   */
  async getPermissions(params?: QueryParams): Promise<PaginatedResponse<Permission>> {
    const queryString = apiClient.buildQueryString(params);
    return apiClient.get<PaginatedResponse<Permission>>(
      API_ENDPOINTS.permissions.permissions.list(params)
    );
  }

  /**
   * Get permission by ID
   */
  async getPermissionById(id: string): Promise<Permission> {
    return apiClient.get<Permission>(API_ENDPOINTS.permissions.permissions.byId(id));
  }

  /**
   * Check single permission
   */
  async checkPermission(check: PermissionCheck): Promise<PermissionCheckResult> {
    return apiClient.post<PermissionCheckResult>(API_ENDPOINTS.permissions.permissions.checkAccess(), check);
  }

  /**
   * Check multiple permissions
   */
  async checkBulkPermissions(checks: PermissionCheck[]): Promise<PermissionCheckResult[]> {
    return apiClient.post<PermissionCheckResult[]>(API_ENDPOINTS.permissions.permissions.bulkCheck(), {
      checks,
    });
  }

  /**
   * Get all roles
   */
  async getRoles(params?: QueryParams): Promise<PaginatedResponse<Role>> {
    const queryString = apiClient.buildQueryString(params);
    return apiClient.get<PaginatedResponse<Role>>(API_ENDPOINTS.permissions.roles.list(params));
  }

  /**
   * Get role by ID
   */
  async getRoleById(id: string): Promise<Role> {
    return apiClient.get<Role>(`/roles/${id}`);
  }

  /**
   * Create a new role
   */
  async createRole(data: CreateRoleDto): Promise<Role> {
    return apiClient.post<Role>('/roles', data);
  }

  /**
   * Update role
   */
  async updateRole(id: string, data: UpdateRoleDto): Promise<Role> {
    return apiClient.patch<Role>(`/roles/${id}`, data);
  }

  /**
   * Delete role
   */
  async deleteRole(id: string): Promise<void> {
    return apiClient.delete<void>(`/roles/${id}`);
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    return apiClient.post<void>(`/users/${userId}/roles`, { roleId });
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    return apiClient.delete<void>(`/users/${userId}/roles/${roleId}`);
  }

  /**
   * Get user's roles
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    return apiClient.get<Role[]>(`/users/${userId}/roles`);
  }

  /**
   * Get user's permissions
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    return apiClient.get<Permission[]>(`/users/${userId}/permissions`);
  }

  /**
   * Get my permissions
   */
  async getMyPermissions(): Promise<Permission[]> {
    return apiClient.get<Permission[]>('/users/me/permissions');
  }

  /**
   * Get my roles
   */
  async getMyRoles(): Promise<Role[]> {
    return apiClient.get<Role[]>('/users/me/roles');
  }

  /**
   * Sync permissions from backend
   */
  async syncPermissions(): Promise<{ synced: number; created: number; updated: number }> {
    return apiClient.post<{ synced: number; created: number; updated: number }>(
      '/permissions/sync'
    );
  }

  /**
   * Get permission matrix for organization
   */
  async getPermissionMatrix(organizationId: string): Promise<any> {
    return apiClient.get(`/organizations/${organizationId}/permission-matrix`);
  }
}

// Export singleton instance
export const permissionService = new PermissionService();