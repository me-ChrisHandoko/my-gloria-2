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
  UpdateUserRoleTemporalDto,
  RoleTemplate,
  RoleUser,
} from '@/lib/api/services/roles.service';
import type { PaginatedResponse, QueryParams } from '@/lib/api/types';

export const rolesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ===== ROLE QUERIES =====

    // Get all roles with pagination and filters
    getRoles: builder.query<
      PaginatedResponse<Role>,
      QueryRoleParams | void
    >({
      query: (params = {}) => {
        const queryParams: Record<string, any> = {
          page: params.page || 1,
          limit: params.limit || 10,
        };

        // Only add optional parameters if they have values
        if (params.search) queryParams.search = params.search;
        if (params.sortBy) queryParams.sortBy = params.sortBy;
        if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
        if (params.includeInactive !== undefined) queryParams.includeInactive = params.includeInactive;
        if (params.isActive !== undefined) queryParams.isActive = params.isActive;
        if (params.hierarchyLevel !== undefined) queryParams.hierarchyLevel = params.hierarchyLevel;
        if (params.isSystemRole !== undefined) queryParams.isSystemRole = params.isSystemRole;

        return {
          url: '/roles',
          params: queryParams,
        };
      },
      // Transform response to handle wrapped response from backend TransformInterceptor
      // This follows PermissionList pattern for consistency
      transformResponse: (response: any) => {
        // Handle wrapped response from backend TransformInterceptor
        let actualResponse: PaginatedResponse<Role>;

        if (response && response.success && response.data) {
          // Unwrap the response from TransformInterceptor
          actualResponse = response.data;

          // Check if it's double-wrapped
          if (actualResponse && (actualResponse as any).success && (actualResponse as any).data) {
            actualResponse = (actualResponse as any).data;
          }
        } else {
          // Use response directly if not wrapped
          actualResponse = response;
        }

        // Ensure we have valid data
        if (!actualResponse || !Array.isArray(actualResponse.data)) {
          return {
            data: [],
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0,
          };
        }

        return {
          ...actualResponse,
          data: actualResponse.data.map(role => ({
            ...role,
            createdAt: new Date(role.createdAt),
            updatedAt: new Date(role.updatedAt),
          })),
        };
      },
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

    // Get single role by ID
    getRoleById: builder.query<Role, string>({
      query: (id) => `/roles/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Role', id }],
    }),

    // Get role by code
    getRoleByCode: builder.query<Role, string>({
      query: (code) => `/roles/code/${code}`,
      providesTags: (_result, _error, code) => [
        { type: 'Role', id: `code-${code}` },
      ],
    }),

    // Get user roles
    getUserRoles: builder.query<Role[], string>({
      query: (userProfileId) => `/roles/user/${userProfileId}`,
      providesTags: (_result, _error, userProfileId) => [
        { type: 'Role', id: `user-${userProfileId}` },
      ],
    }),

    // Get role statistics
    getRoleStatistics: builder.query<any, void>({
      query: () => '/roles/statistics',
      providesTags: [{ type: 'Role', id: 'STATISTICS' }],
    }),

    // Get role hierarchy
    getRoleHierarchy: builder.query<any, string>({
      query: (roleId) => `/roles/${roleId}/hierarchy`,
      providesTags: (_result, _error, roleId) => [
        { type: 'Role', id: `hierarchy-${roleId}` },
      ],
    }),

    // Get role templates
    getRoleTemplates: builder.query<
      PaginatedResponse<RoleTemplate>,
      QueryParams | void
    >({
      query: (params) => ({
        url: '/roles/templates',
        params: params || {},
      }),
      providesTags: (result) =>
        result && Array.isArray(result.data)
          ? [
              ...result.data.map(({ id }) => ({ type: 'Role' as const, id: `template-${id}` })),
              { type: 'Role', id: 'TEMPLATE-LIST' },
            ]
          : [{ type: 'Role', id: 'TEMPLATE-LIST' }],
    }),

    // Get role template by ID
    getRoleTemplateById: builder.query<RoleTemplate, string>({
      query: (id) => `/roles/templates/${id}`,
      providesTags: (_result, _error, id) => [
        { type: 'Role', id: `template-${id}` },
      ],
    }),

    // Get users assigned to a role
    getRoleUsers: builder.query<
      PaginatedResponse<RoleUser>,
      { roleId: string; params?: QueryParams }
    >({
      query: ({ roleId, params = {} }) => ({
        url: `/roles/${roleId}/users`,
        params,
      }),
      providesTags: (_result, _error, { roleId }) => [
        { type: 'Role', id: `users-${roleId}` },
      ],
    }),

    // Get modules accessible by a role
    getRoleModules: builder.query<any, string>({
      query: (roleId) => `/roles/${roleId}/modules`,
      providesTags: (_result, _error, roleId) => [
        { type: 'Role', id: `modules-${roleId}` },
      ],
    }),

    // ===== ROLE MUTATIONS =====

    // Create new role
    createRole: builder.mutation<Role, CreateRoleDto>({
      query: (data) => ({
        url: '/roles',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Role', id: 'LIST' }],
    }),

    // Update role
    updateRole: builder.mutation<Role, { id: string; data: UpdateRoleDto }>({
      query: ({ id, data }) => ({
        url: `/roles/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Role', id },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    // Delete role
    deleteRole: builder.mutation<void, string>({
      query: (id) => ({
        url: `/roles/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Role', id },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    // Assign role to user
    assignRole: builder.mutation<UserRole, AssignRoleDto>({
      query: (data) => ({
        url: '/roles/assign',
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
        url: `/roles/users/${userProfileId}/roles/${roleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { userProfileId }) => [
        { type: 'Role', id: `user-${userProfileId}` },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    // Update user role temporal settings
    updateUserRoleTemporal: builder.mutation<
      UserRole,
      { userProfileId: string; roleId: string; data: UpdateUserRoleTemporalDto }
    >({
      query: ({ userProfileId, roleId, data }) => ({
        url: `/roles/users/${userProfileId}/roles/${roleId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { userProfileId, roleId }) => [
        { type: 'Role', id: `user-${userProfileId}` },
        { type: 'Role', id: `users-${roleId}` },
      ],
    }),

    // Assign permission to role
    assignPermissionToRole: builder.mutation<
      any,
      { roleId: string; data: AssignRolePermissionDto }
    >({
      query: ({ roleId, data }) => ({
        url: `/roles/${roleId}/permissions`,
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
        url: `/roles/${roleId}/permissions/bulk`,
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
        url: `/roles/${roleId}/permissions/${permissionId}`,
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
        url: `/roles/${roleId}/hierarchy`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: 'Role', id: `hierarchy-${roleId}` },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    // Delete role hierarchy
    deleteRoleHierarchy: builder.mutation<
      void,
      { roleId: string; parentRoleId: string }
    >({
      query: ({ roleId, parentRoleId }) => ({
        url: `/roles/${roleId}/hierarchy/${parentRoleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: 'Role', id: `hierarchy-${roleId}` },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    // Create role template
    createRoleTemplate: builder.mutation<RoleTemplate, CreateRoleTemplateDto>({
      query: (data) => ({
        url: '/roles/templates',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [
        { type: 'Role', id: 'TEMPLATE-LIST' },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    // Delete role template
    deleteRoleTemplate: builder.mutation<void, string>({
      query: (id) => ({
        url: `/roles/templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Role', id: `template-${id}` },
        { type: 'Role', id: 'TEMPLATE-LIST' },
      ],
    }),

    // Apply role template
    applyRoleTemplate: builder.mutation<any, ApplyRoleTemplateDto>({
      query: (data) => ({
        url: '/roles/templates/apply',
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
  useGetRoleTemplatesQuery,
  useLazyGetRoleTemplatesQuery,
  useGetRoleTemplateByIdQuery,
  useGetRoleUsersQuery,
  useGetRoleModulesQuery,
  // Mutations
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useAssignRoleMutation,
  useRemoveRoleMutation,
  useUpdateUserRoleTemporalMutation,
  useAssignPermissionToRoleMutation,
  useBulkAssignPermissionsToRoleMutation,
  useRemovePermissionFromRoleMutation,
  useCreateRoleHierarchyMutation,
  useDeleteRoleHierarchyMutation,
  useCreateRoleTemplateMutation,
  useDeleteRoleTemplateMutation,
  useApplyRoleTemplateMutation,
} = rolesApi;

// Export endpoints for programmatic use
export const { endpoints: rolesEndpoints } = rolesApi;
