import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';
import { FastifyRequest } from 'fastify';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: Partial<FastifyRequest>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();

    mockRequest = {
      url: '/api/v1/test',
      id: 'test-request-id',
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest as FastifyRequest,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as ExecutionContext;

    mockCallHandler = {
      handle: () => of({}),
    } as CallHandler;
  });

  describe('Nested Meta Structure (Schools, Departments)', () => {
    it('should handle nested meta pagination without double wrapping', (done) => {
      const mockNestedMetaResponse = {
        data: [
          { id: '1', name: 'School 1' },
          { id: '2', name: 'School 2' },
        ],
        meta: {
          total: 12,
          page: 1,
          limit: 10,
          totalPages: 2,
          hasNext: true,
          hasPrevious: false,
        },
      };

      mockCallHandler = {
        handle: () => of(mockNestedMetaResponse),
      } as CallHandler;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          // Verify structure
          expect(result).toHaveProperty('success', true);
          expect(result).toHaveProperty('data');
          expect(result).toHaveProperty('meta');
          expect(result).toHaveProperty('timestamp');
          expect(result).toHaveProperty('path', '/api/v1/test');
          expect(result).toHaveProperty('requestId', 'test-request-id');

          // Verify data is NOT double wrapped
          expect(Array.isArray(result.data)).toBe(true);
          expect(result.data).toHaveLength(2);
          expect(result.data[0]).toEqual({ id: '1', name: 'School 1' });

          // Verify meta is preserved as nested object
          expect(result.meta).toBeDefined();
          expect(result.meta!).toEqual({
            total: 12,
            page: 1,
            limit: 10,
            totalPages: 2,
            hasNext: true,
            hasPrevious: false,
          });

          // Ensure NO double wrapping - data should not have data property
          expect(result.data).not.toHaveProperty('data');
          expect(result.data).not.toHaveProperty('meta');

          done();
        },
        error: (error) => done(error),
      });
    });

    it('should detect nested meta structure correctly', (done) => {
      const mockNestedMetaResponse = {
        data: [{ id: '1' }],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      };

      mockCallHandler = {
        handle: () => of(mockNestedMetaResponse),
      } as CallHandler;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          // Should be detected as paginated
          expect(result).toHaveProperty('meta');
          expect(result.meta).toBeDefined();

          // Should NOT have flat pagination fields at top level
          expect(result).not.toHaveProperty('total');
          expect(result).not.toHaveProperty('page');
          expect(result).not.toHaveProperty('limit');

          done();
        },
        error: (error) => done(error),
      });
    });
  });

  describe('Flat Structure (Permissions, Roles, Users)', () => {
    it('should handle flat pagination structure for backward compatibility', (done) => {
      const mockFlatResponse = {
        data: [
          { id: '1', code: 'users:read' },
          { id: '2', code: 'users:write' },
        ],
        total: 50,
        page: 2,
        limit: 20,
        totalPages: 3,
        hasNext: true,
        hasPrevious: true,
      };

      mockCallHandler = {
        handle: () => of(mockFlatResponse),
      } as CallHandler;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          // Verify structure
          expect(result).toHaveProperty('success', true);
          expect(result).toHaveProperty('data');
          expect(result).toHaveProperty('total', 50);
          expect(result).toHaveProperty('page', 2);
          expect(result).toHaveProperty('limit', 20);
          expect(result).toHaveProperty('totalPages', 3);
          expect(result).toHaveProperty('hasNext', true);
          expect(result).toHaveProperty('hasPrevious', true);

          // Verify data is array
          expect(Array.isArray(result.data)).toBe(true);
          expect(result.data).toHaveLength(2);

          // Should NOT have meta property (flat structure)
          expect(result).not.toHaveProperty('meta');

          done();
        },
        error: (error) => done(error),
      });
    });
  });

  describe('Non-paginated Responses', () => {
    it('should wrap simple object responses', (done) => {
      const mockSimpleResponse = {
        id: '1',
        name: 'Test School',
      };

      mockCallHandler = {
        handle: () => of(mockSimpleResponse),
      } as CallHandler;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toHaveProperty('success', true);
          expect(result).toHaveProperty('data');
          expect(result.data).toEqual(mockSimpleResponse);
          expect(result).toHaveProperty('timestamp');
          expect(result).toHaveProperty('path');
          expect(result).toHaveProperty('requestId');

          // Should not have pagination fields
          expect(result).not.toHaveProperty('total');
          expect(result).not.toHaveProperty('meta');

          done();
        },
        error: (error) => done(error),
      });
    });

    it('should not double wrap already wrapped responses', (done) => {
      const mockAlreadyWrapped = {
        success: true,
        data: { id: '1', name: 'Test' },
        timestamp: '2025-01-01T00:00:00Z',
        path: '/test',
        requestId: 'existing-id',
      };

      mockCallHandler = {
        handle: () => of(mockAlreadyWrapped),
      } as CallHandler;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          // Should return as-is
          expect(result).toEqual(mockAlreadyWrapped);

          // Should NOT have nested data.data
          expect(result.data).not.toHaveProperty('data');

          done();
        },
        error: (error) => done(error),
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arrays in nested meta', (done) => {
      const mockEmptyNestedMeta = {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };

      mockCallHandler = {
        handle: () => of(mockEmptyNestedMeta),
      } as CallHandler;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(Array.isArray(result.data)).toBe(true);
          expect(result.data).toHaveLength(0);
          expect(result.meta).toBeDefined();
          expect(result.meta!.total).toBe(0);

          done();
        },
        error: (error) => done(error),
      });
    });

    it('should handle empty arrays in flat structure', (done) => {
      const mockEmptyFlat = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      };

      mockCallHandler = {
        handle: () => of(mockEmptyFlat),
      } as CallHandler;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(Array.isArray(result.data)).toBe(true);
          expect(result.data).toHaveLength(0);
          expect(result.total).toBe(0);
          expect(result).not.toHaveProperty('meta');

          done();
        },
        error: (error) => done(error),
      });
    });
  });
});
