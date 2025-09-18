import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '@/core/auth/guards/clerk-auth.guard';
import { CurrentUser } from '@/core/auth/decorators/current-user.decorator';
import {
  RequiredPermission,
  PermissionAction,
} from '@/core/auth/decorators/permissions.decorator';
import { WorkflowsService } from '../services/workflows.service';
import { WorkflowExecutionService } from '../services/workflow-execution.service';
import { WorkflowDelegationService } from '../services/workflow-delegation.service';
import { CreateWorkflowDto } from '../dto/create-workflow.dto';
import {
  ExecuteWorkflowDto,
  ProcessStepDto,
  DelegateWorkflowDto,
  EscalateWorkflowDto,
} from '../dto/execute-workflow.dto';

@ApiTags('Workflows')
@ApiBearerAuth()
@Controller('api/v1/workflows')
@UseGuards(ClerkAuthGuard)
export class WorkflowsController {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly executionService: WorkflowExecutionService,
    private readonly delegationService: WorkflowDelegationService,
  ) {}

  /**
   * Create new workflow
   */
  @Post()
  @RequiredPermission('workflows', PermissionAction.CREATE)
  @ApiOperation({ summary: 'Create new workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  async create(@Body() dto: CreateWorkflowDto, @CurrentUser() user: any) {
    return this.workflowsService.create(dto, user.id);
  }

  /**
   * Get all workflows
   */
  @Get()
  @RequiredPermission('workflows', PermissionAction.READ)
  @ApiOperation({ summary: 'Get all workflows' })
  @ApiResponse({ status: 200, description: 'List of workflows' })
  async findAll(@Query() query: any) {
    return this.workflowsService.findAll(query);
  }

  /**
   * Get workflow statistics
   */
  @Get('statistics')
  @RequiredPermission('workflows', PermissionAction.READ)
  @ApiOperation({ summary: 'Get workflow statistics' })
  @ApiResponse({ status: 200, description: 'Workflow statistics' })
  async getStatistics() {
    return this.workflowsService.getStatistics();
  }

  /**
   * Get workflow by ID
   */
  @Get(':id')
  @RequiredPermission('workflows', PermissionAction.READ)
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiResponse({ status: 200, description: 'Workflow details' })
  async findById(@Param('id') id: string) {
    return this.workflowsService.findById(id);
  }

  /**
   * Get workflow by code
   */
  @Get('code/:code')
  @RequiredPermission('workflows', PermissionAction.READ)
  @ApiOperation({ summary: 'Get workflow by code' })
  @ApiResponse({ status: 200, description: 'Workflow details' })
  async findByCode(@Param('code') code: string) {
    return this.workflowsService.findByCode(code);
  }

  /**
   * Update workflow
   */
  @Put(':id')
  @RequiredPermission('workflows', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Update workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateWorkflowDto>,
    @CurrentUser() user: any,
  ) {
    return this.workflowsService.update(id, dto, user.id);
  }

  /**
   * Activate workflow
   */
  @Post(':id/activate')
  @RequiredPermission('workflows', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Activate workflow' })
  @ApiResponse({ status: 200, description: 'Workflow activated successfully' })
  async activate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workflowsService.activate(id, user.id);
  }

  /**
   * Deactivate workflow
   */
  @Post(':id/deactivate')
  @RequiredPermission('workflows', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Deactivate workflow' })
  @ApiResponse({
    status: 200,
    description: 'Workflow deactivated successfully',
  })
  async deactivate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workflowsService.deactivate(id, user.id);
  }

  /**
   * Archive workflow
   */
  @Post(':id/archive')
  @RequiredPermission('workflows', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Archive workflow' })
  @ApiResponse({ status: 200, description: 'Workflow archived successfully' })
  async archive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workflowsService.archive(id, user.id);
  }

  /**
   * Clone workflow
   */
  @Post(':id/clone')
  @RequiredPermission('workflows', PermissionAction.CREATE)
  @ApiOperation({ summary: 'Clone workflow' })
  @ApiResponse({ status: 201, description: 'Workflow cloned successfully' })
  async clone(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workflowsService.clone(id, user.id);
  }

  /**
   * Delete workflow
   */
  @Delete(':id')
  @RequiredPermission('workflows', PermissionAction.DELETE)
  @ApiOperation({ summary: 'Delete workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deleted successfully' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workflowsService.delete(id, user.id);
  }

  /**
   * Execute workflow
   */
  @Post('execute')
  @RequiredPermission('workflows', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Execute workflow' })
  @ApiResponse({ status: 201, description: 'Workflow execution started' })
  async execute(@Body() dto: ExecuteWorkflowDto, @CurrentUser() user: any) {
    return this.executionService.execute(dto, user.id);
  }

  /**
   * Process workflow step
   */
  @Post('process-step')
  @RequiredPermission('workflows', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Process workflow step' })
  @ApiResponse({ status: 200, description: 'Step processed successfully' })
  async processStep(@Body() dto: ProcessStepDto, @CurrentUser() user: any) {
    return this.executionService.processStep(dto, user.id);
  }

  /**
   * Pause workflow instance
   */
  @Post('instances/:instanceId/pause')
  @RequiredPermission('workflows', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Pause workflow instance' })
  @ApiResponse({ status: 200, description: 'Workflow paused successfully' })
  async pauseWorkflow(
    @Param('instanceId') instanceId: string,
    @CurrentUser() user: any,
  ) {
    return this.executionService.pauseWorkflow(instanceId, user.id);
  }

  /**
   * Resume workflow instance
   */
  @Post('instances/:instanceId/resume')
  @RequiredPermission('workflows', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Resume workflow instance' })
  @ApiResponse({ status: 200, description: 'Workflow resumed successfully' })
  async resumeWorkflow(
    @Param('instanceId') instanceId: string,
    @CurrentUser() user: any,
  ) {
    return this.executionService.resumeWorkflow(instanceId, user.id);
  }

  /**
   * Cancel workflow instance
   */
  @Post('instances/:instanceId/cancel')
  @RequiredPermission('workflows', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Cancel workflow instance' })
  @ApiResponse({ status: 200, description: 'Workflow cancelled successfully' })
  async cancelWorkflow(
    @Param('instanceId') instanceId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.executionService.cancelWorkflow(instanceId, user.id, reason);
  }

  /**
   * Delegate workflow step
   */
  @Post('delegate')
  @RequiredPermission('workflows', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Delegate workflow step' })
  @ApiResponse({ status: 200, description: 'Step delegated successfully' })
  async delegate(@Body() dto: DelegateWorkflowDto, @CurrentUser() user: any) {
    return this.delegationService.delegate(dto, user.id);
  }

  /**
   * Revoke delegation
   */
  @Post('delegations/:delegationId/revoke')
  @RequiredPermission('workflows', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Revoke delegation' })
  @ApiResponse({ status: 200, description: 'Delegation revoked successfully' })
  async revokeDelegation(
    @Param('delegationId') delegationId: string,
    @CurrentUser() user: any,
  ) {
    return this.delegationService.revokeDelegation(delegationId, user.id);
  }

  /**
   * Escalate workflow step
   */
  @Post('escalate')
  @RequiredPermission('workflows', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Escalate workflow step' })
  @ApiResponse({ status: 200, description: 'Step escalated successfully' })
  async escalate(@Body() dto: EscalateWorkflowDto, @CurrentUser() user: any) {
    return this.delegationService.escalate(dto, user.id);
  }

  /**
   * Get user delegations
   */
  @Get('delegations/my')
  @ApiOperation({ summary: 'Get my delegations' })
  @ApiResponse({ status: 200, description: 'List of delegations' })
  async getMyDelegations(
    @Query('type') type: 'from' | 'to' | 'all' = 'all',
    @CurrentUser() user: any,
  ) {
    return this.delegationService.getUserDelegations(user.id, type);
  }
}
