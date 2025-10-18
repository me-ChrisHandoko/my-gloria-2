import { apiSlice } from './apiSliceWithHook';
import type {
  Permission,
  PermissionGroup,
  CreatePermissionDto,
  UpdatePermissionDto,
  PermissionQueryParams,
  PermissionStatistics,
} from '@/lib/api/services/permissions.service';

export const permissionApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPermissions: builder.query<
      { data: Permission[]; meta: { total: number; page: number; limit: number } },
      PermissionQueryParams
    >({
      query: (params = {}) => {
        const queryParams: Record<string, any> = {
          page: params.page || 1,
          limit: params.limit || 10,
        };

        // Only add optional parameters if they have values
        if (params.resource) queryParams.resource = params.resource;
        if (params.action) queryParams.action = params.action;
        if (params.groupId) queryParams.groupId = params.groupId;
        if (params.isActive !== undefined) queryParams.isActive = params.isActive;

        return {
          url: '/permissions',
          params: queryParams,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Permission' as const, id })),
              { type: 'Permission' as const, id: 'LIST' },
            ]
          : [{ type: 'Permission' as const, id: 'LIST' }],
    }),

    getPermissionById: builder.query<Permission, string>({
      query: (id) => `/permissions/${id}`,
      providesTags: (result, error, id) => [{ type: 'Permission', id }],
    }),

    getPermissionByCode: builder.query<Permission, string>({
      query: (code) => `/permissions/code/${code}`,
      providesTags: (result) =>
        result ? [{ type: 'Permission', id: result.id }] : [],
    }),

    createPermission: builder.mutation<Permission, CreatePermissionDto>({
      query: (data) => ({
        url: '/permissions',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Permission', id: 'LIST' }],
    }),

    updatePermission: builder.mutation<
      Permission,
      { id: string; data: UpdatePermissionDto }
    >({
      query: ({ id, data }) => ({
        url: `/permissions/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Permission', id },
        { type: 'Permission', id: 'LIST' },
      ],
    }),

    deletePermission: builder.mutation<void, string>({
      query: (id) => ({
        url: `/permissions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Permission', id },
        { type: 'Permission', id: 'LIST' },
      ],
    }),

    getPermissionGroups: builder.query<PermissionGroup[], { includeInactive?: boolean }>({
      query: (params) => ({
        url: '/permissions/groups',
        params,
      }),
      providesTags: ['PermissionGroup'],
    }),

    createPermissionGroup: builder.mutation<PermissionGroup, Partial<PermissionGroup>>({
      query: (data) => ({
        url: '/permissions/groups',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['PermissionGroup'],
    }),

    updatePermissionGroup: builder.mutation<
      PermissionGroup,
      { id: string; data: Partial<PermissionGroup> }
    >({
      query: ({ id, data }) => ({
        url: `/permissions/groups/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['PermissionGroup'],
    }),

    getStatistics: builder.query<PermissionStatistics, void>({
      query: () => '/permissions/statistics',
      providesTags: ['Permission'],
    }),

    refreshCache: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: '/permissions/refresh-cache',
        method: 'POST',
      }),
    }),
  }),
});

export const {
  useGetPermissionsQuery,
  useGetPermissionByIdQuery,
  useGetPermissionByCodeQuery,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
  useGetPermissionGroupsQuery,
  useCreatePermissionGroupMutation,
  useUpdatePermissionGroupMutation,
  useGetStatisticsQuery,
  useRefreshCacheMutation,
} = permissionApi;
