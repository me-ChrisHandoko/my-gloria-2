import { apiSlice } from './apiSliceWithHook';
import type { PaginatedResponse } from '@/types';
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
      PaginatedResponse<Permission>,
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
        if (params.search) queryParams.search = params.search;

        return {
          url: '/permissions',
          params: queryParams,
        };
      },
      // Transform response to handle wrapped response from backend TransformInterceptor
      // This follows DepartmentList pattern for consistency
      transformResponse: (response: any) => {
        // Handle wrapped response from backend TransformInterceptor
        let actualResponse: PaginatedResponse<Permission>;

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
          data: actualResponse.data.map(perm => ({
            ...perm,
            createdAt: new Date(perm.createdAt).toISOString(),
            updatedAt: new Date(perm.updatedAt).toISOString(),
          })),
        };
      },
      providesTags: (result) =>
        result && Array.isArray(result.data)
          ? [
              ...result.data.map(({ id }) => ({ type: 'Permission' as const, id })),
              { type: 'Permission' as const, id: 'LIST' },
            ]
          : [{ type: 'Permission' as const, id: 'LIST' }],
      // Set cache duration to 60 seconds (matches backend Redis TTL)
      keepUnusedDataFor: 60,
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
  useGetStatisticsQuery,
  useRefreshCacheMutation,
} = permissionApi;
