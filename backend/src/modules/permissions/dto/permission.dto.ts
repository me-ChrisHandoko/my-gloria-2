import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsJSON,
  IsNotEmpty,
  MaxLength,
  MinLength,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  PermissionAction,
  PermissionScope,
  ModuleCategory,
} from '@prisma/client';

export class CreatePermissionDto {
  @ApiProperty({
    description: 'Unique permission code',
    example: 'users:create',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  code: string;

  @ApiProperty({
    description: 'Human-readable permission name',
    example: 'Create Users',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Permission description',
    example: 'Allows creating new users in the system',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Resource this permission applies to',
    example: 'users',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  resource: string;

  @ApiProperty({
    description: 'Action that can be performed',
    enum: PermissionAction,
    example: PermissionAction.CREATE,
  })
  @IsEnum(PermissionAction)
  action: PermissionAction;

  @ApiPropertyOptional({
    description: 'Scope of the permission',
    enum: PermissionScope,
    example: PermissionScope.DEPARTMENT,
  })
  @IsOptional()
  @IsEnum(PermissionScope)
  scope?: PermissionScope;

  @ApiPropertyOptional({
    description: 'Additional conditions in JSON format',
    example: { department: 'IT' },
  })
  @IsOptional()
  @IsJSON()
  conditions?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata in JSON format',
    example: { tier: 'premium' },
  })
  @IsOptional()
  @IsJSON()
  metadata?: string;

  @ApiPropertyOptional({
    description: 'Whether this is a system permission',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isSystemPermission?: boolean;

  @ApiPropertyOptional({
    description: 'Module category',
    enum: ModuleCategory,
  })
  @IsOptional()
  @IsEnum(ModuleCategory)
  category?: ModuleCategory;

  @ApiPropertyOptional({
    description: 'Group name for UI display',
    example: 'User Management',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  groupName?: string;

  @ApiPropertyOptional({
    description: 'Group icon identifier',
    example: 'users',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  groupIcon?: string;

  @ApiPropertyOptional({
    description: 'Group sort order',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  groupSortOrder?: number;
}

export class UpdatePermissionDto extends PartialType(CreatePermissionDto) {}

export class PermissionResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Permission code',
    example: 'users:create',
  })
  code: string;

  @ApiProperty({
    description: 'Permission name',
    example: 'Create Users',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Permission description',
  })
  description?: string;

  @ApiProperty({
    description: 'Resource name',
    example: 'users',
  })
  resource: string;

  @ApiProperty({
    description: 'Permission action',
    enum: PermissionAction,
  })
  action: PermissionAction;

  @ApiPropertyOptional({
    description: 'Permission scope',
    enum: PermissionScope,
  })
  scope?: PermissionScope;

  @ApiPropertyOptional({
    description: 'Conditions',
  })
  conditions?: any;

  @ApiPropertyOptional({
    description: 'Metadata',
  })
  metadata?: any;

  @ApiProperty({
    description: 'Is system permission',
  })
  isSystemPermission: boolean;

  @ApiProperty({
    description: 'Is active',
  })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Module category',
    enum: ModuleCategory,
  })
  category?: ModuleCategory;

  @ApiPropertyOptional({
    description: 'Group name',
  })
  groupName?: string;

  @ApiPropertyOptional({
    description: 'Group icon',
  })
  groupIcon?: string;

  @ApiPropertyOptional({
    description: 'Group sort order',
  })
  groupSortOrder?: number;

  @ApiProperty({
    description: 'Creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Created by user ID',
  })
  createdBy?: string;

  @ApiPropertyOptional({
    description: 'Number of roles with this permission',
  })
  roleCount?: number;

  @ApiPropertyOptional({
    description: 'Number of users with this permission',
  })
  userCount?: number;
}

export class QueryPermissionDto {
  @ApiPropertyOptional({
    description: 'Search across name, code, and description',
    example: 'user',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by resource',
    example: 'users',
  })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({
    description: 'Filter by action',
    enum: PermissionAction,
  })
  @IsOptional()
  @IsEnum(PermissionAction)
  action?: PermissionAction;

  @ApiPropertyOptional({
    description: 'Filter by scope',
    enum: PermissionScope,
  })
  @IsOptional()
  @IsEnum(PermissionScope)
  scope?: PermissionScope;

  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: ModuleCategory,
  })
  @IsOptional()
  @IsEnum(ModuleCategory)
  category?: ModuleCategory;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter system permissions',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isSystemPermission?: boolean;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['name', 'code', 'resource', 'createdAt', 'updatedAt'],
    default: 'name',
  })
  @IsOptional()
  @IsString()
  @IsIn(['name', 'code', 'resource', 'createdAt', 'updatedAt'])
  sortBy?: string = 'name';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}

export class PaginatedPermissionResponseDto {
  @ApiProperty({
    description: 'List of permissions',
    type: [PermissionResponseDto],
  })
  data: PermissionResponseDto[];

  @ApiProperty({
    description: 'Total number of items',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPrevious: boolean;
}
