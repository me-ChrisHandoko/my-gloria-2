import {
  IsString,
  IsBoolean,
  IsOptional,
  IsObject,
  IsNotEmpty,
  IsUUID,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AssignRolePermissionDto {
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

  @ApiPropertyOptional({ description: 'Reason for granting permission' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  grantReason?: string;
}

export class UpdateRolePermissionDto {
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

  @ApiPropertyOptional({ description: 'Reason for update' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  updateReason?: string;
}

export class BulkAssignRolePermissionsDto {
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

  @ApiPropertyOptional({ description: 'Reason for bulk assignment' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  grantReason?: string;

  @ApiPropertyOptional({ description: 'Permission conditions (JSON)' })
  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;
}

export class BulkRemoveRolePermissionsDto {
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
