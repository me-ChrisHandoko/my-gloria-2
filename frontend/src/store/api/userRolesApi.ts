/**
 * User Roles API - RTK Query Endpoints
 * Phase 3: User Role Management
 *
 * This file implements RTK Query endpoints for user-role assignments.
 * Uses comprehensive type definitions from @/types/permissions/user-role.types
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 3
 */

import { apiSlice } from './apiSliceWithHook';
import type {
  UserRole,
  AssignUserRoleDto,
  BulkAssignUserRolesDto,
  BulkUserRolesResult,
  GetUserRolesQueryParams,
} from '@/types/permissions/user-role.types';

export const userRolesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ========================================================================
    // Phase 3: USER ROLES - User Role Assignment Operations
    // ========================================================================

    /**
     * Get all roles assigned to a user
     *
     * Backend: GET /api/v1/permissions/users/:userId/roles
     *
     * @example
     * ```tsx
     * const { data: userRoles, isLoading } = useGetUserRolesQuery({
     *   userId: 'user-id-123',
     *   includeExpired: false
     * });
     * ```
     */
    getUserRoles: builder.query<
      UserRole[],
      { userId: string } & GetUserRolesQueryParams
    >({
      query: ({ userId, ...params }) => {
        const queryParams: Record<string, any> = {};

        // Only add optional parameters if they have values
        if (params.includeExpired !== undefined) {
          queryParams.includeExpired = params.includeExpired;
        }
        if (params.includeInactive !== undefined) {
          queryParams.includeInactive = params.includeInactive;
        }
        if (params.effectiveDate) {
          queryParams.effectiveDate = params.effectiveDate;
        }

        return {
          url: `/permissions/users/${userId}/roles`,
          params: queryParams,
        };
      },
      providesTags: (_result, _error, { userId }) => [
        { type: 'UserRole', id: userId },
      ],
      keepUnusedDataFor: 60,
    }),

    /**
     * Assign a single role to a user
     *
     * Backend: POST /api/v1/permissions/users/:userId/roles
     *
     * @example
     * ```tsx
     * const [assignRole] = useAssignUserRoleMutation();
     *
     * await assignRole({
     *   userId: 'user-id-123',
     *   roleId: 'role-id-456',
     *   assignedBy: 'admin-id',
     *   effectiveFrom: new Date(),
     *   effectiveTo: new Date('2024-12-31')
     * });
     * ```
     */
    assignUserRole: builder.mutation<
      UserRole,
      { userId: string } & AssignUserRoleDto
    >({
      query: ({ userId, ...data }) => ({
        url: `/permissions/users/${userId}/roles`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'UserRole', id: userId },
        { type: 'User', id: userId },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    /**
     * Bulk assign multiple roles to a user
     *
     * Backend: POST /api/v1/permissions/users/:userId/roles/bulk
     *
     * @example
     * ```tsx
     * const [bulkAssignRoles] = useBulkAssignUserRolesMutation();
     *
     * await bulkAssignRoles({
     *   userId: 'user-id-123',
     *   roleIds: ['role-1', 'role-2', 'role-3'],
     *   assignedBy: 'admin-id'
     * });
     * ```
     */
    bulkAssignUserRoles: builder.mutation<
      BulkUserRolesResult,
      { userId: string } & BulkAssignUserRolesDto
    >({
      query: ({ userId, ...data }) => ({
        url: `/permissions/users/${userId}/roles/bulk`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'UserRole', id: userId },
        { type: 'User', id: userId },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    /**
     * Revoke a role from a user
     *
     * Backend: DELETE /api/v1/permissions/users/:userId/roles/:roleId
     *
     * @example
     * ```tsx
     * const [revokeRole] = useRevokeUserRoleMutation();
     *
     * await revokeRole({
     *   userId: 'user-id-123',
     *   roleId: 'role-id-456'
     * });
     * ```
     */
    revokeUserRole: builder.mutation<
      void,
      { userId: string; roleId: string }
    >({
      query: ({ userId, roleId }) => ({
        url: `/permissions/users/${userId}/roles/${roleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'UserRole', id: userId },
        { type: 'User', id: userId },
        { type: 'Role', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

// ============================================================================
// Export Auto-Generated RTK Query Hooks
// ============================================================================

/**
 * Phase 3: User Role Management Hooks
 *
 * Query Hooks:
 * - useGetUserRolesQuery: Fetch all roles assigned to a user with filtering
 * - useLazyGetUserRolesQuery: Manually trigger user roles fetch
 *
 * Mutation Hooks:
 * - useAssignUserRoleMutation: Assign single role to user
 * - useBulkAssignUserRolesMutation: Bulk assign roles to user
 * - useRevokeUserRoleMutation: Revoke role from user
 *
 * All hooks are auto-generated by RTK Query with:
 * - Automatic caching and cache invalidation
 * - Loading and error states
 * - Request deduplication
 * - Optimistic updates support
 * - Temporal role support (effectiveFrom, effectiveTo)
 */
export const {
  // Query hooks
  useGetUserRolesQuery,
  useLazyGetUserRolesQuery,

  // Mutation hooks
  useAssignUserRoleMutation,
  useBulkAssignUserRolesMutation,
  useRevokeUserRoleMutation,
} = userRolesApi;

// Export endpoints for programmatic use
export const { endpoints: userRolesEndpoints } = userRolesApi;
