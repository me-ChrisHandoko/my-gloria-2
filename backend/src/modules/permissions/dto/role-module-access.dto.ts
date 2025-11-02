import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  IsArray,
  IsObject,
  MaxLength,
} from 'class-validator';

// Grant DTO
export class GrantRoleModuleAccessDto {
  @ApiProperty({
    description: 'Role ID',
    example: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({
    description: 'Module ID',
    example: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  moduleId: string;

  @ApiProperty({
    description: 'Position ID (optional, for position-specific access)',
    required: false,
    example: 'uuid',
  })
  @IsString()
  @IsOptional()
  positionId?: string;

  @ApiProperty({
    description: 'Permissions JSON object defining what actions are allowed',
    example: { read: true, create: false, update: true, delete: false },
  })
  @IsObject()
  @IsNotEmpty()
  permissions: Record<string, any>;

  @ApiProperty({
    description: 'Is access active',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// Bulk Grant DTO
export class BulkGrantRoleModuleAccessDto {
  @ApiProperty({
    description: 'Role ID',
    example: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({
    description: 'Array of module IDs',
    example: ['uuid1', 'uuid2'],
  })
  @IsArray()
  @IsString({ each: true })
  moduleIds: string[];

  @ApiProperty({
    description: 'Default permissions for all modules',
    example: { read: true, create: false, update: false, delete: false },
  })
  @IsObject()
  @IsNotEmpty()
  permissions: Record<string, any>;

  @ApiProperty({
    description: 'Is access active',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// Update DTO
export class UpdateRoleModuleAccessDto {
  @ApiProperty({
    description: 'Permissions JSON object',
    required: false,
    example: { read: true, create: true, update: true, delete: false },
  })
  @IsObject()
  @IsOptional()
  permissions?: Record<string, any>;

  @ApiProperty({
    description: 'Is access active',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// Response DTO
export class RoleModuleAccessResponseDto {
  @ApiProperty({ description: 'Access record ID' })
  id: string;

  @ApiProperty({ description: 'Role ID' })
  roleId: string;

  @ApiProperty({ description: 'Module ID' })
  moduleId: string;

  @ApiProperty({ description: 'Position ID', required: false })
  positionId?: string;

  @ApiProperty({ description: 'Permissions object' })
  permissions: Record<string, any>;

  @ApiProperty({ description: 'Is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;

  @ApiProperty({ description: 'Created by', required: false })
  createdBy?: string;

  @ApiProperty({ description: 'Version' })
  version: number;

  @ApiProperty({ description: 'Role details', required: false })
  role?: {
    id: string;
    code: string;
    name: string;
  };

  @ApiProperty({ description: 'Module details', required: false })
  module?: {
    id: string;
    code: string;
    name: string;
  };

  @ApiProperty({ description: 'Position details', required: false })
  position?: {
    id: string;
    code: string;
    name: string;
  };
}
