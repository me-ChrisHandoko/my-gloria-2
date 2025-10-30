/**
 * Approvals Module
 * Example module demonstrating Temporal workflow integration
 */

import { Module } from '@nestjs/common';
import { ApprovalsController } from './approvals.controller';
import { TemporalModule } from '../../temporal/temporal.module';

@Module({
  imports: [TemporalModule],
  controllers: [ApprovalsController],
})
export class ApprovalsModule {}
