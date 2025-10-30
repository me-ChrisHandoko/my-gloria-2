/**
 * Temporal Service for NestJS
 * Provides integration between NestJS and Temporal workflows
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, Client, WorkflowHandle, WorkflowIdReusePolicy } from '@temporalio/client';
import { ApprovalRequest, ApprovalResult } from './types/workflow.types';

@Injectable()
export class TemporalService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TemporalService.name);
  private connection: Connection;
  private client: Client;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      // Connect to Temporal server
      const address = this.configService.get<string>('TEMPORAL_ADDRESS', 'localhost:7233');
      const namespace = this.configService.get<string>('TEMPORAL_NAMESPACE', 'default');

      this.logger.log(`Connecting to Temporal at ${address}, namespace: ${namespace}`);

      this.connection = await Connection.connect({
        address,
      });

      this.client = new Client({
        connection: this.connection,
        namespace,
      });

      this.logger.log('Successfully connected to Temporal');
    } catch (error) {
      this.logger.error('Failed to connect to Temporal', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      if (this.connection) {
        await this.connection.close();
        this.logger.log('Temporal connection closed');
      }
    } catch (error) {
      this.logger.error('Error closing Temporal connection', error);
    }
  }

  /**
   * Start an approval workflow
   */
  async startApprovalWorkflow(
    request: ApprovalRequest,
  ): Promise<{ workflowId: string; runId: string }> {
    try {
      const workflowId = `approval-${request.requestId}`;

      const handle = await this.client.workflow.start('approvalWorkflow', {
        taskQueue: 'gloria-workflows',
        workflowId,
        args: [request],
        workflowIdReusePolicy: WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_ALLOW_DUPLICATE,
      });

      this.logger.log(`Started approval workflow: ${workflowId}, runId: ${handle.firstExecutionRunId}`);

      return {
        workflowId: handle.workflowId,
        runId: handle.firstExecutionRunId,
      };
    } catch (error) {
      this.logger.error('Failed to start approval workflow', error);
      throw error;
    }
  }

  /**
   * Start a simple approval workflow (without escalation)
   */
  async startSimpleApprovalWorkflow(
    request: ApprovalRequest,
  ): Promise<{ workflowId: string; runId: string }> {
    try {
      const workflowId = `simple-approval-${request.requestId}`;

      const handle = await this.client.workflow.start('simpleApprovalWorkflow', {
        taskQueue: 'gloria-workflows',
        workflowId,
        args: [request],
        workflowIdReusePolicy: WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_ALLOW_DUPLICATE,
      });

      this.logger.log(`Started simple approval workflow: ${workflowId}`);

      return {
        workflowId: handle.workflowId,
        runId: handle.firstExecutionRunId,
      };
    } catch (error) {
      this.logger.error('Failed to start simple approval workflow', error);
      throw error;
    }
  }

  /**
   * Get workflow handle by workflow ID
   */
  getWorkflowHandle(workflowId: string): WorkflowHandle {
    return this.client.workflow.getHandle(workflowId);
  }

  /**
   * Query workflow status
   */
  async getWorkflowStatus(workflowId: string): Promise<{
    status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TERMINATED' | 'TIMED_OUT';
    result?: any;
  }> {
    try {
      const handle = this.getWorkflowHandle(workflowId);
      const description = await handle.describe();

      let result: any;
      if (description.status.name === 'COMPLETED') {
        result = await handle.result();
      }

      return {
        status: description.status.name as any,
        result,
      };
    } catch (error) {
      this.logger.error(`Failed to get workflow status for ${workflowId}`, error);
      throw error;
    }
  }

  /**
   * Cancel a running workflow
   */
  async cancelWorkflow(workflowId: string, reason?: string): Promise<void> {
    try {
      const handle = this.getWorkflowHandle(workflowId);
      await handle.cancel();
      this.logger.log(`Cancelled workflow: ${workflowId}${reason ? `, reason: ${reason}` : ''}`);
    } catch (error) {
      this.logger.error(`Failed to cancel workflow ${workflowId}`, error);
      throw error;
    }
  }

  /**
   * Terminate a workflow (non-graceful stop)
   */
  async terminateWorkflow(workflowId: string, reason?: string): Promise<void> {
    try {
      const handle = this.getWorkflowHandle(workflowId);
      await handle.terminate(reason);
      this.logger.log(`Terminated workflow: ${workflowId}${reason ? `, reason: ${reason}` : ''}`);
    } catch (error) {
      this.logger.error(`Failed to terminate workflow ${workflowId}`, error);
      throw error;
    }
  }

  /**
   * Wait for workflow result
   */
  async getWorkflowResult<T = any>(workflowId: string): Promise<T> {
    try {
      const handle = this.getWorkflowHandle(workflowId);
      return await handle.result();
    } catch (error) {
      this.logger.error(`Failed to get workflow result for ${workflowId}`, error);
      throw error;
    }
  }

  /**
   * Signal a workflow (send external event)
   */
  async signalWorkflow(
    workflowId: string,
    signalName: string,
    args?: any[],
  ): Promise<void> {
    try {
      const handle = this.getWorkflowHandle(workflowId);
      await handle.signal(signalName, ...(args || []));
      this.logger.log(`Sent signal '${signalName}' to workflow: ${workflowId}`);
    } catch (error) {
      this.logger.error(`Failed to signal workflow ${workflowId}`, error);
      throw error;
    }
  }

  /**
   * Query a workflow (get current state)
   */
  async queryWorkflow<T = any>(
    workflowId: string,
    queryType: string,
    args?: any[],
  ): Promise<T> {
    try {
      const handle = this.getWorkflowHandle(workflowId);
      return await handle.query(queryType, ...(args || []));
    } catch (error) {
      this.logger.error(`Failed to query workflow ${workflowId}`, error);
      throw error;
    }
  }

  /**
   * List all workflows with optional filters
   */
  async listWorkflows(query?: string): Promise<any[]> {
    try {
      const workflows: any[] = [];
      const iterator = this.client.workflow.list({ query });

      for await (const workflow of iterator) {
        workflows.push(workflow);
      }

      return workflows;
    } catch (error) {
      this.logger.error('Failed to list workflows', error);
      throw error;
    }
  }

  /**
   * Get client for advanced operations
   */
  getClient(): Client {
    return this.client;
  }

  /**
   * Get connection for advanced operations
   */
  getConnection(): Connection {
    return this.connection;
  }
}
