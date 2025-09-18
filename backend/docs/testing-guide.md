# Gloria Backend - Testing Guide

## 📋 Overview

This guide provides comprehensive documentation for testing the Gloria backend application. Our testing strategy ensures code quality, reliability, and maintainability through unit tests, integration tests, and end-to-end (E2E) tests.

## 🎯 Testing Philosophy

### Core Principles
1. **Test Pyramid**: More unit tests, fewer integration tests, minimal E2E tests
2. **Fast Feedback**: Tests should run quickly to encourage frequent execution
3. **Isolation**: Tests should not depend on external services or other tests
4. **Clarity**: Test names should clearly describe what is being tested
5. **Coverage**: Aim for 80%+ code coverage with meaningful tests

### Testing Levels

```
         /\
        /E2E\       <- Critical user journeys (5-10%)
       /------\
      /Integration\ <- API and service integration (20-30%)
     /------------\
    /   Unit Tests  \ <- Business logic and utilities (60-70%)
   /----------------\
```

## 🏗️ Test Infrastructure

### Directory Structure
```
backend/
├── test/
│   ├── utils/              # Test utilities and helpers
│   │   ├── test-database.ts    # Database setup for testing
│   │   └── test-helpers.ts     # Common test utilities
│   ├── fixtures/           # Test data fixtures
│   │   └── test-data.ts       # Reusable test data
│   ├── e2e/               # End-to-end tests
│   │   ├── test-e2e-setup.ts  # E2E test configuration
│   │   └── *.e2e-spec.ts      # E2E test suites
│   ├── integration/       # Integration tests
│   ├── mocks/            # Mock implementations
│   └── setup.ts          # Global test setup
├── src/
│   └── **/*.spec.ts     # Unit tests (colocated with source)
├── jest.config.ts        # Jest configuration
├── test/jest-e2e.json    # E2E test configuration
└── .env.test            # Test environment variables
```

### Configuration Files

#### `jest.config.ts`
Main Jest configuration for unit and integration tests with:
- TypeScript support via ts-jest
- Path mapping for module imports
- Coverage thresholds and reporting
- Custom matchers and global setup

#### `.env.test`
Test-specific environment variables:
- Isolated test database
- Mock service credentials
- Disabled external integrations
- Test-optimized settings

## 🧪 Writing Tests

### Unit Tests

Unit tests focus on individual functions, classes, or services in isolation.

#### Basic Structure
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from '../repositories/user.repository';

describe('UserService', () => {
  let service: UserService;
  let repository: UserRepository;

  // Mock dependencies
  const mockRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<UserRepository>(UserRepository);
    
    // Clear mocks before each test
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      // Arrange
      const expectedUsers = [{ id: '1', name: 'Test User' }];
      mockRepository.findAll.mockResolvedValue({
        data: expectedUsers,
        pagination: { page: 1, limit: 10, total: 1 },
      });

      // Act
      const result = await service.findAll({ page: 1, limit: 10 });

      // Assert
      expect(result.data).toEqual(expectedUsers);
      expect(mockRepository.findAll).toHaveBeenCalledWith(1, 10, {}, {});
    });

    it('should handle empty results', async () => {
      // Test edge cases...
    });
  });
});
```

#### Best Practices for Unit Tests
1. **AAA Pattern**: Arrange, Act, Assert
2. **Single Responsibility**: Test one thing per test
3. **Descriptive Names**: Use `should` or behavior descriptions
4. **Mock External Dependencies**: Isolate the unit under test
5. **Test Edge Cases**: Null values, empty arrays, errors
6. **Use Test Utilities**: Leverage helper functions for common operations

### Integration Tests

Integration tests verify that multiple components work together correctly.

#### Database Integration Test
```typescript
import { TestDatabase, withTestDatabase } from '../test/utils/test-database';
import { UserService } from './user.service';
import { PrismaClient } from '@prisma/client';

describe('UserService Integration', () => {
  let prisma: PrismaClient;
  let service: UserService;

  beforeAll(async () => {
    const testDb = TestDatabase.getInstance();
    await testDb.setup();
    prisma = testDb.getClient();
    service = new UserService(prisma);
  });

  afterAll(async () => {
    await TestDatabase.getInstance().teardown();
  });

  beforeEach(async () => {
    await TestDatabase.getInstance().clearDatabase();
  });

  it('should create and retrieve user', async () => {
    // Test with real database
    const user = await service.create({
      email: 'test@example.com',
      name: 'Test User',
    });

    const found = await service.findById(user.id);
    expect(found).toMatchObject({
      email: 'test@example.com',
      name: 'Test User',
    });
  });
});
```

### E2E Tests

E2E tests verify complete user workflows through the API.

#### E2E Test Example
```typescript
import { createE2ETestSuite } from './test-e2e-setup';
import { HttpStatus } from '@nestjs/common';

