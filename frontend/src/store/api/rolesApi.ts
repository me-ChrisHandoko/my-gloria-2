/**
 * Roles API - RTK Query Endpoints
 * Phase 1: Core Role Management
 * Phase 2: Role Permissions Assignment
 * Phase 5: Role Module Access & Hierarchy
 *
 * This file implements RTK Query endpoints for role management and permissions.
 * Uses comprehensive type definitions from @/types/permissions/role.types
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 1, 2 & 5
 */

import { apiSlice } from './apiSliceWithHook';
import type {
  Role,
  CreateRoleDto,
  UpdateRoleDto,
  GetRolesQueryParams,
  PaginatedRolesResponse,
  RolePermission,
  RolePermissionsResponse,
  AssignRolePermissionDto,
  BulkAssignRolePermissionsDto,
  BulkRolePermissionsResult,
  RoleModuleAccess,
  RoleModuleAccessResponse,
  GrantRoleModuleAccessDto,
  BulkGrantRoleModuleAccessDto,
  BulkRoleModuleAccessResult,
  RoleHierarchyNode,
  RoleHierarchyTreeResponse,
  CreateRoleHierarchyDto,
  InheritedPermissions,
  InheritedPermissionsResponse,
} from '@/types/permissions/role.types';

export const rolesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ===== ROLE QUERIES =====

    /**
     * Get paginated list of roles with filtering and sorting
     *
     * Backend: GET /api/v1/permissions/roles (baseUrl already includes /api/v1)
     *
     * @example
     * ```tsx
     * const { data, isLoading } = useGetRolesQuery({
     *   page: 1,
     *   limit: 10,
     *   search: 'admin',
     *   isActive: true
     * });
     * ```
     */
    getRoles: builder.query<
      PaginatedRolesResponse,
      GetRolesQueryParams | void
    >({
      query: (params) => {
        const queryParams: Record<string, any> = {
          page: params?.page || 1,
          limit: params?.limit || 10,
        };

        // Only add optional parameters if they have values
        if (params?.search) queryParams.search = params.search;
        if (params?.sortBy) queryParams.sortBy = params.sortBy;
        if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
        if (params?.isActive !== undefined) queryParams.isActive = params.isActive;
        if (params?.hierarchyLevel !== undefined) queryParams.hierarchyLevel = params.hierarchyLevel;
        if (params?.parentId) queryParams.parentId = params.parentId;
        if (params?.organizationId) queryParams.organizationId = params.organizationId;
        if (params?.includeDeleted) queryParams.includeDeleted = params.includeDeleted;

        return {
          url: '/permissions/roles',
          params: queryParams,
        };
      },
      /**
       * Transform response is handled automatically by baseQueryWithReauth
       * in apiSliceWithHook.ts (lines 108-158)
       *
       * The base query already:
       * - Unwraps { success: true, data: {...} } responses
       * - Handles paginated responses
       * - Extracts data from wrapper
       *
       * No additional transformation needed here.
       */
      providesTags: (result) =>
        result && Array.isArray(result.data)
          ? [
              ...result.data.map(({ id }) => ({ type: 'Role' as const, id })),
              { type: 'Role', id: 'LIST' },
            ]
          : [{ type: 'Role', id: 'LIST' }],
      // Set cache duration to 60 seconds (matches backend Redis TTL)
      keepUnusedDataFor: 60,
    }),

    /**
     * Get single role by ID
     *
     * Backend: GET /api/v1/permissions/roles/:id
     *
     * @example
     * ```tsx
     * const { data: role, isLoading } = useGetRoleByIdQuery('role-id-123');
     * ```
     */
    getRoleById: builder.query<Role, string>({
      query: (id) => `/permissions/roles/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Role', id }],
    }),

    // ========================================================================
    // Phase 1: MUTATIONS - Core CRUD Operations
    // ========================================================================

    /**
     * Create new role
     *
     * Backend: POST /api/v1/permissions/roles
     *
     * @example
     * ```tsx
     * const [createRole, { isLoading }] = useCreateRoleMutation();
     *
     * const handleCreate = async () => {
     *   await createRole({
     *     code: 'MANAGER',
     *     name: 'Manager',
     *     hierarchyLevel: 2
     *   });
     * };
     * ```
     */
    createRole: builder.mutation<Role, CreateRoleDto>({
      query: (data) => ({
        url: '/permissions/roles',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Role', id: 'LIST' }],
    }),

    /**
     * Update existing role
     *
     * Backend: PATCH /api/v1/permissions/roles/:id
     *
     * @example
     * ```tsx
     * const [updateRole] = useUpdateRoleMutation();
     *
     * await updateRole({
     *   id: 'role-id',
     *   data: { name: 'Updated Name' }
     * });
     * ```
     */
    updateRole: builder.mutation<Role, { id: string; data: UpdateRoleDto }>({
      query: ({ id, data }) => ({
        url: `/permissions/roles/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Role', id },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    /**
     * Soft delete role
     *
     * Backend: DELETE /api/v1/permissions/roles/:id
     *
     * @example
     * ```tsx
     * const [deleteRole] = useDeleteRoleMutation();
     *
     * await deleteRole('role-id-123');
     * ```
     */
    deleteRole: builder.mutation<void, string>({
      query: (id) => ({
        url: `/permissions/roles/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Role', id },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    /**
     * Restore soft-deleted role
     *
     * Backend: POST /api/v1/permissions/roles/:id/restore
     *
     * @example
     * ```tsx
     * const [restoreRole] = useRestoreRoleMutation();
     *
     * await restoreRole('role-id-123');
     * ```
     */
    restoreRole: builder.mutation<Role, string>({
      query: (id) => ({
        url: `/permissions/roles/${id}/restore`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Role', id },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    // ========================================================================
    // Phase 2: ROLE PERMISSIONS - Permission Assignment to Roles
    // ========================================================================

    /**
     * Get all permissions assigned to a role
     *
     * Backend: GET /api/v1/permissions/roles/:id/permissions
     *
     * @example
     * ```tsx
     * const { data: permissions, isLoading } = useGetRolePermissionsQuery('role-id-123');
     * ```
     */
    getRolePermissions: builder.query<RolePermission[], string>({
      query: (roleId) => `/permissions/roles/${roleId}/permissions`,
      providesTags: (_result, _error, roleId) => [
        { type: 'RolePermission', id: roleId },
      ],
      keepUnusedDataFor: 60,
    }),

    /**
     * Assign a single permission to a role
     *
     * Backend: POST /api/v1/permissions/roles/:id/permissions
     *
     * @example
     * ```tsx
     * const [assignPermission] = useAssignRolePermissionMutation();
     *
     * await assignPermission({
     *   roleId: 'role-id-123',
     *   permissionId: 'permission-id-456',
     *   grantedBy: 'user-id'
     * });
     * ```
     */
    assignRolePermission: builder.mutation<
      RolePermission,
      { roleId: string } & AssignRolePermissionDto
    >({
      query: ({ roleId, ...data }) => ({
        url: `/permissions/roles/${roleId}/permissions`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: 'RolePermission', id: roleId },
        { type: 'Role', id: roleId },
        { type: 'Permission', id: 'LIST' },
      ],
    }),

    /**
     * Bulk assign multiple permissions to a role
     *
     * Backend: POST /api/v1/permissions/roles/:id/permissions/bulk
     *
     * @example
     * ```tsx
     * const [bulkAssign] = useBulkAssignRolePermissionsMutation();
     *
     * await bulkAssign({
     *   roleId: 'role-id-123',
     *   permissionIds: ['perm-1', 'perm-2', 'perm-3'],
     *   grantedBy: 'user-id'
     * });
     * ```
     */
    bulkAssignRolePermissions: builder.mutation<
      BulkRolePermissionsResult,
      { roleId: string } & BulkAssignRolePermissionsDto
    >({
      query: ({ roleId, ...data }) => ({
        url: `/permissions/roles/${roleId}/permissions/bulk`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: 'RolePermission', id: roleId },
        { type: 'Role', id: roleId },
        { type: 'Permission', id: 'LIST' },
      ],
    }),

    /**
     * Revoke a permission from a role
     *
     * Backend: DELETE /api/v1/permissions/roles/:id/permissions/:permissionId
     *
     * @example
     * ```tsx
     * const [revokePermission] = useRevokeRolePermissionMutation();
     *
     * await revokePermission({
     *   roleId: 'role-id-123',
     *   permissionId: 'permission-id-456'
     * });
     * ```
     */
    revokeRolePermission: builder.mutation<
      void,
      { roleId: string; permissionId: string }
    >({
      query: ({ roleId, permissionId }) => ({
        url: `/permissions/roles/${roleId}/permissions/${permissionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: 'RolePermission', id: roleId },
        { type: 'Role', id: roleId },
        { type: 'Permission', id: 'LIST' },
      ],
    }),

    // ========================================================================
    // Phase 5: ROLE MODULE ACCESS - Module Access Management
    // ========================================================================

    /**
     * Get all module accesses for a role
     *
     * Backend: GET /api/v1/permissions/roles/:id/modules
     *
     * @example
     * ```tsx
     * const { data: moduleAccesses } = useGetRoleModuleAccessesQuery('role-id-123');
     * ```
     */
    getRoleModuleAccesses: builder.query<RoleModuleAccess[], string>({
      query: (roleId) => `/permissions/roles/${roleId}/modules`,
      providesTags: (_result, _error, roleId) => [
        { type: 'Role', id: roleId },
        { type: 'Module', id: 'LIST' },
      ],
      keepUnusedDataFor: 60,
    }),

    /**
     * Grant module access to a role
     *
     * Backend: POST /api/v1/permissions/roles/:id/modules
     *
     * @example
     * ```tsx
     * const [grantModuleAccess] = useGrantRoleModuleAccessMutation();
     *
     * await grantModuleAccess({
     *   roleId: 'role-id-123',
     *   moduleId: 'module-id-456',
     *   accessLevel: ModuleAccessLevel.WRITE,
     *   grantedBy: 'admin-id'
     * });
     * ```
     */
    grantRoleModuleAccess: builder.mutation<
      RoleModuleAccess,
      { roleId: string } & GrantRoleModuleAccessDto
    >({
      query: ({ roleId, ...data }) => ({
        url: `/permissions/roles/${roleId}/modules`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: 'Role', id: roleId },
        { type: 'Module', id: 'LIST' },
      ],
    }),

    /**
     * Bulk grant module access to a role
     *
     * Backend: POST /api/v1/permissions/roles/:id/modules/bulk
     *
     * @example
     * ```tsx
     * const [bulkGrantModuleAccess] = useBulkGrantRoleModuleAccessMutation();
     *
     * await bulkGrantModuleAccess({
     *   roleId: 'role-id-123',
     *   moduleIds: ['module-1', 'module-2', 'module-3'],
     *   accessLevel: ModuleAccessLevel.READ,
     *   grantedBy: 'admin-id'
     * });
     * ```
     */
    bulkGrantRoleModuleAccess: builder.mutation<
      BulkRoleModuleAccessResult,
      { roleId: string } & BulkGrantRoleModuleAccessDto
    >({
      query: ({ roleId, ...data }) => ({
        url: `/permissions/roles/${roleId}/modules/bulk`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: 'Role', id: roleId },
        { type: 'Module', id: 'LIST' },
      ],
    }),

    /**
     * Revoke module access from a role
     *
     * Backend: DELETE /api/v1/permissions/roles/:id/modules/:moduleAccessId
     *
     * @example
     * ```tsx
     * const [revokeModuleAccess] = useRevokeRoleModuleAccessMutation();
     *
     * await revokeModuleAccess({
     *   roleId: 'role-id-123',
     *   moduleAccessId: 'module-access-id-456'
     * });
     * ```
     */
    revokeRoleModuleAccess: builder.mutation<
      void,
      { roleId: string; moduleAccessId: string }
    >({
      query: ({ roleId, moduleAccessId }) => ({
        url: `/permissions/roles/${roleId}/modules/${moduleAccessId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: 'Role', id: roleId },
        { type: 'Module', id: 'LIST' },
      ],
    }),

    // ========================================================================
    // Phase 5: ROLE HIERARCHY - Hierarchy Management
    // ========================================================================

    /**
     * Get role hierarchy tree
     *
     * Backend: GET /api/v1/permissions/roles/:id/hierarchy/tree
     *
     * @example
     * ```tsx
     * const { data: hierarchyTree } = useGetRoleHierarchyTreeQuery('role-id-123');
     * ```
     */
    getRoleHierarchyTree: builder.query<RoleHierarchyNode[], string>({
      query: (roleId) => `/permissions/roles/${roleId}/hierarchy/tree`,
      providesTags: (_result, _error, roleId) => [
        { type: 'Role', id: roleId },
        { type: 'Role', id: 'LIST' },
      ],
      keepUnusedDataFor: 300, // Cache for 5 minutes (hierarchy changes less frequently)
    }),

    /**
     * Get inherited permissions from parent roles
     *
     * Backend: GET /api/v1/permissions/roles/:id/hierarchy/inherited-permissions
     *
     * @example
     * ```tsx
     * const { data: inheritedPerms } = useGetRoleInheritedPermissionsQuery('role-id-123');
     * ```
     */
    getRoleInheritedPermissions: builder.query<InheritedPermissions, string>({
      query: (roleId) => `/permissions/roles/${roleId}/hierarchy/inherited-permissions`,
      providesTags: (_result, _error, roleId) => [
        { type: 'Role', id: roleId },
        { type: 'RolePermission', id: roleId },
      ],
      keepUnusedDataFor: 60,
    }),

    /**
     * Create role hierarchy (set parent role)
     *
     * Backend: POST /api/v1/permissions/roles/:id/hierarchy
     *
     * @example
     * ```tsx
     * const [createHierarchy] = useCreateRoleHierarchyMutation();
     *
     * await createHierarchy({
     *   roleId: 'child-role-id',
     *   parentId: 'parent-role-id'
     * });
     * ```
     */
    createRoleHierarchy: builder.mutation<
      Role,
      { roleId: string; parentId: string }
    >({
      query: ({ roleId, parentId }) => ({
        url: `/permissions/roles/${roleId}/hierarchy`,
        method: 'POST',
        body: { parentId },
      }),
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: 'Role', id: roleId },
        { type: 'Role', id: 'LIST' },
        { type: 'RolePermission', id: roleId },
      ],
    }),

    /**
     * Remove role hierarchy (remove parent)
     *
     * Backend: DELETE /api/v1/permissions/roles/:id/hierarchy
     *
     * @example
     * ```tsx
     * const [removeHierarchy] = useRemoveRoleHierarchyMutation();
     *
     * await removeHierarchy('role-id-123');
     * ```
     */
    removeRoleHierarchy: builder.mutation<void, string>({
      query: (roleId) => ({
        url: `/permissions/roles/${roleId}/hierarchy`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, roleId) => [
        { type: 'Role', id: roleId },
        { type: 'Role', id: 'LIST' },
        { type: 'RolePermission', id: roleId },
      ],
    }),
  }),
  overrideExisting: false,
});

// ============================================================================
// Export Auto-Generated RTK Query Hooks
// ============================================================================

/**
 * Phase 1: Core Role Management Hooks
 * Phase 2: Role Permissions Assignment Hooks
 * Phase 5: Role Module Access & Hierarchy Hooks
 *
 * Query Hooks:
 * - useGetRolesQuery: Fetch paginated list of roles with filtering/sorting
 * - useGetRoleByIdQuery: Fetch single role by ID
 * - useGetRolePermissionsQuery: Fetch all permissions assigned to a role
 * - useGetRoleModuleAccessesQuery: Fetch all module accesses for a role
 * - useGetRoleHierarchyTreeQuery: Fetch role hierarchy tree
 * - useGetRoleInheritedPermissionsQuery: Fetch inherited permissions from parent roles
 * - useLazyGetRolesQuery: Manually trigger roles list fetch
 * - useLazyGetRoleByIdQuery: Manually trigger single role fetch
 * - useLazyGetRolePermissionsQuery: Manually trigger role permissions fetch
 * - useLazyGetRoleModuleAccessesQuery: Manually trigger module accesses fetch
 * - useLazyGetRoleHierarchyTreeQuery: Manually trigger hierarchy tree fetch
 * - useLazyGetRoleInheritedPermissionsQuery: Manually trigger inherited permissions fetch
 *
 * Mutation Hooks:
 * - useCreateRoleMutation: Create new role
 * - useUpdateRoleMutation: Update existing role
 * - useDeleteRoleMutation: Soft delete role (sets deletedAt)
 * - useRestoreRoleMutation: Restore soft-deleted role
 * - useAssignRolePermissionMutation: Assign single permission to role
 * - useBulkAssignRolePermissionsMutation: Bulk assign permissions to role
 * - useRevokeRolePermissionMutation: Revoke permission from role
 * - useGrantRoleModuleAccessMutation: Grant module access to role
 * - useBulkGrantRoleModuleAccessMutation: Bulk grant module access to role
 * - useRevokeRoleModuleAccessMutation: Revoke module access from role
 * - useCreateRoleHierarchyMutation: Create role hierarchy (set parent)
 * - useRemoveRoleHierarchyMutation: Remove role hierarchy (remove parent)
 *
 * All hooks are auto-generated by RTK Query with:
 * - Automatic caching and cache invalidation
 * - Loading and error states
 * - Request deduplication
 * - Optimistic updates support
 */
export const {
  // Phase 1: Query hooks
  useGetRolesQuery,
  useLazyGetRolesQuery,
  useGetRoleByIdQuery,
  useLazyGetRoleByIdQuery,

  // Phase 1: Mutation hooks
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useRestoreRoleMutation,

  // Phase 2: Query hooks
  useGetRolePermissionsQuery,
  useLazyGetRolePermissionsQuery,

  // Phase 2: Mutation hooks
  useAssignRolePermissionMutation,
  useBulkAssignRolePermissionsMutation,
  useRevokeRolePermissionMutation,

  // Phase 5: Module Access Query hooks
  useGetRoleModuleAccessesQuery,
  useLazyGetRoleModuleAccessesQuery,

  // Phase 5: Module Access Mutation hooks
  useGrantRoleModuleAccessMutation,
  useBulkGrantRoleModuleAccessMutation,
  useRevokeRoleModuleAccessMutation,

  // Phase 5: Hierarchy Query hooks
  useGetRoleHierarchyTreeQuery,
  useLazyGetRoleHierarchyTreeQuery,
  useGetRoleInheritedPermissionsQuery,
  useLazyGetRoleInheritedPermissionsQuery,

  // Phase 5: Hierarchy Mutation hooks
  useCreateRoleHierarchyMutation,
  useRemoveRoleHierarchyMutation,
} = rolesApi;

// Export endpoints for programmatic use
export const { endpoints: rolesEndpoints } = rolesApi;
