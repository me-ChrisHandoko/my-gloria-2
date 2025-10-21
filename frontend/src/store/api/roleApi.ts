import { apiSlice } from './apiSliceWithHook';
import { Role, Permission, PaginatedResponse, QueryParams } from '@/types';

// Role and Permission API with RBAC support
export const roleApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ===== ROLE QUERIES =====

    // Get roles
    getRoles: builder.query<PaginatedResponse<Role>, QueryParams & {
      organizationId?: string;
    }>({
      query: (params = {}) => ({
        url: '/roles',
        params: {
          page: params.page || 1,
          limit: params.limit || 10,
          search: params.search || '',
          sortBy: params.sortBy || 'name',
          sortOrder: params.sortOrder || 'asc',
          organizationId: params.organizationId,
          ...params
        },
      }),
      providesTags: (result) =>
        result && Array.isArray(result.data)
          ? [
              ...result.data.map(({ id }) => ({ type: 'Role' as const, id })),
              { type: 'Role', id: 'LIST' },
            ]
          : [{ type: 'Role', id: 'LIST' }],
      keepUnusedDataFor: 300,
    }),

    // Get single role
    getRoleById: builder.query<Role, string>({
      query: (id) => `/roles/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Role', id }],
    }),

    // Get role permissions
    getRolePermissions: builder.query<Permission[], string>({
      query: (roleId) => `/roles/${roleId}/permissions`,
      providesTags: (_result, _error, roleId) => [
        { type: 'Role', id: `${roleId}-permissions` },
        'Permission'
      ],
    }),

    // Get user roles
    getUserRoles: builder.query<Role[], string>({
      query: (userId) => `/users/${userId}/roles`,
      providesTags: (_result, _error, userId) => [
        { type: 'Role', id: `user-${userId}` },
        'User'
      ],
    }),

    // ===== PERMISSION QUERIES =====

    // Get all permissions
    getPermissions: builder.query<PaginatedResponse<Permission>, QueryParams>({
      query: (params = {}) => ({
        url: '/permissions',
        params: {
          page: params.page || 1,
          limit: params.limit || 50,
          search: params.search || '',
          sortBy: params.sortBy || 'resource',
          sortOrder: params.sortOrder || 'asc',
          ...params
        },
      }),
      providesTags: (result) =>
        result && Array.isArray(result.data)
          ? [
              ...result.data.map(({ id }) => ({ type: 'Permission' as const, id })),
              { type: 'Permission', id: 'LIST' },
            ]
          : [{ type: 'Permission', id: 'LIST' }],
      keepUnusedDataFor: 600, // Cache longer as permissions don't change often
    }),

    // Get permission by ID
    getPermissionById: builder.query<Permission, string>({
      query: (id) => `/permissions/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Permission', id }],
    }),

    // Get permissions by resource
    getPermissionsByResource: builder.query<Permission[], string>({
      query: (resource) => `/permissions/resource/${resource}`,
      providesTags: (_result, _error, resource) => [
        { type: 'Permission', id: `resource-${resource}` }
      ],
    }),

    // Check user permission
    checkUserPermission: builder.query<
      { hasPermission: boolean },
      { userId: string; permission: string }
    >({
      query: ({ userId, permission }) => ({
        url: `/users/${userId}/check-permission`,
        params: { permission },
      }),
      providesTags: (_result, _error, { userId, permission }) => [
        { type: 'Permission', id: `check-${userId}-${permission}` }
      ],
    }),

    // ===== ROLE MUTATIONS =====

    // Create role
    createRole: builder.mutation<Role, Partial<Role>>({
      query: (role) => ({
        url: '/roles',
        method: 'POST',
        body: role,
      }),
      invalidatesTags: [{ type: 'Role', id: 'LIST' }],
    }),

    // Update role
    updateRole: builder.mutation<Role, { id: string; data: Partial<Role> }>({
      query: ({ id, data }) => ({
        url: `/roles/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Role', id },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    // Delete role
    deleteRole: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/roles/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Role', id },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    // Assign permissions to role
    assignPermissionsToRole: builder.mutation<
      Role,
      { roleId: string; permissionIds: string[] }
    >({
      query: ({ roleId, permissionIds }) => ({
        url: `/roles/${roleId}/permissions`,
        method: 'PUT',
        body: { permissionIds },
      }),
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: 'Role', id: roleId },
        { type: 'Role', id: `${roleId}-permissions` },
      ],
    }),

    // Assign role to user
    assignRoleToUser: builder.mutation<
      { success: boolean },
      { userId: string; roleId: string }
    >({
      query: ({ userId, roleId }) => ({
        url: `/users/${userId}/roles`,
        method: 'POST',
        body: { roleId },
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'Role', id: `user-${userId}` },
        'User'
      ],
    }),

    // Remove role from user
    removeRoleFromUser: builder.mutation<
      { success: boolean },
      { userId: string; roleId: string }
    >({
      query: ({ userId, roleId }) => ({
        url: `/users/${userId}/roles/${roleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: 'Role', id: `user-${userId}` },
        'User'
      ],
    }),

    // Clone role
    cloneRole: builder.mutation<
      Role,
      { id: string; newName: string; organizationId?: string }
    >({
      query: ({ id, newName, organizationId }) => ({
        url: `/roles/${id}/clone`,
        method: 'POST',
        body: { newName, organizationId },
      }),
      invalidatesTags: [{ type: 'Role', id: 'LIST' }],
    }),

    // ===== PERMISSION MUTATIONS =====

    // Create permission
    createPermission: builder.mutation<Permission, Partial<Permission>>({
      query: (permission) => ({
        url: '/permissions',
        method: 'POST',
        body: permission,
      }),
      invalidatesTags: [{ type: 'Permission', id: 'LIST' }],
    }),

    // Update permission
    updatePermission: builder.mutation<
      Permission,
      { id: string; data: Partial<Permission> }
    >({
      query: ({ id, data }) => ({
        url: `/permissions/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Permission', id },
        { type: 'Permission', id: 'LIST' },
      ],
    }),

    // Delete permission
    deletePermission: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/permissions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Permission', id },
        { type: 'Permission', id: 'LIST' },
      ],
    }),

    // Bulk assign permissions
    bulkAssignPermissions: builder.mutation<
      { success: boolean; assigned: number },
      { userIds: string[]; permissionIds: string[] }
    >({
      query: ({ userIds, permissionIds }) => ({
        url: '/permissions/bulk-assign',
        method: 'POST',
        body: { userIds, permissionIds },
      }),
      invalidatesTags: ['User', 'Permission'],
    }),
  }),
  overrideExisting: false,
});

// Export hooks
export const {
  // Role hooks
  useGetRolesQuery,
  useLazyGetRolesQuery,
  useGetRoleByIdQuery,
  useGetRolePermissionsQuery,
  useGetUserRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useAssignPermissionsToRoleMutation,
  useAssignRoleToUserMutation,
  useRemoveRoleFromUserMutation,
  useCloneRoleMutation,
  // Permission hooks
  useGetPermissionsQuery,
  useLazyGetPermissionsQuery,
  useGetPermissionByIdQuery,
  useGetPermissionsByResourceQuery,
  useCheckUserPermissionQuery,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
  useBulkAssignPermissionsMutation,
} = roleApi;

// Export endpoints
export const { endpoints: roleEndpoints } = roleApi;