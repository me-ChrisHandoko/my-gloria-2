/**
 * API Health Monitoring Service
 * Monitors API connectivity, performance, and health status
 */

import { apiConfig } from './config';
import { apiMonitor } from '@/lib/monitoring/apiMonitor';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  responseTime: number;
  details: {
    api: boolean;
    database: boolean;
    cache: boolean;
    services: Record<string, boolean>;
  };
  metrics: {
    uptime: number;
    averageResponseTime: number;
    errorRate: number;
    requestsPerMinute: number;
  };
}

export interface HealthCheckResult {
  success: boolean;
  timestamp: Date;
  responseTime: number;
  status?: number;
  error?: string;
}

export class HealthMonitor {
  private static instance: HealthMonitor;
  private intervalId: NodeJS.Timeout | null = null;
  private healthStatus: HealthStatus;
  private checkHistory: HealthCheckResult[] = [];
  private startTime: Date;
  private consecutiveFailures: number = 0;
  private listeners: Set<(status: HealthStatus) => void> = new Set();

  private constructor() {
    this.startTime = new Date();
    this.healthStatus = {
      status: 'unknown',
      lastCheck: new Date(),
      responseTime: 0,
      details: {
        api: false,
        database: false,
        cache: false,
        services: {},
      },
      metrics: {
        uptime: 0,
        averageResponseTime: 0,
        errorRate: 0,
        requestsPerMinute: 0,
      },
    };
  }

  public static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  /**
   * Start health monitoring
   */
  public start(): void {
    const config = apiConfig.getHealthCheckConfig();

    if (!config.enabled) {
      console.log('Health monitoring is disabled');
      return;
    }

    if (this.intervalId) {
      console.warn('Health monitoring is already running');
      return;
    }

    // Perform initial health check
    this.performHealthCheck();

    // Schedule periodic health checks
    this.intervalId = setInterval(() => {
      this.performHealthCheck();
    }, config.interval);

    console.log(`Health monitoring started (interval: ${config.interval}ms)`);
  }

