import {
  IsString,
  IsUUID,
  IsBoolean,
  IsObject,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PolicyType {
  TIME_BASED = 'TIME_BASED',
  LOCATION_BASED = 'LOCATION_BASED',
  ATTRIBUTE_BASED = 'ATTRIBUTE_BASED',
  CONTEXTUAL = 'CONTEXTUAL',
  HIERARCHICAL = 'HIERARCHICAL',
}

export class CreatePermissionPolicyDto {
  @ApiProperty({
    description: 'Unique policy code',
    example: 'BUSINESS_HOURS_ONLY',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Code must contain only uppercase letters, numbers, and underscores',
  })
  code: string;

  @ApiProperty({
    description: 'Policy name',
    example: 'Business Hours Access Policy',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Policy description',
    example: 'Restricts access to business hours only (Mon-Fri, 9AM-5PM)',
  })
  @MaxLength(500)
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Policy type',
    enum: PolicyType,
    example: PolicyType.TIME_BASED,
  })
  @IsEnum(PolicyType)
  @IsNotEmpty()
  policyType: PolicyType;

  @ApiProperty({
    description: 'Policy rules as JSON based on policyType',
    example: {
      allowedDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      allowedHours: '09:00-17:00',
      timezone: 'Asia/Jakarta',
    },
  })
  @IsObject()
  @IsNotEmpty()
  rules: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Policy priority (higher = evaluated first)',
    default: 100,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({
    description: 'Whether policy is active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdatePermissionPolicyDto {
  @ApiPropertyOptional({
    description: 'Policy name',
  })
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Policy description',
  })
  @MaxLength(500)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Policy rules',
  })
  @IsObject()
  @IsOptional()
  rules?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Policy priority',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({
    description: 'Active status',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class TestPolicyDto {
  @ApiProperty({
    description: 'User profile ID to test',
    example: 'cm123abc456def',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Resource type',
    example: 'documents',
  })
  @IsString()
  @IsNotEmpty()
  resource: string;

  @ApiProperty({
    description: 'Action to perform',
    example: 'READ',
  })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiProperty({
    description: 'Context for policy evaluation',
    example: {
      timestamp: '2025-06-15T14:30:00Z',
      ipAddress: '192.168.1.100',
      location: { country: 'ID', city: 'Jakarta' },
      device: 'desktop',
      mfaVerified: true,
    },
  })
  @IsObject()
  @IsNotEmpty()
  context: Record<string, any>;
}

export class EvaluatePoliciesDto {
  @ApiProperty({
    description: 'User profile ID',
    example: 'cm123abc456def',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Resource type',
    example: 'documents',
  })
  @IsString()
  @IsNotEmpty()
  resource: string;

  @ApiProperty({
    description: 'Action to perform',
    example: 'READ',
  })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiPropertyOptional({
    description: 'Resource ID for resource-specific checks',
    example: 'doc_12345',
  })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @ApiProperty({
    description: 'Request context',
    example: {
      timestamp: '2025-06-15T14:30:00Z',
      ipAddress: '192.168.1.100',
      device: 'desktop',
    },
  })
  @IsObject()
  @IsNotEmpty()
  context: Record<string, any>;
}

export class GetPoliciesFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by policy type',
    enum: PolicyType,
  })
  @IsEnum(PolicyType)
  @IsOptional()
  policyType?: PolicyType;

  @ApiPropertyOptional({
    description: 'Filter by active status',
  })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Search by code or name',
  })
  @IsString()
  @IsOptional()
  search?: string;
}
