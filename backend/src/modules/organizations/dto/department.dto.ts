import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  MaxLength,
  MinLength,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateDepartmentDto {
  @ApiProperty({
    description: 'Department name',
    example: 'Mathematics Department',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'Department code for identification',
    example: 'MATH001',
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({
    description: 'School ID this department belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @ApiPropertyOptional({
    description: 'Parent department ID for hierarchical structure',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Department description',
    example: 'Department responsible for mathematics curriculum',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the department is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {
  @ApiPropertyOptional({
    description: 'School ID cannot be updated after creation',
  })
  schoolId?: never;
}

export class DepartmentResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Department name',
    example: 'Mathematics Department',
  })
  name: string;

  @ApiProperty({
    description: 'Department code',
    example: 'MATH001',
  })
  code: string;

  @ApiPropertyOptional({
    description: 'School ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  schoolId?: string;

  @ApiPropertyOptional({
    description: 'School details',
  })
  school?: {
    id: string;
    name: string;
    code: string;
  };

  @ApiPropertyOptional({
    description: 'Parent department ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Parent department details',
  })
  parent?: {
    id: string;
    name: string;
    code: string;
  };

  @ApiPropertyOptional({
    description: 'Department description',
    example: 'Department responsible for mathematics curriculum',
  })
  description?: string;

  @ApiProperty({
    description: 'Whether the department is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Number of positions in the department',
    example: 15,
  })
  positionCount?: number;

  @ApiProperty({
    description: 'Number of users in the department',
    example: 50,
  })
  userCount?: number;

  @ApiProperty({
    description: 'Number of child departments',
    example: 3,
  })
  childDepartmentCount?: number;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class QueryDepartmentDto {
  @ApiPropertyOptional({
    description: 'Filter by department name (partial match)',
    example: 'Math',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filter by department code',
    example: 'MATH001',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description: 'Filter by school ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @ApiPropertyOptional({
    description: 'Filter by parent department ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Include school details in response',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeSchool?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include parent department details in response',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeParent?: boolean = false;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
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
    description: 'Number of items per page',
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
    enum: ['name', 'code', 'createdAt', 'updatedAt'],
    default: 'name',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'name';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';
}

export class PaginatedDepartmentResponseDto {
  @ApiProperty({
    description: 'List of departments',
    type: [DepartmentResponseDto],
  })
  data: DepartmentResponseDto[];

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

export class DepartmentHierarchyDto {
  @ApiProperty({
    description: 'Department ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Department name',
    example: 'Mathematics Department',
  })
  name: string;

  @ApiProperty({
    description: 'Department code',
    example: 'MATH001',
  })
  code: string;

  @ApiProperty({
    description: 'Department level in hierarchy',
    example: 1,
  })
  level: number;

  @ApiProperty({
    description: 'Child departments',
    type: [DepartmentHierarchyDto],
  })
  children: DepartmentHierarchyDto[];
}
