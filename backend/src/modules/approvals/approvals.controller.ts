/**
 * Approvals Controller - Example Implementation with Temporal
 * This controller demonstrates how to use Temporal workflows for approval processes
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpStatus,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { TemporalService } from '../../temporal/temporal.service';
import { ApprovalRequest } from '../../temporal/types/workflow.types';
import { ClerkAuthGuard } from '../../core/auth/guards/clerk-auth.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';

// DTOs
class CreateApprovalDto {
  requestId: string;
  approverId: string;
  module: string;
  entityType: string;
  entityId: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
  dueDate?: Date;
  metadata?: Record<string, any>;
}

@Controller('api/approvals')
@UseGuards(ClerkAuthGuard)
export class ApprovalsController {
  constructor(private readonly temporalService: TemporalService) {}

  /**
   * Create a new approval request
   * POST /api/approvals
   */
  @Post()
  async createApproval(
    @Body() dto: CreateApprovalDto,
    @CurrentUser() user: any,
  ) {
    // Build approval request
    const request: ApprovalRequest = {
      id: `approval-${Date.now()}`,
      requestId: dto.requestId,
      initiatorId: user.id,
      approverId: dto.approverId,
      module: dto.module,
      entityType: dto.entityType,
      entityId: dto.entityId,
      priority: dto.priority,
      dueDate: dto.dueDate,
      metadata: dto.metadata,
    };

    // Start Temporal workflow
    const { workflowId, runId } = await this.temporalService
      .startApprovalWorkflow(request);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Approval workflow started successfully',
      data: {
        workflowId,
        runId,
        requestId: request.requestId,
        status: 'STARTED',
      },
    };
  }

  /**
   * Create a simple approval request (without escalation)
   * POST /api/approvals/simple
   */
  @Post('simple')
  async createSimpleApproval(
    @Body() dto: CreateApprovalDto,
    @CurrentUser() user: any,
  ) {
    const request: ApprovalRequest = {
      id: `simple-approval-${Date.now()}`,
      requestId: dto.requestId,
      initiatorId: user.id,
      approverId: dto.approverId,
      module: dto.module,
      entityType: dto.entityType,
      entityId: dto.entityId,
      priority: dto.priority,
      metadata: dto.metadata,
    };

    const { workflowId, runId } = await this.temporalService
      .startSimpleApprovalWorkflow(request);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Simple approval workflow started successfully',
      data: {
        workflowId,
        runId,
        requestId: request.requestId,
        status: 'STARTED',
      },
    };
  }

  /**
   * Get approval workflow status
   * GET /api/approvals/:workflowId/status
   */
  @Get(':workflowId/status')
  async getApprovalStatus(@Param('workflowId') workflowId: string) {
    const status = await this.temporalService.getWorkflowStatus(workflowId);

    return {
      statusCode: HttpStatus.OK,
      data: {
        workflowId,
        ...status,
      },
    };
  }

  /**
   * Get approval workflow result
   * GET /api/approvals/:workflowId/result
   */
  @Get(':workflowId/result')
  async getApprovalResult(@Param('workflowId') workflowId: string) {
    try {
      const result = await this.temporalService.getWorkflowResult(workflowId);

      return {
        statusCode: HttpStatus.OK,
        data: {
          workflowId,
          result,
        },
      };
    } catch (error) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Workflow not yet completed or failed',
        error: error.message,
      };
    }
  }

  /**
   * Cancel an approval workflow
   * DELETE /api/approvals/:workflowId
   */
  @Delete(':workflowId')
  async cancelApproval(
    @Param('workflowId') workflowId: string,
    @Body('reason') reason?: string,
  ) {
    await this.temporalService.cancelWorkflow(workflowId, reason);

    return {
      statusCode: HttpStatus.OK,
      message: 'Approval workflow cancelled successfully',
      data: {
        workflowId,
        status: 'CANCELLED',
      },
    };
  }

  /**
   * List all approval workflows
   * GET /api/approvals
   */
  @Get()
  async listApprovals() {
    // Query for approval workflows
    const query = 'WorkflowType="approvalWorkflow" OR WorkflowType="simpleApprovalWorkflow"';
    const workflows = await this.temporalService.listWorkflows(query);

    return {
      statusCode: HttpStatus.OK,
      data: {
        total: workflows.length,
        workflows: workflows.map(w => ({
          workflowId: w.workflowId,
          runId: w.runId,
          type: w.type.name,
          status: w.status.name,
          startTime: w.startTime,
          closeTime: w.closeTime,
        })),
      },
    };
  }
}
