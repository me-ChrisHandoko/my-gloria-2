import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsObject,
  IsNotEmpty,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  PermissionAction,
  PermissionScope,
  ModuleCategory,
} from '@prisma/client';

export class CreatePermissionDto {
  @ApiProperty({ description: 'Unique permission code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code: string;

  @ApiProperty({ description: 'Permission name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Permission description' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Resource name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  resource: string;

  @ApiProperty({ enum: PermissionAction, description: 'Permission action' })
  @IsEnum(PermissionAction)
  action: PermissionAction;

  @ApiPropertyOptional({
    enum: PermissionScope,
    description: 'Permission scope',
  })
  @IsEnum(PermissionScope)
  @IsOptional()
  scope?: PermissionScope;

  @ApiPropertyOptional({ enum: ModuleCategory, description: 'Module category for grouping' })
  @IsEnum(ModuleCategory)
  @IsOptional()
  category?: ModuleCategory;

  @ApiPropertyOptional({ description: 'Group name for UI display' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  groupName?: string;

  @ApiPropertyOptional({ description: 'Icon for group display' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  groupIcon?: string;

  @ApiPropertyOptional({ description: 'Sort order for group display' })
  @IsOptional()
  @Type(() => Number)
  groupSortOrder?: number;

  @ApiPropertyOptional({ description: 'Permission conditions' })
  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Permission metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Is system permission', default: false })
  @IsBoolean()
  @IsOptional()
  isSystemPermission?: boolean;
}

export class UpdatePermissionDto {
  @ApiPropertyOptional({ description: 'Permission name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Permission description' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    enum: PermissionScope,
    description: 'Permission scope',
  })
  @IsEnum(PermissionScope)
  @IsOptional()
  scope?: PermissionScope;

  @ApiPropertyOptional({ enum: ModuleCategory, description: 'Module category for grouping' })
  @IsEnum(ModuleCategory)
  @IsOptional()
  category?: ModuleCategory;

  @ApiPropertyOptional({ description: 'Group name for UI display' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  groupName?: string;

  @ApiPropertyOptional({ description: 'Icon for group display' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  groupIcon?: string;

  @ApiPropertyOptional({ description: 'Sort order for group display' })
  @IsOptional()
  @Type(() => Number)
  groupSortOrder?: number;

  @ApiPropertyOptional({ description: 'Permission conditions' })
  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Permission metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreatePermissionGroupDto {
  @ApiProperty({ description: 'Unique group code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Group name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Group description' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: ModuleCategory, description: 'Module category' })
  @IsEnum(ModuleCategory)
  @IsOptional()
  category?: ModuleCategory;

  @ApiPropertyOptional({ description: 'Group icon' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;
}

export class UpdatePermissionGroupDto {
  @ApiPropertyOptional({ description: 'Group name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Group description' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: ModuleCategory, description: 'Module category' })
  @IsEnum(ModuleCategory)
  @IsOptional()
  category?: ModuleCategory;

  @ApiPropertyOptional({ description: 'Group icon' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CheckPermissionDto {
  @ApiProperty({ description: 'Resource name' })
  @IsString()
  @IsNotEmpty()
  resource: string;

  @ApiProperty({ enum: PermissionAction, description: 'Permission action' })
  @IsEnum(PermissionAction)
  action: PermissionAction;

  @ApiPropertyOptional({
    enum: PermissionScope,
    description: 'Permission scope',
  })
  @IsEnum(PermissionScope)
  @IsOptional()
  scope?: PermissionScope;

  @ApiPropertyOptional({
    description: 'Resource ID for resource-specific permissions',
  })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @ApiPropertyOptional({
    description: 'Additional context for permission check',
  })
  @IsObject()
  @IsOptional()
  context?: Record<string, any>;
}

export class BulkAssignPermissionsDto {
  @ApiProperty({
    description: 'Target type',
    enum: ['user', 'role', 'position'],
  })
  @IsEnum(['user', 'role', 'position'])
  targetType: 'user' | 'role' | 'position';

  @ApiProperty({ description: 'Target ID' })
  @IsUUID()
  targetId: string;

  @ApiProperty({ description: 'Permission IDs to assign', type: [String] })
  @IsUUID('all', { each: true })
  permissionIds: string[];

  @ApiPropertyOptional({ description: 'Grant reason' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  grantReason?: string;

  @ApiPropertyOptional({ description: 'Valid until date' })
  @IsOptional()
  @Type(() => Date)
  effectiveUntil?: Date;
}
