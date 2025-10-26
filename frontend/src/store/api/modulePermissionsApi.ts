import { apiSlice } from './apiSliceWithHook';
import {
  ModulePermission,
  CreateModulePermissionDto,
  ModuleHierarchy,
} from '@/lib/api/services/module-permissions.service';

// Module Permissions API slice
export const modulePermissionsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ===== QUERIES =====

    // Get all permissions for a module
    getModulePermissions: builder.query<ModulePermission[], string>({
      query: (moduleId) => `/modules/${moduleId}/permissions`,
      transformResponse: (response: any) => {
        if (response && response.success && response.data) {
          return response.data;
        }
        return response || [];
      },
      providesTags: (_result, _error, moduleId) => [
        { type: 'ModulePermission', id: `module-${moduleId}` },
        { type: 'ModulePermission', id: 'LIST' },
      ],
    }),

    // Get module hierarchy
    getModuleHierarchy: builder.query<ModuleHierarchy, string>({
      query: (moduleId) => `/modules/${moduleId}/hierarchy`,
      transformResponse: (response: any) => {
        if (response && response.success && response.data) {
          return response.data;
        }
        return response;
      },
      providesTags: (_result, _error, moduleId) => [
        { type: 'Module', id: moduleId },
        { type: 'ModulePermission', id: `module-${moduleId}` },
      ],
    }),

    // ===== MUTATIONS =====

    // Create module permission
    createModulePermission: builder.mutation<
      ModulePermission,
      { moduleId: string; data: CreateModulePermissionDto }
    >({
      query: ({ moduleId, data }) => ({
        url: `/modules/${moduleId}/permissions`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { moduleId }) => [
        { type: 'ModulePermission', id: `module-${moduleId}` },
        { type: 'ModulePermission', id: 'LIST' },
      ],
    }),

    // Delete module permission
    deleteModulePermission: builder.mutation<
      void,
      { moduleId: string; permissionId: string }
    >({
      query: ({ moduleId, permissionId }) => ({
        url: `/modules/${moduleId}/permissions/${permissionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { moduleId }) => [
        { type: 'ModulePermission', id: `module-${moduleId}` },
        { type: 'ModulePermission', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

// Export hooks
export const {
  useGetModulePermissionsQuery,
  useLazyGetModulePermissionsQuery,
  useGetModuleHierarchyQuery,
  useLazyGetModuleHierarchyQuery,
  useCreateModulePermissionMutation,
  useDeleteModulePermissionMutation,
} = modulePermissionsApi;

// Export endpoints
export const { endpoints: modulePermissionsEndpoints } = modulePermissionsApi;
