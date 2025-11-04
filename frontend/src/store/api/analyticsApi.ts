/**
 * Analytics API - RTK Query Endpoints
 * Phase 6: Analytics & Bulk Operations
 *
 * This file implements RTK Query endpoints for permission analytics,
 * bulk operations, and import/export functionality.
 * Uses comprehensive type definitions from @/types/permissions/analytics.types
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 6
 */

import { apiSlice } from './apiSliceWithHook';
import type {
  PermissionUsageStatistics,
  RoleUsageStatistics,
  UserPermissionAudit,
  BulkAssignRolesDto,
  BulkAssignPermissionsDto,
  BulkRevokeRolesDto,
  BulkOperationResult,
  ExportQueryParams,
  PermissionExportData,
  ImportResult,
} from '@/types/permissions/analytics.types';

export const analyticsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ========================================================================
    // Phase 6: ANALYTICS - Statistics and Reporting
    // ========================================================================

    /**
     * Get permission usage statistics
     *
     * Backend: GET /api/v1/permissions/usage-statistics
     *
     * Provides comprehensive statistics about permission usage including:
     * - Total and active permissions
     * - Most/least used permissions
     * - Permissions by category and resource
     *
     * @example
     * ```tsx
     * const { data: permissionStats } = useGetPermissionUsageStatisticsQuery();
     * ```
     */
    getPermissionUsageStatistics: builder.query<
      PermissionUsageStatistics,
      void
    >({
      query: () => '/permissions/usage-statistics',
      providesTags: [{ type: 'Permission', id: 'STATS' }],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    /**
     * Get role usage statistics
     *
     * Backend: GET /api/v1/permissions/roles/usage-statistics
     *
     * Provides comprehensive statistics about role usage including:
     * - Total and active roles
     * - Most/least used roles
     * - Roles by hierarchy level
     * - Average permissions and users per role
     *
     * @example
     * ```tsx
     * const { data: roleStats } = useGetRoleUsageStatisticsQuery();
     * ```
     */
    getRoleUsageStatistics: builder.query<RoleUsageStatistics, void>({
      query: () => '/permissions/roles/usage-statistics',
      providesTags: [{ type: 'Role', id: 'STATS' }],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    /**
     * Get user permission audit
     *
     * Backend: GET /api/v1/permissions/users/permission-audit/:userId
     *
     * Provides comprehensive audit of user's permissions including:
     * - Direct roles and permissions
     * - Inherited permissions from roles
     * - All effective permissions (resolved)
     * - Module accesses
     *
     * @example
     * ```tsx
     * const { data: audit } = useGetUserPermissionAuditQuery('user-id-123');
     * ```
     */
    getUserPermissionAudit: builder.query<UserPermissionAudit, string>({
      query: (userId) => `/permissions/users/permission-audit/${userId}`,
      providesTags: (_result, _error, userId) => [
        { type: 'User', id: userId },
        { type: 'UserRole', id: userId },
        { type: 'UserPermission', id: userId },
      ],
      keepUnusedDataFor: 60, // Cache for 1 minute
    }),

    // ========================================================================
    // Phase 6: BULK OPERATIONS - Mass Assignment and Revocation
    // ========================================================================

    /**
     * Bulk assign roles to multiple users
     *
     * Backend: POST /api/v1/permissions/bulk/assign-roles
     *
     * Assigns multiple roles to multiple users in a single operation.
     * Useful for onboarding, team assignments, or organizational changes.
     *
     * @example
     * ```tsx
     * const [bulkAssignRoles] = useBulkAssignRolesMutation();
     *
     * await bulkAssignRoles({
     *   userIds: ['user-1', 'user-2', 'user-3'],
     *   roleIds: ['role-1', 'role-2'],
     *   assignedBy: 'admin-id',
     *   effectiveFrom: new Date(),
     *   effectiveTo: new Date('2024-12-31')
     * });
     * ```
     */
    bulkAssignRoles: builder.mutation<BulkOperationResult, BulkAssignRolesDto>(
      {
        query: (data) => ({
          url: '/permissions/bulk/assign-roles',
          method: 'POST',
          body: data,
        }),
        invalidatesTags: [
          { type: 'UserRole', id: 'LIST' },
          { type: 'User', id: 'LIST' },
          { type: 'Role', id: 'STATS' },
        ],
      }
    ),

    /**
     * Bulk assign permissions to multiple roles
     *
     * Backend: POST /api/v1/permissions/bulk/assign-permissions
     *
     * Assigns multiple permissions to multiple roles in a single operation.
     * Useful for setting up role templates or applying permission policies.
     *
     * @example
     * ```tsx
     * const [bulkAssignPermissions] = useBulkAssignPermissionsMutation();
     *
     * await bulkAssignPermissions({
     *   roleIds: ['role-1', 'role-2', 'role-3'],
     *   permissionIds: ['perm-1', 'perm-2'],
     *   assignedBy: 'admin-id'
     * });
     * ```
     */
    bulkAssignPermissions: builder.mutation<
      BulkOperationResult,
      BulkAssignPermissionsDto
    >({
      query: (data) => ({
        url: '/permissions/bulk/assign-permissions',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [
        { type: 'RolePermission', id: 'LIST' },
        { type: 'Role', id: 'LIST' },
        { type: 'Permission', id: 'STATS' },
      ],
    }),

    /**
     * Bulk revoke roles from multiple users
     *
     * Backend: POST /api/v1/permissions/bulk/revoke-roles
     *
     * Revokes multiple roles from multiple users in a single operation.
     * Useful for offboarding, team restructuring, or access cleanup.
     *
     * @example
     * ```tsx
     * const [bulkRevokeRoles] = useBulkRevokeRolesMutation();
     *
     * await bulkRevokeRoles({
     *   userIds: ['user-1', 'user-2', 'user-3'],
     *   roleIds: ['role-1', 'role-2']
     * });
     * ```
     */
    bulkRevokeRoles: builder.mutation<BulkOperationResult, BulkRevokeRolesDto>(
      {
        query: (data) => ({
          url: '/permissions/bulk/revoke-roles',
          method: 'POST',
          body: data,
        }),
        invalidatesTags: [
          { type: 'UserRole', id: 'LIST' },
          { type: 'User', id: 'LIST' },
          { type: 'Role', id: 'STATS' },
        ],
      }
    ),

    // ========================================================================
    // Phase 6: IMPORT/EXPORT - Data Backup and Migration
    // ========================================================================

    /**
     * Export permissions data
     *
     * Backend: GET /api/v1/permissions/export
     *
     * Exports permission system data in specified format.
     * Supports JSON, CSV, and Excel formats.
     * Useful for backups, audits, and data migration.
     *
     * @example
     * ```tsx
     * const { data: exportData } = useExportPermissionsQuery({
     *   format: 'json',
     *   includeRoles: true,
     *   includePermissions: true,
     *   includeUserRoles: true,
     *   includeUserPermissions: true,
     *   includeModuleAccess: true,
     *   includeHierarchy: true
     * });
     * ```
     */
    exportPermissions: builder.query<
      PermissionExportData,
      ExportQueryParams | void
    >({
      query: (params) => {
        const queryParams: Record<string, any> = {};

        if (params) {
          if (params.format) {
            queryParams.format = params.format;
          }
          if (params.includeRoles !== undefined) {
            queryParams.includeRoles = params.includeRoles;
          }
          if (params.includePermissions !== undefined) {
            queryParams.includePermissions = params.includePermissions;
          }
          if (params.includeUserRoles !== undefined) {
            queryParams.includeUserRoles = params.includeUserRoles;
          }
          if (params.includeUserPermissions !== undefined) {
            queryParams.includeUserPermissions = params.includeUserPermissions;
          }
          if (params.includeModuleAccess !== undefined) {
            queryParams.includeModuleAccess = params.includeModuleAccess;
          }
          if (params.includeHierarchy !== undefined) {
            queryParams.includeHierarchy = params.includeHierarchy;
          }
          if (params.dateFrom) {
            queryParams.dateFrom = params.dateFrom;
          }
          if (params.dateTo) {
            queryParams.dateTo = params.dateTo;
          }
        }

        return {
          url: '/permissions/export',
          params: queryParams,
        };
      },
      providesTags: ['Permission', 'Role', 'UserRole', 'UserPermission'],
      keepUnusedDataFor: 0, // Don't cache export data
    }),

    /**
     * Import permissions data
     *
     * Backend: POST /api/v1/permissions/import
     *
     * Imports permission system data from uploaded file.
     * Validates data before import and provides detailed results.
     * Useful for data migration, restoring backups, or bulk updates.
     *
     * @example
     * ```tsx
     * const [importPermissions] = useImportPermissionsMutation();
     *
     * const formData = new FormData();
     * formData.append('file', fileInput.files[0]);
     *
     * await importPermissions(formData);
     * ```
     */
    importPermissions: builder.mutation<ImportResult, FormData>({
      query: (data) => ({
        url: '/permissions/import',
        method: 'POST',
        body: data,
        // Don't set Content-Type, let browser set it with boundary for FormData
      }),
      invalidatesTags: [
        'Permission',
        'Role',
        'RolePermission',
        'UserRole',
        'UserPermission',
        { type: 'Permission', id: 'STATS' },
        { type: 'Role', id: 'STATS' },
      ],
    }),
  }),
  overrideExisting: false,
});

// ============================================================================
// Export Auto-Generated RTK Query Hooks
// ============================================================================

/**
 * Phase 6: Analytics & Bulk Operations Hooks
 *
 * Query Hooks:
 * - useGetPermissionUsageStatisticsQuery: Fetch permission usage statistics
 * - useGetRoleUsageStatisticsQuery: Fetch role usage statistics
 * - useGetUserPermissionAuditQuery: Fetch comprehensive user permission audit
 * - useExportPermissionsQuery: Export permissions data in various formats
 * - useLazyGetPermissionUsageStatisticsQuery: Manually trigger permission stats fetch
 * - useLazyGetRoleUsageStatisticsQuery: Manually trigger role stats fetch
 * - useLazyGetUserPermissionAuditQuery: Manually trigger user audit fetch
 * - useLazyExportPermissionsQuery: Manually trigger export
 *
 * Mutation Hooks:
 * - useBulkAssignRolesMutation: Bulk assign roles to multiple users
 * - useBulkAssignPermissionsMutation: Bulk assign permissions to multiple roles
 * - useBulkRevokeRolesMutation: Bulk revoke roles from multiple users
 * - useImportPermissionsMutation: Import permissions data from file
 *
 * All hooks are auto-generated by RTK Query with:
 * - Automatic caching and cache invalidation
 * - Loading and error states
 * - Request deduplication
 * - Optimistic updates support
 * - Extended cache for analytics (5 minutes)
 */
export const {
  // Analytics Query hooks
  useGetPermissionUsageStatisticsQuery,
  useLazyGetPermissionUsageStatisticsQuery,
  useGetRoleUsageStatisticsQuery,
  useLazyGetRoleUsageStatisticsQuery,
  useGetUserPermissionAuditQuery,
  useLazyGetUserPermissionAuditQuery,

  // Import/Export hooks
  useExportPermissionsQuery,
  useLazyExportPermissionsQuery,
  useImportPermissionsMutation,

  // Bulk Operations Mutation hooks
  useBulkAssignRolesMutation,
  useBulkAssignPermissionsMutation,
  useBulkRevokeRolesMutation,
} = analyticsApi;

// Export endpoints for programmatic use
export const { endpoints: analyticsEndpoints } = analyticsApi;
