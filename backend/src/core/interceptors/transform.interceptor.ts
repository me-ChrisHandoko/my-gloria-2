import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FastifyRequest } from 'fastify';

export interface Response<T> {
  success: boolean;
  data: T;
  timestamp: string;
  path: string;
  requestId: string;
  // Pagination metadata (NESTED structure - all APIs use this)
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    return next.handle().pipe(
      map((data) => {
        // Check if response is already wrapped (to prevent double wrapping)
        if (this.isAlreadyWrapped(data)) {
          // Response is already in our standard format, return as-is
          return data;
        }

        // Check if response has pagination structure (paginated response with NESTED meta)
        if (this.isPaginatedResponse(data)) {
          return {
            success: true,
            data: data.data, // Extract the array
            meta: data.meta, // Preserve nested meta object
            timestamp: new Date().toISOString(),
            path: request.url,
            requestId: request.id,
          };
        }

        // For non-paginated responses, wrap normally
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
          path: request.url,
          requestId: request.id,
        };
      }),
    );
  }

  /**
   * Determines if a response is paginated based on NESTED meta structure
   * @param response - The response object to check
   * @returns true if the response has pagination with nested meta
   */
  private isPaginatedResponse(response: any): boolean {
    return (
      response &&
      typeof response === 'object' &&
      'data' in response &&
      Array.isArray(response.data) &&
      'meta' in response &&
      typeof response.meta === 'object' &&
      response.meta !== null &&
      'total' in response.meta &&
      'page' in response.meta &&
      'limit' in response.meta
    );
  }

  /**
   * Determines if a response is already wrapped in our standard format
   * @param response - The response object to check
   * @returns true if the response is already wrapped
   */
  private isAlreadyWrapped(response: any): boolean {
    return (
      response &&
      typeof response === 'object' &&
      'success' in response &&
      'data' in response &&
      'timestamp' in response &&
      'path' in response &&
      'requestId' in response
    );
  }
}
