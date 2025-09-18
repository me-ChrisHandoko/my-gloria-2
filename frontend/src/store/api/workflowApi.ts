import { apiSlice } from './apiSlice';
import { Workflow, PaginatedResponse, QueryParams } from '@/types';

// Enhanced Workflow types for comprehensive workflow management
export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  steps: WorkflowStep[];
  triggers?: WorkflowTrigger[];
  conditions?: WorkflowCondition[];
  organizationId?: string;
  isActive: boolean;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowInstance {
  id: string;
  templateId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  currentStep: number;
  data: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  userId: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'approval' | 'action' | 'notification' | 'condition';
  assignee?: string;
  actions?: any[];
  nextSteps?: string[];
  timeout?: number;
}

export interface WorkflowTrigger {
  id: string;
  type: 'manual' | 'schedule' | 'event' | 'webhook';
  config: Record<string, any>;
}

export interface WorkflowCondition {
  id: string;
  field: string;
  operator: string;
  value: any;
}

// Workflow API with template and instance management
export const workflowApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ===== WORKFLOW TEMPLATE QUERIES =====

    // Get workflow templates
    getWorkflowTemplates: builder.query<PaginatedResponse<WorkflowTemplate>, QueryParams & {
      organizationId?: string;
      category?: string;
    }>({
      query: (params = {}) => ({
        url: '/workflow-templates',
        params: {
          page: params.page || 1,
          limit: params.limit || 10,
          search: params.search || '',
          sortBy: params.sortBy || 'name',
          sortOrder: params.sortOrder || 'asc',
          organizationId: params.organizationId,
          category: params.category,
          isActive: params.isActive,
          ...params
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'WorkflowTemplate' as const, id })),
              { type: 'WorkflowTemplate', id: 'LIST' },
            ]
          : [{ type: 'WorkflowTemplate', id: 'LIST' }],
      keepUnusedDataFor: 300,
    }),

    // Get single workflow template
    getWorkflowTemplateById: builder.query<WorkflowTemplate, string>({
      query: (id) => `/workflow-templates/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'WorkflowTemplate', id }],
    }),

    // Get workflow template versions
    getWorkflowTemplateVersions: builder.query<WorkflowTemplate[], string>({
      query: (id) => `/workflow-templates/${id}/versions`,
      providesTags: (_result, _error, id) => [
        { type: 'WorkflowTemplate', id: `${id}-versions` }
      ],
    }),

    // ===== WORKFLOW INSTANCE QUERIES =====

    // Get workflow instances
    getWorkflowInstances: builder.query<PaginatedResponse<WorkflowInstance>, QueryParams & {
      templateId?: string;
      status?: string;
      userId?: string;
    }>({
      query: (params = {}) => ({
        url: '/workflow-instances',
        params: {
          page: params.page || 1,
          limit: params.limit || 10,
          search: params.search || '',
          sortBy: params.sortBy || 'createdAt',
          sortOrder: params.sortOrder || 'desc',
          templateId: params.templateId,
          status: params.status,
          userId: params.userId,
          ...params
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'WorkflowInstance' as const, id })),
              { type: 'WorkflowInstance', id: 'LIST' },
            ]
          : [{ type: 'WorkflowInstance', id: 'LIST' }],
      keepUnusedDataFor: 60, // Shorter cache for instances
    }),

    // Get single workflow instance
    getWorkflowInstanceById: builder.query<WorkflowInstance, string>({
      query: (id) => `/workflow-instances/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'WorkflowInstance', id }],
    }),

    // Get workflow instance history
    getWorkflowInstanceHistory: builder.query<any[], string>({
      query: (id) => `/workflow-instances/${id}/history`,
      providesTags: (_result, _error, id) => [
        { type: 'WorkflowInstance', id: `${id}-history` }
      ],
    }),

    // Get my workflow instances
    getMyWorkflowInstances: builder.query<WorkflowInstance[], void>({
      query: () => '/workflow-instances/my-instances',
      providesTags: ['WorkflowInstance'],
    }),

    // Get workflow statistics
    getWorkflowStats: builder.query<{
      totalTemplates: number;
      activeInstances: number;
      completedToday: number;
      averageCompletionTime: number;
      successRate: number;
    }, { organizationId?: string }>({\n      query: (params = {}) => ({
        url: '/workflows/stats',
        params,
      }),
      providesTags: ['Workflow'],
      keepUnusedDataFor: 300,
    }),

    // ===== WORKFLOW TEMPLATE MUTATIONS =====

    // Create workflow template
    createWorkflowTemplate: builder.mutation<WorkflowTemplate, Partial<WorkflowTemplate>>({
      query: (template) => ({
        url: '/workflow-templates',
        method: 'POST',
        body: template,
      }),
      invalidatesTags: [{ type: 'WorkflowTemplate', id: 'LIST' }],
    }),

    // Update workflow template
    updateWorkflowTemplate: builder.mutation<
      WorkflowTemplate,
      { id: string; data: Partial<WorkflowTemplate> }
    >({
      query: ({ id, data }) => ({
        url: `/workflow-templates/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'WorkflowTemplate', id },
        { type: 'WorkflowTemplate', id: 'LIST' },
      ],
    }),

    // Delete workflow template
    deleteWorkflowTemplate: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/workflow-templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'WorkflowTemplate', id },
        { type: 'WorkflowTemplate', id: 'LIST' },
      ],
    }),

    // Publish workflow template
    publishWorkflowTemplate: builder.mutation<
      WorkflowTemplate,
      { id: string; version: string }
    >({
      query: ({ id, version }) => ({
        url: `/workflow-templates/${id}/publish`,
        method: 'POST',
        body: { version },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'WorkflowTemplate', id },
        { type: 'WorkflowTemplate', id: `${id}-versions` },
      ],
    }),

    // Clone workflow template
    cloneWorkflowTemplate: builder.mutation<
      WorkflowTemplate,
      { id: string; newName: string }
    >({
      query: ({ id, newName }) => ({
        url: `/workflow-templates/${id}/clone`,
        method: 'POST',
        body: { newName },
      }),
      invalidatesTags: [{ type: 'WorkflowTemplate', id: 'LIST' }],
    }),

    // ===== WORKFLOW INSTANCE MUTATIONS =====

    // Start workflow instance
    startWorkflowInstance: builder.mutation<
      WorkflowInstance,
      { templateId: string; data?: Record<string, any> }
    >({
      query: ({ templateId, data }) => ({
        url: '/workflow-instances',
        method: 'POST',
        body: { templateId, data },
      }),
      invalidatesTags: [
        { type: 'WorkflowInstance', id: 'LIST' },
        'Workflow'
      ],
    }),

    // Update workflow instance
    updateWorkflowInstance: builder.mutation<
      WorkflowInstance,
      { id: string; data: Partial<WorkflowInstance> }
    >({
      query: ({ id, data }) => ({
        url: `/workflow-instances/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'WorkflowInstance', id },
        { type: 'WorkflowInstance', id: 'LIST' },
      ],
    }),

    // Complete workflow step
    completeWorkflowStep: builder.mutation<
      WorkflowInstance,
      { instanceId: string; stepId: string; data?: Record<string, any> }
    >({
      query: ({ instanceId, stepId, data }) => ({
        url: `/workflow-instances/${instanceId}/steps/${stepId}/complete`,
        method: 'POST',
        body: { data },
      }),
      invalidatesTags: (_result, _error, { instanceId }) => [
        { type: 'WorkflowInstance', id: instanceId },
        { type: 'WorkflowInstance', id: `${instanceId}-history` },
      ],
    }),

    // Cancel workflow instance
    cancelWorkflowInstance: builder.mutation<
      { success: boolean; message: string },
      { id: string; reason?: string }
    >({
      query: ({ id, reason }) => ({
        url: `/workflow-instances/${id}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'WorkflowInstance', id },
        { type: 'WorkflowInstance', id: 'LIST' },
      ],
    }),

    // Retry failed workflow
    retryWorkflowInstance: builder.mutation<
      WorkflowInstance,
      string
    >({
      query: (id) => ({
        url: `/workflow-instances/${id}/retry`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'WorkflowInstance', id },
        { type: 'WorkflowInstance', id: 'LIST' },
      ],
    }),

    // Approve workflow step
    approveWorkflowStep: builder.mutation<
      WorkflowInstance,
      { instanceId: string; stepId: string; comments?: string }
    >({
      query: ({ instanceId, stepId, comments }) => ({
        url: `/workflow-instances/${instanceId}/steps/${stepId}/approve`,
        method: 'POST',
        body: { comments },
      }),
      invalidatesTags: (_result, _error, { instanceId }) => [
        { type: 'WorkflowInstance', id: instanceId },
      ],
    }),

    // Reject workflow step
    rejectWorkflowStep: builder.mutation<
      WorkflowInstance,
      { instanceId: string; stepId: string; reason: string }
    >({
      query: ({ instanceId, stepId, reason }) => ({
        url: `/workflow-instances/${instanceId}/steps/${stepId}/reject`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { instanceId }) => [
        { type: 'WorkflowInstance', id: instanceId },
      ],
    }),
  }),
  overrideExisting: false,
});

// Export hooks
export const {
  // Template hooks
  useGetWorkflowTemplatesQuery,
  useLazyGetWorkflowTemplatesQuery,
  useGetWorkflowTemplateByIdQuery,
  useGetWorkflowTemplateVersionsQuery,
  useCreateWorkflowTemplateMutation,
  useUpdateWorkflowTemplateMutation,
  useDeleteWorkflowTemplateMutation,
  usePublishWorkflowTemplateMutation,
  useCloneWorkflowTemplateMutation,
  // Instance hooks
  useGetWorkflowInstancesQuery,
  useLazyGetWorkflowInstancesQuery,
  useGetWorkflowInstanceByIdQuery,
  useGetWorkflowInstanceHistoryQuery,
  useGetMyWorkflowInstancesQuery,
  useGetWorkflowStatsQuery,
  useStartWorkflowInstanceMutation,
  useUpdateWorkflowInstanceMutation,
  useCompleteWorkflowStepMutation,
  useCancelWorkflowInstanceMutation,
  useRetryWorkflowInstanceMutation,
  useApproveWorkflowStepMutation,
  useRejectWorkflowStepMutation,
} = workflowApi;

// Export endpoints
export const { endpoints: workflowEndpoints } = workflowApi;