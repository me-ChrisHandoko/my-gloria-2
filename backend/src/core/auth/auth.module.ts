import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { ClerkAuthService } from './services/clerk-auth.service';
import { AuthController } from './controllers/auth.controller';
import { PrismaModule } from '../database/prisma.module';

/**
 * Global authentication module that provides Clerk-based authentication
 * This module is imported once in AppModule and provides authentication globally
 */
@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [AuthController],
  providers: [
    ClerkAuthService,
    ClerkAuthGuard,
    // Register ClerkAuthGuard as a global guard
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
  ],
  exports: [ClerkAuthService, ClerkAuthGuard],
})
export class AuthModule {}
