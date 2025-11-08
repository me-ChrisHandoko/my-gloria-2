import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@/core/database/prisma.module';
import { LoggingModule } from '@/core/logging/logging.module';
import { CacheModule } from '@/core/cache/cache.module';
import { EmailModule } from '@/core/email/email.module';
// import { NotificationsService } from './services/notifications.service';
import { NotificationChannelsService } from './services/notification-channels.service';
// import { NotificationPreferenceService } from './services/preference-simplified.service';
import { NotificationQueueService } from './services/notification-queue.service';
// import { NotificationDeliveryService } from './services/notification-delivery.service';
// import { NotificationTrackingService } from './services/notification-tracking.service';
import { InAppChannelService } from './services/channels/in-app-channel.service';
import { PushChannelService } from './services/channels/push-channel.service';
import { SmsChannelService } from './services/channels/sms-channel.service';

@Module({
  imports: [
    PrismaModule,
    LoggingModule,
    CacheModule,
    EmailModule,
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [],
  providers: [
    // NotificationsService,
    NotificationChannelsService,
    // NotificationPreferenceService,
    NotificationQueueService,
    // NotificationDeliveryService,
    // NotificationTrackingService,
    InAppChannelService,
    PushChannelService,
    SmsChannelService,
  ],
  exports: [
    // NotificationsService,
    NotificationChannelsService,
  ],
})
export class NotificationsModule {}
