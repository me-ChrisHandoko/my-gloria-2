import { Module, Global, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule, WinstonModuleOptions } from 'nest-winston';
import { LoggingService } from './logging.service';
import { WinstonConfig } from './winston.config';

@Global()
@Module({})
export class LoggingModule {
  static forRoot(): DynamicModule {
    return {
      module: LoggingModule,
      imports: [
        ConfigModule,
        WinstonModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService): WinstonModuleOptions => {
            return WinstonConfig.createLoggerOptions(configService);
          },
        }),
      ],
      providers: [LoggingService],
      exports: [LoggingService, WinstonModule],
    };
  }
}
