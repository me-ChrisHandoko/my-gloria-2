import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";

// Workflow types
export interface WorkflowStep {
  id: string;
  name: string;
  type: "approval" | "review" | "action" | "notification" | "condition";
  description?: string;
  assignees?: string[];
  conditions?: WorkflowCondition[];
  actions?: WorkflowAction[];
  nextSteps?: string[];
  previousSteps?: string[];
  status: "pending" | "in_progress" | "completed" | "skipped" | "failed";
  startedAt?: string;
  completedAt?: string;
  completedBy?: string;
  comments?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowCondition {
  id: string;
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "greater_than"
    | "less_than"
    | "in"
    | "not_in";
  value: any;
  logicalOperator?: "AND" | "OR";
}

export interface WorkflowAction {
  id: string;
  type: "email" | "webhook" | "update_field" | "create_task" | "assign_user";
  config: Record<string, any>;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  steps: WorkflowStep[];
  triggers?: WorkflowTrigger[];
  variables?: WorkflowVariable[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  tags?: string[];
}

export interface WorkflowTrigger {
  id: string;
  type: "manual" | "schedule" | "event" | "webhook";
  config: Record<string, any>;
}

export interface WorkflowVariable {
  id: string;
  name: string;
  type: "string" | "number" | "boolean" | "date" | "array" | "object";
  defaultValue?: any;
  required: boolean;
  validation?: Record<string, any>;
}

export interface WorkflowInstance {
  id: string;
  templateId: string;
  templateName: string;
  status: "draft" | "running" | "paused" | "completed" | "cancelled" | "failed";
  currentStep?: string;
  startedAt?: string;
  completedAt?: string;
  startedBy: string;
  data: Record<string, any>;
  history: WorkflowHistoryItem[];
  errors?: WorkflowError[];
}

export interface WorkflowHistoryItem {
  id: string;
  stepId: string;
  action: string;
  performedBy: string;
  performedAt: string;
  details?: Record<string, any>;
}

export interface WorkflowError {
  id: string;
  stepId?: string;
  message: string;
  code?: string;
  occurredAt: string;
  resolved: boolean;
}

export interface WorkflowState {
  templates: WorkflowTemplate[];
  instances: WorkflowInstance[];
  activeInstance: WorkflowInstance | null;
  selectedTemplate: WorkflowTemplate | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    status?: string[];
    category?: string[];
    tags?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
  };
  statistics: {
    totalTemplates: number;
    activeTemplates: number;
    totalInstances: number;
    runningInstances: number;
    completedInstances: number;
    failedInstances: number;
    averageCompletionTime?: number;
  };
}

const initialState: WorkflowState = {
  templates: [],
  instances: [],
  activeInstance: null,
  selectedTemplate: null,
  isLoading: false,
  error: null,
  filters: {},
  statistics: {
    totalTemplates: 0,
    activeTemplates: 0,
    totalInstances: 0,
    runningInstances: 0,
    completedInstances: 0,
    failedInstances: 0,
  },
};

// Async thunks
export const executeWorkflow = createAsyncThunk(
  "workflow/execute",
  async (
    { templateId, data }: { templateId: string; data: Record<string, any> },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(`/workflows/${templateId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to execute workflow");
      return await response.json();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const pauseWorkflow = createAsyncThunk(
  "workflow/pause",
  async (instanceId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/workflows/instances/${instanceId}/pause`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to pause workflow");
      return await response.json();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const resumeWorkflow = createAsyncThunk(
  "workflow/resume",
  async (instanceId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `/workflows/instances/${instanceId}/resume`,
        {
          method: "POST",
        }
      );
      if (!response.ok) throw new Error("Failed to resume workflow");
      return await response.json();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const cancelWorkflow = createAsyncThunk(
  "workflow/cancel",
  async (instanceId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `/workflows/instances/${instanceId}/cancel`,
        {
          method: "POST",
        }
      );
      if (!response.ok) throw new Error("Failed to cancel workflow");
      return await response.json();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const workflowSlice = createSlice({
  name: "workflow",
  initialState,
  reducers: {
    // Templates
    setTemplates: (state, action: PayloadAction<WorkflowTemplate[]>) => {
      state.templates = action.payload;
      state.statistics.totalTemplates = action.payload.length;
      state.statistics.activeTemplates = action.payload.filter(
        (t) => t.isActive
      ).length;
    },
    addTemplate: (state, action: PayloadAction<WorkflowTemplate>) => {
      state.templates.push(action.payload);
      state.statistics.totalTemplates++;
      if (action.payload.isActive) state.statistics.activeTemplates++;
    },
    updateTemplate: (state, action: PayloadAction<WorkflowTemplate>) => {
      const index = state.templates.findIndex(
        (t) => t.id === action.payload.id
      );
      if (index !== -1) {
        const wasActive = state.templates[index].isActive;
        state.templates[index] = action.payload;
        if (!wasActive && action.payload.isActive)
          state.statistics.activeTemplates++;
        if (wasActive && !action.payload.isActive)
          state.statistics.activeTemplates--;
      }
    },
    deleteTemplate: (state, action: PayloadAction<string>) => {
      const template = state.templates.find((t) => t.id === action.payload);
      if (template) {
        state.templates = state.templates.filter(
          (t) => t.id !== action.payload
        );
        state.statistics.totalTemplates--;
        if (template.isActive) state.statistics.activeTemplates--;
      }
    },
    selectTemplate: (state, action: PayloadAction<string | null>) => {
      state.selectedTemplate = action.payload
        ? state.templates.find((t) => t.id === action.payload) || null
        : null;
    },

    // Instances
    setInstances: (state, action: PayloadAction<WorkflowInstance[]>) => {
      state.instances = action.payload;
      state.statistics.totalInstances = action.payload.length;
      state.statistics.runningInstances = action.payload.filter(
        (i) => i.status === "running"
      ).length;
      state.statistics.completedInstances = action.payload.filter(
        (i) => i.status === "completed"
      ).length;
      state.statistics.failedInstances = action.payload.filter(
        (i) => i.status === "failed"
      ).length;
    },
    addInstance: (state, action: PayloadAction<WorkflowInstance>) => {
      state.instances.push(action.payload);
      state.statistics.totalInstances++;
      if (action.payload.status === "running")
        state.statistics.runningInstances++;
    },
    updateInstance: (state, action: PayloadAction<WorkflowInstance>) => {
      const index = state.instances.findIndex(
        (i) => i.id === action.payload.id
      );
      if (index !== -1) {
        const oldStatus = state.instances[index].status;
        const newStatus = action.payload.status;
        state.instances[index] = action.payload;

        // Update statistics
        if (oldStatus === "running") state.statistics.runningInstances--;
        if (oldStatus === "completed") state.statistics.completedInstances--;
        if (oldStatus === "failed") state.statistics.failedInstances--;

        if (newStatus === "running") state.statistics.runningInstances++;
        if (newStatus === "completed") state.statistics.completedInstances++;
        if (newStatus === "failed") state.statistics.failedInstances++;

        // Update active instance if it's the same
        if (state.activeInstance?.id === action.payload.id) {
          state.activeInstance = action.payload;
        }
      }
    },
    deleteInstance: (state, action: PayloadAction<string>) => {
      const instance = state.instances.find((i) => i.id === action.payload);
      if (instance) {
        state.instances = state.instances.filter(
          (i) => i.id !== action.payload
        );
        state.statistics.totalInstances--;
        if (instance.status === "running") state.statistics.runningInstances--;
        if (instance.status === "completed")
          state.statistics.completedInstances--;
        if (instance.status === "failed") state.statistics.failedInstances--;

        if (state.activeInstance?.id === action.payload) {
          state.activeInstance = null;
        }
      }
    },
    setActiveInstance: (state, action: PayloadAction<string | null>) => {
      state.activeInstance = action.payload
        ? state.instances.find((i) => i.id === action.payload) || null
        : null;
    },

    // Step updates
    updateStep: (
      state,
      action: PayloadAction<{ instanceId: string; step: WorkflowStep }>
    ) => {
      const instance = state.instances.find(
        (i) => i.id === action.payload.instanceId
      );
      if (instance) {
        const template = state.templates.find(
          (t) => t.id === instance.templateId
        );
        if (template) {
          const stepIndex = template.steps.findIndex(
            (s) => s.id === action.payload.step.id
          );
          if (stepIndex !== -1) {
            template.steps[stepIndex] = action.payload.step;
          }
        }
      }
    },

    // Filters
    setFilters: (state, action: PayloadAction<WorkflowState["filters"]>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },

    // Error handling
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },

    // Loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Execute workflow
      .addCase(executeWorkflow.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(executeWorkflow.fulfilled, (state, action) => {
        state.isLoading = false;
        state.instances.push(action.payload);
        state.activeInstance = action.payload;
        state.statistics.totalInstances++;
        state.statistics.runningInstances++;
      })
      .addCase(executeWorkflow.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Pause workflow
      .addCase(pauseWorkflow.fulfilled, (state, action) => {
        const instance = state.instances.find((i) => i.id === action.meta.arg);
        if (instance) {
          instance.status = "paused";
          state.statistics.runningInstances--;
        }
      })
      // Resume workflow
      .addCase(resumeWorkflow.fulfilled, (state, action) => {
        const instance = state.instances.find((i) => i.id === action.meta.arg);
        if (instance) {
          instance.status = "running";
          state.statistics.runningInstances++;
        }
      })
      // Cancel workflow
      .addCase(cancelWorkflow.fulfilled, (state, action) => {
        const instance = state.instances.find((i) => i.id === action.meta.arg);
        if (instance) {
          instance.status = "cancelled";
          state.statistics.runningInstances--;
        }
      });
  },
});

export const {
  setTemplates,
  addTemplate,
  updateTemplate,
  deleteTemplate,
  selectTemplate,
  setInstances,
  addInstance,
  updateInstance,
  deleteInstance,
  setActiveInstance,
  updateStep,
  setFilters,
  clearFilters,
  setError,
  clearError,
  setLoading,
} = workflowSlice.actions;

// Selectors
export const selectWorkflowTemplates = (state: { workflow: WorkflowState }) =>
  state.workflow.templates;
export const selectWorkflowInstances = (state: { workflow: WorkflowState }) =>
  state.workflow.instances;
export const selectActiveWorkflowInstance = (state: {
  workflow: WorkflowState;
}) => state.workflow.activeInstance;
export const selectSelectedTemplate = (state: { workflow: WorkflowState }) =>
  state.workflow.selectedTemplate;
export const selectWorkflowStatistics = (state: { workflow: WorkflowState }) =>
  state.workflow.statistics;
export const selectWorkflowFilters = (state: { workflow: WorkflowState }) =>
  state.workflow.filters;
export const selectWorkflowLoading = (state: { workflow: WorkflowState }) =>
  state.workflow.isLoading;
export const selectWorkflowError = (state: { workflow: WorkflowState }) =>
  state.workflow.error;

// Complex selectors
export const selectRunningWorkflows = (state: { workflow: WorkflowState }) =>
  state.workflow.instances.filter((i) => i.status === "running");

export const selectTemplateById =
  (templateId: string) => (state: { workflow: WorkflowState }) =>
    state.workflow.templates.find((t) => t.id === templateId);

export const selectInstancesByTemplate =
  (templateId: string) => (state: { workflow: WorkflowState }) =>
    state.workflow.instances.filter((i) => i.templateId === templateId);

export default workflowSlice.reducer;
