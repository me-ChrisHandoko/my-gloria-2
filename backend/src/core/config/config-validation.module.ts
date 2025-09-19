import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConfigValidationService } from './config-validation.service';
import { ConfigValidationController } from './config-validation.controller';

/**
 * Configuration Validation Module
 * Provides configuration validation and management capabilities
 */
@Module({
  imports: [ConfigModule],
  providers: [ConfigValidationService],
  controllers: [ConfigValidationController],
  exports: [ConfigValidationService],
})
export class ConfigValidationModule implements OnModuleInit {
  constructor(
    private readonly configValidationService: ConfigValidationService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validates configuration on module initialization
   */
  onModuleInit() {
    // Only validate in non-test environments
    const nodeEnv = this.configService.get('NODE_ENV');
    if (nodeEnv !== 'test') {
      this.configValidationService.validateConfig();
    }
  }
}
