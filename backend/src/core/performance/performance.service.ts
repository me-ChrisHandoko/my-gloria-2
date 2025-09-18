import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { LoggingService } from '../logging/logging.service';

interface PerformanceMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    user: number;
    system: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  eventLoop: {
    lag: number;
    utilization: number;
  };
  gc: {
    count: number;
    duration: number;
  };
}

interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  evictions: number;
}

@Injectable()
export class PerformanceService {
  private readonly logger: LoggingService;
  private readonly metrics: PerformanceMetrics[] = [];
  private readonly maxMetricsHistory = 100;
  private gcStats = { count: 0, duration: 0 };
  private eventLoopLag = 0;
  private cacheStats = { hits: 0, misses: 0, evictions: 0 };

  constructor(
    private readonly cacheService: CacheService,
    private readonly loggingService: LoggingService,
  ) {
    this.logger = this.loggingService.getLogger(PerformanceService.name);
    this.startMonitoring();
  }

  /**
   * Start performance monitoring
   */
  private startMonitoring(): void {
    // Monitor event loop lag
    this.monitorEventLoopLag();

    // Collect metrics every 30 seconds
    setInterval(() => {
      this.collectMetrics();
    }, 30000);

    // Monitor garbage collection
    this.monitorGarbageCollection();
  }

  /**
   * Monitor event loop lag
   */
  private monitorEventLoopLag(): void {
    let lastCheck = Date.now();

    setInterval(() => {
      const now = Date.now();
      const delay = now - lastCheck - 100; // Expected 100ms interval
      this.eventLoopLag = Math.max(0, delay);
      lastCheck = now;
    }, 100);
  }

