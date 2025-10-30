import {
  IsString,
  IsUUID,
  IsBoolean,
  IsObject,
  IsOptional,
  IsArray,
  IsNotEmpty,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GrantResourcePermissionDto {
  @ApiProperty({
    description: 'User profile ID to grant permission to',
    example: 'cm123abc456def',
  })
  @IsUUID()
  @IsNotEmpty()
  userProfileId: string;

  @ApiProperty({
    description: 'Permission ID to grant',
    example: 'cm456def789ghi',
  })
  @IsUUID()
  @IsNotEmpty()
  permissionId: string;

  @ApiProperty({
    description: 'Resource type (e.g., "document", "project", "invoice")',
    example: 'document',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  resourceType: string;

  @ApiProperty({
    description: 'Specific resource instance ID',
    example: 'doc_12345',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  resourceId: string;

  @ApiPropertyOptional({
    description: 'Whether permission is granted (true) or denied (false)',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isGranted?: boolean;

  @ApiPropertyOptional({
    description: 'Additional conditions as JSON',
    example: { department: 'IT', maxAmount: 10000 },
  })
  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Permission valid from date',
    example: '2025-01-01T00:00:00.000Z',
  })
  @Type(() => Date)
  @IsOptional()
  effectiveFrom?: Date;

  @ApiPropertyOptional({
    description: 'Permission valid until date',
    example: '2025-12-31T23:59:59.999Z',
  })
  @Type(() => Date)
  @IsOptional()
  effectiveUntil?: Date;

  @ApiProperty({
    description: 'Reason for granting this resource permission',
    example: 'Project lead for Q1 initiative',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  grantReason: string;
}

export class UpdateResourcePermissionDto {
  @ApiPropertyOptional({
    description: 'Whether permission is granted (true) or denied (false)',
  })
  @IsBoolean()
  @IsOptional()
  isGranted?: boolean;

  @ApiPropertyOptional({
    description: 'Additional conditions as JSON',
  })
  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Permission valid from date',
  })
  @Type(() => Date)
  @IsOptional()
  effectiveFrom?: Date;

  @ApiPropertyOptional({
    description: 'Permission valid until date',
  })
  @Type(() => Date)
  @IsOptional()
  effectiveUntil?: Date;

  @ApiPropertyOptional({
    description: 'Reason for updating',
  })
  @MaxLength(500)
  @IsOptional()
  reason?: string;
}

export class CheckResourcePermissionDto {
  @ApiProperty({
    description: 'User profile ID to check',
    example: 'cm123abc456def',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Permission ID to check',
    example: 'cm456def789ghi',
  })
  @IsUUID()
  @IsNotEmpty()
  permissionId: string;

  @ApiProperty({
    description: 'Resource type',
    example: 'document',
  })
  @IsString()
  @IsNotEmpty()
  resourceType: string;

  @ApiProperty({
    description: 'Resource ID',
    example: 'doc_12345',
  })
  @IsString()
  @IsNotEmpty()
  resourceId: string;

  @ApiPropertyOptional({
    description: 'Additional context for permission evaluation',
    example: { action: 'approve', amount: 5000 },
  })
  @IsObject()
  @IsOptional()
  context?: Record<string, any>;
}

export class BulkGrantResourcePermissionDto {
  @ApiProperty({
    description: 'Array of user profile IDs',
    example: ['cm123abc456def', 'cm789ghi012jkl'],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsNotEmpty()
  userProfileIds: string[];

  @ApiProperty({
    description: 'Permission ID to grant',
    example: 'cm456def789ghi',
  })
  @IsUUID()
  @IsNotEmpty()
  permissionId: string;

  @ApiProperty({
    description: 'Resource type',
    example: 'document',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  resourceType: string;

  @ApiProperty({
    description: 'Array of resource IDs',
    example: ['doc_12345', 'doc_67890'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  resourceIds: string[];

  @ApiPropertyOptional({
    description: 'Whether permission is granted',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isGranted?: boolean;

  @ApiPropertyOptional({
    description: 'Conditions for all permissions',
  })
  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Valid from date for all permissions',
  })
  @Type(() => Date)
  @IsOptional()
  effectiveFrom?: Date;

  @ApiPropertyOptional({
    description: 'Valid until date for all permissions',
  })
  @Type(() => Date)
  @IsOptional()
  effectiveUntil?: Date;

  @ApiProperty({
    description: 'Reason for bulk grant',
    example: 'Project team access for Q1 initiative',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  grantReason: string;
}

export class BulkRevokeResourcePermissionDto {
  @ApiProperty({
    description: 'Array of user profile IDs to revoke from',
    example: ['cm123abc456def', 'cm789ghi012jkl'],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsNotEmpty()
  userProfileIds: string[];

  @ApiProperty({
    description: 'Permission ID to revoke',
    example: 'cm456def789ghi',
  })
  @IsUUID()
  @IsNotEmpty()
  permissionId: string;

  @ApiProperty({
    description: 'Resource type',
    example: 'document',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  resourceType: string;

  @ApiProperty({
    description: 'Array of resource IDs to revoke',
    example: ['doc_12345', 'doc_67890'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  resourceIds: string[];

  @ApiProperty({
    description: 'Reason for revocation',
    example: 'Project completed',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class GetUserResourcePermissionsDto {
  @ApiPropertyOptional({
    description: 'Filter by resource type',
    example: 'document',
  })
  @IsString()
  @IsOptional()
  resourceType?: string;

  @ApiPropertyOptional({
    description: 'Filter by specific resource ID',
    example: 'doc_12345',
  })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by permission ID',
    example: 'cm456def789ghi',
  })
  @IsUUID()
  @IsOptional()
  permissionId?: string;

  @ApiPropertyOptional({
    description: 'Filter by grant status',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isGranted?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by active status (not expired)',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class GetResourceAccessListDto {
  @ApiProperty({
    description: 'Resource type',
    example: 'document',
  })
  @IsString()
  @IsNotEmpty()
  resourceType: string;

  @ApiProperty({
    description: 'Resource ID',
    example: 'doc_12345',
  })
  @IsString()
  @IsNotEmpty()
  resourceId: string;

  @ApiPropertyOptional({
    description: 'Filter by permission ID',
    example: 'cm456def789ghi',
  })
  @IsUUID()
  @IsOptional()
  permissionId?: string;

  @ApiPropertyOptional({
    description: 'Filter by grant status',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isGranted?: boolean;
}

export class TransferResourcePermissionsDto {
  @ApiProperty({
    description: 'Source user profile ID (from)',
    example: 'cm123abc456def',
  })
  @IsUUID()
  @IsNotEmpty()
  fromUserId: string;

  @ApiProperty({
    description: 'Target user profile ID (to)',
    example: 'cm789ghi012jkl',
  })
  @IsUUID()
  @IsNotEmpty()
  toUserId: string;

  @ApiProperty({
    description: 'Resource type',
    example: 'document',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  resourceType: string;

  @ApiPropertyOptional({
    description: 'Specific resource IDs to transfer (if empty, transfers all)',
    example: ['doc_12345', 'doc_67890'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  resourceIds?: string[];

  @ApiProperty({
    description: 'Reason for transfer',
    example: 'Employee role change',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  transferReason: string;

  @ApiPropertyOptional({
    description: 'Whether to revoke from source user',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  revokeFromSource?: boolean;
}
