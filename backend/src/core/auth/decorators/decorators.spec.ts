/**
 * Unit tests for authentication decorators
 *
 * @module core/auth/decorators
 */

import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CurrentUser,
  CurrentUserId,
  CurrentUserEmail,
  CurrentUserRoles,
  CurrentUserPermissions,
} from './current-user.decorator';
import {
  Public,
  NoAuth,
  OptionalAuth,
  PublicWithRateLimit,
  IS_PUBLIC_KEY,
} from './public.decorator';
import {
  ApiKeyAuth,
  ApiKey,
  ApiKeyScopes,
  ApiKeyOwner,
  API_KEY_AUTH_KEY,
} from './api-key.decorator';
import {
  RateLimit,
  StrictRateLimit,
  ModerateRateLimit,
  LenientRateLimit,
  BurstRateLimit,
  RATE_LIMIT_KEY,
} from './rate-limit.decorator';
import {
  AuditLog,
  CriticalAudit,
  SecurityAudit,
  ComplianceAudit,
  DataModificationAudit,
  AUDIT_LOG_KEY,
  AuditSeverity,
  AuditCategory,
} from './audit-log.decorator';
import {
  Cache,
  NoCache,
  ShortCache,
  MediumCache,
  LongCache,
  CDNCache,
  InvalidateCache,
  CACHE_KEY,
} from './cache.decorator';
import {
  AuthenticatedUser,
  UserRole,
  UserPermission,
} from '../types/auth.types';