createE2ETestSuite('Users E2E', ({ app, prisma, testSetup }) => {
  describe('User Registration Flow', () => {
    it('should complete full registration process', async () => {
      // 1. Create user
      const createResponse = await testSetup.makeAuthenticatedRequest(
        'POST',
        '/api/v1/users',
        {
          body: {
            email: 'newuser@example.com',
            name: 'New User',
          },
        }
      );
      expect(createResponse.statusCode).toBe(HttpStatus.CREATED);

      // 2. Verify email (mocked)
      // 3. Login
      // 4. Update profile
      // 5. Verify complete profile
    });
  });
});
```

## 🛠️ Test Utilities

### Database Utilities

#### `TestDatabase` Class
Manages isolated test databases with automatic setup/teardown:

```typescript
const testDb = TestDatabase.getInstance();
await testDb.setup();          // Create test schema
await testDb.seed();           // Add test data
await testDb.clearDatabase();  // Clear all data
await testDb.teardown();       // Drop test schema
```

#### Transaction Rollback Testing
Test operations without persisting changes:

```typescript
await testDb.runInTransaction(async (prisma) => {
  // All operations here will be rolled back
  const user = await prisma.user.create({ data: {...} });
  // Test logic...
  // Automatic rollback after function completes
});
```

### Test Helpers

#### Mock Data Generation
```typescript
import { testDataFactory } from '../test/utils/test-helpers';

const user = testDataFactory.createUser({
  email: 'custom@example.com',
});

const role = testDataFactory.createRole({
  name: 'Custom Role',
});
```

#### Authentication Helpers
```typescript
import { generateMockToken, generateMockClerkToken } from '../test/utils/test-helpers';

const jwtToken = generateMockToken({
  userId: 'test-user',
  roles: ['admin'],
});

const clerkToken = generateMockClerkToken({
  userId: 'clerk_user_123',
  email: 'user@example.com',
});
```

#### Assertion Helpers
```typescript
import {
  assertPaginationStructure,
  assertTimestamps,
  assertSoftDelete,
} from '../test/utils/test-helpers';

// Verify pagination response
assertPaginationStructure(response);

// Verify timestamps
assertTimestamps(entity);

// Verify soft delete fields
assertSoftDelete(entity);
```

### Test Fixtures

Pre-defined test data for consistent testing:

```typescript
import { testFixtures } from '../test/fixtures/test-data';

// Use predefined users
const adminUser = testFixtures.users.admin;
const teacherUser = testFixtures.users.teacher;

// Use predefined roles
const adminRole = testFixtures.roles.admin;

// Get all fixtures for bulk operations
const allFixtures = getAllFixtures();
await prisma.user.createMany({ data: allFixtures.users });
```

## 🚀 Running Tests

### Command Reference

```bash
# Unit tests
npm test                    # Run all unit tests
npm test:watch             # Run tests in watch mode
npm test -- user.service   # Run specific test file
npm test -- --coverage     # Run with coverage

# E2E tests
npm run test:e2e           # Run all E2E tests
npm run test:e2e -- users  # Run specific E2E suite

# Coverage
npm run test:cov           # Generate coverage report
./scripts/test-coverage.sh # Generate detailed coverage report

# Debug tests
npm run test:debug         # Run tests with debugger
```

### Test Execution Flow

1. **Environment Setup**: Load `.env.test` configuration
2. **Global Setup**: Execute `test/setup.ts`
3. **Test Execution**: Run test suites in parallel
4. **Cleanup**: Teardown test resources
5. **Reporting**: Generate coverage and results

### Debugging Tests

#### VS Code Debug Configuration
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "runtimeArgs": [
    "--inspect-brk",
    "${workspaceRoot}/node_modules/.bin/jest",
    "--runInBand"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

#### Debug Single Test
```typescript
it.only('should debug this test', async () => {
  debugger; // Breakpoint here
  // Test code...
});
```

## 📊 Coverage Reports

### Coverage Thresholds

```javascript
// Global thresholds (80%)
{
  branches: 80,
  functions: 80,
  lines: 80,
  statements: 80
}

