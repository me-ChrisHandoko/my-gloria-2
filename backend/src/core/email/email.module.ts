import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailConfigService } from './email.config';
import { LoggingModule } from '../logging/logging.module';

@Global()
@Module({
  imports: [ConfigModule, LoggingModule.forRoot()],
  providers: [EmailService, EmailConfigService],
  exports: [EmailService],
})
export class EmailModule {}
