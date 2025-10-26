import apiClient from '../client';

// Re-export Module type
export { type Module } from './modules.service';

// ==========================================
// Permission Enums (matching Prisma)
// ==========================================

export enum PermissionAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  EXECUTE = 'EXECUTE',
  APPROVE = 'APPROVE',
  MANAGE = 'MANAGE',
}

export enum PermissionScope {
  SELF = 'SELF',
  DEPARTMENT = 'DEPARTMENT',
  ORGANIZATION = 'ORGANIZATION',
  SYSTEM = 'SYSTEM',
}

// ==========================================
// Module Permission Interface
// ==========================================

export interface ModulePermission {
  id: string;
  moduleId: string;
  action: PermissionAction;
  scope: PermissionScope;
  description?: string;
  createdAt: string;
  createdBy: string;
  version: number;
}

// ==========================================
// DTOs
// ==========================================

export interface CreateModulePermissionDto {
  action: PermissionAction;
  scope: PermissionScope;
  description?: string;
}

// ==========================================
// Module Hierarchy Interface
// ==========================================

export interface ModuleHierarchy {
  module: any;
  parents: any[];
  children: any[];
  permissions: ModulePermission[];
}

// ==========================================
// Module Permissions Service Class
// ==========================================

class ModulePermissionsService {
  private readonly baseUrl = '/modules';

  /**
   * Get all permissions for a module
   */
  async getModulePermissions(moduleId: string): Promise<ModulePermission[]> {
    return apiClient.get<ModulePermission[]>(`${this.baseUrl}/${moduleId}/permissions`);
  }

  /**
   * Create a new permission for a module
   */
  async createModulePermission(
    moduleId: string,
    data: CreateModulePermissionDto
  ): Promise<ModulePermission> {
    return apiClient.post<ModulePermission>(
      `${this.baseUrl}/${moduleId}/permissions`,
      data
    );
  }

  /**
   * Delete a module permission
   */
  async deleteModulePermission(
    moduleId: string,
    permissionId: string
  ): Promise<void> {
    return apiClient.delete<void>(
      `${this.baseUrl}/${moduleId}/permissions/${permissionId}`
    );
  }

  /**
   * Get module hierarchy (module with parents, children, and permissions)
   */
  async getModuleHierarchy(moduleId: string): Promise<ModuleHierarchy> {
    return apiClient.get<ModuleHierarchy>(`${this.baseUrl}/${moduleId}/hierarchy`);
  }

  /**
   * Get all available permission actions
   */
  getAvailableActions(): PermissionAction[] {
    return Object.values(PermissionAction);
  }

  /**
   * Get all available permission scopes
   */
  getAvailableScopes(): PermissionScope[] {
    return Object.values(PermissionScope);
  }

  /**
   * Format permission action for display
   */
  formatAction(action: PermissionAction): string {
    const actionLabels: Record<PermissionAction, string> = {
      [PermissionAction.CREATE]: 'Create',
      [PermissionAction.READ]: 'Read',
      [PermissionAction.UPDATE]: 'Update',
      [PermissionAction.DELETE]: 'Delete',
      [PermissionAction.EXECUTE]: 'Execute',
      [PermissionAction.APPROVE]: 'Approve',
      [PermissionAction.MANAGE]: 'Manage',
    };
    return actionLabels[action] || action;
  }

  /**
   * Format permission scope for display
   */
  formatScope(scope: PermissionScope): string {
    const scopeLabels: Record<PermissionScope, string> = {
      [PermissionScope.SELF]: 'Self Only',
      [PermissionScope.DEPARTMENT]: 'Department',
      [PermissionScope.ORGANIZATION]: 'Organization',
      [PermissionScope.SYSTEM]: 'System Wide',
    };
    return scopeLabels[scope] || scope;
  }
}

// Export singleton instance
export const modulePermissionsService = new ModulePermissionsService();
