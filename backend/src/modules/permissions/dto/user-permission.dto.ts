import {
  IsString,
  IsBoolean,
  IsOptional,
  IsObject,
  IsNotEmpty,
  IsUUID,
  IsArray,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AssignUserPermissionDto {
  @ApiProperty({ description: 'Permission ID to assign' })
  @IsUUID()
  @IsNotEmpty()
  permissionId: string;

  @ApiPropertyOptional({
    description: 'Grant or deny permission',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isGranted?: boolean;

  @ApiPropertyOptional({ description: 'Permission conditions (JSON)' })
  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Valid from date' })
  @IsOptional()
  @Type(() => Date)
  effectiveFrom?: Date;

  @ApiPropertyOptional({ description: 'Valid until date' })
  @IsOptional()
  @Type(() => Date)
  effectiveUntil?: Date;

  @ApiProperty({ description: 'Reason for granting permission' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  grantReason: string;

  @ApiPropertyOptional({
    description: 'Permission priority (higher = higher priority)',
    default: 100,
    minimum: 1,
    maximum: 1000,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(1000)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Is this a temporary permission',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isTemporary?: boolean;

  @ApiPropertyOptional({ description: 'Resource type for resource-specific permissions' })
  @IsString()
  @IsOptional()
  resourceType?: string;

  @ApiPropertyOptional({ description: 'Resource ID for resource-specific permissions' })
  @IsString()
  @IsOptional()
  resourceId?: string;
}

export class UpdateUserPermissionDto {
  @ApiPropertyOptional({
    description: 'Grant or deny permission',
  })
  @IsBoolean()
  @IsOptional()
  isGranted?: boolean;

  @ApiPropertyOptional({ description: 'Permission conditions (JSON)' })
  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Valid from date' })
  @IsOptional()
  @Type(() => Date)
  effectiveFrom?: Date;

  @ApiPropertyOptional({ description: 'Valid until date' })
  @IsOptional()
  @Type(() => Date)
  effectiveUntil?: Date;

  @ApiPropertyOptional({
    description: 'Permission priority (higher = higher priority)',
    minimum: 1,
    maximum: 1000,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(1000)
  priority?: number;

  @ApiPropertyOptional({ description: 'Reason for update' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  updateReason?: string;
}

export class BulkAssignUserPermissionsDto {
  @ApiProperty({
    description: 'Permission IDs to assign',
    type: [String],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsNotEmpty()
  permissionIds: string[];

  @ApiPropertyOptional({
    description: 'Grant or deny permissions',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isGranted?: boolean;

  @ApiPropertyOptional({ description: 'Valid from date' })
  @IsOptional()
  @Type(() => Date)
  effectiveFrom?: Date;

  @ApiPropertyOptional({ description: 'Valid until date' })
  @IsOptional()
  @Type(() => Date)
  effectiveUntil?: Date;

  @ApiProperty({ description: 'Reason for bulk assignment' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  grantReason: string;

  @ApiPropertyOptional({ description: 'Permission conditions (JSON)' })
  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Permission priority',
    default: 100,
    minimum: 1,
    maximum: 1000,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(1000)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Are these temporary permissions',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isTemporary?: boolean;
}

export class BulkRemoveUserPermissionsDto {
  @ApiProperty({
    description: 'Permission IDs to remove',
    type: [String],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsNotEmpty()
  permissionIds: string[];

  @ApiPropertyOptional({ description: 'Reason for removal' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

export class UpdateUserPermissionPriorityDto {
  @ApiProperty({
    description: 'New priority value (higher = higher priority)',
    minimum: 1,
    maximum: 1000,
  })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(1000)
  priority: number;

  @ApiPropertyOptional({ description: 'Reason for priority change' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
