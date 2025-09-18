import { PartialType } from '@nestjs/mapped-types';
import { CreateSystemConfigDto } from './create-system-config.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateSystemConfigDto extends PartialType(CreateSystemConfigDto) {
  @IsOptional()
  @IsString()
  reason?: string;
}
