import apiClient from '../client';
import { API_ENDPOINTS } from '../constants';
import type { PaginatedResponse, QueryParams } from '../types';

// Workflow types
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  version: number;
  definition: WorkflowDefinition;
  triggers?: WorkflowTrigger[];
  permissions?: string[];
  metadata?: Record<string, any>;
  createdBy: string;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowDefinition {
  steps: WorkflowStep[];
  variables?: Record<string, any>;
  conditions?: Record<string, any>;
  errorHandlers?: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  config: Record<string, any>;
  next?: string | string[];
  conditions?: Record<string, any>;
  retryPolicy?: {
    maxAttempts: number;
    backoffMultiplier: number;
    initialInterval: number;
  };
}

export interface WorkflowTrigger {
  id: string;
  type: 'MANUAL' | 'SCHEDULE' | 'EVENT' | 'WEBHOOK';
  config: Record<string, any>;
  enabled: boolean;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  currentStep?: string;
  steps: WorkflowExecutionStep[];
  startedAt: Date;
  completedAt?: Date;
  executedBy: string;
}

export interface WorkflowExecutionStep {
  stepId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
}

export interface CreateWorkflowDto {
  name: string;
  description?: string;
  type: string;
  definition: WorkflowDefinition;
  triggers?: WorkflowTrigger[];
  permissions?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateWorkflowDto extends Partial<CreateWorkflowDto> {
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
}

export interface ExecuteWorkflowDto {
  input?: Record<string, any>;
  async?: boolean;
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
}

// Workflow service class
class WorkflowService {
  /**
   * Get paginated list of workflows
   */
  async getWorkflows(params?: QueryParams): Promise<PaginatedResponse<Workflow>> {
    const queryString = apiClient.buildQueryString(params);
    return apiClient.get<PaginatedResponse<Workflow>>(
      `${API_ENDPOINTS.WORKFLOWS.BASE}${queryString}`
    );
  }

  /**
   * Get workflow by ID
   */
  async getWorkflowById(id: string): Promise<Workflow> {
    return apiClient.get<Workflow>(API_ENDPOINTS.WORKFLOWS.BY_ID(id));
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(data: CreateWorkflowDto): Promise<Workflow> {
    return apiClient.post<Workflow>(API_ENDPOINTS.WORKFLOWS.BASE, data);
  }

  /**
   * Update workflow
   */
  async updateWorkflow(id: string, data: UpdateWorkflowDto): Promise<Workflow> {
    return apiClient.patch<Workflow>(API_ENDPOINTS.WORKFLOWS.BY_ID(id), data);
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(id: string): Promise<void> {
    return apiClient.delete<void>(API_ENDPOINTS.WORKFLOWS.BY_ID(id));
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(id: string, data?: ExecuteWorkflowDto): Promise<WorkflowExecution> {
    return apiClient.post<WorkflowExecution>(API_ENDPOINTS.WORKFLOWS.EXECUTE(id), data || {});
  }

  /**
   * Get workflow execution history
   */
  async getExecutionHistory(
    workflowId: string,
    params?: QueryParams
  ): Promise<PaginatedResponse<WorkflowExecution>> {
    const queryString = apiClient.buildQueryString(params);
    return apiClient.get<PaginatedResponse<WorkflowExecution>>(
      `${API_ENDPOINTS.WORKFLOWS.HISTORY(workflowId)}${queryString}`
    );
  }

  /**
   * Get execution by ID
   */
  async getExecutionById(workflowId: string, executionId: string): Promise<WorkflowExecution> {
    return apiClient.get<WorkflowExecution>(
      `${API_ENDPOINTS.WORKFLOWS.BY_ID(workflowId)}/executions/${executionId}`
    );
  }

  /**
   * Cancel workflow execution
   */
  async cancelExecution(workflowId: string, executionId: string): Promise<void> {
    return apiClient.post<void>(
      `${API_ENDPOINTS.WORKFLOWS.BY_ID(workflowId)}/executions/${executionId}/cancel`
    );
  }

  /**
   * Retry failed execution
   */
  async retryExecution(workflowId: string, executionId: string): Promise<WorkflowExecution> {
    return apiClient.post<WorkflowExecution>(
      `${API_ENDPOINTS.WORKFLOWS.BY_ID(workflowId)}/executions/${executionId}/retry`
    );
  }

  /**
   * Get workflow templates
   */
  async getTemplates(params?: QueryParams): Promise<PaginatedResponse<Workflow>> {
    const queryString = apiClient.buildQueryString(params);
    return apiClient.get<PaginatedResponse<Workflow>>(
      `${API_ENDPOINTS.WORKFLOWS.TEMPLATES}${queryString}`
    );
  }

  /**
   * Clone workflow from template
   */
  async cloneFromTemplate(templateId: string, data: { name: string; description?: string }): Promise<Workflow> {
    return apiClient.post<Workflow>(`${API_ENDPOINTS.WORKFLOWS.TEMPLATES}/${templateId}/clone`, data);
  }

  /**
   * Validate workflow definition
   */
  async validateWorkflow(definition: WorkflowDefinition): Promise<{ valid: boolean; errors?: string[] }> {
    return apiClient.post<{ valid: boolean; errors?: string[] }>(
      `${API_ENDPOINTS.WORKFLOWS.BASE}/validate`,
      { definition }
    );
  }

  /**
   * Export workflow as JSON
   */
  async exportWorkflow(id: string): Promise<Blob> {
    const response = await apiClient.get<ArrayBuffer>(
      `${API_ENDPOINTS.WORKFLOWS.BY_ID(id)}/export`,
      { responseType: 'arraybuffer' }
    );
    return new Blob([response], { type: 'application/json' });
  }

  /**
   * Import workflow from JSON
   */
  async importWorkflow(file: File): Promise<Workflow> {
    return apiClient.uploadFile(`${API_ENDPOINTS.WORKFLOWS.BASE}/import`, file);
  }

  /**
   * Get workflow statistics
   */
  async getStatistics(workflowId: string): Promise<any> {
    return apiClient.get(`${API_ENDPOINTS.WORKFLOWS.BY_ID(workflowId)}/statistics`);
  }
}

// Export singleton instance
export const workflowService = new WorkflowService();