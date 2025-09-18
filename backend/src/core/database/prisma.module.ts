import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from './prisma.service';
import { DatabaseConfigService } from './database.config';
import { DatabaseMetricsService } from './database.metrics';
import { CircuitBreakerService } from './circuit-breaker.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
  ],
  providers: [
    DatabaseConfigService,
    DatabaseMetricsService,
    {
      provide: CircuitBreakerService,
      useFactory: (
        configService: DatabaseConfigService,
        eventEmitter: EventEmitter2,
      ) => {
        const config = configService.databaseConfig;
        return new CircuitBreakerService(eventEmitter, {
          failureThreshold: config.circuitBreakerThreshold,
          resetTimeout: config.circuitBreakerTimeout,
        });
      },
      inject: [DatabaseConfigService, EventEmitter2],
    },
    PrismaService,
  ],
  exports: [PrismaService, DatabaseMetricsService, DatabaseConfigService],
})
export class PrismaModule {}
