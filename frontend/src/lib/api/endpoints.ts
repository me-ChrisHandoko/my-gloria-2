/**
 * API Endpoints Configuration
 * Production-ready endpoint definitions for Gloria API
 */

import { apiConfig } from './config';

/**
 * Type definitions for endpoint functions
 */
type EndpointFunction = (...args: any[]) => string;
type EndpointDefinition = string | EndpointFunction;

interface EndpointModule {
  [key: string]: EndpointDefinition | EndpointModule;
}

/**
 * Helper function to construct full API URL
 */
const buildUrl = (path: string): string => {
  const baseUrl = apiConfig.getBaseUrl();
  return `${baseUrl}${path}`;
};

/**
 * Helper function to add query parameters to URL
 */
const addQueryParams = (url: string, params?: Record<string, any>): string => {
  if (!params || Object.keys(params).length === 0) return url;

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  return `${url}?${searchParams.toString()}`;
};

/**
 * Main API Endpoints Configuration
 * All endpoints are organized by module for better maintainability
 */
export const API_ENDPOINTS = {
  /**
   * Authentication Module Endpoints
   */
  auth: {
    login: () => buildUrl('/auth/login'),
    logout: () => buildUrl('/auth/logout'),
    refresh: () => buildUrl('/auth/refresh'),
    me: () => buildUrl('/auth/me'),
    health: () => buildUrl('/auth/health'),

    // Additional auth endpoints
    register: () => buildUrl('/auth/register'),
    forgotPassword: () => buildUrl('/auth/forgot-password'),
    resetPassword: () => buildUrl('/auth/reset-password'),
    verifyEmail: () => buildUrl('/auth/verify-email'),
    resendVerification: () => buildUrl('/auth/resend-verification'),
    changePassword: () => buildUrl('/auth/change-password'),
    twoFactorSetup: () => buildUrl('/auth/2fa/setup'),
    twoFactorVerify: () => buildUrl('/auth/2fa/verify'),
    twoFactorDisable: () => buildUrl('/auth/2fa/disable'),
    sessions: () => buildUrl('/auth/sessions'),
    revokeSession: (sessionId: string) => buildUrl(`/auth/sessions/${sessionId}/revoke`),
  },

  /**
   * Users Module Endpoints
   */
  users: {
    list: (params?: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }) =>
      addQueryParams(buildUrl('/users'), params),
    byId: (id: string) => buildUrl(`/users/${id}`),
    me: () => buildUrl('/users/me'),
    byNip: (nip: string) => buildUrl(`/users/by-nip/${nip}`),
    stats: () => buildUrl('/users/stats'),
    create: () => buildUrl('/users'),
    update: (id: string) => buildUrl(`/users/${id}`),
    delete: (id: string) => buildUrl(`/users/${id}`),

    // Additional user endpoints
    profile: (id: string) => buildUrl(`/users/${id}/profile`),
    updateProfile: (id: string) => buildUrl(`/users/${id}/profile`),
    avatar: (id: string) => buildUrl(`/users/${id}/avatar`),
    uploadAvatar: (id: string) => buildUrl(`/users/${id}/avatar`),
    deleteAvatar: (id: string) => buildUrl(`/users/${id}/avatar`),
    preferences: (id: string) => buildUrl(`/users/${id}/preferences`),
    updatePreferences: (id: string) => buildUrl(`/users/${id}/preferences`),
    activities: (id: string, params?: { page?: number; limit?: number }) =>
      addQueryParams(buildUrl(`/users/${id}/activities`), params),
    permissions: (id: string) => buildUrl(`/users/${id}/permissions`),
    roles: (id: string) => buildUrl(`/users/${id}/roles`),
    assignRole: (id: string) => buildUrl(`/users/${id}/roles`),
    removeRole: (id: string, roleId: string) => buildUrl(`/users/${id}/roles/${roleId}`),
    bulkCreate: () => buildUrl('/users/bulk'),
    bulkUpdate: () => buildUrl('/users/bulk'),
    bulkDelete: () => buildUrl('/users/bulk'),
    export: (params?: { format?: 'csv' | 'xlsx' | 'json' }) =>
      addQueryParams(buildUrl('/users/export'), params),
    import: () => buildUrl('/users/import'),
    search: (query: string, params?: { limit?: number }) =>
      addQueryParams(buildUrl(`/users/search`), { q: query, ...params }),
  },

  /**
   * Organizations Module Endpoints
   */
  organizations: {
    /**
     * Schools Sub-module
     */
    schools: {
      list: (params?: { page?: number; limit?: number; search?: string }) =>
        addQueryParams(buildUrl('/schools'), params),
      byId: (id: string) => buildUrl(`/schools/${id}`),
      create: () => buildUrl('/schools'),
      update: (id: string) => buildUrl(`/schools/${id}`),
      delete: (id: string) => buildUrl(`/schools/${id}`),

      // Additional school endpoints
      stats: (id: string) => buildUrl(`/schools/${id}/stats`),
      users: (id: string, params?: { page?: number; limit?: number }) =>
        addQueryParams(buildUrl(`/schools/${id}/users`), params),
      departments: (id: string) => buildUrl(`/schools/${id}/departments`),
      activities: (id: string, params?: { page?: number; limit?: number }) =>
        addQueryParams(buildUrl(`/schools/${id}/activities`), params),
      export: (id: string, format?: 'csv' | 'xlsx' | 'json') =>
        addQueryParams(buildUrl(`/schools/${id}/export`), { format }),
    },

    /**
     * Departments Sub-module
     */
    departments: {
      list: (params?: { page?: number; limit?: number; search?: string; schoolId?: string }) =>
        addQueryParams(buildUrl('/departments'), params),
      byId: (id: string) => buildUrl(`/departments/${id}`),
      create: () => buildUrl('/departments'),
      update: (id: string) => buildUrl(`/departments/${id}`),
      delete: (id: string) => buildUrl(`/departments/${id}`),

      // Additional department endpoints
      stats: (id: string) => buildUrl(`/departments/${id}/stats`),
      users: (id: string, params?: { page?: number; limit?: number }) =>
        addQueryParams(buildUrl(`/departments/${id}/users`), params),
      positions: (id: string) => buildUrl(`/departments/${id}/positions`),
      activities: (id: string, params?: { page?: number; limit?: number }) =>
        addQueryParams(buildUrl(`/departments/${id}/activities`), params),
      hierarchy: (id: string) => buildUrl(`/departments/${id}/hierarchy`),
    },

    /**
     * Positions Sub-module
     */
    positions: {
      list: (params?: { page?: number; limit?: number; search?: string; departmentId?: string }) =>
        addQueryParams(buildUrl('/positions'), params),
      byId: (id: string) => buildUrl(`/positions/${id}`),
      create: () => buildUrl('/positions'),
      update: (id: string) => buildUrl(`/positions/${id}`),
      delete: (id: string) => buildUrl(`/positions/${id}`),

      // Additional position endpoints
      users: (id: string, params?: { page?: number; limit?: number }) =>
        addQueryParams(buildUrl(`/positions/${id}/users`), params),
      permissions: (id: string) => buildUrl(`/positions/${id}/permissions`),
      assignPermission: (id: string) => buildUrl(`/positions/${id}/permissions`),
      removePermission: (id: string, permissionId: string) =>
        buildUrl(`/positions/${id}/permissions/${permissionId}`),
    },
  },

  /**
   * Permissions Module Endpoints
   */
  permissions: {
    /**
     * Permissions Sub-module
     */
    permissions: {
      list: (params?: { page?: number; limit?: number; search?: string; module?: string }) =>
        addQueryParams(buildUrl('/permissions'), params),
      byId: (id: string) => buildUrl(`/permissions/${id}`),
      create: () => buildUrl('/permissions'),
      update: (id: string) => buildUrl(`/permissions/${id}`),
      delete: (id: string) => buildUrl(`/permissions/${id}`),

      // Additional permission endpoints
      byModule: (module: string) => buildUrl(`/permissions/module/${module}`),
      checkAccess: () => buildUrl('/permissions/check'),
      bulkCheck: () => buildUrl('/permissions/bulk-check'),
      modules: () => buildUrl('/permissions/modules'),
    },

    /**
     * Roles Sub-module
     */
    roles: {
      list: (params?: { page?: number; limit?: number; search?: string }) =>
        addQueryParams(buildUrl('/roles'), params),
      byId: (id: string) => buildUrl(`/roles/${id}`),
      create: () => buildUrl('/roles'),
      update: (id: string) => buildUrl(`/roles/${id}`),
      delete: (id: string) => buildUrl(`/roles/${id}`),

      // Additional role endpoints
      permissions: (id: string) => buildUrl(`/roles/${id}/permissions`),
      assignPermission: (id: string) => buildUrl(`/roles/${id}/permissions`),
      removePermission: (id: string, permissionId: string) =>
        buildUrl(`/roles/${id}/permissions/${permissionId}`),
      users: (id: string, params?: { page?: number; limit?: number }) =>
        addQueryParams(buildUrl(`/roles/${id}/users`), params),
      duplicate: (id: string) => buildUrl(`/roles/${id}/duplicate`),
      hierarchy: () => buildUrl('/roles/hierarchy'),
    },

    /**
     * Module Access Sub-module (User Module Access)
     */
    moduleAccess: {
      list: (params?: { userId?: string; moduleId?: string }) =>
        addQueryParams(buildUrl('/modules/user-access'), params),
      grant: () => buildUrl('/modules/user-access'),
      revoke: (id: string) => buildUrl(`/modules/user-access/${id}`),

      // Additional module access endpoints
      byUser: (userId: string) => buildUrl(`/modules/user-access/user/${userId}`),
      byModule: (moduleId: string) => buildUrl(`/modules/user-access/module/${moduleId}`),
      bulkGrant: () => buildUrl('/modules/user-access/bulk'),
      bulkRevoke: () => buildUrl('/modules/user-access/bulk-revoke'),
      checkAccess: (userId: string, moduleId: string) =>
        buildUrl(`/modules/user-access/check/${userId}/${moduleId}`),
    },
  },

  /**
   * Workflows Module Endpoints
   */
  workflows: {
    /**
     * Workflows Sub-module
     */
    workflows: {
      list: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
        addQueryParams(buildUrl('/workflows'), params),
      byId: (id: string) => buildUrl(`/workflows/${id}`),
      create: () => buildUrl('/workflows'),
      update: (id: string) => buildUrl(`/workflows/${id}`),
      delete: (id: string) => buildUrl(`/workflows/${id}`),

      // Additional workflow endpoints
      execute: (id: string) => buildUrl(`/workflows/${id}/execute`),
      pause: (id: string) => buildUrl(`/workflows/${id}/pause`),
      resume: (id: string) => buildUrl(`/workflows/${id}/resume`),
      cancel: (id: string) => buildUrl(`/workflows/${id}/cancel`),
      history: (id: string, params?: { page?: number; limit?: number }) =>
        addQueryParams(buildUrl(`/workflows/${id}/history`), params),
      stats: (id: string) => buildUrl(`/workflows/${id}/stats`),
      duplicate: (id: string) => buildUrl(`/workflows/${id}/duplicate`),
      export: (id: string) => buildUrl(`/workflows/${id}/export`),
      import: () => buildUrl('/workflows/import'),
    },

    /**
     * Workflow Templates Sub-module
     */
    templates: {
      list: (params?: { page?: number; limit?: number; search?: string; category?: string }) =>
        addQueryParams(buildUrl('/workflow-templates'), params),
      byId: (id: string) => buildUrl(`/workflow-templates/${id}`),
      create: () => buildUrl('/workflow-templates'),
      update: (id: string) => buildUrl(`/workflow-templates/${id}`),
      delete: (id: string) => buildUrl(`/workflow-templates/${id}`),

      // Additional template endpoints
      preview: (id: string) => buildUrl(`/workflow-templates/${id}/preview`),
      duplicate: (id: string) => buildUrl(`/workflow-templates/${id}/duplicate`),
      createWorkflow: (id: string) => buildUrl(`/workflow-templates/${id}/create-workflow`),
      categories: () => buildUrl('/workflow-templates/categories'),
      popular: (params?: { limit?: number }) =>
        addQueryParams(buildUrl('/workflow-templates/popular'), params),
    },

    /**
     * Workflow Instances Sub-module
     */
    instances: {
      list: (params?: {
        page?: number;
        limit?: number;
        workflowId?: string;
        status?: string;
        userId?: string;
        dateFrom?: string;
        dateTo?: string;
      }) => addQueryParams(buildUrl('/workflow-instances'), params),
      byId: (id: string) => buildUrl(`/workflow-instances/${id}`),
      create: () => buildUrl('/workflow-instances'),
      update: (id: string) => buildUrl(`/workflow-instances/${id}`),
      delete: (id: string) => buildUrl(`/workflow-instances/${id}`),

      // Additional instance endpoints
      approve: (id: string) => buildUrl(`/workflow-instances/${id}/approve`),
      reject: (id: string) => buildUrl(`/workflow-instances/${id}/reject`),
      comment: (id: string) => buildUrl(`/workflow-instances/${id}/comment`),
      reassign: (id: string) => buildUrl(`/workflow-instances/${id}/reassign`),
      escalate: (id: string) => buildUrl(`/workflow-instances/${id}/escalate`),
      history: (id: string) => buildUrl(`/workflow-instances/${id}/history`),
      attachments: (id: string) => buildUrl(`/workflow-instances/${id}/attachments`),
      uploadAttachment: (id: string) => buildUrl(`/workflow-instances/${id}/attachments`),
      deleteAttachment: (id: string, attachmentId: string) =>
        buildUrl(`/workflow-instances/${id}/attachments/${attachmentId}`),
      timeline: (id: string) => buildUrl(`/workflow-instances/${id}/timeline`),
      metrics: (id: string) => buildUrl(`/workflow-instances/${id}/metrics`),
    },
  },

  /**
   * Notifications Module Endpoints
   */
  notifications: {
    /**
     * Notifications Sub-module
     */
    notifications: {
      list: (params?: {
        page?: number;
        limit?: number;
        unreadOnly?: boolean;
        type?: string;
        priority?: string;
      }) => addQueryParams(buildUrl('/notifications'), params),
      byId: (id: string) => buildUrl(`/notifications/${id}`),
      send: () => buildUrl('/notifications'),
      markAsRead: (id: string) => buildUrl(`/notifications/${id}/read`),
      markAsUnread: (id: string) => buildUrl(`/notifications/${id}/unread`),
      delete: (id: string) => buildUrl(`/notifications/${id}`),

      // Additional notification endpoints
      markAllAsRead: () => buildUrl('/notifications/mark-all-read'),
      deleteAll: () => buildUrl('/notifications/delete-all'),
      count: () => buildUrl('/notifications/count'),
      unreadCount: () => buildUrl('/notifications/unread-count'),
      bulkMarkAsRead: () => buildUrl('/notifications/bulk-read'),
      bulkDelete: () => buildUrl('/notifications/bulk-delete'),
      subscribe: () => buildUrl('/notifications/subscribe'),
      unsubscribe: () => buildUrl('/notifications/unsubscribe'),
    },

    /**
     * Notification Preferences Sub-module
     */
    preferences: {
      get: () => buildUrl('/notification-preferences'),
      update: () => buildUrl('/notification-preferences'),

      // Additional preference endpoints
      byChannel: (channel: 'email' | 'push' | 'sms' | 'in-app') =>
        buildUrl(`/notification-preferences/${channel}`),
      updateChannel: (channel: 'email' | 'push' | 'sms' | 'in-app') =>
        buildUrl(`/notification-preferences/${channel}`),
      reset: () => buildUrl('/notification-preferences/reset'),
      getDefaults: () => buildUrl('/notification-preferences/defaults'),
    },

    /**
     * Notification Templates Sub-module
     */
    templates: {
      list: (params?: { page?: number; limit?: number; search?: string; type?: string }) =>
        addQueryParams(buildUrl('/notification-templates'), params),
      byId: (id: string) => buildUrl(`/notification-templates/${id}`),
      create: () => buildUrl('/notification-templates'),
      update: (id: string) => buildUrl(`/notification-templates/${id}`),
      delete: (id: string) => buildUrl(`/notification-templates/${id}`),

      // Additional template endpoints
      preview: (id: string) => buildUrl(`/notification-templates/${id}/preview`),
      duplicate: (id: string) => buildUrl(`/notification-templates/${id}/duplicate`),
      test: (id: string) => buildUrl(`/notification-templates/${id}/test`),
      variables: (id: string) => buildUrl(`/notification-templates/${id}/variables`),
      usage: (id: string) => buildUrl(`/notification-templates/${id}/usage`),
    },
  },

  /**
   * Audit Module Endpoints
   */
  audit: {
    list: (params?: {
      page?: number;
      limit?: number;
      userId?: string;
      action?: string;
      resource?: string;
      dateFrom?: string;
      dateTo?: string;
      severity?: string;
    }) => addQueryParams(buildUrl('/audit'), params),
    byId: (id: string) => buildUrl(`/audit/${id}`),
    export: (params?: {
      format?: 'csv' | 'xlsx' | 'json' | 'pdf';
      dateFrom?: string;
      dateTo?: string;
      userId?: string;
    }) => addQueryParams(buildUrl('/audit/export'), params),

    // Additional audit endpoints
    stats: (params?: { dateFrom?: string; dateTo?: string }) =>
      addQueryParams(buildUrl('/audit/stats'), params),
    byUser: (userId: string, params?: { page?: number; limit?: number }) =>
      addQueryParams(buildUrl(`/audit/user/${userId}`), params),
    byResource: (resource: string, params?: { page?: number; limit?: number }) =>
      addQueryParams(buildUrl(`/audit/resource/${resource}`), params),
    byAction: (action: string, params?: { page?: number; limit?: number }) =>
      addQueryParams(buildUrl(`/audit/action/${action}`), params),
    search: (query: string, params?: { page?: number; limit?: number }) =>
      addQueryParams(buildUrl('/audit/search'), { q: query, ...params }),
    archive: () => buildUrl('/audit/archive'),
    restore: (id: string) => buildUrl(`/audit/${id}/restore`),
    retention: () => buildUrl('/audit/retention'),
    updateRetention: () => buildUrl('/audit/retention'),
  },

  /**
   * Feature Flags Module Endpoints
   */
  featureFlags: {
    list: (params?: { page?: number; limit?: number; search?: string; enabled?: boolean }) =>
      addQueryParams(buildUrl('/feature-flags'), params),
    byKey: (key: string) => buildUrl(`/feature-flags/${key}`),
    create: () => buildUrl('/feature-flags'),
    update: (id: string) => buildUrl(`/feature-flags/${id}`),
    delete: (id: string) => buildUrl(`/feature-flags/${id}`),

    // Additional feature flag endpoints
    toggle: (id: string) => buildUrl(`/feature-flags/${id}/toggle`),
    enable: (id: string) => buildUrl(`/feature-flags/${id}/enable`),
    disable: (id: string) => buildUrl(`/feature-flags/${id}/disable`),
    evaluate: () => buildUrl('/feature-flags/evaluate'),
    bulkEvaluate: () => buildUrl('/feature-flags/bulk-evaluate'),
    history: (id: string, params?: { page?: number; limit?: number }) =>
      addQueryParams(buildUrl(`/feature-flags/${id}/history`), params),
    rollout: (id: string) => buildUrl(`/feature-flags/${id}/rollout`),
    updateRollout: (id: string) => buildUrl(`/feature-flags/${id}/rollout`),
    rules: (id: string) => buildUrl(`/feature-flags/${id}/rules`),
    addRule: (id: string) => buildUrl(`/feature-flags/${id}/rules`),
    removeRule: (id: string, ruleId: string) =>
      buildUrl(`/feature-flags/${id}/rules/${ruleId}`),
    test: (id: string) => buildUrl(`/feature-flags/${id}/test`),
  },

  /**
   * System Configuration Module Endpoints
   */
  systemConfig: {
    get: () => buildUrl('/system-config'),
    update: () => buildUrl('/system-config'),

    // Additional system config endpoints
    byKey: (key: string) => buildUrl(`/system-config/${key}`),
    updateByKey: (key: string) => buildUrl(`/system-config/${key}`),
    reset: () => buildUrl('/system-config/reset'),
    resetByKey: (key: string) => buildUrl(`/system-config/${key}/reset`),
    export: () => buildUrl('/system-config/export'),
    import: () => buildUrl('/system-config/import'),
    validate: () => buildUrl('/system-config/validate'),
    backup: () => buildUrl('/system-config/backup'),
    restore: () => buildUrl('/system-config/restore'),
    history: (params?: { page?: number; limit?: number }) =>
      addQueryParams(buildUrl('/system-config/history'), params),
    diff: (version1: string, version2: string) =>
      buildUrl(`/system-config/diff/${version1}/${version2}`),
  },

  /**
   * Health & Monitoring Endpoints
   */
  health: {
    check: () => buildUrl('/health'),
    ready: () => buildUrl('/health/ready'),
    live: () => buildUrl('/health/live'),
    metrics: () => buildUrl('/health/metrics'),

    // Additional health endpoints
    dependencies: () => buildUrl('/health/dependencies'),
    database: () => buildUrl('/health/database'),
    redis: () => buildUrl('/health/redis'),
    storage: () => buildUrl('/health/storage'),
    services: () => buildUrl('/health/services'),
  },

  /**
   * Analytics & Reporting Endpoints
   */
  analytics: {
    dashboard: (params?: { dateFrom?: string; dateTo?: string }) =>
      addQueryParams(buildUrl('/analytics/dashboard'), params),
    userActivity: (params?: { userId?: string; dateFrom?: string; dateTo?: string }) =>
      addQueryParams(buildUrl('/analytics/user-activity'), params),
    systemUsage: (params?: { dateFrom?: string; dateTo?: string }) =>
      addQueryParams(buildUrl('/analytics/system-usage'), params),
    performanceMetrics: (params?: { dateFrom?: string; dateTo?: string }) =>
      addQueryParams(buildUrl('/analytics/performance'), params),
    reports: {
      generate: () => buildUrl('/analytics/reports/generate'),
      list: (params?: { page?: number; limit?: number }) =>
        addQueryParams(buildUrl('/analytics/reports'), params),
      byId: (id: string) => buildUrl(`/analytics/reports/${id}`),
      download: (id: string, format?: 'pdf' | 'xlsx' | 'csv') =>
        addQueryParams(buildUrl(`/analytics/reports/${id}/download`), { format }),
      schedule: () => buildUrl('/analytics/reports/schedule'),
      updateSchedule: (id: string) => buildUrl(`/analytics/reports/schedule/${id}`),
      deleteSchedule: (id: string) => buildUrl(`/analytics/reports/schedule/${id}`),
    },
  },

  /**
   * File Management Endpoints
   */
  files: {
    upload: () => buildUrl('/files/upload'),
    uploadMultiple: () => buildUrl('/files/upload-multiple'),
    byId: (id: string) => buildUrl(`/files/${id}`),
    download: (id: string) => buildUrl(`/files/${id}/download`),
    delete: (id: string) => buildUrl(`/files/${id}`),
    metadata: (id: string) => buildUrl(`/files/${id}/metadata`),
    updateMetadata: (id: string) => buildUrl(`/files/${id}/metadata`),
    share: (id: string) => buildUrl(`/files/${id}/share`),
    unshare: (id: string) => buildUrl(`/files/${id}/unshare`),
    list: (params?: {
      page?: number;
      limit?: number;
      type?: string;
      userId?: string;
    }) => addQueryParams(buildUrl('/files'), params),
    search: (query: string, params?: { page?: number; limit?: number }) =>
      addQueryParams(buildUrl('/files/search'), { q: query, ...params }),
  },

  /**
   * Search & Discovery Endpoints
   */
  search: {
    global: (query: string, params?: {
      limit?: number;
      types?: string[];
      filters?: Record<string, any>;
    }) => addQueryParams(buildUrl('/search'), { q: query, ...params }),
    suggestions: (query: string, limit?: number) =>
      addQueryParams(buildUrl('/search/suggestions'), { q: query, limit }),
    recent: (params?: { limit?: number }) =>
      addQueryParams(buildUrl('/search/recent'), params),
    popular: (params?: { limit?: number; period?: string }) =>
      addQueryParams(buildUrl('/search/popular'), params),
    advanced: () => buildUrl('/search/advanced'),
  },
};

