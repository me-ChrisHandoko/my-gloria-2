import apiClient from "./client";

/**
 * Batch Request Configuration
 */
export interface BatchConfig {
  maxBatchSize?: number;
  batchDelay?: number;
  endpoint?: string;
  headers?: Record<string, string>;
}

/**
 * Individual batch request
 */
export interface BatchRequestItem {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  params?: any;
  data?: any;
  headers?: Record<string, string>;
}

/**
 * Batch response item
 */
export interface BatchResponseItem<T = any> {
  id: string;
  status: number;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  headers?: Record<string, string>;
}

/**
 * Batch request wrapper
 */
interface PendingBatchRequest {
  request: BatchRequestItem;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

class RequestBatcher {
  private readonly defaultMaxBatchSize = 20;
  private readonly defaultBatchDelay = 10; // milliseconds
  private readonly defaultEndpoint = "/batch";
  private readonly maxWaitTime = 5000; // 5 seconds max wait

  private batches = new Map<string, PendingBatchRequest[]>();
  private timers = new Map<string, NodeJS.Timeout>();
  private processing = new Set<string>();

  /**
   * Add request to batch queue
   */
  add<T = any>(
    endpoint: string,
    request: Omit<BatchRequestItem, "id">,
    config?: BatchConfig
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const batchKey = this.getBatchKey(endpoint, request.method);
      const requestId = this.generateRequestId();

      const batchRequest: PendingBatchRequest = {
        request: { ...request, id: requestId },
        resolve,
        reject,
        timestamp: Date.now(),
      };

      // Add to batch
      if (!this.batches.has(batchKey)) {
        this.batches.set(batchKey, []);
      }
      this.batches.get(batchKey)!.push(batchRequest);

      // Check if we should flush immediately
      const batch = this.batches.get(batchKey)!;
      const maxSize = config?.maxBatchSize || this.defaultMaxBatchSize;

      if (batch.length >= maxSize) {
        this.flushBatch(batchKey, config);
      } else {
        // Schedule flush
        this.scheduleBatchFlush(batchKey, config);
      }
    });
  }

  /**
   * Batch multiple GET requests
   */
  async batchGet<T = any>(
    urls: string[],
    config?: BatchConfig
  ): Promise<BatchResponseItem<T>[]> {
    const requests = urls.map((url) => ({
      method: "GET" as const,
      url,
    }));

    return this.executeBatch<T>(requests, config);
  }

  /**
   * Batch multiple requests of same type
   */
  async batchSame<T = any>(
    method: "POST" | "PUT" | "PATCH" | "DELETE",
    items: Array<{ url: string; data?: any; params?: any }>,
    config?: BatchConfig
  ): Promise<BatchResponseItem<T>[]> {
    const requests = items.map((item) => ({
      method,
      url: item.url,
      data: item.data,
      params: item.params,
    }));

    return this.executeBatch<T>(requests, config);
  }

  /**
   * Execute batch of mixed requests
   */
  async executeBatch<T = any>(
    requests: Omit<BatchRequestItem, "id">[],
    config?: BatchConfig
  ): Promise<BatchResponseItem<T>[]> {
    const batchRequests: BatchRequestItem[] = requests.map((req) => ({
      ...req,
      id: this.generateRequestId(),
    }));

    const endpoint = config?.endpoint || this.defaultEndpoint;

    try {
      const response = await apiClient.post<{
        batch: BatchResponseItem<T>[];
      }>(
        endpoint,
        {
          requests: batchRequests,
        },
        {
          headers: config?.headers,
        }
      );

      return response.batch;
    } catch (error) {
      // If batch endpoint fails, fallback to individual requests
      return this.fallbackToIndividualRequests<T>(batchRequests);
    }
  }

  /**
   * Schedule batch flush
   */
  private scheduleBatchFlush(batchKey: string, config?: BatchConfig): void {
    // Clear existing timer
    if (this.timers.has(batchKey)) {
      clearTimeout(this.timers.get(batchKey)!);
    }

    const delay = config?.batchDelay ?? this.defaultBatchDelay;

    const timer = setTimeout(() => {
      this.flushBatch(batchKey, config);
    }, delay);

    this.timers.set(batchKey, timer);
  }

  /**
   * Flush a batch
   */
  private async flushBatch(
    batchKey: string,
    config?: BatchConfig
  ): Promise<void> {
    // Clear timer
    if (this.timers.has(batchKey)) {
      clearTimeout(this.timers.get(batchKey)!);
      this.timers.delete(batchKey);
    }

    // Get batch
    const batch = this.batches.get(batchKey);
    if (!batch || batch.length === 0) {
      return;
    }

    // Check if already processing
    if (this.processing.has(batchKey)) {
      return;
    }

    // Mark as processing
    this.processing.add(batchKey);

    // Remove from batches
    this.batches.delete(batchKey);

    try {
      // Filter out expired requests
      const now = Date.now();
      const validRequests = batch.filter(
        (req) => now - req.timestamp < this.maxWaitTime
      );

      // Reject expired requests
      batch
        .filter((req) => now - req.timestamp >= this.maxWaitTime)
        .forEach((req) => {
          req.reject(new Error("Batch request timeout"));
        });

      if (validRequests.length === 0) {
        return;
      }

      // Execute batch
      const endpoint = config?.endpoint || this.defaultEndpoint;
      const batchRequests = validRequests.map((r) => r.request);

      const response = await apiClient.post<{
        batch: BatchResponseItem[];
      }>(
        endpoint,
        {
          requests: batchRequests,
        },
        {
          headers: config?.headers,
        }
      );

      // Process responses
      const responseMap = new Map(
        response.batch.map((item) => [item.id, item])
      );

      validRequests.forEach((req) => {
        const result = responseMap.get(req.request.id);

        if (result) {
          if (result.error) {
            req.reject(new Error(result.error.message));
          } else {
            req.resolve(result.data);
          }
        } else {
          req.reject(new Error("No response for batch request"));
        }
      });
    } catch (error) {
      // Fallback to individual requests on batch failure
      await this.processFallbackRequests(batch);
    } finally {
      this.processing.delete(batchKey);
    }
  }

  /**
   * Fallback to individual requests
   */
  private async fallbackToIndividualRequests<T>(
    requests: BatchRequestItem[]
  ): Promise<BatchResponseItem<T>[]> {
    const results = await Promise.allSettled(
      requests.map(async (req) => {
        try {
          const response = await this.executeIndividualRequest<T>(req);
          return {
            id: req.id,
            status: 200,
            data: response,
          } as BatchResponseItem<T>;
        } catch (error: any) {
          return {
            id: req.id,
            status: error.status || 500,
            error: {
              message: error.message || "Request failed",
              code: error.code,
              details: error.details,
            },
          } as BatchResponseItem<T>;
        }
      })
    );

    return results.map((result) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        return {
          id: "",
          status: 500,
          error: {
            message: result.reason?.message || "Request failed",
          },
        } as BatchResponseItem<T>;
      }
    });
  }

  /**
   * Process fallback requests for failed batch
   */
  private async processFallbackRequests(
    batch: PendingBatchRequest[]
  ): Promise<void> {
    await Promise.all(
      batch.map(async (req) => {
        try {
          const result = await this.executeIndividualRequest(req.request);
          req.resolve(result);
        } catch (error) {
          req.reject(error);
        }
      })
    );
  }

  /**
   * Execute individual request
   */
  private async executeIndividualRequest<T = any>(
    request: BatchRequestItem
  ): Promise<T> {
    const config: any = {
      params: request.params,
      headers: request.headers,
    };

    switch (request.method) {
      case "GET":
        return apiClient.get<T>(request.url, config);
      case "POST":
        return apiClient.post<T>(request.url, request.data, config);
      case "PUT":
        return apiClient.put<T>(request.url, request.data, config);
      case "PATCH":
        return apiClient.patch<T>(request.url, request.data, config);
      case "DELETE":
        return apiClient.delete<T>(request.url, config);
      default:
        throw new Error(`Unsupported method: ${request.method}`);
    }
  }

  /**
   * Get batch key for grouping
   */
  private getBatchKey(endpoint: string, method: string): string {
    return `${method}:${endpoint}`;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Flush all pending batches
   */
  async flushAll(config?: BatchConfig): Promise<void> {
    const keys = Array.from(this.batches.keys());
    await Promise.all(keys.map((key) => this.flushBatch(key, config)));
  }

  /**
   * Clear all pending batches without executing
   */
  clearAll(): void {
    // Clear all timers
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();

    // Reject all pending requests
    this.batches.forEach((batch) => {
      batch.forEach((req) => {
        req.reject(new Error("Batch cleared"));
      });
    });

    this.batches.clear();
    this.processing.clear();
  }

  /**
   * Get statistics
   */
  getStats(): {
    pendingBatches: number;
    pendingRequests: number;
    processing: number;
  } {
    let pendingRequests = 0;
    this.batches.forEach((batch) => {
      pendingRequests += batch.length;
    });

    return {
      pendingBatches: this.batches.size,
      pendingRequests,
      processing: this.processing.size,
    };
  }
}

// Create singleton instance
export const batcher = new RequestBatcher();

// Export class for testing
export { RequestBatcher };

/**
 * React hook for batch requests
 */
export function useBatchRequest<T = any>(config?: BatchConfig) {
  const executeBatch = useCallback(
    async (requests: Omit<BatchRequestItem, "id">[]) => {
      return batcher.executeBatch<T>(requests, config);
    },
    [config]
  );

  const batchGet = useCallback(
    async (urls: string[]) => {
      return batcher.batchGet<T>(urls, config);
    },
    [config]
  );

  const flushAll = useCallback(async () => {
    return batcher.flushAll(config);
  }, [config]);

  return {
    executeBatch,
    batchGet,
    flushAll,
    stats: batcher.getStats(),
  };
}

// Import for hook
import { useCallback } from "react";
