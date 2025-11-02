import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignUserRoleDto {
  @ApiProperty({
    description: 'User profile ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  userProfileId: string;

  @ApiProperty({
    description: 'Role ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  @IsNotEmpty()
  roleId: string;

  @ApiPropertyOptional({
    description: 'Whether role is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

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

export class BulkAssignUserRolesDto {
  @ApiProperty({
    description: 'User profile ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  userProfileId: string;

  @ApiProperty({
    description: 'Array of role IDs to assign',
    example: [
      '123e4567-e89b-12d3-a456-426614174001',
      '123e4567-e89b-12d3-a456-426614174002',
    ],
    type: [String],
  })
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  roleIds: string[];

  @ApiPropertyOptional({
    description: 'Whether roles are active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UserRoleResponseDto {
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
    description: 'Role ID',
  })
  roleId: string;

  @ApiProperty({
    description: 'Assignment date',
  })
  assignedAt: Date;

  @ApiPropertyOptional({
    description: 'Assigned by user ID',
  })
  assignedBy?: string;

  @ApiProperty({
    description: 'Is active',
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Effective from date',
  })
  effectiveFrom: Date;

  @ApiPropertyOptional({
    description: 'Effective until date',
  })
  effectiveUntil?: Date;

  @ApiPropertyOptional({
    description: 'User profile details',
  })
  userProfile?: {
    id: string;
    nip: string;
  };

  @ApiPropertyOptional({
    description: 'Role details',
  })
  role?: {
    id: string;
    code: string;
    name: string;
    hierarchyLevel: number;
  };
}
