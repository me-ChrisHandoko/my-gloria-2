import apiClient from '../client';
import type { PaginatedResponse, QueryParams } from '../types';

// Module category enum
export enum ModuleCategory {
  SERVICE = 'SERVICE',
  PERFORMANCE = 'PERFORMANCE',
  QUALITY = 'QUALITY',
  FEEDBACK = 'FEEDBACK',
  TRAINING = 'TRAINING',
  SYSTEM = 'SYSTEM',
}

// Module permissions interface
export interface ModulePermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canShare: boolean;
}

// Module interface
export interface Module {
  id: string;
  code: string;
  name: string;
  category: ModuleCategory;
  description?: string;
  icon?: string;
  path?: string;
  parentId?: string;
  sortOrder: number;
  isActive: boolean;
  isVisible: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// User Module Access interface
export interface UserModuleAccess {
  id: string;
  userProfileId: string;
  moduleId: string;
  permissions: ModulePermissions;
  validFrom: string;
  validUntil?: string;
  grantedBy: string;
  reason?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
  // Relations
  module?: Module;
  userProfile?: {
    id: string;
    nip: string;
    dataKaryawan?: {
      nip: string;
      nama: string;
      email?: string;
    };
  };
  grantedByUser?: {
    id: string;
    nip: string;
    dataKaryawan?: {
      nip: string;
      nama: string;
    };
  };
}

// Grant module access DTO
export interface GrantModuleAccessDto {
  userProfileId: string;
  moduleId: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canShare: boolean;
  validUntil?: string; // ISO date string
  reason?: string;
}

// Update module access DTO
export interface UpdateModuleAccessDto {
  canRead?: boolean;
  canWrite?: boolean;
  canDelete?: boolean;
  canShare?: boolean;
  validUntil?: string;
  reason?: string;
  isActive?: boolean;
}

// Query params for module access
export interface QueryModuleAccessParams extends QueryParams {
  userProfileId?: string;
  moduleId?: string;
  category?: ModuleCategory;
  isActive?: boolean;
  includeModule?: boolean;
  includeUser?: boolean;
  includeGrantedBy?: boolean;
  search?: string; // Search by user name/NIP or module name
}

// Check access response
export interface CheckAccessResponse {
  hasAccess: boolean;
}

// Module Access service class
class ModuleAccessService {
  private readonly baseUrl = '/modules/user-access';

  /**
   * Get paginated list of module access records
   */
  async getModuleAccessList(
    params?: QueryModuleAccessParams
  ): Promise<PaginatedResponse<UserModuleAccess>> {
    const queryString = apiClient.buildQueryString(params);
    return apiClient.get<PaginatedResponse<UserModuleAccess>>(`${this.baseUrl}${queryString}`);
  }

  /**
   * Get user's module access list
   */
  async getUserModuleAccess(userProfileId: string): Promise<UserModuleAccess[]> {
    return apiClient.get<UserModuleAccess[]>(`${this.baseUrl}/user/${userProfileId}`);
  }

  /**
   * Grant module access to user (create/update)
   */
  async grantModuleAccess(data: GrantModuleAccessDto): Promise<UserModuleAccess> {
    return apiClient.post<UserModuleAccess>(`${this.baseUrl}/grant`, data);
  }

  /**
   * Update module access
   */
  async updateModuleAccess(
    userProfileId: string,
    moduleId: string,
    data: UpdateModuleAccessDto
  ): Promise<UserModuleAccess> {
    // Use the grant endpoint with updated data (backend handles upsert)
    const fullData: GrantModuleAccessDto = {
      userProfileId,
      moduleId,
      canRead: data.canRead ?? true,
      canWrite: data.canWrite ?? false,
      canDelete: data.canDelete ?? false,
      canShare: data.canShare ?? false,
      validUntil: data.validUntil,
      reason: data.reason,
    };
    return this.grantModuleAccess(fullData);
  }

  /**
   * Revoke module access (soft delete)
   */
  async revokeModuleAccess(userProfileId: string, moduleId: string): Promise<UserModuleAccess> {
    return this.updateModuleAccess(userProfileId, moduleId, { isActive: false });
  }

  /**
   * Check if user has specific access to module
   */
  async checkModuleAccess(
    userProfileId: string,
    moduleId: string,
    accessType: 'read' | 'write' | 'delete' | 'share'
  ): Promise<CheckAccessResponse> {
    return apiClient.get<CheckAccessResponse>(
      `${this.baseUrl}/check/${userProfileId}/${moduleId}/${accessType}`
    );
  }

  /**
   * Get active modules
   */
  async getActiveModules(params?: QueryParams): Promise<PaginatedResponse<Module>> {
    const queryString = apiClient.buildQueryString({ ...params, isActive: true, isVisible: true });
    return apiClient.get<PaginatedResponse<Module>>(`/modules${queryString}`);
  }

  /**
   * Get modules by category
   */
  async getModulesByCategory(
    category: ModuleCategory,
    params?: QueryParams
  ): Promise<PaginatedResponse<Module>> {
    const queryString = apiClient.buildQueryString({ ...params, category });
    return apiClient.get<PaginatedResponse<Module>>(`/modules${queryString}`);
  }

  /**
   * Search module access by user name/NIP or module name
   */
  async searchModuleAccess(
    searchTerm: string,
    params?: QueryModuleAccessParams
  ): Promise<PaginatedResponse<UserModuleAccess>> {
    return this.getModuleAccessList({
      ...params,
      search: searchTerm,
      includeModule: true,
      includeUser: true,
      includeGrantedBy: true,
    });
  }

  /**
   * Get expiring access (expires within X days)
   */
  async getExpiringAccess(days: number = 30): Promise<UserModuleAccess[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const response = await this.getModuleAccessList({
      isActive: true,
      includeModule: true,
      includeUser: true,
      limit: 100,
    });

    // Filter on client side for expiring access
    return response.data.filter((access) => {
      if (!access.validUntil) return false;
      const expiryDate = new Date(access.validUntil);
      return expiryDate <= futureDate && expiryDate > new Date();
    });
  }

  /**
   * Bulk grant access to multiple users
   */
  async bulkGrantAccess(
    userProfileIds: string[],
    moduleId: string,
    permissions: ModulePermissions,
    validUntil?: string,
    reason?: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const userProfileId of userProfileIds) {
      try {
        await this.grantModuleAccess({
          userProfileId,
          moduleId,
          ...permissions,
          validUntil,
          reason,
        });
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(
          `Failed for user ${userProfileId}: ${error?.message || 'Unknown error'}`
        );
      }
    }

    return results;
  }

  /**
   * Extend access expiry date
   */
  async extendAccess(
    userProfileId: string,
    moduleId: string,
    newValidUntil: string
  ): Promise<UserModuleAccess> {
    // Get current access first
    const currentAccess = await this.getUserModuleAccess(userProfileId);
    const access = currentAccess.find((a) => a.moduleId === moduleId);

    if (!access) {
      throw new Error('Access not found');
    }

    return this.updateModuleAccess(userProfileId, moduleId, {
      validUntil: newValidUntil,
      reason: `Access extended until ${newValidUntil}`,
    });
  }
}

// Export singleton instance
export const moduleAccessService = new ModuleAccessService();
