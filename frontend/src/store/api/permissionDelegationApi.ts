import { apiSlice } from './apiSliceWithHook';
import {
  PermissionDelegation,
  CreateDelegationDto,
  RevokeDelegationDto,
  DelegationListResponse,
} from '@/lib/api/services/permission-delegation.service';

/**
 * Permission Delegation API
 * RTK Query endpoints for managing permission delegations
 */
export const permissionDelegationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ===== QUERIES =====

    // Get my delegations (as delegator)
    getMyDelegations: builder.query<DelegationListResponse, void>({
      query: () => '/permission-delegation/my-delegations',
      transformResponse: (response: any) => {
        // Handle wrapped response from backend TransformInterceptor
        let actualResponse: DelegationListResponse;

        if (response && response.success && response.data) {
          actualResponse = response.data;
        } else {
          actualResponse = response || { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
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
          data: actualResponse.data.map(delegation => ({
            ...delegation,
            validFrom: new Date(delegation.validFrom),
            validUntil: new Date(delegation.validUntil),
            createdAt: new Date(delegation.createdAt),
            updatedAt: new Date(delegation.updatedAt),
            revokedAt: delegation.revokedAt ? new Date(delegation.revokedAt) : undefined,
          })),
        };
      },
      providesTags: (result) =>
        result && Array.isArray(result.data)
          ? [
              ...result.data.map(({ id }) => ({ type: 'PermissionDelegation' as const, id })),
              { type: 'PermissionDelegation', id: 'MY_DELEGATIONS' },
            ]
          : [{ type: 'PermissionDelegation', id: 'MY_DELEGATIONS' }],
      keepUnusedDataFor: 60,
    }),

    // Get delegations to me (as delegate)
    getDelegatedToMe: builder.query<DelegationListResponse, void>({
      query: () => '/permission-delegation/delegated-to-me',
      transformResponse: (response: any) => {
        // Handle wrapped response from backend TransformInterceptor
        let actualResponse: DelegationListResponse;

        if (response && response.success && response.data) {
          actualResponse = response.data;
        } else {
          actualResponse = response || { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
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
          data: actualResponse.data.map(delegation => ({
            ...delegation,
            validFrom: new Date(delegation.validFrom),
            validUntil: new Date(delegation.validUntil),
            createdAt: new Date(delegation.createdAt),
            updatedAt: new Date(delegation.updatedAt),
            revokedAt: delegation.revokedAt ? new Date(delegation.revokedAt) : undefined,
          })),
        };
      },
      providesTags: (result) =>
        result && Array.isArray(result.data)
          ? [
              ...result.data.map(({ id }) => ({ type: 'PermissionDelegation' as const, id })),
              { type: 'PermissionDelegation', id: 'DELEGATED_TO_ME' },
            ]
          : [{ type: 'PermissionDelegation', id: 'DELEGATED_TO_ME' }],
      keepUnusedDataFor: 60,
    }),

    // ===== MUTATIONS =====

    // Create delegation
    createDelegation: builder.mutation<PermissionDelegation, CreateDelegationDto>({
      query: (delegation) => ({
        url: '/permission-delegation/delegate',
        method: 'POST',
        body: delegation,
      }),
      invalidatesTags: [
        { type: 'PermissionDelegation', id: 'MY_DELEGATIONS' },
        { type: 'PermissionDelegation', id: 'DELEGATED_TO_ME' },
      ],
    }),

    // Revoke delegation
    revokeDelegation: builder.mutation<
      { success: boolean; message: string },
      { id: string; data: RevokeDelegationDto }
    >({
      query: ({ id, data }) => ({
        url: `/permission-delegation/${id}/revoke`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'PermissionDelegation', id },
        { type: 'PermissionDelegation', id: 'MY_DELEGATIONS' },
        { type: 'PermissionDelegation', id: 'DELEGATED_TO_ME' },
      ],
    }),
  }),
  overrideExisting: false,
});

// Export hooks
export const {
  useGetMyDelegationsQuery,
  useLazyGetMyDelegationsQuery,
  useGetDelegatedToMeQuery,
  useLazyGetDelegatedToMeQuery,
  useCreateDelegationMutation,
  useRevokeDelegationMutation,
} = permissionDelegationApi;

// Export endpoints
export const { endpoints: permissionDelegationEndpoints } = permissionDelegationApi;
