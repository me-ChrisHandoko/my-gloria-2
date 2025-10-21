import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { tap, mergeMap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AuditLogService } from '../services/audit-log.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { Request } from 'express';
import { AuditAction } from '@prisma/client';
import {
  AUDIT_LOG_KEY,
  AuditLogOptions,
} from '../../../core/auth/decorators/audit-log.decorator';

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
    private readonly prisma: PrismaService,
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

    // Skip GET requests to avoid noise in audit logs
    if (request.method === 'GET') {
      return next.handle();
    }

    // Get the URL path (Fastify uses 'url' instead of 'path')
    const requestPath = (request as any).url?.split('?')[0] || '';

    // Try to get action from @AuditActionType decorator first
    let action: AuditAction | undefined = this.reflector.get<AuditAction>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );

    // If not found, try to get from @AuditLog decorator
    if (!action) {
      const auditLogMetadata = this.reflector.get<AuditLogOptions>(
        AUDIT_LOG_KEY,
        context.getHandler(),
      );

      if (auditLogMetadata?.action) {
        action = this.parseActionString(auditLogMetadata.action);
      }
    }

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

    // Fetch old values for UPDATE operations BEFORE the update happens
    const shouldFetchOldValues =
      action === AuditAction.UPDATE && entityId && entityType;

    // If UPDATE, fetch old values first, then proceed with handler
    if (shouldFetchOldValues) {
      return from(this.fetchOldEntityValues(entityType, entityId)).pipe(
        mergeMap((oldEntityValues) =>
          next.handle().pipe(
            tap(async (response) => {
              try {
                const auditContext = {
                  userId: user.id || user.sub,
                  userProfileId: user.profileId,
                  request,
                  module,
                };

                // UPDATE case with old values
                if (entityId) {
                  // Unwrap response if it's wrapped by TransformInterceptor
                  const entityData = response?.data || response;

                  // Normalize both old and new values to consistent format
                  const normalizedOldValues = this.normalizeEntityForAudit(
                    oldEntityValues || {},
                  );
                  const normalizedNewValues =
                    this.normalizeEntityForAudit(entityData);

                  await this.auditLogService.logUpdate(
                    auditContext,
                    entityType,
                    entityId,
                    normalizedOldValues, // Normalized entity before update
                    normalizedNewValues, // Normalized entity after update
                    this.getEntityDisplay(entityData),
                  );
                }
              } catch (error) {
                console.error('Audit logging failed:', error);
              }
            }),
          ),
        ),
      );
    }

    // For non-UPDATE actions, proceed normally
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
              // Unwrap response if it's wrapped by TransformInterceptor
              const createEntityData = response?.data || response;

              // Extract ID from unwrapped entity
              const createdId = createEntityData?.id || requestBody?.id;

              if (createdId) {
                await this.auditLogService.logCreate(
                  auditContext,
                  entityType,
                  createdId,
                  createEntityData,
                  this.getEntityDisplay(createEntityData),
                );
              } else {
                console.warn(
                  `[AuditInterceptor] CREATE action: No entity ID found in response`,
                  { response, requestBody },
                );
              }
              break;

            case AuditAction.UPDATE:
              // UPDATE is handled separately above with old values fetching
              // This case should not be reached for UPDATE actions
              break;

            case AuditAction.DELETE:
              if (entityId) {
                // Unwrap response if wrapped
                const deleteEntityData =
                  response?.data || response || requestBody;

                await this.auditLogService.logDelete(
                  auditContext,
                  entityType,
                  entityId,
                  deleteEntityData,
                  this.getEntityDisplay(deleteEntityData),
                );
              }
              break;

            case AuditAction.READ:
              if (entityId) {
                // Unwrap response if wrapped
                const readEntityData = response?.data || response;

                await this.auditLogService.logRead(
                  auditContext,
                  entityType,
                  entityId,
                  this.getEntityDisplay(readEntityData),
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

  /**
   * Parse action string from @AuditLog decorator to AuditAction enum
   */
  private parseActionString(actionString: string): AuditAction | undefined {
    // Remove common prefixes and suffixes
    const normalized = actionString
      .toUpperCase()
      .replace(/^(CREATE|UPDATE|DELETE|RESTORE|ASSIGN)_/, '$1_')
      .replace(/_(SCHOOL|DEPARTMENT|POSITION|USER).*$/, '');

    // Map action strings to AuditAction enum
    const actionMap: Record<string, AuditAction> = {
      // CREATE actions
      CREATE_SCHOOL: AuditAction.CREATE,
      CREATE_DEPARTMENT: AuditAction.CREATE,
      CREATE_POSITION: AuditAction.CREATE,
      CREATE_USER: AuditAction.CREATE,
      CREATE: AuditAction.CREATE,

      // UPDATE actions
      UPDATE_SCHOOL: AuditAction.UPDATE,
      UPDATE_DEPARTMENT: AuditAction.UPDATE,
      UPDATE_POSITION: AuditAction.UPDATE,
      UPDATE_USER: AuditAction.UPDATE,
      UPDATE: AuditAction.UPDATE,
      RESTORE_SCHOOL: AuditAction.UPDATE,
      RESTORE_DEPARTMENT: AuditAction.UPDATE,
      RESTORE_POSITION: AuditAction.UPDATE,
      RESTORE: AuditAction.UPDATE,

      // DELETE actions
      DELETE_SCHOOL: AuditAction.DELETE,
      DELETE_DEPARTMENT: AuditAction.DELETE,
      DELETE_POSITION: AuditAction.DELETE,
      DELETE_USER: AuditAction.DELETE,
      DELETE: AuditAction.DELETE,

      // ASSIGN actions
      ASSIGN_USER_TO_POSITION: AuditAction.ASSIGN,
      ASSIGN_USER: AuditAction.ASSIGN,
      ASSIGN_ROLE: AuditAction.ASSIGN,
      ASSIGN: AuditAction.ASSIGN,

      // Permission actions
      GRANT_PERMISSION: AuditAction.GRANT,
      GRANT: AuditAction.GRANT,
      REVOKE_PERMISSION: AuditAction.REVOKE,
      REVOKE: AuditAction.REVOKE,

      // Other actions
      APPROVE: AuditAction.APPROVE,
      REJECT: AuditAction.REJECT,
      EXPORT: AuditAction.EXPORT,
      IMPORT: AuditAction.IMPORT,
      LOGIN: AuditAction.LOGIN,
      LOGOUT: AuditAction.LOGOUT,
      DELEGATE: AuditAction.DELEGATE,
    };

    // Try direct match first
    if (actionMap[actionString]) {
      return actionMap[actionString];
    }

    // Try normalized match
    if (actionMap[normalized]) {
      return actionMap[normalized];
    }

    // Fallback: try to extract base action
    if (actionString.includes('CREATE')) return AuditAction.CREATE;
    if (actionString.includes('UPDATE') || actionString.includes('RESTORE'))
      return AuditAction.UPDATE;
    if (actionString.includes('DELETE')) return AuditAction.DELETE;
    if (actionString.includes('ASSIGN')) return AuditAction.ASSIGN;
    if (actionString.includes('GRANT')) return AuditAction.GRANT;
    if (actionString.includes('REVOKE')) return AuditAction.REVOKE;
    if (actionString.includes('APPROVE')) return AuditAction.APPROVE;
    if (actionString.includes('REJECT')) return AuditAction.REJECT;

    // If we can't determine the action, return undefined
    console.warn(
      `[AuditInterceptor] Unable to parse action string: ${actionString}`,
    );
    return undefined;
  }

  /**
   * Fetch old entity values before update
   */
  private async fetchOldEntityValues(
    entityType: string,
    entityId: string,
  ): Promise<any> {
    try {
      // Map entity type to Prisma model name
      const modelName = this.mapEntityTypeToPrismaModel(entityType);

      if (!modelName || !this.prisma[modelName]) {
        console.warn(
          `[AuditInterceptor] Unknown entity type for fetching: ${entityType}`,
        );
        return null;
      }

      // Fetch the current entity state
      const entity = await this.prisma[modelName].findUnique({
        where: { id: entityId },
      });

      return entity;
    } catch (error) {
      console.error(
        `[AuditInterceptor] Failed to fetch old entity values: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Map entity type from URL to Prisma model name
   */
  private mapEntityTypeToPrismaModel(entityType: string): string | null {
    // Handle plural to singular conversion and known mappings
    const mapping: Record<string, string> = {
      schools: 'school',
      departments: 'department',
      positions: 'position',
      users: 'userProfile',
      profiles: 'userProfile',
      roles: 'role',
      permissions: 'permission',
      workflows: 'workflow',
      notifications: 'notification',
    };

    const modelName = mapping[entityType.toLowerCase()];
    return modelName || null;
  }

  /**
   * Normalize entity for audit logging
   * Strips computed fields and relational objects to create consistent format
   * Only keeps scalar database fields for comparison
   */
  private normalizeEntityForAudit(entity: any): any {
    if (!entity || typeof entity !== 'object') {
      return entity;
    }

    const normalized: any = {};

    for (const key in entity) {
      const value = entity[key];

      // Skip computed fields (fields ending with Count or known computed fields)
      if (
        key.endsWith('Count') ||
        key === '_count' ||
        key === 'success' ||
        key === 'timestamp' ||
        key === 'path' ||
        key === 'requestId'
      ) {
        continue;
      }

      // Handle object values
      if (value !== null && typeof value === 'object') {
        // Keep Date objects
        if (value instanceof Date) {
          normalized[key] = value;
          continue;
        }

        // Keep arrays (for fields like permissions array)
        if (Array.isArray(value)) {
          normalized[key] = value;
          continue;
        }

        // Skip all other nested objects (relational data like parent, school)
        continue;
      }

      // Keep scalar values (string, number, boolean, null)
      normalized[key] = value;
    }

    return normalized;
  }
}
