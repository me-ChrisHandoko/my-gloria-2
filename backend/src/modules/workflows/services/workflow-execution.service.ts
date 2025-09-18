import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import { CacheService } from '@/core/cache/cache.service';
import { WorkflowNotificationService } from './workflow-notification.service';
import { WorkflowValidationService } from './workflow-validation.service';
import {
  ExecuteWorkflowDto,
  ProcessStepDto,
  WorkflowPriority,
} from '../dto/execute-workflow.dto';
import { Prisma } from '@prisma/client';

// Using WorkflowState enum from Prisma schema
// Values: INITIALIZED, IN_PROGRESS, WAITING, COMPLETED, CANCELLED, FAILED, SUSPENDED

export enum StepStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  CANCELLED = 'CANCELLED',
}

@Injectable()
export class WorkflowExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
    private readonly cache: CacheService,
    private readonly notificationService: WorkflowNotificationService,
    private readonly validationService: WorkflowValidationService,
  ) {
    this.logger.setContext('WorkflowExecutionService');
  }

  /**
   * Helper function to safely convert values to Prisma InputJsonValue
   * Handles null values and ensures type safety for JSON fields
   */
  private toJsonValue(
    value: any,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (value === null || value === undefined) {
      return Prisma.JsonNull;
    }
    return value as Prisma.InputJsonValue;
  }

  /**
   * Execute a workflow
   */
  async execute(dto: ExecuteWorkflowDto, userId: string) {
    this.logger.log(`Executing workflow: ${dto.workflowId}`);

    // Get workflow definition
    const workflow = await this.prisma.workflow.findFirst({
      where: {
        OR: [{ id: dto.workflowId }, { name: dto.workflowId }],
        isActive: true,
      },
    });

    if (!workflow) {
      throw new NotFoundException(
        `Active workflow ${dto.workflowId} not found`,
      );
    }

    // Validate workflow execution
    if (!dto.skipValidation) {
      await this.validationService.validateExecution(workflow, dto, userId);
    }

    // Create workflow instance
    const instance = await this.prisma.workflowInstance.create({
      data: {
        id: require('uuid').v7(),
        workflowId: workflow.id,
        requestId: require('uuid').v7(),
        initiatorId: userId,
        state: 'INITIALIZED' as const,
        currentStepIndex: 0,
        context: this.toJsonValue(dto.context),
        metadata: this.toJsonValue({
          tags: dto.tags || [],
          parentInstanceId: dto.parentInstanceId,
          priority: dto.priority || WorkflowPriority.NORMAL,
        }),
      },
      include: {
        workflow: true,
      },
    });

    // Create step instances
    const steps = workflow.steps as any[];
    const stepInstances = await Promise.all(
      steps.map((step, index) =>
        this.prisma.workflowStepInstance.create({
          data: {
            id: require('uuid').v7(),
            instanceId: instance.id,
            stepIndex: index,
            stepType: step.type || 'MANUAL',
            stepData: this.toJsonValue(step),
            stepDefinition: this.toJsonValue(step),
            status: index === 0 ? StepStatus.PENDING : StepStatus.PENDING,
            assigneeId: this.determineAssignee(step, dto.context),
          },
        }),
      ),
    );

    // Start workflow execution
    await this.startWorkflow(instance.id);

    // Send notifications
    await this.notificationService.notifyWorkflowStarted(instance);

    return {
      instanceId: instance.id,
      status: instance.state,
      message: 'Workflow started successfully',
    };
  }

  /**
   * Start workflow execution
   */
  private async startWorkflow(instanceId: string) {
    this.logger.log(`Starting workflow instance: ${instanceId}`);

    // Update instance status
    await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        state: 'IN_PROGRESS' as const,
        startedAt: new Date(),
      },
    });

    // Process first step
    const firstStep = await this.prisma.workflowStepInstance.findFirst({
      where: { instanceId, stepIndex: 0 },
    });

    if (firstStep) {
      await this.processNextStep(instanceId, firstStep.id);
    }
  }

  /**
   * Process a workflow step
   */
  async processStep(dto: ProcessStepDto, userId: string) {
    this.logger.log(
      `Processing step: ${dto.stepId} in instance: ${dto.instanceId}`,
    );

    // Get step instance
    const stepInstance = await this.prisma.workflowStepInstance.findFirst({
      where: {
        id: dto.stepId,
        instanceId: dto.instanceId,
      },
      include: {
        instance: {
          include: {
            workflow: true,
          },
        },
      },
    });

    if (!stepInstance) {
      throw new NotFoundException('Step instance not found');
    }

    if (stepInstance.status !== StepStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Step is not in progress. Current status: ${stepInstance.status}`,
      );
    }

    // Validate user can process this step
    await this.validationService.validateStepProcessor(stepInstance, userId);

    // Process based on step type
    const stepDef = stepInstance.stepDefinition as any;
    let result: any;

    switch (stepDef.type) {
      case 'APPROVAL':
        result = await this.processApprovalStep(stepInstance, dto, userId);
        break;
      case 'ACTION':
        result = await this.processActionStep(stepInstance, dto, userId);
        break;
      case 'CONDITION':
        result = await this.processConditionStep(stepInstance, dto, userId);
        break;
      case 'NOTIFICATION':
        result = await this.processNotificationStep(stepInstance, dto, userId);
        break;
      default:
        throw new BadRequestException(`Unknown step type: ${stepDef.type}`);
    }

    // Update step instance
    await this.prisma.workflowStepInstance.update({
      where: { id: stepInstance.id },
      data: {
        status: result.status,
        result: this.toJsonValue(result.data),
        completedAt: result.status === StepStatus.COMPLETED ? new Date() : null,
      },
    });

    // Create step history (commented - model doesn't exist in schema)
    /* await this.prisma.workflowStepHistory.create({
      data: {
        instanceId: dto.instanceId,
        stepInstanceId: stepInstance.id,
        action: dto.action,
        data: this.toJsonValue(dto.data),
        comments: dto.comments,
        performedBy: userId,
      },
    }); */

    // Process next steps if completed
    if (result.status === StepStatus.COMPLETED) {
      await this.processNextSteps(dto.instanceId, stepInstance);
    }

    // Check if workflow is complete
    await this.checkWorkflowCompletion(dto.instanceId);

    return result;
  }

  /**
   * Process approval step
   */
  private async processApprovalStep(
    stepInstance: any,
    dto: ProcessStepDto,
    userId: string,
  ) {
    const stepDef = stepInstance.stepDefinition;
    const approvalStrategy = stepDef.approvalStrategy || 'ANY';

    if (dto.action === 'approve') {
      // Record approval (commented - model doesn't exist in schema)
      /* await this.prisma.workflowApproval.create({
        data: {
          instanceId: dto.instanceId,
          stepInstanceId: stepInstance.id,
          approverId: userId,
          decision: 'APPROVED',
          comments: dto.comments,
          data: this.toJsonValue(dto.data),
        },
      }); */

      // Check if approval criteria met
      // TODO: Implement proper approval tracking
      const approvals = 1; // Simplified for now
      // const approvals = await this.prisma.workflowApproval.count({
      //   where: {
      //     stepInstanceId: stepInstance.id,
      //     decision: 'APPROVED',
      //   },
      // });

      const required = stepDef.config?.requiredApprovals || 1;

      if (approvalStrategy === 'ANY' || approvals >= required) {
        return {
          status: StepStatus.COMPLETED,
          data: { approved: true, ...dto.data },
        };
      }

      return { status: StepStatus.IN_PROGRESS, data: { approvals, required } };
    } else if (dto.action === 'reject') {
      // Record rejection
      // TODO: Implement rejection tracking
      // await this.prisma.workflowApproval.create({
      //   data: {
      //     instanceId: dto.instanceId,
      //     stepInstanceId: stepInstance.id,
      //     approverId: userId,
      //     decision: 'REJECTED',
      //     comments: dto.comments,
      //     data: this.toJsonValue(dto.data),
      //   },
      // });

      return {
        status: StepStatus.COMPLETED,
        data: { approved: false, ...dto.data },
      };
    }

    throw new BadRequestException(
      `Invalid action for approval step: ${dto.action}`,
    );
  }

  /**
   * Process action step
   */
  private async processActionStep(
    stepInstance: any,
    dto: ProcessStepDto,
    userId: string,
  ) {
    const stepDef = stepInstance.stepDefinition;

    // Execute action based on configuration
    // This would integrate with external systems or internal services
    this.logger.log(`Executing action: ${stepDef.config?.action}`);

    // For now, mark as completed
    return {
      status: StepStatus.COMPLETED,
      data: {
        action: stepDef.config?.action,
        result: dto.data,
      },
    };
  }

  /**
   * Process condition step
   */
  private async processConditionStep(
    stepInstance: any,
    dto: ProcessStepDto,
    userId: string,
  ) {
    const stepDef = stepInstance.stepDefinition;
    const condition = stepDef.condition;

    // Evaluate condition
    const conditionMet = await this.evaluateCondition(
      condition,
      stepInstance.instance,
    );

    return {
      status: StepStatus.COMPLETED,
      data: {
        conditionMet,
        evaluatedAt: new Date(),
      },
    };
  }

  /**
   * Process notification step
   */
  private async processNotificationStep(
    stepInstance: any,
    dto: ProcessStepDto,
    userId: string,
  ) {
    const stepDef = stepInstance.stepDefinition;

    // Send notifications
    await this.notificationService.sendStepNotification(
      stepInstance,
      stepDef.config,
    );

    return {
      status: StepStatus.COMPLETED,
      data: {
        notificationSent: true,
        sentAt: new Date(),
      },
    };
  }

  /**
   * Process next steps
   */
  private async processNextSteps(instanceId: string, currentStep: any) {
    const stepDef = currentStep.stepDefinition;
    const nextStepIds = stepDef.nextSteps || [];

    for (const nextStepId of nextStepIds) {
      const nextStep = await this.prisma.workflowStepInstance.findFirst({
        where: {
          instanceId,
          stepDefinition: {
            path: ['id'],
            equals: nextStepId,
          },
        },
      });

      if (nextStep) {
        await this.processNextStep(instanceId, nextStep.id);
      }
    }
  }

  /**
   * Process next step
   */
  private async processNextStep(instanceId: string, stepId: string) {
    const step = await this.prisma.workflowStepInstance.update({
      where: { id: stepId },
      data: {
        status: StepStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
      include: {
        instance: {
          include: {
            workflow: true,
          },
        },
      },
    });

    // Send notifications for step assignment
    await this.notificationService.notifyStepAssigned(step);

    // Auto-process if it's an automatic step
    const stepDef = step.stepDefinition as any;
    if (
      stepDef.type === 'ACTION' ||
      stepDef.type === 'CONDITION' ||
      stepDef.type === 'NOTIFICATION'
    ) {
      // Process automatically after a delay
      setTimeout(() => {
        this.processStep(
          {
            instanceId,
            stepId: step.id,
            action: 'complete',
            data: {},
          },
          'system',
        );
      }, 1000);
    }
  }

  /**
   * Check workflow completion
   */
  private async checkWorkflowCompletion(instanceId: string) {
    const steps = await this.prisma.workflowStepInstance.findMany({
      where: { instanceId },
    });

    const allCompleted = steps.every(
      (s) =>
        s.status === StepStatus.COMPLETED || s.status === StepStatus.SKIPPED,
    );

    if (allCompleted) {
      const instance = await this.prisma.workflowInstance.update({
        where: { id: instanceId },
        data: {
          state: 'COMPLETED' as const,
          completedAt: new Date(),
        },
        include: {
          workflow: true,
          // initiator relation doesn't exist in schema
        },
      });

      await this.notificationService.notifyWorkflowCompleted(instance);
      this.logger.log(`Workflow instance completed: ${instanceId}`);
    }
  }

  /**
   * Pause workflow
   */
  async pauseWorkflow(instanceId: string, userId: string) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new NotFoundException('Workflow instance not found');
    }

    if (instance.state !== 'IN_PROGRESS') {
      throw new BadRequestException('Can only pause running workflows');
    }

    await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        state: 'WAITING' as const,
        // pausedAt and pausedBy fields don't exist in schema
      },
    });

    this.logger.log(`Workflow instance paused: ${instanceId}`);
    return { message: 'Workflow paused successfully' };
  }

  /**
   * Resume workflow
   */
  async resumeWorkflow(instanceId: string, userId: string) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new NotFoundException('Workflow instance not found');
    }

    if (instance.state !== 'WAITING') {
      throw new BadRequestException('Can only resume paused workflows');
    }

    await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        state: 'IN_PROGRESS' as const,
        // resumedAt and resumedBy fields don't exist in schema
      },
    });

    this.logger.log(`Workflow instance resumed: ${instanceId}`);
    return { message: 'Workflow resumed successfully' };
  }

  /**
   * Cancel workflow
   */
  async cancelWorkflow(instanceId: string, userId: string, reason?: string) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        workflow: true,
        // initiator relation doesn't exist in schema
      },
    });

    if (!instance) {
      throw new NotFoundException('Workflow instance not found');
    }

    if (instance.state === 'COMPLETED' || instance.state === 'CANCELLED') {
      throw new BadRequestException(
        'Cannot cancel completed or already cancelled workflows',
      );
    }

    await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        state: 'CANCELLED' as const,
        completedAt: new Date(), // Using completedAt as cancelledAt doesn't exist
        metadata: this.toJsonValue({
          ...(instance.metadata as any),
          cancellationReason: reason,
        }),
      },
    });

    // Cancel all pending steps
    await this.prisma.workflowStepInstance.updateMany({
      where: {
        instanceId,
        status: { in: [StepStatus.PENDING, StepStatus.IN_PROGRESS] },
      },
      data: {
        status: 'CANCELLED' as any, // Type assertion needed for Prisma enum
      },
    });

    await this.notificationService.notifyWorkflowCancelled(instance, reason);
    this.logger.log(`Workflow instance cancelled: ${instanceId}`);

    return { message: 'Workflow cancelled successfully' };
  }

  /**
   * Determine assignee for a step
   */
  private determineAssignee(step: any, context: any): string | null {
    if (step.config?.assigneeId) {
      return step.config.assigneeId;
    }

    if (step.config?.assigneeRole) {
      // Would query for users with this role in the context
      // For now, return null
      return null;
    }

    if (step.config?.assigneePosition) {
      // Would query for users in this position in the context
      // For now, return null
      return null;
    }

    return null;
  }

  /**
   * Evaluate condition
   */
  private async evaluateCondition(
    condition: any,
    instance: any,
  ): Promise<boolean> {
    // Simple condition evaluation
    // In production, this would use a proper expression evaluator
    if (!condition) return true;

    const { field, operator, value } = condition;
    const instanceData = instance.data;
    const fieldValue = instanceData[field];

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'notEquals':
        return fieldValue !== value;
      case 'greaterThan':
        return fieldValue > value;
      case 'lessThan':
        return fieldValue < value;
      case 'contains':
        return fieldValue?.includes(value);
      default:
        return true;
    }
  }
}
