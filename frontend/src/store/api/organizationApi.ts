import { apiSlice } from './apiSliceWithHook';
import { Organization, PaginatedResponse, QueryParams } from '@/types';

// Enhanced Organization API with production-ready features
export const organizationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ===== QUERIES =====

    // Get paginated list of organizations with advanced filtering
    getOrganizations: builder.query<PaginatedResponse<Organization>, QueryParams>({
      query: (params = {}) => ({
        url: '/organizations/schools',
        params: {
          page: params.page || 1,
          limit: params.limit || 10,
          // Map 'search' to 'name' for partial name matching as backend expects
          name: params.search || undefined,
          // Backend expects specific sortBy values: 'name', 'code', 'createdAt', 'updatedAt'
          sortBy: params.sortBy || 'name',
          sortOrder: params.sortOrder || 'asc',
          isActive: params.isActive,
          // Only send parameters that backend QuerySchoolDto accepts
          // Removed: status, type, and spread operator ...params
        },
      }),
      providesTags: (result) =>
        result && Array.isArray(result.data)
          ? [
              ...result.data.map(({ id }) => ({ type: 'Organization' as const, id })),
              { type: 'Organization', id: 'LIST' },
            ]
          : [{ type: 'Organization', id: 'LIST' }],
      // Cache for 5 minutes
      keepUnusedDataFor: 300,
      // Transform response to handle date conversions
      // baseQueryWithReauth already unwraps the success layer
      transformResponse: (response: any) => {
        // Validate response structure
        if (!response || !Array.isArray(response.data)) {
          return {
            data: [],
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0,
          };
        }

        // Helper function to safely convert date strings
        const toSafeDate = (dateValue: any): Date | null => {
          if (!dateValue) return null;
          const date = new Date(dateValue);
          return isNaN(date.getTime()) ? null : date;
        };

        return {
          ...response,
          data: response.data.map((org: any) => ({
            ...org,
            createdAt: toSafeDate(org.createdAt),
            updatedAt: toSafeDate(org.updatedAt),
          })),
        };
      },
    }),

    // Get single organization with related data
    getOrganizationById: builder.query<Organization, string>({
      query: (id) => `/organizations/schools/${id}`,
      providesTags: (result, error, id) => [{ type: 'Organization', id }],
      transformResponse: (response: Organization) => ({
        ...response,
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
      }),
    }),

    // Get organization hierarchy (parent/child relationships)
    getOrganizationHierarchy: builder.query<Organization[], string>({
      query: (id) => `/organizations/schools/${id}/hierarchy`,
      providesTags: (result, error, id) => [
        { type: 'Organization', id: `${id}-hierarchy` }
      ],
    }),


    // ===== MUTATIONS =====

    // Create new organization with validation
    createOrganization: builder.mutation<Organization, Partial<Organization>>({
      query: (organization) => ({
        url: '/organizations/schools',
        method: 'POST',
        body: organization,
      }),
      invalidatesTags: [{ type: 'Organization', id: 'LIST' }],
      // Optimistic update
      async onQueryStarted(organization, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          organizationApi.util.updateQueryData('getOrganizations', {} as QueryParams, (draft) => {
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
        url: `/organizations/schools/${id}`,
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
        url: `/organizations/schools/${id}`,
        method: 'DELETE',
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
        url: `/organizations/schools/${id}/restore`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Organization', id },
        { type: 'Organization', id: 'LIST' },
      ],
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
  useCreateOrganizationMutation,
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
  useRestoreOrganizationMutation,
} = organizationApi;

// Export endpoints for server-side usage
export const { endpoints: organizationEndpoints } = organizationApi;