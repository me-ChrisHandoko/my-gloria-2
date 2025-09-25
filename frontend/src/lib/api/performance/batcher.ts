/**
 * Request Batching Service
 *
 * Production-ready service for batching multiple API requests.
 * Features:
 * - Automatic request grouping by endpoint
 * - Configurable batch size and timing
 * - Error isolation per request
 * - Progress tracking
 * - Priority queue support
 * - Retry logic for failed batches
 */

import { logger } from '@/lib/errors/errorLogger';
import apiClient from '@/lib/api/client';
import { PerformanceMonitor } from '@/lib/errors/errorLogger';

interface BatchRequest<T = any> {
  id: string;
  params: any;
  priority: number;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  timestamp: number;
  retryCount: number;
}

interface BatchOptions {
  maxBatchSize?: number;
  batchDelayMs?: number;
  maxRetries?: number;
  enablePriority?: boolean;
  enableMetrics?: boolean;
  onProgress?: (progress: number) => void;
}

interface BatchMetrics {
  totalRequests: number;
  batchesExecuted: number;
  successfulRequests: number;
  failedRequests: number;
  averageBatchSize: number;
  averageLatency: number;
}

interface BatchResponse<T> {
  success: boolean;
  data?: T;
  error?: any;
  id: string;
}

export class RequestBatcher {
  private batches = new Map<string, BatchRequest[]>();
  private timers = new Map<string, NodeJS.Timeout>();
  private metrics: BatchMetrics = {
    totalRequests: 0,
    batchesExecuted: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageBatchSize: 0,
    averageLatency: 0,
  };
  private performanceMonitor: PerformanceMonitor;
  private latencies: number[] = [];

