import { apiSlice } from './apiSliceWithHook';
import {
  RoleModuleAccess,
  GrantRoleAccessDto,
  CheckRoleAccessResponse,
} from '@/lib/api/services/role-module-access.service';

// Role Module Access API slice
export const roleModuleAccessApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ===== QUERIES =====

    // Get all module access for a role
    getRoleModuleAccess: builder.query<RoleModuleAccess[], string>({
      query: (roleId) => `/modules/role-access/role/${roleId}`,
      transformResponse: (response: any) => {
        if (response && response.success && response.data) {
          return response.data;
        }
        return response || [];
      },
      providesTags: (_result, _error, roleId) => [
        { type: 'RoleModuleAccess', id: `role-${roleId}` },
        { type: 'RoleModuleAccess', id: 'LIST' },
      ],
    }),

    // Check role access to a module
    checkRoleModuleAccess: builder.query<
      CheckRoleAccessResponse,
      { roleId: string; moduleId: string; accessType: 'read' | 'write' | 'delete' | 'share' }
    >({
      query: ({ roleId, moduleId, accessType }) =>
        `/modules/role-access/check/${roleId}/${moduleId}/${accessType}`,
      transformResponse: (response: any) => {
        if (response && response.success && response.data) {
          return response.data;
        }
        return response || { hasAccess: false };
      },
      providesTags: (_result, _error, { roleId, moduleId }) => [
        { type: 'RoleModuleAccess', id: `check-${roleId}-${moduleId}` },
      ],
    }),

    // ===== MUTATIONS =====

    // Grant module access to role
    grantRoleModuleAccess: builder.mutation<RoleModuleAccess, GrantRoleAccessDto>({
      query: (data) => ({
        url: '/modules/role-access/grant',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'RoleModuleAccess', id: `role-${arg.roleId}` },
        { type: 'RoleModuleAccess', id: 'LIST' },
      ],
    }),

    // Revoke module access from role
    revokeRoleModuleAccess: builder.mutation<void, { roleId: string; moduleId: string }>({
      query: ({ roleId, moduleId }) => ({
        url: `/modules/role-access/${roleId}/${moduleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: 'RoleModuleAccess', id: `role-${roleId}` },
        { type: 'RoleModuleAccess', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

// Export hooks
export const {
  useGetRoleModuleAccessQuery,
  useLazyGetRoleModuleAccessQuery,
  useCheckRoleModuleAccessQuery,
  useGrantRoleModuleAccessMutation,
  useRevokeRoleModuleAccessMutation,
} = roleModuleAccessApi;

// Export endpoints
export const { endpoints: roleModuleAccessEndpoints } = roleModuleAccessApi;
