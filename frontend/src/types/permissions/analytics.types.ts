/**
 * Analytics Type Definitions
 * Phase 6: Analytics & Bulk Operations
 *
 * Type definitions for permission system analytics, statistics,
 * bulk operations, and import/export functionality.
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 6
 */

// ============================================================================
// Core Analytics Types
// ============================================================================

/**
 * Permission usage statistics
 */
export interface PermissionUsageStatistics {
  totalPermissions: number;
  activePermissions: number;
  inactivePermissions: number;
  systemPermissions: number;
  customPermissions: number;
  mostUsedPermissions: PermissionUsage[];
  leastUsedPermissions: PermissionUsage[];
  permissionsByCategory: CategoryStatistics[];
  permissionsByResource: ResourceStatistics[];
}

/**
 * Individual permission usage data
 */
export interface PermissionUsage {
  permissionId: string;
  permissionCode: string;
  permissionName: string;
  usageCount: number;
  assignedToRoles: number;
  assignedToUsers: number;
  lastUsedAt?: Date | string;
}

/**
 * Category-based statistics
 */
export interface CategoryStatistics {
  category: string;
  permissionCount: number;
  usageCount: number;
  percentage: number;
}

/**
 * Resource-based statistics
 */
export interface ResourceStatistics {
  resource: string;
  permissionCount: number;
  usageCount: number;
  percentage: number;
}

/**
 * Role usage statistics
 */
export interface RoleUsageStatistics {
  totalRoles: number;
  activeRoles: number;
  inactiveRoles: number;
  systemRoles: number;
  customRoles: number;
  rolesWithUsers: number;
  rolesWithPermissions: number;
  rolesWithModuleAccess: number;
  averagePermissionsPerRole: number;
  averageUsersPerRole: number;
  mostUsedRoles: RoleUsage[];
  leastUsedRoles: RoleUsage[];
  rolesByHierarchyLevel: HierarchyLevelStatistics[];
}

/**
 * Individual role usage data
 */
export interface RoleUsage {
  roleId: string;
  roleCode: string;
  roleName: string;
  userCount: number;
  permissionCount: number;
  moduleAccessCount: number;
  hierarchyLevel: number;
  lastAssignedAt?: Date | string;
}

/**
 * Hierarchy level statistics
 */
export interface HierarchyLevelStatistics {
  level: number;
  roleCount: number;
  userCount: number;
  percentage: number;
}

/**
 * User permission audit data
 */
export interface UserPermissionAudit {
  userId: string;
  userName: string;
  userEmail: string;
  directRoles: RoleAuditEntry[];
  directPermissions: PermissionAuditEntry[];
  inheritedPermissions: InheritedPermissionAuditEntry[];
  allEffectivePermissions: EffectivePermission[];
  moduleAccesses: ModuleAccessAuditEntry[];
  totalPermissions: number;
  totalRoles: number;
  totalModuleAccesses: number;
  lastUpdatedAt: Date | string;
}

/**
 * Role audit entry
 */
export interface RoleAuditEntry {
  roleId: string;
  roleCode: string;
  roleName: string;
  assignedAt: Date | string;
  assignedBy?: string;
  effectiveFrom?: Date | string;
  effectiveTo?: Date | string;
  isActive: boolean;
  isExpired: boolean;
}

/**
 * Permission audit entry
 */
export interface PermissionAuditEntry {
  permissionId: string;
  permissionCode: string;
  permissionName: string;
  isGranted: boolean;
  source: 'DIRECT' | 'ROLE' | 'INHERITED';
  grantedAt: Date | string;
  grantedBy?: string;
  resourceType?: string;
  resourceId?: string;
  priority: number;
  effectiveFrom?: Date | string;
  effectiveTo?: Date | string;
  isActive: boolean;
  isExpired: boolean;
}

/**
 * Inherited permission audit entry
 */
export interface InheritedPermissionAuditEntry {
  permissionId: string;
  permissionCode: string;
  permissionName: string;
  fromRole: {
    roleId: string;
    roleCode: string;
    roleName: string;
  };
  inheritancePath: string[];
  isActive: boolean;
}

/**
 * Effective permission (resolved from all sources)
 */
export interface EffectivePermission {
  permissionId: string;
  permissionCode: string;
  permissionName: string;
  isGranted: boolean;
  highestPriority: number;
  sources: Array<{
    type: 'DIRECT' | 'ROLE' | 'INHERITED';
    roleId?: string;
    roleName?: string;
  }>;
  resourceType?: string;
  resourceId?: string;
}

/**
 * Module access audit entry
 */
export interface ModuleAccessAuditEntry {
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  accessLevel: 'READ' | 'WRITE' | 'ADMIN' | 'FULL';
  source: 'DIRECT' | 'ROLE';
  grantedAt: Date | string;
  grantedBy?: string;
}

