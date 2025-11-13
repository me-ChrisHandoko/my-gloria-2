import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  MaxLength,
  MinLength,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Unique role code',
    example: 'ADMIN',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  code: string;

  @ApiProperty({
    description: 'Role name',
    example: 'Administrator',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Full system access with all permissions',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Hierarchy level (higher = more permissions)',
    example: 10,
    minimum: 0,
    maximum: 100,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  hierarchyLevel: number;

  @ApiPropertyOptional({
    description: 'Whether this is a system role',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isSystemRole?: boolean;
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}

export class RoleResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Role code',
    example: 'ADMIN',
  })
  code: string;

  @ApiProperty({
    description: 'Role name',
    example: 'Administrator',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Role description',
  })
  description?: string;

  @ApiProperty({
    description: 'Hierarchy level',
  })
  hierarchyLevel: number;

  @ApiProperty({
    description: 'Is system role',
  })
  isSystemRole: boolean;

  @ApiProperty({
    description: 'Is active',
  })
  isActive: boolean;

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
    description: 'Number of permissions assigned to this role',
  })
  permissionCount?: number;

  @ApiPropertyOptional({
    description: 'Number of users with this role',
  })
  userCount?: number;

  @ApiPropertyOptional({
    description: 'Number of parent roles',
  })
  parentRoleCount?: number;

  @ApiPropertyOptional({
    description: 'Number of child roles',
  })
  childRoleCount?: number;
}

export class QueryRoleDto {
  @ApiPropertyOptional({
    description: 'Search across name, code, and description',
    example: 'admin',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by name',
    example: 'Administrator',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filter by code',
    example: 'ADMIN',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter system roles',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isSystemRole?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by minimum hierarchy level',
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minHierarchyLevel?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum hierarchy level',
    example: 50,
  })
  @IsOptional()
  @IsInt()
  @Max(100)
  @Type(() => Number)
  maxHierarchyLevel?: number;

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
    enum: ['name', 'code', 'hierarchyLevel', 'createdAt', 'updatedAt'],
    default: 'name',
  })
  @IsOptional()
  @IsString()
  @IsIn(['name', 'code', 'hierarchyLevel', 'createdAt', 'updatedAt'])
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

export class PaginatedRoleResponseDto {
  @ApiProperty({
    description: 'List of roles',
    type: [RoleResponseDto],
  })
  data: RoleResponseDto[];

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