/**
 * Type-safe endpoint getter with runtime validation
 */
export function getEndpoint<T extends keyof typeof API_ENDPOINTS>(
  module: T
): typeof API_ENDPOINTS[T] {
  if (!(module in API_ENDPOINTS)) {
    throw new Error(`Invalid API module: ${String(module)}`);
  }
  return API_ENDPOINTS[module];
}

/**
 * Helper function to get nested endpoint
 */
export function getNestedEndpoint(path: string): EndpointDefinition | undefined {
  const parts = path.split('.');
  let current: any = API_ENDPOINTS;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Validate if an endpoint exists
 */
export function hasEndpoint(path: string): boolean {
  return getNestedEndpoint(path) !== undefined;
}

/**
 * Get all available endpoint paths (for documentation/testing)
 */
export function getAllEndpointPaths(): string[] {
  const paths: string[] = [];

  function traverse(obj: any, prefix: string = '') {
    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'function') {
        paths.push(currentPath);
      } else if (typeof value === 'object' && value !== null) {
        traverse(value, currentPath);
      }
    });
  }

  traverse(API_ENDPOINTS);
  return paths;
}

/**
 * Export individual endpoint modules for convenience
 */
export const authEndpoints = API_ENDPOINTS.auth;
export const userEndpoints = API_ENDPOINTS.users;
export const organizationEndpoints = API_ENDPOINTS.organizations;
export const permissionEndpoints = API_ENDPOINTS.permissions;
export const workflowEndpoints = API_ENDPOINTS.workflows;
export const notificationEndpoints = API_ENDPOINTS.notifications;
export const auditEndpoints = API_ENDPOINTS.audit;
export const featureFlagEndpoints = API_ENDPOINTS.featureFlags;
export const systemConfigEndpoints = API_ENDPOINTS.systemConfig;
export const healthEndpoints = API_ENDPOINTS.health;
export const analyticsEndpoints = API_ENDPOINTS.analytics;
export const fileEndpoints = API_ENDPOINTS.files;
export const searchEndpoints = API_ENDPOINTS.search;

/**
 * Default export for convenience
 */
export default API_ENDPOINTS;