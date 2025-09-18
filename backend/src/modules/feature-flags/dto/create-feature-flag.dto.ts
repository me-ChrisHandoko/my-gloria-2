import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsArray,
  IsObject,
  IsDateString,
  IsEnum,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export enum FeatureFlagType {
  RELEASE = 'RELEASE',
  EXPERIMENT = 'EXPERIMENT',
  OPERATIONAL = 'OPERATIONAL',
  PERMISSION = 'PERMISSION',
  KILL_SWITCH = 'KILL_SWITCH',
}

export class CreateFeatureFlagDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  key: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(FeatureFlagType)
  type: FeatureFlagType;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  defaultValue?: any;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetUsers?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetRoles?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetSchools?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
