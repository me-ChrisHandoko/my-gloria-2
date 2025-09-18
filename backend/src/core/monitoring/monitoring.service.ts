import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge, register } from 'prom-client';

@Injectable()
export class MonitoringService {
  private readonly httpRequestDuration: Histogram<string>;
  private readonly httpRequestTotal: Counter<string>;
  private readonly httpRequestErrors: Counter<string>;
  private readonly activeConnections: Gauge<string>;
  private readonly databaseQueryDuration: Histogram<string>;
  private readonly cacheHits: Counter<string>;
  private readonly cacheMisses: Counter<string>;
  private readonly queueJobsProcessed: Counter<string>;
  private readonly queueJobsFailed: Counter<string>;
  private readonly authAttempts: Counter<string>;
  private readonly businessMetrics: Map<
    string,
    Counter<string> | Gauge<string>
  >;

  constructor() {
    // HTTP Metrics
    this.httpRequestDuration = new Histogram({
      name: 'gloria_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    });

    this.httpRequestTotal = new Counter({
      name: 'gloria_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestErrors = new Counter({
      name: 'gloria_http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
    });

    this.activeConnections = new Gauge({
      name: 'gloria_active_connections',
      help: 'Number of active connections',
      labelNames: ['type'],
    });

    // Database Metrics
    this.databaseQueryDuration = new Histogram({
      name: 'gloria_database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    // Cache Metrics
    this.cacheHits = new Counter({
      name: 'gloria_cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_name'],
    });

    this.cacheMisses = new Counter({
      name: 'gloria_cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_name'],
    });

    // Queue Metrics
    this.queueJobsProcessed = new Counter({
      name: 'gloria_queue_jobs_processed_total',
      help: 'Total number of queue jobs processed',
      labelNames: ['queue_name', 'job_type'],
    });

    this.queueJobsFailed = new Counter({
      name: 'gloria_queue_jobs_failed_total',
      help: 'Total number of queue jobs failed',
      labelNames: ['queue_name', 'job_type', 'error_type'],
    });

    // Authentication Metrics
    this.authAttempts = new Counter({
      name: 'gloria_auth_attempts_total',
      help: 'Total number of authentication attempts',
      labelNames: ['type', 'result'],
    });

    // Business Metrics Registry
    this.businessMetrics = new Map();

    // Register all metrics
    register.registerMetric(this.httpRequestDuration);
    register.registerMetric(this.httpRequestTotal);
    register.registerMetric(this.httpRequestErrors);
    register.registerMetric(this.activeConnections);
    register.registerMetric(this.databaseQueryDuration);
    register.registerMetric(this.cacheHits);
    register.registerMetric(this.cacheMisses);
    register.registerMetric(this.queueJobsProcessed);
    register.registerMetric(this.queueJobsFailed);
    register.registerMetric(this.authAttempts);
  }

  // HTTP Metrics Methods
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
  ): void {
    this.httpRequestDuration.observe(
      { method, route, status_code: statusCode.toString() },
      duration,
    );
    this.httpRequestTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });
  }

  recordHttpError(method: string, route: string, errorType: string): void {
    this.httpRequestErrors.inc({ method, route, error_type: errorType });
  }

  setActiveConnections(type: string, count: number): void {
    this.activeConnections.set({ type }, count);
  }

  // Database Metrics Methods
  recordDatabaseQuery(
    operation: string,
    table: string,
    duration: number,
  ): void {
    this.databaseQueryDuration.observe({ operation, table }, duration);
  }

  // Cache Metrics Methods
  recordCacheHit(cacheName: string): void {
    this.cacheHits.inc({ cache_name: cacheName });
  }

  recordCacheMiss(cacheName: string): void {
    this.cacheMisses.inc({ cache_name: cacheName });
  }

  // Queue Metrics Methods
  recordQueueJobProcessed(queueName: string, jobType: string): void {
    this.queueJobsProcessed.inc({ queue_name: queueName, job_type: jobType });
  }

  recordQueueJobFailed(
    queueName: string,
    jobType: string,
    errorType: string,
  ): void {
    this.queueJobsFailed.inc({
      queue_name: queueName,
      job_type: jobType,
      error_type: errorType,
    });
  }

  // Authentication Metrics Methods
  recordAuthAttempt(type: string, result: 'success' | 'failure'): void {
    this.authAttempts.inc({ type, result });
  }

  // Business Metrics Methods
  registerBusinessMetric(
    name: string,
    type: 'counter' | 'gauge',
    help: string,
    labelNames?: string[],
  ): void {
    const metricName = `gloria_business_${name}`;

    if (this.businessMetrics.has(metricName)) {
      return;
    }

    let metric: Counter<string> | Gauge<string>;

    if (type === 'counter') {
      metric = new Counter({
        name: metricName,
        help,
        labelNames: labelNames || [],
      });
    } else {
      metric = new Gauge({
        name: metricName,
        help,
        labelNames: labelNames || [],
      });
    }

    this.businessMetrics.set(metricName, metric);
    register.registerMetric(metric);
  }

  incrementBusinessCounter(
    name: string,
    labels?: Record<string, string>,
  ): void {
    const metricName = `gloria_business_${name}`;
    const metric = this.businessMetrics.get(metricName);

    if (metric && metric instanceof Counter) {
      metric.inc(labels || {});
    }
  }

  setBusinessGauge(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    const metricName = `gloria_business_${name}`;
    const metric = this.businessMetrics.get(metricName);

    if (metric && metric instanceof Gauge) {
      metric.set(labels || {}, value);
    }
  }

  // Utility Methods
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  async getMetricsContentType(): Promise<string> {
    return register.contentType;
  }

  resetMetrics(): void {
    register.clear();
  }
}
