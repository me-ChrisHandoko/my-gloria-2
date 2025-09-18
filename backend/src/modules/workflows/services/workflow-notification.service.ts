import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';

@Injectable()
export class WorkflowNotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
  ) {
    this.logger.setContext('WorkflowNotificationService');
  }

  /**
   * Notify workflow started
   */
  async notifyWorkflowStarted(instance: any) {
    this.logger.log(
      `Sending workflow started notification for instance ${instance.id}`,
    );

    // Create notification for initiator
    await this.createNotification({
      userId: instance.initiatorId,
      type: 'WORKFLOW_STARTED',
      title: 'Workflow Started',
      content: `Your workflow "${instance.workflow.name}" has been started.`,
      metadata: {
        instanceId: instance.id,
        workflowId: instance.workflowId,
        workflowName: instance.workflow.name,
      },
    });
  }

  /**
   * Notify workflow completed
   */
  async notifyWorkflowCompleted(instance: any) {
    this.logger.log(
      `Sending workflow completed notification for instance ${instance.id}`,
    );

    await this.createNotification({
      userId: instance.initiatorId,
      type: 'WORKFLOW_COMPLETED',
      title: 'Workflow Completed',
      content: `Your workflow "${instance.workflow.name}" has been completed successfully.`,
      metadata: {
        instanceId: instance.id,
        workflowId: instance.workflowId,
        workflowName: instance.workflow.name,
      },
    });
  }

  /**
   * Notify workflow cancelled
   */
  async notifyWorkflowCancelled(instance: any, reason?: string) {
    this.logger.log(
      `Sending workflow cancelled notification for instance ${instance.id}`,
    );

    await this.createNotification({
      userId: instance.initiatorId,
      type: 'WORKFLOW_CANCELLED',
      title: 'Workflow Cancelled',
      content: `Your workflow "${instance.workflow.name}" has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
      metadata: {
        instanceId: instance.id,
        workflowId: instance.workflowId,
        workflowName: instance.workflow.name,
        cancellationReason: reason,
      },
    });
  }

  /**
   * Notify step assigned
   */
  async notifyStepAssigned(stepInstance: any) {
    if (!stepInstance.assignedToId) return;

    this.logger.log(
      `Sending step assignment notification for step ${stepInstance.id}`,
    );

    const stepDef = stepInstance.stepDefinition;

    await this.createNotification({
      userId: stepInstance.assignedToId,
      type: 'STEP_ASSIGNED',
      title: 'New Task Assigned',
      content: `You have been assigned to "${stepDef.name}" in workflow "${stepInstance.instance.workflow.name}".`,
      metadata: {
        instanceId: stepInstance.instanceId,
        stepInstanceId: stepInstance.id,
        stepName: stepDef.name,
        workflowName: stepInstance.instance.workflow.name,
      },
    });
  }

  /**
   * Send step notification
   */
  async sendStepNotification(stepInstance: any, config: any) {
    this.logger.log(
      `Sending custom step notification for step ${stepInstance.id}`,
    );

    const recipients = await this.determineRecipients(stepInstance, config);

    for (const recipientId of recipients) {
      await this.createNotification({
        userId: recipientId,
        type: config.type || 'WORKFLOW_NOTIFICATION',
        title: config.title || 'Workflow Notification',
        content: config.content || 'You have a workflow notification.',
        metadata: {
          instanceId: stepInstance.instanceId,
          stepInstanceId: stepInstance.id,
          ...config.metadata,
        },
      });
    }
  }

  /**
   * Notify delegation
   */
  async notifyDelegation(delegation: any) {
    this.logger.log(`Sending delegation notification for ${delegation.id}`);

    // Notify the person being delegated to
    await this.createNotification({
      userId: delegation.delegatedToId,
      type: 'TASK_DELEGATED',
      title: 'Task Delegated to You',
      content: `${delegation.delegatedFrom.name} has delegated a task to you.${delegation.reason ? ` Reason: ${delegation.reason}` : ''}`,
      metadata: {
        delegationId: delegation.id,
        instanceId: delegation.instanceId,
        stepInstanceId: delegation.stepInstanceId,
      },
    });

    // Notify the original assignee
    await this.createNotification({
      userId: delegation.delegatedFromId,
      type: 'DELEGATION_CONFIRMED',
      title: 'Task Delegation Confirmed',
      content: `Your task has been successfully delegated to ${delegation.delegatedTo.name}.`,
      metadata: {
        delegationId: delegation.id,
        instanceId: delegation.instanceId,
        stepInstanceId: delegation.stepInstanceId,
      },
    });
  }

  /**
   * Notify escalation
   */
  async notifyEscalation(escalation: any) {
    this.logger.log(`Sending escalation notification for ${escalation.id}`);

    // Notify the person being escalated to
    await this.createNotification({
      userId: escalation.escalatedToId,
      type: 'TASK_ESCALATED',
      title: 'Task Escalated to You',
      content: `A task has been escalated to you.${escalation.reason ? ` Reason: ${escalation.reason}` : ''}`,
      metadata: {
        escalationId: escalation.id,
        instanceId: escalation.instanceId,
        stepInstanceId: escalation.stepInstanceId,
        escalationLevel: escalation.level,
      },
    });

    // Notify the original assignee if exists
    if (escalation.escalatedFromId) {
      await this.createNotification({
        userId: escalation.escalatedFromId,
        type: 'ESCALATION_CONFIRMED',
        title: 'Task Escalated',
        content: `Your task has been escalated to ${escalation.escalatedTo.name}.`,
        metadata: {
          escalationId: escalation.id,
          instanceId: escalation.instanceId,
          stepInstanceId: escalation.stepInstanceId,
        },
      });
    }
  }

  /**
   * Create notification
   */
  private async createNotification(data: any) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          ...data,
          status: 'PENDING',
          priority: data.priority || 'NORMAL',
          metadata: data.metadata || {},
        },
      });

      // In a real implementation, this would trigger actual notification delivery
      // via email, push notifications, SMS, etc.
      this.logger.log(`Notification created: ${notification.id}`);

      return notification;
    } catch (error) {
      this.logger.error('Failed to create notification', error);
    }
  }

  /**
   * Determine notification recipients
   */
  private async determineRecipients(
    stepInstance: any,
    config: any,
  ): Promise<string[]> {
    const recipients: Set<string> = new Set();

    // Add specific users
    if (config.userIds) {
      config.userIds.forEach((id: string) => recipients.add(id));
    }

    // Add users by role
    if (config.roleIds) {
      const users = await this.prisma.userRole.findMany({
        where: { roleId: { in: config.roleIds } },
        select: { userProfileId: true },
      });
      users.forEach((u) => recipients.add(u.userProfileId));
    }

    // Add users by position
    if (config.positionIds) {
      const users = await this.prisma.userPosition.findMany({
        where: {
          positionId: { in: config.positionIds },
          isActive: true,
        },
        select: { userProfileId: true },
      });
      users.forEach((u) => recipients.add(u.userProfileId));
    }

    // Add initiator if specified
    if (config.includeInitiator) {
      const instance = await this.prisma.workflowInstance.findUnique({
        where: { id: stepInstance.instanceId },
      });
      if (instance) {
        // initiatorId field doesn't exist in WorkflowInstance
        // recipients.add(instance.initiatorId);
      }
    }

    return Array.from(recipients);
  }
}