  /**
   * Stop health monitoring
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Health monitoring stopped');
    }
  }

  /**
   * Perform a health check
   */
  public async performHealthCheck(): Promise<HealthCheckResult> {
    const config = apiConfig.getHealthCheckConfig();
    const startTime = Date.now();
    let result: HealthCheckResult;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(config.endpoint, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Health-Check': 'true',
        },
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      const data = await response.json().catch(() => ({}));

      result = {
        success: response.ok,
        timestamp: new Date(),
        responseTime,
        status: response.status,
      };

      // Update health status based on response
      this.updateHealthStatus(result, data);

      // Reset consecutive failures on success
      if (response.ok) {
        this.consecutiveFailures = 0;
      } else {
        this.handleHealthCheckFailure(result);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      result = {
        success: false,
        timestamp: new Date(),
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      this.handleHealthCheckFailure(result);
    }

    // Store in history (keep last 100 checks)
    this.checkHistory.push(result);
    if (this.checkHistory.length > 100) {
      this.checkHistory.shift();
    }

    // Calculate metrics
    this.calculateMetrics();

    // Notify listeners
    this.notifyListeners();

    return result;
  }

  /**
   * Update health status based on check result
   */
  private updateHealthStatus(result: HealthCheckResult, data: any): void {
    this.healthStatus.lastCheck = result.timestamp;
    this.healthStatus.responseTime = result.responseTime;

    // Update component status
    this.healthStatus.details = {
      api: result.success,
      database: data?.database ?? false,
      cache: data?.cache ?? false,
      services: data?.services ?? {},
    };

    // Determine overall status
    if (result.success && result.responseTime < 1000) {
      this.healthStatus.status = 'healthy';
    } else if (result.success && result.responseTime < 3000) {
      this.healthStatus.status = 'degraded';
    } else {
      this.healthStatus.status = 'unhealthy';
    }
  }

  /**
   * Handle health check failure
   */
  private handleHealthCheckFailure(result: HealthCheckResult): void {
    this.consecutiveFailures++;
    const config = apiConfig.getHealthCheckConfig();

    this.healthStatus.status = 'unhealthy';
    this.healthStatus.lastCheck = result.timestamp;
    this.healthStatus.responseTime = result.responseTime;
    this.healthStatus.details = {
      api: false,
      database: false,
      cache: false,
      services: {},
    };

    // Check if we've exceeded max consecutive failures
    if (this.consecutiveFailures >= config.maxConsecutiveFailures) {
      this.handleCriticalFailure();
    }

    // Log the failure
    console.error('Health check failed:', {
      consecutiveFailures: this.consecutiveFailures,
      error: result.error,
      status: result.status,
    });
  }

  /**
   * Handle critical failure (max consecutive failures reached)
   */
  private handleCriticalFailure(): void {
    console.error('CRITICAL: API health check has failed multiple times');

    // Notify error monitoring service
    if (apiConfig.getMonitoringConfig().enabled) {
      apiMonitor.trackError({
        type: 'HEALTH_CHECK_CRITICAL',
        message: `API health check failed ${this.consecutiveFailures} consecutive times`,
        severity: 'critical',
        timestamp: Date.now(),
      });
    }

    // Could trigger additional actions like:
    // - Switch to offline mode
    // - Use fallback API
    // - Show maintenance message to users
  }

  /**
   * Calculate health metrics
   */
  private calculateMetrics(): void {
    const now = Date.now();
    const uptimeMs = now - this.startTime.getTime();

    // Calculate uptime percentage
    const totalChecks = this.checkHistory.length;
    const successfulChecks = this.checkHistory.filter(c => c.success).length;
    const uptimePercentage = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 0;

    // Calculate average response time
    const responseTimes = this.checkHistory.map(c => c.responseTime);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    // Calculate error rate
    const recentChecks = this.checkHistory.slice(-10); // Last 10 checks
    const recentErrors = recentChecks.filter(c => !c.success).length;
    const errorRate = recentChecks.length > 0 ? (recentErrors / recentChecks.length) * 100 : 0;

    // Estimate requests per minute (based on monitoring data)
    const requestsPerMinute = apiMonitor.getRequestsPerMinute();

    this.healthStatus.metrics = {
      uptime: uptimePercentage,
      averageResponseTime: Math.round(avgResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      requestsPerMinute,
    };
  }

  /**
   * Subscribe to health status updates
   */
  public subscribe(listener: (status: HealthStatus) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getStatus());
      } catch (error) {
        console.error('Error in health status listener:', error);
      }
    });
  }

  /**
   * Get current health status
   */
  public getStatus(): HealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * Get health check history
   */
  public getHistory(): HealthCheckResult[] {
    return [...this.checkHistory];
  }

  /**
   * Get recent health check results
   */
  public getRecentChecks(count: number = 10): HealthCheckResult[] {
    return this.checkHistory.slice(-count);
  }

  /**
   * Check if API is healthy
   */
  public isHealthy(): boolean {
    return this.healthStatus.status === 'healthy';
  }

  /**
   * Check if API is available (healthy or degraded)
   */
  public isAvailable(): boolean {
    return this.healthStatus.status === 'healthy' || this.healthStatus.status === 'degraded';
  }

  /**
   * Get health status summary
   */
  public getSummary(): string {
    const status = this.healthStatus;
    const summary = [
      `Status: ${status.status}`,
      `Last Check: ${status.lastCheck.toLocaleTimeString()}`,
      `Response Time: ${status.responseTime}ms`,
      `Uptime: ${status.metrics.uptime.toFixed(2)}%`,
      `Avg Response: ${status.metrics.averageResponseTime}ms`,
      `Error Rate: ${status.metrics.errorRate}%`,
    ];

    return summary.join('\n');
  }

  /**
   * Export health data for debugging
   */
  public exportHealthData(): string {
    return JSON.stringify({
      currentStatus: this.healthStatus,
      history: this.checkHistory,
      consecutiveFailures: this.consecutiveFailures,
      monitoring: {
        isRunning: this.intervalId !== null,
        startTime: this.startTime,
        checkCount: this.checkHistory.length,
      },
    }, null, 2);
  }

  /**
   * Reset health monitoring
   */
  public reset(): void {
    this.stop();
    this.checkHistory = [];
    this.consecutiveFailures = 0;
    this.healthStatus.status = 'unknown';
    this.calculateMetrics();
    this.notifyListeners();
  }
}

// Create singleton instance
export const healthMonitor = HealthMonitor.getInstance();

// Auto-start health monitoring in browser environment
if (typeof window !== 'undefined' && !apiConfig.isTest()) {
  // Start monitoring when the page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      healthMonitor.start();
    });
  } else {
    healthMonitor.start();
  }

  // Stop monitoring when the page unloads
  window.addEventListener('beforeunload', () => {
    healthMonitor.stop();
  });
}

// Export convenience functions
export function getHealthStatus(): HealthStatus {
  return healthMonitor.getStatus();
}

export function isApiHealthy(): boolean {
  return healthMonitor.isHealthy();
}

export function isApiAvailable(): boolean {
  return healthMonitor.isAvailable();
}

export async function checkApiHealth(): Promise<HealthCheckResult> {
  return healthMonitor.performHealthCheck();
}