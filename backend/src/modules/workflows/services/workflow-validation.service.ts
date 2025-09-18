import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { PermissionsService } from '@/modules/permissions/services/permissions.service';
import { ExecuteWorkflowDto } from '../dto/execute-workflow.dto';

@Injectable()
export class WorkflowValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * Validate workflow execution
   */
  async validateExecution(
    workflow: any,
    dto: ExecuteWorkflowDto,
    userId: string,
  ) {
    // TODO: Implement permission check when checkPermission method is available
    // const hasPermission = await this.permissionsService.checkPermission(
    //   userId,
    //   'WORKFLOW_EXECUTE',
    //   { workflowId: workflow.id, schoolId: workflow.schoolId, departmentId: workflow.departmentId },
    // );

    // if (!hasPermission) {
    //   throw new ForbiddenException('You do not have permission to execute this workflow');
    // }

    // Validate required data
    const requiredFields = workflow.metadata?.requiredFields || [];
    for (const field of requiredFields) {
      if (!dto.data?.[field]) {
        throw new BadRequestException(`Required field missing: ${field}`);
      }
    }

    // Check execution limits
    if (workflow.metadata?.executionLimits) {
      const limits = workflow.metadata.executionLimits;

      // Check daily limit
      if (limits.daily) {
        const todayCount = await this.prisma.workflowInstance.count({
          where: {
            workflowId: workflow.id,
            initiatorId: userId,
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        });

        if (todayCount >= limits.daily) {
          throw new BadRequestException('Daily execution limit reached');
        }
      }

      // Check concurrent limit
      if (limits.concurrent) {
        const activeCount = await this.prisma.workflowInstance.count({
          where: {
            workflowId: workflow.id,
            initiatorId: userId,
            status: { in: ['PENDING', 'RUNNING', 'PAUSED'] },
          },
        });

        if (activeCount >= limits.concurrent) {
          throw new BadRequestException('Concurrent execution limit reached');
        }
      }
    }

    return true;
  }

  /**
   * Validate step processor
   */
  async validateStepProcessor(stepInstance: any, userId: string) {
    const stepDef = stepInstance.stepDefinition;

    // Check if user is assigned to this step
    if (stepInstance.assignedToId && stepInstance.assignedToId !== userId) {
      // Check for delegation
      const delegation = await this.prisma.workflowDelegation.findFirst({
        where: {
          instanceId: stepInstance.instanceId,
          stepInstanceId: stepInstance.id,
          delegatedToId: userId,
          isActive: true,
          expiresAt: { gte: new Date() },
        },
      });

      if (!delegation) {
        throw new ForbiddenException(
          'You are not assigned to process this step',
        );
      }
    }

    // Check role-based assignment
    if (stepDef.config?.requiredRole) {
      const hasRole = await this.prisma.userRole.findFirst({
        where: {
          userProfileId: userId,
          role: { code: stepDef.config.requiredRole },
        },
      });

      if (!hasRole) {
        throw new ForbiddenException(
          `Required role not found: ${stepDef.config.requiredRole}`,
        );
      }
    }

    // Check position-based assignment
    if (stepDef.config?.requiredPosition) {
      const hasPosition = await this.prisma.userPosition.findFirst({
        where: {
          userProfileId: userId,
          position: { code: stepDef.config.requiredPosition },
          isActive: true,
        },
      });

      if (!hasPosition) {
        throw new ForbiddenException(
          `Required position not found: ${stepDef.config.requiredPosition}`,
        );
      }
    }

    return true;
  }

  /**
   * Validate workflow delegation
   */
  async validateDelegation(
    instanceId: string,
    stepId: string,
    fromUserId: string,
    toUserId: string,
  ) {
    // Check if delegation is allowed for this step
    const stepInstance = await this.prisma.workflowStepInstance.findFirst({
      where: { id: stepId, instanceId },
    });

    if (!stepInstance) {
      throw new BadRequestException('Step instance not found');
    }

    const stepDef = stepInstance.stepDefinition as any;
    if (!stepDef.allowDelegation) {
      throw new BadRequestException('Delegation is not allowed for this step');
    }

    // Check if from user is assigned to this step
    if (stepInstance.assigneeId !== fromUserId) {
      throw new ForbiddenException('You are not assigned to this step');
    }

    // Check if to user exists and is active
    const toUser = await this.prisma.userProfile.findFirst({
      where: { id: toUserId, isActive: true },
    });

    if (!toUser) {
      throw new BadRequestException('Target user not found or inactive');
    }

    // TODO: Implement permission check when checkPermission method is available
    // // Check if to user has required permissions
    // if (stepDef.config?.requiredPermission) {
    //   const hasPermission = await this.permissionsService.checkPermission(
    //     toUserId,
    //     stepDef.config.requiredPermission,
    //   );

    //   if (!hasPermission) {
    //     throw new BadRequestException('Target user does not have required permissions');
    //   }
    // }

    return true;
  }
}
