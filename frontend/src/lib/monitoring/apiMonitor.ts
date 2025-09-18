import * as Sentry from '@sentry/nextjs';

export interface ApiMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: number;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  error?: boolean;
  errorMessage?: string;
}

export interface ApiPerformanceStats {
  endpoint: string;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  totalRequests: number;
  errorRate: number;
  successRate: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
}

class ApiMonitor {
  private metrics: ApiMetrics[] = [];
  private readonly maxMetricsSize = 1000;
  private readonly slowRequestThreshold = 2000; // 2 seconds
  private readonly criticalEndpoints = ['/auth/', '/payments/', '/users/'];
  private performanceObserver: PerformanceObserver | null = null;

  constructor() {
    this.initPerformanceObserver();
    this.startPeriodicReporting();
  }

  /**
   * Initialize Performance Observer for detailed timing metrics
   */
  private initPerformanceObserver() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource' && entry.name.includes('/api/')) {
              this.trackResourceTiming(entry as PerformanceResourceTiming);
            }
          }
        });

        this.performanceObserver.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.error('Failed to initialize PerformanceObserver:', error);
      }
    }
  }

  /**
   * Track resource timing from Performance API
   */
  private trackResourceTiming(entry: PerformanceResourceTiming) {
    const timing = {
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      tls: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
      ttfb: entry.responseStart - entry.requestStart,
      download: entry.responseEnd - entry.responseStart,
      total: entry.responseEnd - entry.startTime,
    };

    // Log detailed timing for slow requests
    if (timing.total > this.slowRequestThreshold) {
      console.warn('Slow request detected:', {
        url: entry.name,
        timing,
      });
    }
  }

  /**
   * Track API request metrics
   */
  track(metrics: ApiMetrics) {
    // Add to metrics array
    this.metrics.push({
      ...metrics,
      sessionId: this.getSessionId(),
    });

    // Maintain size limit
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }

    // Send to analytics service
    this.sendToAnalytics(metrics);

    // Log slow requests
    if (metrics.duration > this.slowRequestThreshold) {
      this.logSlowRequest(metrics);
    }

    // Monitor critical endpoints
    if (this.isCriticalEndpoint(metrics.endpoint)) {
      this.monitorCriticalEndpoint(metrics);
    }

    // Track errors
    if (metrics.error) {
      this.trackError(metrics);
    }
  }

  /**
   * Send metrics to analytics service
   */
  private sendToAnalytics(metrics: ApiMetrics) {
    // Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'api_request', {
        event_category: 'API',
        event_label: `${metrics.method} ${metrics.endpoint}`,
        value: metrics.duration,
        custom_dimensions: {
          status_code: metrics.statusCode,
          success: !metrics.error,
          request_id: metrics.requestId,
        },
      });
    }

    // Mixpanel
    if (typeof window !== 'undefined' && (window as any).mixpanel) {
      (window as any).mixpanel.track('API Request', {
        endpoint: metrics.endpoint,
        method: metrics.method,
        status_code: metrics.statusCode,
        duration: metrics.duration,
        success: !metrics.error,
        request_id: metrics.requestId,
      });
    }

    // Custom analytics endpoint
    if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
      this.sendToCustomAnalytics(metrics);
    }
  }

  /**
   * Send to custom analytics endpoint
   */
  private async sendToCustomAnalytics(metrics: ApiMetrics) {
    try {
      await fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'api_metrics',
          data: metrics,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to send analytics:', error);
    }
  }

  /**
   * Log slow requests
   */
  private logSlowRequest(metrics: ApiMetrics) {
    const warning = `Slow API request: ${metrics.method} ${metrics.endpoint} took ${metrics.duration}ms`;
    console.warn(warning, metrics);

    // Report to Sentry
    if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
      Sentry.captureMessage(warning, 'warning');
    }
  }

  /**
   * Monitor critical endpoints
   */
  private monitorCriticalEndpoint(metrics: ApiMetrics) {
    if (metrics.error || metrics.statusCode >= 500) {
      const alert = `Critical endpoint failure: ${metrics.method} ${metrics.endpoint}`;
      console.error(alert, metrics);

      // Send immediate alert
      if (typeof Sentry !== 'undefined' && Sentry.captureException) {
        Sentry.captureException(new Error(alert), {
          extra: metrics,
        });
      }
    }
  }

  /**
   * Track API errors
   */
  private trackError(metrics: ApiMetrics) {
    const errorData = {
      endpoint: metrics.endpoint,
      method: metrics.method,
      statusCode: metrics.statusCode,
      duration: metrics.duration,
      errorMessage: metrics.errorMessage,
      requestId: metrics.requestId,
    };

    // Log to console
    console.error('API Error:', errorData);

    // Report to Sentry
    if (typeof Sentry !== 'undefined' && Sentry.captureException) {
      Sentry.captureException(new Error(metrics.errorMessage || 'API Request Failed'), {
        extra: errorData,
        tags: {
          api_endpoint: metrics.endpoint,
          http_status: metrics.statusCode.toString(),
        },
      });
    }
  }

  /**
   * Check if endpoint is critical
   */
  private isCriticalEndpoint(endpoint: string): boolean {
    return this.criticalEndpoints.some(critical => endpoint.includes(critical));
  }

  /**
   * Get or create session ID
   */
  private getSessionId(): string {
    if (typeof window === 'undefined') return '';

    let sessionId = sessionStorage.getItem('api_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      sessionStorage.setItem('api_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Get all metrics
   */
  getMetrics(): ApiMetrics[] {
    return this.metrics;
  }

  /**
   * Get metrics for specific endpoint
   */
  getEndpointMetrics(endpoint: string): ApiMetrics[] {
    return this.metrics.filter(m => m.endpoint === endpoint);
  }

  /**
   * Calculate average response time
   */
  getAverageResponseTime(endpoint?: string): number {
    const relevantMetrics = endpoint
      ? this.metrics.filter(m => m.endpoint === endpoint)
      : this.metrics;

    if (relevantMetrics.length === 0) return 0;

    const sum = relevantMetrics.reduce((acc, m) => acc + m.duration, 0);
    return Math.round(sum / relevantMetrics.length);
  }

  /**
   * Calculate error rate
   */
  getErrorRate(endpoint?: string): number {
    const relevantMetrics = endpoint
      ? this.metrics.filter(m => m.endpoint === endpoint)
      : this.metrics;

    if (relevantMetrics.length === 0) return 0;

    const errors = relevantMetrics.filter(m => m.error || m.statusCode >= 400);
    return Math.round((errors.length / relevantMetrics.length) * 100);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(endpoint?: string): ApiPerformanceStats | ApiPerformanceStats[] {
    if (endpoint) {
      return this.calculateStats(this.getEndpointMetrics(endpoint), endpoint);
    }

    // Group by endpoint
    const groupedMetrics = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.endpoint]) {
        acc[metric.endpoint] = [];
      }
      acc[metric.endpoint].push(metric);
      return acc;
    }, {} as Record<string, ApiMetrics[]>);

    return Object.entries(groupedMetrics).map(([endpoint, metrics]) =>
      this.calculateStats(metrics, endpoint)
    );
  }

  /**
   * Calculate statistics for metrics
   */
  private calculateStats(metrics: ApiMetrics[], endpoint: string): ApiPerformanceStats {
    if (metrics.length === 0) {
      return {
        endpoint,
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        totalRequests: 0,
        errorRate: 0,
        successRate: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
      };
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const errors = metrics.filter(m => m.error || m.statusCode >= 400);

    return {
      endpoint,
      avgResponseTime: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      minResponseTime: durations[0],
      maxResponseTime: durations[durations.length - 1],
      totalRequests: metrics.length,
      errorRate: Math.round((errors.length / metrics.length) * 100),
      successRate: Math.round(((metrics.length - errors.length) / metrics.length) * 100),
      p95ResponseTime: durations[Math.floor(durations.length * 0.95)],
      p99ResponseTime: durations[Math.floor(durations.length * 0.99)],
    };
  }

  /**
   * Start periodic reporting
   */
  private startPeriodicReporting() {
    if (typeof window === 'undefined') return;

    // Report stats every 5 minutes
    setInterval(() => {
      const stats = this.getPerformanceStats();
      console.log('API Performance Report:', stats);

      // Send aggregated metrics
      if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
        this.sendToCustomAnalytics({
          endpoint: '/aggregate',
          method: 'REPORT',
          statusCode: 200,
          duration: 0,
          timestamp: Date.now(),
        });
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Export metrics for debugging
   */
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = [];
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    this.clearMetrics();
  }
}

// Create singleton instance
export const apiMonitor = new ApiMonitor();

// Export for testing
export { ApiMonitor };