import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { ClerkAuthService } from './services/clerk-auth.service';
import { AuthController } from './controllers/auth.controller';
import { PrismaModule } from '../database/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { LoggingModule } from '../logging/logging.module';

/**
 * Global authentication and authorization module
 * Provides Clerk-based authentication and RBAC authorization globally
 *
 * Guard Execution Order:
 * 1. ClerkAuthGuard - Validates authentication token and loads user profile
 * 2. PermissionsGuard - Checks RBAC permissions based on decorators
 */
@Global()
@Module({
  imports: [ConfigModule, PrismaModule, CacheModule, LoggingModule],
  controllers: [AuthController],
  providers: [
    ClerkAuthService,
    ClerkAuthGuard,
    PermissionsGuard,
    // Register ClerkAuthGuard as global guard (runs first)
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
    // // Register PermissionsGuard as global guard (runs after authentication) Untuk mengaktifkan RBAC
    // {
    //   provide: APP_GUARD,
    //   useClass: PermissionsGuard,
    // },
  ],
  exports: [ClerkAuthService, ClerkAuthGuard, PermissionsGuard],
})
export class AuthModule {}
