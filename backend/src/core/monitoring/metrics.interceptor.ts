import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MonitoringService } from './monitoring.service';
import { FastifyRequest, FastifyReply } from 'fastify';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly monitoringService: MonitoringService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();

    // Extract route pattern (e.g., /users/:id instead of /users/123)
    const route = this.extractRoutePattern(request);
    const method = request.method;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - startTime) / 1000; // Convert to seconds
          const statusCode = response.statusCode;

          // Record successful request metrics
          this.monitoringService.recordHttpRequest(
            method,
            route,
            statusCode,
            duration,
          );
        },
        error: (error) => {
          const duration = (Date.now() - startTime) / 1000;
          const statusCode = error.status || 500;
          const errorType = error.name || 'UnknownError';

          // Record error metrics
          this.monitoringService.recordHttpRequest(
            method,
            route,
            statusCode,
            duration,
          );
          this.monitoringService.recordHttpError(method, route, errorType);
        },
      }),
    );
  }

  private extractRoutePattern(request: FastifyRequest): string {
    // Try to get the route pattern from Fastify's context
    const routeConfig = request.routeOptions?.config;
    const url = request.routeOptions?.url || request.url;

    // Clean up the URL to get a consistent pattern
    if (url) {
      // Remove query parameters
      const cleanUrl = url.split('?')[0];

      // Replace UUIDs with :id
      const uuidPattern =
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
      let pattern = cleanUrl.replace(uuidPattern, ':id');

      // Replace numeric IDs with :id
      pattern = pattern.replace(/\/\d+/g, '/:id');

      // Remove API versioning if present
      pattern = pattern.replace(/^\/api\/v\d+/, '');

      return pattern || '/';
    }

    return request.url || '/';
  }
}
