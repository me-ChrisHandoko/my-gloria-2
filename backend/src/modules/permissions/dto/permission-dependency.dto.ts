import {
  IsString,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePermissionDependencyDto {
  @ApiProperty({
    description: 'Permission ID that has the dependency',
    example: 'cm123abc456def',
  })
  @IsUUID()
  @IsNotEmpty()
  permissionId: string;

  @ApiProperty({
    description: 'Required permission ID that must be granted first',
    example: 'cm456def789ghi',
  })
  @IsUUID()
  @IsNotEmpty()
  requiredPermissionId: string;

  @ApiPropertyOptional({
    description: 'Explanation of why this dependency exists',
    example: 'APPROVE permission requires READ permission to view data first',
  })
  @MaxLength(500)
  @IsOptional()
  description?: string;
}

export class UpdatePermissionDependencyDto {
  @ApiPropertyOptional({
    description: 'Updated description',
  })
  @MaxLength(500)
  @IsOptional()
  description?: string;
}

export class CheckPermissionDependenciesDto {
  @ApiProperty({
    description: 'User profile ID to check',
    example: 'cm123abc456def',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Permission ID to check dependencies for',
    example: 'cm456def789ghi',
  })
  @IsUUID()
  @IsNotEmpty()
  permissionId: string;

  @ApiPropertyOptional({
    description: 'Resource type for resource-specific checks',
    example: 'document',
  })
  @IsString()
  @IsOptional()
  resourceType?: string;

  @ApiPropertyOptional({
    description: 'Resource ID for resource-specific checks',
    example: 'doc_12345',
  })
  @IsString()
  @IsOptional()
  resourceId?: string;
}