  constructor(private options: BatchOptions = {}) {
    this.options = {
      maxBatchSize: 50,
      batchDelayMs: 10,
      maxRetries: 3,
      enablePriority: true,
      enableMetrics: true,
      ...options,
    };

    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Add request to batch
   */
  async add<T>(
    endpoint: string,
    params: any,
    priority: number = 0
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: BatchRequest<T> = {
        id: this.generateRequestId(),
        params,
        priority,
        resolve,
        reject,
        timestamp: Date.now(),
        retryCount: 0,
      };

      this.addToBatch(endpoint, request);
      this.scheduleBatch(endpoint);

      this.metrics.totalRequests++;
      logger.debug('Request added to batch', {
        endpoint,
        id: request.id,
        priority,
      });
    });
  }

  /**
   * Add request to batch queue
   */
  private addToBatch(endpoint: string, request: BatchRequest): void {
    if (!this.batches.has(endpoint)) {
      this.batches.set(endpoint, []);
    }

    const batch = this.batches.get(endpoint)!;
    batch.push(request);

    // Sort by priority if enabled
    if (this.options.enablePriority) {
      batch.sort((a, b) => b.priority - a.priority);
    }

    // Check if batch is full
    if (batch.length >= (this.options.maxBatchSize || 50)) {
      this.executeBatch(endpoint);
    }
  }

  /**
   * Schedule batch execution
   */
  private scheduleBatch(endpoint: string): void {
    // Clear existing timer
    const existingTimer = this.timers.get(endpoint);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new execution
    const timer = setTimeout(() => {
      this.executeBatch(endpoint);
    }, this.options.batchDelayMs || 10);

    this.timers.set(endpoint, timer);
  }

  /**
   * Execute batch of requests
   */
  private async executeBatch(endpoint: string): Promise<void> {
    // Clear timer
    const timer = this.timers.get(endpoint);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(endpoint);
    }

    // Get and clear batch
    const batch = this.batches.get(endpoint);
    if (!batch || batch.length === 0) return;

    this.batches.set(endpoint, []);

    const startTime = Date.now();
    const batchSize = batch.length;

    try {
      // Execute batch request
      const response = await this.performanceMonitor.measure(
        `batch_${endpoint}`,
        () => this.sendBatchRequest(endpoint, batch)
      );

      // Process responses
      this.processBatchResponse(batch, response);

      // Update metrics
      const latency = Date.now() - startTime;
      this.updateMetrics(batchSize, batch.length, latency, true);

      logger.info('Batch executed successfully', {
        endpoint,
        size: batchSize,
        latency,
      });
    } catch (error) {
      logger.error('Batch execution failed', error as Error, {
        endpoint,
        size: batchSize,
      });

      // Retry failed requests
      await this.retryFailedRequests(endpoint, batch);

      this.updateMetrics(batchSize, 0, Date.now() - startTime, false);
    }
  }

  /**
   * Send batch request to API
   */
  private async sendBatchRequest(
    endpoint: string,
    batch: BatchRequest[]
  ): Promise<BatchResponse<any>[]> {
    const payload = {
      requests: batch.map(req => ({
        id: req.id,
        ...req.params,
      })),
    };

    // Report progress
    if (this.options.onProgress) {
      this.options.onProgress(0);
    }

    const response = await apiClient.post(`${endpoint}/batch`, payload, {
      onUploadProgress: (progressEvent) => {
        if (this.options.onProgress && progressEvent.total) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          this.options.onProgress(progress);
        }
      },
    });

    return (response as any).data.responses || [];
  }

  /**
   * Process batch response
   */
  private processBatchResponse(
    batch: BatchRequest[],
    responses: BatchResponse<any>[]
  ): void {
    const responseMap = new Map(
      responses.map(res => [res.id, res])
    );

    batch.forEach(request => {
      const response = responseMap.get(request.id);

      if (response?.success) {
        request.resolve(response.data);
        this.metrics.successfulRequests++;
      } else {
        const error = response?.error || new Error('No response for request');
        request.reject(error);
        this.metrics.failedRequests++;
      }
    });
  }

  /**
   * Retry failed requests
   */
  private async retryFailedRequests(
    endpoint: string,
    batch: BatchRequest[]
  ): Promise<void> {
    const retryable = batch.filter(
      req => req.retryCount < (this.options.maxRetries || 3)
    );

    if (retryable.length === 0) {
      // All requests exceeded retry limit
      batch.forEach(req => {
        req.reject(new Error('Max retries exceeded'));
        this.metrics.failedRequests++;
      });
      return;
    }

    // Increment retry count and reschedule
    retryable.forEach(req => {
      req.retryCount++;
      this.addToBatch(endpoint, req);
    });

    // Reject non-retryable requests
    batch
      .filter(req => !retryable.includes(req))
      .forEach(req => {
        req.reject(new Error('Request failed and cannot be retried'));
        this.metrics.failedRequests++;
      });

    // Schedule retry with exponential backoff
    const delay = Math.min(1000 * Math.pow(2, retryable[0].retryCount), 10000);
    setTimeout(() => {
      this.executeBatch(endpoint);
    }, delay);

    logger.warn('Retrying failed batch requests', {
      endpoint,
      retryCount: retryable.length,
      delay,
    });
  }

  /**
   * Update metrics
   */
  private updateMetrics(
    batchSize: number,
    successCount: number,
    latency: number,
    success: boolean
  ): void {
    if (!this.options.enableMetrics) return;

    this.metrics.batchesExecuted++;
    this.latencies.push(latency);

    // Calculate averages
    this.metrics.averageBatchSize =
      (this.metrics.averageBatchSize * (this.metrics.batchesExecuted - 1) +
        batchSize) /
      this.metrics.batchesExecuted;

    this.metrics.averageLatency =
      this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;

    // Keep only last 100 latencies
    if (this.latencies.length > 100) {
      this.latencies.shift();
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Flush all pending batches
   */
  async flush(): Promise<void> {
    const endpoints = Array.from(this.batches.keys());

    await Promise.all(
      endpoints.map(endpoint => this.executeBatch(endpoint))
    );

    logger.info('All batches flushed', {
      endpointCount: endpoints.length,
    });
  }

  /**
   * Flush specific endpoint
   */
  async flushEndpoint(endpoint: string): Promise<void> {
    await this.executeBatch(endpoint);
  }

  /**
   * Get current metrics
   */
  getMetrics(): BatchMetrics {
    return { ...this.metrics };
  }

  /**
   * Get pending batch size
   */
  getPendingSize(endpoint?: string): number {
    if (endpoint) {
      return this.batches.get(endpoint)?.length || 0;
    }

    let total = 0;
    this.batches.forEach(batch => {
      total += batch.length;
    });
    return total;
  }

  /**
   * Clear all pending batches
   */
  clear(): void {
    // Reject all pending requests
    this.batches.forEach(batch => {
      batch.forEach(request => {
        request.reject(new Error('Batch cleared'));
      });
    });

    // Clear data structures
    this.batches.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();

    logger.info('All batches cleared');
  }

  /**
   * Destroy batcher
   */
  destroy(): void {
    this.clear();
    logger.info('Batcher destroyed');
  }
}

// Create singleton instance
export const requestBatcher = new RequestBatcher({
  maxBatchSize: 50,
  batchDelayMs: 10,
  maxRetries: 3,
  enablePriority: true,
  enableMetrics: true,
});

// Export helper functions
export const batchRequest = <T>(
  endpoint: string,
  params: any,
  priority?: number
): Promise<T> => requestBatcher.add<T>(endpoint, params, priority);

export const flushBatches = (): Promise<void> => requestBatcher.flush();

export const getBatchMetrics = (): BatchMetrics => requestBatcher.getMetrics();

export const getPendingBatchSize = (endpoint?: string): number =>
  requestBatcher.getPendingSize(endpoint);