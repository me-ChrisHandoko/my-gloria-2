import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsObject,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum WorkflowStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum WorkflowTriggerType {
  MANUAL = 'MANUAL',
  AUTOMATIC = 'AUTOMATIC',
  SCHEDULED = 'SCHEDULED',
  EVENT = 'EVENT',
}

export enum StepType {
  APPROVAL = 'APPROVAL',
  NOTIFICATION = 'NOTIFICATION',
  CONDITION = 'CONDITION',
  ACTION = 'ACTION',
  PARALLEL = 'PARALLEL',
  WAIT = 'WAIT',
}

export enum ApprovalStrategy {
  ALL = 'ALL',
  ANY = 'ANY',
  MAJORITY = 'MAJORITY',
  WEIGHTED = 'WEIGHTED',
}

class WorkflowStepDto {
  @ApiProperty({ description: 'Step name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Step description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: StepType, description: 'Step type' })
  @IsEnum(StepType)
  type: StepType;

  @ApiProperty({ description: 'Step configuration' })
  @IsObject()
  config: Record<string, any>;

  @ApiPropertyOptional({ description: 'Next step IDs' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  nextSteps?: string[];

  @ApiPropertyOptional({ description: 'Condition for step execution' })
  @IsObject()
  @IsOptional()
  condition?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Step timeout in seconds' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  timeoutSeconds?: number;

  @ApiPropertyOptional({ description: 'Allow delegation' })
  @IsBoolean()
  @IsOptional()
  allowDelegation?: boolean;

  @ApiPropertyOptional({ description: 'Allow escalation' })
  @IsBoolean()
  @IsOptional()
  allowEscalation?: boolean;

  @ApiPropertyOptional({
    enum: ApprovalStrategy,
    description: 'Approval strategy for approval steps',
  })
  @IsEnum(ApprovalStrategy)
  @IsOptional()
  approvalStrategy?: ApprovalStrategy;
}

export class CreateWorkflowDto {
  @ApiProperty({ description: 'Workflow name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Workflow description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Workflow code (unique identifier)' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Workflow category' })
  @IsString()
  category: string;

  @ApiProperty({ enum: WorkflowStatus, description: 'Workflow status' })
  @IsEnum(WorkflowStatus)
  @IsOptional()
  status?: WorkflowStatus = WorkflowStatus.DRAFT;

  @ApiProperty({ enum: WorkflowTriggerType, description: 'Trigger type' })
  @IsEnum(WorkflowTriggerType)
  triggerType: WorkflowTriggerType;

  @ApiPropertyOptional({ description: 'Trigger configuration' })
  @IsObject()
  @IsOptional()
  triggerConfig?: Record<string, any>;

  @ApiProperty({ type: [WorkflowStepDto], description: 'Workflow steps' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps: WorkflowStepDto[];

  @ApiPropertyOptional({ description: 'Workflow metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'SLA configuration' })
  @IsObject()
  @IsOptional()
  slaConfig?: {
    responseTimeHours?: number;
    escalationTimeHours?: number;
    maxDurationHours?: number;
  };

  @ApiPropertyOptional({ description: 'School ID' })
  @IsString()
  @IsOptional()
  schoolId?: string;

  @ApiPropertyOptional({ description: 'Department ID' })
  @IsString()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Is template' })
  @IsBoolean()
  @IsOptional()
  isTemplate?: boolean;
}
