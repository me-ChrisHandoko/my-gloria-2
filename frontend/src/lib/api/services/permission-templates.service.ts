import apiClient from '../client';
import type { PaginatedResponse, QueryParams } from '../types';

// Permission Template interfaces
export interface PermissionTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  permissions: any; // Json type - array of permission objects
  moduleAccess?: any; // Json type - array of module access objects
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  version: number;
}

export interface CreatePermissionTemplateDto {
  code: string;
  name: string;
  category: string;
  permissions: any;
  moduleAccess?: any;
  description?: string;
}

export interface ApplyTemplateDto {
  templateId: string;
  targetType: string;
  targetId: string;
}

export interface QueryPermissionTemplateParams extends QueryParams {
  category?: string;
  isActive?: boolean;
}

// Permission Template Categories
export const TEMPLATE_CATEGORIES = [
  'ROLE_BASED',
  'POSITION_BASED',
  'DEPARTMENT_BASED',
  'SCHOOL_BASED',
  'CUSTOM',
] as const;

export type TemplateCategory = typeof TEMPLATE_CATEGORIES[number];

// Permission Template service class
class PermissionTemplateService {
  private readonly baseUrl = '/api/v1/permission-templates';

  /**
   * Get paginated list of permission templates
   */
  async getTemplates(params?: QueryPermissionTemplateParams): Promise<PaginatedResponse<PermissionTemplate>> {
    const queryString = apiClient.buildQueryString(params);
    return apiClient.get<PaginatedResponse<PermissionTemplate>>(`${this.baseUrl}${queryString}`);
  }

  /**
   * Get permission template by ID
   */
  async getTemplateById(id: string): Promise<PermissionTemplate> {
    return apiClient.get<PermissionTemplate>(`${this.baseUrl}/${id}`);
  }

  /**
   * Create a new permission template
   */
  async createTemplate(data: CreatePermissionTemplateDto): Promise<PermissionTemplate> {
    return apiClient.post<PermissionTemplate>(this.baseUrl, data);
  }

  /**
   * Apply permission template to a target
   */
  async applyTemplate(data: ApplyTemplateDto): Promise<any> {
    return apiClient.post<any>(`${this.baseUrl}/apply`, data);
  }

  /**
   * Get active templates
   */
  async getActiveTemplates(params?: QueryParams): Promise<PaginatedResponse<PermissionTemplate>> {
    const queryParams: QueryPermissionTemplateParams = {
      ...params,
      isActive: true,
    };
    return this.getTemplates(queryParams);
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(
    category: string,
    params?: QueryParams
  ): Promise<PaginatedResponse<PermissionTemplate>> {
    const queryParams: QueryPermissionTemplateParams = {
      ...params,
      category,
    };
    return this.getTemplates(queryParams);
  }
}

// Export singleton instance
export const permissionTemplateService = new PermissionTemplateService();
