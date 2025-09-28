/**
 * Centralized API Path Definitions
 * Production-ready configuration for all API endpoints
 * Eliminates hardcoded paths throughout the application
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * API Path Constants
 * Provides centralized, type-safe API endpoint definitions
 */
export class ApiPaths {
  private static instance: ApiPaths;
  private readonly prefix: string;
  private readonly version: string;
  private readonly base: string;

  private constructor(configService?: ConfigService) {
    this.prefix =
      configService?.get('app.apiPrefix') || process.env.API_PREFIX || 'api';
    this.version =
      configService?.get('app.apiVersion') || process.env.API_VERSION || 'v1';
    this.base = `${this.prefix}/${this.version}`;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(configService?: ConfigService): ApiPaths {
    if (!ApiPaths.instance) {
      ApiPaths.instance = new ApiPaths(configService);
    }
    return ApiPaths.instance;
  }

  /**
   * Get base API path
   */
  public getBase(): string {
    return this.base;
  }

  /**
   * Get global prefix (for NestJS configuration)
   */
  public getGlobalPrefix(): string {
    return `${this.prefix}/${this.version}`;
  }

  /**
   * Build path with base prefix
   */
  public buildPath(...segments: string[]): string {
    return [this.base, ...segments].filter(Boolean).join('/');
  }

  /**
   * Auth endpoints
   */
  public get auth() {
    return {
      base: this.buildPath('auth'),
      login: this.buildPath('auth', 'login'),
      register: this.buildPath('auth', 'register'),
      logout: this.buildPath('auth', 'logout'),
      refresh: this.buildPath('auth', 'refresh'),
      forgotPassword: this.buildPath('auth', 'forgot-password'),
      resetPassword: this.buildPath('auth', 'reset-password'),
      verify: this.buildPath('auth', 'verify'),
      me: this.buildPath('auth', 'me'),
      health: this.buildPath('auth', 'health'),
    };
  }

  /**
   * User endpoints
   */
  public get users() {
    return {
      base: this.buildPath('users'),
      byId: (id: string) => this.buildPath('users', id),
      me: this.buildPath('users', 'me'),
      search: this.buildPath('users', 'search'),
      bulkImport: this.buildPath('users', 'bulk-import'),
      stats: this.buildPath('users', 'stats'),
    };
  }

  /**
   * Organization endpoints
   */
  public get organizations() {
    return {
      schools: {
        base: this.buildPath('schools'),
        byId: (id: string) => this.buildPath('schools', id),
      },
      departments: {
        base: this.buildPath('departments'),
        byId: (id: string) => this.buildPath('departments', id),
      },
      positions: {
        base: this.buildPath('positions'),
        byId: (id: string) => this.buildPath('positions', id),
      },
    };
  }

  /**
   * Permission endpoints
   */
  public get permissions() {
    return {
      permissions: {
        base: this.buildPath('permissions'),
        byId: (id: string) => this.buildPath('permissions', id),
        check: this.buildPath('permissions', 'check'),
        bulkAssign: this.buildPath('permissions', 'bulk-assign'),
      },
      roles: {
        base: this.buildPath('roles'),
        byId: (id: string) => this.buildPath('roles', id),
      },
      moduleAccess: {
        base: this.buildPath('module-access'),
        byId: (id: string) => this.buildPath('module-access', id),
      },
      delegation: {
        base: this.buildPath('permission-delegation'),
        byId: (id: string) => this.buildPath('permission-delegation', id),
      },
      templates: {
        base: this.buildPath('permission-templates'),
        byId: (id: string) => this.buildPath('permission-templates', id),
      },
      resources: {
        base: this.buildPath('resource-permissions'),
        byId: (id: string) => this.buildPath('resource-permissions', id),
      },
    };
  }

  /**
   * Workflow endpoints
   */
  public get workflows() {
    return {
      workflows: {
        base: this.buildPath('workflows'),
        byId: (id: string) => this.buildPath('workflows', id),
        execute: this.buildPath('workflows', 'execute'),
        bulk: this.buildPath('workflows', 'bulk'),
      },
      templates: {
        base: this.buildPath('workflow-templates'),
        byId: (id: string) => this.buildPath('workflow-templates', id),
      },
      instances: {
        base: this.buildPath('workflow-instances'),
        byId: (id: string) => this.buildPath('workflow-instances', id),
        pause: (id: string) =>
          this.buildPath('workflow-instances', id, 'pause'),
        resume: (id: string) =>
          this.buildPath('workflow-instances', id, 'resume'),
        cancel: (id: string) =>
          this.buildPath('workflow-instances', id, 'cancel'),
      },
    };
  }

  /**
   * Notification endpoints
   */
  public get notifications() {
    return {
      notifications: {
        base: this.buildPath('notifications'),
        byId: (id: string) => this.buildPath('notifications', id),
        send: this.buildPath('notifications', 'send'),
        bulk: this.buildPath('notifications', 'bulk'),
        unread: this.buildPath('notifications', 'unread'),
        markAllRead: this.buildPath('notifications', 'mark-all-read'),
      },
      preferences: {
        base: this.buildPath('notification-preferences'),
        byUserId: (userId: string) =>
          this.buildPath('notification-preferences', userId),
      },
      templates: {
        base: this.buildPath('notification-templates'),
        byId: (id: string) => this.buildPath('notification-templates', id),
      },
    };
  }

  /**
   * Audit endpoints
   */
  public get audit() {
    return {
      base: this.buildPath('audit'),
      byId: (id: string) => this.buildPath('audit', id),
      export: this.buildPath('audit', 'export'),
    };
  }

  /**
   * System endpoints
   */
  public get system() {
    return {
      featureFlags: {
        base: this.buildPath('feature-flags'),
        evaluate: this.buildPath('feature-flags', 'evaluate'),
        evaluateBulk: this.buildPath('feature-flags', 'evaluate-bulk'),
      },
      config: {
        base: this.buildPath('system-config'),
        public: this.buildPath('system-config', 'public'),
        export: this.buildPath('system-config', 'export'),
      },
      health: {
        base: this.buildPath('health'),
        live: this.buildPath('health', 'live'),
        ready: this.buildPath('health', 'ready'),
      },
      monitoring: this.buildPath('monitoring'),
    };
  }

  /**
   * File endpoints
   */
  public get files() {
    return {
      upload: this.buildPath('files', 'upload'),
      download: (id: string) => this.buildPath('files', id, 'download'),
    };
  }

  /**
   * Get all rate-limited endpoints
   * Used by rate-limit.config.ts
   */
  public getRateLimitedEndpoints() {
    return {
      // Auth endpoints
      login: this.auth.login,
      register: this.auth.register,
      forgotPassword: this.auth.forgotPassword,
      resetPassword: this.auth.resetPassword,

      // Feature flags
      featureFlagsEvaluate: this.system.featureFlags.evaluate,
      featureFlagsEvaluateBulk: this.system.featureFlags.evaluateBulk,

      // System config
      systemConfig: this.system.config.base,
      systemConfigPublic: this.system.config.public,
      systemConfigExport: this.system.config.export,

      // Workflows
      workflowsExecute: this.workflows.workflows.execute,
      workflowsBulk: this.workflows.workflows.bulk,

      // Notifications
      notificationsSend: this.notifications.notifications.send,
      notificationsBulk: this.notifications.notifications.bulk,

      // Audit
      auditExport: this.audit.export,

      // Users
      usersSearch: this.users.search,
      usersBulkImport: this.users.bulkImport,

      // Permissions
      permissionsCheck: this.permissions.permissions.check,
      permissionsBulkAssign: this.permissions.permissions.bulkAssign,

      // Files
      filesUpload: this.files.upload,
    };
  }

  /**
   * Get paths that should be excluded from global prefix
   * Used in main.ts configuration
   */
  public getExcludedPaths(): string[] {
    return ['health', 'health/live', 'health/ready', 'metrics'];
  }

  /**
   * Check if a path matches a pattern
   * Used for dynamic path matching in guards and middleware
   */
  public matchesPattern(path: string, pattern: string): boolean {
    // Convert pattern to regex (e.g., /users/:id -> /users/[^/]+)
    const regexPattern = pattern
      .replace(/\//g, '\\/')
      .replace(/:[\w]+/g, '[^/]+')
      .replace(/\*/g, '.*');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Extract resource type from path
   * Used for audit logging and permission checks
   */
  public extractResourceFromPath(path: string): string | null {
    const pathWithoutBase = path.replace(new RegExp(`^/?${this.base}/?`), '');
    const segments = pathWithoutBase.split('/').filter(Boolean);
    return segments[0] || null;
  }

  /**
   * Export configuration for debugging
   */
  public exportConfig(): Record<string, any> {
    return {
      prefix: this.prefix,
      version: this.version,
      base: this.base,
      endpoints: {
        auth: this.auth,
        users: this.users,
        organizations: this.organizations,
        permissions: this.permissions,
        workflows: this.workflows,
        notifications: this.notifications,
        audit: this.audit,
        system: this.system,
        files: this.files,
      },
      excludedPaths: this.getExcludedPaths(),
    };
  }
}

/**
 * Injectable service for dependency injection
 */
@Injectable()
export class ApiPathsService {
  private apiPaths: ApiPaths;

  constructor(configService: ConfigService) {
    this.apiPaths = ApiPaths.getInstance(configService);
  }

  getPaths(): ApiPaths {
    return this.apiPaths;
  }
}

// Export singleton instance for static usage
export const apiPaths = ApiPaths.getInstance();
