import { apiSlice } from './apiSliceWithHook';
import type {
  Role,
  CreateRoleDto,
  UpdateRoleDto,
  QueryRoleParams,
  AssignRoleDto,
  UserRole,
  AssignRolePermissionDto,
  BulkAssignRolePermissionsDto,
  CreateRoleHierarchyDto,
  RoleHierarchy,
  CreateRoleTemplateDto,
  ApplyRoleTemplateDto,
} from '@/lib/api/services/roles.service';
import type { PaginatedResponse } from '@/lib/api/types';

export const rolesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ===== ROLE QUERIES =====

    // Get all roles with pagination and filters
    getRoles: builder.query<
      PaginatedResponse<Role>,
      QueryRoleParams | void
    >({
      query: (params = {}) => ({
        url: '/api/v1/roles',
        params: {
          page: params.page || 1,
          limit: params.limit || 10,
          search: params.search,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
          includeInactive: params.includeInactive,
          hierarchyLevel: params.hierarchyLevel,
          isSystemRole: params.isSystemRole,
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Role' as const, id })),
              { type: 'Role', id: 'LIST' },
            ]
          : [{ type: 'Role', id: 'LIST' }],
      keepUnusedDataFor: 300,
    }),

    // Get single role by ID
    getRoleById: builder.query<Role, string>({
      query: (id) => `/api/v1/roles/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Role', id }],
    }),

    // Get role by code
    getRoleByCode: builder.query<Role, string>({
      query: (code) => `/api/v1/roles/code/${code}`,
      providesTags: (_result, _error, code) => [
        { type: 'Role', id: `code-${code}` },
      ],
    }),

    // Get user roles
    getUserRoles: builder.query<Role[], string>({
      query: (userProfileId) => `/api/v1/roles/user/${userProfileId}`,
      providesTags: (_result, _error, userProfileId) => [
        { type: 'Role', id: `user-${userProfileId}` },
      ],
    }),

    // Get role statistics
    getRoleStatistics: builder.query<any, void>({
      query: () => '/api/v1/roles/statistics',
      providesTags: [{ type: 'Role', id: 'STATISTICS' }],
    }),

    // Get role hierarchy
    getRoleHierarchy: builder.query<any, string>({
      query: (roleId) => `/api/v1/roles/${roleId}/hierarchy`,
      providesTags: (_result, _error, roleId) => [
        { type: 'Role', id: `hierarchy-${roleId}` },
      ],
    }),

    // ===== ROLE MUTATIONS =====

    // Create new role
    createRole: builder.mutation<Role, CreateRoleDto>({
      query: (data) => ({
        url: '/api/v1/roles',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Role', id: 'LIST' }],
    }),

    // Update role
    updateRole: builder.mutation<Role, { id: string; data: UpdateRoleDto }>({
      query: ({ id, data }) => ({
        url: `/api/v1/roles/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Role', id },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    // Assign role to user
    assignRole: builder.mutation<UserRole, AssignRoleDto>({
      query: (data) => ({
        url: '/api/v1/roles/assign',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { userProfileId }) => [
        { type: 'Role', id: `user-${userProfileId}` },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    // Remove role from user
    removeRole: builder.mutation<
      void,
      { userProfileId: string; roleId: string }
    >({
      query: ({ userProfileId, roleId }) => ({
        url: `/api/v1/roles/remove/${userProfileId}/${roleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { userProfileId }) => [
        { type: 'Role', id: `user-${userProfileId}` },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    // Assign permission to role
    assignPermissionToRole: builder.mutation<
      any,
      { roleId: string; data: AssignRolePermissionDto }
    >({
      query: ({ roleId, data }) => ({
        url: `/api/v1/roles/${roleId}/permissions`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: 'Role', id: roleId },
      ],
    }),

    // Bulk assign permissions to role
    bulkAssignPermissionsToRole: builder.mutation<
      any,
      { roleId: string; data: BulkAssignRolePermissionsDto }
    >({
      query: ({ roleId, data }) => ({
        url: `/api/v1/roles/${roleId}/permissions/bulk`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: 'Role', id: roleId },
      ],
    }),

    // Remove permission from role
    removePermissionFromRole: builder.mutation<
      void,
      { roleId: string; permissionId: string }
    >({
      query: ({ roleId, permissionId }) => ({
        url: `/api/v1/roles/${roleId}/permissions/${permissionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: 'Role', id: roleId },
      ],
    }),

    // Create role hierarchy
    createRoleHierarchy: builder.mutation<
      RoleHierarchy,
      { roleId: string; data: CreateRoleHierarchyDto }
    >({
      query: ({ roleId, data }) => ({
        url: `/api/v1/roles/${roleId}/hierarchy`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: 'Role', id: `hierarchy-${roleId}` },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    // Create role template
    createRoleTemplate: builder.mutation<any, CreateRoleTemplateDto>({
      query: (data) => ({
        url: '/api/v1/roles/templates',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Role', id: 'LIST' }],
    }),

    // Apply role template
    applyRoleTemplate: builder.mutation<any, ApplyRoleTemplateDto>({
      query: (data) => ({
        url: '/api/v1/roles/templates/apply',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: 'Role', id: roleId },
        { type: 'Role', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

// Export hooks for use in components
export const {
  // Queries
  useGetRolesQuery,
  useLazyGetRolesQuery,
  useGetRoleByIdQuery,
  useLazyGetRoleByIdQuery,
  useGetRoleByCodeQuery,
  useGetUserRolesQuery,
  useGetRoleStatisticsQuery,
  useGetRoleHierarchyQuery,
  // Mutations
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useAssignRoleMutation,
  useRemoveRoleMutation,
  useAssignPermissionToRoleMutation,
  useBulkAssignPermissionsToRoleMutation,
  useRemovePermissionFromRoleMutation,
  useCreateRoleHierarchyMutation,
  useCreateRoleTemplateMutation,
  useApplyRoleTemplateMutation,
} = rolesApi;

// Export endpoints for programmatic use
export const { endpoints: rolesEndpoints } = rolesApi;
