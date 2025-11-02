import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  IsArray,
  IsObject,
  IsDateString,
  MaxLength,
} from 'class-validator';

// Grant DTO
export class GrantUserModuleAccessDto {
  @ApiProperty({
    description: 'User Profile ID',
    example: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  userProfileId: string;

  @ApiProperty({
    description: 'Module ID',
    example: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  moduleId: string;

  @ApiProperty({
    description: 'Permissions JSON object defining what actions are allowed',
    example: { read: true, create: true, update: true, delete: false },
  })
  @IsObject()
  @IsNotEmpty()
  permissions: Record<string, any>;

  @ApiProperty({
    description: 'Reason for granting access',
    required: false,
    example: 'Temporary admin access for project',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;

  @ApiProperty({
    description: 'Is access active',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Effective from date',
    required: false,
    example: '2024-01-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @ApiProperty({
    description: 'Effective until date (for temporary access)',
    required: false,
    example: '2024-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  effectiveUntil?: string;
}

// Bulk Grant DTO
export class BulkGrantUserModuleAccessDto {
  @ApiProperty({
    description: 'User Profile ID',
    example: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  userProfileId: string;

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
    description: 'Reason for granting access',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;

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
export class UpdateUserModuleAccessDto {
  @ApiProperty({
    description: 'Permissions JSON object',
    required: false,
    example: { read: true, create: true, update: true, delete: true },
  })
  @IsObject()
  @IsOptional()
  permissions?: Record<string, any>;

  @ApiProperty({
    description: 'Reason for update',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;

  @ApiProperty({
    description: 'Is access active',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Effective until date',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  effectiveUntil?: string;
}

// Response DTO
export class UserModuleAccessResponseDto {
  @ApiProperty({ description: 'Access record ID' })
  id: string;

  @ApiProperty({ description: 'User Profile ID' })
  userProfileId: string;

  @ApiProperty({ description: 'Module ID' })
  moduleId: string;

  @ApiProperty({ description: 'Permissions object' })
  permissions: Record<string, any>;

  @ApiProperty({ description: 'Granted by' })
  grantedBy: string;

  @ApiProperty({ description: 'Reason', required: false })
  reason?: string;

  @ApiProperty({ description: 'Is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;

  @ApiProperty({ description: 'Version' })
  version: number;

  @ApiProperty({ description: 'Effective from' })
  effectiveFrom: Date;

  @ApiProperty({ description: 'Effective until', required: false })
  effectiveUntil?: Date;

  @ApiProperty({ description: 'User profile details', required: false })
  userProfile?: {
    id: string;
    nip: string;
  };

  @ApiProperty({ description: 'Module details', required: false })
  module?: {
    id: string;
    code: string;
    name: string;
  };
}
