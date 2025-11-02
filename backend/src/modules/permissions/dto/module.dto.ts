import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  MaxLength,
  MinLength,
  Min,
  Max,
  IsIn,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ModuleCategory } from '@prisma/client';

export class CreateModuleDto {
  @ApiProperty({
    description: 'Unique module code',
    example: 'user-management',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  code: string;

  @ApiProperty({
    description: 'Module name',
    example: 'User Management',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'Module category',
    enum: ModuleCategory,
    example: ModuleCategory.SYSTEM,
  })
  @IsEnum(ModuleCategory)
  category: ModuleCategory;

  @ApiPropertyOptional({
    description: 'Module description',
    example: 'Manage users and their access',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Icon identifier',
    example: 'users',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Module path/route',
    example: '/admin/users',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  path?: string;

  @ApiPropertyOptional({
    description: 'Parent module ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Sort order for display',
    example: 1,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether module is visible in UI',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class UpdateModuleDto extends PartialType(CreateModuleDto) {}

export class ModuleResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Module code',
    example: 'user-management',
  })
  code: string;

  @ApiProperty({
    description: 'Module name',
    example: 'User Management',
  })
  name: string;

  @ApiProperty({
    description: 'Module category',
    enum: ModuleCategory,
  })
  category: ModuleCategory;

  @ApiPropertyOptional({
    description: 'Module description',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Icon',
  })
  icon?: string;

  @ApiPropertyOptional({
    description: 'Path',
  })
  path?: string;

  @ApiPropertyOptional({
    description: 'Parent module ID',
  })
  parentId?: string;

  @ApiProperty({
    description: 'Sort order',
  })
  sortOrder: number;

  @ApiProperty({
    description: 'Is active',
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Is visible',
  })
  isVisible: boolean;

  @ApiProperty({
    description: 'Version',
  })
  version: number;

  @ApiPropertyOptional({
    description: 'Deleted at',
  })
  deletedAt?: Date;

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
    description: 'Updated by user ID',
  })
  updatedBy?: string;

  @ApiPropertyOptional({
    description: 'Number of child modules',
  })
  childModuleCount?: number;

  @ApiPropertyOptional({
    description: 'Number of permissions',
  })
  permissionCount?: number;
}

export class QueryModuleDto {
  @ApiPropertyOptional({
    description: 'Search across name, code, and description',
    example: 'user',
  })
  @IsOptional()
  @IsString()
  search?: string;

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
    description: 'Filter by visible status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isVisible?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by parent module ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Include deleted modules',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeDeleted?: boolean;

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
    enum: ['name', 'code', 'sortOrder', 'category', 'createdAt', 'updatedAt'],
    default: 'sortOrder',
  })
  @IsOptional()
  @IsString()
  @IsIn(['name', 'code', 'sortOrder', 'category', 'createdAt', 'updatedAt'])
  sortBy?: string = 'sortOrder';

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

export class PaginatedModuleResponseDto {
  @ApiProperty({
    description: 'List of modules',
    type: [ModuleResponseDto],
  })
  data: ModuleResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      total: 100,
      page: 1,
      limit: 10,
      totalPages: 10,
      hasNext: true,
      hasPrevious: false,
    },
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
