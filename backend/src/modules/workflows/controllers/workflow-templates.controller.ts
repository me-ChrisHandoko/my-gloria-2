import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
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
import { WorkflowTemplatesService } from '../services/workflow-templates.service';
import { CreateWorkflowDto } from '../dto/create-workflow.dto';

@ApiTags('Workflow Templates')
@ApiBearerAuth()
@Controller('api/v1/workflow-templates')
@UseGuards(ClerkAuthGuard)
export class WorkflowTemplatesController {
  constructor(private readonly templatesService: WorkflowTemplatesService) {}

  /**
   * Get all workflow templates
   */
  @Get()
  @RequiredPermission('workflows', PermissionAction.READ)
  @ApiOperation({ summary: 'Get all workflow templates' })
  @ApiResponse({ status: 200, description: 'List of workflow templates' })
  async findAll(@Query() query: any) {
    return this.templatesService.findAll(query);
  }

  /**
   * Get popular templates
   */
  @Get('popular')
  @RequiredPermission('workflows', PermissionAction.READ)
  @ApiOperation({ summary: 'Get popular workflow templates' })
  @ApiResponse({ status: 200, description: 'List of popular templates' })
  async getPopularTemplates(@Query('limit') limit?: number) {
    return this.templatesService.getPopularTemplates(limit);
  }

  /**
   * Create workflow from template
   */
  @Post(':templateId/create')
  @RequiredPermission('workflows', PermissionAction.CREATE)
  @ApiOperation({ summary: 'Create workflow from template' })
  @ApiResponse({ status: 201, description: 'Workflow created from template' })
  async createFromTemplate(
    @Param('templateId') templateId: string,
    @Body() overrides: Partial<CreateWorkflowDto>,
    @CurrentUser() user: any,
  ) {
    return this.templatesService.createFromTemplate(
      templateId,
      overrides,
      user.id,
    );
  }

  /**
   * Convert workflow to template
   */
  @Post(':workflowId/convert')
  @RequiredPermission('workflows', PermissionAction.UPDATE)
  @ApiOperation({ summary: 'Convert workflow to template' })
  @ApiResponse({ status: 200, description: 'Workflow converted to template' })
  async convertToTemplate(
    @Param('workflowId') workflowId: string,
    @CurrentUser() user: any,
  ) {
    return this.templatesService.convertToTemplate(workflowId, user.id);
  }
}
