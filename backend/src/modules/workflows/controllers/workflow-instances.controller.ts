import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
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
import { WorkflowInstancesService } from '../services/workflow-instances.service';

@ApiTags('Workflow Instances')
@ApiBearerAuth()
@Controller('api/v1/workflow-instances')
@UseGuards(ClerkAuthGuard)
export class WorkflowInstancesController {
  constructor(private readonly instancesService: WorkflowInstancesService) {}

  /**
   * Get all workflow instances
   */
  @Get()
  @RequiredPermission('workflows', PermissionAction.READ)
  @ApiOperation({ summary: 'Get all workflow instances' })
  @ApiResponse({ status: 200, description: 'List of workflow instances' })
  async findAll(@Query() query: any) {
    return this.instancesService.findAll(query);
  }

  /**
   * Get user's workflow instances
   */
  @Get('my')
  @ApiOperation({ summary: 'Get my workflow instances' })
  @ApiResponse({ status: 200, description: 'List of user workflow instances' })
  async findMyInstances(@Query() query: any, @CurrentUser() user: any) {
    return this.instancesService.findUserInstances(user.id, query);
  }

  /**
   * Get workflow instance statistics
   */
  @Get('statistics')
  @RequiredPermission('workflows', PermissionAction.READ)
  @ApiOperation({ summary: 'Get workflow instance statistics' })
  @ApiResponse({ status: 200, description: 'Workflow instance statistics' })
  async getStatistics(@Query() query: any) {
    return this.instancesService.getStatistics(query);
  }

  /**
   * Get workflow instance by ID
   */
  @Get(':id')
  @RequiredPermission('workflows', PermissionAction.READ)
  @ApiOperation({ summary: 'Get workflow instance by ID' })
  @ApiResponse({ status: 200, description: 'Workflow instance details' })
  async findById(@Param('id') id: string) {
    return this.instancesService.findById(id);
  }

  /**
   * Get workflow instance history
   */
  @Get(':id/history')
  @RequiredPermission('workflows', PermissionAction.READ)
  @ApiOperation({ summary: 'Get workflow instance history' })
  @ApiResponse({ status: 200, description: 'Workflow instance history' })
  async getHistory(@Param('id') id: string) {
    return this.instancesService.getHistory(id);
  }
}
