import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService, AuditContext } from './audit.service';
import { AuditAction } from '@prisma/client';
import { FastifyRequest, FastifyReply } from 'fastify';

interface AuditableRequest extends FastifyRequest {
  user?: {
    id: string;
    profileId?: string;
    nip?: string;
    email?: string;
  };
  auditDisabled?: boolean;
  auditAction?: AuditAction;
  auditEntityType?: string;
  auditEntityId?: string;
  auditModule?: string;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<AuditableRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();

    // Skip audit for certain endpoints
    if (this.shouldSkipAudit(request)) {
      return next.handle();
    }

    // Capture request data
    const startTime = Date.now();
    const method = request.method;
    const url = request.url;
    const body = request.body;
    const params = request.params;

    // Build audit context
    const auditContext: AuditContext = {
      actorId: request.user?.id || 'anonymous',
      actorProfileId: request.user?.profileId,
      ip: this.getClientIp(request),
      userAgent: request.headers['user-agent'],
      requestId: request.id,
      sessionId: this.extractSessionId(request),
      module: request.auditModule || this.extractModule(url),
    };

    return next.handle().pipe(
      tap({
        next: async (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          // Determine audit action based on HTTP method and status
          const action = this.determineAuditAction(method, statusCode, request);

          // Skip if no meaningful action to audit
          if (!action) {
            return;
          }

          // Extract entity information
          const entityInfo = this.extractEntityInfo(url, params, body, data);

          try {
            await this.auditService.log({
              action,
              module: auditContext.module || 'API',
              entityType:
                entityInfo.entityType || request.auditEntityType || 'UNKNOWN',
              entityId:
                entityInfo.entityId ||
                request.auditEntityId ||
                `req_${request.id}`,
              metadata: {
                method,
                url,
                statusCode,
                duration: `${duration}ms`,
                ...entityInfo.metadata,
              },
              context: auditContext,
            });
          } catch (error) {
            // Log audit error but don't fail the request
            console.error('Audit logging failed:', error);
          }
        },
        error: async (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          try {
            await this.auditService.log({
              action: AuditAction.REJECT, // Using REJECT for errors
              module: auditContext.module || 'API',
              entityType: 'REQUEST',
              entityId: `error_${request.id}`,
              metadata: {
                method,
                url,
                statusCode,
                duration: `${duration}ms`,
                error: error.message,
                errorType: error.name,
              },
              context: auditContext,
            });
          } catch (auditError) {
            console.error('Audit logging failed:', auditError);
          }
        },
      }),
    );
  }

  private shouldSkipAudit(request: AuditableRequest): boolean {
    // Skip if explicitly disabled
    if (request.auditDisabled) {
      return true;
    }

    // Skip health checks and metrics
    const skipPaths = ['/health', '/metrics', '/api/docs', '/favicon.ico'];

    return skipPaths.some((path) => request.url.startsWith(path));
  }

  private determineAuditAction(
    method: string,
    statusCode: number,
    request: AuditableRequest,
  ): AuditAction | null {
    // Use explicit audit action if set
    if (request.auditAction) {
      return request.auditAction;
    }

    // Skip successful GET requests (too noisy)
    if (method === 'GET' && statusCode < 400) {
      return null;
    }

    // Map HTTP methods to audit actions
    const actionMap: Record<string, AuditAction> = {
      POST: AuditAction.CREATE,
      PUT: AuditAction.UPDATE,
      PATCH: AuditAction.UPDATE,
      DELETE: AuditAction.DELETE,
    };

    // Special cases based on URL patterns
    if (request.url.includes('/login')) {
      return statusCode < 400 ? AuditAction.LOGIN : AuditAction.REJECT;
    }
    if (request.url.includes('/logout')) {
      return AuditAction.LOGOUT;
    }
    if (request.url.includes('/export')) {
      return AuditAction.EXPORT;
    }
    if (request.url.includes('/import')) {
      return AuditAction.IMPORT;
    }
    if (request.url.includes('/approve')) {
      return AuditAction.APPROVE;
    }
    if (request.url.includes('/reject')) {
      return AuditAction.REJECT;
    }
    if (request.url.includes('/assign')) {
      return AuditAction.ASSIGN;
    }
    if (request.url.includes('/revoke')) {
      return AuditAction.REVOKE;
    }
    if (request.url.includes('/delegate')) {
      return AuditAction.DELEGATE;
    }

    // Failed requests
    if (statusCode === 403) {
      return AuditAction.REJECT; // Using REJECT for access denied
    }
    if (statusCode >= 400) {
      return AuditAction.REJECT; // Using REJECT for errors
    }

    return actionMap[method] || null;
  }

  private extractEntityInfo(
    url: string,
    params: any,
    body: any,
    responseData: any,
  ): {
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, any>;
  } {
    const info: any = {
      metadata: {},
    };

    // Extract entity type from URL
    const urlParts = url.split('/').filter((p) => p && !p.startsWith('?'));
    const apiIndex = urlParts.indexOf('api');

    if (apiIndex >= 0 && urlParts[apiIndex + 2]) {
      // Format: /entity-type/id
      info.entityType = urlParts[apiIndex + 2].toUpperCase();

      if (urlParts[apiIndex + 3] && !urlParts[apiIndex + 3].includes('?')) {
        info.entityId = urlParts[apiIndex + 3];
      }
    }

    // Extract entity ID from params
    if (params?.id) {
      info.entityId = params.id;
    }

    // Extract entity ID from response (for CREATE operations)
    if (!info.entityId && responseData?.id) {
      info.entityId = responseData.id;
    }

    // Add relevant body fields to metadata
    if (body) {
      const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
      const filteredBody = Object.keys(body).reduce(
        (acc, key) => {
          if (
            !sensitiveFields.some((field) => key.toLowerCase().includes(field))
          ) {
            acc[key] = body[key];
          }
          return acc;
        },
        {} as Record<string, any>,
      );

      if (Object.keys(filteredBody).length > 0) {
        info.metadata.requestBody = filteredBody;
      }
    }

    return info;
  }

  private getClientIp(request: FastifyRequest): string {
    // Check for common proxy headers
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return (forwarded as string).split(',')[0].trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return realIp as string;
    }

    // Fallback to socket connection
    return request.socket.remoteAddress || 'unknown';
  }

  private extractSessionId(request: FastifyRequest): string | undefined {
    // Try to extract session ID from various sources
    const cookie = request.headers.cookie;
    if (cookie) {
      const sessionMatch = cookie.match(/session=([^;]+)/);
      if (sessionMatch) {
        return sessionMatch[1];
      }
    }

    // Check authorization header for session token
    const auth = request.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      // You might want to hash this for privacy
      return this.hashToken(auth.substring(7, 20)); // Use first part of token
    }

    return undefined;
  }

  private hashToken(token: string): string {
    // Simple hash for session identification (not for security)
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `session_${Math.abs(hash).toString(36)}`;
  }

  private extractModule(url: string): string {
    // Extract module from URL pattern
    const urlParts = url.split('/').filter((p) => p && !p.startsWith('?'));
    const apiIndex = urlParts.indexOf('api');

    if (apiIndex >= 0 && urlParts[apiIndex + 2]) {
      // Format: /module-name/...
      const module = urlParts[apiIndex + 2];
      // Convert to uppercase and singular
      return module.toUpperCase().replace(/S$/, '');
    }

    return 'SYSTEM';
  }
}
