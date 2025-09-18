import { Module } from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { DatabaseOptimizationService } from './database-optimization.service';
import { PrismaModule } from '../database/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { LoggingModule } from '../logging/logging.module';

@Module({
  imports: [PrismaModule, CacheModule, LoggingModule],
  providers: [PerformanceService, DatabaseOptimizationService],
  exports: [PerformanceService, DatabaseOptimizationService],
})
export class PerformanceModule {}
