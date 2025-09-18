/**
 * Production-ready API Monitoring Service
 *
 * Comprehensive monitoring for API requests with:
 * - Real-time metrics collection
 * - Performance tracking
 * - Error rate monitoring
 * - Latency percentiles
 * - Throughput analysis
 * - Health scoring
 */

import { EventEmitter } from 'events';
import { logger } from '@/lib/errors/errorLogger';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ApiMetrics {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  statusCode: number;
  duration: number;
  timestamp: number;
  requestSize?: number;
  responseSize?: number;
  error?: Error;
  tags?: Record<string, string>;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  cached?: boolean;
}

export interface ApiEndpointMetrics {
  endpoint: string;
  method: string;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  p50Latency: number;
  p90Latency: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
  throughput: number;
  lastUpdated: number;
}

export interface ApiHealthScore {
  overall: number; // 0-100
  availability: number; // 0-100
  performance: number; // 0-100
  errorRate: number; // 0-100
  status: 'healthy' | 'degraded' | 'unhealthy';
  issues: string[];
  lastCalculated: number;
}

export interface MonitoringConfig {
  enabled: boolean;
  sampleRate: number; // 0-1, percentage of requests to track
  metricsRetentionMs: number;
  slowRequestThresholdMs: number;
  errorRateThreshold: number;
  healthCheckIntervalMs: number;
  enableAlerting: boolean;
  enableDetailedLogging: boolean;
  maxStoredMetrics: number;
}

export interface AlertConfig {
  type: 'error_rate' | 'latency' | 'availability' | 'throughput';
  threshold: number;
  duration: number; // Time window in ms
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export interface Alert {
  id: string;
  type: AlertConfig['type'];
  severity: AlertConfig['severity'];
  message: string;
  details: any;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
}

// ============================================================================
// API Monitor Class
// ============================================================================

export class ApiMonitor extends EventEmitter {
  private metrics: ApiMetrics[] = [];
  private config: MonitoringConfig;
  private endpointMetrics: Map<string, ApiEndpointMetrics> = new Map();
  private alerts: Alert[] = [];
  private alertConfigs: AlertConfig[] = [];
  private healthScore: ApiHealthScore | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsCleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<MonitoringConfig> = {}) {
    super();

    this.config = {
      enabled: true,
      sampleRate: 1.0,
      metricsRetentionMs: 24 * 60 * 60 * 1000, // 24 hours
      slowRequestThresholdMs: 2000,
      errorRateThreshold: 0.05, // 5%
      healthCheckIntervalMs: 30000, // 30 seconds
      enableAlerting: true,
      enableDetailedLogging: process.env.NODE_ENV === 'development',
      maxStoredMetrics: 10000,
      ...config,
    };

    this.initializeAlertConfigs();

    if (this.config.enabled) {
      this.startHealthCheck();
      this.startMetricsCleanup();
    }
  }

  /**
   * Initialize default alert configurations
   */
  private initializeAlertConfigs(): void {
    this.alertConfigs = [
      {
        type: 'error_rate',
        threshold: 0.1, // 10% error rate
        duration: 5 * 60 * 1000, // 5 minutes
        severity: 'high',
        enabled: true,
      },
      {
        type: 'latency',
        threshold: 5000, // 5 seconds
        duration: 2 * 60 * 1000, // 2 minutes
        severity: 'medium',
        enabled: true,
      },
      {
        type: 'availability',
        threshold: 0.95, // 95% availability
        duration: 10 * 60 * 1000, // 10 minutes
        severity: 'critical',
        enabled: true,
      },
      {
        type: 'throughput',
        threshold: 10, // 10 requests per second minimum
        duration: 5 * 60 * 1000, // 5 minutes
        severity: 'low',
        enabled: true,
      },
    ];
  }

