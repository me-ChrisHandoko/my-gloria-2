import {
  IsString,
  IsUUID,
  IsBoolean,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsObject,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GetCheckLogFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by user profile ID',
    example: 'cm123abc456def',
  })
  @IsUUID()
  @IsOptional()
  userProfileId?: string;

  @ApiPropertyOptional({
    description: 'Filter by resource type',
    example: 'documents',
  })
  @IsString()
  @IsOptional()
  resource?: string;

  @ApiPropertyOptional({
    description: 'Filter by action',
    example: 'READ',
  })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({
    description: 'Filter by scope',
    example: 'DEPARTMENT',
  })
  @IsString()
  @IsOptional()
  scope?: string;

  @ApiPropertyOptional({
    description: 'Filter by access result',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isAllowed?: boolean;

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
    description: 'Minimum duration in milliseconds',
    example: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  minDuration?: number;

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

export class ExportCheckLogsDto {
  @ApiPropertyOptional({
    description: 'Filters for export',
  })
  @IsObject()
  @IsOptional()
  filters?: GetCheckLogFilterDto;

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

export class CheckLogResponseDto {
  @ApiProperty({ description: 'Check log ID' })
  id: string;

  @ApiProperty({ description: 'User who performed the check' })
  userProfileId: string;

  @ApiProperty({ description: 'Resource type accessed', example: 'documents' })
  resource: string;

  @ApiProperty({ description: 'Action attempted', example: 'READ' })
  action: string;

  @ApiProperty({ description: 'Scope of access', example: 'DEPARTMENT' })
  scope: string;

  @ApiProperty({
    description: 'Specific resource ID',
    example: 'doc_123',
    required: false,
  })
  resourceId?: string;

  @ApiProperty({ description: 'Whether access was allowed' })
  isAllowed: boolean;

  @ApiProperty({
    description: 'Reason if access denied',
    required: false,
  })
  denialReason?: string;

  @ApiProperty({ description: 'Check duration in milliseconds' })
  checkDuration: number;

  @ApiProperty({ description: 'Request metadata', type: Object })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Timestamp when check was performed' })
  checkedAt: Date;
}

export class AccessSummaryDto {
  @ApiProperty({ description: 'Total number of checks' })
  totalChecks: number;

  @ApiProperty({ description: 'Number of allowed checks' })
  allowedChecks: number;

  @ApiProperty({ description: 'Number of denied checks' })
  deniedChecks: number;

  @ApiProperty({ description: 'Allow rate percentage' })
  allowRate: number;

  @ApiProperty({ description: 'Deny rate percentage' })
  denyRate: number;

  @ApiProperty({ description: 'Average check duration in milliseconds' })
  avgDuration: number;

  @ApiProperty({ description: 'Maximum check duration in milliseconds' })
  maxDuration: number;

  @ApiProperty({ description: 'Number of unique users' })
  uniqueUsers: number;

  @ApiProperty({ description: 'Number of unique resources' })
  uniqueResources: number;

  @ApiProperty({ description: 'Most accessed resources', type: Array })
  topResources: Array<{
    resource: string;
    count: number;
  }>;

  @ApiProperty({ description: 'Most denied resources', type: Array })
  topDenied: Array<{
    resource: string;
    count: number;
  }>;
}

export class SlowCheckDto {
  @ApiPropertyOptional({
    description: 'Minimum duration threshold in milliseconds',
    default: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  minDuration?: number = 100;

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

export class UserAccessHistoryDto {
  @ApiPropertyOptional({
    description: 'Start date for range',
  })
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'End date for range',
  })
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter by resource type',
  })
  @IsString()
  @IsOptional()
  resource?: string;

  @ApiPropertyOptional({
    description: 'Filter by action',
  })
  @IsString()
  @IsOptional()
  action?: string;

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

export class ResourceAccessHistoryDto {
  @ApiPropertyOptional({
    description: 'Start date for range',
  })
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'End date for range',
  })
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter by action',
  })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({
    description: 'Filter by user',
  })
  @IsUUID()
  @IsOptional()
  userProfileId?: string;

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
