import { apiSlice } from "./apiSliceWithHook";
import { User, PaginatedResponse, QueryParams } from "@/types";

export const userApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get paginated list of users
    getUsers: builder.query<PaginatedResponse<User>, QueryParams>({
      query: (params = {}) => ({
        url: "/users",
        params: {
          page: params.page || 1,
          limit: params.limit || 10,
          search: params.search || "",
          sortBy: params.sortBy || "createdAt",
          sortOrder: params.sortOrder || "desc",
          ...params,
        },
      }),
      transformResponse: (response: any): PaginatedResponse<User> => {
        // Handle backend response structure with nested pagination
        if (response && response.pagination) {
          return {
            data: Array.isArray(response.data) ? response.data : [],
            total: response.pagination.total || 0,
            page: response.pagination.page || 1,
            limit: response.pagination.limit || 10,
            totalPages: response.pagination.totalPages || 0,
          };
        }
        // Handle if response is already in correct format
        if (response && Array.isArray(response.data)) {
          return {
            data: response.data,
            total: response.total || 0,
            page: response.page || 1,
            limit: response.limit || 10,
            totalPages: response.totalPages || 0,
          };
        }
        // Fallback for malformed or empty responses
        return {
          data: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        };
      },
      providesTags: (result) =>
        result && result.data && Array.isArray(result.data)
          ? [
              ...result.data.map(({ id }) => ({ type: "User" as const, id })),
              { type: "User", id: "LIST" },
            ]
          : [{ type: "User", id: "LIST" }],
    }),

    // Get single user by ID
    getUserById: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      providesTags: (_result, _error, id) => [{ type: "User", id }],
    }),

    // Get current authenticated user
    getCurrentUser: builder.query<User, void>({
      query: () => "/users/me",
      providesTags: (result) =>
        result ? [{ type: "User", id: result.id }, "User"] : ["User"],
    }),

    // Create new user with optimistic update
    createUser: builder.mutation<User, Partial<User>>({
      query: (user) => ({
        url: "/users",
        method: "POST",
        body: user,
      }),
      // Optimistic update
      async onQueryStarted(user, { dispatch, queryFulfilled }) {
        // Generate a temporary ID for the optimistic update
        const tempId = `temp-${Date.now()}`;
        const optimisticUser = {
          ...user,
          id: tempId,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as User;

        // Add user to list immediately
        const patchResult = dispatch(
          userApi.util.updateQueryData(
            "getUsers",
            {} as QueryParams,
            (draft) => {
              if (draft?.data && Array.isArray(draft.data)) {
                draft.data.unshift(optimisticUser);
                draft.total = (draft.total || 0) + 1;
              }
            }
          )
        );

        try {
          const { data } = await queryFulfilled;
          // Replace temporary user with real user
          dispatch(
            userApi.util.updateQueryData(
              "getUsers",
              {} as QueryParams,
              (draft) => {
                if (draft?.data && Array.isArray(draft.data)) {
                  const index = draft.data.findIndex((u) => u.id === tempId);
                  if (index !== -1) {
                    draft.data[index] = data;
                  }
                }
              }
            )
          );
        } catch {
          // Undo the optimistic update on error
          patchResult.undo();
        }
      },
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),

    // Update existing user with optimistic update
    updateUser: builder.mutation<User, { id: string; data: Partial<User> }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: "PATCH",
        body: data,
      }),
      // Optimistic update
      async onQueryStarted({ id, data }, { dispatch, queryFulfilled }) {
        // Update the cached user immediately
        const userPatchResult = dispatch(
          userApi.util.updateQueryData("getUserById", id, (draft) => {
            Object.assign(draft, data);
          })
        );

        // Also update the user in the list if present
        const listPatchResult = dispatch(
          userApi.util.updateQueryData(
            "getUsers",
            {} as QueryParams,
            (draft) => {
              if (draft?.data && Array.isArray(draft.data)) {
                const user = draft.data.find((u) => u.id === id);
                if (user) {
                  Object.assign(user, data);
                }
              }
            }
          )
        );

        try {
          await queryFulfilled;
        } catch {
          // Undo the optimistic update on error
          userPatchResult.undo();
          listPatchResult.undo();
        }
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),

    // Delete user with optimistic update
    deleteUser: builder.mutation<{ success: boolean; message: string }, string>(
      {
        query: (id) => ({
          url: `/users/${id}`,
          method: "DELETE",
        }),
        // Optimistic update
        async onQueryStarted(id, { dispatch, queryFulfilled }) {
          // Remove user from list immediately
          const patchResult = dispatch(
            userApi.util.updateQueryData(
              "getUsers",
              {} as QueryParams,
              (draft) => {
                if (draft?.data && Array.isArray(draft.data)) {
                  draft.data = draft.data.filter((user) => user.id !== id);
                  draft.total = Math.max(0, (draft.total || 0) - 1);
                }
              }
            )
          );

          try {
            await queryFulfilled;
          } catch {
            // Undo the optimistic update on error
            patchResult.undo();
          }
        },
        invalidatesTags: (_result, _error, id) => [
          { type: "User", id },
          { type: "User", id: "LIST" },
        ],
      }
    ),

    // Bulk operations
    bulkDeleteUsers: builder.mutation<
      { success: boolean; message: string; deleted: number },
      string[]
    >({
      query: (ids) => ({
        url: "/users/bulk-delete",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),

    // Update user status (activate/deactivate) with optimistic update
    updateUserStatus: builder.mutation<User, { id: string; isActive: boolean }>(
      {
        query: ({ id, isActive }) => ({
          url: `/users/${id}/status`,
          method: "PATCH",
          body: { isActive },
        }),
        // Optimistic update
        async onQueryStarted({ id, isActive }, { dispatch, queryFulfilled }) {
          // Update the user status immediately
          const userPatchResult = dispatch(
            userApi.util.updateQueryData("getUserById", id, (draft) => {
              (draft as any).isActive = isActive;
            })
          );

          // Also update in the list
          const listPatchResult = dispatch(
            userApi.util.updateQueryData(
              "getUsers",
              {} as QueryParams,
              (draft) => {
                if (draft?.data && Array.isArray(draft.data)) {
                  const user = draft.data.find((u) => u.id === id);
                  if (user) {
                    (user as any).isActive = isActive;
                  }
                }
              }
            )
          );

          try {
            await queryFulfilled;
          } catch {
            // Undo the optimistic update on error
            userPatchResult.undo();
            listPatchResult.undo();
          }
        },
        invalidatesTags: (_result, _error, { id }) => [
          { type: "User", id },
          { type: "User", id: "LIST" },
        ],
      }
    ),

    // Reset user password
    resetUserPassword: builder.mutation<
      { success: boolean; message: string },
      { id: string; newPassword: string }
    >({
      query: ({ id, newPassword }) => ({
        url: `/users/${id}/reset-password`,
        method: "POST",
        body: { newPassword },
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "User", id }],
    }),

    // Get user permissions
    getUserPermissions: builder.query<string[], string>({
      query: (id) => `/users/${id}/permissions`,
      providesTags: (_result, _error, id) => [
        { type: "User", id: `${id}-permissions` },
      ],
    }),

    // Update user permissions
    updateUserPermissions: builder.mutation<
      { success: boolean; message: string },
      { id: string; permissions: string[] }
    >({
      query: ({ id, permissions }) => ({
        url: `/users/${id}/permissions`,
        method: "PUT",
        body: { permissions },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "User", id: `${id}-permissions` },
        { type: "User", id },
      ],
    }),

    // Export users to CSV/Excel
    exportUsers: builder.query<
      Blob,
      { format: "csv" | "excel"; filters?: QueryParams }
    >({
      query: ({ format, filters = {} }) => ({
        url: "/users/export",
        params: {
          format,
          ...filters,
        },
        responseHandler: (response) => response.blob(),
      }),
    }),

    // Import users from CSV/Excel
    importUsers: builder.mutation<
      { success: boolean; imported: number; failed: number; errors?: any[] },
      FormData
    >({
      query: (formData) => ({
        url: "/users/import",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useGetCurrentUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useBulkDeleteUsersMutation,
  useUpdateUserStatusMutation,
  useResetUserPasswordMutation,
  useGetUserPermissionsQuery,
  useUpdateUserPermissionsMutation,
  useLazyExportUsersQuery,
  useImportUsersMutation,
} = userApi;

// Export endpoints for server-side usage
export const { endpoints: userEndpoints } = userApi;
