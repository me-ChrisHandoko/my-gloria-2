import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ModuleCategory } from '@prisma/client';

export class CreateModuleDto {
  @ApiProperty({
    description: 'Unique module code',
    example: 'HR_LEAVE',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @Length(1, 50)
  code: string;

  @ApiProperty({
    description: 'Module name',
    example: 'Leave Management',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiProperty({
    enum: ModuleCategory,
    description: 'Module category',
    example: ModuleCategory.SERVICE,
  })
  @IsEnum(ModuleCategory)
  category: ModuleCategory;

  @ApiPropertyOptional({
    description: 'Module description',
    example: 'Manage employee leave requests and approvals',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Icon name or path',
    example: 'calendar',
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({
    description: 'Frontend route path',
    example: '/hr/leave',
  })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({
    description: 'Parent module ID (for hierarchy)',
    example: 'uuid-of-parent-module',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Display sort order',
    example: 10,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Is module active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Is module visible in UI',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class UpdateModuleDto extends PartialType(CreateModuleDto) {}

export class DeleteModuleDto {
  @ApiProperty({
    description: 'Reason for deletion',
    example: 'Module deprecated and replaced by new system',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @Length(1, 500)
  reason: string;
}

export class MoveModuleDto {
  @ApiProperty({
    description: 'New parent module ID (null for root level)',
    example: 'uuid-of-new-parent',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  newParentId?: string | null;
}

export class ModuleQueryParamsDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Search term (searches name, code, description)',
    example: 'leave',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ModuleCategory,
    description: 'Filter by category',
    example: ModuleCategory.SERVICE,
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
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by visibility status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by parent ID (use "null" string for root modules)',
    example: 'uuid-of-parent',
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}
