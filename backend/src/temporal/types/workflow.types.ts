/**
 * Temporal Workflow Type Definitions
 * Replaces the old custom workflow engine tables
 */

export interface ApprovalRequest {
  id: string;
  requestId: string;
  initiatorId: string;
  approverId: string;
  module: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
  dueDate?: Date;
}

export interface ApprovalResult {
  requestId: string;
  status: 'APPROVED' | 'REJECTED' | 'TIMEOUT' | 'CANCELLED';
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  comment?: string;
  escalationLevel: number;
}

export interface EscalationConfig {
  enabled: boolean;
  levels: EscalationLevel[];
  maxAttempts: number;
}

export interface EscalationLevel {
  level: number;
  timeoutMinutes: number;
  escalateToUserId: string;
  notificationMessage: string;
}

export interface WorkflowStepConfig {
  stepIndex: number;
  stepType: 'APPROVAL' | 'NOTIFICATION' | 'CONDITION' | 'ACTION';
  assigneeId?: string;
  condition?: string;
  action?: string;
  timeoutMinutes?: number;
}

export interface WorkflowContext {
  workflowId: string;
  requestId: string;
  initiatorId: string;
  currentStep: number;
  totalSteps: number;
  variables: Record<string, any>;
  history: WorkflowHistoryEntry[];
}

export interface WorkflowHistoryEntry {
  timestamp: Date;
  stepIndex: number;
  action: string;
  actorId: string;
  result: any;
  metadata?: Record<string, any>;
}

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
  data?: Record<string, any>;
}

export interface DelegationRequest {
  delegatorId: string;
  delegateId: string;
  requestId: string;
  expiresAt?: Date;
  reason?: string;
}

export interface WorkflowMetrics {
  workflowType: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: string;
  stepsCompleted: number;
  totalSteps: number;
  escalations: number;
}
