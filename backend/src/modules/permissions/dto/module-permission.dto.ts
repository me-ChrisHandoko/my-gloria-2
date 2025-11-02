import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { PermissionAction, PermissionScope } from '@prisma/client';

// Create DTO
export class CreateModulePermissionDto {
  @ApiProperty({
    description: 'Module ID',
    example: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  moduleId: string;

  @ApiProperty({
    description: 'Permission action',
    enum: PermissionAction,
    example: PermissionAction.READ,
  })
  @IsEnum(PermissionAction)
  action: PermissionAction;

  @ApiProperty({
    description: 'Permission scope',
    enum: PermissionScope,
    example: PermissionScope.OWN,
  })
  @IsEnum(PermissionScope)
  scope: PermissionScope;

  @ApiProperty({
    description: 'Description of the module permission',
    required: false,
    example: 'Allow users to read their own data in this module',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

// Update DTO
export class UpdateModulePermissionDto {
  @ApiProperty({
    description: 'Description of the module permission',
    required: false,
    example: 'Allow users to read their own data in this module',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

// Response DTO
export class ModulePermissionResponseDto {
  @ApiProperty({ description: 'Permission ID' })
  id: string;

  @ApiProperty({ description: 'Module ID' })
  moduleId: string;

  @ApiProperty({ description: 'Permission action', enum: PermissionAction })
  action: PermissionAction;

  @ApiProperty({ description: 'Permission scope', enum: PermissionScope })
  scope: PermissionScope;

  @ApiProperty({ description: 'Description', required: false })
  description?: string;

  @ApiProperty({ description: 'Module details', required: false })
  module?: {
    id: string;
    code: string;
    name: string;
  };
}

// Query DTO
export class QueryModulePermissionDto {
  @ApiProperty({ description: 'Module ID', required: false })
  @IsString()
  @IsOptional()
  moduleId?: string;

  @ApiProperty({
    description: 'Filter by action',
    enum: PermissionAction,
    required: false,
  })
  @IsEnum(PermissionAction)
  @IsOptional()
  action?: PermissionAction;

  @ApiProperty({
    description: 'Filter by scope',
    enum: PermissionScope,
    required: false,
  })
  @IsEnum(PermissionScope)
  @IsOptional()
  scope?: PermissionScope;
}
