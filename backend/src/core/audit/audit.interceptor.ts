import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService, AuditContext } from './audit.service';
import { PrismaService } from '../database/prisma.service';
import { AuditAction } from '@prisma/client';
import { FastifyRequest, FastifyReply } from 'fastify';
import { AUDIT_LOG_KEY } from '../auth/decorators/audit-log.decorator';

interface AuditableRequest extends FastifyRequest {
  user?: {
    id: string;
    clerkUserId: string;
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
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<AuditableRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();

    // Check for @AuditLog decorator metadata first
    const auditMetadata = this.reflector.get(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    // Skip audit for certain endpoints
    if (this.shouldSkipAudit(request, auditMetadata)) {
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
      actorId: request.user?.clerkUserId || 'anonymous',
      actorProfileId: request.user?.profileId,
      ip: this.getClientIp(request),
      userAgent: request.headers['user-agent'],
      requestId: request.id,
      sessionId: this.extractSessionId(request),
      module: request.auditModule || this.extractModule(url),
    };

    // Pre-fetch old values for UPDATE/DELETE operations BEFORE service execution
    // This captures the state before changes are made
    let preOperationData: Record<string, any> | undefined;

    if (
      this.shouldPreFetchOldValues(method, url, params) &&
      auditMetadata?.resource
    ) {
      const entityId = (params as any)?.id;
      if (entityId) {
        preOperationData = await this.fetchOldValuesBeforeOperation(
          auditMetadata.resource,
          entityId,
        );
      }
    }

    return next.handle().pipe(
      tap({
        next: async (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          // Use decorator metadata if available
          if (auditMetadata && auditMetadata.enabled) {
            await this.logFromDecorator(
              auditMetadata,
              request,
              response,
              data,
              duration,
              auditContext,
              preOperationData, // Pass pre-fetched old values
            );
            return;
          }

          // Fallback to HTTP-based logging
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
              entityDisplay: entityInfo.entityDisplay,
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

  private shouldSkipAudit(
    request: AuditableRequest,
    auditMetadata?: any,
  ): boolean {
    // Skip if explicitly disabled
    if (request.auditDisabled) {
      return true;
    }

    // Don't skip if decorator is present and enabled
    if (auditMetadata && auditMetadata.enabled) {
      return false;
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
    entityDisplay?: string;
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

    // Extract entity display name from response or body
    info.entityDisplay =
      responseData?.name ||
      responseData?.title ||
      responseData?.displayName ||
      body?.name ||
      body?.title ||
      undefined;

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

  private async logFromDecorator(
    metadata: any,
    request: AuditableRequest,
    response: FastifyReply,
    responseData: any,
    duration: number,
    auditContext: AuditContext,
    preFetchedOldValues?: Record<string, any>,
  ): Promise<void> {
    try {
      // Map decorator action to AuditAction enum
      const actionMap: Record<string, AuditAction> = {
        'role.create': AuditAction.CREATE,
        'role.update': AuditAction.UPDATE,
        'role.delete': AuditAction.DELETE,
        'role.assign': AuditAction.ASSIGN,
        'role.remove': AuditAction.REVOKE,
        'role.permission.assign': AuditAction.ASSIGN,
        'role.permission.remove': AuditAction.REVOKE,
        'role.permission.bulk_assign': AuditAction.CREATE,
        'role.hierarchy.create': AuditAction.CREATE,
        'role.template.create': AuditAction.CREATE,
        'role.template.apply': AuditAction.UPDATE,
        'department.create': AuditAction.CREATE,
        'department.update': AuditAction.UPDATE,
        'department.delete': AuditAction.DELETE,
        UPDATE_DEPARTMENT: AuditAction.UPDATE,
      };

      const action = actionMap[metadata.action] || AuditAction.CREATE;

      // Build metadata from decorator config
      const logMetadata: any = {
        severity: metadata.severity,
        category: metadata.category,
        method: request.method,
        url: request.url,
        statusCode: response.statusCode,
        duration: `${duration}ms`,
        ...(metadata.metadata || {}),
      };

      // Include request body if specified
      if (metadata.includeBody && request.body) {
        logMetadata.requestBody = this.maskSensitiveData(
          request.body,
          metadata.maskSensitive !== false,
        );
      }

      // Include response if specified
      if (metadata.includeResponse && responseData) {
        logMetadata.response = this.maskSensitiveData(
          responseData,
          metadata.maskSensitive !== false,
        );
      }

      // Add compliance info if present
      if (metadata.compliance && metadata.compliance.length > 0) {
        logMetadata.compliance = metadata.compliance;
      }

      // Extract entity info from response
      // Handle wrapped response from TransformInterceptor { success, data, ... }
      const actualData = responseData?.data || responseData || {};

      const entityId =
        actualData?.id || // From unwrapped data
        (request.params as any)?.id || // From URL params (UPDATE)
        `req_${request.id}`; // Fallback

      // Debug logging for entity ID extraction
      if (!entityId.startsWith('req_')) {
        this.logger.debug(
          `✅ Entity ID extracted: ${entityId} from ${actualData?.id ? 'response.data' : 'params'}`,
        );
      } else {
        this.logger.warn(
          `⚠️ Entity ID fallback: ${entityId}, responseData: ${JSON.stringify(responseData)?.substring(0, 100)}`,
        );
      }

      // Extract entity display name from response
      const entityDisplay =
        actualData?.name ||
        actualData?.title ||
        (request.body as any)?.name ||
        undefined;

      // Handle old values and new values
      let oldValues: Record<string, any> | undefined;
      let newValues: Record<string, any> | undefined;
      let changedFields: string[] | undefined;

      if (
        action === AuditAction.UPDATE ||
        action === AuditAction.DELETE ||
        action === AuditAction.REVOKE
      ) {
        // Use pre-fetched old values (captured BEFORE service execution)
        oldValues = preFetchedOldValues;

        // Fetch new data from database (after update) to ensure complete data
        // Response might not contain all fields, so we fetch from DB
        newValues = await this.fetchNewValues(
          metadata.resource,
          entityId,
          responseData,
          request,
        );

        // Calculate changed fields
        if (oldValues && newValues) {
          changedFields = this.getChangedFields(oldValues, newValues);
        }
      } else if (
        action === AuditAction.CREATE ||
        action === AuditAction.ASSIGN
      ) {
        // For CREATE, fetch from database to ensure complete data (same as UPDATE)
        // This ensures consistent format between CREATE and UPDATE operations
        newValues = await this.fetchNewValues(
          metadata.resource,
          entityId,
          responseData,
          request,
        );

        // If DB fetch fails, fallback to response or request body
        if (!newValues) {
          newValues = responseData
            ? this.extractRelevantFields(responseData)
            : this.extractRelevantFields(request.body);
        }
      }

      await this.auditService.log({
        action,
        module: auditContext.module || 'permissions',
        entityType: metadata.resource?.toUpperCase() || 'UNKNOWN',
        entityId,
        entityDisplay,
        oldValues,
        newValues,
        changedFields,
        metadata: logMetadata,
        context: auditContext,
      });

      // Trigger alert if configured
      if (metadata.alert) {
        // TODO: Implement alerting system
        console.warn(
          `🚨 AUDIT ALERT: ${metadata.action} - ${metadata.severity}`,
          {
            actorId: auditContext.actorId,
            entityId,
          },
        );
      }
    } catch (error) {
      console.error('Decorator-based audit logging failed:', error);
    }
  }

  private maskSensitiveData(data: any, shouldMask: boolean): any {
    if (!shouldMask) return data;

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'authorization',
    ];

    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const masked = { ...data };
    for (const key of Object.keys(masked)) {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        masked[key] = '***MASKED***';
      }
    }

    return masked;
  }

  /**
   * Check if we should pre-fetch old values (for UPDATE/DELETE operations)
   */
  private shouldPreFetchOldValues(
    method: string,
    url: string,
    params: any,
  ): boolean {
    // Only pre-fetch for UPDATE, DELETE, PUT, PATCH operations
    const modifyingMethods = ['PUT', 'PATCH', 'DELETE'];
    if (!modifyingMethods.includes(method)) {
      return false;
    }

    // Must have an ID parameter to fetch old data
    if (!params?.id) {
      return false;
    }

    // Don't pre-fetch for bulk operations or special endpoints
    if (
      url.includes('/bulk') ||
      url.includes('/batch') ||
      url.includes('/assign') ||
      url.includes('/remove')
    ) {
      return false;
    }

    return true;
  }

  /**
   * Fetch old values BEFORE service execution (captures state before changes)
   */
  private async fetchOldValuesBeforeOperation(
    resource: string,
    entityId: string,
  ): Promise<Record<string, any> | undefined> {
    try {
      // Map resource to Prisma model
      const modelMap: Record<string, string> = {
        role: 'role',
        department: 'department',
        position: 'position',
        permission: 'permission',
        user: 'userProfile',
        user_role: 'userRole',
        role_permission: 'rolePermission',
        user_permission: 'userPermission',
      };

      const modelName = modelMap[resource?.toLowerCase()];
      if (!modelName || !entityId) {
        return undefined;
      }

      // Fetch old data from Prisma BEFORE update
      const model = (this.prisma as any)[modelName];
      if (!model) {
        return undefined;
      }

      const oldData = await model.findUnique({
        where: { id: entityId },
      });

      if (!oldData) {
        return undefined;
      }

      return this.extractRelevantFields(oldData);
    } catch (error) {
      console.error('Failed to fetch old values before operation:', error);
      return undefined;
    }
  }

  /**
   * Fetch new values from database after UPDATE/DELETE
   * This ensures old_values and new_values have the same format (all fields from DB)
   */
  private async fetchNewValues(
    resource: string,
    entityId: string,
    responseData: any,
    request: AuditableRequest,
  ): Promise<Record<string, any> | undefined> {
    try {
      // Map resource to Prisma model
      const modelMap: Record<string, string> = {
        role: 'role',
        department: 'department',
        position: 'position',
        permission: 'permission',
        user: 'userProfile',
        user_role: 'userRole',
        role_permission: 'rolePermission',
        user_permission: 'userPermission',
      };

      const modelName = modelMap[resource?.toLowerCase()];
      if (!modelName || !entityId) {
        // Fallback to responseData if can't fetch from DB
        return responseData
          ? this.extractRelevantFields(responseData)
          : undefined;
      }

      // Fetch new data from Prisma (after update)
      const model = (this.prisma as any)[modelName];
      if (!model) {
        // Fallback to responseData if model not found
        return responseData
          ? this.extractRelevantFields(responseData)
          : undefined;
      }

      const newData = await model.findUnique({
        where: { id: entityId },
      });

      if (!newData) {
        // Fallback to responseData if record not found (might be deleted)
        return responseData
          ? this.extractRelevantFields(responseData)
          : undefined;
      }

      return this.extractRelevantFields(newData);
    } catch (error) {
      console.error('Failed to fetch new values:', error);
      // Fallback to responseData on error
      return responseData
        ? this.extractRelevantFields(responseData)
        : undefined;
    }
  }

  /**
   * Extract relevant fields from data object (exclude only sensitive data)
   */
  private extractRelevantFields(data: any): Record<string, any> | undefined {
    if (!data || typeof data !== 'object') {
      return undefined;
    }

    // Only exclude sensitive fields, keep all other fields including metadata
    const excludeFields = [
      'password',
      'passwordHash',
      'token',
      'refreshToken',
      'secret',
      'apiKey',
      'accessToken',
      'privateKey',
      'publicKey',
    ];

    const relevant: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      // Exclude sensitive fields
      if (!excludeFields.includes(key)) {
        relevant[key] = value;
      }
    }

    return Object.keys(relevant).length > 0 ? relevant : undefined;
  }

  /**
   * Get list of changed fields between old and new values
   */
  private getChangedFields(
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
  ): string[] | undefined {
    const changed: string[] = [];

    // Check all keys from both objects
    const allKeys = new Set([
      ...Object.keys(oldValues),
      ...Object.keys(newValues),
    ]);

    for (const key of allKeys) {
      const oldValue = oldValues[key];
      const newValue = newValues[key];

      // Compare using JSON stringify for deep comparison
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changed.push(key);
      }
    }

    return changed.length > 0 ? changed : undefined;
  }
}
