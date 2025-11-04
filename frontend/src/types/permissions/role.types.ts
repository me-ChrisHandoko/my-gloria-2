/**
 * Role Type Definitions
 * Phase 1: Core Role Management
 *
 * Comprehensive type definitions for the role management system
 * aligned with backend controllers and DTOs.
 */

// ============================================================================
// Core Role Types
// ============================================================================

/**
 * Main Role entity matching backend Role model
 */
export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  hierarchyLevel: number;
  parentId?: string | null;
  isActive: boolean;
  isSystem: boolean;
  organizationId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
}

/**
 * Role with populated relationships
 */
export interface RoleWithRelations extends Role {
  parent?: Role | null;
  children?: Role[];
  permissions?: RolePermission[];
  moduleAccesses?: RoleModuleAccess[];
  userRoles?: UserRole[];
  _count?: {
    children: number;
    permissions: number;
    moduleAccesses: number;
    userRoles: number;
  };
}

// ============================================================================
// DTOs for API Operations
// ============================================================================

/**
 * DTO for creating a new role
 */
export interface CreateRoleDto {
  code: string;
  name: string;
  description?: string;
  hierarchyLevel?: number;
  parentId?: string;
  isActive?: boolean;
  organizationId?: string;
}

/**
 * DTO for updating an existing role
 */
export interface UpdateRoleDto {
  code?: string;
  name?: string;
  description?: string | null;
  hierarchyLevel?: number;
  parentId?: string | null;
  isActive?: boolean;
}

/**
 * Query parameters for fetching roles
 */
export interface GetRolesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isActive?: boolean;
  hierarchyLevel?: number;
  parentId?: string;
  organizationId?: string;
  includeDeleted?: boolean;
}

// ============================================================================
// Role Permission Types (for Phase 2 integration)
// ============================================================================

/**
 * Role-Permission association
 */
export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  grantedAt: Date | string;
  grantedBy?: string | null;

  // Populated relations
  role?: Role;
  permission?: Permission;
}

/**
 * Permission entity (simplified for role context)
 */
export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  resource: string;
  action: string;
  category?: string | null;
  isActive: boolean;
  isSystem: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * DTO for assigning permissions to role
 */
export interface AssignRolePermissionDto {
  permissionId: string;
  grantedBy?: string;
}

/**
 * DTO for bulk assigning permissions to role
 */
export interface BulkAssignRolePermissionsDto {
  permissionIds: string[];
  grantedBy?: string;
}

/**
 * Response for role permissions list
 */
export interface RolePermissionsResponse {
  data: RolePermission[];
  total: number;
}

/**
 * Bulk operation result for role permissions
 */
export interface BulkRolePermissionsResult {
  success: boolean;
  assigned: number;
  failed: number;
  errors?: Array<{
    permissionId: string;
    error: string;
  }>;
}

// ============================================================================
// Role Module Access Types (for Phase 5 integration)
// ============================================================================

/**
 * Role module access list response
 */
export interface RoleModuleAccessResponse {
  data: RoleModuleAccess[];
  total: number;
}

/**
 * Bulk operation result for role module access
 */
export interface BulkRoleModuleAccessResult {
  success: boolean;
  granted: number;
  failed: number;
  errors?: Array<{
    moduleId: string;
    error: string;
  }>;
}

/**
 * Role-Module access association
 */
export interface RoleModuleAccess {
  id: string;
  roleId: string;
  moduleId: string;
  accessLevel: ModuleAccessLevel;
  grantedAt: Date | string;
  grantedBy?: string | null;

  // Populated relations
  role?: Role;
  module?: Module;
}

/**
 * Module access levels
 */
export enum ModuleAccessLevel {
  READ = 'READ',
  WRITE = 'WRITE',
  ADMIN = 'ADMIN',
  FULL = 'FULL',
}

/**
 * Module entity (simplified for role context)
 */
