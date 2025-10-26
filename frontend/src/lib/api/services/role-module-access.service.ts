import apiClient from '../client';

// Re-export Module type
export { type Module } from './modules.service';

// ==========================================
// Role Module Access Interfaces
// ==========================================

export interface RoleModuleAccess {
  id: string;
  roleId: string;
  moduleId: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canShare: boolean;
  grantedBy: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  // Relations
  role?: any;
  module?: any;
  grantedByUser?: any;
}

// ==========================================
// DTOs
// ==========================================

export interface GrantRoleAccessDto {
  roleId: string;
  moduleId: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canShare: boolean;
  validUntil?: string;
}

export interface CheckRoleAccessResponse {
  hasAccess: boolean;
}

// ==========================================
// Role Module Access Service Class
// ==========================================

class RoleModuleAccessService {
  private readonly baseUrl = '/modules/role-access';

  /**
   * Grant module access to a role
   */
  async grantRoleAccess(data: GrantRoleAccessDto): Promise<RoleModuleAccess> {
    return apiClient.post<RoleModuleAccess>(`${this.baseUrl}/grant`, data);
  }

  /**
   * Get all module access for a role
   */
  async getRoleModuleAccess(roleId: string): Promise<RoleModuleAccess[]> {
    return apiClient.get<RoleModuleAccess[]>(`${this.baseUrl}/role/${roleId}`);
  }

  /**
   * Revoke module access from a role
   */
  async revokeRoleAccess(roleId: string, moduleId: string): Promise<void> {
    return apiClient.delete<void>(`${this.baseUrl}/${roleId}/${moduleId}`);
  }

  /**
   * Check if role has specific access to a module
   */
  async checkRoleAccess(
    roleId: string,
    moduleId: string,
    accessType: 'read' | 'write' | 'delete' | 'share'
  ): Promise<CheckRoleAccessResponse> {
    return apiClient.get<CheckRoleAccessResponse>(
      `${this.baseUrl}/check/${roleId}/${moduleId}/${accessType}`
    );
  }
}

// Export singleton instance
export const roleModuleAccessService = new RoleModuleAccessService();
