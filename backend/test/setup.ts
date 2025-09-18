/**
 * Global test setup for all tests
 * Configures test environment, mocks, and utilities
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Mock console methods to reduce noise during tests
if (!process.env.DEBUG_TESTS) {
  global.console.log = jest.fn();
  global.console.warn = jest.fn();
  global.console.error = jest.fn();
}

// Mock external services
jest.mock('@clerk/backend', () => ({
  ClerkExpressWithAuth: jest.fn(),
  verifyJwt: jest.fn(),
  createClerkClient: jest.fn(() => ({
    users: {
      getUser: jest.fn(),
      getUserList: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
    },
    sessions: {
      getSession: jest.fn(),
      verifySession: jest.fn(),
    },
  })),
}));

jest.mock('postmark', () => ({
  ServerClient: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue({ MessageID: 'test-message-id' }),
    sendEmailBatch: jest
      .fn()
      .mockResolvedValue([{ MessageID: 'test-message-id' }]),
    sendEmailWithTemplate: jest
      .fn()
      .mockResolvedValue({ MessageID: 'test-message-id' }),
  })),
}));

// Mock Redis
jest.mock('ioredis', () => {
  const Redis = require('ioredis-mock');
  return Redis;
});

// Mock BullMQ Queue
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
    process: jest.fn(),
    on: jest.fn(),
    close: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
  QueueScheduler: jest.fn().mockImplementation(() => ({
    close: jest.fn(),
  })),
}));

// Increase test timeout for database operations
jest.setTimeout(30000);

// Prisma test client setup
export const createTestPrismaClient = () => {
  const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  return new PrismaClient({
    datasources: {
      db: {
        url: testDbUrl,
      },
    },
    log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error'],
  });
};

// Clean up after all tests
afterAll(async () => {
  // Clean up any remaining connections
  await new Promise((resolve) => setTimeout(resolve, 500));
});

// Test utilities
export const createTestingModule = async (
  moduleMetadata: any,
): Promise<TestingModule> => {
  const module = await Test.createTestingModule(moduleMetadata).compile();
  return module;
};

// Mock user for authentication tests
export const mockUser = {
  id: 'test-user-id',
  clerkUserId: 'clerk_test_user_id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  nip: '123456',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

// Mock permission for authorization tests
export const mockPermission = {
  id: 'test-permission-id',
  code: 'TEST_PERMISSION',
  name: 'Test Permission',
  description: 'Test permission for unit tests',
  module: 'TEST',
  action: 'READ',
  scope: 'OWN',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock role for RBAC tests
export const mockRole = {
  id: 'test-role-id',
  code: 'TEST_ROLE',
  name: 'Test Role',
  description: 'Test role for unit tests',
  level: 1,
  isSystem: false,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock organization data
export const mockSchool = {
  id: 'test-school-id',
  code: 'SCH001',
  name: 'Test School',
  address: '123 Test Street',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

export const mockDepartment = {
  id: 'test-dept-id',
  code: 'DEPT001',
  name: 'Test Department',
  schoolId: 'test-school-id',
  parentDepartmentId: null,
  level: 1,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

export const mockPosition = {
  id: 'test-position-id',
  code: 'POS001',
  name: 'Test Position',
  departmentId: 'test-dept-id',
  level: 1,
  maxOccupants: 1,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

// Test database utilities
export const cleanDatabase = async (prisma: PrismaClient) => {
  const tables = [
    'userOverride',
    'permissionCheckLog',
    'permissionCache',
    'userModuleAccess',
    'resourcePermission',
    'userPermission',
    'rolePermission',
    'userRole',
    'userPosition',
    'position',
    'department',
    'school',
    'role',
    'permission',
    'auditLog',
    'userProfile',
  ];

  for (const table of tables) {
    try {
      await (prisma as any)[table].deleteMany();
    } catch (error) {
      // Table might not exist in test database
    }
  }
};

// Performance testing utilities
export const measurePerformance = async (
  fn: () => Promise<any>,
  label: string,
): Promise<{ result: any; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  if (process.env.LOG_PERFORMANCE === 'true') {
    console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
};

// Request mock builder for controller tests
export class RequestMockBuilder {
  private request: any = {
    headers: {},
    params: {},
    query: {},
    body: {},
    user: null,
  };

  withHeaders(headers: Record<string, string>) {
    this.request.headers = headers;
    return this;
  }

  withParams(params: Record<string, any>) {
    this.request.params = params;
    return this;
  }

  withQuery(query: Record<string, any>) {
    this.request.query = query;
    return this;
  }

  withBody(body: any) {
    this.request.body = body;
    return this;
  }

  withUser(user: any) {
    this.request.user = user;
    return this;
  }

  withAuth(token: string) {
    this.request.headers.authorization = `Bearer ${token}`;
    return this;
  }

  build() {
    return this.request;
  }
}

// Response mock for controller tests
export class ResponseMock {
  statusCode = 200;
  data: any = null;
  headers: Record<string, string> = {};

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(data: any) {
    this.data = data;
    return this;
  }

  send(data: any) {
    this.data = data;
    return this;
  }

  setHeader(name: string, value: string) {
    this.headers[name] = value;
    return this;
  }
}

// Wait utility for async operations
export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Assertion helpers
export const expectToBeValid = (value: any) => {
  expect(value).toBeDefined();
  expect(value).not.toBeNull();
};

export const expectToMatchSchema = (data: any, schema: any) => {
  const keys = Object.keys(schema);
  keys.forEach((key) => {
    expect(data).toHaveProperty(key);
    if (typeof schema[key] === 'string') {
      expect(typeof data[key]).toBe(schema[key]);
    }
  });
};

// Mock factories for generating test data
export class TestDataFactory {
  static createUser(overrides: any = {}) {
    return {
      ...mockUser,
      id: `user-${Date.now()}-${Math.random()}`,
      ...overrides,
    };
  }

  static createRole(overrides: any = {}) {
    return {
      ...mockRole,
      id: `role-${Date.now()}-${Math.random()}`,
      code: `ROLE_${Date.now()}`,
      ...overrides,
    };
  }

  static createPermission(overrides: any = {}) {
    return {
      ...mockPermission,
      id: `permission-${Date.now()}-${Math.random()}`,
      code: `PERM_${Date.now()}`,
      ...overrides,
    };
  }

  static createSchool(overrides: any = {}) {
    return {
      ...mockSchool,
      id: `school-${Date.now()}-${Math.random()}`,
      code: `SCH${Date.now()}`,
      ...overrides,
    };
  }

  static createDepartment(overrides: any = {}) {
    return {
      ...mockDepartment,
      id: `dept-${Date.now()}-${Math.random()}`,
      code: `DEPT${Date.now()}`,
      ...overrides,
    };
  }

  static createPosition(overrides: any = {}) {
    return {
      ...mockPosition,
      id: `position-${Date.now()}-${Math.random()}`,
      code: `POS${Date.now()}`,
      ...overrides,
    };
  }
}

// Test context builder for complex scenarios
export class TestContextBuilder {
  private context: any = {};

  withUser(user: any) {
    this.context.user = user;
    return this;
  }

  withSchool(school: any) {
    this.context.school = school;
    return this;
  }

  withDepartment(department: any) {
    this.context.department = department;
    return this;
  }

  withPosition(position: any) {
    this.context.position = position;
    return this;
  }

  withRole(role: any) {
    this.context.role = role;
    return this;
  }

  withPermissions(permissions: any[]) {
    this.context.permissions = permissions;
    return this;
  }

  build() {
    return this.context;
  }
}

// Snapshot testing utilities
export const sanitizeSnapshot = (data: any): any => {
  if (data instanceof Date) {
    return '<DATE>';
  }
  if (typeof data === 'string' && data.match(/^\d{4}-\d{2}-\d{2}/)) {
    return '<DATE_STRING>';
  }
  if (
    typeof data === 'string' &&
    data.match(
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
    )
  ) {
    return '<UUID>';
  }
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = Array.isArray(data) ? [] : {};
    for (const key in data) {
      sanitized[key] = sanitizeSnapshot(data[key]);
    }
    return sanitized;
  }
  return data;
};
