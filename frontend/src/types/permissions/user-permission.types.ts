/**
 * User Permission Type Definitions
 * Phase 4: User Direct Permissions
 *
 * Type definitions for direct user permission assignment system
 * aligned with backend UserPermissionsController.
 *
 * Supports:
 * - Direct permission grants to users
 * - Resource-specific permissions (resourceType, resourceId)
 * - Temporal permissions (effectiveFrom, effectiveTo)
 * - Permission conditions and priorities
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 4
 */

// ============================================================================
// Core User Permission Types
// ============================================================================

/**
 * User-Permission direct assignment entity
 */
export interface UserPermission {
  id: string;
  userId: string;
  permissionId: string;
  isGranted: boolean;
  resourceType?: string | null;
  resourceId?: string | null;
  conditions?: Record<string, any> | null;
  effectiveFrom?: Date | string | null;
  effectiveTo?: Date | string | null;
  priority: number;
  createdAt: Date | string;
  createdBy: string;

  // Populated relations
  permission?: Permission;
  user?: User;
}

/**
 * Simplified Permission type for user-permission context
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
}

/**
 * Simplified User type for user-permission context
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
 * DTO for granting a permission to a user
 */
export interface GrantUserPermissionDto {
  permissionId: string;
  isGranted?: boolean;
  resourceType?: string;
  resourceId?: string;
  conditions?: Record<string, any>;
  effectiveFrom?: Date | string;
  effectiveTo?: Date | string;
  priority?: number;
}

/**
 * DTO for bulk granting permissions to a user
 */
export interface BulkGrantUserPermissionsDto {
  permissionIds: string[];
  isGranted?: boolean;
  resourceType?: string;
  resourceId?: string;
  conditions?: Record<string, any>;
  effectiveFrom?: Date | string;
  effectiveTo?: Date | string;
  priority?: number;
}

/**
 * Query parameters for fetching user permissions
 */
export interface GetUserPermissionsQueryParams {
  isGranted?: boolean;
  resourceType?: string;
  resourceId?: string;
  includeExpired?: boolean;
  includeDenied?: boolean;
  effectiveDate?: Date | string;
  category?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * User permissions list response
 */
export interface UserPermissionsResponse {
  data: UserPermission[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

/**
 * Single user permission response
 */
export interface UserPermissionResponse {
  data: UserPermission;
}

/**
 * Bulk operation result for user permissions
 */
export interface BulkUserPermissionsResult {
  success: boolean;
  granted: number;
  failed: number;
  errors?: Array<{
    permissionId: string;
    error: string;
  }>;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * User permission with effective status
 */
export interface UserPermissionWithStatus extends UserPermission {
  isEffective: boolean;
  isExpired: boolean;
  daysUntilExpiry?: number;
}

/**
 * Resource-specific permission grouping
 */
export interface ResourcePermissions {
  resourceType: string;
  resourceId?: string | null;
  permissions: UserPermission[];
  grantedCount: number;
  deniedCount: number;
}

/**
 * User permission statistics
 */
export interface UserPermissionStatistics {
  totalPermissions: number;
  grantedPermissions: number;
  deniedPermissions: number;
  expiredPermissions: number;
  temporalPermissions: number;
  permanentPermissions: number;
  resourceSpecificPermissions: number;
  globalPermissions: number;
}

/**
 * Permission conflict detection
 */
export interface PermissionConflict {
  permissionId: string;
  permissionCode: string;
  conflictType: 'GRANT_DENY' | 'DUPLICATE' | 'PRIORITY';
  existingPermission: UserPermission;
  newPermission: Partial<UserPermission>;
  resolution: 'SKIP' | 'OVERRIDE' | 'MERGE';
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if user permission is currently effective
 */
export function isUserPermissionEffective(userPermission: UserPermission): boolean {
  // Check if denied
  if (!userPermission.isGranted) {
    return false;
  }

  // Check temporal validity
  const now = new Date();
  const effectiveFrom = userPermission.effectiveFrom
    ? new Date(userPermission.effectiveFrom)
    : null;
  const effectiveTo = userPermission.effectiveTo
    ? new Date(userPermission.effectiveTo)
    : null;

  if (effectiveFrom && now < effectiveFrom) {
    return false; // Not yet effective
  }

  if (effectiveTo && now > effectiveTo) {
    return false; // Already expired
  }

  return true;
}

/**
 * Type guard to check if permission is resource-specific
 */
export function isResourceSpecificPermission(
  userPermission: UserPermission
): boolean {
  return !!(userPermission.resourceType && userPermission.resourceId);
}

/**
 * Type guard to check if permission is global (not resource-specific)
 */
export function isGlobalPermission(userPermission: UserPermission): boolean {
  return !userPermission.resourceType && !userPermission.resourceId;
}

/**
 * Type guard to check if object is a valid UserPermission
 */
export function isUserPermission(obj: any): obj is UserPermission {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.permissionId === 'string' &&
    typeof obj.isGranted === 'boolean' &&
    typeof obj.priority === 'number'
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Compare two user permissions by priority (higher priority first)
 */
export function compareByPriority(a: UserPermission, b: UserPermission): number {
  return b.priority - a.priority;
}

/**
 * Filter effective permissions from a list
 */
export function filterEffectivePermissions(
  permissions: UserPermission[]
): UserPermission[] {
  return permissions.filter(isUserPermissionEffective);
}

/**
 * Group permissions by resource type
 */
export function groupPermissionsByResource(
  permissions: UserPermission[]
): ResourcePermissions[] {
  const grouped = new Map<string, UserPermission[]>();

  permissions.forEach((perm) => {
    const key = perm.resourceType || 'global';
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(perm);
  });

  return Array.from(grouped.entries()).map(([resourceType, perms]) => ({
    resourceType,
    resourceId: perms[0]?.resourceId,
    permissions: perms,
    grantedCount: perms.filter((p) => p.isGranted).length,
    deniedCount: perms.filter((p) => !p.isGranted).length,
  }));
}
