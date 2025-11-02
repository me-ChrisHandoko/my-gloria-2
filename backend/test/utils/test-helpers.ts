import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

/**
 * Testing utilities and helper functions
 */

/**
 * Create a test NestJS application
 */
export async function createTestApp(
  moduleFixture: TestingModule,
): Promise<NestFastifyApplication> {
  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );

  // Apply same configuration as production
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return app;
}

/**
 * Generate mock JWT token for testing
 */
export function generateMockToken(payload: {
  userId?: string;
  email?: string;
  role?: string;
  permissions?: string[];
}): string {
  const defaultPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
    permissions: [],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    ...payload,
  };

  const secret = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
  return jwt.sign(defaultPayload, secret);
}

/**
 * Generate mock Clerk session token
 */
export function generateMockClerkToken(payload: {
  userId?: string;
  sessionId?: string;
  email?: string;
}): string {
  const defaultPayload = {
    azp: 'http://localhost:3000',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    iss: 'https://test.clerk.dev',
    nbf: Math.floor(Date.now() / 1000) - 30,
    sid: payload.sessionId || 'sess_test123',
    sub: payload.userId || 'user_test123',
    email: payload.email || 'test@example.com',
  };

  const secret = process.env.CLERK_SECRET_KEY || 'test-clerk-secret';
  return jwt.sign(defaultPayload, secret);
}

/**
 * Create test user in database
 */
