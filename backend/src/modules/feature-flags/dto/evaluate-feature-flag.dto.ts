import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';

export class EvaluateFeatureFlagDto {
  @IsString()
  flagKey: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userRoles?: string[];

  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}
