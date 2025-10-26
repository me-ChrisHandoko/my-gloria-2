import apiClient from '../client';
import type { PaginatedResponse, QueryParams } from '../types';

// Re-export from module-access.service for consistency
export { ModuleCategory, type Module } from './module-access.service';
import { ModuleCategory, type Module } from './module-access.service';

// ==========================================
// DTOs for Module CRUD Operations
// ==========================================

export interface CreateModuleDto {
  code: string; // Unique module code (1-50 chars)
  name: string; // Module name (1-255 chars)
  category: ModuleCategory;
  description?: string;
  icon?: string; // Icon name or path
  path?: string; // Frontend route path
  parentId?: string; // Parent module ID for hierarchy
  sortOrder?: number; // Display sort order (default: 0)
  isActive?: boolean; // Is module active (default: true)
  isVisible?: boolean; // Is module visible in UI (default: true)
}

export interface UpdateModuleDto {
  code?: string;
  name?: string;
  category?: ModuleCategory;
  description?: string;
  icon?: string;
  path?: string;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
  isVisible?: boolean;
}

export interface DeleteModuleDto {
  reason: string; // Required: deletion reason (1-500 chars)
}

export interface MoveModuleDto {
  newParentId?: string | null; // New parent module ID (null for root level)
}

// ==========================================
// Extended Types
// ==========================================

export interface ModuleTreeNode extends Module {
  children?: ModuleTreeNode[];
  level?: number;
  hasChildren?: boolean;
}

export interface ModuleWithChildren extends Module {
  children?: Module[];
}

export interface ModuleChangeHistory {
  id: string;
  moduleId: string;
  action: string;
  changes: Record<string, any>;
  changedBy: string;
  changedAt: string;
  version: number;
}

// ==========================================
// Query Parameters
// ==========================================

export interface QueryModulesParams extends QueryParams {
  search?: string; // Search term (searches name, code, description)
  category?: ModuleCategory; // Filter by category
  isActive?: boolean; // Filter by active status
  isVisible?: boolean; // Filter by visibility status
  parentId?: string | 'null'; // Filter by parent ID (use "null" for root modules)
}

// ==========================================
// Module Service Class
// ==========================================

class ModulesService {
  private readonly baseUrl = '/modules';

  /**
   * Get paginated list of modules
   */
  async getModules(params?: QueryModulesParams): Promise<PaginatedResponse<Module>> {
    const queryString = apiClient.buildQueryString(params);
    return apiClient.get<PaginatedResponse<Module>>(`${this.baseUrl}${queryString}`);
  }

  /**
   * Get full module tree (hierarchical structure)
   */
  async getModuleTree(): Promise<ModuleTreeNode[]> {
    return apiClient.get<ModuleTreeNode[]>(`${this.baseUrl}/tree`);
  }

  /**
   * Get module by code
   */
  async getModuleByCode(code: string): Promise<Module> {
    return apiClient.get<Module>(`${this.baseUrl}/code/${code}`);
  }

  /**
   * Get module by ID
   */
  async getModuleById(id: string): Promise<Module> {
    return apiClient.get<Module>(`${this.baseUrl}/${id}`);
  }

  /**
   * Get module children
   */
  async getModuleChildren(id: string): Promise<Module[]> {
    return apiClient.get<Module[]>(`${this.baseUrl}/${id}/children`);
  }

  /**
   * Get module ancestors (parent chain)
   */
  async getModuleAncestors(id: string): Promise<Module[]> {
    return apiClient.get<Module[]>(`${this.baseUrl}/${id}/ancestors`);
  }

  /**
   * Get module change history
   */
  async getModuleHistory(id: string): Promise<ModuleChangeHistory[]> {
    return apiClient.get<ModuleChangeHistory[]>(`${this.baseUrl}/${id}/history`);
  }

  /**
   * Create new module
   */
  async createModule(data: CreateModuleDto): Promise<Module> {
    return apiClient.post<Module>(this.baseUrl, data);
  }

  /**
   * Update module
   */
  async updateModule(id: string, data: UpdateModuleDto): Promise<Module> {
    return apiClient.patch<Module>(`${this.baseUrl}/${id}`, data);
  }

  /**
   * Move module to new parent
   */
  async moveModule(id: string, newParentId: string | null): Promise<Module> {
    return apiClient.patch<Module>(`${this.baseUrl}/${id}/move`, {
      newParentId,
    });
  }

  /**
   * Soft delete module
   */
  async deleteModule(id: string, reason: string): Promise<Module> {
    return apiClient.delete<Module>(`${this.baseUrl}/${id}`, {
      data: { reason },
    });
  }

  /**
   * Get active modules only
   */
  async getActiveModules(params?: QueryParams): Promise<PaginatedResponse<Module>> {
    return this.getModules({
      ...params,
      isActive: true,
      isVisible: true,
    });
  }

  /**
   * Get modules by category
   */
  async getModulesByCategory(
    category: ModuleCategory,
    params?: QueryParams
  ): Promise<PaginatedResponse<Module>> {
    return this.getModules({
      ...params,
      category,
    });
  }

  /**
   * Get root modules (no parent)
   */
  async getRootModules(params?: QueryParams): Promise<PaginatedResponse<Module>> {
    return this.getModules({
      ...params,
      parentId: 'null',
    });
  }

  /**
   * Search modules
   */
  async searchModules(
    searchTerm: string,
    params?: QueryModulesParams
  ): Promise<PaginatedResponse<Module>> {
    return this.getModules({
      ...params,
      search: searchTerm,
    });
  }

  /**
   * Build module tree from flat list (client-side utility)
   */
  buildTree(modules: Module[]): ModuleTreeNode[] {
    const map = new Map<string, ModuleTreeNode>();
    const roots: ModuleTreeNode[] = [];

    // Create map of all modules
    modules.forEach((module) => {
      map.set(module.id, {
        ...module,
        children: [],
        level: 0,
        hasChildren: false,
      });
    });

    // Build tree structure
    modules.forEach((module) => {
      const node = map.get(module.id)!;

      if (!module.parentId) {
        // Root level module
        roots.push(node);
      } else {
        // Child module
        const parent = map.get(module.parentId);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(node);
          parent.hasChildren = true;
          node.level = (parent.level || 0) + 1;
        } else {
          // Parent not found, treat as root
          roots.push(node);
        }
      }
    });

    // Sort children by sortOrder
    const sortChildren = (nodes: ModuleTreeNode[]) => {
      nodes.sort((a, b) => a.sortOrder - b.sortOrder);
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          sortChildren(node.children);
        }
      });
    };

    sortChildren(roots);

    return roots;
  }

  /**
   * Flatten tree to list (client-side utility)
   */
  flattenTree(tree: ModuleTreeNode[]): Module[] {
    const result: Module[] = [];

    const traverse = (nodes: ModuleTreeNode[]) => {
      nodes.forEach((node) => {
        const { children, level, hasChildren, ...module } = node;
        result.push(module as Module);
        if (children && children.length > 0) {
          traverse(children);
        }
      });
    };

    traverse(tree);
    return result;
  }
}

// Export singleton instance
export const modulesService = new ModulesService();