describe('Authentication Decorators', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('CurrentUser Decorator', () => {
    // Note: These decorators are param decorators that extract data at runtime
    // We can't directly test the extraction logic here, but we can verify
    // that the decorators are properly defined and can be used

    it('should create CurrentUser decorator', () => {
      expect(CurrentUser).toBeDefined();
      expect(typeof CurrentUser).toBe('function');
    });

    it('should create CurrentUserId decorator', () => {
      expect(CurrentUserId).toBeDefined();
      expect(typeof CurrentUserId).toBe('function');
    });

    it('should create CurrentUserEmail decorator', () => {
      expect(CurrentUserEmail).toBeDefined();
      expect(typeof CurrentUserEmail).toBe('function');
    });

    it('should create CurrentUserRoles decorator', () => {
      expect(CurrentUserRoles).toBeDefined();
      expect(typeof CurrentUserRoles).toBe('function');
    });

    it('should create CurrentUserPermissions decorator', () => {
      expect(CurrentUserPermissions).toBeDefined();
      expect(typeof CurrentUserPermissions).toBe('function');
    });
  });

  describe('Public Decorator', () => {
    it('should set public metadata', () => {
      class TestClass {
        @Public()
        testMethod() {}
      }
      const metadata = reflector.get(
        IS_PUBLIC_KEY,
        TestClass.prototype.testMethod,
      );
      expect(metadata).toEqual({ isPublic: true });
    });

    it('should set public metadata with options', () => {
      class TestClass {
        @Public({
          loadUserIfAuthenticated: true,
          rateLimit: { limit: 10, windowMs: 60000 },
        })
        testMethod() {}
      }
      const metadata = reflector.get(
        IS_PUBLIC_KEY,
        TestClass.prototype.testMethod,
      );
      expect(metadata).toEqual({
        isPublic: true,
        loadUserIfAuthenticated: true,
        rateLimit: { limit: 10, windowMs: 60000 },
      });
    });

    it('should create NoAuth decorator', () => {
      class TestClass {
        @NoAuth()
        testMethod() {}
      }
      const metadata = reflector.get(
        IS_PUBLIC_KEY,
        TestClass.prototype.testMethod,
      );
      expect(metadata).toEqual({
        isPublic: true,
        allowAnonymous: true,
      });
    });

    it('should create OptionalAuth decorator', () => {
      class TestClass {
        @OptionalAuth()
        testMethod() {}
      }
      const metadata = reflector.get(
        IS_PUBLIC_KEY,
        TestClass.prototype.testMethod,
      );
      expect(metadata).toEqual({
        isPublic: true,
        loadUserIfAuthenticated: true,
        allowAnonymous: true,
      });
    });

    it('should create PublicWithRateLimit decorator', () => {
      class TestClass {
        @PublicWithRateLimit(5, 60000)
        testMethod() {}
      }
      const metadata = reflector.get(
        IS_PUBLIC_KEY,
        TestClass.prototype.testMethod,
      );
      expect(metadata).toEqual({
        isPublic: true,
        rateLimit: { limit: 5, windowMs: 60000 },
        logAccess: true,
      });
    });
  });

  describe('ApiKeyAuth Decorator', () => {
    it('should set API key metadata', () => {
      class TestClass {
        @ApiKeyAuth()
        testMethod() {}
      }
      const metadata = reflector.get(
        API_KEY_AUTH_KEY,
        TestClass.prototype.testMethod,
      );
      expect(metadata).toEqual({
        required: true,
        headerName: 'X-API-Key',
      });
    });

    it('should set API key metadata with options', () => {
      class TestClass {
        @ApiKeyAuth({
          scopes: ['read', 'write'],
          serviceAccountOnly: true,
          headerName: 'Authorization',
        })
        testMethod() {}
      }
      const metadata = reflector.get(
        API_KEY_AUTH_KEY,
        TestClass.prototype.testMethod,
      );
      expect(metadata).toEqual({
        required: true,
        headerName: 'Authorization',
        scopes: ['read', 'write'],
        serviceAccountOnly: true,
      });
    });
  });

  describe('RateLimit Decorator', () => {
    it('should set rate limit metadata', () => {
      class TestClass {
        @RateLimit({ limit: 10, windowMs: 60000 })
        testMethod() {}
      }
      const metadata = reflector.get(
        RATE_LIMIT_KEY,
        TestClass.prototype.testMethod,
      );
      expect(metadata).toEqual({
        limit: 10,
        windowMs: 60000,
        statusCode: 429,
        headers: true,
      });
    });

    it('should create StrictRateLimit decorator', () => {
      class TestClass {
        @StrictRateLimit()
        testMethod() {}
      }
      const metadata = reflector.get(
        RATE_LIMIT_KEY,
        TestClass.prototype.testMethod,
      );
      expect(metadata).toEqual({
        limit: 1,
        windowMs: 60000,
        message: 'This operation can only be performed once per minute',
        name: 'strict',
        statusCode: 429,
        headers: true,
      });
    });

    it('should create ModerateRateLimit decorator', () => {
      class TestClass {
        @ModerateRateLimit()
        testMethod() {}
      }
      const metadata = reflector.get(
        RATE_LIMIT_KEY,
        TestClass.prototype.testMethod,
      );
      expect(metadata).toEqual({
        limit: 10,
        windowMs: 60000,
        message: 'Please slow down your requests',
        name: 'moderate',
        statusCode: 429,
        headers: true,
      });
    });

    it('should create LenientRateLimit decorator', () => {
      class TestClass {
        @LenientRateLimit()
        testMethod() {}
      }
      const metadata = reflector.get(
        RATE_LIMIT_KEY,
        TestClass.prototype.testMethod,
      );
      expect(metadata).toEqual({
        limit: 100,
        windowMs: 60000,
        name: 'lenient',
        statusCode: 429,
        headers: true,
      });
    });

    it('should create BurstRateLimit decorator', () => {
      class TestClass {
        @BurstRateLimit(5, 10000)
        testMethod() {}
      }
      const metadata = reflector.get(
        RATE_LIMIT_KEY,
        TestClass.prototype.testMethod,
      );
      expect(metadata).toEqual({
        limit: 5,
        windowMs: 10000,
        message: 'Maximum 5 requests per 10 seconds',
        name: 'burst',
        statusCode: 429,
        headers: true,
      });
    });
  });

  describe('AuditLog Decorator', () => {
    it('should set audit log metadata', () => {
      class TestClass {
        @AuditLog({ action: 'user.create' })
        testMethod() {}
      }
      const metadata = reflector.get(
        AUDIT_LOG_KEY,
        TestClass.prototype.testMethod,
      );
      expect(metadata).toMatchObject({
        enabled: true,
        action: 'user.create',
        severity: AuditSeverity.MEDIUM,
        category: AuditCategory.DATA_ACCESS,
        maskSensitive: true,
      });
    });

    it('should create CriticalAudit decorator', () => {
      class TestClass {
        @CriticalAudit('system.shutdown')
        testMethod() {}
      }
      const metadata = reflector.get(
        AUDIT_LOG_KEY,
        TestClass.prototype.testMethod,
      );
      expect(metadata).toMatchObject({
        enabled: true,
        action: 'system.shutdown',
        severity: AuditSeverity.CRITICAL,
        alert: true,
        includeBody: true,
        includeResponse: true,
      });
    });

    it('should create SecurityAudit decorator', () => {
      class TestClass {
        @SecurityAudit('auth.failed')
        testMethod() {}
      }
      const metadata = reflector.get(
        AUDIT_LOG_KEY,
        TestClass.prototype.testMethod,
      );
      expect(metadata).toMatchObject({
        enabled: true,
        action: 'auth.failed',
        category: AuditCategory.SECURITY,
        severity: AuditSeverity.HIGH,
        alert: true,
      });
    });

    it('should create ComplianceAudit decorator', () => {
      class TestClass {
        @ComplianceAudit('data.deletion', ['GDPR', 'CCPA'])
        testMethod() {}
      }
      const metadata = reflector.get(
        AUDIT_LOG_KEY,
        TestClass.prototype.testMethod,
      );
      expect(metadata).toMatchObject({
        enabled: true,
        action: 'data.deletion',
        category: AuditCategory.COMPLIANCE,
        severity: AuditSeverity.HIGH,
        compliance: ['GDPR', 'CCPA'],
        includeBody: true,
        includeResponse: true,
      });
    });

    it('should create DataModificationAudit decorator', () => {
      class TestClass {
        @DataModificationAudit('user.update', 'user')
        testMethod() {}
      }
      const metadata = reflector.get(
        AUDIT_LOG_KEY,
        TestClass.prototype.testMethod,
      );
      expect(metadata).toMatchObject({
        enabled: true,
        action: 'user.update',
        resource: 'user',
        category: AuditCategory.DATA_MODIFICATION,
        severity: AuditSeverity.MEDIUM,
        includeBody: true,
        includeResponse: true,
      });
    });
  });

  describe('Cache Decorator', () => {
    it('should set cache metadata with defaults', () => {
      class TestClass {
        @Cache()
        testMethod() {}
      }
      const metadata = reflector.get(CACHE_KEY, TestClass.prototype.testMethod);
      expect(metadata).toMatchObject({
        enabled: true,
        ttl: 60,
        store: 'memory',
        invalidation: 'ttl',
        compress: false,
      });
    });

    it('should set cache metadata with options', () => {
      class TestClass {
        @Cache({
          ttl: 300,
          perUser: true,
          tags: ['products'],
        })
        testMethod() {}
      }
      const metadata = reflector.get(CACHE_KEY, TestClass.prototype.testMethod);
      expect(metadata).toMatchObject({
        enabled: true,
        ttl: 300,
        perUser: true,
        tags: ['products'],
      });
    });

    it('should create NoCache decorator', () => {
      class TestClass {
        @NoCache()
        testMethod() {}
      }
      const metadata = reflector.get(CACHE_KEY, TestClass.prototype.testMethod);
      expect(metadata).toEqual({ enabled: false });
    });

    it('should create ShortCache decorator', () => {
      class TestClass {
        @ShortCache()
        testMethod() {}
      }
      const metadata = reflector.get(CACHE_KEY, TestClass.prototype.testMethod);
      expect(metadata).toMatchObject({
        enabled: true,
        ttl: 60,
      });
    });

    it('should create MediumCache decorator', () => {
      class TestClass {
        @MediumCache()
        testMethod() {}
      }
      const metadata = reflector.get(CACHE_KEY, TestClass.prototype.testMethod);
      expect(metadata).toMatchObject({
        enabled: true,
        ttl: 300,
      });
    });

    it('should create LongCache decorator', () => {
      class TestClass {
        @LongCache()
        testMethod() {}
      }
      const metadata = reflector.get(CACHE_KEY, TestClass.prototype.testMethod);
      expect(metadata).toMatchObject({
        enabled: true,
        ttl: 3600,
      });
    });

    it('should create CDNCache decorator', () => {
      class TestClass {
        @CDNCache(86400)
        testMethod() {}
      }
      const metadata = reflector.get(CACHE_KEY, TestClass.prototype.testMethod);
      expect(metadata).toMatchObject({
        enabled: true,
        ttl: 86400,
        store: 'memory',
        perUser: false,
        compress: true,
      });
    });

    it('should create InvalidateCache decorator', () => {
      class TestClass {
        @InvalidateCache(['products', 'inventory'])
        testMethod() {}
      }
      const metadata = reflector.get(
        'invalidateCache',
        TestClass.prototype.testMethod,
      );
      expect(metadata).toEqual({
        tags: ['products', 'inventory'],
      });
    });
  });
});