  /**
   * Monitor garbage collection
   */
  private monitorGarbageCollection(): void {
    try {
      const perfObserver = new (require('perf_hooks').PerformanceObserver)(
        (list: any) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.name === 'gc') {
              this.gcStats.count++;
              this.gcStats.duration += entry.duration;
            }
          });
        },
      );

      perfObserver.observe({ entryTypes: ['gc'] });
    } catch (error) {
      this.logger.warn('Unable to monitor garbage collection', error);
    }
  }

  /**
   * Collect current performance metrics
   */
  private collectMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const metrics: PerformanceMetrics = {
      timestamp: new Date(),
      cpu: {
        usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
        user: cpuUsage.user / 1000000,
        system: cpuUsage.system / 1000000,
      },
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external,
      },
      eventLoop: {
        lag: this.eventLoopLag,
        utilization: this.calculateEventLoopUtilization(),
      },
      gc: {
        count: this.gcStats.count,
        duration: this.gcStats.duration,
      },
    };

    this.metrics.push(metrics);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    // Log warnings for high resource usage
    this.checkResourceThresholds(metrics);
  }

  /**
   * Calculate event loop utilization
   */
  private calculateEventLoopUtilization(): number {
    // Simplified calculation based on lag
    if (this.eventLoopLag === 0) return 0;
    if (this.eventLoopLag > 100) return 100;
    return this.eventLoopLag;
  }

  /**
   * Check resource thresholds and log warnings
   */
  private checkResourceThresholds(metrics: PerformanceMetrics): void {
    const heapUsedMB = metrics.memory.heapUsed / 1024 / 1024;
    const heapThreshold = parseInt(process.env.HEAP_THRESHOLD || '500', 10);

    if (heapUsedMB > heapThreshold) {
      this.logger.warn(
        `High memory usage detected: ${Math.round(heapUsedMB)}MB (threshold: ${heapThreshold}MB)`,
      );
    }

    if (metrics.eventLoop.lag > 50) {
      this.logger.warn(
        `High event loop lag detected: ${metrics.eventLoop.lag}ms`,
      );
    }

    if (metrics.gc.count > 10) {
      this.logger.warn(
        `Frequent garbage collection detected: ${metrics.gc.count} collections in ${Math.round(metrics.gc.duration)}ms`,
      );
    }
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  /**
   * Get performance metrics history
   */
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get average metrics over a time period
   */
  getAverageMetrics(minutes = 5): Partial<PerformanceMetrics> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const recentMetrics = this.metrics.filter((m) => m.timestamp > cutoff);

    if (recentMetrics.length === 0) {
      return {};
    }

    const sum = recentMetrics.reduce(
      (acc, m) => ({
        cpu: {
          usage: acc.cpu.usage + m.cpu.usage,
          user: acc.cpu.user + m.cpu.user,
          system: acc.cpu.system + m.cpu.system,
        },
        memory: {
          heapUsed: acc.memory.heapUsed + m.memory.heapUsed,
          heapTotal: acc.memory.heapTotal + m.memory.heapTotal,
          rss: acc.memory.rss + m.memory.rss,
          external: acc.memory.external + m.memory.external,
        },
        eventLoop: {
          lag: acc.eventLoop.lag + m.eventLoop.lag,
          utilization: acc.eventLoop.utilization + m.eventLoop.utilization,
        },
        gc: {
          count: acc.gc.count + m.gc.count,
          duration: acc.gc.duration + m.gc.duration,
        },
      }),
      {
        cpu: { usage: 0, user: 0, system: 0 },
        memory: { heapUsed: 0, heapTotal: 0, rss: 0, external: 0 },
        eventLoop: { lag: 0, utilization: 0 },
        gc: { count: 0, duration: 0 },
      },
    );

    const count = recentMetrics.length;

    return {
      cpu: {
        usage: sum.cpu.usage / count,
        user: sum.cpu.user / count,
        system: sum.cpu.system / count,
      },
      memory: {
        heapUsed: sum.memory.heapUsed / count,
        heapTotal: sum.memory.heapTotal / count,
        rss: sum.memory.rss / count,
        external: sum.memory.external / count,
      },
      eventLoop: {
        lag: sum.eventLoop.lag / count,
        utilization: sum.eventLoop.utilization / count,
      },
      gc: {
        count: sum.gc.count / count,
        duration: sum.gc.duration / count,
      },
    };
  }

  /**
   * Get cache performance metrics
   */
  getCacheMetrics(): CacheMetrics {
    const hitRate =
      this.cacheStats.hits + this.cacheStats.misses > 0
        ? this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)
        : 0;

    return {
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      hitRate,
      size: 0, // Would need to implement cache size tracking
      evictions: this.cacheStats.evictions,
    };
  }

  /**
   * Record cache hit
   */
  recordCacheHit(): void {
    this.cacheStats.hits++;
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(): void {
    this.cacheStats.misses++;
  }

  /**
   * Record cache eviction
   */
  recordCacheEviction(): void {
    this.cacheStats.evictions++;
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.metrics.length = 0;
    this.gcStats = { count: 0, duration: 0 };
    this.cacheStats = { hits: 0, misses: 0, evictions: 0 };
    this.logger.info('Performance metrics reset');
  }

  /**
   * Get health status based on metrics
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
  } {
    const issues: string[] = [];
    const current = this.getCurrentMetrics();

    if (!current) {
      return { status: 'healthy', issues: [] };
    }

    // Check memory usage
    const heapUsedMB = current.memory.heapUsed / 1024 / 1024;
    if (heapUsedMB > 800) {
      issues.push('Very high memory usage');
    } else if (heapUsedMB > 500) {
      issues.push('High memory usage');
    }

    // Check event loop lag
    if (current.eventLoop.lag > 100) {
      issues.push('Very high event loop lag');
    } else if (current.eventLoop.lag > 50) {
      issues.push('High event loop lag');
    }

    // Check cache performance
    const cacheMetrics = this.getCacheMetrics();
    if (cacheMetrics.hitRate < 0.5) {
      issues.push('Low cache hit rate');
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (issues.length > 2) {
      status = 'unhealthy';
    } else if (issues.length > 0) {
      status = 'degraded';
    }

    return { status, issues };
  }
}
