import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import { CacheService } from '@/core/cache/cache.service';
import {
  CreateWorkflowDto,
  WorkflowStatus,
  WorkflowTriggerType,
} from '../dto/create-workflow.dto';
import { Prisma } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
    private readonly cache: CacheService,
  ) {
    // Set context for logging
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
   * Create a new workflow definition
   */
  async create(dto: CreateWorkflowDto, userId: string) {
    this.logger.log(`Creating workflow: ${dto.name}`);

    // Check for duplicate code
    const existing = await this.prisma.workflow.findFirst({
      where: { code: dto.code, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException(
        `Workflow with code ${dto.code} already exists`,
      );
    }

    try {
      const workflow = await this.prisma.workflow.create({
        data: {
          id: uuidv7(),
          name: dto.name,
          module: 'workflow',
          description: dto.description,
          code: dto.code,
          category: dto.category,
          status: dto.status || WorkflowStatus.DRAFT,
          triggerType: dto.triggerType,
          triggerConfig: this.toJsonValue(dto.triggerConfig),
          steps: this.toJsonValue(dto.steps),
          metadata: this.toJsonValue(dto.metadata),
          slaConfig: this.toJsonValue(dto.slaConfig),
          schoolId: dto.schoolId || null,
          departmentId: dto.departmentId || null,
          isTemplate: dto.isTemplate || false,
          createdBy: userId,
          modifiedBy: userId,
        },
        include: {
          school: true,
          department: true,
        },
      });

      // Clear cache
      await this.cache.del('workflows:*');

      this.logger.log(`Workflow created: ${workflow.id}`);
      return workflow;
    } catch (error) {
      this.logger.error('Failed to create workflow', error);
      throw new BadRequestException('Failed to create workflow');
    }
  }

  /**
   * Get all workflows with filtering
   */
  async findAll(query: any) {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      status,
      schoolId,
      departmentId,
      isTemplate,
    } = query;

    const skip = (page - 1) * limit;
    const where: Prisma.WorkflowWhereInput = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) where.category = category;
    if (status) where.status = status;
    if (schoolId) where.schoolId = schoolId;
    if (departmentId) where.departmentId = departmentId;
    if (isTemplate !== undefined) where.isTemplate = isTemplate === 'true';

    const [workflows, total] = await Promise.all([
      this.prisma.workflow.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          school: true,
          department: true,
          _count: {
            select: {
              instances: true,
            },
          },
        },
      }),
      this.prisma.workflow.count({ where }),
    ]);

    return {
      data: workflows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get workflow by ID
   */
  async findById(id: string) {
    const cacheKey = `workflow:${id}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const workflow = await this.prisma.workflow.findFirst({
      where: { id, deletedAt: null },
      include: {
        school: true,
        department: true,
        instances: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            steps: true,
          },
        },
        _count: {
          select: {
            instances: true,
          },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }

    await this.cache.set(cacheKey, workflow, 300); // Cache for 5 minutes
    return workflow;
  }

  /**
   * Get workflow by code
   */
  async findByCode(code: string) {
    const cacheKey = `workflow:code:${code}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const workflow = await this.prisma.workflow.findFirst({
      where: { code, deletedAt: null },
      include: {
        school: true,
        department: true,
      },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with code ${code} not found`);
    }

    await this.cache.set(cacheKey, workflow, 300);
    return workflow;
  }

  /**
   * Update workflow
   */
  async update(id: string, dto: Partial<CreateWorkflowDto>, userId: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }

    if (
      workflow.status === WorkflowStatus.ACTIVE &&
      dto.status !== WorkflowStatus.INACTIVE
    ) {
      throw new BadRequestException(
        'Cannot modify active workflow. Please deactivate it first.',
      );
    }

    if (dto.code && dto.code !== (workflow as any).code) {
      const existing = await this.prisma.workflow.findFirst({
        where: { code: dto.code, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException(
          `Workflow with code ${dto.code} already exists`,
        );
      }
    }

    try {
      const updated = await this.prisma.workflow.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          code: dto.code,
          category: dto.category,
          status: dto.status,
          triggerType: dto.triggerType,
          triggerConfig: this.toJsonValue(dto.triggerConfig),
          steps: this.toJsonValue(dto.steps),
          metadata: this.toJsonValue(dto.metadata),
          slaConfig: this.toJsonValue(dto.slaConfig),
          schoolId: dto.schoolId,
          departmentId: dto.departmentId,
          isTemplate: dto.isTemplate,
          modifiedBy: userId,
        },
        include: {
          school: true,
          department: true,
        },
      });

      // Clear cache
      await this.cache.del(`workflow:${id}`);
      await this.cache.del(`workflow:code:${(workflow as any).code}`);
      if (dto.code && dto.code !== (workflow as any).code) {
        await this.cache.del(`workflow:code:${dto.code}`);
      }

      this.logger.log(`Workflow updated: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error('Failed to update workflow', error);
      throw new BadRequestException('Failed to update workflow');
    }
  }

  /**
   * Activate workflow
   */
  async activate(id: string, userId: string) {
    const workflow = await this.findById(id);

    if ((workflow as any).status === WorkflowStatus.ACTIVE) {
      throw new BadRequestException('Workflow is already active');
    }

    // Validate workflow before activation
    await this.validateWorkflow(workflow);

    const updated = await this.prisma.workflow.update({
      where: { id },
      data: {
        status: WorkflowStatus.ACTIVE,
        modifiedBy: userId,
      },
    });

    await this.cache.del(`workflow:${id}`);
    this.logger.log(`Workflow activated: ${id}`);
    return updated;
  }

  /**
   * Deactivate workflow
   */
  async deactivate(id: string, userId: string) {
    const workflow = await this.findById(id);

    if ((workflow as any).status !== WorkflowStatus.ACTIVE) {
      throw new BadRequestException('Workflow is not active');
    }

    // Check for running instances
    const runningInstances = await this.prisma.workflowInstance.count({
      where: {
        workflowId: id,
        status: { in: ['RUNNING', 'PAUSED'] },
      },
    });

    if (runningInstances > 0) {
      throw new BadRequestException(
        `Cannot deactivate workflow with ${runningInstances} running instances`,
      );
    }

    const updated = await this.prisma.workflow.update({
      where: { id },
      data: {
        status: WorkflowStatus.INACTIVE,
        modifiedBy: userId,
      },
    });

    await this.cache.del(`workflow:${id}`);
    this.logger.log(`Workflow deactivated: ${id}`);
    return updated;
  }

  /**
   * Delete workflow (soft delete)
   */
  async delete(id: string, userId: string) {
    const workflow = await this.findById(id);

    if ((workflow as any).status === WorkflowStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete active workflow');
    }

    // Check for any instances
    const instanceCount = await this.prisma.workflowInstance.count({
      where: { workflowId: id },
    });

    if (instanceCount > 0) {
      throw new BadRequestException(
        `Cannot delete workflow with ${instanceCount} instances. Archive it instead.`,
      );
    }

    await this.prisma.workflow.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        modifiedBy: userId,
      },
    });

    await this.cache.del(`workflow:${id}`);
    await this.cache.del(`workflow:code:${(workflow as any).code}`);

    this.logger.log(`Workflow deleted: ${id}`);
    return { message: 'Workflow deleted successfully' };
  }

  /**
   * Archive workflow
   */
  async archive(id: string, userId: string) {
    const workflow = await this.findById(id);

    if ((workflow as any).status === WorkflowStatus.ARCHIVED) {
      throw new BadRequestException('Workflow is already archived');
    }

    const updated = await this.prisma.workflow.update({
      where: { id },
      data: {
        status: WorkflowStatus.ARCHIVED,
        modifiedBy: userId,
      },
    });

    await this.cache.del(`workflow:${id}`);
    this.logger.log(`Workflow archived: ${id}`);
    return updated;
  }

  /**
   * Clone workflow
   */
  async clone(id: string, userId: string) {
    const source = await this.prisma.workflow.findUnique({
      where: { id },
    });

    if (!source) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }

    const newCode = `${source.code}_copy_${Date.now()}`;
    const newName = `${source.name} (Copy)`;

    return this.create(
      {
        name: newName,
        description: source.description || undefined,
        code: newCode,
        category: source.category,
        status: WorkflowStatus.DRAFT,
        triggerType: source.triggerType as WorkflowTriggerType,
        triggerConfig: source.triggerConfig as any,
        steps: source.steps as any,
        metadata: source.metadata as any,
        slaConfig: source.slaConfig as any,
        schoolId: source.schoolId || undefined,
        departmentId: source.departmentId || undefined,
        isTemplate: false,
      },
      userId,
    );
  }

  /**
   * Get workflow statistics
   */
  async getStatistics() {
    const cacheKey = 'workflows:statistics';
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const [total, active, templates, byCategory, byStatus, recentInstances] =
      await Promise.all([
        this.prisma.workflow.count({ where: { deletedAt: null } }),
        this.prisma.workflow.count({
          where: { status: WorkflowStatus.ACTIVE, deletedAt: null },
        }),
        this.prisma.workflow.count({
          where: { isTemplate: true, deletedAt: null },
        }),
        this.prisma.workflow.groupBy({
          by: ['category'],
          where: { deletedAt: null },
          _count: true,
        }),
        this.prisma.workflow.groupBy({
          by: ['status'],
          where: { deletedAt: null },
          _count: true,
        }),
        this.prisma.workflowInstance.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        }),
      ]);

    const stats = {
      total,
      active,
      templates,
      byCategory: byCategory.map((c) => ({
        category: c.category,
        count: c._count,
      })),
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      recentInstances,
      timestamp: new Date(),
    };

    await this.cache.set(cacheKey, stats, 300); // Cache for 5 minutes
    return stats;
  }

  /**
   * Validate workflow definition
   */
  private async validateWorkflow(workflow: any) {
    const errors: string[] = [];

    // Validate steps
    const steps = workflow.steps as any[];
    if (!steps || steps.length === 0) {
      errors.push('Workflow must have at least one step');
    }

    // Check for start step
    const hasStartStep = steps.some(
      (s) => !s.previousSteps || s.previousSteps.length === 0,
    );
    if (!hasStartStep) {
      errors.push('Workflow must have at least one start step');
    }

    // Check for orphaned steps
    const stepIds = new Set(steps.map((s) => s.id));
    steps.forEach((step) => {
      if (step.nextSteps) {
        step.nextSteps.forEach((nextId: string) => {
          if (!stepIds.has(nextId)) {
            errors.push(
              `Step ${step.id} references non-existent step ${nextId}`,
            );
          }
        });
      }
    });

    if (errors.length > 0) {
      throw new BadRequestException(
        `Workflow validation failed: ${errors.join(', ')}`,
      );
    }

    return true;
  }
}
