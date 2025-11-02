import {
  IsString,
  IsOptional,
  IsBoolean,
  IsJSON,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GrantUserPermissionDto {
  @ApiProperty({
    description: 'User profile ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  userProfileId: string;

  @ApiProperty({
    description: 'Permission ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  @IsNotEmpty()
  permissionId: string;

  @ApiPropertyOptional({
    description: 'Whether permission is granted or revoked',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isGranted?: boolean;

  @ApiPropertyOptional({
    description: 'Additional conditions in JSON format',
    example: { department: 'IT' },
  })
  @IsOptional()
  @IsJSON()
  conditions?: string;

  @ApiProperty({
    description: 'Reason for granting permission',
    example: 'Special approval for project management',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  grantReason: string;

  @ApiPropertyOptional({
    description: 'Priority level (higher = takes precedence)',
    example: 100,
    default: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Whether this is a temporary permission',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isTemporary?: boolean;

  @ApiPropertyOptional({
    description: 'Resource ID for resource-specific permissions',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({
    description: 'Resource type for resource-specific permissions',
    example: 'school',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  resourceType?: string;

  @ApiPropertyOptional({
    description: 'Effective from date',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({
    description: 'Effective until date',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;
}

export class BulkGrantUserPermissionsDto {
  @ApiProperty({
    description: 'User profile ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  userProfileId: string;

  @ApiProperty({
    description: 'Array of permission IDs to grant',
    example: [
      '123e4567-e89b-12d3-a456-426614174001',
      '123e4567-e89b-12d3-a456-426614174002',
    ],
    type: [String],
  })
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  permissionIds: string[];

  @ApiProperty({
    description: 'Reason for granting permissions',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  grantReason: string;

  @ApiPropertyOptional({
    description: 'Whether permissions are granted or revoked',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isGranted?: boolean;

  @ApiPropertyOptional({
    description: 'Whether permissions are temporary',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isTemporary?: boolean;
}

export class QueryUserPermissionDto {
  @ApiPropertyOptional({
    description: 'Filter by granted/denied status',
  })
  @IsOptional()
  @IsBoolean()
  isGranted?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by resource type',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  resourceType?: string;

  @ApiPropertyOptional({
    description: 'Filter by resource ID',
  })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({
    description: 'Include expired permissions',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeExpired?: boolean;

  @ApiPropertyOptional({
    description: 'Include denied permissions',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeDenied?: boolean;
}

export class UserPermissionResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User profile ID',
  })
  userProfileId: string;

  @ApiProperty({
    description: 'Permission ID',
  })
  permissionId: string;

  @ApiProperty({
    description: 'Is granted',
  })
  isGranted: boolean;

  @ApiPropertyOptional({
    description: 'Conditions',
  })
  conditions?: any;

  @ApiProperty({
    description: 'Granted by user ID',
  })
  grantedBy: string;

  @ApiProperty({
    description: 'Grant reason',
  })
  grantReason: string;

  @ApiProperty({
    description: 'Priority',
  })
  priority: number;

  @ApiProperty({
    description: 'Is temporary',
  })
  isTemporary: boolean;

  @ApiPropertyOptional({
    description: 'Resource ID',
  })
  resourceId?: string;

  @ApiPropertyOptional({
    description: 'Resource type',
  })
  resourceType?: string;

  @ApiProperty({
    description: 'Effective from date',
  })
  effectiveFrom: Date;

  @ApiPropertyOptional({
    description: 'Effective until date',
  })
  effectiveUntil?: Date;

  @ApiProperty({
    description: 'Creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'User profile details',
  })
  userProfile?: {
    id: string;
    nip: string;
  };

  @ApiPropertyOptional({
    description: 'Permission details',
  })
  permission?: {
    id: string;
    code: string;
    name: string;
    resource: string;
    action: string;
  };
}
