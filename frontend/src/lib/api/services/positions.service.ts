import apiClient from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { PaginatedResponse, QueryParams } from '../types';
import type { Position as BasePosition } from '@/types';

// Extended Position type with relations
export interface Position extends BasePosition {
  department?: {
    id: string;
    name: string;
    code?: string;
  };
  school?: {
    id: string;
    name: string;
    code?: string;
  };
  holderCount?: number;
  permissionCount?: number;
}

export interface PositionHolder {
  id: string;
  userId: string;
  positionId: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface CreatePositionDto {
  name: string;
  code: string;
  hierarchyLevel: number;
  departmentId?: string;
  schoolId?: string;
  maxHolders?: number;
  isUnique?: boolean;
  isActive?: boolean;
  // Extended fields (may not be in backend)
  organizationId?: string;
  description?: string;
  level?: number; // Deprecated: use hierarchyLevel instead
}

export interface UpdatePositionDto {
  name?: string;
  hierarchyLevel?: number;
  maxHolders?: number;
  isUnique?: boolean;
  isActive?: boolean;
  // Extended fields
  description?: string;
  level?: number; // Deprecated: use hierarchyLevel instead
}

export interface QueryPositionParams extends QueryParams {
  name?: string;
  code?: string;
  departmentId?: string;
  schoolId?: string;
  organizationId?: string;
  level?: number;
  isActive?: boolean;
  includeDepartment?: boolean;
  includeSchool?: boolean;
}

// Position service class
class PositionService {
  private readonly baseUrl = '/positions';

  /**
   * Get paginated list of positions
   */
  async getPositions(params?: QueryPositionParams): Promise<PaginatedResponse<Position>> {
    const queryString = apiClient.buildQueryString(params);
    return apiClient.get<PaginatedResponse<Position>>(`${this.baseUrl}${queryString}`);
  }

  /**
   * Get position by ID
   */
  async getPositionById(id: string): Promise<Position> {
    return apiClient.get<Position>(`${this.baseUrl}/${id}`);
  }

  /**
   * Create a new position
   */
  async createPosition(data: CreatePositionDto): Promise<Position> {
    return apiClient.post<Position>(this.baseUrl, data);
  }

  /**
   * Update position by ID
   */
  async updatePosition(id: string, data: UpdatePositionDto): Promise<Position> {
    return apiClient.patch<Position>(`${this.baseUrl}/${id}`, data);
  }

  /**
   * Delete position by ID (soft delete)
   */
  async deletePosition(id: string): Promise<Position> {
    return apiClient.delete<Position>(`${this.baseUrl}/${id}`);
  }

  /**
   * Get position holders (users in this position)
   */
  async getPositionHolders(positionId: string): Promise<PositionHolder[]> {
    return apiClient.get<PositionHolder[]>(`${this.baseUrl}/${positionId}/holders`);
  }

  /**
   * Get position permissions
   */
  async getPositionPermissions(positionId: string): Promise<string[]> {
    return apiClient.get<string[]>(`${this.baseUrl}/${positionId}/permissions`);
  }

  /**
   * Update position permissions
   */
  async updatePositionPermissions(
    positionId: string,
    permissions: string[]
  ): Promise<{ success: boolean; permissions: string[] }> {
    return apiClient.put(`${this.baseUrl}/${positionId}/permissions`, { permissions });
  }

  /**
   * Get positions by department ID
   */
  async getPositionsByDepartment(
    departmentId: string,
    params?: QueryParams
  ): Promise<PaginatedResponse<Position>> {
    const queryParams: QueryPositionParams = {
      ...params,
      departmentId,
      includeDepartment: true,
      includeSchool: true,
    };
    return this.getPositions(queryParams);
  }

  /**
   * Get positions by school ID
   */
  async getPositionsBySchool(
    schoolId: string,
    params?: QueryParams
  ): Promise<PaginatedResponse<Position>> {
    const queryParams: QueryPositionParams = {
      ...params,
      schoolId,
      includeDepartment: true,
      includeSchool: true,
    };
    return this.getPositions(queryParams);
  }

  /**
   * Get active positions
   */
  async getActivePositions(params?: QueryParams): Promise<PaginatedResponse<Position>> {
    const queryParams: QueryPositionParams = {
      ...params,
      isActive: true,
    };
    return this.getPositions(queryParams);
  }

  /**
   * Search positions by name or code
   */
  async searchPositions(
    searchTerm: string,
    params?: QueryParams
  ): Promise<PaginatedResponse<Position>> {
    const queryParams: QueryPositionParams = {
      ...params,
      search: searchTerm,
    };
    return this.getPositions(queryParams);
  }

  /**
   * Assign user to position
   */
  async assignUserToPosition(
    positionId: string,
    userId: string
  ): Promise<{ success: boolean }> {
    return apiClient.post(`${this.baseUrl}/${positionId}/assign`, { userId });
  }

  /**
   * Remove user from position
   */
  async removeUserFromPosition(
    positionId: string,
    userId: string
  ): Promise<{ success: boolean }> {
    return apiClient.post(`${this.baseUrl}/${positionId}/remove`, { userId });
  }

  /**
   * Update position level
   */
  async updatePositionLevel(positionId: string, level: number): Promise<Position> {
    return apiClient.patch<Position>(`${this.baseUrl}/${positionId}/level`, { level });
  }

  /**
   * Clone position to another department
   */
  async clonePosition(
    positionId: string,
    newName: string,
    targetDepartmentId?: string
  ): Promise<Position> {
    return apiClient.post<Position>(`${this.baseUrl}/${positionId}/clone`, {
      newName,
      targetDepartmentId,
    });
  }

  /**
   * Bulk update positions
   */
  async bulkUpdatePositions(
    ids: string[],
    data: UpdatePositionDto
  ): Promise<{ success: boolean; updated: number }> {
    return apiClient.patch('/positions/bulk-update', { ids, data });
  }

  /**
   * Check if position code exists
   */
  async checkCodeExists(code: string, departmentId: string): Promise<boolean> {
    try {
      const response = await this.getPositions({ code, departmentId, limit: 1 });
      return response.data.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get position statistics
   */
  async getPositionStats(positionId: string): Promise<{
    totalHolders: number;
    totalPermissions: number;
    activeHolders: number;
  }> {
    return apiClient.get(`${this.baseUrl}/${positionId}/stats`);
  }

  /**
   * Export positions to file
   */
  async exportPositions(params?: {
    format?: 'csv' | 'xlsx' | 'json';
    departmentId?: string;
    schoolId?: string;
  }): Promise<Blob> {
    const queryParts: string[] = [];
    if (params?.format) queryParts.push(`format=${params.format}`);
    if (params?.departmentId) queryParts.push(`departmentId=${params.departmentId}`);
    if (params?.schoolId) queryParts.push(`schoolId=${params.schoolId}`);
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return apiClient.downloadFile(`${this.baseUrl}/export${queryString}`);
  }

  /**
   * Import positions from file
   */
  async importPositions(file: File, departmentId: string): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    return apiClient.uploadFile(`${this.baseUrl}/import`, file, { departmentId });
  }
}

// Export singleton instance
export const positionService = new PositionService();