export interface Module {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  parentId?: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * DTO for granting module access to role
 */
export interface GrantRoleModuleAccessDto {
  moduleId: string;
  accessLevel: ModuleAccessLevel;
  grantedBy?: string;
}

/**
 * DTO for bulk granting module access to role
 */
export interface BulkGrantRoleModuleAccessDto {
  moduleIds: string[];
  accessLevel: ModuleAccessLevel;
  grantedBy?: string;
}

// ============================================================================
// Role Hierarchy Types (for Phase 5 integration)
// ============================================================================

/**
 * Role hierarchy relationship (legacy compatibility)
 */
export interface RoleHierarchy {
  id: string;
  roleId: string;
  parentRoleId: string;
  inheritPermissions: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Role hierarchy tree node
 */
export interface RoleHierarchyNode extends Role {
  children: RoleHierarchyNode[];
  level: number;
  path: string[];
}

/**
 * DTO for creating role hierarchy relationship
 */
export interface CreateRoleHierarchyDto {
  childId: string;
  parentId: string;
}

/**
 * Inherited permissions from parent roles
 */
export interface InheritedPermissions {
  roleId: string;
  roleName: string;
  directPermissions: Permission[];
  inheritedPermissions: {
    fromRole: Role;
    permissions: Permission[];
  }[];
  allPermissions: Permission[];
}

// ============================================================================
// User Role Types (for Phase 3 integration)
// ============================================================================

/**
 * User-Role assignment
 */
export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  assignedAt: Date | string;
  assignedBy?: string | null;
  effectiveFrom?: Date | string | null;
  effectiveTo?: Date | string | null;

  // Populated relations
  role?: Role;
  user?: User;
}

/**
 * Simplified User type for role context
 */
export interface User {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
}

/**
 * DTO for assigning role to user
 */
export interface AssignUserRoleDto {
  roleId: string;
  assignedBy?: string;
  effectiveFrom?: Date | string;
  effectiveTo?: Date | string;
}

/**
 * DTO for bulk assigning roles to user
 */
export interface BulkAssignUserRolesDto {
  roleIds: string[];
  assignedBy?: string;
  effectiveFrom?: Date | string;
  effectiveTo?: Date | string;
}

/**
 * DTO for assigning role to user (legacy compatibility)
 */
export interface AssignRoleDto {
  userProfileId: string;
  roleId: string;
  validFrom?: string;
  validUntil?: string;
}

/**
 * DTO for updating user role temporal settings (legacy compatibility)
 */
export interface UpdateUserRoleTemporalDto {
  validFrom?: string;
  validUntil?: string;
}

/**
 * Role template for quick role creation (legacy compatibility)
 */
export interface RoleTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  permissions: string[]; // Array of permission IDs
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string;
}

/**
 * DTO for creating role template (legacy compatibility)
 */
export interface CreateRoleTemplateDto {
  code: string;
  name: string;
  description?: string;
  category: string;
  permissions: string[];
  isActive?: boolean;
}

/**
 * DTO for applying role template (legacy compatibility)
 */
export interface ApplyRoleTemplateDto {
  roleId: string;
  templateId: string;
}

/**
 * User with role information (legacy compatibility)
 */
export interface RoleUser extends UserRole {
  userProfile?: {
    id: string;
    dataKaryawan?: any;
  };
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard paginated response wrapper
 */
export interface PaginatedRolesResponse {
  data: Role[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Single role response
 */
export interface RoleResponse {
  data: Role;
}

/**
 * Role with relations response
 */
export interface RoleWithRelationsResponse {
  data: RoleWithRelations;
}

/**
 * Role hierarchy tree response
 */
export interface RoleHierarchyTreeResponse {
  data: RoleHierarchyNode[];
}

/**
 * Inherited permissions response
 */
export interface InheritedPermissionsResponse {
  data: InheritedPermissions;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Role statistics for analytics
 */
export interface RoleStatistics {
  totalRoles: number;
  activeRoles: number;
  inactiveRoles: number;
  systemRoles: number;
  customRoles: number;
  rolesWithUsers: number;
  averagePermissionsPerRole: number;
}

/**
 * Role usage data for analytics
 */
export interface RoleUsageData {
  roleId: string;
  roleName: string;
  userCount: number;
  permissionCount: number;
  moduleAccessCount: number;
  lastAssignedAt?: Date | string;
}

/**
 * Role validation error
 */
export interface RoleValidationError {
  field: string;
  message: string;
  code: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if role has relations
 */
export function isRoleWithRelations(role: Role | RoleWithRelations): role is RoleWithRelations {
  return 'parent' in role || 'children' in role || 'permissions' in role;
}

/**
 * Type guard to check if object is a valid Role
 */
export function isRole(obj: any): obj is Role {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.code === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.hierarchyLevel === 'number' &&
    typeof obj.isActive === 'boolean' &&
    typeof obj.isSystem === 'boolean'
  );
}
