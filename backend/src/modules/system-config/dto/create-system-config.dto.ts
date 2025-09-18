import {
  IsString,
  IsBoolean,
  IsOptional,
  IsObject,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';

export enum ConfigType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
  ARRAY = 'array',
  DATE = 'date',
  URL = 'url',
  EMAIL = 'email',
}

export enum ConfigCategory {
  GENERAL = 'general',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  EMAIL = 'email',
  NOTIFICATION = 'notification',
  INTEGRATION = 'integration',
  FEATURE = 'feature',
  SYSTEM = 'system',
  UI = 'ui',
  WORKFLOW = 'workflow',
}

export class CreateSystemConfigDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  key: string;

  value: any;

  @IsEnum(ConfigType)
  type: ConfigType;

  @IsEnum(ConfigCategory)
  category: ConfigCategory;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isEncrypted?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsObject()
  validationRules?: Record<string, any>;
}
