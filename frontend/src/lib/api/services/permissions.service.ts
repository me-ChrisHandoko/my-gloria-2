export type PermissionAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'EXPORT'
  | 'IMPORT'
  | 'PRINT'
  | 'ASSIGN'
  | 'CLOSE';

export type PermissionScope = 'OWN' | 'DEPARTMENT' | 'SCHOOL' | 'ALL';

export type ModuleCategory =
  | 'SERVICE'
  | 'PERFORMANCE'
  | 'QUALITY'
  | 'FEEDBACK'
  | 'TRAINING'
  | 'SYSTEM';

export interface PermissionGroup {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: ModuleCategory;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  resource: string;
  action: PermissionAction;
  scope?: PermissionScope;
  groupId?: string;
  group?: PermissionGroup;
  conditions?: any;
  metadata?: any;
  isSystemPermission: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreatePermissionDto {
  code: string;
  name: string;
  description?: string;
  resource: string;
  action: PermissionAction;
  scope?: PermissionScope;
  groupId?: string;
  conditions?: Record<string, any>;
  metadata?: Record<string, any>;
  isSystemPermission?: boolean;
}

export interface UpdatePermissionDto {
  name?: string;
  description?: string;
  scope?: PermissionScope;
  groupId?: string;
  conditions?: Record<string, any>;
  metadata?: Record<string, any>;
  isActive?: boolean;
}

export interface PermissionQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  resource?: string;
  action?: PermissionAction;
  groupId?: string;
  isActive?: boolean;
}

export interface PermissionStatistics {
  totalPermissions: number;
  activePermissions: number;
  systemPermissions: number;
  permissionsByAction: Record<PermissionAction, number>;
  permissionsByScope: Record<PermissionScope, number>;
  permissionsByGroup: Array<{
    groupId: string;
    groupName: string;
    count: number;
  }>;
}

// Permission check interfaces
export interface CheckPermissionDto {
  resource: string;
  action: string;
  scope?: PermissionScope;
  context?: Record<string, any>;
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  matchedPermissions?: string[];
}

// Role interfaces
export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  hierarchyLevel: number;
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Import necessary dependencies
import apiClient from '../client';
import { API_ENDPOINTS } from '../endpoints';

/**
 * Permission Service Class
 * Handles permission checking and role management
 */
class PermissionService {
  /**
   * Check if user has permission for a specific resource and action
   */
  async checkPermission(dto: CheckPermissionDto): Promise<PermissionResult> {
    try {
      const response = await apiClient.post<PermissionResult>(
        API_ENDPOINTS.permissions.permissions.checkAccess(),
        dto
      );
      return response;
    } catch (error) {
      console.error('Permission check failed:', error);
      // Default to not allowed on error
      return {
        allowed: false,
        reason: 'Permission check failed',
      };
    }
  }

  /**
   * Get roles for the current authenticated user
   */
  async getMyRoles(): Promise<Role[]> {
    try {
      // Get current user from auth/me endpoint
      const userResponse = await apiClient.get<any>(API_ENDPOINTS.auth.me());
      const userId = userResponse.id;

      // Get user's roles
      const rolesResponse = await apiClient.get<Role[]>(
        API_ENDPOINTS.users.roles(userId)
      );
      return rolesResponse;
    } catch (error) {
      console.error('Failed to fetch user roles:', error);
      return [];
    }
  }

  /**
   * Get all permissions for the current user
   */
  async getMyPermissions(): Promise<Permission[]> {
    try {
      const userResponse = await apiClient.get<any>(API_ENDPOINTS.auth.me());
      const userId = userResponse.id;

      const permissionsResponse = await apiClient.get<Permission[]>(
        API_ENDPOINTS.users.permissions(userId)
      );
      return permissionsResponse;
    } catch (error) {
      console.error('Failed to fetch user permissions:', error);
      return [];
    }
  }

  /**
   * Bulk check multiple permissions at once
   */
  async bulkCheckPermissions(
    checks: CheckPermissionDto[]
  ): Promise<Record<string, PermissionResult>> {
    try {
      const response = await apiClient.post<Record<string, PermissionResult>>(
        API_ENDPOINTS.permissions.permissions.bulkCheck(),
        { checks }
      );
      return response;
    } catch (error) {
      console.error('Bulk permission check failed:', error);
      // Return all as not allowed on error
      const results: Record<string, PermissionResult> = {};
      checks.forEach((check, index) => {
        results[`${check.resource}_${check.action}_${index}`] = {
          allowed: false,
          reason: 'Bulk check failed',
        };
      });
      return results;
    }
  }
}

/**
 * Export singleton instance
 */
export const permissionService = new PermissionService();
