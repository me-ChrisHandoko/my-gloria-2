import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { TestDatabase } from '../utils/test-database';
import { PrismaClient } from '@prisma/client';
import { ClerkMockGuard, createAuthHeaders } from '../mocks/clerk.mock';

/**
 * E2E Test Setup and Configuration
 * Production-ready test environment with proper isolation and mocking
 */
export class E2ETestSetup {
  private app: NestFastifyApplication;
  private testDb: TestDatabase;
  private moduleFixture: TestingModule;

  /**
   * Initialize E2E test environment with all necessary configurations
   */
  async initialize(): Promise<{
    app: NestFastifyApplication;
    prisma: PrismaClient;
    cleanup: () => Promise<void>;
  }> {
    // Setup test database with isolation
    this.testDb = TestDatabase.getInstance();
    await this.testDb.setup();

    // Create testing module with proper overrides
    this.moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('PrismaService')
      .useValue(this.testDb.getClient())
      .overrideGuard('ClerkGuard')
      .useClass(ClerkMockGuard)
      .compile();

    // Create Nest application with Fastify
    this.app = this.moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({
        logger: process.env.DEBUG_TESTS ? true : false,
      }),
    );

    // Apply global configuration
    this.setupGlobalConfig();

    // Initialize application
    await this.app.init();
    await this.app.getHttpAdapter().getInstance().ready();

    return {
      app: this.app,
      prisma: this.testDb.getClient(),
      cleanup: async () => {
        await this.cleanup();
      },
    };
  }

  /**
   * Setup global application configuration matching production
   */
  private setupGlobalConfig(): void {
    // Validation pipe with production settings
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        disableErrorMessages: false,
        validationError: {
          target: false,
          value: false,
        },
      }),
    );

    // CORS configuration
    this.app.enableCors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // API versioning
    this.app.setGlobalPrefix('api/v1');

    // Shutdown hooks for graceful cleanup
    this.app.enableShutdownHooks();
  }

  /**
   * Clean up test environment properly
   */
  async cleanup(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
    if (this.testDb) {
      await this.testDb.teardown();
    }
  }

  /**
   * Seed database with test data using transactions
   */
  async seedDatabase(
    customSeed?: (prisma: PrismaClient) => Promise<void>,
  ): Promise<void> {
    const prisma = this.testDb.getClient();

    if (customSeed) {
      // Run custom seed in transaction for atomicity
      await prisma.$transaction(async (tx) => {
        await customSeed(tx as PrismaClient);
      });
    } else {
      // Use default seed if provided
      await this.testDb.seed();
    }
  }

  /**
   * Clear database data with proper cleanup
   */
  async clearDatabase(): Promise<void> {
    await this.testDb.clearDatabase();
  }

  /**
   * Get application instance
   */
  getApp(): NestFastifyApplication {
    return this.app;
  }

  /**
   * Get Prisma client
   */
  getPrisma(): PrismaClient {
    return this.testDb.getClient();
  }

  /**
   * Create authenticated request helper with role-based auth
   */
  createAuthenticatedRequest(
    role: 'admin' | 'teacher' | 'student' | 'user' = 'user',
  ): {
    headers: Record<string, string>;
  } {
    return {
      headers: createAuthHeaders(role),
    };
  }

  /**
   * Make authenticated request with proper response handling
   */
  async makeAuthenticatedRequest(
    method: string,
    url: string,
    options?: {
      body?: any;
      query?: any;
      role?: 'admin' | 'teacher' | 'student' | 'user';
      headers?: Record<string, string>;
    },
  ): Promise<{
    statusCode: number;
    body: any;
    headers: Record<string, string>;
  }> {
    const auth = this.createAuthenticatedRequest(options?.role || 'user');
    const response = await this.app.inject({
      method: method as any,
      url,
      payload: options?.body,
      query: options?.query,
      headers: {
        ...auth.headers,
        ...options?.headers,
      },
    });

    let body;
    try {
      body = JSON.parse(response.body);
    } catch {
      body = response.body;
    }

    return {
      statusCode: response.statusCode,
      body,
      headers: response.headers as Record<string, string>,
    };
  }

  /**
   * Make unauthenticated request
   */
  async makeRequest(
    method: string,
    url: string,
    options?: {
      body?: any;
      query?: any;
      headers?: Record<string, string>;
    },
  ): Promise<{
    statusCode: number;
    body: any;
    headers: Record<string, string>;
  }> {
    const response = await this.app.inject({
      method: method as any,
      url,
      payload: options?.body,
      query: options?.query,
      headers: options?.headers,
    });

    let body;
    try {
      body = JSON.parse(response.body);
    } catch {
      body = response.body;
    }

    return {
      statusCode: response.statusCode,
      body,
      headers: response.headers as Record<string, string>,
    };
  }

  /**
   * Wait for async operations to complete
   */
  async waitForAsync(ms: number = 100): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Execute database query directly for assertions
   */
  async executeQuery<T>(
    query: (prisma: PrismaClient) => Promise<T>,
  ): Promise<T> {
    return query(this.testDb.getClient());
  }
}

/**
 * Helper function to setup E2E tests with proper lifecycle
 */
export async function setupE2ETests(): Promise<{
  app: NestFastifyApplication;
  prisma: PrismaClient;
  testSetup: E2ETestSetup;
  cleanup: () => Promise<void>;
}> {
  const testSetup = new E2ETestSetup();
  const { app, prisma, cleanup } = await testSetup.initialize();

  return {
    app,
    prisma,
    testSetup,
    cleanup,
  };
}

/**
 * Helper function for individual E2E test suites with isolation
 */
export function createE2ETestSuite(
  description: string,
  testFn: (context: {
    app: NestFastifyApplication;
    prisma: PrismaClient;
    testSetup: E2ETestSetup;
  }) => void,
): void {
  describe(description, () => {
    let app: NestFastifyApplication = null as any;
    let prisma: PrismaClient = null as any;
    let testSetup: E2ETestSetup = null as any;

    beforeAll(async () => {
      const setup = await setupE2ETests();
      app = setup.app;
      prisma = setup.prisma;
      testSetup = setup.testSetup;
    }, 30000); // Extended timeout for database setup

    afterAll(async () => {
      if (testSetup) {
        await testSetup.cleanup();
      }
    }, 10000);

    beforeEach(async () => {
      if (testSetup) {
        await testSetup.clearDatabase();
      }
    });

    // Run the test function with context
    testFn({ app, prisma, testSetup });
  });
}

/**
 * Helper for testing error scenarios
 */
export async function expectError(
  fn: () => Promise<any>,
  expectedError: {
    statusCode?: number;
    message?: string | RegExp;
  },
): Promise<void> {
  try {
    await fn();
    throw new Error('Expected function to throw an error');
  } catch (error: any) {
    if (expectedError.statusCode) {
      expect(error.statusCode).toBe(expectedError.statusCode);
    }
    if (expectedError.message) {
      if (expectedError.message instanceof RegExp) {
        expect(error.message).toMatch(expectedError.message);
      } else {
        expect(error.message).toBe(expectedError.message);
      }
    }
  }
}

/**
 * Helper for testing paginated responses
 */
export function expectPaginatedResponse(response: any): void {
  expect(response).toHaveProperty('data');
  expect(Array.isArray(response.data)).toBe(true);
  expect(response).toHaveProperty('pagination');
  expect(response.pagination).toMatchObject({
    page: expect.any(Number),
    limit: expect.any(Number),
    total: expect.any(Number),
    totalPages: expect.any(Number),
  });
}
