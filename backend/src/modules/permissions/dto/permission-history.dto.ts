import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum HistoryEntityType {
  ROLE = 'ROLE',
  USER = 'USER',
  RESOURCE = 'RESOURCE',
  DELEGATION = 'DELEGATION',
  TEMPLATE = 'TEMPLATE',
  POLICY = 'POLICY',
}

export enum HistoryOperation {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  GRANT = 'GRANT',
  REVOKE = 'REVOKE',
  ASSIGN = 'ASSIGN',
  REMOVE = 'REMOVE',
}

export class GetHistoryFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by entity type',
    enum: HistoryEntityType,
  })
  @IsEnum(HistoryEntityType)
  @IsOptional()
  entityType?: HistoryEntityType;

  @ApiPropertyOptional({
    description: 'Filter by entity ID',
    example: 'cm123abc456def',
  })
  @IsUUID()
  @IsOptional()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Filter by user who performed the change',
    example: 'cm123abc456def',
  })
  @IsUUID()
  @IsOptional()
  performedBy?: string;

  @ApiPropertyOptional({
    description: 'Start date for date range filter',
    example: '2025-01-01T00:00:00Z',
  })
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'End date for date range filter',
    example: '2025-12-31T23:59:59Z',
  })
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter by operation type',
    enum: HistoryOperation,
  })
  @IsEnum(HistoryOperation)
  @IsOptional()
  operation?: HistoryOperation;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}

export class RollbackChangeDto {
  @ApiProperty({
    description: 'Reason for rolling back this change',
    example: 'Accidental deletion, restoring previous state',
  })
  @IsString()
  reason: string;

  @ApiProperty({
    description: 'User ID confirming the rollback',
    example: 'cm123abc456def',
  })
  @IsUUID()
  confirmedBy: string;
}

export class CompareStatesDto {
  @ApiProperty({
    description: 'First change ID to compare',
    example: 'change_abc123',
  })
  @IsString()
  changeId1: string;

  @ApiProperty({
    description: 'Second change ID to compare',
    example: 'change_def456',
  })
  @IsString()
  changeId2: string;
}

export class ExportHistoryDto {
  @ApiPropertyOptional({
    description: 'Filters for export',
  })
  @IsObject()
  @IsOptional()
  filters?: GetHistoryFilterDto;

  @ApiPropertyOptional({
    description: 'Export format',
    enum: ['CSV', 'JSON'],
    default: 'JSON',
  })
  @IsEnum(['CSV', 'JSON'])
  @IsOptional()
  format?: 'CSV' | 'JSON' = 'JSON';

  @ApiPropertyOptional({
    description: 'Include full metadata in export',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  includeMetadata?: boolean = false;
}

export class HistoryResponseDto {
  @ApiProperty({ description: 'Change history ID' })
  id: string;

  @ApiProperty({ description: 'Entity type', enum: HistoryEntityType })
  entityType: HistoryEntityType;

  @ApiProperty({ description: 'Entity ID' })
  entityId: string;

  @ApiProperty({ description: 'Operation performed', enum: HistoryOperation })
  operation: HistoryOperation;

  @ApiProperty({ description: 'User who performed the change' })
  performedBy: string;

  @ApiProperty({ description: 'State before change', type: Object })
  beforeState: Record<string, any>;

  @ApiProperty({ description: 'State after change', type: Object })
  afterState: Record<string, any>;

  @ApiProperty({ description: 'Reason for the change' })
  reason: string;

  @ApiProperty({ description: 'Request metadata', type: Object })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Whether this change can be rolled back' })
  isRollbackable: boolean;

  @ApiProperty({ description: 'Rollback of which change ID', required: false })
  rollbackOf?: string;

  @ApiProperty({ description: 'Timestamp when change occurred' })
  createdAt: Date;
}

export class RollbackHistoryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}

export class CompareStatesResponseDto {
  @ApiProperty({ description: 'First change details' })
  change1: HistoryResponseDto;

  @ApiProperty({ description: 'Second change details' })
  change2: HistoryResponseDto;

  @ApiProperty({ description: 'Differences between states', type: Object })
  differences: {
    added: Record<string, any>;
    removed: Record<string, any>;
    modified: Record<string, any>;
  };

  @ApiProperty({ description: 'Summary of changes' })
  summary: string;
}