export async function createTestUser(
  prisma: PrismaClient,
  data?: Partial<{
    id: string;
    nip: string;
    clerkUserId: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  }>,
): Promise<any> {
  const defaultData = {
    id: `user-${Date.now()}`,
    nip: `NIP${Date.now()}`,
    clerkUserId: `clerk_${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    ...data,
  };

  return prisma.userProfile.create({
    data: {
      ...defaultData,
      updatedAt: new Date(),
    },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
      userPositions: {
        include: {
          position: true,
        },
      },
    },
  });
}

/**
 * Create test role with permissions
 */
export async function createTestRole(
  prisma: PrismaClient,
  data?: Partial<{
    id: string;
    code: string;
    name: string;
    permissions: string[];
  }>,
): Promise<any> {
  const roleData = {
    id: data?.id || `role-${Date.now()}`,
    code: data?.code || `ROLE${Date.now()}`,
    name: data?.name || `TestRole${Date.now()}`,
    description: 'Test role',
    hierarchyLevel: 10,
    isActive: true,
    ...data,
  };

  const role = await prisma.role.create({
    data: {
      ...roleData,
      updatedAt: new Date(),
    },
  });

  // Add permissions if provided
  if (data?.permissions && data.permissions.length > 0) {
    await prisma.rolePermission.createMany({
      data: data.permissions.map((permId) => ({
        id: `role-perm-${Date.now()}-${permId}`,
        roleId: role.id,
        permissionId: permId,
        updatedAt: new Date(),
      })),
    });
  }

  return role;
}

/**
 * Mock external services
 */
export const mockExternalServices = {
  /**
   * Mock Clerk client
   */
  clerkClient: {
    sessions: {
      verifySession: jest.fn().mockResolvedValue({
        userId: 'user_test123',
        sessionId: 'sess_test123',
      }),
    },
    users: {
      getUser: jest.fn().mockResolvedValue({
        id: 'user_test123',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        firstName: 'Test',
        lastName: 'User',
      }),
      createUser: jest.fn().mockResolvedValue({
        id: 'user_test123',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
      }),
      updateUser: jest.fn().mockResolvedValue({ id: 'user_test123' }),
      deleteUser: jest.fn().mockResolvedValue({ id: 'user_test123' }),
    },
  },

  /**
   * Mock Postmark client
   */
  postmarkClient: {
    sendEmail: jest.fn().mockResolvedValue({
      MessageID: 'test-message-id',
      SubmittedAt: new Date().toISOString(),
    }),
    sendEmailBatch: jest
      .fn()
      .mockResolvedValue([
        { MessageID: 'test-message-1' },
        { MessageID: 'test-message-2' },
      ]),
  },

  /**
   * Mock Redis client
   */
  redisClient: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(-1),
    keys: jest.fn().mockResolvedValue([]),
    flushall: jest.fn().mockResolvedValue('OK'),
  },
};

/**
 * Wait for async operations to complete
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Assert pagination structure
 */
export function assertPaginationStructure(result: any): void {
  expect(result).toHaveProperty('data');
  expect(result).toHaveProperty('pagination');
  expect(result.pagination).toHaveProperty('page');
  expect(result.pagination).toHaveProperty('limit');
  expect(result.pagination).toHaveProperty('total');
  expect(result.pagination).toHaveProperty('totalPages');
  expect(Array.isArray(result.data)).toBe(true);
}

/**
 * Assert timestamp fields
 */
export function assertTimestamps(entity: any): void {
  expect(entity).toHaveProperty('createdAt');
  expect(entity).toHaveProperty('updatedAt');
  expect(entity.createdAt).toBeInstanceOf(Date);
  expect(entity.updatedAt).toBeInstanceOf(Date);
}

/**
 * Assert soft delete fields
 */
export function assertSoftDelete(entity: any): void {
  expect(entity).toHaveProperty('isActive');
  expect(typeof entity.isActive).toBe('boolean');
  if (!entity.isActive) {
    expect(entity).toHaveProperty('deletedAt');
    expect(entity.deletedAt).toBeInstanceOf(Date);
  }
}

/**
 * Create mock request object
 */
export function createMockRequest(overrides?: any): any {
  return {
    headers: {
      authorization: `Bearer ${generateMockToken({})}`,
      'content-type': 'application/json',
      ...overrides?.headers,
    },
    user: {
      id: 'user_test123',
      email: 'test@example.com',
      ...overrides?.user,
    },
    query: overrides?.query || {},
    params: overrides?.params || {},
    body: overrides?.body || {},
    ...overrides,
  };
}

/**
 * Create mock response object
 */
export function createMockResponse(): any {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Helper to test error responses
 */
export async function expectErrorResponse(
  fn: () => Promise<any>,
  expectedStatus: number,
  expectedMessage?: string,
): Promise<void> {
  try {
    await fn();
    fail('Expected error to be thrown');
  } catch (error) {
    expect(error.status || error.statusCode).toBe(expectedStatus);
    if (expectedMessage) {
      expect(error.message).toContain(expectedMessage);
    }
  }
}

/**
 * Clean up test data by pattern
 */
export async function cleanupTestData(
  prisma: PrismaClient,
  pattern: string = 'test',
): Promise<void> {
  // Clean up in correct order to respect foreign keys
  await prisma.$transaction([
    // Clean up junction tables first
    prisma.userRole.deleteMany({
      where: {
        OR: [
          { userProfileId: { contains: pattern } },
          { roleId: { contains: pattern } },
        ],
      },
    }),
    prisma.userPosition.deleteMany({
      where: {
        OR: [
          { userProfileId: { contains: pattern } },
          { positionId: { contains: pattern } },
        ],
      },
    }),
    prisma.rolePermission.deleteMany({
      where: {
        OR: [
          { roleId: { contains: pattern } },
          { permissionId: { contains: pattern } },
        ],
      },
    }),

    // Then clean up main entities
    prisma.userProfile.deleteMany({
      where: {
        OR: [
          { id: { contains: pattern } },
          { clerkUserId: { contains: pattern } },
        ],
      },
    }),
    prisma.role.deleteMany({
      where: {
        OR: [{ id: { contains: pattern } }, { name: { contains: pattern } }],
      },
    }),
    prisma.permission.deleteMany({
      where: { id: { contains: pattern } },
    }),
  ]);
}

/**
 * Test data factory for generating consistent test data
 */
export class TestDataFactory {
  private counters: Map<string, number> = new Map();

  private getNextId(prefix: string): string {
    const current = this.counters.get(prefix) || 0;
    this.counters.set(prefix, current + 1);
    return `${prefix}-${current + 1}`;
  }

  createUser(overrides?: any) {
    const id = this.getNextId('user');
    return {
      id,
      nip: `NIP${id}`,
      clerkUserId: `clerk_${id}`,
      email: `${id}@test.com`,
      firstName: 'Test',
      lastName: `User ${id}`,
      isActive: true,
      ...overrides,
    };
  }

  createRole(overrides?: any) {
    const id = this.getNextId('role');
    return {
      id,
      name: `Role ${id}`,
      description: `Test role ${id}`,
      priority: 10,
      isActive: true,
      ...overrides,
    };
  }

  createPermission(overrides?: any) {
    const id = this.getNextId('permission');
    return {
      id,
      resource: 'test-resource',
      action: 'read',
      scope: 'OWN',
      description: `Test permission ${id}`,
      ...overrides,
    };
  }

  createSchool(overrides?: any) {
    const id = this.getNextId('school');
    return {
      id,
      schoolCode: `SCH${id}`,
      name: `School ${id}`,
      address: `Address ${id}`,
      principalNip: `NIP${id}`,
      isActive: true,
      ...overrides,
    };
  }

  createDepartment(schoolId: string, overrides?: any) {
    const id = this.getNextId('dept');
    return {
      id,
      schoolId,
      code: `DEPT${id}`,
      name: `Department ${id}`,
      headNip: `NIP${id}`,
      isActive: true,
      ...overrides,
    };
  }
}

/**
 * Global test data factory instance
 */
export const testDataFactory = new TestDataFactory();
