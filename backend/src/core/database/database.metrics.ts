import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface QueryMetrics {
  operation: string;
  model: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface ConnectionMetrics {
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalConnections: number;
  timestamp: Date;
}

export interface DatabaseHealthMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorRate: number;
  throughput: number;
  timestamp: Date;
}

@Injectable()
export class DatabaseMetricsService {
  private readonly logger = new Logger(DatabaseMetricsService.name);
  private queryMetrics: QueryMetrics[] = [];
  private connectionMetrics: ConnectionMetrics[] = [];
  private healthMetrics: DatabaseHealthMetrics[] = [];
  private readonly metricsWindowSize = 100; // Keep last 100 records
  private readonly metricsAggregationInterval = 60000; // 1 minute

  constructor(private eventEmitter: EventEmitter2) {
    this.startMetricsAggregation();
  }

  recordQuery(metrics: QueryMetrics): void {
    this.queryMetrics.push(metrics);

    // Keep only recent metrics
    if (this.queryMetrics.length > this.metricsWindowSize) {
      this.queryMetrics = this.queryMetrics.slice(-this.metricsWindowSize);
    }

    // Emit event for monitoring systems
    this.eventEmitter.emit('database.query', metrics);

    // Log slow queries
    if (metrics.duration > 1000) {
      this.logger.warn(
        `Slow query detected: ${metrics.model}.${metrics.operation} took ${metrics.duration}ms`,
      );
    }
  }

  recordConnection(metrics: ConnectionMetrics): void {
    this.connectionMetrics.push(metrics);

    if (this.connectionMetrics.length > this.metricsWindowSize) {
      this.connectionMetrics = this.connectionMetrics.slice(
        -this.metricsWindowSize,
      );
    }

    this.eventEmitter.emit('database.connection', metrics);
  }

  recordHealth(metrics: DatabaseHealthMetrics): void {
    this.healthMetrics.push(metrics);

    if (this.healthMetrics.length > this.metricsWindowSize) {
      this.healthMetrics = this.healthMetrics.slice(-this.metricsWindowSize);
    }

    this.eventEmitter.emit('database.health', metrics);

    // Alert on unhealthy status
    if (metrics.status === 'unhealthy') {
      this.logger.error('Database is unhealthy', metrics);
    } else if (metrics.status === 'degraded') {
      this.logger.warn('Database performance degraded', metrics);
    }
  }

  getQueryStats(): {
    totalQueries: number;
    averageDuration: number;
    slowQueries: number;
    errorRate: number;
    queryDistribution: Record<string, number>;
  } {
    const recentQueries = this.queryMetrics.slice(-100);

    if (recentQueries.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowQueries: 0,
        errorRate: 0,
        queryDistribution: {},
      };
    }

    const totalQueries = recentQueries.length;
    const totalDuration = recentQueries.reduce((sum, q) => sum + q.duration, 0);
    const slowQueries = recentQueries.filter((q) => q.duration > 1000).length;
    const errors = recentQueries.filter((q) => !q.success).length;

    const queryDistribution: Record<string, number> = {};
    recentQueries.forEach((q) => {
      const key = `${q.model}.${q.operation}`;
      queryDistribution[key] = (queryDistribution[key] || 0) + 1;
    });

    return {
      totalQueries,
      averageDuration: Math.round(totalDuration / totalQueries),
      slowQueries,
      errorRate: (errors / totalQueries) * 100,
      queryDistribution,
    };
  }

  getConnectionStats(): {
    currentConnections: ConnectionMetrics | null;
    averageActiveConnections: number;
    maxConnections: number;
    connectionUtilization: number;
  } {
    if (this.connectionMetrics.length === 0) {
      return {
        currentConnections: null,
        averageActiveConnections: 0,
        maxConnections: 0,
        connectionUtilization: 0,
      };
    }

    const currentConnections =
      this.connectionMetrics[this.connectionMetrics.length - 1];
    const recentMetrics = this.connectionMetrics.slice(-10);

    const avgActive =
      recentMetrics.reduce((sum, m) => sum + m.activeConnections, 0) /
      recentMetrics.length;
    const maxConnections = Math.max(
      ...recentMetrics.map((m) => m.totalConnections),
    );
    const utilization =
      currentConnections.totalConnections > 0
        ? (currentConnections.activeConnections /
            currentConnections.totalConnections) *
          100
        : 0;

    return {
      currentConnections,
      averageActiveConnections: Math.round(avgActive),
      maxConnections,
      connectionUtilization: Math.round(utilization),
    };
  }

  getHealthStatus(): DatabaseHealthMetrics | null {
    if (this.healthMetrics.length === 0) {
      return null;
    }

    return this.healthMetrics[this.healthMetrics.length - 1];
  }

  getAllMetrics(): {
    queries: ReturnType<typeof this.getQueryStats>;
    connections: ReturnType<typeof this.getConnectionStats>;
    health: DatabaseHealthMetrics | null;
  } {
    return {
      queries: this.getQueryStats(),
      connections: this.getConnectionStats(),
      health: this.getHealthStatus(),
    };
  }

  private startMetricsAggregation(): void {
    setInterval(() => {
      const metrics = this.getAllMetrics();

      // Log aggregated metrics
      this.logger.debug('Database metrics aggregation', metrics);

      // Emit aggregated metrics for monitoring
      this.eventEmitter.emit('database.metrics.aggregated', metrics);
    }, this.metricsAggregationInterval);
  }

  reset(): void {
    this.queryMetrics = [];
    this.connectionMetrics = [];
    this.healthMetrics = [];
  }
}
