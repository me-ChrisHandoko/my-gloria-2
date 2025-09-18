import { apiSlice } from './apiSlice';
import { Position, PaginatedResponse, QueryParams } from '@/types';

// Position API with permission management
export const positionApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ===== QUERIES =====

    // Get paginated positions
    getPositions: builder.query<PaginatedResponse<Position>, QueryParams & {
      departmentId?: string;
      schoolId?: string;
      organizationId?: string;
    }>({
      query: (params = {}) => ({
        url: '/positions',
        params: {
          page: params.page || 1,
          limit: params.limit || 10,
          search: params.search || '',
          sortBy: params.sortBy || 'level',
          sortOrder: params.sortOrder || 'asc',
          departmentId: params.departmentId,
          schoolId: params.schoolId,
          organizationId: params.organizationId,
          isActive: params.isActive,
          ...params
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Position' as const, id })),
              { type: 'Position', id: 'LIST' },
            ]
          : [{ type: 'Position', id: 'LIST' }],
      keepUnusedDataFor: 300,
    }),

    // Get single position
    getPositionById: builder.query<Position, string>({
      query: (id) => `/positions/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Position', id }],
    }),

    // Get positions by department
    getPositionsByDepartment: builder.query<Position[], string>({
      query: (departmentId) => `/departments/${departmentId}/positions`,
      providesTags: (_result, _error, departmentId) => [
        { type: 'Position', id: `dept-${departmentId}` }
      ],
    }),

    // Get position hierarchy
    getPositionHierarchy: builder.query<Position[], string>({
      query: (organizationId) => `/organizations/${organizationId}/position-hierarchy`,
      providesTags: (_result, _error, organizationId) => [
        { type: 'Position', id: `hierarchy-${organizationId}` }
      ],
    }),

    // Get position holders (users in this position)
    getPositionHolders: builder.query<any[], string>({
      query: (positionId) => `/positions/${positionId}/holders`,
      providesTags: (_result, _error, positionId) => [
        { type: 'Position', id: `${positionId}-holders` }
      ],
    }),

    // Get position permissions
    getPositionPermissions: builder.query<string[], string>({
      query: (positionId) => `/positions/${positionId}/permissions`,
      providesTags: (_result, _error, positionId) => [
        { type: 'Position', id: `${positionId}-permissions` }
      ],
    }),

    // ===== MUTATIONS =====

    // Create position
    createPosition: builder.mutation<Position, Partial<Position>>({
      query: (position) => ({
        url: '/positions',
        method: 'POST',
        body: position,
      }),
      invalidatesTags: [
        { type: 'Position', id: 'LIST' },
        'Department'
      ],
      // Optimistic update
      async onQueryStarted(position, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          positionApi.util.updateQueryData('getPositions', {}, (draft) => {
            const tempPosition = {
              ...position,
              id: `temp-${Date.now()}`,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as Position;
            draft.data.unshift(tempPosition);
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

    // Update position
    updatePosition: builder.mutation<Position, { id: string; data: Partial<Position> }>({
      query: ({ id, data }) => ({
        url: `/positions/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Position', id },
        { type: 'Position', id: 'LIST' },
      ],
      // Optimistic update
      async onQueryStarted({ id, data }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          positionApi.util.updateQueryData('getPositionById', id, (draft) => {
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

    // Delete position
    deletePosition: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/positions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Position', id },
        { type: 'Position', id: 'LIST' },
        'Department'
      ],
    }),

    // Update position permissions
    updatePositionPermissions: builder.mutation<
      { success: boolean; permissions: string[] },
      { id: string; permissions: string[] }
    >({
      query: ({ id, permissions }) => ({
        url: `/positions/${id}/permissions`,
        method: 'PUT',
        body: { permissions },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Position', id },
        { type: 'Position', id: `${id}-permissions` },
      ],
    }),

    // Update position level
    updatePositionLevel: builder.mutation<
      Position,
      { id: string; level: number }
    >({
      query: ({ id, level }) => ({
        url: `/positions/${id}/level`,
        method: 'PATCH',
        body: { level },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Position', id },
        { type: 'Position', id: 'LIST' },
      ],
    }),

    // Bulk update positions
    bulkUpdatePositions: builder.mutation<
      { success: boolean; updated: number },
      { ids: string[]; data: Partial<Position> }
    >({
      query: ({ ids, data }) => ({
        url: '/positions/bulk-update',
        method: 'PATCH',
        body: { ids, data },
      }),
      invalidatesTags: (_result, _error, { ids }) => [
        ...ids.map(id => ({ type: 'Position' as const, id })),
        { type: 'Position', id: 'LIST' },
      ],
    }),

    // Clone position
    clonePosition: builder.mutation<
      Position,
      { id: string; newName: string; targetDepartmentId?: string }
    >({
      query: ({ id, newName, targetDepartmentId }) => ({
        url: `/positions/${id}/clone`,
        method: 'POST',
        body: { newName, targetDepartmentId },
      }),
      invalidatesTags: [
        { type: 'Position', id: 'LIST' },
        'Department'
      ],
    }),

    // Assign user to position
    assignUserToPosition: builder.mutation<
      { success: boolean },
      { positionId: string; userId: string }
    >({
      query: ({ positionId, userId }) => ({
        url: `/positions/${positionId}/assign`,
        method: 'POST',
        body: { userId },
      }),
      invalidatesTags: (_result, _error, { positionId }) => [
        { type: 'Position', id: `${positionId}-holders` },
        'User'
      ],
    }),

    // Remove user from position
    removeUserFromPosition: builder.mutation<
      { success: boolean },
      { positionId: string; userId: string }
    >({
      query: ({ positionId, userId }) => ({
        url: `/positions/${positionId}/remove`,
        method: 'POST',
        body: { userId },
      }),
      invalidatesTags: (_result, _error, { positionId }) => [
        { type: 'Position', id: `${positionId}-holders` },
        'User'
      ],
    }),
  }),
  overrideExisting: false,
});

// Export hooks
export const {
  useGetPositionsQuery,
  useLazyGetPositionsQuery,
  useGetPositionByIdQuery,
  useGetPositionsByDepartmentQuery,
  useGetPositionHierarchyQuery,
  useGetPositionHoldersQuery,
  useGetPositionPermissionsQuery,
  useCreatePositionMutation,
  useUpdatePositionMutation,
  useDeletePositionMutation,
  useUpdatePositionPermissionsMutation,
  useUpdatePositionLevelMutation,
  useBulkUpdatePositionsMutation,
  useClonePositionMutation,
  useAssignUserToPositionMutation,
  useRemoveUserFromPositionMutation,
} = positionApi;

// Export endpoints
export const { endpoints: positionEndpoints } = positionApi;