import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsPhoneNumber,
  IsUrl,
  MaxLength,
  MinLength,
  IsNotEmpty,
  IsUUID,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSchoolDto {
  @ApiProperty({
    description: 'School name',
    example: 'Gloria High School',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'School code for identification',
    example: 'GHS001',
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({
    description: 'School address',
    example: '123 Education Street, City',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+628123456789',
  })
  @IsOptional()
  @IsPhoneNumber('ID')
  phone?: string;

  @ApiPropertyOptional({
    description: 'Contact email address',
    example: 'info@gloriaschool.org',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'School website URL',
    example: 'https://www.gloriaschool.org',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    description: 'Principal or head of school name',
    example: 'Dr. John Doe',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  principal?: string;

  @ApiPropertyOptional({
    description: 'School description',
    example: 'A leading educational institution focused on excellence',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the school is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateSchoolDto extends PartialType(CreateSchoolDto) {}

export class SchoolResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'School name',
    example: 'Gloria High School',
  })
  name: string;

  @ApiProperty({
    description: 'School code',
    example: 'GHS001',
  })
  code: string;

  @ApiPropertyOptional({
    description: 'School address',
    example: '123 Education Street, City',
  })
  address?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+628123456789',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Contact email address',
    example: 'info@gloriaschool.org',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'School website URL',
    example: 'https://www.gloriaschool.org',
  })
  website?: string;

  @ApiPropertyOptional({
    description: 'Principal name',
    example: 'Dr. John Doe',
  })
  principal?: string;

  @ApiPropertyOptional({
    description: 'School description',
    example: 'A leading educational institution',
  })
  description?: string;

  @ApiProperty({
    description: 'Whether the school is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Number of departments in the school',
    example: 10,
  })
  departmentCount?: number;

  @ApiProperty({
    description: 'Number of users in the school',
    example: 500,
  })
  userCount?: number;

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

export class QuerySchoolDto {
  @ApiPropertyOptional({
    description: 'Filter by school name (partial match)',
    example: 'Gloria',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filter by school code',
    example: 'GHS001',
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

export class PaginatedSchoolResponseDto {
  @ApiProperty({
    description: 'List of schools',
    type: [SchoolResponseDto],
  })
  data: SchoolResponseDto[];

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
