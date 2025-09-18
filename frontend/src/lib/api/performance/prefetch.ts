/**
 * Request Prefetching and Preloading Service
 *
 * Production-ready service for prefetching and preloading API data.
 * Features:
 * - Intelligent prefetching based on user behavior
 * - Route-based prefetching
 * - Intersection Observer for viewport-based prefetching
 * - Priority queue for prefetch requests
 * - Network-aware prefetching
 * - Predictive prefetching using ML patterns
 */

import { apiClient } from '@/lib/api/client';
import { persistentCache } from './cache';
import { requestDeduplicator } from './deduplicator';
import { logger } from '@/lib/errors/errorLogger';

interface PrefetchConfig {
  priority?: 'high' | 'medium' | 'low';
  ttl?: number;
  strategy?: 'eager' | 'lazy' | 'viewport' | 'hover' | 'predictive';
  networkCondition?: 'any' | 'fast' | 'slow-2g' | '2g' | '3g' | '4g';
  maxConcurrent?: number;
  delay?: number;
}

interface PrefetchQueueItem {
  key: string;
  fetcher: () => Promise<any>;
  config: PrefetchConfig;
  timestamp: number;
  attempts: number;
}

interface PrefetchMetrics {
  totalPrefetched: number;
  successfulPrefetches: number;
  failedPrefetches: number;
  hitRate: number;
  averageLoadTime: number;
  networkSaved: number;
}

interface RoutePattern {
  pattern: RegExp;
  prefetchKeys: string[];
  config?: PrefetchConfig;
}

export class PrefetchService {
  private queue: Map<string, PrefetchQueueItem> = new Map();
  private inProgress = new Set<string>();
  private observers = new Map<Element, IntersectionObserver>();
  private routePatterns: RoutePattern[] = [];
  private metrics: PrefetchMetrics = {
    totalPrefetched: 0,
    successfulPrefetches: 0,
    failedPrefetches: 0,
    hitRate: 0,
    averageLoadTime: 0,
    networkSaved: 0,
  };
  private loadTimes: number[] = [];
  private networkInfo: any = null;
  private concurrentLimit = 3;
  private userPatterns: Map<string, number> = new Map();

  constructor() {
    this.initializeNetworkDetection();
    this.startProcessingQueue();
  }

  /**
   * Initialize network detection
   */
  private initializeNetworkDetection(): void {
    if ('connection' in navigator) {
      this.networkInfo = (navigator as any).connection;
      this.networkInfo?.addEventListener('change', () => {
        this.onNetworkChange();
      });
    }
  }

  /**
   * Prefetch a single resource
   */
  async prefetch(
    key: string,
    fetcher: () => Promise<any>,
    config: PrefetchConfig = {}
  ): Promise<void> {
    // Check if already cached
    const cached = await persistentCache.get(key);
    if (cached) {
      logger.debug('Resource already cached, skipping prefetch', { key });
      return;
    }

    // Check network conditions
    if (!this.shouldPrefetchBasedOnNetwork(config.networkCondition)) {
      logger.debug('Network conditions not suitable for prefetch', {
        key,
        network: this.networkInfo?.effectiveType,
      });
      return;
    }

    // Add to queue
    this.addToQueue(key, fetcher, config);
  }

