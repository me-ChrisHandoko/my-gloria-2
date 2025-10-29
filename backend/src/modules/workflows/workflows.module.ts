import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/database/prisma.module';
import { LoggingModule } from '@/core/logging/logging.module';
import { CacheModule } from '@/core/cache/cache.module';
import { PermissionModule } from '@/modules/permissions/permission.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { WorkflowsController } from './controllers/workflows.controller';
import { WorkflowInstancesController } from './controllers/workflow-instances.controller';
import { WorkflowTemplatesController } from './controllers/workflow-templates.controller';
import { WorkflowsService } from './services/workflows.service';
import { WorkflowInstancesService } from './services/workflow-instances.service';
import { WorkflowExecutionService } from './services/workflow-execution.service';
import { WorkflowTemplatesService } from './services/workflow-templates.service';
import { WorkflowValidationService } from './services/workflow-validation.service';
import { WorkflowDelegationService } from './services/workflow-delegation.service';
import { WorkflowNotificationService } from './services/workflow-notification.service';
import { WorkflowSchedulerService } from './services/workflow-scheduler.service';

@Module({
  imports: [
    PrismaModule,
    LoggingModule,
    CacheModule,
    PermissionModule,
    NotificationsModule,
  ],
  controllers: [
    WorkflowsController,
    WorkflowInstancesController,
    WorkflowTemplatesController,
  ],
  providers: [
    WorkflowsService,
    WorkflowInstancesService,
    WorkflowExecutionService,
    WorkflowTemplatesService,
    WorkflowValidationService,
    WorkflowDelegationService,
    WorkflowNotificationService,
    WorkflowSchedulerService,
  ],
  exports: [
    WorkflowsService,
    WorkflowInstancesService,
    WorkflowExecutionService,
    WorkflowTemplatesService,
  ],
})
export class WorkflowsModule {}