// ============================================================================
// Bulk Operation Types
// ============================================================================

/**
 * DTO for bulk assign roles to users
 */
export interface BulkAssignRolesDto {
  userIds: string[];
  roleIds: string[];
  assignedBy?: string;
  effectiveFrom?: Date | string;
  effectiveTo?: Date | string;
}

/**
 * DTO for bulk assign permissions to roles
 */
export interface BulkAssignPermissionsDto {
  roleIds: string[];
  permissionIds: string[];
  assignedBy?: string;
}

/**
 * DTO for bulk revoke roles from users
 */
export interface BulkRevokeRolesDto {
  userIds: string[];
  roleIds: string[];
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  success: boolean;
  totalRequested: number;
  successful: number;
  failed: number;
  errors?: Array<{
    targetId: string;
    sourceId?: string;
    error: string;
    code?: string;
  }>;
  details?: {
    usersAffected?: number;
    rolesAffected?: number;
    permissionsAffected?: number;
  };
}

// ============================================================================
// Import/Export Types
// ============================================================================

/**
 * Export query parameters
 */
export interface ExportQueryParams {
  format?: 'json' | 'csv' | 'excel';
  includeRoles?: boolean;
  includePermissions?: boolean;
  includeUserRoles?: boolean;
  includeUserPermissions?: boolean;
  includeModuleAccess?: boolean;
  includeHierarchy?: boolean;
  dateFrom?: Date | string;
  dateTo?: Date | string;
}

/**
 * Export data structure
 */
export interface PermissionExportData {
  exportedAt: Date | string;
  exportedBy: string;
  version: string;
  metadata: {
    totalRoles: number;
    totalPermissions: number;
    totalUserRoles: number;
    totalUserPermissions: number;
    totalModuleAccess: number;
  };
  roles?: any[];
  permissions?: any[];
  userRoles?: any[];
  userPermissions?: any[];
  moduleAccess?: any[];
  hierarchy?: any[];
}

/**
 * Import validation result
 */
export interface ImportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    rolesToImport: number;
    permissionsToImport: number;
    userRolesToImport: number;
    userPermissionsToImport: number;
  };
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  importedAt: Date | string;
  importedBy: string;
  summary: {
    rolesImported: number;
    permissionsImported: number;
    userRolesImported: number;
    userPermissionsImported: number;
    totalFailed: number;
  };
  errors?: Array<{
    entity: string;
    entityId?: string;
    error: string;
  }>;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Permission usage statistics response
 */
export interface PermissionUsageStatisticsResponse {
  data: PermissionUsageStatistics;
}

/**
 * Role usage statistics response
 */
export interface RoleUsageStatisticsResponse {
  data: RoleUsageStatistics;
}

/**
 * User permission audit response
 */
export interface UserPermissionAuditResponse {
  data: UserPermissionAudit;
}

/**
 * Bulk operation response
 */
export interface BulkOperationResponse {
  data: BulkOperationResult;
}

/**
 * Export response
 */
export interface ExportResponse {
  data: PermissionExportData;
  downloadUrl?: string;
}

/**
 * Import response
 */
export interface ImportResponse {
  data: ImportResult;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Time range filter for analytics
 */
export interface TimeRangeFilter {
  from: Date | string;
  to: Date | string;
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

/**
 * Analytics aggregation options
 */
export interface AnalyticsAggregationOptions {
  groupBy?: 'category' | 'resource' | 'role' | 'user';
  sortBy?: 'count' | 'name' | 'percentage';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

/**
 * Trend data for time-series analytics
 */
export interface TrendData {
  date: Date | string;
  value: number;
  change?: number;
  changePercentage?: number;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if object is valid BulkOperationResult
 */
export function isBulkOperationResult(obj: any): obj is BulkOperationResult {
  return (
    obj &&
    typeof obj.success === 'boolean' &&
    typeof obj.totalRequested === 'number' &&
    typeof obj.successful === 'number' &&
    typeof obj.failed === 'number'
  );
}

/**
 * Type guard to check if object is valid PermissionUsageStatistics
 */
export function isPermissionUsageStatistics(
  obj: any
): obj is PermissionUsageStatistics {
  return (
    obj &&
    typeof obj.totalPermissions === 'number' &&
    typeof obj.activePermissions === 'number' &&
    Array.isArray(obj.mostUsedPermissions)
  );
}

/**
 * Type guard to check if object is valid RoleUsageStatistics
 */
export function isRoleUsageStatistics(obj: any): obj is RoleUsageStatistics {
  return (
    obj &&
    typeof obj.totalRoles === 'number' &&
    typeof obj.activeRoles === 'number' &&
    Array.isArray(obj.mostUsedRoles)
  );
}