  /**
   * Track an API request
   */
  track(metrics: ApiMetrics): void {
    if (!this.config.enabled) return;

    // Sample rate check
    if (Math.random() > this.config.sampleRate) return;

    // Store metrics
    this.metrics.push(metrics);

    // Limit stored metrics
    if (this.metrics.length > this.config.maxStoredMetrics) {
      this.metrics.shift();
    }

    // Update endpoint-specific metrics
    this.updateEndpointMetrics(metrics);

    // Check for slow requests
    if (metrics.duration > this.config.slowRequestThresholdMs) {
      this.handleSlowRequest(metrics);
    }

    // Check for errors
    if (metrics.statusCode >= 400 || metrics.error) {
      this.handleErrorRequest(metrics);
    }

    // Emit events
    this.emit('metrics', metrics);

    // Check alerts
    if (this.config.enableAlerting) {
      this.checkAlerts();
    }

    // Detailed logging in development
    if (this.config.enableDetailedLogging) {
      logger.debug('API Request tracked', {
        endpoint: metrics.endpoint,
        method: metrics.method,
        duration: metrics.duration,
        statusCode: metrics.statusCode,
      });
    }
  }

  /**
   * Update endpoint-specific metrics
   */
  private updateEndpointMetrics(metrics: ApiMetrics): void {
    const key = `${metrics.method}:${metrics.endpoint}`;
    const existing = this.endpointMetrics.get(key);

    if (!existing) {
      this.endpointMetrics.set(key, {
        endpoint: metrics.endpoint,
        method: metrics.method,
        totalRequests: 1,
        successCount: metrics.statusCode < 400 ? 1 : 0,
        errorCount: metrics.statusCode >= 400 ? 1 : 0,
        averageLatency: metrics.duration,
        minLatency: metrics.duration,
        maxLatency: metrics.duration,
        p50Latency: metrics.duration,
        p90Latency: metrics.duration,
        p95Latency: metrics.duration,
        p99Latency: metrics.duration,
        errorRate: metrics.statusCode >= 400 ? 1 : 0,
        throughput: 0,
        lastUpdated: Date.now(),
      });
    } else {
      // Update counts
      existing.totalRequests++;
      if (metrics.statusCode < 400) {
        existing.successCount++;
      } else {
        existing.errorCount++;
      }

      // Update latency stats
      existing.averageLatency =
        (existing.averageLatency * (existing.totalRequests - 1) + metrics.duration) /
        existing.totalRequests;
      existing.minLatency = Math.min(existing.minLatency, metrics.duration);
      existing.maxLatency = Math.max(existing.maxLatency, metrics.duration);

      // Update error rate
      existing.errorRate = existing.errorCount / existing.totalRequests;

      // Calculate percentiles (simplified - in production, use proper percentile calculation)
      const recentMetrics = this.getRecentMetricsForEndpoint(key, 100);
      const latencies = recentMetrics.map(m => m.duration).sort((a, b) => a - b);
      if (latencies.length > 0) {
        existing.p50Latency = this.calculatePercentile(latencies, 50);
        existing.p90Latency = this.calculatePercentile(latencies, 90);
        existing.p95Latency = this.calculatePercentile(latencies, 95);
        existing.p99Latency = this.calculatePercentile(latencies, 99);
      }

      // Calculate throughput (requests per second)
      const timeWindowMs = 60000; // 1 minute
      const recentRequests = this.getRecentMetricsForEndpoint(key, Number.MAX_SAFE_INTEGER)
        .filter(m => m.timestamp > Date.now() - timeWindowMs);
      existing.throughput = (recentRequests.length / timeWindowMs) * 1000;

      existing.lastUpdated = Date.now();
    }
  }