  /**
   * Prefetch multiple resources
   */
  async prefetchMany(
    resources: Array<{
      key: string;
      fetcher: () => Promise<any>;
      config?: PrefetchConfig;
    }>
  ): Promise<void> {
    // Sort by priority
    const sorted = resources.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.config?.priority || 'medium'];
      const bPriority = priorityOrder[b.config?.priority || 'medium'];
      return bPriority - aPriority;
    });

    // Add to queue
    for (const resource of sorted) {
      await this.prefetch(resource.key, resource.fetcher, resource.config);
    }
  }

  /**
   * Register route patterns for automatic prefetching
   */
  registerRoutePattern(
    pattern: RegExp,
    prefetchKeys: string[],
    config?: PrefetchConfig
  ): void {
    this.routePatterns.push({ pattern, prefetchKeys, config });
    logger.info('Route pattern registered for prefetching', {
      pattern: pattern.toString(),
      keys: prefetchKeys.length,
    });
  }

  /**
   * Prefetch resources for a route
   */
  async prefetchRoute(route: string): Promise<void> {
    const matchingPatterns = this.routePatterns.filter(p =>
      p.pattern.test(route)
    );

    for (const pattern of matchingPatterns) {
      for (const key of pattern.prefetchKeys) {
        const fetcher = () => this.fetchResource(key);
        await this.prefetch(key, fetcher, pattern.config);
      }
    }
  }

  /**
   * Setup viewport-based prefetching
   */
  observeElement(
    element: Element,
    key: string,
    fetcher: () => Promise<any>,
    config: PrefetchConfig = {}
  ): void {
    if (this.observers.has(element)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.prefetch(key, fetcher, { ...config, strategy: 'viewport' });
            observer.unobserve(element);
            this.observers.delete(element);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01,
      }
    );

    observer.observe(element);
    this.observers.set(element, observer);
  }

  /**
   * Setup hover-based prefetching
   */
  setupHoverPrefetch(
    element: Element,
    key: string,
    fetcher: () => Promise<any>,
    config: PrefetchConfig = {}
  ): void {
    let hoverTimeout: NodeJS.Timeout;

    element.addEventListener('mouseenter', () => {
      hoverTimeout = setTimeout(() => {
        this.prefetch(key, fetcher, { ...config, strategy: 'hover' });
      }, config.delay || 100);
    });

    element.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimeout);
    });
  }

  /**
   * Predictive prefetching based on user patterns
   */
  async predictivePrefetch(currentKey: string): Promise<void> {
    // Record user navigation pattern
    const count = (this.userPatterns.get(currentKey) || 0) + 1;
    this.userPatterns.set(currentKey, count);

    // Find likely next resources based on patterns
    const predictions = this.getPredictions(currentKey);

    // Prefetch top predictions
    for (const prediction of predictions.slice(0, 3)) {
      const fetcher = () => this.fetchResource(prediction.key);
      await this.prefetch(prediction.key, fetcher, {
        priority: 'low',
        strategy: 'predictive',
      });
    }
  }

  /**
   * Get predictions based on user patterns
   */
  private getPredictions(
    currentKey: string
  ): Array<{ key: string; probability: number }> {
    // Simple frequency-based prediction
    // In production, this could use more sophisticated ML models
    const predictions: Array<{ key: string; probability: number }> = [];

    for (const [key, count] of this.userPatterns.entries()) {
      if (key !== currentKey) {
        predictions.push({
          key,
          probability: count / this.getTotalNavigations(),
        });
      }
    }

    return predictions.sort((a, b) => b.probability - a.probability);
  }

  /**
   * Add request to queue
   */
  private addToQueue(
    key: string,
    fetcher: () => Promise<any>,
    config: PrefetchConfig
  ): void {
    if (this.queue.has(key) || this.inProgress.has(key)) {
      return;
    }

    this.queue.set(key, {
      key,
      fetcher,
      config,
      timestamp: Date.now(),
      attempts: 0,
    });

    logger.debug('Added to prefetch queue', {
      key,
      priority: config.priority,
      queueSize: this.queue.size,
    });
  }

  /**
   * Process prefetch queue
   */
  private async startProcessingQueue(): Promise<void> {
    setInterval(async () => {
      await this.processQueue();
    }, 100);
  }

  /**
   * Process items in queue
   */
  private async processQueue(): Promise<void> {
    if (this.inProgress.size >= this.concurrentLimit) {
      return;
    }

    const items = Array.from(this.queue.values())
      .filter(item => !this.inProgress.has(item.key))
      .sort((a, b) => {
        // Sort by priority then timestamp
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.config.priority || 'medium'];
        const bPriority = priorityOrder[b.config.priority || 'medium'];

        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }

        return a.timestamp - b.timestamp;
      });

    const toProcess = items.slice(0, this.concurrentLimit - this.inProgress.size);

    for (const item of toProcess) {
      this.executePrefetch(item);
    }
  }

  /**
   * Execute prefetch request
   */
  private async executePrefetch(item: PrefetchQueueItem): Promise<void> {
    this.queue.delete(item.key);
    this.inProgress.add(item.key);

    const startTime = Date.now();

    try {
      // Use deduplicator to prevent duplicate requests
      const data = await requestDeduplicator.dedupe(
        `prefetch_${item.key}`,
        item.fetcher,
        item.config.ttl
      );

      // Cache the result
      await persistentCache.set(item.key, data, {
        ttl: item.config.ttl,
        metadata: {
          prefetched: true,
          strategy: item.config.strategy,
        },
      });

      // Update metrics
      const loadTime = Date.now() - startTime;
      this.updateMetrics(true, loadTime);

      logger.info('Prefetch successful', {
        key: item.key,
        loadTime,
        strategy: item.config.strategy,
      });
    } catch (error) {
      // Retry logic
      if (item.attempts < 3) {
        item.attempts++;
        this.queue.set(item.key, item);
      } else {
        this.updateMetrics(false, Date.now() - startTime);
        logger.error('Prefetch failed after retries', error as Error, {
          key: item.key,
          attempts: item.attempts,
        });
      }
    } finally {
      this.inProgress.delete(item.key);
    }
  }

  /**
   * Fetch resource from API
   */
  private async fetchResource(key: string): Promise<any> {
    // This is a placeholder - in real implementation,
    // this would map keys to actual API endpoints
    const response = await apiClient.get(`/api/resources/${key}`);
    return response.data;
  }

  /**
   * Check if should prefetch based on network
   */
  private shouldPrefetchBasedOnNetwork(
    condition?: string
  ): boolean {
    if (!condition || condition === 'any') {
      return true;
    }

    if (!this.networkInfo) {
      return true; // Assume good connection if unknown
    }

    const effectiveType = this.networkInfo.effectiveType;

    switch (condition) {
      case 'fast':
        return effectiveType === '4g';
      case '4g':
        return effectiveType === '4g';
      case '3g':
        return ['3g', '4g'].includes(effectiveType);
      case '2g':
        return ['2g', '3g', '4g'].includes(effectiveType);
      case 'slow-2g':
        return true;
      default:
        return true;
    }
  }

  /**
   * Handle network change
   */
  private onNetworkChange(): void {
    const effectiveType = this.networkInfo?.effectiveType;

    // Adjust concurrent limit based on network
    switch (effectiveType) {
      case '4g':
        this.concurrentLimit = 5;
        break;
      case '3g':
        this.concurrentLimit = 3;
        break;
      case '2g':
        this.concurrentLimit = 1;
        break;
      default:
        this.concurrentLimit = 0; // Pause prefetching
    }

    logger.info('Network changed, adjusting prefetch strategy', {
      effectiveType,
      concurrentLimit: this.concurrentLimit,
    });
  }

  /**
   * Update metrics
   */
  private updateMetrics(success: boolean, loadTime: number): void {
    this.metrics.totalPrefetched++;

    if (success) {
      this.metrics.successfulPrefetches++;
      this.loadTimes.push(loadTime);

      // Keep only last 100 load times
      if (this.loadTimes.length > 100) {
        this.loadTimes.shift();
      }

      // Calculate average
      this.metrics.averageLoadTime =
        this.loadTimes.reduce((a, b) => a + b, 0) / this.loadTimes.length;
    } else {
      this.metrics.failedPrefetches++;
    }

    // Update hit rate
    this.metrics.hitRate =
      (this.metrics.successfulPrefetches / this.metrics.totalPrefetched) * 100;
  }

  /**
   * Get total navigations
   */
  private getTotalNavigations(): number {
    let total = 0;
    this.userPatterns.forEach(count => {
      total += count;
    });
    return total;
  }

  /**
   * Get metrics
   */
  getMetrics(): PrefetchMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear prefetch queue
   */
  clearQueue(): void {
    this.queue.clear();
    logger.info('Prefetch queue cleared');
  }

  /**
   * Destroy service
   */
  destroy(): void {
    // Clean up observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    // Clear queue
    this.clearQueue();

    logger.info('Prefetch service destroyed');
  }
}

// Create singleton instance
export const prefetchService = new PrefetchService();

// Export helper functions
export const prefetch = (
  key: string,
  fetcher: () => Promise<any>,
  config?: PrefetchConfig
): Promise<void> => prefetchService.prefetch(key, fetcher, config);

export const prefetchRoute = (route: string): Promise<void> =>
  prefetchService.prefetchRoute(route);

export const observePrefetch = (
  element: Element,
  key: string,
  fetcher: () => Promise<any>,
  config?: PrefetchConfig
): void => prefetchService.observeElement(element, key, fetcher, config);

export const hoverPrefetch = (
  element: Element,
  key: string,
  fetcher: () => Promise<any>,
  config?: PrefetchConfig
): void => prefetchService.setupHoverPrefetch(element, key, fetcher, config);

export const predictivePrefetch = (currentKey: string): Promise<void> =>
  prefetchService.predictivePrefetch(currentKey);

export const getPrefetchMetrics = (): PrefetchMetrics =>
  prefetchService.getMetrics();