/**
 * User Permissions API - RTK Query Endpoints
 * Phase 4: User Direct Permissions
 *
 * This file implements RTK Query endpoints for direct user permission management.
 * Uses comprehensive type definitions from @/types/permissions/user-permission.types
 *
 * Features:
 * - Direct permission grants to users
 * - Resource-specific permissions (resourceType, resourceId)
 * - Temporal permissions (effectiveFrom, effectiveTo)
 * - Permission conditions and priorities
 * - Advanced filtering capabilities
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 4
 */

import { apiSlice } from './apiSliceWithHook';
import type {
  UserPermission,
  GrantUserPermissionDto,
  BulkGrantUserPermissionsDto,
  BulkUserPermissionsResult,
  GetUserPermissionsQueryParams,
  UserPermissionsResponse,
} from '@/types/permissions/user-permission.types';

export const userPermissionsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ========================================================================
    // Phase 4: USER PERMISSIONS - Direct Permission Management
    // ========================================================================

    /**
     * Get all permissions directly assigned to a user
     *
     * Backend: GET /api/v1/permissions/users/:userId/permissions
     *
     * Supports advanced filtering:
     * - By grant status (isGranted)
     * - By resource type and ID
     * - Include/exclude expired permissions
     * - Include/exclude denied permissions
     * - Filter by effective date
     * - Pagination
     *
     * @example
     * ```tsx
     * // Get all active granted permissions
     * const { data: permissions } = useGetUserPermissionsQuery({
     *   userId: 'user-id-123',
     *   isGranted: true,
     *   includeExpired: false
     * });
     *
     * // Get resource-specific permissions
     * const { data: resourcePerms } = useGetUserPermissionsQuery({
     *   userId: 'user-id-123',
     *   resourceType: 'document',
     *   resourceId: 'doc-456'
     * });
     * ```
     */
    getUserPermissions: builder.query<
      UserPermission[],
      { userId: string } & GetUserPermissionsQueryParams
    >({
      query: ({ userId, ...params }) => {
        const queryParams: Record<string, any> = {};

        // Only add optional parameters if they have values
        if (params.isGranted !== undefined) {
          queryParams.isGranted = params.isGranted;
        }
        if (params.resourceType) {
          queryParams.resourceType = params.resourceType;
        }
        if (params.resourceId) {
          queryParams.resourceId = params.resourceId;
        }
        if (params.includeExpired !== undefined) {
          queryParams.includeExpired = params.includeExpired;
        }
        if (params.includeDenied !== undefined) {
          queryParams.includeDenied = params.includeDenied;
        }
        if (params.effectiveDate) {
          queryParams.effectiveDate = params.effectiveDate;
        }
        if (params.category) {
          queryParams.category = params.category;
        }
        if (params.page) {
          queryParams.page = params.page;
        }
        if (params.limit) {
          queryParams.limit = params.limit;
        }

        return {
          url: `/permissions/users/${userId}/permissions`,
          params: queryParams,
        };
      },
      providesTags: (_result, _error, { userId }) => [
        { type: 'UserPermission', id: userId },
      ],
      keepUnusedDataFor: 60,
    }),

    /**
     * Get a specific permission assigned to a user
     *
     * Backend: GET /api/v1/permissions/users/:userId/permissions/:permissionId
     *
     * @example
     * ```tsx
     * const { data: permission } = useGetUserPermissionQuery({
     *   userId: 'user-id-123',
     *   permissionId: 'perm-id-456'
     * });
     * ```
     */
    getUserPermission: builder.query<
      UserPermission,
      { userId: string; permissionId: string }
    >({
      query: ({ userId, permissionId }) =>
        `/permissions/users/${userId}/permissions/${permissionId}`,
      providesTags: (_result, _error, { userId, permissionId }) => [
        { type: 'UserPermission', id: userId },
        { type: 'UserPermission', id: `${userId}-${permissionId}` },
      ],
    }),

    /**
     * Grant a single permission directly to a user
     *
     * Backend: POST /api/v1/permissions/users/:userId/permissions
     *
     * Supports:
     * - Grant or deny (isGranted)
     * - Resource-specific permissions
     * - Temporal permissions
     * - Conditional permissions
     * - Priority setting
     *
     * @example
     * ```tsx
     * const [grantPermission] = useGrantUserPermissionMutation();
     *
     * // Grant global permission
     * await grantPermission({
     *   userId: 'user-id-123',
     *   permissionId: 'perm-id-456',
     *   isGranted: true,
     *   priority: 10
     * });
     *
     * // Grant resource-specific permission
     * await grantPermission({
     *   userId: 'user-id-123',
     *   permissionId: 'perm-id-456',
     *   resourceType: 'document',
     *   resourceId: 'doc-789',
     *   effectiveFrom: new Date(),
     *   effectiveTo: new Date('2024-12-31')
     * });
     *
     * // Deny permission
     * await grantPermission({
     *   userId: 'user-id-123',
     *   permissionId: 'perm-id-456',
     *   isGranted: false,
     *   priority: 100 // High priority denial
     * });
     * ```
     */
    grantUserPermission: builder.mutation<
      UserPermission,
      { userId: string } & GrantUserPermissionDto
    >({
      query: ({ userId, ...data }) => ({
        url: `/permissions/users/${userId}/permissions`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'UserPermission', id: userId },
        { type: 'User', id: userId },
        { type: 'Permission', id: 'LIST' },
      ],
    }),

    /**
     * Bulk grant multiple permissions to a user
     *
     * Backend: POST /api/v1/permissions/users/:userId/permissions/bulk
     *
     * @example
     * ```tsx
     * const [bulkGrant] = useBulkGrantUserPermissionsMutation();
     *
     * // Grant multiple permissions with same settings
     * await bulkGrant({
     *   userId: 'user-id-123',
     *   permissionIds: ['perm-1', 'perm-2', 'perm-3'],
     *   isGranted: true,
     *   resourceType: 'project',
     *   resourceId: 'proj-456',
     *   priority: 5
     * });
     * ```
     */
    bulkGrantUserPermissions: builder.mutation<
      BulkUserPermissionsResult,
      { userId: string } & BulkGrantUserPermissionsDto
    >({
      query: ({ userId, ...data }) => ({
        url: `/permissions/users/${userId}/permissions/bulk`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'UserPermission', id: userId },
        { type: 'User', id: userId },
        { type: 'Permission', id: 'LIST' },
      ],
    }),

    /**
     * Revoke a permission from a user
     *
     * Backend: DELETE /api/v1/permissions/users/:userId/permissions/:permissionId
     *
     * @example
     * ```tsx
     * const [revokePermission] = useRevokeUserPermissionMutation();
     *
     * await revokePermission({
     *   userId: 'user-id-123',
     *   permissionId: 'perm-id-456'
     * });
     * ```
     */
    revokeUserPermission: builder.mutation<
      void,
      { userId: string; permissionId: string }
    >({
      query: ({ userId, permissionId }) => ({
        url: `/permissions/users/${userId}/permissions/${permissionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { userId, permissionId }) => [
        { type: 'UserPermission', id: userId },
        { type: 'UserPermission', id: `${userId}-${permissionId}` },
        { type: 'User', id: userId },
        { type: 'Permission', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

// ============================================================================
// Export Auto-Generated RTK Query Hooks
// ============================================================================

/**
 * Phase 4: User Direct Permissions Hooks
 *
 * Query Hooks:
 * - useGetUserPermissionsQuery: Fetch user permissions with advanced filtering
 * - useGetUserPermissionQuery: Fetch specific user permission
 * - useLazyGetUserPermissionsQuery: Manually trigger permissions fetch
 * - useLazyGetUserPermissionQuery: Manually trigger single permission fetch
 *
 * Mutation Hooks:
 * - useGrantUserPermissionMutation: Grant/deny single permission to user
 * - useBulkGrantUserPermissionsMutation: Bulk grant permissions to user
 * - useRevokeUserPermissionMutation: Revoke permission from user
 *
 * All hooks are auto-generated by RTK Query with:
 * - Automatic caching and cache invalidation
 * - Loading and error states
 * - Request deduplication
 * - Optimistic updates support
 * - Support for resource-specific permissions
 * - Support for temporal permissions (effectiveFrom, effectiveTo)
 * - Support for permission priorities
 */
export const {
  // Query hooks
  useGetUserPermissionsQuery,
  useGetUserPermissionQuery,
  useLazyGetUserPermissionsQuery,
  useLazyGetUserPermissionQuery,

  // Mutation hooks
  useGrantUserPermissionMutation,
  useBulkGrantUserPermissionsMutation,
  useRevokeUserPermissionMutation,
} = userPermissionsApi;

// Export endpoints for programmatic use
export const { endpoints: userPermissionsEndpoints } = userPermissionsApi;