// Critical modules (90%)
'./src/core/': {
  branches: 90,
  functions: 90,
  lines: 90,
  statements: 90
}
```

### Viewing Coverage

1. **Terminal Report**: Displayed after running tests
2. **HTML Report**: Open `coverage/index.html` in browser
3. **Coverage Badge**: Generated at `coverage/badge.svg`
4. **CI Integration**: Coverage uploaded to codecov/coveralls

### Improving Coverage

1. **Identify Gaps**: Review uncovered lines in HTML report
2. **Add Edge Cases**: Test error conditions and boundaries
3. **Test Branches**: Ensure all if/else paths are tested
4. **Mock External Calls**: Don't skip tests due to external dependencies

## 🔄 Continuous Integration

### GitHub Actions Workflow

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:cov
      - run: npm run test:e2e
      
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Pre-commit Hooks

```bash
# .husky/pre-commit
#!/bin/sh
npm run test -- --bail --findRelatedTests --passWithNoTests
```

## 🎯 Best Practices

### General Guidelines

1. **Fast Tests**: Keep unit tests under 100ms
2. **Independent Tests**: No shared state between tests
3. **Deterministic**: Same result every time
4. **Clear Failures**: Descriptive error messages
5. **Maintainable**: Update tests with code changes

### Naming Conventions

```typescript
// Test suites
describe('UserService', () => {
  describe('findAll', () => {
    it('should return paginated users', () => {});
    it('should filter by active status', () => {});
    it('should handle empty results', () => {});
  });
});

// E2E tests
describe('POST /api/v1/users', () => {
  it('should create user with valid data', () => {});
  it('should return 400 for invalid email', () => {});
  it('should return 409 for duplicate email', () => {});
});
```

### Common Patterns

#### Testing Async Operations
```typescript
it('should handle async operations', async () => {
  const promise = service.asyncOperation();
  await expect(promise).resolves.toBe(expectedValue);
});

it('should handle async errors', async () => {
  const promise = service.failingOperation();
  await expect(promise).rejects.toThrow(ExpectedError);
});
```

#### Testing Event Emitters
```typescript
it('should emit events', (done) => {
  emitter.on('event', (data) => {
    expect(data).toBe(expected);
    done();
  });
  
  service.triggerEvent();
});
```

#### Testing Time-dependent Code
```typescript
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-01'));
});

afterEach(() => {
  jest.useRealTimers();
});

it('should handle time-based logic', () => {
  const result = service.getTimestamp();
  expect(result).toBe('2024-01-01T00:00:00.000Z');
  
  jest.advanceTimersByTime(1000);
  // Test after 1 second...
});
```

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Error: Connection refused to localhost:5432
Solution: Ensure PostgreSQL is running
$ docker-compose up -d postgres
```

#### Test Timeout
```typescript
// Increase timeout for slow operations
jest.setTimeout(30000); // 30 seconds

it('slow test', async () => {
  // Test code...
}, 30000);
```

#### Memory Leaks
```bash
# Detect leaks
npm test -- --detectLeaks

# Fix: Ensure proper cleanup
afterEach(async () => {
  await connection.close();
  jest.clearAllMocks();
});
```

#### Flaky Tests
```typescript
// Add retry for flaky tests
jest.retryTimes(3);

it('potentially flaky test', async () => {
  // Test that might fail intermittently
});
```

### Debug Tips

1. **Use `console.log`**: Simple but effective
2. **Use `debugger`**: Set breakpoints in tests
3. **Run Single Test**: Use `.only` to isolate
4. **Verbose Output**: Run with `--verbose` flag
5. **Check Mocks**: Verify mock calls with `expect(mock).toHaveBeenCalledWith()`

## 📚 Resources

### Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Testing Library](https://testing-library.com/)

### Tools
- [Jest Runner VS Code Extension](https://marketplace.visualstudio.com/items?itemName=firsttris.vscode-jest-runner)
- [Coverage Gutters](https://marketplace.visualstudio.com/items?itemName=ryanluker.vscode-coverage-gutters)
- [Wallaby.js](https://wallabyjs.com/) - Continuous testing tool

### Articles
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Unit Testing Principles](https://www.manning.com/books/unit-testing)
- [E2E Testing Strategies](https://martinfowler.com/articles/practical-test-pyramid.html)

---

*This testing guide is a living document. Update it as testing practices evolve and new patterns emerge.*