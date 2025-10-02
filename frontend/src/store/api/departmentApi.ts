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
      query: (params = {}) => ({
        url: '/organizations/departments',
        params: {
          page: params.page || 1,
          limit: params.limit || 10,
          // Map 'search' to 'name' for partial name matching as backend expects
          name: params.search || undefined,
          sortBy: params.sortBy || 'name',
          sortOrder: params.sortOrder || 'asc',
          schoolId: params.schoolId,
          isActive: params.isActive,
          includeSchool: params.includeSchool,
          includeParent: params.includeParent,
          // Only send parameters that backend QueryDepartmentDto accepts
          // Removed: organizationId, search, and spread operator ...params
        },
      }),
      // Transform response to handle wrapped response from backend TransformInterceptor
      transformResponse: (response: any) => {
        // Handle wrapped response from backend TransformInterceptor
        let actualResponse: PaginatedResponse<Department>;

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
          data: actualResponse.data.map(dept => ({
            ...dept,
            createdAt: new Date(dept.createdAt),
            updatedAt: new Date(dept.updatedAt),
          })),
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Department' as const, id })),
              { type: 'Department', id: 'LIST' },
            ]
          : [{ type: 'Department', id: 'LIST' }],
      keepUnusedDataFor: 300,
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
    getDepartmentsBySchool: builder.query<Department[], string>({
      query: (schoolId) => `/schools/${schoolId}/departments`,
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