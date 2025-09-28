import { apiSlice } from './apiSliceWithHook';
import { AuditLog, FeatureFlag, SystemConfig, PaginatedResponse, QueryParams } from '@/types';

// System Configuration API for audit logs, feature flags, and system settings
export const systemConfigApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ===== AUDIT LOG QUERIES =====

    // Get audit logs
    getAuditLogs: builder.query<PaginatedResponse<AuditLog>, QueryParams & {
      userId?: string;
      resource?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
      organizationId?: string;
    }>({
      query: (params = {}) => ({
        url: '/audit-logs',
        params: {
          page: params.page || 1,
          limit: params.limit || 50,
          sortBy: params.sortBy || 'createdAt',
          sortOrder: params.sortOrder || 'desc',
          userId: params.userId,
          resource: params.resource,
          action: params.action,
          startDate: params.startDate,
          endDate: params.endDate,
          organizationId: params.organizationId,
          ...params
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Audit' as const, id })),
              { type: 'Audit', id: 'LIST' },
            ]
          : [{ type: 'Audit', id: 'LIST' }],
      keepUnusedDataFor: 300,
    }),

    // Get audit log by ID
    getAuditLogById: builder.query<AuditLog, string>({
      query: (id) => `/audit-logs/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Audit', id }],
    }),

    // Get user activity
    getUserActivity: builder.query<AuditLog[], { userId: string; limit?: number }>({
      query: ({ userId, limit = 20 }) => ({
        url: `/users/${userId}/activity`,
        params: { limit },
      }),
      providesTags: (_result, _error, { userId }) => [
        { type: 'Audit', id: `user-${userId}` }
      ],
    }),

    // Get audit statistics
    getAuditStats: builder.query<{
      totalActions: number;
      uniqueUsers: number;
      topActions: Array<{ action: string; count: number }>;
      recentErrors: number;
    }, { organizationId?: string; period?: string }>({
      query: (params = {}) => ({
        url: '/audit-logs/stats',
        params,
      }),
      providesTags: ['Audit'],
      keepUnusedDataFor: 600,
    }),

    // Export audit logs
    exportAuditLogs: builder.query<Blob, {
      format: 'csv' | 'json' | 'pdf';
      filters?: QueryParams & {
        userId?: string;
        resource?: string;
        startDate?: string;
        endDate?: string;
      };
    }>({
      query: ({ format, filters = {} }) => ({
        url: '/audit-logs/export',
        params: {
          format,
          ...filters,
        },
        responseHandler: (response) => response.blob(),
      }),
    }),

    // ===== FEATURE FLAG QUERIES =====

    // Get feature flags
    getFeatureFlags: builder.query<PaginatedResponse<FeatureFlag>, QueryParams & {
      organizationId?: string;
      enabled?: boolean;
    }>({
      query: (params = {}) => ({
        url: '/feature-flags',
        params: {
          page: params.page || 1,
          limit: params.limit || 20,
          search: params.search || '',
          sortBy: params.sortBy || 'name',
          sortOrder: params.sortOrder || 'asc',
          organizationId: params.organizationId,
          enabled: params.enabled,
          ...params
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'FeatureFlag' as const, id })),
              { type: 'FeatureFlag', id: 'LIST' },
            ]
          : [{ type: 'FeatureFlag', id: 'LIST' }],
      keepUnusedDataFor: 600,
    }),

    // Get feature flag by ID
    getFeatureFlagById: builder.query<FeatureFlag, string>({
      query: (id) => `/feature-flags/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'FeatureFlag', id }],
    }),

    // Check feature flag
    checkFeatureFlag: builder.query<{ enabled: boolean }, {
      name: string;
      userId?: string;
      organizationId?: string;
    }>({
      query: ({ name, userId, organizationId }) => ({
        url: `/feature-flags/check/${name}`,
        params: { userId, organizationId },
      }),
      providesTags: (_result, _error, { name }) => [
        { type: 'FeatureFlag', id: `check-${name}` }
      ],
      keepUnusedDataFor: 300,
    }),

    // Get active feature flags for user/organization
    getActiveFeatureFlags: builder.query<string[], {
      userId?: string;
      organizationId?: string;
    }>({
      query: (params) => ({
        url: '/feature-flags/active',
        params,
      }),
      providesTags: ['FeatureFlag'],
      keepUnusedDataFor: 300,
    }),

    // ===== SYSTEM CONFIG QUERIES =====

    // Get system configurations
    getSystemConfigs: builder.query<PaginatedResponse<SystemConfig>, QueryParams & {
      category?: string;
      organizationId?: string;
      isPublic?: boolean;
    }>({
      query: (params = {}) => ({
        url: '/system-configs',
        params: {
          page: params.page || 1,
          limit: params.limit || 50,
          search: params.search || '',
          sortBy: params.sortBy || 'key',
          sortOrder: params.sortOrder || 'asc',
          category: params.category,
          organizationId: params.organizationId,
          isPublic: params.isPublic,
          ...params
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'SystemConfig' as const, id })),
              { type: 'SystemConfig', id: 'LIST' },
            ]
          : [{ type: 'SystemConfig', id: 'LIST' }],
      keepUnusedDataFor: 600,
    }),

    // Get system config by key
    getSystemConfigByKey: builder.query<SystemConfig, string>({
      query: (key) => `/system-configs/key/${key}`,
      providesTags: (_result, _error, key) => [
        { type: 'SystemConfig', id: key }
      ],
    }),

    // Get system config by category
    getSystemConfigsByCategory: builder.query<SystemConfig[], string>({
      query: (category) => `/system-configs/category/${category}`,
      providesTags: (_result, _error, category) => [
        { type: 'SystemConfig', id: `category-${category}` }
      ],
    }),

    // Get public configs
    getPublicSystemConfigs: builder.query<Record<string, any>, void>({
      query: () => '/system-configs/public',
      providesTags: [{ type: 'SystemConfig', id: 'PUBLIC' }],
      keepUnusedDataFor: 1800, // Cache for 30 minutes
    }),

    // ===== AUDIT LOG MUTATIONS =====

    // Create audit log (usually automated)
    createAuditLog: builder.mutation<AuditLog, Partial<AuditLog>>({
      query: (log) => ({
        url: '/audit-logs',
        method: 'POST',
        body: log,
      }),
      invalidatesTags: [{ type: 'Audit', id: 'LIST' }],
    }),

    // Clean old audit logs
    cleanAuditLogs: builder.mutation<
      { success: boolean; deleted: number },
      { olderThan: string; resource?: string }
    >({
      query: (params) => ({
        url: '/audit-logs/clean',
        method: 'DELETE',
        params,
      }),
      invalidatesTags: [{ type: 'Audit', id: 'LIST' }],
    }),

    // ===== FEATURE FLAG MUTATIONS =====

    // Create feature flag
    createFeatureFlag: builder.mutation<FeatureFlag, Partial<FeatureFlag>>({
      query: (flag) => ({
        url: '/feature-flags',
        method: 'POST',
        body: flag,
      }),
      invalidatesTags: [{ type: 'FeatureFlag', id: 'LIST' }],
    }),

    // Update feature flag
    updateFeatureFlag: builder.mutation<
      FeatureFlag,
      { id: string; data: Partial<FeatureFlag> }
    >({
      query: ({ id, data }) => ({
        url: `/feature-flags/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'FeatureFlag', id },
        { type: 'FeatureFlag', id: 'LIST' },
      ],
    }),

    // Toggle feature flag
    toggleFeatureFlag: builder.mutation<
      FeatureFlag,
      { id: string; enabled: boolean }
    >({
      query: ({ id, enabled }) => ({
        url: `/feature-flags/${id}/toggle`,
        method: 'PATCH',
        body: { enabled },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'FeatureFlag', id },
        { type: 'FeatureFlag', id: 'LIST' },
      ],
    }),

    // Delete feature flag
    deleteFeatureFlag: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/feature-flags/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'FeatureFlag', id },
        { type: 'FeatureFlag', id: 'LIST' },
      ],
    }),

    // Test feature flag conditions
    testFeatureFlagConditions: builder.mutation<
      { matches: boolean; details: any },
      {
        flagId: string;
        context: Record<string, any>;
      }
    >({
      query: ({ flagId, context }) => ({
        url: `/feature-flags/${flagId}/test`,
        method: 'POST',
        body: { context },
      }),
    }),

    // ===== SYSTEM CONFIG MUTATIONS =====

    // Create system config
    createSystemConfig: builder.mutation<SystemConfig, Partial<SystemConfig>>({
      query: (config) => ({
        url: '/system-configs',
        method: 'POST',
        body: config,
      }),
      invalidatesTags: [{ type: 'SystemConfig', id: 'LIST' }],
    }),

    // Update system config
    updateSystemConfig: builder.mutation<
      SystemConfig,
      { id: string; data: Partial<SystemConfig> }
    >({
      query: ({ id, data }) => ({
        url: `/system-configs/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SystemConfig', id },
        { type: 'SystemConfig', id: 'LIST' },
      ],
    }),

    // Update system config by key
    updateSystemConfigByKey: builder.mutation<
      SystemConfig,
      { key: string; value: any; description?: string }
    >({
      query: ({ key, value, description }) => ({
        url: `/system-configs/key/${key}`,
        method: 'PUT',
        body: { value, description },
      }),
      invalidatesTags: (_result, _error, { key }) => [
        { type: 'SystemConfig', id: key },
        { type: 'SystemConfig', id: 'LIST' },
      ],
    }),

    // Delete system config
    deleteSystemConfig: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/system-configs/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'SystemConfig', id },
        { type: 'SystemConfig', id: 'LIST' },
      ],
    }),

    // Bulk update system configs
    bulkUpdateSystemConfigs: builder.mutation<
      { success: boolean; updated: number },
      Array<{ key: string; value: any }>
    >({
      query: (configs) => ({
        url: '/system-configs/bulk-update',
        method: 'PUT',
        body: { configs },
      }),
      invalidatesTags: [{ type: 'SystemConfig', id: 'LIST' }],
    }),

    // Reset system configs to defaults
    resetSystemConfigsToDefaults: builder.mutation<
      { success: boolean; reset: number },
      { category?: string; organizationId?: string }
    >({
      query: (params) => ({
        url: '/system-configs/reset',
        method: 'POST',
        body: params,
      }),
      invalidatesTags: [{ type: 'SystemConfig', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
});

// Export hooks
export const {
  // Audit log hooks
  useGetAuditLogsQuery,
  useLazyGetAuditLogsQuery,
  useGetAuditLogByIdQuery,
  useGetUserActivityQuery,
  useGetAuditStatsQuery,
  useLazyExportAuditLogsQuery,
  useCreateAuditLogMutation,
  useCleanAuditLogsMutation,
  // Feature flag hooks
  useGetFeatureFlagsQuery,
  useLazyGetFeatureFlagsQuery,
  useGetFeatureFlagByIdQuery,
  useCheckFeatureFlagQuery,
  useGetActiveFeatureFlagsQuery,
  useCreateFeatureFlagMutation,
  useUpdateFeatureFlagMutation,
  useToggleFeatureFlagMutation,
  useDeleteFeatureFlagMutation,
  useTestFeatureFlagConditionsMutation,
  // System config hooks
  useGetSystemConfigsQuery,
  useLazyGetSystemConfigsQuery,
  useGetSystemConfigByKeyQuery,
  useGetSystemConfigsByCategoryQuery,
  useGetPublicSystemConfigsQuery,
  useCreateSystemConfigMutation,
  useUpdateSystemConfigMutation,
  useUpdateSystemConfigByKeyMutation,
  useDeleteSystemConfigMutation,
  useBulkUpdateSystemConfigsMutation,
  useResetSystemConfigsToDefaultsMutation,
} = systemConfigApi;

// Export endpoints
export const { endpoints: systemConfigEndpoints } = systemConfigApi;