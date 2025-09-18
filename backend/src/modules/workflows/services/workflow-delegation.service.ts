import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import { WorkflowValidationService } from './workflow-validation.service';
import { WorkflowNotificationService } from './workflow-notification.service';
import {
  DelegateWorkflowDto,
  EscalateWorkflowDto,
} from '../dto/execute-workflow.dto';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class WorkflowDelegationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
    private readonly validationService: WorkflowValidationService,
    private readonly notificationService: WorkflowNotificationService,
  ) {
    this.logger.setContext('WorkflowDelegationService');
  }

  /**
   * Delegate workflow step
   */
  async delegate(dto: DelegateWorkflowDto, userId: string) {
    this.logger.log(
      `Delegating step ${dto.stepId} to user ${dto.delegateToUserId}`,
    );

    // Validate delegation
    await this.validationService.validateDelegation(
      dto.instanceId,
      dto.stepId,
      userId,
      dto.delegateToUserId,
    );

    // Create delegation record
    const delegation = await this.prisma.workflowDelegation.create({
      data: {
        id: uuidv7(),
        instanceId: dto.instanceId,
        stepInstanceId: dto.stepId,
        delegatedFromId: userId,
        delegatedToId: dto.delegateToUserId,
        reason: dto.reason,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isActive: true,
      },
      include: {
        delegatedFrom: true,
        delegatedTo: true,
        stepInstance: true,
      },
    });

    // Update step assignee
    await this.prisma.workflowStepInstance.update({
      where: { id: dto.stepId },
      data: { assigneeId: dto.delegateToUserId },
    });

    // Send notifications
    await this.notificationService.notifyDelegation(delegation);

    this.logger.log(`Delegation created: ${delegation.id}`);
    return delegation;
  }

  /**
   * Revoke delegation
   */
  async revokeDelegation(delegationId: string, userId: string) {
    const delegation = await this.prisma.workflowDelegation.findUnique({
      where: { id: delegationId },
      include: {
        stepInstance: true,
      },
    });

    if (!delegation) {
      throw new NotFoundException('Delegation not found');
    }

    if (delegation.delegatedFromId !== userId) {
      throw new BadRequestException('You can only revoke your own delegations');
    }

    if (!delegation.isActive) {
      throw new BadRequestException('Delegation is already inactive');
    }

    // Update delegation
    await this.prisma.workflowDelegation.update({
      where: { id: delegationId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedBy: userId,
      },
    });

    // Restore original assignee
    await this.prisma.workflowStepInstance.update({
      where: { id: delegation.stepInstanceId },
      data: { assigneeId: delegation.delegatedFromId },
    });

    this.logger.log(`Delegation revoked: ${delegationId}`);
    return { message: 'Delegation revoked successfully' };
  }

  /**
   * Escalate workflow step
   */
  async escalate(dto: EscalateWorkflowDto, userId: string) {
    this.logger.log(`Escalating step ${dto.stepId}`);

    const stepInstance = await this.prisma.workflowStepInstance.findFirst({
      where: { id: dto.stepId, instanceId: dto.instanceId },
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

    const stepDef = stepInstance.stepDefinition as any;
    if (!stepDef.allowEscalation) {
      throw new BadRequestException('Escalation is not allowed for this step');
    }

    // Determine escalation target
    let escalateToId = dto.escalateToId;
    if (!escalateToId) {
      // Auto-determine based on hierarchy
      const targetId = await this.determineEscalationTarget(
        stepInstance,
        dto.escalationLevel,
      );
      if (!targetId) {
        throw new BadRequestException('Cannot determine escalation target');
      }
      escalateToId = targetId;
    }

    // Create escalation record
    const escalation = await this.prisma.workflowEscalation.create({
      data: {
        id: uuidv7(),
        instanceId: dto.instanceId,
        stepInstanceId: dto.stepId,
        escalatedFromId: stepInstance.assigneeId || userId,
        escalatedToId: escalateToId,
        level: dto.escalationLevel || '1',
        reason: dto.reason,
        escalatedBy: userId,
      },
      include: {
        escalatedFrom: true,
        escalatedTo: true,
        stepInstance: true,
      },
    });

    // Update step assignee
    await this.prisma.workflowStepInstance.update({
      where: { id: dto.stepId },
      data: {
        assigneeId: escalateToId,
        metadata: {
          ...((stepInstance.metadata as any) || {}),
          escalated: true,
          escalationId: escalation.id,
        },
      },
    });

    // Send notifications
    await this.notificationService.notifyEscalation(escalation);

    this.logger.log(`Escalation created: ${escalation.id}`);
    return escalation;
  }

  /**
   * Get user delegations
   */
  async getUserDelegations(userId: string, type: 'from' | 'to' | 'all') {
    const where: any = { isActive: true };

    if (type === 'from') {
      where.delegatedFromId = userId;
    } else if (type === 'to') {
      where.delegatedToId = userId;
    } else {
      where.OR = [{ delegatedFromId: userId }, { delegatedToId: userId }];
    }

    const delegations = await this.prisma.workflowDelegation.findMany({
      where,
      include: {
        instance: {
          include: {
            workflow: true,
          },
        },
        stepInstance: true,
        delegatedFrom: true,
        delegatedTo: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return delegations;
  }

  /**
   * Determine escalation target
   */
  private async determineEscalationTarget(
    stepInstance: any,
    level?: string,
  ): Promise<string | null> {
    // Get current assignee's manager
    if (stepInstance.assignedToId) {
      const userPosition = await this.prisma.userPosition.findFirst({
        where: {
          userProfileId: stepInstance.assigneeId,
          isActive: true,
        },
      });

      if (userPosition) {
        // Get the position with hierarchy info
        const position = await this.prisma.position.findUnique({
          where: { id: userPosition.positionId },
          include: {
            hierarchies: {
              include: {
                reportsTo: true,
              },
            },
          },
        });

        if (position?.hierarchies?.reportsToId) {
          // Find user in the reporting position
          const manager = await this.prisma.userPosition.findFirst({
            where: {
              positionId: position.hierarchies.reportsToId,
              isActive: true,
            },
          });

          if (manager) {
            return manager.userProfileId;
          }
        }
      }
    }

    // Fallback to workflow owner or admin
    return stepInstance.instance.workflow.createdBy;
  }
}
