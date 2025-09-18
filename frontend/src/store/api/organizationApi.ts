import { apiSlice } from './apiSlice';
import { Organization, PaginatedResponse, QueryParams } from '@/types';

// Enhanced Organization API with production-ready features
export const organizationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ===== QUERIES =====

    // Get paginated list of organizations with advanced filtering
    getOrganizations: builder.query<PaginatedResponse<Organization>, QueryParams>({
      query: (params = {}) => ({
        url: '/organizations',
        params: {
          page: params.page || 1,
          limit: params.limit || 10,
          search: params.search || '',
          sortBy: params.sortBy || 'createdAt',
          sortOrder: params.sortOrder || 'desc',
          status: params.status,
          type: params.type,
          ...params
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Organization' as const, id })),
              { type: 'Organization', id: 'LIST' },
            ]
          : [{ type: 'Organization', id: 'LIST' }],
      // Cache for 5 minutes
      keepUnusedDataFor: 300,
      // Transform response to ensure data consistency
      transformResponse: (response: PaginatedResponse<Organization>) => ({
        ...response,
        data: response.data.map(org => ({
          ...org,
          createdAt: new Date(org.createdAt),
          updatedAt: new Date(org.updatedAt),
        })),
      }),
    }),

    // Get single organization with related data
    getOrganizationById: builder.query<Organization, string>({
      query: (id) => `/organizations/${id}`,
      providesTags: (result, error, id) => [{ type: 'Organization', id }],
      transformResponse: (response: Organization) => ({
        ...response,
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
      }),
    }),

    // Get organization hierarchy (parent/child relationships)
    getOrganizationHierarchy: builder.query<Organization[], string>({
      query: (id) => `/organizations/${id}/hierarchy`,
      providesTags: (result, error, id) => [
        { type: 'Organization', id: `${id}-hierarchy` }
      ],
    }),

    // Get organization statistics
    getOrganizationStats: builder.query<{
      totalUsers: number;
      totalSchools: number;
      totalDepartments: number;
      activeWorkflows: number;
    }, string>({
      query: (id) => `/organizations/${id}/stats`,
      providesTags: (result, error, id) => [
        { type: 'Organization', id: `${id}-stats` }
      ],
      // Cache stats for 10 minutes
      keepUnusedDataFor: 600,
    }),

    // Get user's organizations
    getUserOrganizations: builder.query<Organization[], void>({
      query: () => '/organizations/my-organizations',
      providesTags: ['Organization'],
      transformResponse: (response: Organization[]) =>
        response.map(org => ({
          ...org,
          createdAt: new Date(org.createdAt),
          updatedAt: new Date(org.updatedAt),
        })),
    }),

    // ===== MUTATIONS =====

    // Create new organization with validation
    createOrganization: builder.mutation<Organization, Partial<Organization>>({
      query: (organization) => ({
        url: '/organizations',
        method: 'POST',
        body: organization,
      }),
      invalidatesTags: [{ type: 'Organization', id: 'LIST' }],
      // Optimistic update
      async onQueryStarted(organization, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          organizationApi.util.updateQueryData('getOrganizations', undefined, (draft) => {
            const tempOrg = {
              ...organization,
              id: `temp-${Date.now()}`,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as Organization;
            draft.data.unshift(tempOrg);
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

    // Update organization with optimistic updates
    updateOrganization: builder.mutation<Organization, { id: string; data: Partial<Organization> }>({
      query: ({ id, data }) => ({
        url: `/organizations/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Organization', id },
        { type: 'Organization', id: 'LIST' },
        { type: 'Organization', id: `${id}-stats` },
      ],
      // Optimistic update
      async onQueryStarted({ id, data }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          organizationApi.util.updateQueryData('getOrganizationById', id, (draft) => {
            Object.assign(draft, data);
            draft.updatedAt = new Date();
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Delete organization with confirmation
    deleteOrganization: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/organizations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Organization', id },
        { type: 'Organization', id: 'LIST' },
      ],
    }),

    // Bulk operations for admin efficiency
    bulkUpdateOrganizations: builder.mutation<
      { success: boolean; updated: number },
      { ids: string[]; data: Partial<Organization> }
    >({
      query: ({ ids, data }) => ({
        url: '/organizations/bulk-update',
        method: 'PATCH',
        body: { ids, data },
      }),
      invalidatesTags: (result, error, { ids }) => [
        ...ids.map(id => ({ type: 'Organization' as const, id })),
        { type: 'Organization', id: 'LIST' },
      ],
    }),

    // Activate/Deactivate organization
    updateOrganizationStatus: builder.mutation<
      Organization,
      { id: string; isActive: boolean }
    >({
      query: ({ id, isActive }) => ({
        url: `/organizations/${id}/status`,
        method: 'PATCH',
        body: { isActive },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Organization', id },
        { type: 'Organization', id: 'LIST' },
      ],
    }),

    // Archive organization (soft delete)
    archiveOrganization: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/organizations/${id}/archive`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Organization', id },
        { type: 'Organization', id: 'LIST' },
      ],
    }),

    // Restore archived organization
    restoreOrganization: builder.mutation<
      Organization,
      string
    >({
      query: (id) => ({
        url: `/organizations/${id}/restore`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Organization', id },
        { type: 'Organization', id: 'LIST' },
      ],
    }),

    // Update organization settings
    updateOrganizationSettings: builder.mutation<
      Organization,
      { id: string; settings: Record<string, any> }
    >({
      query: ({ id, settings }) => ({
        url: `/organizations/${id}/settings`,
        method: 'PUT',
        body: settings,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Organization', id },
      ],
    }),

    // Upload organization logo
    uploadOrganizationLogo: builder.mutation<
      { url: string },
      { id: string; logo: FormData }
    >({
      query: ({ id, logo }) => ({
        url: `/organizations/${id}/logo`,
        method: 'POST',
        body: logo,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Organization', id },
      ],
    }),

    // Export organizations data
    exportOrganizations: builder.query<
      Blob,
      { format: 'csv' | 'excel' | 'pdf'; filters?: QueryParams }
    >({
      query: ({ format, filters = {} }) => ({
        url: '/organizations/export',
        params: {
          format,
          ...filters,
        },
        responseHandler: (response) => response.blob(),
      }),
    }),

    // Import organizations from file
    importOrganizations: builder.mutation<
      { success: boolean; imported: number; failed: number; errors?: any[] },
      FormData
    >({
      query: (formData) => ({
        url: '/organizations/import',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [{ type: 'Organization', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
});

// Export hooks for usage in functional components
export const {
  useGetOrganizationsQuery,
  useLazyGetOrganizationsQuery,
  useGetOrganizationByIdQuery,
  useGetOrganizationHierarchyQuery,
  useGetOrganizationStatsQuery,
  useGetUserOrganizationsQuery,
  useCreateOrganizationMutation,
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
  useBulkUpdateOrganizationsMutation,
  useUpdateOrganizationStatusMutation,
  useArchiveOrganizationMutation,
  useRestoreOrganizationMutation,
  useUpdateOrganizationSettingsMutation,
  useUploadOrganizationLogoMutation,
  useLazyExportOrganizationsQuery,
  useImportOrganizationsMutation,
} = organizationApi;

// Export endpoints for server-side usage
export const { endpoints: organizationEndpoints } = organizationApi;