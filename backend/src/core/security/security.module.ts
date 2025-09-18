import { Module, Global } from '@nestjs/common';
import { RateLimitConfigService } from './rate-limit.config';
import { SecurityService } from './security.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { ThrottlerModule } from '@nestjs/throttler';

@Global()
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
  ],
  providers: [RateLimitConfigService, SecurityService, ApiKeyGuard],
  exports: [RateLimitConfigService, SecurityService, ApiKeyGuard],
})
export class SecurityModule {}
