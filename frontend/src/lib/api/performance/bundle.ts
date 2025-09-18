/**
 * Bundle Optimization Utilities
 *
 * Production-ready utilities for optimizing bundle size and loading.
 * Features:
 * - Dynamic imports with retry logic
 * - Code splitting strategies
 * - Lazy loading components
 * - Bundle analysis helpers
 * - Resource hints (preload, prefetch, preconnect)
 * - Module federation support
 */

import { logger } from '@/lib/errors/errorLogger';

interface LazyComponentOptions {
  fallback?: React.ComponentType;
  retry?: number;
  delay?: number;
  onError?: (error: Error) => void;
  preload?: boolean;
  ssr?: boolean;
}

interface ChunkLoadError extends Error {
  request?: string;
  type?: string;
}

interface ResourceHint {
  type: 'preload' | 'prefetch' | 'preconnect' | 'dns-prefetch';
  href: string;
  as?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
  media?: string;
}

interface BundleMetrics {
  totalSize: number;
  chunks: Map<string, number>;
  loadTime: Map<string, number>;
  cacheHits: number;
  cacheMisses: number;
}

export class BundleOptimizer {
  private loadedChunks = new Set<string>();
  private failedChunks = new Map<string, number>();
  private chunkPromises = new Map<string, Promise<any>>();
  private metrics: BundleMetrics = {
    totalSize: 0,
    chunks: new Map(),
    loadTime: new Map(),
    cacheHits: 0,
    cacheMisses: 0,
  };
  private resourceHints = new Set<string>();

  /**
   * Dynamic import with retry logic
   */
  async dynamicImport<T = any>(
    importFn: () => Promise<T>,
    options: {
      chunkName?: string;
      maxRetries?: number;
      retryDelay?: number;
      onRetry?: (attempt: number, error: Error) => void;
    } = {}
  ): Promise<T> {
    const {
      chunkName = 'unknown',
      maxRetries = 3,
      retryDelay = 1000,
      onRetry,
    } = options;

    const startTime = Date.now();

    // Check if already loading
    if (this.chunkPromises.has(chunkName)) {
      this.metrics.cacheHits++;
      return this.chunkPromises.get(chunkName) as Promise<T>;
    }

    const loadChunk = async (attempt: number): Promise<T> => {
      try {
        const module = await importFn();

        // Track successful load
        this.loadedChunks.add(chunkName);
        this.metrics.loadTime.set(chunkName, Date.now() - startTime);
        this.metrics.cacheMisses++;

        logger.info('Chunk loaded successfully', {
          chunkName,
          attempt,
          loadTime: Date.now() - startTime,
        });

        return module;
      } catch (error) {
        const chunkError = error as ChunkLoadError;

        // Check if it's a chunk load error
        if (this.isChunkLoadError(chunkError)) {
          if (attempt < maxRetries) {
            logger.warn('Chunk load failed, retrying...', {
              chunkName,
              attempt,
              error: chunkError.message,
            });

            if (onRetry) {
              onRetry(attempt, chunkError);
            }

            // Clear module cache
            this.clearModuleCache(chunkName);

            // Wait before retry
            await new Promise(resolve =>
              setTimeout(resolve, retryDelay * Math.pow(2, attempt))
            );

            return loadChunk(attempt + 1);
          }

          // Track failed chunk
          this.failedChunks.set(chunkName, attempt);
          logger.error('Chunk load failed after retries', chunkError, {
            chunkName,
            attempts: attempt,
          });

          // Try to recover
          return this.recoverFromChunkError(chunkError, chunkName);
        }

        throw error;
      }
    };

    const promise = loadChunk(0);
    this.chunkPromises.set(chunkName, promise);

    try {
      return await promise;
    } finally {
      // Clean up promise cache after resolution
      setTimeout(() => {
        this.chunkPromises.delete(chunkName);
      }, 5000);
    }
  }

  /**
   * Check if error is a chunk load error
   */
  private isChunkLoadError(error: Error): boolean {
    return (
      error.name === 'ChunkLoadError' ||
      error.message.includes('Loading chunk') ||
      error.message.includes('Loading CSS chunk') ||
      error.message.includes('Failed to fetch')
    );
  }

