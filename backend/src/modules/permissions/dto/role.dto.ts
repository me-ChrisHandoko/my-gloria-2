import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsNotEmpty,
  MaxLength,
  IsUUID,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRoleDto {
  @ApiProperty({ description: 'Unique role code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Role name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Role description' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Hierarchy level (1-10)',
    minimum: 1,
    maximum: 10,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  hierarchyLevel: number;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Is system role', default: false })
  @IsBoolean()
  @IsOptional()
  isSystemRole?: boolean;
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ description: 'Unique role code' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ description: 'Role name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Role description' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Hierarchy level (0-10, 0 = superadmin)',
    minimum: 0,
    maximum: 10,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(10)
  @Type(() => Number)
  hierarchyLevel?: number;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Is system role', default: false })
  @IsBoolean()
  @IsOptional()
  isSystemRole?: boolean;
}

export class AssignRoleDto {
  @ApiProperty({ description: 'User profile ID' })
  @IsUUID()
  userProfileId: string;

  @ApiProperty({ description: 'Role ID' })
  @IsUUID()
  roleId: string;

  @ApiPropertyOptional({ description: 'Valid from date' })
  @IsOptional()
  @Type(() => Date)
  effectiveFrom?: Date;

  @ApiPropertyOptional({ description: 'Valid until date' })
  @IsOptional()
  @Type(() => Date)
  effectiveUntil?: Date;
}

export class AssignRolePermissionDto {
  @ApiProperty({ description: 'Permission ID' })
  @IsUUID()
  permissionId: string;

  @ApiPropertyOptional({ description: 'Is granted', default: true })
  @IsBoolean()
  @IsOptional()
  isGranted?: boolean;

  @ApiPropertyOptional({ description: 'Permission conditions' })
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

  @ApiPropertyOptional({ description: 'Grant reason' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  grantReason?: string;
}

export class BulkAssignRolePermissionsDto {
  @ApiProperty({
    description: 'Permission assignments',
    type: [AssignRolePermissionDto],
  })
  @IsArray()
  @Type(() => AssignRolePermissionDto)
  permissions: AssignRolePermissionDto[];
}

export class CreateRoleHierarchyDto {
  @ApiProperty({ description: 'Parent role ID' })
  @IsUUID()
  parentRoleId: string;

  @ApiPropertyOptional({
    description: 'Inherit permissions from parent',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  inheritPermissions?: boolean;
}

export class CreateRoleTemplateDto {
  @ApiProperty({ description: 'Unique template code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Template name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Template category' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  category: string;

  @ApiProperty({ description: 'Permission IDs', type: [String] })
  @IsArray()
  @IsUUID('all', { each: true })
  permissionIds: string[];
}

export class ApplyRoleTemplateDto {
  @ApiProperty({ description: 'Template ID' })
  @IsUUID()
  templateId: string;

  @ApiProperty({ description: 'Target role ID' })
  @IsUUID()
  roleId: string;

  @ApiPropertyOptional({
    description: 'Override existing permissions',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  overrideExisting?: boolean;
}