  /**
   * Get recent metrics for a specific endpoint
   */
  private getRecentMetricsForEndpoint(key: string, limit: number): ApiMetrics[] {
    const [method, ...endpointParts] = key.split(':');
    const endpoint = endpointParts.join(':');

    return this.metrics
      .filter(m => m.method === method && m.endpoint === endpoint)
      .slice(-limit);
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Handle slow request
   */
  private handleSlowRequest(metrics: ApiMetrics): void {
    logger.warn('Slow API request detected', {
      endpoint: metrics.endpoint,
      method: metrics.method,
      duration: metrics.duration,
      threshold: this.config.slowRequestThresholdMs,
    });

    this.emit('slow-request', metrics);
  }

  /**
   * Handle error request
   */
  private handleErrorRequest(metrics: ApiMetrics): void {
    logger.error('API request error', {
      endpoint: metrics.endpoint,
      method: metrics.method,
      statusCode: metrics.statusCode,
      error: metrics.error,
    });

    this.emit('error-request', metrics);
  }

  /**
   * Check and trigger alerts
   */
  private checkAlerts(): void {
    for (const config of this.alertConfigs) {
      if (!config.enabled) continue;

      switch (config.type) {
        case 'error_rate':
          this.checkErrorRateAlert(config);
          break;
        case 'latency':
          this.checkLatencyAlert(config);
          break;
        case 'availability':
          this.checkAvailabilityAlert(config);
          break;
        case 'throughput':
          this.checkThroughputAlert(config);
          break;
      }
    }
  }

  /**
   * Check error rate alert
   */
  private checkErrorRateAlert(config: AlertConfig): void {
    const recentMetrics = this.getMetricsInTimeWindow(config.duration);
    if (recentMetrics.length === 0) return;

    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = errorCount / recentMetrics.length;

    if (errorRate > config.threshold) {
      this.createAlert({
        type: config.type,
        severity: config.severity,
        message: `Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold ${(config.threshold * 100).toFixed(2)}%`,
        details: { errorRate, threshold: config.threshold, errorCount, totalRequests: recentMetrics.length },
      });
    }
  }

  /**
   * Check latency alert
   */
  private checkLatencyAlert(config: AlertConfig): void {
    const recentMetrics = this.getMetricsInTimeWindow(config.duration);
    if (recentMetrics.length === 0) return;

    const p95Latency = this.calculatePercentile(
      recentMetrics.map(m => m.duration).sort((a, b) => a - b),
      95
    );

    if (p95Latency > config.threshold) {
      this.createAlert({
        type: config.type,
        severity: config.severity,
        message: `P95 latency ${p95Latency}ms exceeds threshold ${config.threshold}ms`,
        details: { p95Latency, threshold: config.threshold },
      });
    }
  }

  /**
   * Check availability alert
   */
  private checkAvailabilityAlert(config: AlertConfig): void {
    const recentMetrics = this.getMetricsInTimeWindow(config.duration);
    if (recentMetrics.length === 0) return;

    const successCount = recentMetrics.filter(m => m.statusCode < 400).length;
    const availability = successCount / recentMetrics.length;

    if (availability < config.threshold) {
      this.createAlert({
        type: config.type,
        severity: config.severity,
        message: `Availability ${(availability * 100).toFixed(2)}% below threshold ${(config.threshold * 100).toFixed(2)}%`,
        details: { availability, threshold: config.threshold },
      });
    }
  }

  /**
   * Check throughput alert
   */
  private checkThroughputAlert(config: AlertConfig): void {
    const recentMetrics = this.getMetricsInTimeWindow(config.duration);
    const throughput = (recentMetrics.length / config.duration) * 1000; // requests per second

    if (throughput < config.threshold) {
      this.createAlert({
        type: config.type,
        severity: config.severity,
        message: `Throughput ${throughput.toFixed(2)} req/s below threshold ${config.threshold} req/s`,
        details: { throughput, threshold: config.threshold },
      });
    }
  }

  /**
   * Create an alert
   */
  private createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): void {
    const newAlert: Alert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      resolved: false,
    };

    // Check if similar alert already exists
    const existingAlert = this.alerts.find(
      a => a.type === newAlert.type && !a.resolved
    );