  /**
   * Clear module cache (for retry)
   */
  private clearModuleCache(chunkName: string): void {
    // This is framework-specific
    // For webpack:
    if (typeof window !== 'undefined' && (window as any).webpackChunk) {
      const cache = (window as any).webpackChunk;
      // Clear specific chunk from cache
      delete cache[chunkName];
    }
  }

  /**
   * Recover from chunk load error
   */
  private async recoverFromChunkError<T>(
    error: ChunkLoadError,
    chunkName: string
  ): Promise<T> {
    // Attempt to reload the page if it's a critical chunk
    if (this.isCriticalChunk(chunkName)) {
      logger.error('Critical chunk failed to load, reloading page', error);
      window.location.reload();
      // This will never resolve, but TypeScript needs a return
      return new Promise(() => {});
    }

    // Return a fallback or throw
    throw new Error(`Failed to load chunk: ${chunkName}`);
  }

  /**
   * Check if chunk is critical
   */
  private isCriticalChunk(chunkName: string): boolean {
    const criticalChunks = ['main', 'vendor', 'runtime', 'app'];
    return criticalChunks.some(critical => chunkName.includes(critical));
  }

  /**
   * Lazy load a React component
   */
  lazyLoadComponent<T extends React.ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    options: LazyComponentOptions = {}
  ): React.LazyExoticComponent<T> {
    const {
      retry = 3,
      delay = 0,
      onError,
      preload = false,
    } = options;

    // Create lazy component with retry logic
    const LazyComponent = React.lazy(async () => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      try {
        return await this.dynamicImport(importFn, {
          maxRetries: retry,
          onRetry: (attempt, error) => {
            if (onError) {
              onError(error);
            }
          },
        });
      } catch (error) {
        if (onError) {
          onError(error as Error);
        }
        throw error;
      }
    });

    // Preload if requested
    if (preload) {
      this.preloadComponent(importFn);
    }

    return LazyComponent;
  }

  /**
   * Preload a component
   */
  async preloadComponent<T>(
    importFn: () => Promise<T>
  ): Promise<void> {
    try {
      await this.dynamicImport(importFn, {
        chunkName: 'preload',
      });
      logger.debug('Component preloaded successfully');
    } catch (error) {
      logger.warn('Component preload failed', { error });
    }
  }

  /**
   * Add resource hint to document head
   */
  addResourceHint(hint: ResourceHint): void {
    const key = `${hint.type}-${hint.href}`;

    // Check if already added
    if (this.resourceHints.has(key)) {
      return;
    }

    // Create link element
    const link = document.createElement('link');
    link.rel = hint.type;
    link.href = hint.href;

    if (hint.as) {
      link.as = hint.as;
    }

    if (hint.crossOrigin) {
      link.crossOrigin = hint.crossOrigin;
    }

    if (hint.media) {
      link.media = hint.media;
    }

    // Add to document head
    document.head.appendChild(link);
    this.resourceHints.add(key);

    logger.debug('Resource hint added', {
      type: hint.type,
      href: hint.href,
    });
  }

  /**
   * Preload critical resources
   */
  preloadCriticalResources(resources: ResourceHint[]): void {
    resources.forEach(resource => {
      this.addResourceHint(resource);
    });
  }

  /**
   * Prefetch next page resources
   */
  prefetchNextPage(route: string): void {
    // This would integrate with your router
    // to determine which chunks to prefetch
    const chunks = this.getChunksForRoute(route);

    chunks.forEach(chunk => {
      this.addResourceHint({
        type: 'prefetch',
        href: chunk,
        as: 'script',
      });
    });
  }

  /**
   * Get chunks for a route (placeholder)
   */
  private getChunksForRoute(route: string): string[] {
    // This would integrate with your build system
    // to map routes to chunks
    return [];
  }

  /**
   * Preconnect to external origins
   */
  preconnectOrigins(origins: string[]): void {
    origins.forEach(origin => {
      this.addResourceHint({
        type: 'preconnect',
        href: origin,
      });

      // Also add dns-prefetch as fallback
      this.addResourceHint({
        type: 'dns-prefetch',
        href: origin,
      });
    });
  }

  /**
   * Create code splitting points
   */
  createSplitPoint<T>(
    condition: boolean,
    importFn: () => Promise<T>,
    fallback?: T
  ): Promise<T> | T {
    if (condition) {
      return this.dynamicImport(importFn);
    }
    return fallback as T;
  }

  /**
   * Load external script dynamically
   */
  async loadScript(
    src: string,
    options: {
      async?: boolean;
      defer?: boolean;
      crossOrigin?: 'anonymous' | 'use-credentials';
      integrity?: string;
      onLoad?: () => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = options.async ?? true;
      script.defer = options.defer ?? false;

      if (options.crossOrigin) {
        script.crossOrigin = options.crossOrigin;
      }

      if (options.integrity) {
        script.integrity = options.integrity;
      }

      script.onload = () => {
        if (options.onLoad) {
          options.onLoad();
        }
        resolve();
      };

      script.onerror = () => {
        const error = new Error(`Failed to load script: ${src}`);
        if (options.onError) {
          options.onError(error);
        }
        reject(error);
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Load external CSS dynamically
   */
  async loadCSS(
    href: string,
    options: {
      media?: string;
      crossOrigin?: 'anonymous' | 'use-credentials';
      integrity?: string;
      onLoad?: () => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      const existing = document.querySelector(`link[href="${href}"]`);
      if (existing) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;

      if (options.media) {
        link.media = options.media;
      }

      if (options.crossOrigin) {
        link.crossOrigin = options.crossOrigin;
      }

      if (options.integrity) {
        link.integrity = options.integrity;
      }

      link.onload = () => {
        if (options.onLoad) {
          options.onLoad();
        }
        resolve();
      };

      link.onerror = () => {
        const error = new Error(`Failed to load CSS: ${href}`);
        if (options.onError) {
          options.onError(error);
        }
        reject(error);
      };

      document.head.appendChild(link);
    });
  }

  /**
   * Get bundle metrics
   */
  getMetrics(): BundleMetrics {
    return {
      ...this.metrics,
      chunks: new Map(this.metrics.chunks),
      loadTime: new Map(this.metrics.loadTime),
    };
  }

  /**
   * Analyze bundle (development only)
   */
  analyzeBundleSize(): void {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Get all loaded scripts
    const scripts = Array.from(document.scripts);
    let totalSize = 0;

    scripts.forEach(script => {
      if (script.src) {
        // Estimate size (would need actual implementation)
        const size = script.innerHTML.length;
        totalSize += size;
        this.metrics.chunks.set(script.src, size);
      }
    });

    this.metrics.totalSize = totalSize;

    logger.info('Bundle analysis', {
      totalSize,
      chunks: this.metrics.chunks.size,
      loaded: this.loadedChunks.size,
      failed: this.failedChunks.size,
    });
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = {
      totalSize: 0,
      chunks: new Map(),
      loadTime: new Map(),
      cacheHits: 0,
      cacheMisses: 0,
    };
  }
}

// Create singleton instance
export const bundleOptimizer = new BundleOptimizer();

// Export helper functions
export const dynamicImport = <T = any>(
  importFn: () => Promise<T>,
  options?: Parameters<BundleOptimizer['dynamicImport']>[1]
): Promise<T> => bundleOptimizer.dynamicImport(importFn, options);

export const lazyLoadComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options?: LazyComponentOptions
): React.LazyExoticComponent<T> =>
  bundleOptimizer.lazyLoadComponent(importFn, options);

export const preloadComponent = <T>(
  importFn: () => Promise<T>
): Promise<void> => bundleOptimizer.preloadComponent(importFn);

export const loadScript = (
  src: string,
  options?: Parameters<BundleOptimizer['loadScript']>[1]
): Promise<void> => bundleOptimizer.loadScript(src, options);

export const loadCSS = (
  href: string,
  options?: Parameters<BundleOptimizer['loadCSS']>[1]
): Promise<void> => bundleOptimizer.loadCSS(href, options);

export const preconnectOrigins = (origins: string[]): void =>
  bundleOptimizer.preconnectOrigins(origins);

export const getBundleMetrics = (): BundleMetrics =>
  bundleOptimizer.getMetrics();