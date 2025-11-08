import apiClient from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { PaginatedResponse, QueryParams } from '../types';

// Role interfaces matching backend schema
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
  createdBy?: string;
  // Extended fields from backend relations
  _count?: {
    userRoles?: number;
    rolePermissions?: number;
  };
}

export interface RoleHierarchy {
  id: string;
  roleId: string;
  parentRoleId: string;
  inheritPermissions: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserRole {
  id: string;
  userProfileId: string;
  roleId: string;
  assignedAt: string;
  assignedBy?: string;
  validFrom: string;
  validUntil?: string;
  isActive: boolean;
}

export interface RoleTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  permissions: string[]; // Array of permission IDs
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface RoleUser extends UserRole {
  userProfile?: {
    id: string;
    dataKaryawan?: any; // Based on your employee data structure
  };
}

export interface CreateRoleDto {
  name: string;
  code: string;
  hierarchyLevel: number;
  description?: string;
  isSystemRole?: boolean;
  isActive?: boolean;
}

export interface UpdateRoleDto {
  name?: string;
  // code is immutable and cannot be updated (backend enforces this)
  hierarchyLevel?: number;
  description?: string;
  isSystemRole?: boolean;
  isActive?: boolean;
}

export interface AssignRoleDto {
  userProfileId: string;
  roleId: string;
  validFrom?: string;
  validUntil?: string;
}

export interface UpdateUserRoleTemporalDto {
  validFrom?: string;
  validUntil?: string;
}

export interface AssignRolePermissionDto {
  permissionId: string;
  isGranted?: boolean;
  conditions?: any;
  validFrom?: string;
  validUntil?: string;
  grantReason?: string;
}

export interface BulkAssignRolePermissionsDto {
  permissions: {
    permissionId: string;
    isGranted?: boolean;
  }[];
}

export interface CreateRoleTemplateDto {
  code: string;
  name: string;
  description?: string;
  category: string;
  permissionIds: string[];
}

export interface ApplyRoleTemplateDto {
  templateId: string;
  roleId: string;
  overrideExisting?: boolean;
}

export interface CreateRoleHierarchyDto {
  parentRoleId: string;
  inheritPermissions?: boolean;
}

export interface QueryRoleParams extends QueryParams {
  includeInactive?: boolean;
  isActive?: boolean;
  hierarchyLevel?: number;
  isSystemRole?: boolean;
}

// Role service class
class RolesService {
  // Get all roles
  async getRoles(params?: QueryRoleParams): Promise<PaginatedResponse<Role>> {
    return apiClient.get<PaginatedResponse<Role>>('/api/v1/roles', { params });
  }

  // Get role by ID
  async getRoleById(id: string): Promise<Role> {
    return apiClient.get<Role>(`/api/v1/roles/${id}`);
  }

  // Get role by code
  async getRoleByCode(code: string): Promise<Role> {
    return apiClient.get<Role>(`/api/v1/roles/code/${code}`);
  }

  // Create role
  async createRole(data: CreateRoleDto): Promise<Role> {
    return apiClient.post<Role>('/api/v1/roles', data);
  }

  // Update role
  async updateRole(id: string, data: UpdateRoleDto): Promise<Role> {
    return apiClient.put<Role>(`/api/v1/roles/${id}`, data);
  }

  // Delete role (soft delete)
  async deleteRole(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/roles/${id}`);
  }

  // Assign role to user
  async assignRole(data: AssignRoleDto): Promise<UserRole> {
    return apiClient.post<UserRole>('/api/v1/roles/assign', data);
  }

  // Remove role from user
  async removeRole(userProfileId: string, roleId: string): Promise<void> {
    await apiClient.delete(`/api/v1/roles/users/${userProfileId}/roles/${roleId}`);
  }

  // Get user roles
  async getUserRoles(userProfileId: string): Promise<Role[]> {
    return apiClient.get<Role[]>(`/api/v1/roles/user/${userProfileId}`);
  }

  // Update user role temporal settings
  async updateUserRoleTemporal(
    userProfileId: string,
    roleId: string,
    data: UpdateUserRoleTemporalDto
  ): Promise<UserRole> {
    return apiClient.put<UserRole>(
      `/api/v1/roles/users/${userProfileId}/roles/${roleId}`,
      data
    );
  }

  // Get role statistics
  async getStatistics(): Promise<any> {
    return apiClient.get<any>('/api/v1/roles/statistics');
  }

  // Assign permission to role
  async assignPermissionToRole(
    roleId: string,
    data: AssignRolePermissionDto
  ): Promise<any> {
    return apiClient.post<any>(
      `/api/v1/roles/${roleId}/permissions`,
      data
    );
  }

  // Bulk assign permissions to role
  async bulkAssignPermissionsToRole(
    roleId: string,
    data: BulkAssignRolePermissionsDto
  ): Promise<any> {
    return apiClient.post<any>(
      `/api/v1/roles/${roleId}/permissions/bulk`,
      data
    );
  }

  // Remove permission from role
  async removePermissionFromRole(
    roleId: string,
    permissionId: string
  ): Promise<void> {
    await apiClient.delete(
      `/api/v1/roles/${roleId}/permissions/${permissionId}`
    );
  }

  // Create role hierarchy
  async createRoleHierarchy(
    roleId: string,
    data: CreateRoleHierarchyDto
  ): Promise<RoleHierarchy> {
    return apiClient.post<RoleHierarchy>(
      `/api/v1/roles/${roleId}/hierarchy`,
      data
    );
  }

  // Get role hierarchy
  async getRoleHierarchy(roleId: string): Promise<any> {
    return apiClient.get<any>(`/api/v1/roles/${roleId}/hierarchy`);
  }

  // Delete role hierarchy
  async deleteRoleHierarchy(
    roleId: string,
    parentRoleId: string
  ): Promise<void> {
    await apiClient.delete(
      `/api/v1/roles/${roleId}/hierarchy/${parentRoleId}`
    );
  }

  // Get all role templates
  async getRoleTemplates(params?: QueryParams): Promise<PaginatedResponse<RoleTemplate>> {
    return apiClient.get<PaginatedResponse<RoleTemplate>>('/api/v1/roles/templates', { params });
  }

  // Get role template by ID
  async getRoleTemplateById(id: string): Promise<RoleTemplate> {
    return apiClient.get<RoleTemplate>(`/api/v1/roles/templates/${id}`);
  }

  // Create role template
  async createRoleTemplate(data: CreateRoleTemplateDto): Promise<RoleTemplate> {
    return apiClient.post<RoleTemplate>('/api/v1/roles/templates', data);
  }

  // Delete role template
  async deleteRoleTemplate(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/roles/templates/${id}`);
  }

  // Apply role template
  async applyRoleTemplate(data: ApplyRoleTemplateDto): Promise<any> {
    return apiClient.post<any>(
      '/api/v1/roles/templates/apply',
      data
    );
  }

  // Get users assigned to a role
  async getRoleUsers(roleId: string, params?: QueryParams): Promise<PaginatedResponse<RoleUser>> {
    return apiClient.get<PaginatedResponse<RoleUser>>(`/api/v1/roles/${roleId}/users`, { params });
  }

  // Get modules accessible by a role
  async getRoleModules(roleId: string): Promise<any> {
    return apiClient.get<any>(`/api/v1/roles/${roleId}/modules`);
  }
}

export const rolesService = new RolesService();
