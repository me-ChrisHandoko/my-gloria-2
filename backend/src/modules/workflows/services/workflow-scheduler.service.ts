import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggingService } from '@/core/logging/logging.service';
import { WorkflowExecutionService } from './workflow-execution.service';
import * as cron from 'node-cron';

@Injectable()
export class WorkflowSchedulerService implements OnModuleInit, OnModuleDestroy {
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
    private readonly executionService: WorkflowExecutionService,
  ) {
    this.logger.setContext('WorkflowSchedulerService');
  }

  async onModuleInit() {
    await this.loadScheduledWorkflows();
  }

  async onModuleDestroy() {
    this.stopAllScheduledTasks();
  }

  /**
   * Load and schedule all scheduled workflows
   */
  private async loadScheduledWorkflows() {
    this.logger.log('Loading scheduled workflows');

    const workflows = await this.prisma.workflow.findMany({
      where: {
        // status, triggerType and deletedAt fields don't exist in Workflow model
      },
    });

    for (const workflow of workflows) {
      this.scheduleWorkflow(workflow);
    }

    this.logger.log(`Loaded ${workflows.length} scheduled workflows`);
  }

  /**
   * Schedule a workflow
   */
  scheduleWorkflow(workflow: any) {
    const config = workflow.triggerConfig;
    if (!config?.cronExpression) {
      this.logger.warn(`Workflow ${workflow.id} has no cron expression`);
      return;
    }

    try {
      // Stop existing task if any
      this.stopScheduledTask(workflow.id);

      // Create new scheduled task
      const task = cron.schedule(
        config.cronExpression,
        async () => {
          await this.executeScheduledWorkflow(workflow);
        },
        {
          // scheduled option doesn't exist in node-cron TaskOptions
          timezone: config.timezone || 'UTC',
        },
      );

      this.scheduledTasks.set(workflow.id, task);
      this.logger.log(
        `Scheduled workflow ${workflow.id} with cron: ${config.cronExpression}`,
      );
    } catch (error) {
      this.logger.error(`Failed to schedule workflow ${workflow.id}`, error);
    }
  }

  /**
   * Stop scheduled task
   */
  stopScheduledTask(workflowId: string) {
    const task = this.scheduledTasks.get(workflowId);
    if (task) {
      task.stop();
      this.scheduledTasks.delete(workflowId);
      this.logger.log(`Stopped scheduled task for workflow ${workflowId}`);
    }
  }

  /**
   * Stop all scheduled tasks
   */
  private stopAllScheduledTasks() {
    this.logger.log('Stopping all scheduled tasks');

    for (const [workflowId, task] of this.scheduledTasks) {
      task.stop();
      this.logger.log(`Stopped task for workflow ${workflowId}`);
    }

    this.scheduledTasks.clear();
  }

  /**
   * Execute scheduled workflow
   */
  private async executeScheduledWorkflow(workflow: any) {
    this.logger.log(`Executing scheduled workflow ${workflow.id}`);

    try {
      const config = workflow.triggerConfig;

      // Check if should execute based on conditions
      if (
        config.conditions &&
        !(await this.checkConditions(config.conditions))
      ) {
        this.logger.log(`Skipping workflow ${workflow.id} due to conditions`);
        return;
      }

      // Execute workflow
      await this.executionService.execute(
        {
          workflowId: workflow.id,
          data: config.defaultData || {},
          context: config.defaultContext || {},
          priority: config.priority || 'NORMAL',
        },
        'system',
      );

      // Record execution (commented - workflowScheduleLog model doesn't exist)
      /* await this.prisma.workflowScheduleLog.create({
        data: {
          workflowId: workflow.id,
          executedAt: new Date(),
          status: 'SUCCESS',
        },
      }); */
    } catch (error) {
      this.logger.error(
        `Failed to execute scheduled workflow ${workflow.id}`,
        error,
      );

      // Record failure (commented - workflowScheduleLog model doesn't exist)
      /* await this.prisma.workflowScheduleLog.create({
        data: {
          workflowId: workflow.id,
          executedAt: new Date(),
          status: 'FAILED',
          error: error.message,
        },
      }); */
    }
  }

  /**
   * Check conditions for scheduled execution
   */
  private async checkConditions(conditions: any): Promise<boolean> {
    // Simple condition checking
    // In production, this would be more sophisticated

    if (conditions.dayOfWeek) {
      const today = new Date().getDay();
      if (!conditions.dayOfWeek.includes(today)) {
        return false;
      }
    }

    if (conditions.businessDaysOnly) {
      const today = new Date().getDay();
      if (today === 0 || today === 6) {
        // Sunday or Saturday
        return false;
      }
    }

    return true;
  }

  /**
   * Get scheduled workflow status
   */
  getScheduledWorkflowStatus(workflowId: string) {
    const task = this.scheduledTasks.get(workflowId);
    return {
      workflowId,
      isScheduled: !!task,
      isRunning: task ? (task as any).running : false,
    };
  }

  /**
   * Get all scheduled workflows status
   */
  getAllScheduledWorkflowsStatus() {
    const statuses = [];

    for (const [workflowId, task] of this.scheduledTasks) {
      (statuses as any).push({
        workflowId,
        isRunning: (task as any).running,
      });
    }

    return statuses;
  }
}
