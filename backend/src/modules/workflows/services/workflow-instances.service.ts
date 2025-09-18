import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WorkflowInstancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
  ) {
    this.logger.setContext('WorkflowInstancesService');
  }

  /**
   * Get all workflow instances with filtering
   */
  async findAll(query: any) {
    const {
      page = 1,
      limit = 10,
      workflowId,
      status,
      priority,
      initiatorId,
      schoolId,
      departmentId,
      search,
    } = query;

    const skip = (page - 1) * limit;
    const where: Prisma.WorkflowInstanceWhereInput = {};

    if (workflowId) where.workflowId = workflowId;
    if (status) where.state = status; // Changed from status to state
    // Commented out - these fields don't exist in the schema
    // if (priority) where.priority = priority;
    // if (initiatorId) where.initiatorId = initiatorId;
    // if (schoolId) where.schoolId = schoolId;
    // if (departmentId) where.departmentId = departmentId;

    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { workflow: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [instances, total] = await Promise.all([
      this.prisma.workflowInstance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          workflow: true,
          // initiator: true, // Relation doesn't exist
          // currentStep: true, // Relation doesn't exist
          _count: {
            select: {
              steps: true,
              // approvals: true, // Relation doesn't exist
            },
          },
        },
      }),
      this.prisma.workflowInstance.count({ where }),
    ]);

    return {
      data: instances,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get workflow instance by ID
   */
  async findById(id: string) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id },
      include: {
        workflow: true,
        // initiator: true, // Relation doesn't exist
        // currentStep: true, // Relation doesn't exist
        steps: {
          orderBy: { stepIndex: 'asc' },
          include: {
            // assignedTo: true, // Relation doesn't exist
            // completedByUser: true, // Relation doesn't exist
          },
        },
        // approvals: { // Relation doesn't exist
        //   include: {
        //     approver: true,
        //   },
        // },
        delegations: {
          include: {
            delegatedFrom: true,
            delegatedTo: true,
          },
        },
        // history: { // Relation doesn't exist
        //   orderBy: { startedAt: 'desc' },
        //   include: {
        //     performedByUser: true,
        //   },
        // },
      },
    });

    if (!instance) {
      throw new NotFoundException(`Workflow instance ${id} not found`);
    }

    return instance;
  }

  /**
   * Get user's workflow instances
   */
  async findUserInstances(userId: string, query: any) {
    const { role = 'all', ...restQuery } = query;

    const where: Prisma.WorkflowInstanceWhereInput = {};

    switch (role) {
      case 'initiator':
        // where.initiatorId = userId; // Field doesn't exist
        // Filter by metadata instead
        where.metadata = {
          path: ['initiatorId'],
          equals: userId,
        };
        break;
      case 'assignee':
        where.steps = {
          some: {
            assigneeId: userId,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
        };
        break;
      case 'participant':
        where.OR = [
          { metadata: { path: ['initiatorId'], equals: userId } },
          { steps: { some: { assigneeId: userId } } },
          // { approvals: { some: { approverId: userId } } }, // Relation doesn't exist
        ];
        break;
      default:
        where.OR = [
          { metadata: { path: ['initiatorId'], equals: userId } },
          { steps: { some: { assigneeId: userId } } },
        ];
    }

    return this.findAll({ ...restQuery, where });
  }

  /**
   * Get workflow instance history
   */
  async getHistory(instanceId: string) {
    // TODO: Implement history tracking
    // workflowStepHistory model doesn't exist
    return [];
  }

  /**
   * Get workflow instance statistics
   */
  async getStatistics(query: any) {
    const { startDate, endDate, workflowId, schoolId, departmentId } = query;

    const where: Prisma.WorkflowInstanceWhereInput = {};

    if (workflowId) where.workflowId = workflowId;
    // These fields don't exist in the schema
    // if (schoolId) where.schoolId = schoolId;
    // if (departmentId) where.departmentId = departmentId;

    if (startDate || endDate) {
      where.startedAt = {};
      if (startDate) where.startedAt.gte = new Date(startDate);
      if (endDate) where.startedAt.lte = new Date(endDate);
    }

    const [total, byStatus, byPriority, avgDuration] = await Promise.all([
      this.prisma.workflowInstance.count({ where }),
      this.prisma.workflowInstance.groupBy({
        by: ['state'],
        where,
        _count: true,
      }),
      this.prisma.workflowInstance.groupBy({
        by: ['state'], // Changed from priority as it doesn't exist
        where,
        _count: true,
      }),
      this.prisma.$queryRaw`
        SELECT AVG(EXTRACT(EPOCH FROM ("completedAt" - "startedAt"))/3600) as avg_duration_hours
        FROM "WorkflowInstance"
        WHERE "completedAt" IS NOT NULL
          AND "startedAt" IS NOT NULL
          ${workflowId ? Prisma.sql`AND "workflowId" = ${workflowId}` : Prisma.empty}
          // ${schoolId ? Prisma.sql`AND "schoolId" = ${schoolId}` : Prisma.empty} // Field doesn't exist
      `,
    ]);

    return {
      total,
      byStatus: byStatus.map((s) => ({ status: s.state, count: s._count })),
      byPriority: [], // Priority field doesn't exist
      avgDurationHours: (avgDuration as any)[0]?.avg_duration_hours || 0,
      period: { startDate, endDate },
    };
  }
}
