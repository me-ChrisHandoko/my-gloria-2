/**
 * Performance Optimization Module
 *
 * Central export for all performance optimization utilities
 */

// Request Deduplication
export {
  RequestDeduplicator,
  requestDeduplicator,
  dedupe,
  prefetch as deduplicatorPrefetch,
  clearCache,
  getDeduplicationMetrics,
} from './deduplicator';

// Request Batching
export {
  RequestBatcher,
  requestBatcher,
  batchRequest,
  flushBatches,
  getBatchMetrics,
  getPendingBatchSize,
} from './batcher';

// Advanced Caching
export {
  AdvancedCache,
  CacheStrategy,
  EvictionPolicy,
  memoryCache,
  sessionCache,
  persistentCache,
} from './cache';

// Prefetching and Preloading
export {
  PrefetchService,
  prefetchService,
  prefetch,
  prefetchRoute,
  observePrefetch,
  hoverPrefetch,
  predictivePrefetch,
  getPrefetchMetrics,
} from './prefetch';

// Performance Monitoring
export {
  PerformanceMonitor,
  performanceMonitor,
  trackApiRequest,
  getPerformanceMetrics,
  subscribeToMetrics,
  setPerformanceBudget,
  getPerformanceAlerts,
  type PerformanceMetrics,
} from './monitor';

// Bundle Optimization
export {
  BundleOptimizer,
  bundleOptimizer,
  dynamicImport,
  lazyLoadComponent,
  preloadComponent,
  loadScript,
  loadCSS,
  preconnectOrigins,
  getBundleMetrics,
} from './bundle';

// Re-export compression utilities
export {
  compress,
  decompress,
  compressStream,
  decompressStream,
  calculateCompressionRatio,
  formatFileSize,
  type CompressionFormat,
} from '@/lib/utils/compression';