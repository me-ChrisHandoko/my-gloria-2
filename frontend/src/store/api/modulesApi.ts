import { apiSlice } from './apiSliceWithHook';
import { PaginatedResponse, QueryParams } from '@/types';
import {
  Module,
  ModuleTreeNode,
  ModuleChangeHistory,
  CreateModuleDto,
  UpdateModuleDto,
  DeleteModuleDto,
  MoveModuleDto,
  QueryModulesParams,
  ModuleCategory,
} from '@/lib/api/services/modules.service';

// Modules API slice
export const modulesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ===== QUERIES =====

    // Get paginated modules list
    getModules: builder.query<PaginatedResponse<Module>, QueryModulesParams>({
      query: (params = {}) => {
        const queryParams: Record<string, any> = {
          page: params.page || 1,
          limit: params.limit || 10,
          sortOrder: params.sortOrder || 'asc',
        };

        if (params.search) queryParams.search = params.search;
        if (params.sortBy) queryParams.sortBy = params.sortBy;
        if (params.category) queryParams.category = params.category;
        if (params.isActive !== undefined) queryParams.isActive = params.isActive;
        if (params.isVisible !== undefined) queryParams.isVisible = params.isVisible;
        if (params.parentId !== undefined) queryParams.parentId = params.parentId;

        return {
          url: '/permissions/modules',
          params: queryParams,
        };
      },
      transformResponse: (response: any) => {
        // With the fixed backend, response is now properly structured
        // The transform interceptor correctly identifies it as paginated
        // and flattens the structure, so we just need to process the data
        if (!response || !Array.isArray(response.data)) {
          return {
            data: [],
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0,
          };
        }

        return {
          ...response,
          data: response.data.map((module: any) => ({
            ...module,
            createdAt: new Date(module.createdAt).toISOString(),
            updatedAt: new Date(module.updatedAt).toISOString(),
          })),
        };
      },
      providesTags: (result) =>
        result && Array.isArray(result.data)
          ? [
              ...result.data.map(({ id }) => ({ type: 'Module' as const, id })),
              { type: 'Module', id: 'LIST' },
            ]
          : [{ type: 'Module', id: 'LIST' }],
      keepUnusedDataFor: 60,
    }),

    // Get full module tree
    getModuleTree: builder.query<ModuleTreeNode[], void>({
      query: () => '/permissions/modules/tree',
      transformResponse: (response: any) => {
        // Handle paginated response structure (has data, total, page, etc.)
        if (
          response &&
          typeof response === 'object' &&
          'data' in response &&
          Array.isArray(response.data)
        ) {
          return response.data;
        }

        // Handle standard wrapped structure (has success and data)
        if (response && response.success && response.data) {
          const data = response.data;

          if (!Array.isArray(data)) {
            return [];
          }

          return data;
        }

        // If response is already an array, return it
        if (Array.isArray(response)) {
          return response;
        }

        // Fallback to empty array
        return [];
      },
      providesTags: [{ type: 'Module', id: 'TREE' }],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    // Get module by code
    getModuleByCode: builder.query<Module, string>({
      query: (code) => `/permissions/modules/code/${code}`,
      transformResponse: (response: any) => {
        if (response && response.success && response.data) {
          return response.data;
        }
        return response;
      },
      providesTags: (_result, _error, code) => [
        { type: 'Module', id: `code-${code}` },
      ],
    }),

    // Get module by ID
    getModuleById: builder.query<Module, string>({
      query: (id) => `/permissions/modules/${id}`,
      transformResponse: (response: any) => {
        if (response && response.success && response.data) {
          return response.data;
        }
        return response;
      },
      providesTags: (_result, _error, id) => [{ type: 'Module', id }],
    }),

    // Get module children
    getModuleChildren: builder.query<Module[], string>({
      query: (id) => `/permissions/modules/${id}/children`,
      transformResponse: (response: any) => {
        if (response && response.success && response.data) {
          return response.data;
        }
        return response || [];
      },
      providesTags: (_result, _error, id) => [
        { type: 'Module', id: `children-${id}` },
      ],
    }),

    // Get module ancestors
    getModuleAncestors: builder.query<Module[], string>({
      query: (id) => `/permissions/modules/${id}/ancestors`,
      transformResponse: (response: any) => {
        if (response && response.success && response.data) {
          return response.data;
        }
        return response || [];
      },
      providesTags: (_result, _error, id) => [
        { type: 'Module', id: `ancestors-${id}` },
      ],
    }),

    // Get module change history
    getModuleHistory: builder.query<ModuleChangeHistory[], string>({
      query: (id) => `/permissions/modules/${id}/history`,
      transformResponse: (response: any) => {
        if (response && response.success && response.data) {
          return response.data;
        }
        return response || [];
      },
      providesTags: (_result, _error, id) => [
        { type: 'Module', id: `history-${id}` },
      ],
    }),

    // ===== MUTATIONS =====

    // Create module
    createModule: builder.mutation<Module, CreateModuleDto>({
      query: (data) => ({
        url: '/permissions/modules',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [
        { type: 'Module', id: 'LIST' },
        { type: 'Module', id: 'TREE' },
      ],
    }),

    // Update module
    updateModule: builder.mutation<Module, { id: string; data: UpdateModuleDto }>({
      query: ({ id, data }) => ({
        url: `/permissions/modules/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Module', id },
        { type: 'Module', id: 'LIST' },
        { type: 'Module', id: 'TREE' },
      ],
    }),

    // Move module
    moveModule: builder.mutation<Module, { id: string; newParentId: string | null }>({
      query: ({ id, newParentId }) => ({
        url: `/permissions/modules/${id}/move`,
        method: 'PATCH',
        body: { newParentId },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Module', id },
        { type: 'Module', id: 'LIST' },
        { type: 'Module', id: 'TREE' },
      ],
    }),

    // Delete module
    deleteModule: builder.mutation<Module, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/permissions/modules/${id}`,
        method: 'DELETE',
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Module', id },
        { type: 'Module', id: 'LIST' },
        { type: 'Module', id: 'TREE' },
      ],
    }),
  }),
  overrideExisting: false,
});

// Export hooks
export const {
  useGetModulesQuery,
  useLazyGetModulesQuery,
  useGetModuleTreeQuery,
  useLazyGetModuleTreeQuery,
  useGetModuleByCodeQuery,
  useLazyGetModuleByCodeQuery,
  useGetModuleByIdQuery,
  useLazyGetModuleByIdQuery,
  useGetModuleChildrenQuery,
  useGetModuleAncestorsQuery,
  useGetModuleHistoryQuery,
  useCreateModuleMutation,
  useUpdateModuleMutation,
  useMoveModuleMutation,
  useDeleteModuleMutation,
} = modulesApi;

// Export endpoints
export const { endpoints: modulesEndpoints } = modulesApi;
