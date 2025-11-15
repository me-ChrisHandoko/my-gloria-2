import { apiSlice } from './apiSliceWithHook';
import { School, PaginatedResponse, QueryParams } from '@/types';

// School API with comprehensive CRUD operations and relationships
export const schoolApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ===== QUERIES =====

    // Get paginated schools with filtering
    getSchools: builder.query<PaginatedResponse<School>, QueryParams & { organizationId?: string; lokasi?: string }>({
      query: (params = {}) => {
        const queryParams: Record<string, any> = {
          page: params.page || 1,
          limit: params.limit || 10,
          sortBy: params.sortBy || 'name',
          sortOrder: params.sortOrder || 'asc',
        };

        // Only add optional parameters if they have values
        if (params.search) queryParams.search = params.search;
        if (params.organizationId) queryParams.organizationId = params.organizationId;
        if (params.lokasi) queryParams.lokasi = params.lokasi;
        if (params.status) queryParams.status = params.status;
        if (params.type) queryParams.type = params.type;

        return {
          url: '/organizations/schools',
          params: queryParams,
        };
      },
      providesTags: (result) =>
        result && Array.isArray(result.data)
          ? [
              ...result.data.map(({ id }) => ({ type: 'School' as const, id })),
              { type: 'School', id: 'LIST' },
            ]
          : [{ type: 'School', id: 'LIST' }],
      // Set cache duration to 60 seconds (matches backend Redis TTL)
      keepUnusedDataFor: 60,
      transformResponse: (response: any) => {
        // Handle wrapped response from backend TransformInterceptor
        let actualResponse: PaginatedResponse<School>;

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
          data: actualResponse.data.map(school => ({
            ...school,
            createdAt: new Date(school.createdAt),
            updatedAt: new Date(school.updatedAt),
          })),
        };
      },
    }),

    // Get single school with details
    getSchoolById: builder.query<School, string>({
      query: (id) => `/organizations/schools/${id}`,
      providesTags: (result, error, id) => [{ type: 'School', id }],
      transformResponse: (response: School) => ({
        ...response,
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
      }),
    }),

    // Get schools by organization
    getSchoolsByOrganization: builder.query<School[], string>({
      query: (organizationId) => `/organizations/${organizationId}/schools`,
      providesTags: (result, error, organizationId) => [
        { type: 'School', id: `org-${organizationId}` },
        'School'
      ],
      transformResponse: (response: School[]) =>
        response.map(school => ({
          ...school,
          createdAt: new Date(school.createdAt),
          updatedAt: new Date(school.updatedAt),
        })),
    }),

    // Get school departments
    getSchoolDepartments: builder.query<any[], string>({
      query: (schoolId) => `/organizations/schools/${schoolId}/departments`,
      providesTags: (result, error, schoolId) => [
        { type: 'School', id: `${schoolId}-departments` },
        'Department'
      ],
    }),

    // Get school statistics
    getSchoolStats: builder.query<{
      totalStudents: number;
      totalTeachers: number;
      totalDepartments: number;
      activePrograms: number;
      completionRate: number;
    }, string>({
      query: (id) => `/organizations/schools/${id}/stats`,
      providesTags: (result, error, id) => [
        { type: 'School', id: `${id}-stats` }
      ],
      keepUnusedDataFor: 600,
    }),

    // Get school academic periods
    getSchoolAcademicPeriods: builder.query<any[], string>({
      query: (schoolId) => `/organizations/schools/${schoolId}/academic-periods`,
      providesTags: (result, error, schoolId) => [
        { type: 'School', id: `${schoolId}-periods` }
      ],
    }),

    // Get bagian kerja jenjang list for school code options
    getBagianKerjaJenjangList: builder.query<string[], void>({
      query: () => '/organizations/schools/bagian-kerja-jenjang',
      keepUnusedDataFor: 3600, // Cache for 1 hour
      transformResponse: (response: any) => {
        console.log('📡 [schoolApi] getBagianKerjaJenjangList Raw Response:', {
          response,
          responseType: typeof response,
          hasSuccess: response && 'success' in response,
          hasData: response && 'data' in response,
          isArray: Array.isArray(response),
        });

        // Handle wrapped response from backend TransformInterceptor
        if (response && response.success && response.data) {
          console.log('✅ [schoolApi] Using wrapped response.data:', response.data);
          return response.data;
        }

        // Return response directly if not wrapped, or empty array as fallback
        const result = Array.isArray(response) ? response : [];
        console.log('✅ [schoolApi] Using direct array or fallback:', result);
        return result;
      },
    }),

    // ===== MUTATIONS =====

    // Create new school
    createSchool: builder.mutation<School, Partial<School>>({
      query: (school) => ({
        url: '/organizations/schools',
        method: 'POST',
        body: school,
      }),
      invalidatesTags: [
        { type: 'School', id: 'LIST' },
        'Organization'
      ],
      // Optimistic update
      async onQueryStarted(school, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          schoolApi.util.updateQueryData('getSchools', {}, (draft) => {
            const tempSchool = {
              ...school,
              id: `temp-${Date.now()}`,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as School;
            draft.data.unshift(tempSchool);
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

    // Update school
    updateSchool: builder.mutation<School, { id: string; data: Partial<School> }>({
      query: ({ id, data }) => ({
        url: `/organizations/schools/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'School', id },
        { type: 'School', id: 'LIST' },
        { type: 'School', id: `${id}-stats` },
      ],
      // Optimistic update
      async onQueryStarted({ id, data }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          schoolApi.util.updateQueryData('getSchoolById', id, (draft) => {
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

    // Delete school
    deleteSchool: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/organizations/schools/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'School', id },
        { type: 'School', id: 'LIST' },
        'Organization'
      ],
    }),

    // Update school status
    updateSchoolStatus: builder.mutation<
      School,
      { id: string; isActive: boolean }
    >({
      query: ({ id, isActive }) => ({
        url: `/organizations/schools/${id}/status`,
        method: 'PATCH',
        body: { isActive },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'School', id },
        { type: 'School', id: 'LIST' },
      ],
    }),

    // Bulk update schools
    bulkUpdateSchools: builder.mutation<
      { success: boolean; updated: number },
      { ids: string[]; data: Partial<School> }
    >({
      query: ({ ids, data }) => ({
        url: '/organizations/schools/bulk-update',
        method: 'PATCH',
        body: { ids, data },
      }),
      invalidatesTags: (result, error, { ids }) => [
        ...ids.map(id => ({ type: 'School' as const, id })),
        { type: 'School', id: 'LIST' },
      ],
    }),

    // Archive school
    archiveSchool: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/organizations/schools/${id}/archive`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'School', id },
        { type: 'School', id: 'LIST' },
      ],
    }),

    // Restore archived school
    restoreSchool: builder.mutation<School, string>({
      query: (id) => ({
        url: `/organizations/schools/${id}/restore`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'School', id },
        { type: 'School', id: 'LIST' },
      ],
    }),

    // Update school settings
    updateSchoolSettings: builder.mutation<
      School,
      { id: string; settings: Record<string, any> }
    >({
      query: ({ id, settings }) => ({
        url: `/organizations/schools/${id}/settings`,
        method: 'PUT',
        body: settings,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'School', id },
      ],
    }),

    // Upload school logo
    uploadSchoolLogo: builder.mutation<
      { url: string },
      { id: string; logo: FormData }
    >({
      query: ({ id, logo }) => ({
        url: `/organizations/schools/${id}/logo`,
        method: 'POST',
        body: logo,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'School', id },
      ],
    }),

    // Associate school with organization
    associateSchoolWithOrganization: builder.mutation<
      School,
      { schoolId: string; organizationId: string }
    >({
      query: ({ schoolId, organizationId }) => ({
        url: `/organizations/schools/${schoolId}/organization`,
        method: 'PUT',
        body: { organizationId },
      }),
      invalidatesTags: (result, error, { schoolId, organizationId }) => [
        { type: 'School', id: schoolId },
        { type: 'School', id: `org-${organizationId}` },
        'Organization',
      ],
    }),

    // Import schools from file
    importSchools: builder.mutation<
      { success: boolean; imported: number; failed: number; errors?: any[] },
      FormData
    >({
      query: (formData) => ({
        url: '/organizations/schools/import',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [{ type: 'School', id: 'LIST' }],
    }),

    // Export schools data
    exportSchools: builder.query<
      Blob,
      { format: 'csv' | 'excel' | 'pdf'; filters?: QueryParams }
    >({
      query: ({ format, filters = {} }) => ({
        url: '/organizations/schools/export',
        params: {
          format,
          ...filters,
        },
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
  overrideExisting: false,
});

// Export hooks for usage in functional components
export const {
  useGetSchoolsQuery,
  useLazyGetSchoolsQuery,
  useGetSchoolByIdQuery,
  useGetSchoolsByOrganizationQuery,
  useGetSchoolDepartmentsQuery,
  useGetSchoolStatsQuery,
  useGetSchoolAcademicPeriodsQuery,
  useGetBagianKerjaJenjangListQuery,
  useCreateSchoolMutation,
  useUpdateSchoolMutation,
  useDeleteSchoolMutation,
  useUpdateSchoolStatusMutation,
  useBulkUpdateSchoolsMutation,
  useArchiveSchoolMutation,
  useRestoreSchoolMutation,
  useUpdateSchoolSettingsMutation,
  useUploadSchoolLogoMutation,
  useAssociateSchoolWithOrganizationMutation,
  useImportSchoolsMutation,
  useLazyExportSchoolsQuery,
} = schoolApi;

// Export endpoints for server-side usage
export const { endpoints: schoolEndpoints } = schoolApi;