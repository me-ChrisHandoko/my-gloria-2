import {
  IsString,
  IsUUID,
  IsObject,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePermissionDelegationDto {
  @ApiProperty({
    description: 'User profile ID to delegate permissions to',
    example: 'cm123abc456def',
  })
  @IsUUID()
  @IsNotEmpty()
  delegateId: string;

  @ApiProperty({
    description: 'Permissions to delegate as JSON (can include specific permissions, roles, or resources)',
    example: {
      permissions: ['perm_123', 'perm_456'],
      roles: ['role_admin'],
      resources: [{ type: 'document', id: 'doc_001', permissions: ['read', 'edit'] }]
    },
  })
  @IsObject()
  @IsNotEmpty()
  permissions: Record<string, any>;

  @ApiProperty({
    description: 'Reason for delegation',
    example: 'Vacation coverage - out of office until June 30',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({
    description: 'Delegation start date (defaults to now)',
    example: '2025-01-01T00:00:00.000Z',
  })
  @Type(() => Date)
  @IsOptional()
  validFrom?: Date;

  @ApiProperty({
    description: 'Delegation end date (required)',
    example: '2025-12-31T23:59:59.999Z',
  })
  @Type(() => Date)
  @IsNotEmpty()
  validUntil: Date;
}

export class RevokeDelegationDto {
  @ApiProperty({
    description: 'Reason for revoking delegation',
    example: 'Returned early from vacation',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  revokedReason: string;
}

export class ExtendDelegationDto {
  @ApiProperty({
    description: 'New expiration date',
    example: '2026-01-31T23:59:59.999Z',
  })
  @Type(() => Date)
  @IsNotEmpty()
  newValidUntil: Date;

  @ApiProperty({
    description: 'Reason for extension',
    example: 'Extended vacation period',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class GetDelegationsFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by revoked status',
    example: false,
  })
  @IsOptional()
  isRevoked?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by delegator ID',
    example: 'cm123abc456def',
  })
  @IsUUID()
  @IsOptional()
  delegatorId?: string;

  @ApiPropertyOptional({
    description: 'Filter by delegate ID',
    example: 'cm789ghi012jkl',
  })
  @IsUUID()
  @IsOptional()
  delegateId?: string;
}
