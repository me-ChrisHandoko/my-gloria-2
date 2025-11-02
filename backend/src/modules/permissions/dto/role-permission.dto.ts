import {
  IsString,
  IsOptional,
  IsBoolean,
  IsJSON,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignRolePermissionDto {
  @ApiProperty({
    description: 'Role ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  roleId: string;

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

  @ApiPropertyOptional({
    description: 'Reason for granting permission',
    example: 'Required for administrative tasks',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  grantReason?: string;

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

export class BulkAssignRolePermissionsDto {
  @ApiProperty({
    description: 'Role ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({
    description: 'Array of permission IDs to assign',
    example: [
      '123e4567-e89b-12d3-a456-426614174001',
      '123e4567-e89b-12d3-a456-426614174002',
    ],
    type: [String],
  })
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  permissionIds: string[];

  @ApiPropertyOptional({
    description: 'Whether permissions are granted or revoked',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isGranted?: boolean;

  @ApiPropertyOptional({
    description: 'Reason for granting permissions',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  grantReason?: string;
}

export class RolePermissionResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Role ID',
  })
  roleId: string;

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

  @ApiPropertyOptional({
    description: 'Granted by user ID',
  })
  grantedBy?: string;

  @ApiPropertyOptional({
    description: 'Grant reason',
  })
  grantReason?: string;

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
    description: 'Role details',
  })
  role?: {
    id: string;
    code: string;
    name: string;
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
