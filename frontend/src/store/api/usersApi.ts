/**
 * Users API - RTK Query Endpoints
 *
 * This file implements RTK Query endpoints for user management.
 * Provides endpoints for listing, searching, and managing users.
 */

import { apiSlice } from './apiSliceWithHook';

// ============================================================================
// Type Definitions
// ============================================================================

export interface User {
  id: string;
  clerkUserId: string;
  nip: string;
  name: string;
  email: string;
  isActive: boolean;
  lastActive?: string;
  preferences?: any;
  createdAt: string;
  updatedAt: string;
  // Relations (optional)
  dataKaryawan?: any;
  roles?: any[];
  positions?: any[];
}

export interface PaginatedUsersResponse {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface GetUsersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateUserDto {
  nip?: string;
  name?: string;
  email?: string;
  isActive?: boolean;
  lastActive?: string;
  preferences?: any;
}

// ============================================================================
// API Endpoints
// ============================================================================

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get all users with pagination and filtering
     *
     * Backend: GET /api/v1/users
     *
     * @example
     * ```tsx
     * const { data: users, isLoading } = useGetUsersQuery({
     *   page: 1,
     *   limit: 10,
     *   search: 'john',
     *   isActive: true
     * });
     * ```
     */
    getUsers: builder.query<PaginatedUsersResponse, GetUsersQueryParams | void>({
      query: (params = {}) => {
        const queryParams: Record<string, any> = {};

        // Add optional parameters if they have values
        if (params.page) queryParams.page = params.page;
        if (params.limit) queryParams.limit = params.limit;
        if (params.search) queryParams.search = params.search;
        if (params.isActive !== undefined) queryParams.isActive = params.isActive;
        if (params.sortBy) queryParams.sortBy = params.sortBy;
        if (params.sortOrder) queryParams.sortOrder = params.sortOrder;

        return {
          url: '/users',
          params: queryParams,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'User' as const, id })),
              { type: 'User', id: 'LIST' },
            ]
          : [{ type: 'User', id: 'LIST' }],
      keepUnusedDataFor: 60,
    }),

    /**
     * Get a single user by ID
     *
     * Backend: GET /api/v1/users/:id
     *
     * @example
     * ```tsx
     * const { data: user } = useGetUserQuery('user-id-123');
     * ```
     */
    getUser: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),

    /**
     * Get current user profile
     *
     * Backend: GET /api/v1/users/me
     *
     * @example
     * ```tsx
     * const { data: currentUser } = useGetCurrentUserQuery();
     * ```
     */
    getCurrentUser: builder.query<User, void>({
      query: () => '/users/me',
      providesTags: [{ type: 'User', id: 'ME' }],
    }),

    /**
     * Update an existing user
     *
     * Backend: PATCH /api/v1/users/:id
     *
     * @example
     * ```tsx
     * const [updateUser] = useUpdateUserMutation();
     * await updateUser({
     *   id: 'user-id-123',
     *   fullName: 'John Updated'
     * });
     * ```
     */
    updateUser: builder.mutation<User, { id: string } & UpdateUserDto>({
      query: ({ id, ...data }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    /**
     * Delete a user
     *
     * Backend: DELETE /api/v1/users/:id
     *
     * @example
     * ```tsx
     * const [deleteUser] = useDeleteUserMutation();
     * await deleteUser('user-id-123');
     * ```
     */
    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

// ============================================================================
// Export Auto-Generated RTK Query Hooks
// ============================================================================

/**
 * Users Management Hooks
 *
 * Query Hooks:
 * - useGetUsersQuery: Fetch all users with pagination and filtering
 * - useGetUserQuery: Fetch single user by ID
 * - useGetCurrentUserQuery: Fetch current authenticated user
 * - useLazyGetUsersQuery: Manually trigger users fetch
 * - useLazyGetUserQuery: Manually trigger single user fetch
 *
 * Mutation Hooks:
 * - useUpdateUserMutation: Update existing user
 * - useDeleteUserMutation: Delete user
 *
 * Note: User creation is handled automatically via Clerk authentication sync.
 * Manual user creation endpoint is not exposed in the frontend.
 *
 * All hooks are auto-generated by RTK Query with:
 * - Automatic caching and cache invalidation
 * - Loading and error states
 * - Request deduplication
 * - Optimistic updates support
 */
export const {
  // Query hooks
  useGetUsersQuery,
  useGetUserQuery,
  useGetCurrentUserQuery,
  useLazyGetUsersQuery,
  useLazyGetUserQuery,

  // Mutation hooks
  useUpdateUserMutation,
  useDeleteUserMutation,
} = usersApi;

// Export endpoints for programmatic use
export const { endpoints: usersEndpoints } = usersApi;
