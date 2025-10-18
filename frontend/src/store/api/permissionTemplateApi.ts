import { apiSlice } from './apiSliceWithHook';
import { PermissionTemplate, PaginatedResponse, QueryParams } from '@/types';

// Permission Template API
export const permissionTemplateApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ===== QUERIES =====

    // Get paginated permission templates
    getPermissionTemplates: builder.query<PaginatedResponse<PermissionTemplate>, QueryParams & {
      category?: string;
    }>({
      query: (params = {}) => {
        const queryParams: Record<string, any> = {
          page: params.page || 1,
          limit: params.limit || 10,
          sortOrder: params.sortOrder || 'asc',
        };

        if (params.search) queryParams.search = params.search;
        if (params.sortBy) queryParams.sortBy = params.sortBy;
        if (params.category) queryParams.category = params.category;
        if (params.isActive !== undefined) queryParams.isActive = params.isActive;

        return {
          url: '/api/v1/permission-templates',
          params: queryParams,
        };
      },
      transformResponse: (response: any) => {
        let actualResponse: PaginatedResponse<PermissionTemplate>;

        if (response && response.success && response.data) {
          actualResponse = response.data;

          if (actualResponse && (actualResponse as any).success && (actualResponse as any).data) {
            actualResponse = (actualResponse as any).data;
          }
        } else {
          actualResponse = response;
        }

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
          data: actualResponse.data.map(template => ({
            ...template,
            createdAt: new Date(template.createdAt),
            updatedAt: new Date(template.updatedAt),
          })),
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'PermissionTemplate' as const, id })),
              { type: 'PermissionTemplate', id: 'LIST' },
            ]
          : [{ type: 'PermissionTemplate', id: 'LIST' }],
      keepUnusedDataFor: 60,
    }),

    // Get single permission template
    getPermissionTemplateById: builder.query<PermissionTemplate, string>({
      query: (id) => `/api/v1/permission-templates/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'PermissionTemplate', id }],
    }),

    // ===== MUTATIONS =====

    // Create permission template
    createPermissionTemplate: builder.mutation<PermissionTemplate, Partial<PermissionTemplate>>({
      query: (template) => ({
        url: '/api/v1/permission-templates',
        method: 'POST',
        body: template,
      }),
      invalidatesTags: [
        { type: 'PermissionTemplate', id: 'LIST' },
      ],
      async onQueryStarted(template, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          permissionTemplateApi.util.updateQueryData('getPermissionTemplates', {}, (draft) => {
            const tempTemplate = {
              ...template,
              id: `temp-${Date.now()}`,
              isSystem: false,
              isActive: true,
              version: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as PermissionTemplate;
            draft.data.unshift(tempTemplate);
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

    // Apply permission template
    applyPermissionTemplate: builder.mutation<any, {
      templateId: string;
      targetType: string;
      targetId: string;
    }>({
      query: (data) => ({
        url: '/api/v1/permission-templates/apply',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['UserPermission', 'RolePermission'],
    }),
  }),
  overrideExisting: false,
});

// Export hooks
export const {
  useGetPermissionTemplatesQuery,
  useLazyGetPermissionTemplatesQuery,
  useGetPermissionTemplateByIdQuery,
  useCreatePermissionTemplateMutation,
  useApplyPermissionTemplateMutation,
} = permissionTemplateApi;

// Export endpoints
export const { endpoints: permissionTemplateEndpoints } = permissionTemplateApi;
