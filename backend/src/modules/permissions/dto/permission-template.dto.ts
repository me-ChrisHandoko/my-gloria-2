import {
  IsString,
  IsUUID,
  IsBoolean,
  IsObject,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TemplateTargetType {
  ROLE = 'ROLE',
  USER = 'USER',
  DEPARTMENT = 'DEPARTMENT',
  POSITION = 'POSITION',
}

export class CreatePermissionTemplateDto {
  @ApiProperty({
    description: 'Unique template code',
    example: 'MANAGER_STANDARD',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Code must contain only uppercase letters, numbers, and underscores',
  })
  code: string;

  @ApiProperty({
    description: 'Template name',
    example: 'Standard Manager Permissions',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Template description',
    example: 'Standard permission set for department managers',
  })
  @MaxLength(500)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Template category',
    example: 'Management',
  })
  @MaxLength(100)
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'Permissions configuration as JSON',
    example: {
      permissions: ['perm_123', 'perm_456'],
      roles: ['role_viewer'],
      resources: [{ type: 'document', permissions: ['read', 'edit'] }]
    },
  })
  @IsObject()
  @IsNotEmpty()
  permissions: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Module access configuration as JSON',
    example: {
      users: { read: true, create: true, update: true, delete: false },
      reports: { read: true, create: false, update: false, delete: false }
    },
  })
  @IsObject()
  @IsOptional()
  moduleAccess?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether this is a system template (cannot be deleted)',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;
}

export class UpdatePermissionTemplateDto {
  @ApiPropertyOptional({
    description: 'Template name',
  })
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Template description',
  })
  @MaxLength(500)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Template category',
  })
  @MaxLength(100)
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: 'Permissions configuration',
  })
  @IsObject()
  @IsOptional()
  permissions?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Module access configuration',
  })
  @IsObject()
  @IsOptional()
  moduleAccess?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Active status',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ApplyTemplateDto {
  @ApiProperty({
    description: 'Target type',
    enum: TemplateTargetType,
    example: TemplateTargetType.ROLE,
  })
  @IsEnum(TemplateTargetType)
  @IsNotEmpty()
  targetType: TemplateTargetType;

  @ApiProperty({
    description: 'Target ID (role ID, user ID, department ID, or position ID)',
    example: 'cm123abc456def',
  })
  @IsString()
  @IsNotEmpty()
  targetId: string;

  @ApiPropertyOptional({
    description: 'Application notes',
    example: 'Applied standard manager template for new hire',
  })
  @MaxLength(500)
  @IsOptional()
  notes?: string;
}

export class RevokeTemplateApplicationDto {
  @ApiProperty({
    description: 'Reason for revoking template application',
    example: 'Role change - no longer a manager',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  revokedReason: string;
}

export class GetTemplatesFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'Management',
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by system template',
    example: false,
  })
  @IsOptional()
  isSystem?: boolean;

  @ApiPropertyOptional({
    description: 'Search by code or name',
    example: 'MANAGER',
  })
  @IsString()
  @IsOptional()
  search?: string;
}
