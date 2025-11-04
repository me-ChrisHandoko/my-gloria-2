/**
 * User Role Type Definitions
 * Phase 3: User Role Management
 *
 * Type definitions for user-role assignment system
 * aligned with backend UserRolesController.
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 3
 */

// ============================================================================
// Core User Role Types
// ============================================================================

/**
 * User-Role assignment entity
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
 * Simplified Role type for user-role context
 */
export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  hierarchyLevel: number;
  isActive: boolean;
  isSystem: boolean;
}

/**
 * Simplified User type for user-role context
 */
export interface User {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
}

// ============================================================================
// DTOs for API Operations
// ============================================================================

/**
 * DTO for assigning a role to a user
 */
export interface AssignUserRoleDto {
  roleId: string;
  assignedBy?: string;
  effectiveFrom?: Date | string;
  effectiveTo?: Date | string;
}

/**
 * DTO for bulk assigning roles to a user
 */
export interface BulkAssignUserRolesDto {
  roleIds: string[];
  assignedBy?: string;
  effectiveFrom?: Date | string;
  effectiveTo?: Date | string;
}

/**
 * Query parameters for fetching user roles
 */
export interface GetUserRolesQueryParams {
  includeExpired?: boolean;
  includeInactive?: boolean;
  effectiveDate?: Date | string;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * User roles list response
 */
export interface UserRolesResponse {
  data: UserRole[];
  total: number;
}

/**
 * Single user role response
 */
export interface UserRoleResponse {
  data: UserRole;
}

/**
 * Bulk operation result for user roles
 */
export interface BulkUserRolesResult {
  success: boolean;
  assigned: number;
  failed: number;
  errors?: Array<{
    roleId: string;
    error: string;
  }>;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * User role with effective status
 */
export interface UserRoleWithStatus extends UserRole {
  isEffective: boolean;
  isExpired: boolean;
  daysUntilExpiry?: number;
}

/**
 * User role statistics
 */
export interface UserRoleStatistics {
  totalAssignments: number;
  activeAssignments: number;
  expiredAssignments: number;
  temporalAssignments: number;
  permanentAssignments: number;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if user role is currently effective
 */
export function isUserRoleEffective(userRole: UserRole): boolean {
  const now = new Date();
  const effectiveFrom = userRole.effectiveFrom ? new Date(userRole.effectiveFrom) : null;
  const effectiveTo = userRole.effectiveTo ? new Date(userRole.effectiveTo) : null;

  if (effectiveFrom && now < effectiveFrom) {
    return false; // Not yet effective
  }

  if (effectiveTo && now > effectiveTo) {
    return false; // Already expired
  }

  return true;
}

/**
 * Type guard to check if object is a valid UserRole
 */
export function isUserRole(obj: any): obj is UserRole {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.roleId === 'string' &&
    obj.assignedAt !== undefined
  );
}
