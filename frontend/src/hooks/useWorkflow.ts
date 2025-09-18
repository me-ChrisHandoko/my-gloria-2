import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import {
  selectWorkflowTemplates,
  selectWorkflowInstances,
  selectActiveWorkflowInstance,
  selectSelectedTemplate,
  selectWorkflowStatistics,
  selectWorkflowFilters,
  selectWorkflowLoading,
  selectWorkflowError,
  selectRunningWorkflows,
  selectTemplateById,
  selectInstancesByTemplate,
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
  executeWorkflow,
  pauseWorkflow,
  resumeWorkflow,
  cancelWorkflow,
} from '@/store/slices/workflowSlice';
import type {
  WorkflowTemplate,
  WorkflowInstance,
  WorkflowStep,
  WorkflowCondition,
  WorkflowAction,
} from '@/store/slices/workflowSlice';

interface WorkflowExecutionOptions {
  autoStart?: boolean;
  validateData?: boolean;
  notifyOnComplete?: boolean;
  notifyOnError?: boolean;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

/**
 * Comprehensive workflow management hook
 * Handles workflow execution, monitoring, and analytics
 */
export const useWorkflow = () => {
  const dispatch = useAppDispatch();

  // State selectors
  const templates = useAppSelector(selectWorkflowTemplates);
  const instances = useAppSelector(selectWorkflowInstances);
  const activeInstance = useAppSelector(selectActiveWorkflowInstance);
  const selectedTemplate = useAppSelector(selectSelectedTemplate);
  const statistics = useAppSelector(selectWorkflowStatistics);
  const filters = useAppSelector(selectWorkflowFilters);
  const isLoading = useAppSelector(selectWorkflowLoading);
  const error = useAppSelector(selectWorkflowError);
  const runningWorkflows = useAppSelector(selectRunningWorkflows);

  // Local state for optimistic updates
  const [localLoading, setLocalLoading] = useState<Record<string, boolean>>({});

  /**
   * Execute a workflow with options
   */
  const startWorkflow = useCallback(
    async (
      templateId: string,
      data: Record<string, any>,
      options: WorkflowExecutionOptions = {}
    ) => {
      const {
        autoStart = true,
        validateData = true,
        notifyOnComplete = true,
        notifyOnError = true,
        retryOnFailure = false,
        maxRetries = 3,
      } = options;

      setLocalLoading(prev => ({ ...prev, [templateId]: true }));

      try {
        // Validate data if required
        if (validateData) {
          const template = templates.find(t => t.id === templateId);
          if (!template) {
            throw new Error('Template not found');
          }

          // Validate required variables
          if (template.variables) {
            for (const variable of template.variables) {
              if (variable.required && !data[variable.name]) {
                throw new Error(`Required variable ${variable.name} is missing`);
              }
            }
          }
        }

        // Execute workflow
        const result = await dispatch(
          executeWorkflow({ templateId, data })
        ).unwrap();

        // Handle notifications
        if (notifyOnComplete) {
          // Notification would be triggered through notification hook
        }

        return result;
      } catch (error: any) {
        // Handle retry logic
        if (retryOnFailure && maxRetries > 0) {
          console.log(`Retrying workflow execution. Attempts left: ${maxRetries - 1}`);
          return startWorkflow(templateId, data, {
            ...options,
            maxRetries: maxRetries - 1,
          });
        }

        // Handle error notification
        if (notifyOnError) {
          // Notification would be triggered through notification hook
        }

        throw error;
      } finally {
        setLocalLoading(prev => ({ ...prev, [templateId]: false }));
      }
    },
    [templates, dispatch]
  );

  /**
   * Pause a running workflow
   */
  const pauseWorkflowInstance = useCallback(
    async (instanceId: string) => {
      try {
        await dispatch(pauseWorkflow(instanceId)).unwrap();
        return true;
      } catch (error) {
        console.error('Failed to pause workflow:', error);
        return false;
      }
    },
    [dispatch]
  );

  /**
   * Resume a paused workflow
   */
  const resumeWorkflowInstance = useCallback(
    async (instanceId: string) => {
      try {
        await dispatch(resumeWorkflow(instanceId)).unwrap();
        return true;
      } catch (error) {
        console.error('Failed to resume workflow:', error);
        return false;
      }
    },
    [dispatch]
  );

  /**
   * Cancel a workflow instance
   */
  const cancelWorkflowInstance = useCallback(
    async (instanceId: string) => {
      try {
        await dispatch(cancelWorkflow(instanceId)).unwrap();
        return true;
      } catch (error) {
        console.error('Failed to cancel workflow:', error);
        return false;
      }
    },
    [dispatch]
  );

  /**
   * Approve a workflow step
   */
  const approveStep = useCallback(
    async (instanceId: string, stepId: string, comments?: string) => {
      const step: WorkflowStep = {
        id: stepId,
        status: 'completed',
        completedAt: new Date().toISOString(),
        completedBy: 'current_user', // Would get from auth
        comments,
      } as WorkflowStep;

      dispatch(updateStep({ instanceId, step }));
    },
    [dispatch]
  );

  /**
   * Reject a workflow step
   */
  const rejectStep = useCallback(
    async (instanceId: string, stepId: string, reason: string) => {
      const step: WorkflowStep = {
        id: stepId,
        status: 'failed',
        completedAt: new Date().toISOString(),
        completedBy: 'current_user', // Would get from auth
        comments: reason,
      } as WorkflowStep;

      dispatch(updateStep({ instanceId, step }));
    },
    [dispatch]
  );

  /**
   * Skip a workflow step
   */
  const skipStep = useCallback(
    async (instanceId: string, stepId: string, reason?: string) => {
      const step: WorkflowStep = {
        id: stepId,
        status: 'skipped',
        completedAt: new Date().toISOString(),
        completedBy: 'current_user', // Would get from auth
        comments: reason,
      } as WorkflowStep;

      dispatch(updateStep({ instanceId, step }));
    },
    [dispatch]
  );

  /**
   * Get template by ID
   */
  const getTemplate = useCallback(
    (templateId: string) => {
      return templates.find(t => t.id === templateId);
    },
    [templates]
  );

  /**
   * Get instance by ID
   */
  const getInstance = useCallback(
    (instanceId: string) => {
      return instances.find(i => i.id === instanceId);
    },
    [instances]
  );

  /**
   * Get instances for a template
   */
  const getTemplateInstances = useCallback(
    (templateId: string) => {
      return instances.filter(i => i.templateId === templateId);
    },
    [instances]
  );

  /**
   * Filter templates by category
   */
  const getTemplatesByCategory = useCallback(
    (category: string) => {
      return templates.filter(t => t.category === category);
    },
    [templates]
  );

  /**
   * Search templates
   */
  const searchTemplates = useCallback(
    (query: string) => {
      const lowercaseQuery = query.toLowerCase();
      return templates.filter(
        t =>
          t.name.toLowerCase().includes(lowercaseQuery) ||
          t.description?.toLowerCase().includes(lowercaseQuery) ||
          t.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
      );
    },
    [templates]
  );

  /**
   * Get workflow progress
   */
  const getWorkflowProgress = useCallback(
    (instanceId: string): number => {
      const instance = getInstance(instanceId);
      if (!instance) return 0;

      const template = getTemplate(instance.templateId);
      if (!template) return 0;

      const completedSteps = template.steps.filter(
        s => s.status === 'completed'
      ).length;

      return (completedSteps / template.steps.length) * 100;
    },
    [getInstance, getTemplate]
  );

  /**
   * Get pending approvals for current user
   */
  const getPendingApprovals = useCallback(() => {
    return instances.filter(instance => {
      const template = getTemplate(instance.templateId);
      if (!template) return false;

      return template.steps.some(
        step =>
          step.status === 'in_progress' &&
          step.type === 'approval' &&
          step.assignees?.includes('current_user') // Would get from auth
      );
    });
  }, [instances, getTemplate]);

  /**
   * Validate workflow conditions
   */
  const evaluateConditions = useCallback(
    (conditions: WorkflowCondition[], data: Record<string, any>): boolean => {
      if (!conditions || conditions.length === 0) return true;

      return conditions.every(condition => {
        const fieldValue = data[condition.field];

        switch (condition.operator) {
          case 'equals':
            return fieldValue === condition.value;
          case 'not_equals':
            return fieldValue !== condition.value;
          case 'contains':
            return String(fieldValue).includes(String(condition.value));
          case 'greater_than':
            return Number(fieldValue) > Number(condition.value);
          case 'less_than':
            return Number(fieldValue) < Number(condition.value);
          case 'in':
            return Array.isArray(condition.value) &&
              condition.value.includes(fieldValue);
          case 'not_in':
            return Array.isArray(condition.value) &&
              !condition.value.includes(fieldValue);
          default:
            return false;
        }
      });
    },
    []
  );

  // Computed values
  const activeTemplates = useMemo(
    () => templates.filter(t => t.isActive),
    [templates]
  );

  const completedInstances = useMemo(
    () => instances.filter(i => i.status === 'completed'),
    [instances]
  );

  const failedInstances = useMemo(
    () => instances.filter(i => i.status === 'failed'),
    [instances]
  );

  const averageCompletionTime = useMemo(() => {
    const completed = completedInstances.filter(
      i => i.startedAt && i.completedAt
    );

    if (completed.length === 0) return 0;

    const totalTime = completed.reduce((sum, instance) => {
      const start = new Date(instance.startedAt!).getTime();
      const end = new Date(instance.completedAt!).getTime();
      return sum + (end - start);
    }, 0);

    return totalTime / completed.length;
  }, [completedInstances]);

  const successRate = useMemo(() => {
    const total = completedInstances.length + failedInstances.length;
    if (total === 0) return 0;
    return (completedInstances.length / total) * 100;
  }, [completedInstances, failedInstances]);

  // Auto-refresh running workflows
  useEffect(() => {
    if (runningWorkflows.length === 0) return;

    const interval = setInterval(() => {
      // Would fetch updates for running workflows
      console.log('Refreshing running workflows...');
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [runningWorkflows]);

  return {
    // State
    templates,
    activeTemplates,
    instances,
    runningWorkflows,
    completedInstances,
    failedInstances,
    activeInstance,
    selectedTemplate,
    statistics: {
      ...statistics,
      averageCompletionTime,
      successRate,
    },
    filters,
    isLoading: isLoading || Object.values(localLoading).some(Boolean),
    error,

    // Actions
    startWorkflow,
    pauseWorkflow: pauseWorkflowInstance,
    resumeWorkflow: resumeWorkflowInstance,
    cancelWorkflow: cancelWorkflowInstance,
    approveStep,
    rejectStep,
    skipStep,
    selectTemplate: (id: string | null) => dispatch(selectTemplate(id)),
    setActiveInstance: (id: string | null) => dispatch(setActiveInstance(id)),
    setFilters: (filters: any) => dispatch(setFilters(filters)),
    clearFilters: () => dispatch(clearFilters()),
    clearError: () => dispatch(clearError()),

    // Queries
    getTemplate,
    getInstance,
    getTemplateInstances,
    getTemplatesByCategory,
    searchTemplates,
    getWorkflowProgress,
    getPendingApprovals,

    // Utilities
    evaluateConditions,
  };
};

/**
 * Hook for workflow builder/designer
 */
export const useWorkflowBuilder = () => {
  const dispatch = useAppDispatch();
  const [draftTemplate, setDraftTemplate] = useState<Partial<WorkflowTemplate>>({
    name: '',
    description: '',
    category: '',
    steps: [],
    triggers: [],
    variables: [],
    isActive: false,
    tags: [],
  });

  const addStep = useCallback((step: WorkflowStep) => {
    setDraftTemplate(prev => ({
      ...prev,
      steps: [...(prev.steps || []), step],
    }));
  }, []);

  const updateStep = useCallback((stepId: string, updates: Partial<WorkflowStep>) => {
    setDraftTemplate(prev => ({
      ...prev,
      steps: prev.steps?.map(s =>
        s.id === stepId ? { ...s, ...updates } : s
      ),
    }));
  }, []);

  const removeStep = useCallback((stepId: string) => {
    setDraftTemplate(prev => ({
      ...prev,
      steps: prev.steps?.filter(s => s.id !== stepId),
    }));
  }, []);

  const connectSteps = useCallback(
    (fromStepId: string, toStepId: string) => {
      setDraftTemplate(prev => ({
        ...prev,
        steps: prev.steps?.map(s => {
          if (s.id === fromStepId) {
            return {
              ...s,
              nextSteps: [...(s.nextSteps || []), toStepId],
            };
          }
          if (s.id === toStepId) {
            return {
              ...s,
              previousSteps: [...(s.previousSteps || []), fromStepId],
            };
          }
          return s;
        }),
      }));
    },
    []
  );

  const saveTemplate = useCallback(async () => {
    if (!draftTemplate.name) {
      throw new Error('Template name is required');
    }

    const template: WorkflowTemplate = {
      ...draftTemplate,
      id: draftTemplate.id || `template-${Date.now()}`,
      createdBy: 'current_user', // Would get from auth
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    } as WorkflowTemplate;

    if (draftTemplate.id) {
      dispatch(updateTemplate(template));
    } else {
      dispatch(addTemplate(template));
    }

    return template;
  }, [draftTemplate, dispatch]);

  return {
    draftTemplate,
    setDraftTemplate,
    addStep,
    updateStep,
    removeStep,
    connectSteps,
    saveTemplate,
  };
};

export default useWorkflow;