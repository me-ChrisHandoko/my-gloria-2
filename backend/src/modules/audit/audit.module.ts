import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '@/core/database/prisma.module';
import { CacheModule } from '@/core/cache/cache.module';
import { LoggingModule } from '@/core/logging/logging.module';

// Services
import { AuditLogService } from './services/audit-log.service';
import { AuditReportingService } from './services/audit-reporting.service';
import { AuditComplianceService } from './services/audit-compliance.service';
import { AuditRetentionService } from './services/audit-retention.service';

// Controllers
import { AuditController } from './controllers/audit.controller';

// Interceptors
import { AuditInterceptor } from './interceptors/audit.interceptor';

@Global()
@Module({
  imports: [PrismaModule, CacheModule, LoggingModule],
  controllers: [AuditController],
  providers: [
    AuditLogService,
    AuditReportingService,
    AuditComplianceService,
    AuditRetentionService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [
    AuditLogService,
    AuditReportingService,
    AuditComplianceService,
    AuditRetentionService,
  ],
})
export class AuditModule {}
