import { apiSlice } from './apiSliceWithHook';
import { Department, PaginatedResponse, QueryParams } from '@/types';

// Department API with hierarchical structure support
export const departmentApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ===== QUERIES =====

    // Get paginated departments
    getDepartments: builder.query<PaginatedResponse<Department>, QueryParams & {
      schoolId?: string;
      includeSchool?: boolean;
      includeParent?: boolean;
    }>({
      query: (params = {}) => {
        // Build query params conditionally to avoid sending undefined values
        const queryParams: Record<string, any> = {
          page: params.page || 1,
          limit: params.limit || 10,
          sortOrder: params.sortOrder || 'asc',
        };

        // Only add optional parameters if they have values
        // Map 'search' to 'name' for partial name matching as backend expects
        if (params.search) queryParams.name = params.search;
        // Let backend use its default sortBy ('hierarchy') unless explicitly provided
        if (params.sortBy) queryParams.sortBy = params.sortBy;
        if (params.schoolId) queryParams.schoolId = params.schoolId;
        // Critical: only add isActive when it's defined (not undefined)
        // This ensures "All Status" filter works correctly by omitting the parameter
        if (params.isActive !== undefined) queryParams.isActive = params.isActive;
        if (params.includeSchool) queryParams.includeSchool = params.includeSchool;
        if (params.includeParent) queryParams.includeParent = params.includeParent;

        return {
          url: '/organizations/departments',
          params: queryParams,
        };
      },
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

        return {
          ...response,
          data: response.data.map((dept: any) => ({
            ...dept,
            createdAt: new Date(dept.createdAt),
            updatedAt: new Date(dept.updatedAt),
          })),
        };
      },
      providesTags: (result) =>
        result && Array.isArray(result.data)
          ? [
              ...result.data.map(({ id }) => ({ type: 'Department' as const, id })),
              { type: 'Department', id: 'LIST' },
            ]
          : [{ type: 'Department', id: 'LIST' }],
      // Reduced from 300s to 60s to prevent state bloat from multiple cached queries
      keepUnusedDataFor: 60,
    }),

    // Get single department
    getDepartmentById: builder.query<Department, string>({
      query: (id) => `/organizations/departments/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Department', id }],
    }),

    // Get department hierarchy
    getDepartmentHierarchy: builder.query<Department[], string>({
      query: (id) => `/organizations/departments/${id}/hierarchy`,
      providesTags: (_result, _error, id) => [
        { type: 'Department', id: `${id}-hierarchy` }
      ],
    }),

    // Get departments by school
    getDepartmentsBySchool: builder.query<PaginatedResponse<Department>, string>({
      query: (schoolId) => ({
        url: '/organizations/departments',
        params: {
          schoolId,
          limit: 100,
          includeSchool: true,
          includeParent: true,
        },
      }),
      // Transform response to handle date conversions
      // baseQueryWithReauth already unwraps the success layer
      transformResponse: (response: any) => {
        // Validate response structure
        if (!response || !Array.isArray(response.data)) {
          return {
            data: [],
            total: 0,
            page: 1,
            limit: 1000,
            totalPages: 0,
          };
        }

        return {
          ...response,
          data: response.data.map((dept: any) => ({
            ...dept,
            createdAt: new Date(dept.createdAt),
            updatedAt: new Date(dept.updatedAt),
          })),
        };
      },
      providesTags: (_result, _error, schoolId) => [
        { type: 'Department', id: `school-${schoolId}` }
      ],
    }),

    // Get department positions
    getDepartmentPositions: builder.query<any[], string>({
      query: (departmentId) => `/organizations/departments/${departmentId}/positions`,
      providesTags: (_result, _error, departmentId) => [
        { type: 'Department', id: `${departmentId}-positions` },
        'Position'
      ],
    }),

    // Get department members
    getDepartmentMembers: builder.query<any[], string>({
      query: (departmentId) => `/organizations/departments/${departmentId}/members`,
      providesTags: (_result, _error, departmentId) => [
        { type: 'Department', id: `${departmentId}-members` }
      ],
    }),

    // Get department statistics
    getDepartmentStats: builder.query<{
      totalMembers: number;
      totalPositions: number;
      activeProjects: number;
      completionRate: number;
    }, string>({
      query: (id) => `/organizations/departments/${id}/stats`,
      providesTags: (_result, _error, id) => [
        { type: 'Department', id: `${id}-stats` }
      ],
      keepUnusedDataFor: 600,
    }),

    // Get department code options
    getDepartmentCodeOptions: builder.query<string[], void>({
      query: () => '/organizations/departments/code-options',
      transformResponse: (response: any) => {
        // Handle wrapped response from backend TransformInterceptor
        if (response && response.success && response.data) {
          return response.data;
        }
        return response || [];
      },
      providesTags: [{ type: 'Department', id: 'CODE_OPTIONS' }],
      keepUnusedDataFor: 3600, // Cache for 1 hour
    }),

    // ===== MUTATIONS =====

    // Create department
    createDepartment: builder.mutation<Department, Partial<Department>>({
      query: (department) => ({
        url: '/organizations/departments',
        method: 'POST',
        body: department,
      }),
      invalidatesTags: [
        { type: 'Department', id: 'LIST' },
        'School'
      ],
      // Optimistic update
      async onQueryStarted(department, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          departmentApi.util.updateQueryData('getDepartments', {}, (draft) => {
            const tempDept = {
              ...department,
              id: `temp-${Date.now()}`,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as Department;
            draft.data.unshift(tempDept);
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

    // Update department
    updateDepartment: builder.mutation<Department, { id: string; data: Partial<Department> }>({
      query: ({ id, data }) => ({
        url: `/organizations/departments/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Department', id },
        { type: 'Department', id: 'LIST' },
      ],
      // Optimistic update
      async onQueryStarted({ id, data }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          departmentApi.util.updateQueryData('getDepartmentById', id, (draft) => {
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

    // Delete department
    deleteDepartment: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/organizations/departments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Department', id },
        { type: 'Department', id: 'LIST' },
        'School'
      ],
    }),

    // Update department status
    updateDepartmentStatus: builder.mutation<
      Department,
      { id: string; isActive: boolean }
    >({
      query: ({ id, isActive }) => ({
        url: `/departments/${id}/status`,
        method: 'PATCH',
        body: { isActive },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Department', id },
        { type: 'Department', id: 'LIST' },
      ],
    }),

    // Assign department head
    assignDepartmentHead: builder.mutation<
      Department,
      { departmentId: string; userId: string }
    >({
      query: ({ departmentId, userId }) => ({
        url: `/departments/${departmentId}/head`,
        method: 'PUT',
        body: { userId },
      }),
      invalidatesTags: (_result, _error, { departmentId }) => [
        { type: 'Department', id: departmentId },
        { type: 'Department', id: `${departmentId}-members` },
      ],
    }),

    // Bulk update departments
    bulkUpdateDepartments: builder.mutation<
      { success: boolean; updated: number },
      { ids: string[]; data: Partial<Department> }
    >({
      query: ({ ids, data }) => ({
        url: '/departments/bulk-update',
        method: 'PATCH',
        body: { ids, data },
      }),
      invalidatesTags: (_result, _error, { ids }) => [
        ...ids.map(id => ({ type: 'Department' as const, id })),
        { type: 'Department', id: 'LIST' },
      ],
    }),

    // Move department (change parent)
    moveDepartment: builder.mutation<
      Department,
      { id: string; newParentId: string | null }
    >({
      query: ({ id, newParentId }) => ({
        url: `/departments/${id}/move`,
        method: 'PUT',
        body: { parentId: newParentId },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Department', id },
        { type: 'Department', id: `${id}-hierarchy` },
        { type: 'Department', id: 'LIST' },
      ],
    }),

    // Merge departments
    mergeDepartments: builder.mutation<
      Department,
      { sourceIds: string[]; targetId: string }
    >({
      query: ({ sourceIds, targetId }) => ({
        url: '/departments/merge',
        method: 'POST',
        body: { sourceIds, targetId },
      }),
      invalidatesTags: [
        { type: 'Department', id: 'LIST' },
        'School'
      ],
    }),
  }),
  overrideExisting: false,
});

// Export hooks
export const {
  useGetDepartmentsQuery,
  useLazyGetDepartmentsQuery,
  useGetDepartmentByIdQuery,
  useGetDepartmentHierarchyQuery,
  useGetDepartmentsBySchoolQuery,
  useGetDepartmentPositionsQuery,
  useGetDepartmentMembersQuery,
  useGetDepartmentStatsQuery,
  useGetDepartmentCodeOptionsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useUpdateDepartmentStatusMutation,
  useAssignDepartmentHeadMutation,
  useBulkUpdateDepartmentsMutation,
  useMoveDepartmentMutation,
  useMergeDepartmentsMutation,
} = departmentApi;

// Export endpoints
export const { endpoints: departmentEndpoints } = departmentApi;