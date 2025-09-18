import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum WorkflowPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class ExecuteWorkflowDto {
  @ApiProperty({ description: 'Workflow ID or code to execute' })
  @IsString()
  workflowId: string;

  @ApiPropertyOptional({ description: 'Initial workflow data' })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Execution context' })
  @IsObject()
  @IsOptional()
  context?: {
    userId?: string;
    departmentId?: string;
    schoolId?: string;
    referenceId?: string;
    referenceType?: string;
  };

  @ApiPropertyOptional({
    enum: WorkflowPriority,
    description: 'Execution priority',
  })
  @IsEnum(WorkflowPriority)
  @IsOptional()
  priority?: WorkflowPriority = WorkflowPriority.NORMAL;

  @ApiPropertyOptional({ description: 'Parent instance ID for sub-workflows' })
  @IsString()
  @IsOptional()
  parentInstanceId?: string;

  @ApiPropertyOptional({ description: 'Tags for categorization' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Skip validation' })
  @IsBoolean()
  @IsOptional()
  skipValidation?: boolean;
}

export class ProcessStepDto {
  @ApiProperty({ description: 'Workflow instance ID' })
  @IsString()
  instanceId: string;

  @ApiProperty({ description: 'Step ID to process' })
  @IsString()
  stepId: string;

  @ApiProperty({
    description: 'Action to take (approve, reject, complete, etc.)',
  })
  @IsString()
  action: string;

  @ApiPropertyOptional({ description: 'Step result data' })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Comments or notes' })
  @IsString()
  @IsOptional()
  comments?: string;

  @ApiPropertyOptional({ description: 'Attachments' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}

export class DelegateWorkflowDto {
  @ApiProperty({ description: 'Workflow instance ID' })
  @IsString()
  instanceId: string;

  @ApiProperty({ description: 'Step ID to delegate' })
  @IsString()
  stepId: string;

  @ApiProperty({ description: 'User ID to delegate to' })
  @IsString()
  delegateToUserId: string;

  @ApiPropertyOptional({ description: 'Delegation reason' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Delegation expiry date' })
  @IsString()
  @IsOptional()
  expiresAt?: string;
}

export class EscalateWorkflowDto {
  @ApiProperty({ description: 'Workflow instance ID' })
  @IsString()
  instanceId: string;

  @ApiProperty({ description: 'Step ID to escalate' })
  @IsString()
  stepId: string;

  @ApiPropertyOptional({ description: 'Escalation level' })
  @IsString()
  @IsOptional()
  escalationLevel?: string;

  @ApiPropertyOptional({ description: 'Escalation reason' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Target user or role for escalation' })
  @IsString()
  @IsOptional()
  escalateToId?: string;
}
