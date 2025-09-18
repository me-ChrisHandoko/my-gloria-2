/**
 * Performance Monitoring and Metrics Service
 *
 * Production-ready service for monitoring API performance.
 * Features:
 * - Real-time performance metrics
 * - Request/Response tracking
 * - Error rate monitoring
 * - Latency percentiles (P50, P90, P95, P99)
 * - Resource usage tracking
 * - Performance budgets and alerts
 * - Integration with analytics platforms
 */

import { logger } from '@/lib/errors/errorLogger';

export interface PerformanceMetrics {
  // Request metrics
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;

  // Latency metrics
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  p50Latency: number;
  p90Latency: number;
  p95Latency: number;
  p99Latency: number;

  // Throughput metrics
  requestsPerSecond: number;
  bytesReceived: number;
  bytesSent: number;

  // Resource metrics
  cacheHitRate: number;
  activeConnections: number;
  queuedRequests: number;

  // Performance scores
  performanceScore: number;
  availabilityScore: number;
}

interface RequestMetric {
  endpoint: string;
  method: string;
  timestamp: number;
  duration: number;
  statusCode: number;
  bytesReceived: number;
  bytesSent: number;
  cached: boolean;
  error?: Error;
  metadata?: Record<string, any>;
}

interface PerformanceBudget {
  metric: keyof PerformanceMetrics;
  threshold: number;
  severity: 'warning' | 'error' | 'critical';
}

interface PerformanceAlert {
  metric: string;
  value: number;
  threshold: number;
  severity: string;
  timestamp: number;
  message: string;
}

export class PerformanceMonitor {
  private metrics: RequestMetric[] = [];
  private budgets: PerformanceBudget[] = [];
  private alerts: PerformanceAlert[] = [];
  private listeners: Set<(metrics: PerformanceMetrics) => void> = new Set();
  private metricsInterval: NodeJS.Timeout | null = null;
  private maxMetricsSize = 10000;
  private aggregationInterval = 60000; // 1 minute
  private lastAggregation = Date.now();

  constructor() {
    this.initializeDefaultBudgets();
    this.startMetricsAggregation();
    this.setupPerformanceObserver();
  }

  /**
   * Initialize default performance budgets
   */
  private initializeDefaultBudgets(): void {
    this.budgets = [
      { metric: 'averageLatency', threshold: 500, severity: 'warning' },
      { metric: 'averageLatency', threshold: 1000, severity: 'error' },
      { metric: 'averageLatency', threshold: 2000, severity: 'critical' },
      { metric: 'errorRate', threshold: 1, severity: 'warning' },
      { metric: 'errorRate', threshold: 5, severity: 'error' },
      { metric: 'errorRate', threshold: 10, severity: 'critical' },
      { metric: 'p95Latency', threshold: 1000, severity: 'warning' },
      { metric: 'p95Latency', threshold: 2000, severity: 'error' },
      { metric: 'p99Latency', threshold: 3000, severity: 'critical' },
    ];
  }

