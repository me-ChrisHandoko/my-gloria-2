import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionAction, PermissionScope } from '@prisma/client';

export class CheckPermissionDto {
  @ApiProperty({
    description: 'User profile ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  userProfileId: string;

  @ApiProperty({
    description: 'Resource to check permission for',
    example: 'users',
  })
  @IsString()
  @IsNotEmpty()
  resource: string;

  @ApiProperty({
    description: 'Action to check permission for',
    enum: PermissionAction,
    example: PermissionAction.CREATE,
  })
  @IsEnum(PermissionAction)
  action: PermissionAction;

  @ApiPropertyOptional({
    description: 'Scope to check permission for',
    enum: PermissionScope,
  })
  @IsOptional()
  @IsEnum(PermissionScope)
  scope?: PermissionScope;

  @ApiPropertyOptional({
    description: 'Resource ID for resource-specific checks',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({
    description: 'Resource type for resource-specific checks',
    example: 'school',
  })
  @IsOptional()
  @IsString()
  resourceType?: string;
}

export class CheckPermissionResponseDto {
  @ApiProperty({
    description: 'Whether user has the permission',
    example: true,
  })
  hasPermission: boolean;

  @ApiProperty({
    description: 'Sources that granted the permission',
    example: ['role:admin', 'direct:user_permission'],
    type: [String],
  })
  sources: string[];

  @ApiPropertyOptional({
    description: 'Effective scope of the permission',
    enum: PermissionScope,
  })
  effectiveScope?: PermissionScope;

  @ApiPropertyOptional({
    description: 'Reason for denial if permission not granted',
    example: 'No matching permission found',
  })
  reason?: string;

  @ApiProperty({
    description: 'Timestamp of the check',
  })
  checkedAt: Date;
}

export class BulkCheckPermissionsDto {
  @ApiProperty({
    description: 'User profile ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  userProfileId: string;

  @ApiProperty({
    description: 'Array of permissions to check',
    type: [CheckPermissionDto],
    example: [
      {
        resource: 'users',
        action: 'CREATE',
        scope: 'DEPARTMENT',
      },
      {
        resource: 'schools',
        action: 'READ',
        scope: 'ALL',
      },
    ],
  })
  permissions: Array<{
    resource: string;
    action: PermissionAction;
    scope?: PermissionScope;
    resourceId?: string;
    resourceType?: string;
  }>;
}

export class BulkCheckPermissionsResponseDto {
  @ApiProperty({
    description: 'Map of permission checks to results',
    example: {
      'users:CREATE': { hasPermission: true, sources: ['role:admin'] },
      'schools:READ': { hasPermission: false, reason: 'Insufficient scope' },
    },
  })
  results: Record<string, CheckPermissionResponseDto>;

  @ApiProperty({
    description: 'Overall check timestamp',
  })
  checkedAt: Date;
}
