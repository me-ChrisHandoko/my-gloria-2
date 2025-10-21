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
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PositionLevel {
  ENTRY = 'ENTRY',
  JUNIOR = 'JUNIOR',
  SENIOR = 'SENIOR',
  LEAD = 'LEAD',
  MANAGER = 'MANAGER',
  DIRECTOR = 'DIRECTOR',
  EXECUTIVE = 'EXECUTIVE',
}

export class CreatePositionDto {
  @ApiProperty({
    description: 'Position title',
    example: 'Senior Teacher',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'Position code for identification',
    example: 'TCH-SR-001',
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({
    description: 'Department ID this position belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty({
    description:
      'Position hierarchy level in organization (1=highest, 10=lowest)',
    example: 5,
    minimum: 1,
    maximum: 10,
  })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsNotEmpty()
  hierarchyLevel: number;

  @ApiPropertyOptional({
    description: 'School ID this position belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @ApiPropertyOptional({
    description: 'Position level in organizational hierarchy',
    enum: PositionLevel,
    example: PositionLevel.SENIOR,
  })
  @IsOptional()
  @IsEnum(PositionLevel)
  level?: PositionLevel;

  @ApiPropertyOptional({
    description: 'Parent position ID for hierarchical structure',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Position description and responsibilities',
    example: 'Responsible for teaching senior level mathematics courses',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Key responsibilities',
    example: ['Teaching', 'Curriculum Development', 'Student Mentoring'],
    type: [String],
  })
  @IsOptional()
  @IsString({ each: true })
  responsibilities?: string[];

  @ApiPropertyOptional({
    description: 'Required qualifications',
    example: ['Masters in Mathematics', '5+ years teaching experience'],
    type: [String],
  })
  @IsOptional()
  @IsString({ each: true })
  qualifications?: string[];

  @ApiPropertyOptional({
    description: 'Maximum number of people who can hold this position',
    example: 5,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxOccupants?: number;

  @ApiPropertyOptional({
    description: 'Whether the position is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdatePositionDto extends PartialType(CreatePositionDto) {
  @ApiPropertyOptional({
    description: 'Department ID cannot be updated after creation',
  })
  departmentId?: never;
}

export class PositionResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Position title',
    example: 'Senior Teacher',
  })
  name: string;

  @ApiProperty({
    description: 'Position code',
    example: 'TCH-SR-001',
  })
  code: string;

  @ApiProperty({
    description: 'Department ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  departmentId: string;

  @ApiPropertyOptional({
    description: 'Department details',
  })
  department?: {
    id: string;
    name: string;
    code: string;
    schoolId: string;
    school?: {
      id: string;
      name: string;
      code: string;
    };
  };

  @ApiProperty({
    description: 'Position hierarchy level (1=highest, 10=lowest)',
    example: 3,
    minimum: 1,
    maximum: 10,
  })
  hierarchyLevel: number;

  @ApiPropertyOptional({
    description: 'Position level',
    enum: PositionLevel,
    example: PositionLevel.SENIOR,
  })
  level?: PositionLevel;

  @ApiPropertyOptional({
    description: 'Parent position ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Parent position details',
  })
  parent?: {
    id: string;
    name: string;
    code: string;
  };

  @ApiPropertyOptional({
    description: 'Position description',
    example: 'Responsible for teaching senior level mathematics courses',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Key responsibilities',
    example: ['Teaching', 'Curriculum Development'],
    type: [String],
  })
  responsibilities?: string[];

  @ApiPropertyOptional({
    description: 'Required qualifications',
    example: ['Masters in Mathematics'],
    type: [String],
  })
  qualifications?: string[];

  @ApiPropertyOptional({
    description: 'Maximum number of occupants',
    example: 5,
  })
  maxOccupants?: number;

  @ApiProperty({
    description: 'Current number of occupants',
    example: 3,
  })
  currentOccupants?: number;

  @ApiProperty({
    description: 'Whether the position is active',
    example: true,
  })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'School ID for this position',
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

  @ApiProperty({
    description: 'Number of users holding this position',
    example: 3,
  })
  holderCount?: number;

  @ApiProperty({
    description: 'Number of users in this position (alias for holderCount)',
    example: 3,
  })
  userCount?: number;

  @ApiPropertyOptional({
    description: 'Number of permissions assigned to this position',
    example: 15,
  })
  permissionCount?: number;

  @ApiProperty({
    description: 'Number of subordinate positions',
    example: 5,
  })
  subordinateCount?: number;

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

export class QueryPositionDto {
  @ApiPropertyOptional({
    description: 'Filter by position name (partial match)',
    example: 'Teacher',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filter by position code',
    example: 'TCH-SR-001',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description: 'Filter by department ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Filter by school ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @ApiPropertyOptional({
    description: 'Filter by position level',
    enum: PositionLevel,
    example: PositionLevel.SENIOR,
  })
  @IsOptional()
  @IsEnum(PositionLevel)
  level?: PositionLevel;

  @ApiPropertyOptional({
    description: 'Filter by parent position ID',
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
  isActive?: boolean | string;

  @ApiPropertyOptional({
    description: 'Include department details in response',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeDepartment?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include parent position details in response',
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
    enum: ['name', 'code', 'level', 'createdAt', 'updatedAt'],
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

export class PaginatedPositionResponseDto {
  @ApiProperty({
    description: 'List of positions',
    type: [PositionResponseDto],
  })
  data: PositionResponseDto[];

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

export class PositionHierarchyDto {
  @ApiProperty({
    description: 'Position ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Position name',
    example: 'Senior Teacher',
  })
  name: string;

  @ApiProperty({
    description: 'Position code',
    example: 'TCH-SR-001',
  })
  code: string;

  @ApiProperty({
    description: 'Position level',
    enum: PositionLevel,
    example: PositionLevel.SENIOR,
  })
  level: PositionLevel;

  @ApiProperty({
    description: 'Subordinate positions',
    type: [PositionHierarchyDto],
  })
  subordinates: PositionHierarchyDto[];
}
