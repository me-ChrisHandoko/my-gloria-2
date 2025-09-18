import { Module } from '@nestjs/common';
import { SSEController } from './sse.controller';
import { SSEService } from './sse.service';
import { ClerkAuthGuard } from '../../core/auth/guards/clerk-auth.guard';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [SSEController],
  providers: [SSEService, ClerkAuthGuard],
  exports: [SSEService],
})
export class SSEModule {}
