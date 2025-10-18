import { apiSlice } from './apiSliceWithHook';
import { PaginatedResponse, QueryParams } from '@/types';
import {
  UserModuleAccess,
  GrantModuleAccessDto,
  UpdateModuleAccessDto,
  QueryModuleAccessParams,
  CheckAccessResponse,
  Module,
  ModuleCategory,
} from '@/lib/api/services/module-access.service';

// Module Access API slice
export const moduleAccessApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ===== QUERIES =====

    // Get paginated module access list
    getModuleAccessList: builder.query<
      PaginatedResponse<UserModuleAccess>,
      QueryModuleAccessParams
    >({
      query: (params = {}) => {
        const queryParams: Record<string, any> = {
          page: params.page || 1,
          limit: params.limit || 10,
          sortOrder: params.sortOrder || 'desc',
        };

        // Add optional parameters conditionally
        if (params.search) queryParams.search = params.search;
        if (params.sortBy) queryParams.sortBy = params.sortBy;
        if (params.userProfileId) queryParams.userProfileId = params.userProfileId;
        if (params.moduleId) queryParams.moduleId = params.moduleId;
        if (params.category) queryParams.category = params.category;
        if (params.isActive !== undefined) queryParams.isActive = params.isActive;
        if (params.includeModule) queryParams.includeModule = params.includeModule;
        if (params.includeUser) queryParams.includeUser = params.includeUser;
        if (params.includeGrantedBy) queryParams.includeGrantedBy = params.includeGrantedBy;

        return {
          url: '/module-access',
          params: queryParams,
        };
      },
      transformResponse: (response: any) => {
        // Handle wrapped response from backend TransformInterceptor
        let actualResponse: PaginatedResponse<UserModuleAccess>;

        if (response && response.success && response.data) {
          actualResponse = response.data;

          // Check if it's double-wrapped
          if (actualResponse && (actualResponse as any).success && (actualResponse as any).data) {
            actualResponse = (actualResponse as any).data;
          }
        } else {
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
          data: actualResponse.data.map((access) => ({
            ...access,
            validFrom: new Date(access.validFrom).toISOString(),
            validUntil: access.validUntil ? new Date(access.validUntil).toISOString() : undefined,
            createdAt: new Date(access.createdAt).toISOString(),
            updatedAt: new Date(access.updatedAt).toISOString(),
          })),
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'ModuleAccess' as const, id })),
              { type: 'ModuleAccess', id: 'LIST' },
            ]
          : [{ type: 'ModuleAccess', id: 'LIST' }],
      keepUnusedDataFor: 60,
    }),

    // Get user's module access
    getUserModuleAccess: builder.query<UserModuleAccess[], string>({
      query: (userProfileId) => `/module-access/user/${userProfileId}`,
      transformResponse: (response: any) => {
        if (response && response.success && response.data) {
          return response.data;
        }
        return response || [];
      },
      providesTags: (_result, _error, userProfileId) => [
        { type: 'ModuleAccess', id: `user-${userProfileId}` },
      ],
    }),

    // Check module access
    checkModuleAccess: builder.query<
      CheckAccessResponse,
      { userProfileId: string; moduleId: string; accessType: 'read' | 'write' | 'delete' | 'share' }
    >({
      query: ({ userProfileId, moduleId, accessType }) =>
        `/module-access/check/${userProfileId}/${moduleId}/${accessType}`,
      transformResponse: (response: any) => {
        if (response && response.success && response.data) {
          return response.data;
        }
        return response || { hasAccess: false };
      },
      providesTags: (_result, _error, { userProfileId, moduleId }) => [
        { type: 'ModuleAccess', id: `check-${userProfileId}-${moduleId}` },
      ],
    }),

    // Get active modules
    getActiveModules: builder.query<PaginatedResponse<Module>, QueryParams>({
      query: (params = {}) => {
        const queryParams: Record<string, any> = {
          page: params.page || 1,
          limit: params.limit || 100,
          isActive: true,
          isVisible: true,
        };

        if (params.search) queryParams.search = params.search;

        return {
          url: '/modules',
          params: queryParams,
        };
      },
      transformResponse: (response: any) => {
        if (response && response.success && response.data) {
          return response.data;
        }
        return response || { data: [], total: 0, page: 1, limit: 100, totalPages: 0 };
      },
      providesTags: [{ type: 'Module', id: 'ACTIVE_LIST' }],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    // Get modules by category
    getModulesByCategory: builder.query<Module[], ModuleCategory>({
      query: (category) => ({
        url: '/modules',
        params: {
          category,
          isActive: true,
          limit: 100,
        },
      }),
      transformResponse: (response: any) => {
        if (response && response.success && response.data) {
          const paginatedData = response.data as PaginatedResponse<Module>;
          return paginatedData.data || [];
        }
        return response?.data || [];
      },
      providesTags: (_result, _error, category) => [
        { type: 'Module', id: `category-${category}` },
      ],
      keepUnusedDataFor: 300,
    }),

    // ===== MUTATIONS =====

    // Grant module access (create/update)
    grantModuleAccess: builder.mutation<UserModuleAccess, GrantModuleAccessDto>({
      query: (data) => ({
        url: '/module-access/grant',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [
        { type: 'ModuleAccess', id: 'LIST' },
        (_result, _error, arg) => ({ type: 'ModuleAccess', id: `user-${arg.userProfileId}` }),
      ],
      // Optimistic update
      async onQueryStarted(data, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          moduleAccessApi.util.updateQueryData('getModuleAccessList', {}, (draft) => {
            const tempAccess: UserModuleAccess = {
              id: `temp-${Date.now()}`,
              userProfileId: data.userProfileId,
              moduleId: data.moduleId,
              permissions: {
                canRead: data.canRead,
                canWrite: data.canWrite,
                canDelete: data.canDelete,
                canShare: data.canShare,
              },
              validFrom: new Date().toISOString(),
              validUntil: data.validUntil,
              grantedBy: 'current-user',
              reason: data.reason,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              version: 0,
            };
            draft.data.unshift(tempAccess);
            draft.total += 1;
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Update module access
    updateModuleAccess: builder.mutation<
      UserModuleAccess,
      { userProfileId: string; moduleId: string; data: UpdateModuleAccessDto }
    >({
      query: ({ userProfileId, moduleId, data }) => ({
        url: '/module-access/grant',
        method: 'POST',
        body: {
          userProfileId,
          moduleId,
          canRead: data.canRead ?? true,
          canWrite: data.canWrite ?? false,
          canDelete: data.canDelete ?? false,
          canShare: data.canShare ?? false,
          validUntil: data.validUntil,
          reason: data.reason,
        },
      }),
      invalidatesTags: (_result, _error, { userProfileId }) => [
        { type: 'ModuleAccess', id: 'LIST' },
        { type: 'ModuleAccess', id: `user-${userProfileId}` },
      ],
    }),

    // Revoke module access (soft delete)
    revokeModuleAccess: builder.mutation<
      UserModuleAccess,
      { userProfileId: string; moduleId: string }
    >({
      query: ({ userProfileId, moduleId }) => ({
        url: '/module-access/grant',
        method: 'POST',
        body: {
          userProfileId,
          moduleId,
          canRead: false,
          canWrite: false,
          canDelete: false,
          canShare: false,
          isActive: false,
        },
      }),
      invalidatesTags: (_result, _error, { userProfileId }) => [
        { type: 'ModuleAccess', id: 'LIST' },
        { type: 'ModuleAccess', id: `user-${userProfileId}` },
      ],
    }),

    // Bulk grant access
    bulkGrantAccess: builder.mutation<
      { success: number; failed: number; errors: string[] },
      {
        userProfileIds: string[];
        moduleId: string;
        permissions: {
          canRead: boolean;
          canWrite: boolean;
          canDelete: boolean;
          canShare: boolean;
        };
        validUntil?: string;
        reason?: string;
      }
    >({
      async queryFn(arg, _api, _extraOptions, baseQuery) {
        const results = {
          success: 0,
          failed: 0,
          errors: [] as string[],
        };

        for (const userProfileId of arg.userProfileIds) {
          try {
            await baseQuery({
              url: '/module-access/grant',
              method: 'POST',
              body: {
                userProfileId,
                moduleId: arg.moduleId,
                ...arg.permissions,
                validUntil: arg.validUntil,
                reason: arg.reason,
              },
            });
            results.success++;
          } catch (error: any) {
            results.failed++;
            results.errors.push(
              `Failed for user ${userProfileId}: ${error?.message || 'Unknown error'}`
            );
          }
        }

        return { data: results };
      },
      invalidatesTags: [{ type: 'ModuleAccess', id: 'LIST' }],
    }),

    // Extend access expiry
    extendAccess: builder.mutation<
      UserModuleAccess,
      { userProfileId: string; moduleId: string; newValidUntil: string }
    >({
      query: ({ userProfileId, moduleId, newValidUntil }) => ({
        url: '/module-access/grant',
        method: 'POST',
        body: {
          userProfileId,
          moduleId,
          canRead: true, // Keep existing permissions
          canWrite: true,
          canDelete: true,
          canShare: true,
          validUntil: newValidUntil,
          reason: `Access extended until ${newValidUntil}`,
        },
      }),
      invalidatesTags: (_result, _error, { userProfileId }) => [
        { type: 'ModuleAccess', id: 'LIST' },
        { type: 'ModuleAccess', id: `user-${userProfileId}` },
      ],
    }),
  }),
  overrideExisting: false,
});

// Export hooks
export const {
  useGetModuleAccessListQuery,
  useLazyGetModuleAccessListQuery,
  useGetUserModuleAccessQuery,
  useCheckModuleAccessQuery,
  useGetActiveModulesQuery,
  useGetModulesByCategoryQuery,
  useGrantModuleAccessMutation,
  useUpdateModuleAccessMutation,
  useRevokeModuleAccessMutation,
  useBulkGrantAccessMutation,
  useExtendAccessMutation,
} = moduleAccessApi;

// Export endpoints
export const { endpoints: moduleAccessEndpoints } = moduleAccessApi;
