import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import { WorkflowsService } from './workflows.service';
import {
  CreateWorkflowDto,
  WorkflowStatus,
  WorkflowTriggerType,
} from '../dto/create-workflow.dto';

@Injectable()
export class WorkflowTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
    private readonly workflowsService: WorkflowsService,
  ) {
    this.logger.setContext('WorkflowTemplatesService');
  }

  /**
   * Get all workflow templates
   */
  async findAll(query: any) {
    return this.workflowsService.findAll({ ...query, isTemplate: 'true' });
  }

  /**
   * Create workflow from template
   */
  async createFromTemplate(
    templateId: string,
    overrides: Partial<CreateWorkflowDto>,
    userId: string,
  ) {
    const template = await this.prisma.workflow.findFirst({
      where: { id: templateId }, // isTemplate and deletedAt fields don't exist
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    const newWorkflow: CreateWorkflowDto = {
      name: overrides.name || `${template.name} (From Template)`,
      description: overrides.description || template.description || undefined,
      code: overrides.code || `template_${Date.now()}`,
      category: overrides.category || template.category,
      status: overrides.status || WorkflowStatus.DRAFT,
      triggerType:
        overrides.triggerType || (template.triggerType as WorkflowTriggerType),
      triggerConfig: overrides.triggerConfig || (template.triggerConfig as any),
      steps: overrides.steps || (template.steps as any),
      metadata: overrides.metadata || (template.metadata as any),
      slaConfig: overrides.slaConfig || (template.slaConfig as any),
      schoolId: overrides.schoolId || template.schoolId || undefined,
      departmentId:
        overrides.departmentId || template.departmentId || undefined,
      isTemplate: false,
    };

    return this.workflowsService.create(newWorkflow, userId);
  }

  /**
   * Convert workflow to template
   */
  async convertToTemplate(workflowId: string, userId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, deletedAt: null },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    if (workflow.isTemplate) {
      throw new BadRequestException('Workflow is already a template');
    }

    const updated = await this.prisma.workflow.update({
      where: { id: workflowId },
      data: {
        isTemplate: true,
        status: 'INACTIVE',
        modifiedBy: userId,
      },
    });

    this.logger.log(`Workflow ${workflowId} converted to template`);
    return updated;
  }

  /**
   * Get popular templates
   */
  async getPopularTemplates(limit = 10) {
    const templates = await this.prisma.$queryRaw`
      SELECT 
        w.*,
        COUNT(DISTINCT wi.id) as usage_count
      FROM "Workflow" w
      LEFT JOIN "Workflow" derived ON derived."metadata"->>'templateId' = w.id::text
      LEFT JOIN "WorkflowInstance" wi ON wi."workflowId" = derived.id
      WHERE w."isTemplate" = true
        AND w."deletedAt" IS NULL
      GROUP BY w.id
      ORDER BY usage_count DESC
      LIMIT ${limit}
    `;

    return templates;
  }
}