  /**
   * Setup Performance Observer API
   */
  private setupPerformanceObserver(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource' && entry.name.includes('/api/')) {
            this.trackResourceTiming(entry as PerformanceResourceTiming);
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      logger.warn('Failed to setup PerformanceObserver', { error });
    }
  }

  /**
   * Track resource timing from Performance API
   */
  private trackResourceTiming(entry: PerformanceResourceTiming): void {
    const metric: RequestMetric = {
      endpoint: new URL(entry.name).pathname,
      method: 'GET', // Performance API doesn't provide method
      timestamp: entry.startTime,
      duration: entry.duration,
      statusCode: 200, // Assumed successful if in resource timing
      bytesReceived: entry.transferSize,
      bytesSent: 0, // Not available in resource timing
      cached: entry.transferSize === 0,
      metadata: {
        dns: entry.domainLookupEnd - entry.domainLookupStart,
        tcp: entry.connectEnd - entry.connectStart,
        ttfb: entry.responseStart - entry.requestStart,
      },
    };

    this.addMetric(metric);
  }

  /**
   * Track API request
   */
  trackRequest(metric: RequestMetric): void {
    this.addMetric(metric);
    this.checkBudgets(metric);
    this.notifyListeners();
  }

  /**
   * Add metric to collection
   */
  private addMetric(metric: RequestMetric): void {
    this.metrics.push(metric);

    // Maintain size limit
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }

    logger.debug('Request tracked', {
      endpoint: metric.endpoint,
      duration: metric.duration,
      status: metric.statusCode,
    });
  }

  /**
   * Start metrics aggregation
   */
  private startMetricsAggregation(): void {
    this.metricsInterval = setInterval(() => {
      this.aggregateMetrics();
    }, this.aggregationInterval);
  }

  /**
   * Aggregate metrics
   */
  private aggregateMetrics(): void {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(
      m => m.timestamp > now - this.aggregationInterval
    );

    if (recentMetrics.length === 0) return;

    const aggregated = this.calculateMetrics(recentMetrics);
    this.sendToAnalytics(aggregated);
    this.lastAggregation = now;

    logger.info('Metrics aggregated', {
      period: this.aggregationInterval,
      requests: recentMetrics.length,
      avgLatency: aggregated.averageLatency,
      errorRate: aggregated.errorRate,
    });
  }

  /**
   * Calculate performance metrics
   */
  calculateMetrics(
    metrics: RequestMetric[] = this.metrics
  ): PerformanceMetrics {
    if (metrics.length === 0) {
      return this.getEmptyMetrics();
    }

    const successful = metrics.filter(m => m.statusCode < 400);
    const failed = metrics.filter(m => m.statusCode >= 400);
    const latencies = metrics.map(m => m.duration).sort((a, b) => a - b);

    // Calculate time window
    const timeWindow = (Date.now() - Math.min(...metrics.map(m => m.timestamp))) / 1000;

    return {
      // Request metrics
      totalRequests: metrics.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      errorRate: (failed.length / metrics.length) * 100,

      // Latency metrics
      averageLatency: this.average(latencies),
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      p50Latency: this.percentile(latencies, 50),
      p90Latency: this.percentile(latencies, 90),
      p95Latency: this.percentile(latencies, 95),
      p99Latency: this.percentile(latencies, 99),

      // Throughput metrics
      requestsPerSecond: metrics.length / Math.max(timeWindow, 1),
      bytesReceived: metrics.reduce((sum, m) => sum + m.bytesReceived, 0),
      bytesSent: metrics.reduce((sum, m) => sum + m.bytesSent, 0),

      // Resource metrics
      cacheHitRate: (metrics.filter(m => m.cached).length / metrics.length) * 100,
      activeConnections: this.getActiveConnections(),
      queuedRequests: this.getQueuedRequests(),

      // Performance scores
      performanceScore: this.calculatePerformanceScore(metrics),
      availabilityScore: this.calculateAvailabilityScore(metrics),
    };
  }

  /**
   * Calculate average
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate percentile
   */
  private percentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[Math.max(0, index)];
  }

  /**
   * Calculate performance score (0-100)
   */
  private calculatePerformanceScore(metrics: RequestMetric[]): number {
    if (metrics.length === 0) return 100;

    let score = 100;

    // Deduct for slow requests
    const slowRequests = metrics.filter(m => m.duration > 1000);
    score -= (slowRequests.length / metrics.length) * 30;

    // Deduct for very slow requests
    const verySlowRequests = metrics.filter(m => m.duration > 3000);
    score -= (verySlowRequests.length / metrics.length) * 40;

    // Deduct for errors
    const errors = metrics.filter(m => m.statusCode >= 500);
    score -= (errors.length / metrics.length) * 30;

    return Math.max(0, Math.round(score));
  }

  /**
   * Calculate availability score (0-100)
   */
  private calculateAvailabilityScore(metrics: RequestMetric[]): number {
    if (metrics.length === 0) return 100;

    const successful = metrics.filter(m => m.statusCode < 500);
    return Math.round((successful.length / metrics.length) * 100);
  }

  /**
   * Get active connections (placeholder)
   */
  private getActiveConnections(): number {
    // This would integrate with your connection pooling
    return 0;
  }

  /**
   * Get queued requests (placeholder)
   */
  private getQueuedRequests(): number {
    // This would integrate with your request queue
    return 0;
  }

  /**
   * Check performance budgets
   */
  private checkBudgets(metric: RequestMetric): void {
    const currentMetrics = this.calculateMetrics();

    for (const budget of this.budgets) {
      const value = currentMetrics[budget.metric] as number;

      if (value > budget.threshold) {
        this.createAlert({
          metric: budget.metric,
          value,
          threshold: budget.threshold,
          severity: budget.severity,
          timestamp: Date.now(),
          message: `${budget.metric} exceeded threshold: ${value} > ${budget.threshold}`,
        });
      }
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);

    // Keep only recent alerts
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.alerts = this.alerts.filter(a => a.timestamp > oneHourAgo);

    // Log based on severity
    switch (alert.severity) {
      case 'critical':
        logger.error('Critical performance alert', new Error(alert.message), {
          metric: alert.metric,
          value: alert.value,
          threshold: alert.threshold,
        });
        break;
      case 'error':
        logger.error('Performance alert', new Error(alert.message), {
          metric: alert.metric,
          value: alert.value,
        });
        break;
      case 'warning':
        logger.warn('Performance warning', {
          metric: alert.metric,
          value: alert.value,
          threshold: alert.threshold,
        });
        break;
    }

    // Send to monitoring service
    this.sendAlert(alert);
  }

  /**
   * Send alert to monitoring service
   */
  private sendAlert(alert: PerformanceAlert): void {
    // Integration with external monitoring
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('Performance Alert', alert);
    }
  }

  /**
   * Send metrics to analytics
   */
  private sendToAnalytics(metrics: PerformanceMetrics): void {
    // Integration with analytics platforms
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('Performance Metrics', metrics);
    }
  }

  /**
   * Notify listeners
   */
  private notifyListeners(): void {
    const metrics = this.calculateMetrics();
    this.listeners.forEach(listener => listener(metrics));
  }

  /**
   * Subscribe to metrics updates
   */
  subscribe(listener: (metrics: PerformanceMetrics) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Set performance budget
   */
  setBudget(budget: PerformanceBudget): void {
    this.budgets.push(budget);
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return this.calculateMetrics();
  }

  /**
   * Get metrics for specific endpoint
   */
  getEndpointMetrics(endpoint: string): PerformanceMetrics {
    const endpointMetrics = this.metrics.filter(m => m.endpoint === endpoint);
    return this.calculateMetrics(endpointMetrics);
  }

  /**
   * Get recent alerts
   */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.alerts = [];
  }

  /**
   * Get empty metrics object
   */
  private getEmptyMetrics(): PerformanceMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      errorRate: 0,
      averageLatency: 0,
      minLatency: 0,
      maxLatency: 0,
      p50Latency: 0,
      p90Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      requestsPerSecond: 0,
      bytesReceived: 0,
      bytesSent: 0,
      cacheHitRate: 0,
      activeConnections: 0,
      queuedRequests: 0,
      performanceScore: 100,
      availabilityScore: 100,
    };
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    const data = {
      metrics: this.metrics,
      alerts: this.alerts,
      aggregated: this.calculateMetrics(),
      timestamp: Date.now(),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Destroy monitor
   */
  destroy(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    this.listeners.clear();
    this.clearMetrics();
    logger.info('Performance monitor destroyed');
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export helper functions
export const trackApiRequest = (metric: RequestMetric): void =>
  performanceMonitor.trackRequest(metric);

export const getPerformanceMetrics = (): PerformanceMetrics =>
  performanceMonitor.getMetrics();

export const subscribeToMetrics = (
  listener: (metrics: PerformanceMetrics) => void
): (() => void) => performanceMonitor.subscribe(listener);

export const setPerformanceBudget = (budget: PerformanceBudget): void =>
  performanceMonitor.setBudget(budget);

export const getPerformanceAlerts = (): PerformanceAlert[] =>
  performanceMonitor.getAlerts();