    if (!existingAlert) {
      this.alerts.push(newAlert);
      this.emit('alert', newAlert);

      logger.warn('Monitoring alert triggered', newAlert);
    }
  }

  /**
   * Get metrics in time window
   */
  private getMetricsInTimeWindow(windowMs: number): ApiMetrics[] {
    const cutoff = Date.now() - windowMs;
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  /**
   * Start health check interval
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.calculateHealthScore();
    }, this.config.healthCheckIntervalMs);

    // Initial calculation
    this.calculateHealthScore();
  }

  /**
   * Start metrics cleanup interval
   */
  private startMetricsCleanup(): void {
    this.metricsCleanupInterval = setInterval(() => {
      const cutoff = Date.now() - this.config.metricsRetentionMs;
      this.metrics = this.metrics.filter(m => m.timestamp > cutoff);

      // Clean up resolved alerts older than 1 hour
      const alertCutoff = Date.now() - 60 * 60 * 1000;
      this.alerts = this.alerts.filter(
        a => !a.resolved || (a.resolvedAt && a.resolvedAt > alertCutoff)
      );
    }, 60000); // Run every minute
  }

  /**
   * Calculate health score
   */
  private calculateHealthScore(): void {
    const recentMetrics = this.getMetricsInTimeWindow(5 * 60 * 1000); // Last 5 minutes

    if (recentMetrics.length === 0) {
      this.healthScore = {
        overall: 100,
        availability: 100,
        performance: 100,
        errorRate: 100,
        status: 'healthy',
        issues: [],
        lastCalculated: Date.now(),
      };
      return;
    }

    const issues: string[] = [];

    // Calculate availability score (based on success rate)
    const successCount = recentMetrics.filter(m => m.statusCode < 400).length;
    const availabilityRate = successCount / recentMetrics.length;
    const availabilityScore = availabilityRate * 100;

    if (availabilityScore < 95) {
      issues.push(`Low availability: ${availabilityScore.toFixed(2)}%`);
    }

    // Calculate performance score (based on latency)
    const latencies = recentMetrics.map(m => m.duration);
    const p95Latency = this.calculatePercentile(latencies.sort((a, b) => a - b), 95);
    let performanceScore = 100;

    if (p95Latency > 5000) {
      performanceScore = 0;
      issues.push(`Very high latency: ${p95Latency}ms`);
    } else if (p95Latency > 2000) {
      performanceScore = 50;
      issues.push(`High latency: ${p95Latency}ms`);
    } else if (p95Latency > 1000) {
      performanceScore = 75;
    }

    // Calculate error rate score
    const errorRate = (recentMetrics.length - successCount) / recentMetrics.length;
    let errorRateScore = 100;

    if (errorRate > 0.1) {
      errorRateScore = 0;
      issues.push(`High error rate: ${(errorRate * 100).toFixed(2)}%`);
    } else if (errorRate > 0.05) {
      errorRateScore = 50;
      issues.push(`Elevated error rate: ${(errorRate * 100).toFixed(2)}%`);
    } else if (errorRate > 0.01) {
      errorRateScore = 75;
    }

    // Calculate overall score
    const overall = (availabilityScore + performanceScore + errorRateScore) / 3;

    // Determine status
    let status: ApiHealthScore['status'] = 'healthy';
    if (overall < 50) {
      status = 'unhealthy';
    } else if (overall < 80) {
      status = 'degraded';
    }

    this.healthScore = {
      overall,
      availability: availabilityScore,
      performance: performanceScore,
      errorRate: errorRateScore,
      status,
      issues,
      lastCalculated: Date.now(),
    };

    this.emit('health-score', this.healthScore);
  }

  /**
   * Get current metrics
   */
  getMetrics(): ApiMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get endpoint metrics
   */
  getEndpointMetrics(): ApiEndpointMetrics[] {
    return Array.from(this.endpointMetrics.values());
  }

  /**
   * Get metrics for specific endpoint
   */
  getEndpointMetric(endpoint: string, method: string): ApiEndpointMetrics | undefined {
    return this.endpointMetrics.get(`${method}:${endpoint}`);
  }

  /**
   * Get overall statistics
   */
  getOverallStats(): {
    totalRequests: number;
    successRate: number;
    errorRate: number;
    averageLatency: number;
    p95Latency: number;
    throughput: number;
  } {
    if (this.metrics.length === 0) {
      return {
        totalRequests: 0,
        successRate: 100,
        errorRate: 0,
        averageLatency: 0,
        p95Latency: 0,
        throughput: 0,
      };
    }

    const totalRequests = this.metrics.length;
    const successCount = this.metrics.filter(m => m.statusCode < 400).length;
    const successRate = (successCount / totalRequests) * 100;
    const errorRate = 100 - successRate;

    const totalLatency = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const averageLatency = totalLatency / totalRequests;

    const sortedLatencies = this.metrics.map(m => m.duration).sort((a, b) => a - b);
    const p95Latency = this.calculatePercentile(sortedLatencies, 95);

    // Calculate throughput (requests per second) for last minute
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = this.metrics.filter(m => m.timestamp > oneMinuteAgo);
    const throughput = recentRequests.length / 60;

    return {
      totalRequests,
      successRate,
      errorRate,
      averageLatency,
      p95Latency,
      throughput,
    };
  }

  /**
   * Get health score
   */
  getHealthScore(): ApiHealthScore | null {
    return this.healthScore;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      this.emit('alert-resolved', alert);
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.endpointMetrics.clear();
    this.alerts = [];
    this.healthScore = null;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart intervals if needed
    if (this.config.enabled) {
      if (!this.healthCheckInterval) {
        this.startHealthCheck();
      }
      if (!this.metricsCleanupInterval) {
        this.startMetricsCleanup();
      }
    } else {
      this.stop();
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.metricsCleanupInterval) {
      clearInterval(this.metricsCleanupInterval);
      this.metricsCleanupInterval = null;
    }
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): {
    metrics: ApiMetrics[];
    endpointMetrics: ApiEndpointMetrics[];
    healthScore: ApiHealthScore | null;
    alerts: Alert[];
    config: MonitoringConfig;
    exported: number;
  } {
    return {
      metrics: this.metrics,
      endpointMetrics: Array.from(this.endpointMetrics.values()),
      healthScore: this.healthScore,
      alerts: this.alerts,
      config: this.config,
      exported: Date.now(),
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const apiMonitor = new ApiMonitor({
  enabled: process.env.NEXT_PUBLIC_ENABLE_MONITORING === 'true',
  sampleRate: parseFloat(process.env.NEXT_PUBLIC_MONITORING_SAMPLE_RATE || '1.0'),
  slowRequestThresholdMs: parseInt(process.env.NEXT_PUBLIC_SLOW_REQUEST_THRESHOLD || '2000'),
  errorRateThreshold: parseFloat(process.env.NEXT_PUBLIC_ERROR_RATE_THRESHOLD || '0.05'),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Track API request helper
 */
export function trackApiRequest(metrics: ApiMetrics): void {
  apiMonitor.track(metrics);
}

/**
 * Get API health score
 */
export function getApiHealthScore(): ApiHealthScore | null {
  return apiMonitor.getHealthScore();
}

/**
 * Get overall API statistics
 */
export function getApiStats(): ReturnType<typeof apiMonitor.getOverallStats> {
  return apiMonitor.getOverallStats();
}

/**
 * Subscribe to monitoring events
 */
export function subscribeToMonitoring(
  event: 'metrics' | 'slow-request' | 'error-request' | 'alert' | 'alert-resolved' | 'health-score',
  callback: (data: any) => void
): () => void {
  apiMonitor.on(event, callback);
  return () => apiMonitor.off(event, callback);
}

export default apiMonitor;