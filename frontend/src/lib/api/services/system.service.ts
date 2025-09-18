import apiClient from '../client';
import { API_ENDPOINTS } from '../constants';
import type { PaginatedResponse, QueryParams } from '../types';

// System types
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  version: string;
  timestamp: Date;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    queue: ServiceStatus;
    storage?: ServiceStatus;
  };
  metrics?: {
    cpu: number;
    memory: number;
    disk: number;
    requests: number;
    errors: number;
  };
}

export interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  error?: string;
}

export interface SystemConfig {
  features: Record<string, boolean>;
  limits: {
    maxFileSize: number;
    maxUsers: number;
    maxOrganizations: number;
    maxRequestsPerMinute: number;
  };
  maintenance?: {
    enabled: boolean;
    message?: string;
    scheduledAt?: Date;
    estimatedDuration?: number;
  };
  publicSettings: Record<string, any>;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage?: number;
  conditions?: Record<string, any>;
  variants?: Array<{
    key: string;
    weight: number;
    payload?: any;
  }>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemStats {
  users: {
    total: number;
    active: number;
    new: number;
  };
  organizations: {
    total: number;
    active: number;
  };
  workflows: {
    total: number;
    executions: number;
    successRate: number;
  };
  storage: {
    used: number;
    total: number;
    files: number;
  };
  performance: {
    avgResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
  };
}

// System service class
class SystemService {
  /**
   * Get system health status
   */
  async getHealth(): Promise<SystemHealth> {
    return apiClient.get<SystemHealth>(API_ENDPOINTS.SYSTEM.HEALTH);
  }

  /**
   * Get system status (detailed)
   */
  async getStatus(): Promise<SystemHealth> {
    return apiClient.get<SystemHealth>(API_ENDPOINTS.SYSTEM.STATUS);
  }

  /**
   * Get system configuration
   */
  async getConfig(): Promise<SystemConfig> {
    return apiClient.get<SystemConfig>(API_ENDPOINTS.SYSTEM.CONFIG);
  }

  /**
   * Update system configuration (admin only)
   */
  async updateConfig(config: Partial<SystemConfig>): Promise<SystemConfig> {
    return apiClient.patch<SystemConfig>(API_ENDPOINTS.SYSTEM.CONFIG, config);
  }

  /**
   * Get feature flags
   */
  async getFeatureFlags(): Promise<FeatureFlag[]> {
    return apiClient.get<FeatureFlag[]>(API_ENDPOINTS.SYSTEM.FEATURES);
  }

  /**
   * Get feature flag by key
   */
  async getFeatureFlag(key: string): Promise<FeatureFlag> {
    return apiClient.get<FeatureFlag>(`${API_ENDPOINTS.SYSTEM.FEATURES}/${key}`);
  }

  /**
   * Check if feature is enabled
   */
  async isFeatureEnabled(key: string, context?: Record<string, any>): Promise<boolean> {
    const response = await apiClient.post<{ enabled: boolean }>(
      `${API_ENDPOINTS.SYSTEM.FEATURES}/${key}/check`,
      { context }
    );
    return response.enabled;
  }

  /**
   * Update feature flag (admin only)
   */
  async updateFeatureFlag(key: string, data: Partial<FeatureFlag>): Promise<FeatureFlag> {
    return apiClient.patch<FeatureFlag>(`${API_ENDPOINTS.SYSTEM.FEATURES}/${key}`, data);
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(params?: QueryParams): Promise<PaginatedResponse<AuditLog>> {
    const queryString = apiClient.buildQueryString(params);
    return apiClient.get<PaginatedResponse<AuditLog>>(
      `${API_ENDPOINTS.SYSTEM.AUDIT_LOGS}${queryString}`
    );
  }

  /**
   * Get audit log by ID
   */
  async getAuditLogById(id: string): Promise<AuditLog> {
    return apiClient.get<AuditLog>(`${API_ENDPOINTS.SYSTEM.AUDIT_LOGS}/${id}`);
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(params?: QueryParams): Promise<Blob> {
    const queryString = apiClient.buildQueryString(params);
    const response = await apiClient.get<ArrayBuffer>(
      `${API_ENDPOINTS.SYSTEM.AUDIT_LOGS}/export${queryString}`,
      { responseType: 'arraybuffer' }
    );
    return new Blob([response], { type: 'text/csv' });
  }

  /**
   * Get system statistics
   */
  async getStatistics(): Promise<SystemStats> {
    return apiClient.get<SystemStats>('/system/statistics');
  }

  /**
   * Enable maintenance mode
   */
  async enableMaintenanceMode(config: {
    message: string;
    scheduledAt?: Date;
    estimatedDuration?: number;
  }): Promise<void> {
    return apiClient.post<void>('/system/maintenance/enable', config);
  }

  /**
   * Disable maintenance mode
   */
  async disableMaintenanceMode(): Promise<void> {
    return apiClient.post<void>('/system/maintenance/disable');
  }

  /**
   * Clear system cache
   */
  async clearCache(type?: 'all' | 'data' | 'assets' | 'config'): Promise<{ cleared: number }> {
    return apiClient.post<{ cleared: number }>('/system/cache/clear', { type: type || 'all' });
  }

  /**
   * Run system diagnostics
   */
  async runDiagnostics(): Promise<any> {
    return apiClient.post('/system/diagnostics');
  }

  /**
   * Get system logs (admin only)
   */
  async getLogs(params?: { level?: string; service?: string; limit?: number }): Promise<any[]> {
    return apiClient.get('/system/logs', { params });
  }

  /**
   * Create backup (admin only)
   */
  async createBackup(): Promise<{ backupId: string; path: string }> {
    return apiClient.post<{ backupId: string; path: string }>('/system/backup');
  }

  /**
   * Restore from backup (admin only)
   */
  async restoreBackup(backupId: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`/system/backup/${backupId}/restore`);
  }
}

// Export singleton instance
export const systemService = new SystemService();