import apiClient from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { PaginatedResponse, QueryParams } from '../types';
import type { Department as BaseDepartment } from '@/types';

// Extended Department type with relations
export interface Department extends BaseDepartment {
  school?: {
    id: string;
    name: string;
    code: string;
  };
  parent?: {
    id: string;
    name: string;
    code: string;
  };
  head?: {
    id: string;
    name: string;
    email: string;
  };
  positionCount?: number;
  userCount?: number;
  childDepartmentCount?: number;
}

export interface DepartmentHierarchy {
  id: string;
  name: string;
  code: string;
  level: number;
  children: DepartmentHierarchy[];
}

export interface CreateDepartmentDto {
  name: string;
  code: string;
  schoolId?: string;
  parentId?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateDepartmentDto {
  name?: string;
  code?: string;
  parentId?: string;
  description?: string;
  isActive?: boolean;
}

export interface QueryDepartmentParams extends QueryParams {
  name?: string;
  code?: string;
  schoolId?: string;
  parentId?: string;
  isActive?: boolean;
  includeSchool?: boolean;
  includeParent?: boolean;
}

export interface DepartmentUser {
  id: string;
  userId: string;
  departmentId: string;
  positionId: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  position?: {
    id: string;
    name: string;
    code: string;
  };
}

// Department service class
class DepartmentService {
  private readonly baseUrl = '/organizations/departments';

  /**
   * Get paginated list of departments
   */
  async getDepartments(params?: QueryDepartmentParams): Promise<PaginatedResponse<Department>> {
    const queryString = apiClient.buildQueryString(params);
    return apiClient.get<PaginatedResponse<Department>>(`${this.baseUrl}${queryString}`);
  }

  /**
   * Get department by ID
   */
  async getDepartmentById(id: string): Promise<Department> {
    return apiClient.get<Department>(`${this.baseUrl}/${id}`);
  }

  /**
   * Create a new department
   */
  async createDepartment(data: CreateDepartmentDto): Promise<Department> {
    return apiClient.post<Department>(this.baseUrl, data);
  }

  /**
   * Update department by ID
   */
  async updateDepartment(id: string, data: UpdateDepartmentDto): Promise<Department> {
    return apiClient.patch<Department>(`${this.baseUrl}/${id}`, data);
  }

  /**
   * Delete department by ID (soft delete)
   */
  async deleteDepartment(id: string): Promise<Department> {
    return apiClient.delete<Department>(`${this.baseUrl}/${id}`);
  }

  /**
   * Get department hierarchy for a school
   */
  async getDepartmentHierarchy(schoolId: string): Promise<DepartmentHierarchy[]> {
    return apiClient.get<DepartmentHierarchy[]>(`${this.baseUrl}/hierarchy/${schoolId}`);
  }

  /**
   * Get department users
   */
  async getDepartmentUsers(departmentId: string): Promise<DepartmentUser[]> {
    return apiClient.get<DepartmentUser[]>(`${this.baseUrl}/${departmentId}/users`);
  }

  /**
   * Get departments by school ID
   */
  async getDepartmentsBySchool(
    schoolId: string,
    params?: QueryParams
  ): Promise<PaginatedResponse<Department>> {
    const queryParams: QueryDepartmentParams = {
      ...params,
      schoolId,
      includeSchool: true,
      includeParent: true,
    };
    return this.getDepartments(queryParams);
  }

  /**
   * Get active departments
   */
  async getActiveDepartments(params?: QueryParams): Promise<PaginatedResponse<Department>> {
    const queryParams: QueryDepartmentParams = {
      ...params,
      isActive: true,
    };
    return this.getDepartments(queryParams);
  }

  /**
   * Search departments by name or code
   */
  async searchDepartments(
    searchTerm: string,
    params?: QueryParams
  ): Promise<PaginatedResponse<Department>> {
    const queryParams: QueryDepartmentParams = {
      ...params,
      name: searchTerm,
    };
    return this.getDepartments(queryParams);
  }

  /**
   * Get department statistics
   */
  async getDepartmentStats(departmentId: string): Promise<{
    totalUsers: number;
    totalPositions: number;
    totalChildDepartments: number;
    activeUsers: number;
  }> {
    return apiClient.get(`${this.baseUrl}/${departmentId}/stats`);
  }

  /**
   * Export departments to file
   */
  async exportDepartments(params?: {
    format?: 'csv' | 'xlsx' | 'json';
    schoolId?: string;
  }): Promise<Blob> {
    // Build query string manually for export params
    const queryParts: string[] = [];
    if (params?.format) queryParts.push(`format=${params.format}`);
    if (params?.schoolId) queryParts.push(`schoolId=${params.schoolId}`);
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return apiClient.downloadFile(`${this.baseUrl}/export${queryString}`);
  }

  /**
   * Import departments from file
   */
  async importDepartments(file: File, schoolId: string): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    return apiClient.uploadFile(`${this.baseUrl}/import`, file, { schoolId });
  }

  /**
   * Check if department code exists
   */
  async checkCodeExists(code: string, schoolId: string): Promise<boolean> {
    try {
      const response = await this.getDepartments({ code, schoolId, limit: 1 });
      return response.data.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get child departments
   */
  async getChildDepartments(parentId: string): Promise<Department[]> {
    const response = await this.getDepartments({ parentId, limit: 100 });
    return response.data;
  }
}

// Export singleton instance
export const departmentService = new DepartmentService();