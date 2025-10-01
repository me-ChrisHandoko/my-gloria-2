import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: 'uuid-v7-string',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Clerk User ID',
    example: 'user_2abc123def456',
  })
  @Expose()
  clerkUserId: string;

  @ApiProperty({
    description: 'Employee ID (NIP)',
    example: '123456789012345',
  })
  @Expose()
  nip: string;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com',
  })
  @Expose()
  email: string;

  @ApiProperty({
    description: 'Superadmin status',
    example: false,
  })
  @Expose()
  isSuperadmin: boolean;

  @ApiProperty({
    description: 'Account active status',
    example: true,
  })
  @Expose()
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Last active timestamp',
    example: '2024-01-01T00:00:00Z',
  })
  @Expose()
  lastActive?: Date;

  @ApiPropertyOptional({
    description: 'User preferences',
    example: { theme: 'dark', language: 'en' },
  })
  @Expose()
  preferences?: any;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00Z',
  })
  @Expose()
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Employee data from master database',
  })
  @Expose()
  @Type(() => Object)
  dataKaryawan?: any;

  @ApiPropertyOptional({
    description: 'User roles',
    type: 'array',
    items: { type: 'object' },
  })
  @Expose()
  @Type(() => Array)
  roles?: any[];

  @ApiPropertyOptional({
    description: 'User positions',
    type: 'array',
    items: { type: 'object' },
  })
  @Expose()
  @Type(() => Array)
  positions?: any[];

  @Exclude()
  createdBy?: string;
}

export class PaginatedUserResponseDto {
  @ApiProperty({
    description: 'List of users',
    type: [UserResponseDto],
  })
  @Expose()
  @Type(() => UserResponseDto)
  data: UserResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5,
    },
  })
  @Expose()
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
