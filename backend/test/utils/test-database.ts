import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';

/**
 * Test database utilities for isolated testing
 * Provides database setup, teardown, and transaction management
 */
export class TestDatabase {
  private static instance: TestDatabase;
  private prisma: PrismaClient;
  private schemaName: string;
  private databaseUrl: string;

  private constructor() {
    // Generate unique schema name for test isolation
    this.schemaName = `test_${randomBytes(4).toString('hex')}`;

    // Parse the base database URL from environment
    const baseUrl =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/test_db';
    const url = new URL(baseUrl);

    // Add schema parameter for isolation
    url.searchParams.set('schema', this.schemaName);
    this.databaseUrl = url.toString();

    // Create Prisma client with test database URL
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.databaseUrl,
        },
      },
      log: process.env.DEBUG_TESTS ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  /**
   * Get singleton instance of test database
   */
  static getInstance(): TestDatabase {
    if (!TestDatabase.instance) {
      TestDatabase.instance = new TestDatabase();
    }
    return TestDatabase.instance;
  }

  /**
   * Get Prisma client instance
   */
  getClient(): PrismaClient {
    return this.prisma;
  }

  /**
   * Setup test database with migrations
   */
  async setup(): Promise<void> {
    try {
      // Create schema
      await this.prisma.$executeRawUnsafe(
        `CREATE SCHEMA IF NOT EXISTS "${this.schemaName}"`,
      );

      // Set search path
      await this.prisma.$executeRawUnsafe(
        `SET search_path TO "${this.schemaName}"`,
      );

      // Run migrations programmatically
      execSync(`DATABASE_URL="${this.databaseUrl}" npx prisma migrate deploy`, {
        env: { ...process.env, DATABASE_URL: this.databaseUrl },
        stdio: process.env.DEBUG_TESTS ? 'inherit' : 'pipe',
      });

      // Connect to database
      await this.prisma.$connect();
    } catch (error) {
      console.error(`Failed to setup test database: ${error.message}`);
      throw error;
    }
  }

  /**
   * Teardown test database
   */
  async teardown(): Promise<void> {
    try {
      // Disconnect from database
      await this.prisma.$disconnect();

      // Drop test schema (cascade to drop all objects)
      const adminPrisma = new PrismaClient({
        datasources: {
          db: {
            url:
              process.env.DATABASE_URL ||
              'postgresql://postgres:postgres@localhost:5432/test_db',
          },
        },
      });

      await adminPrisma.$executeRawUnsafe(
        `DROP SCHEMA IF EXISTS "${this.schemaName}" CASCADE`,
      );
      await adminPrisma.$disconnect();
    } catch (error) {
      console.error(`Failed to teardown test database: ${error.message}`);
      // Don't throw in teardown to avoid masking test failures
    }
  }

  /**
   * Clear all data from database (keep schema)
   */
  async clearDatabase(): Promise<void> {
    const tables = await this.prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = ${this.schemaName}
      AND tablename NOT LIKE '_prisma%'
    `;

    // Disable foreign key checks and truncate tables
    await this.prisma.$transaction([
      this.prisma.$executeRawUnsafe('SET session_replication_role = replica'),
      ...tables.map(({ tablename }) =>
        this.prisma.$executeRawUnsafe(
          `TRUNCATE TABLE "${this.schemaName}"."${tablename}" CASCADE`,
        ),
      ),
      this.prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT'),
    ]);
  }

  /**
   * Run test in transaction and rollback after
   */
  async runInTransaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>,
  ): Promise<T> {
    let result: T;

    try {
      result = await this.prisma.$transaction(async (tx) => {
        const testResult = await fn(tx as PrismaClient);
        // Force rollback by throwing special error
        throw new RollbackError(testResult);
      });
    } catch (error) {
      if (error instanceof RollbackError) {
        return error.result as T;
      }
      throw error;
    }

    return result;
  }

  /**
   * Seed database with test data
   */
  async seed(seedFn?: (prisma: PrismaClient) => Promise<void>): Promise<void> {
    if (seedFn) {
      await seedFn(this.prisma);
    } else {
      // Default seed data
      await this.createDefaultTestData();
    }
  }

  /**
   * Create default test data
   */
  private async createDefaultTestData(): Promise<void> {
    // Create test schools
    const schools = await this.prisma.$transaction([
      this.prisma.school.create({
        data: {
          id: 'school-1',
          code: 'SCH001',
          name: 'Test School 1',
          address: 'Test Address 1',
          principal: 'NIP001',
          isActive: true,
        },
      }),
      this.prisma.school.create({
        data: {
          id: 'school-2',
          code: 'SCH002',
          name: 'Test School 2',
          address: 'Test Address 2',
          principal: 'NIP002',
          isActive: true,
        },
      }),
    ]);

    // Create test departments
    await this.prisma.$transaction([
      this.prisma.department.create({
        data: {
          id: 'dept-1',
          schoolId: schools[0].id,
          code: 'DEPT001',
          name: 'Test Department 1',
          isActive: true,
        },
      }),
      this.prisma.department.create({
        data: {
          id: 'dept-2',
          schoolId: schools[0].id,
          code: 'DEPT002',
          name: 'Test Department 2',
          isActive: true,
        },
      }),
    ]);

    // Create test roles
    await this.prisma.$transaction([
      this.prisma.role.create({
        data: {
          id: 'role-admin',
          code: 'ADMIN',
          name: 'Admin',
          description: 'Administrator role',
          hierarchyLevel: 1,
          isSystemRole: true,
          isActive: true,
        },
      }),
      this.prisma.role.create({
        data: {
          id: 'role-user',
          code: 'USER',
          name: 'User',
          description: 'Regular user role',
          hierarchyLevel: 10,
          isSystemRole: false,
          isActive: true,
        },
      }),
    ]);

    // Create test permissions
    await this.prisma.$transaction([
      this.prisma.permission.create({
        data: {
          id: 'perm-users-read',
          code: 'USERS_READ',
          name: 'Read Users',
          resource: 'users',
          action: 'READ',
          scope: 'ALL',
          description: 'Read all users',
        },
      }),
      this.prisma.permission.create({
        data: {
          id: 'perm-users-write',
          code: 'USERS_UPDATE',
          name: 'Update Users',
          resource: 'users',
          action: 'UPDATE',
          scope: 'ALL',
          description: 'Update all users',
        },
      }),
    ]);
  }

  /**
   * Execute raw SQL query
   */
  async executeRaw(sql: string): Promise<any> {
    return this.prisma.$executeRawUnsafe(sql);
  }

  /**
   * Get database statistics for debugging
   */
  async getStats(): Promise<{
    tables: number;
    totalRows: number;
    schemaName: string;
  }> {
    const tables = await this.prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = ${this.schemaName}
      AND tablename NOT LIKE '_prisma%'
    `;

    let totalRows = 0;
    for (const { tablename } of tables) {
      const count = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "${this.schemaName}"."${tablename}"
      `;
      totalRows += Number(count[0].count);
    }

    return {
      tables: tables.length,
      totalRows,
      schemaName: this.schemaName,
    };
  }
}

/**
 * Custom error for transaction rollback
 */
class RollbackError extends Error {
  constructor(public result: any) {
    super('Transaction rollback');
    this.name = 'RollbackError';
  }
}

/**
 * Helper function to create test database for a test suite
 */
export async function createTestDatabase(): Promise<{
  prisma: PrismaClient;
  cleanup: () => Promise<void>;
}> {
  const testDb = TestDatabase.getInstance();
  await testDb.setup();

  return {
    prisma: testDb.getClient(),
    cleanup: async () => {
      await testDb.teardown();
    },
  };
}

/**
 * Helper to run test with database
 */
export async function withTestDatabase<T>(
  fn: (prisma: PrismaClient) => Promise<T>,
): Promise<T> {
  const testDb = TestDatabase.getInstance();
  await testDb.setup();

  try {
    const result = await fn(testDb.getClient());
    return result;
  } finally {
    await testDb.teardown();
  }
}
