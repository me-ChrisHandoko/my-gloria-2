import { apiSlice } from './apiSliceWithHook';
import type {
  ResourcePermission,
  GrantResourcePermissionDto,
  RevokeResourcePermissionDto,
  ResourcePermissionQueryParams,
} from '@/lib/api/services/resource-permissions.service';

export const resourcePermissionApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get user's resource permissions
    getUserResourcePermissions: builder.query<
      { data: ResourcePermission[]; meta: { total: number; page: number; limit: number } },
      { userProfileId: string; resourceType?: string; page?: number; limit?: number }
    >({
      query: ({ userProfileId, resourceType, page = 1, limit = 10 }) => ({
        url: `/resource-permissions/user/${userProfileId}`,
        params: { resourceType, page, limit },
      }),
      providesTags: (result, error, { userProfileId }) => [
        { type: 'ResourcePermission', id: `USER-${userProfileId}` },
        { type: 'ResourcePermission', id: 'LIST' },
      ],
    }),

    // Get users with permission on resource
    getResourceUsers: builder.query<
      { data: ResourcePermission[]; meta: { total: number } },
      { resourceType: string; resourceId: string; page?: number; limit?: number }
    >({
      query: ({ resourceType, resourceId, page = 1, limit = 10 }) => ({
        url: `/resource-permissions/resource/${resourceType}/${resourceId}`,
        params: { page, limit },
      }),
      providesTags: (result, error, { resourceType, resourceId }) => [
        { type: 'ResourcePermission', id: `RESOURCE-${resourceType}-${resourceId}` },
        { type: 'ResourcePermission', id: 'LIST' },
      ],
    }),

    // Grant resource permission
    grantResourcePermission: builder.mutation<
      ResourcePermission,
      GrantResourcePermissionDto
    >({
      query: (data) => ({
        url: '/resource-permissions/grant',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { userProfileId, resourceType, resourceId }) => [
        { type: 'ResourcePermission', id: `USER-${userProfileId}` },
        { type: 'ResourcePermission', id: `RESOURCE-${resourceType}-${resourceId}` },
        { type: 'ResourcePermission', id: 'LIST' },
      ],
    }),

    // Revoke resource permission
    revokeResourcePermission: builder.mutation<
      void,
      RevokeResourcePermissionDto
    >({
      query: (data) => ({
        url: '/resource-permissions/revoke',
        method: 'DELETE',
        body: data,
      }),
      invalidatesTags: (result, error, { userProfileId, resourceType, resourceId }) => [
        { type: 'ResourcePermission', id: `USER-${userProfileId}` },
        { type: 'ResourcePermission', id: `RESOURCE-${resourceType}-${resourceId}` },
        { type: 'ResourcePermission', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetUserResourcePermissionsQuery,
  useGetResourceUsersQuery,
  useGrantResourcePermissionMutation,
  useRevokeResourcePermissionMutation,
} = resourcePermissionApi;
