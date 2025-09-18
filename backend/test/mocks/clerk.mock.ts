import { Injectable } from '@nestjs/common';

/**
 * Mock Clerk authentication service for E2E testing
 * Provides simulated authentication without external dependencies
 */
@Injectable()
export class ClerkMockService {
  private validTokens = new Map<string, any>();
  private defaultUser = {
    id: 'test_user_id',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    firstName: 'Test',
    lastName: 'User',
  };

  /**
   * Initialize mock tokens for testing
   */
  constructor() {
    // Create default test tokens
    this.validTokens.set('test_admin_token', {
      userId: 'clerk_admin',
      role: 'admin',
      email: 'admin@test.com',
    });

    this.validTokens.set('test_teacher_token', {
      userId: 'clerk_teacher',
      role: 'teacher',
      email: 'teacher@test.com',
    });

    this.validTokens.set('test_student_token', {
      userId: 'clerk_student',
      role: 'student',
      email: 'student@test.com',
    });

    this.validTokens.set('test_token', {
      userId: 'test_user_id',
      role: 'user',
      email: 'test@example.com',
    });
  }

  /**
   * Mock token verification
   */
  async verifyToken(token: string): Promise<any> {
    if (!token) {
      throw new Error('No token provided');
    }

    const cleanToken = token.replace('Bearer ', '');

    if (this.validTokens.has(cleanToken)) {
      return this.validTokens.get(cleanToken);
    }

    throw new Error('Invalid token');
  }

  /**
   * Mock user retrieval
   */
  async getUser(userId: string): Promise<any> {
    if (userId === 'test_user_id') {
      return this.defaultUser;
    }

    if (userId === 'clerk_admin') {
      return {
        id: 'clerk_admin',
        emailAddresses: [{ emailAddress: 'admin@test.com' }],
        firstName: 'Admin',
        lastName: 'User',
      };
    }

    if (userId === 'clerk_teacher') {
      return {
        id: 'clerk_teacher',
        emailAddresses: [{ emailAddress: 'teacher@test.com' }],
        firstName: 'Teacher',
        lastName: 'User',
      };
    }

    if (userId === 'clerk_student') {
      return {
        id: 'clerk_student',
        emailAddresses: [{ emailAddress: 'student@test.com' }],
        firstName: 'Student',
        lastName: 'User',
      };
    }

    throw new Error('User not found');
  }

  /**
   * Add a custom test token
   */
  addTestToken(token: string, payload: any): void {
    this.validTokens.set(token, payload);
  }

  /**
   * Clear all test tokens
   */
  clearTokens(): void {
    this.validTokens.clear();
  }
}

/**
 * Mock Clerk Guard for testing
 */
export class ClerkMockGuard {
  private mockService: ClerkMockService;

  constructor() {
    this.mockService = new ClerkMockService();
  }

  async canActivate(context: any): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      // Allow unauthenticated requests in test environment if explicitly testing auth
      if (request.headers['x-test-auth'] === 'skip') {
        return true;
      }
      return false;
    }

    try {
      const tokenData = await this.mockService.verifyToken(authHeader);
      request.user = tokenData;
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Helper to create authenticated request headers for testing
 */
export function createAuthHeaders(
  role: 'admin' | 'teacher' | 'student' | 'user' = 'user',
): Record<string, string> {
  const tokenMap = {
    admin: 'test_admin_token',
    teacher: 'test_teacher_token',
    student: 'test_student_token',
    user: 'test_token',
  };

  return {
    Authorization: `Bearer ${tokenMap[role]}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Mock Clerk client for testing
 */
export const clerkClientMock = {
  users: {
    getUser: jest.fn().mockResolvedValue({
      id: 'test_user_id',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'Test',
      lastName: 'User',
    }),
    getUserList: jest.fn().mockResolvedValue({
      data: [],
      totalCount: 0,
    }),
    createUser: jest.fn().mockResolvedValue({
      id: 'new_user_id',
      emailAddresses: [{ emailAddress: 'new@example.com' }],
    }),
    updateUser: jest.fn().mockResolvedValue({
      id: 'test_user_id',
      emailAddresses: [{ emailAddress: 'updated@example.com' }],
    }),
    deleteUser: jest.fn().mockResolvedValue({}),
  },
  sessions: {
    verifySession: jest.fn().mockResolvedValue({
      userId: 'test_user_id',
      status: 'active',
    }),
    getSession: jest.fn().mockResolvedValue({
      id: 'session_id',
      userId: 'test_user_id',
      status: 'active',
    }),
  },
};
