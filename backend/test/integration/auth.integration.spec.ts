/**
 * Integration tests for Authentication endpoints
 * Tests the complete authentication flow
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/core/database/prisma.service';
import { ClerkAuthService } from '@/core/auth/services/clerk-auth.service';
import { CacheService } from '@/core/cache/cache.service';
import {
  mockUser,
  cleanDatabase,
  TestDataFactory,
  createTestPrismaClient,
} from '../setup';

describe('Authentication Integration Tests', () => {
  let app: NestFastifyApplication;
  let prismaService: PrismaService;
  let clerkAuthService: ClerkAuthService;
  let cacheService: CacheService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(createTestPrismaClient())
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Initialize app with same configuration as main.ts
    app.setGlobalPrefix('api/v1');
    app.enableCors();

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prismaService = app.get<PrismaService>(PrismaService);
    clerkAuthService = app.get<ClerkAuthService>(ClerkAuthService);
    cacheService = app.get<CacheService>(CacheService);
  });

  afterAll(async () => {
    await cleanDatabase(prismaService);
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prismaService);
    await cacheService.delPattern('*');
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should authenticate user with valid token', async () => {
      // Mock Clerk token validation
      const mockToken = 'valid_jwt_token';
      const mockClerkUser = {
        id: 'clerk_user_id',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        firstName: 'Test',
        lastName: 'User',
      };

      jest
        .spyOn(clerkAuthService, 'validateToken' as any)
        .mockResolvedValue(mockClerkUser);
      jest
        .spyOn(clerkAuthService, 'getUserById' as any)
        .mockResolvedValue(mockClerkUser);

      // Create user in database
      const user = await prismaService.userProfile.create({
        data: {
          id: 'user-1',
          clerkUserId: mockClerkUser.id,
          nip: '123456',
          updatedAt: new Date(),
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('user');
      expect(body).toHaveProperty('permissions');
      expect(body.user.clerkUserId).toBe(mockClerkUser.id);
    });

    it('should create new user on first login', async () => {
      const mockToken = 'valid_jwt_token';
      const mockClerkUser = {
        id: 'new_clerk_user',
        emailAddresses: [{ emailAddress: 'new@example.com' }],
        firstName: 'New',
        lastName: 'User',
        publicMetadata: { nip: '654321' },
      };

      jest
        .spyOn(clerkAuthService, 'validateToken' as any)
        .mockResolvedValue(mockClerkUser);
      jest
        .spyOn(clerkAuthService, 'getUserById' as any)
        .mockResolvedValue(mockClerkUser);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user.clerkUserId).toBe(mockClerkUser.id);

      // Verify user was created in database
      const createdUser = await prismaService.userProfile.findFirst({
        where: { clerkUserId: mockClerkUser.id },
      });
      expect(createdUser).toBeDefined();
      expect(createdUser).toBeDefined();
    });

    it('should return 401 for invalid token', async () => {
      jest
        .spyOn(clerkAuthService, 'validateToken' as any)
        .mockRejectedValue(new Error('Invalid token'));

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        headers: {
          Authorization: 'Bearer invalid_token',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 without authorization header', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout user successfully', async () => {
      const mockToken = 'valid_jwt_token';
      const mockClerkUser = {
        id: 'clerk_user_id',
        sessionId: 'session_id',
      };

      jest
        .spyOn(clerkAuthService, 'validateToken' as any)
        .mockResolvedValue(mockClerkUser);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Logged out successfully');
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user profile', async () => {
      const mockToken = 'valid_jwt_token';
      const mockClerkUser = {
        id: 'clerk_user_id',
      };

      jest
        .spyOn(clerkAuthService, 'validateToken' as any)
        .mockResolvedValue(mockClerkUser);

      // Create user with roles and permissions
      const user = await prismaService.userProfile.create({
        data: {
          id: 'user-2',
          clerkUserId: mockClerkUser.id,
          nip: '123456',
          updatedAt: new Date(),
        },
      });

      const role = await prismaService.role.create({
        data: {
          id: 'role-1',
          code: 'TEST_ROLE',
          name: 'Test Role',
          hierarchyLevel: 1,
          updatedAt: new Date(),
        },
      });

      await prismaService.userRole.create({
        data: {
          id: 'user-role-1',
          userProfileId: user.id,
          roleId: role.id,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.clerkUserId).toBe(mockClerkUser.id);
      expect(body.roles).toHaveLength(1);
      expect(body.roles[0].role.code).toBe('TEST_ROLE');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /auth/validate', () => {
    it('should validate token and return validation result', async () => {
      const mockToken = 'valid_jwt_token';
      const mockClerkUser = {
        id: 'clerk_user_id',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
      };

      jest
        .spyOn(clerkAuthService, 'validateToken' as any)
        .mockResolvedValue(mockClerkUser);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/validate',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.valid).toBe(true);
      expect(body.userId).toBe('clerk_user_id');
    });

    it('should return invalid for expired token', async () => {
      jest
        .spyOn(clerkAuthService, 'validateToken' as any)
        .mockRejectedValue(new Error('Token expired'));

      const response = await app.inject({
        method: 'POST',
        url: '/auth/validate',
        headers: {
          Authorization: 'Bearer expired_token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.valid).toBe(false);
    });
  });

  describe('POST /auth/refresh-permissions', () => {
    it('should refresh user permissions cache', async () => {
      const mockToken = 'valid_jwt_token';
      const mockClerkUser = {
        id: 'clerk_user_id',
      };

      jest
        .spyOn(clerkAuthService, 'validateToken' as any)
        .mockResolvedValue(mockClerkUser);

      const user = await prismaService.userProfile.create({
        data: {
          id: 'user-3',
          clerkUserId: mockClerkUser.id,
          nip: '123456',
          updatedAt: new Date(),
        },
      });

      // Add some permissions to cache
      await cacheService.set(`user-permissions:${user.id}:TEST`, true, 3600);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh-permissions',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Permissions refreshed successfully');

      // Verify cache was cleared
      const cachedValue = await cacheService.get(
        `user-permissions:${user.id}:TEST`,
      );
      expect(cachedValue).toBeNull();
    });
  });

  describe('Authentication Flow', () => {
    it('should complete full authentication flow', async () => {
      const mockToken = 'valid_jwt_token';
      const mockClerkUser = {
        id: 'clerk_user_id',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        firstName: 'Test',
        lastName: 'User',
      };

      jest
        .spyOn(clerkAuthService, 'validateToken' as any)
        .mockResolvedValue(mockClerkUser);
      jest
        .spyOn(clerkAuthService, 'getUserById' as any)
        .mockResolvedValue(mockClerkUser);

      // 1. Login
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/auth/login',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      });
      expect(loginResponse.statusCode).toBe(200);

      // 2. Get current user
      const meResponse = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      });
      expect(meResponse.statusCode).toBe(200);

      // 3. Validate token
      const validateResponse = await app.inject({
        method: 'POST',
        url: '/auth/validate',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      });
      expect(validateResponse.statusCode).toBe(200);

      // 4. Refresh permissions
      const refreshResponse = await app.inject({
        method: 'POST',
        url: '/auth/refresh-permissions',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      });
      expect(refreshResponse.statusCode).toBe(200);

      // 5. Logout
      const logoutResponse = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      });
      expect(logoutResponse.statusCode).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit authentication endpoints', async () => {
      jest
        .spyOn(clerkAuthService, 'validateToken' as any)
        .mockRejectedValue(new Error('Invalid token'));

      // Make multiple failed login attempts
      const promises = Array.from({ length: 10 }, () =>
        app.inject({
          method: 'POST',
          url: '/auth/login',
          headers: {
            Authorization: 'Bearer invalid_token',
          },
        }),
      );

      const responses = await Promise.all(promises);

      // Some requests should be rate limited
      const rateLimited = responses.filter((r) => r.statusCode === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
      });

      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });
});
