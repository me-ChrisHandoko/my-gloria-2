import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsBoolean,
  IsJSON,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Clerk User ID from authentication service',
    example: 'user_2abc123def456',
  })
  @IsString()
  @MinLength(1)
  clerkUserId: string;

  @ApiProperty({
    description: 'Employee ID (NIP)',
    example: '123456789012345',
    maxLength: 15,
  })
  @IsString()
  @MaxLength(15)
  @Matches(/^[0-9]+$/, {
    message: 'NIP must contain only numbers',
  })
  nip: string;

  @ApiPropertyOptional({
    description: 'Email address of the user',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'First name of the user',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name of the user',
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Whether the user account is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'User preferences in JSON format',
    example: { theme: 'dark', language: 'en' },
  })
  @IsOptional()
  @IsJSON()
  preferences?: string;
}
