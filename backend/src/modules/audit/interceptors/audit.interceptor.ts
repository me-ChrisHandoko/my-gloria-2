import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AuditLogService } from '../services/audit-log.service';
import { Request } from 'express';
import { AuditAction } from '@prisma/client';

export const AUDIT_ACTION_KEY = 'audit:action';
export const AUDIT_MODULE_KEY = 'audit:module';
export const AUDIT_ENTITY_KEY = 'audit:entity';
export const SKIP_AUDIT_KEY = 'audit:skip';

/**
 * Decorator to specify audit action
 */
export const AuditActionType = (action: AuditAction) =>
  Reflect.metadata(AUDIT_ACTION_KEY, action);

/**
 * Decorator to specify audit module
 */
export const AuditModule = (module: string) =>
  Reflect.metadata(AUDIT_MODULE_KEY, module);

/**
 * Decorator to specify entity type
 */
export const AuditEntity = (entityType: string) =>
  Reflect.metadata(AUDIT_ENTITY_KEY, entityType);

/**
 * Decorator to skip audit logging
 */
export const SkipAudit = () => Reflect.metadata(SKIP_AUDIT_KEY, true);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Check if audit should be skipped
    const skipAudit = this.reflector.getAllAndOverride<boolean>(
      SKIP_AUDIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipAudit) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    // Skip if no user context
    if (!user) {
      return next.handle();
    }

    // Get audit metadata from decorators
    const action = this.reflector.get<AuditAction>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );

    // Get the URL path (Fastify uses 'url' instead of 'path')
    const requestPath = (request as any).url?.split('?')[0] || '';

    const module =
      this.reflector.get<string>(AUDIT_MODULE_KEY, context.getClass()) ||
      this.getModuleFromPath(requestPath);

    const entityType =
      this.reflector.get<string>(AUDIT_ENTITY_KEY, context.getHandler()) ||
      this.getEntityTypeFromPath(requestPath);

    // Skip if no action specified
    if (!action) {
      return next.handle();
    }

    // Get entity ID from request
    const entityId = this.extractEntityId(request);

    // Capture request body for CREATE/UPDATE actions
    const requestBody = request.body;

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const auditContext = {
            userId: user.id || user.sub,
            userProfileId: user.profileId,
            request,
            module,
          };

          switch (action) {
            case AuditAction.CREATE:
              if (response?.id) {
                await this.auditLogService.logCreate(
                  auditContext,
                  entityType,
                  response.id,
                  response,
                  this.getEntityDisplay(response),
                );
              }
              break;

            case AuditAction.UPDATE:
              if (entityId) {
                // In a real implementation, we would fetch the old values
                // For now, we'll log the new values only
                await this.auditLogService.logUpdate(
                  auditContext,
                  entityType,
                  entityId,
                  {}, // oldValues would be fetched before update
                  requestBody,
                  this.getEntityDisplay(requestBody),
                );
              }
              break;

            case AuditAction.DELETE:
              if (entityId) {
                await this.auditLogService.logDelete(
                  auditContext,
                  entityType,
                  entityId,
                  response || requestBody,
                  this.getEntityDisplay(response || requestBody),
                );
              }
              break;

            case AuditAction.READ:
              if (entityId) {
                await this.auditLogService.logRead(
                  auditContext,
                  entityType,
                  entityId,
                  this.getEntityDisplay(response),
                );
              }
              break;

            case AuditAction.EXPORT:
              await this.auditLogService.logExport(
                auditContext,
                entityType,
                entityId || 'batch',
                {
                  format: (request.query.format as string) || 'json',
                  recordCount: Array.isArray(response) ? response.length : 1,
                  filters: request.query,
                },
              );
              break;

            case AuditAction.LOGIN:
              await this.auditLogService.logLogin(
                user.id || user.sub,
                user.profileId,
                request,
                true,
                { method: 'clerk' },
              );
              break;

            case AuditAction.LOGOUT:
              await this.auditLogService.logLogout(
                user.id || user.sub,
                user.profileId,
                request,
              );
              break;

            case AuditAction.GRANT:
            case AuditAction.REVOKE:
              if (entityId && requestBody?.permissions) {
                await this.auditLogService.logPermissionChange(
                  auditContext,
                  entityId,
                  action === AuditAction.GRANT ? 'GRANT' : 'REVOKE',
                  requestBody.permissions,
                );
              }
              break;
          }
        } catch (error) {
          // Log error but don't break the request
          console.error('Audit logging failed:', error);
        }
      }),
    );
  }

  /**
   * Extract entity ID from request
   */
  private extractEntityId(request: Request): string | undefined {
    // Try to get ID from params
    const { id, userId, profileId } = request.params;
    return id || userId || profileId;
  }

  /**
   * Get module name from request path
   */
  private getModuleFromPath(path: string): string {
    const segments = path.split('/').filter(Boolean);

    // Skip 'api' and version segments
    const moduleIndex = segments.findIndex(
      (seg) => !['api', 'v1', 'v2'].includes(seg),
    );

    return moduleIndex >= 0 ? segments[moduleIndex] : 'unknown';
  }

  /**
   * Get entity type from request path
   */
  private getEntityTypeFromPath(path: string): string {
    const segments = path.split('/').filter(Boolean);

    // Get the resource name (usually after module)
    const resourceIndex = segments.findIndex(
      (seg) => !['api', 'v1', 'v2'].includes(seg),
    );

    if (resourceIndex >= 0 && segments[resourceIndex + 1]) {
      return segments[resourceIndex + 1];
    }

    return segments[resourceIndex] || 'unknown';
  }

  /**
   * Get display name for entity
   */
  private getEntityDisplay(entity: any): string | undefined {
    if (!entity) return undefined;

    // Try common display fields
    return (
      entity.name ||
      entity.title ||
      entity.displayName ||
      entity.code ||
      entity.dataKaryawan?.nama ||
      entity.email ||
      entity.dataKaryawan?.email ||
      undefined
    );
  }
}
