/**
 * Production-ready Performance Metrics Collector
 *
 * Comprehensive performance monitoring with:
 * - Core Web Vitals tracking
 * - Resource timing analysis
 * - Memory and CPU monitoring
 * - Network performance metrics
 * - Custom performance marks
 * - Real User Monitoring (RUM)
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  inp?: number; // Interaction to Next Paint

  // Navigation Timing
  navigationTiming?: NavigationTimingMetrics;

  // Resource Timing
  resources?: ResourceMetrics[];

  // Memory Usage
  memory?: MemoryMetrics;

  // Custom Metrics
  custom?: Record<string, number>;

  // Metadata
  timestamp: number;
  url: string;
  userAgent: string;
  connectionType?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

export interface NavigationTimingMetrics {
  domainLookupTime: number;
  connectTime: number;
  requestTime: number;
  responseTime: number;
  domParsingTime: number;
  domContentLoadedTime: number;
  loadCompleteTime: number;
  totalLoadTime: number;
  redirectTime: number;
  cacheTime: number;
}

export interface ResourceMetrics {
  name: string;
  type: string;
  startTime: number;
  duration: number;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  initiatorType: string;
  protocol?: string;
  cached: boolean;
}

export interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
}

export interface PerformanceBudget {
  metric: string;
  threshold: number;
  severity: 'warning' | 'error';
}

export interface PerformanceReport {
  metrics: PerformanceMetrics;
  violations: BudgetViolation[];
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
}

export interface BudgetViolation {
  metric: string;
  actual: number;
  threshold: number;
  severity: 'warning' | 'error';
  difference: number;
  percentageOver: number;
}

// ============================================================================
// Performance Metrics Collector Class
// ============================================================================

export class PerformanceMetricsCollector {
  private metrics: PerformanceMetrics[] = [];
  private budgets: PerformanceBudget[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private customMarks: Map<string, number> = new Map();
  private isInitialized = false;
  private reportCallback?: (report: PerformanceReport) => void;

  constructor() {
    this.initializeDefaultBudgets();
  }

  /**
   * Initialize default performance budgets
   */
  private initializeDefaultBudgets(): void {
    this.budgets = [
      // Core Web Vitals
      { metric: 'lcp', threshold: 2500, severity: 'warning' },
      { metric: 'lcp', threshold: 4000, severity: 'error' },
      { metric: 'fid', threshold: 100, severity: 'warning' },
      { metric: 'fid', threshold: 300, severity: 'error' },
      { metric: 'cls', threshold: 0.1, severity: 'warning' },
      { metric: 'cls', threshold: 0.25, severity: 'error' },
      { metric: 'inp', threshold: 200, severity: 'warning' },
      { metric: 'inp', threshold: 500, severity: 'error' },

      // Other metrics
      { metric: 'ttfb', threshold: 800, severity: 'warning' },
      { metric: 'ttfb', threshold: 1800, severity: 'error' },
      { metric: 'fcp', threshold: 1800, severity: 'warning' },
      { metric: 'fcp', threshold: 3000, severity: 'error' },
      { metric: 'totalLoadTime', threshold: 3000, severity: 'warning' },
      { metric: 'totalLoadTime', threshold: 5000, severity: 'error' },
    ];
  }

  /**
   * Initialize performance monitoring
   */
  initialize(callback?: (report: PerformanceReport) => void): void {
    if (this.isInitialized || typeof window === 'undefined') return;

    this.reportCallback = callback;

    // Set up Core Web Vitals observers
    this.observeWebVitals();

    // Set up navigation timing
    this.observeNavigationTiming();

    // Set up resource timing
    this.observeResourceTiming();

    // Set up memory monitoring
    this.startMemoryMonitoring();

    // Set up long task observer
    this.observeLongTasks();

    this.isInitialized = true;
  }

  /**
   * Observe Core Web Vitals
   */
  private observeWebVitals(): void {
    // Largest Contentful Paint (LCP)
    this.createObserver('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1];
      this.updateMetric('lcp', lastEntry.startTime);
    });

    // First Input Delay (FID)
    this.createObserver('first-input', (entries) => {
      const firstEntry = entries[0];
      if (firstEntry) {
        const fid = firstEntry.processingStart - firstEntry.startTime;
        this.updateMetric('fid', fid);
      }
    });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    let clsEntries: PerformanceEntry[] = [];

    this.createObserver('layout-shift', (entries) => {
      for (const entry of entries) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          clsEntries.push(entry);
        }
      }
      this.updateMetric('cls', clsValue);
    });

    // First Contentful Paint (FCP)
    this.createObserver('paint', (entries) => {
      for (const entry of entries) {
        if (entry.name === 'first-contentful-paint') {
          this.updateMetric('fcp', entry.startTime);
        }
      }
    });

    // Interaction to Next Paint (INP)
    const interactionMap = new Map<number, number>();

    this.createObserver('event', (entries) => {
      for (const entry of entries) {
        if ((entry as any).interactionId) {
          const inp = entry.duration;
          const interactionId = (entry as any).interactionId;

          if (!interactionMap.has(interactionId) || interactionMap.get(interactionId)! < inp) {
            interactionMap.set(interactionId, inp);

            // Get the max INP value
            const maxInp = Math.max(...interactionMap.values());
            this.updateMetric('inp', maxInp);
          }
        }
      }
    });
  }

  /**
   * Create performance observer
   */
  private createObserver(
    type: string,
    callback: (entries: PerformanceEntry[]) => void
  ): void {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });

      observer.observe({ type, buffered: true });
      this.observers.set(type, observer);
    } catch (e) {
      // Observer type not supported
      console.debug(`Performance observer type '${type}' not supported`);
    }
  }

  /**
   * Observe navigation timing
   */
  private observeNavigationTiming(): void {
    if (!performance || !performance.timing) return;

    // Wait for page load
    if (document.readyState === 'complete') {
      this.collectNavigationTiming();
    } else {
      window.addEventListener('load', () => {
        this.collectNavigationTiming();
      });
    }
  }

  /**
   * Collect navigation timing metrics
   */
  private collectNavigationTiming(): void {
    const timing = performance.timing;
    const navigation = performance.getEntriesByType('navigation')[0] as any;

    if (navigation) {
      // Use Navigation Timing API v2
      const metrics: NavigationTimingMetrics = {
        domainLookupTime: navigation.domainLookupEnd - navigation.domainLookupStart,
        connectTime: navigation.connectEnd - navigation.connectStart,
        requestTime: navigation.responseStart - navigation.requestStart,
        responseTime: navigation.responseEnd - navigation.responseStart,
        domParsingTime: navigation.domInteractive - navigation.responseEnd,
        domContentLoadedTime: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadCompleteTime: navigation.loadEventEnd - navigation.loadEventStart,
        totalLoadTime: navigation.loadEventEnd - navigation.fetchStart,
        redirectTime: navigation.redirectEnd - navigation.redirectStart,
        cacheTime: navigation.domainLookupStart - navigation.fetchStart,
      };

      this.updateMetric('navigationTiming', metrics);
      this.updateMetric('ttfb', navigation.responseStart - navigation.fetchStart);
      this.updateMetric('totalLoadTime', metrics.totalLoadTime);
    } else if (timing) {
      // Fallback to Navigation Timing API v1
      const metrics: NavigationTimingMetrics = {
        domainLookupTime: timing.domainLookupEnd - timing.domainLookupStart,
        connectTime: timing.connectEnd - timing.connectStart,
        requestTime: timing.responseStart - timing.requestStart,
        responseTime: timing.responseEnd - timing.responseStart,
        domParsingTime: timing.domInteractive - timing.responseEnd,
        domContentLoadedTime: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
        loadCompleteTime: timing.loadEventEnd - timing.loadEventStart,
        totalLoadTime: timing.loadEventEnd - timing.navigationStart,
        redirectTime: timing.redirectEnd - timing.redirectStart,
        cacheTime: timing.domainLookupStart - timing.fetchStart,
      };

      this.updateMetric('navigationTiming', metrics);
      this.updateMetric('ttfb', timing.responseStart - timing.navigationStart);
      this.updateMetric('totalLoadTime', metrics.totalLoadTime);
    }
  }

  /**
   * Observe resource timing
   */
  private observeResourceTiming(): void {
    this.createObserver('resource', (entries) => {
      const resources: ResourceMetrics[] = entries.map((entry: any) => ({
        name: entry.name,
        type: this.getResourceType(entry.name),
        startTime: entry.startTime,
        duration: entry.duration,
        transferSize: entry.transferSize || 0,
        encodedBodySize: entry.encodedBodySize || 0,
        decodedBodySize: entry.decodedBodySize || 0,
        initiatorType: entry.initiatorType,
        protocol: entry.nextHopProtocol,
        cached: entry.transferSize === 0 && entry.decodedBodySize > 0,
      }));

      this.updateMetric('resources', resources);
    });
  }

  /**
   * Get resource type from URL
   */
  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();

    const typeMap: Record<string, string> = {
      js: 'script',
      mjs: 'script',
      css: 'stylesheet',
      jpg: 'image',
      jpeg: 'image',
      png: 'image',
      gif: 'image',
      svg: 'image',
      webp: 'image',
      woff: 'font',
      woff2: 'font',
      ttf: 'font',
      otf: 'font',
      json: 'fetch',
      xml: 'fetch',
    };

    return typeMap[extension || ''] || 'other';
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if (!(performance as any).memory) return;

    const collectMemory = () => {
      const memory = (performance as any).memory;

      const metrics: MemoryMetrics = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      };

      this.updateMetric('memory', metrics);
    };

    // Collect memory metrics every 10 seconds
    setInterval(collectMemory, 10000);
    collectMemory(); // Initial collection
  }

  /**
   * Observe long tasks
   */
  private observeLongTasks(): void {
    this.createObserver('longtask', (entries) => {
      for (const entry of entries) {
        if (entry.duration > 50) {
          // Long task detected (>50ms)
          this.trackCustomMetric('longTask', entry.duration);
        }
      }
    });
  }

  /**
   * Update metric
   */
  private updateMetric(key: string, value: any): void {
    const currentMetrics = this.getCurrentMetrics();
    (currentMetrics as any)[key] = value;

    // Check budgets and generate report
    const report = this.generateReport(currentMetrics);

    if (this.reportCallback) {
      this.reportCallback(report);
    }
  }

  /**
   * Get current metrics
   */
  private getCurrentMetrics(): PerformanceMetrics {
    const lastMetrics = this.metrics[this.metrics.length - 1];

    if (lastMetrics && Date.now() - lastMetrics.timestamp < 1000) {
      return lastMetrics;
    }

    const newMetrics: PerformanceMetrics = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: (navigator as any).connection?.effectiveType,
      deviceMemory: (navigator as any).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
    };

    this.metrics.push(newMetrics);
    return newMetrics;
  }

  /**
   * Mark custom performance point
   */
  mark(name: string): void {
    performance.mark(name);
    this.customMarks.set(name, performance.now());
  }

  /**
   * Measure between two marks
   */
  measure(name: string, startMark: string, endMark?: string): number {
    const start = this.customMarks.get(startMark);
    if (!start) {
      console.warn(`Start mark '${startMark}' not found`);
      return 0;
    }

    const end = endMark
      ? this.customMarks.get(endMark) || performance.now()
      : performance.now();

    const duration = end - start;

    performance.measure(name, startMark, endMark);
    this.trackCustomMetric(name, duration);

    return duration;
  }

  /**
   * Track custom metric
   */
  trackCustomMetric(name: string, value: number): void {
    const metrics = this.getCurrentMetrics();

    if (!metrics.custom) {
      metrics.custom = {};
    }

    metrics.custom[name] = value;
  }

  /**
   * Set performance budget
   */
  setBudget(metric: string, threshold: number, severity: 'warning' | 'error' = 'warning'): void {
    this.budgets.push({ metric, threshold, severity });
  }

  /**
   * Clear budget
   */
  clearBudget(metric: string): void {
    this.budgets = this.budgets.filter(b => b.metric !== metric);
  }

  /**
   * Generate performance report
   */
  private generateReport(metrics: PerformanceMetrics): PerformanceReport {
    const violations: BudgetViolation[] = [];
    const recommendations: string[] = [];

    // Check budgets
    for (const budget of this.budgets) {
      const value = this.getMetricValue(metrics, budget.metric);

      if (value !== undefined && value > budget.threshold) {
        violations.push({
          metric: budget.metric,
          actual: value,
          threshold: budget.threshold,
          severity: budget.severity,
          difference: value - budget.threshold,
          percentageOver: ((value - budget.threshold) / budget.threshold) * 100,
        });
      }
    }

    // Calculate score
    const score = this.calculateScore(metrics, violations);
    const grade = this.getGrade(score);

    // Generate recommendations
    if (metrics.lcp && metrics.lcp > 2500) {
      recommendations.push('Optimize largest contentful paint by lazy loading images and optimizing critical rendering path');
    }

    if (metrics.fid && metrics.fid > 100) {
      recommendations.push('Reduce first input delay by minimizing JavaScript execution time');
    }

    if (metrics.cls && metrics.cls > 0.1) {
      recommendations.push('Reduce layout shift by specifying image dimensions and avoiding dynamic content injection');
    }

    if (metrics.ttfb && metrics.ttfb > 800) {
      recommendations.push('Improve server response time with caching and CDN');
    }

    if (metrics.memory && metrics.memory.usagePercentage > 80) {
      recommendations.push('High memory usage detected. Consider optimizing memory consumption');
    }

    return {
      metrics,
      violations,
      score,
      grade,
      recommendations,
    };
  }

  /**
   * Get metric value from metrics object
   */
  private getMetricValue(metrics: PerformanceMetrics, key: string): number | undefined {
    if (key === 'totalLoadTime' && metrics.navigationTiming) {
      return metrics.navigationTiming.totalLoadTime;
    }

    return (metrics as any)[key];
  }

  /**
   * Calculate performance score
   */
  private calculateScore(metrics: PerformanceMetrics, violations: BudgetViolation[]): number {
    let score = 100;

    // Deduct points for violations
    for (const violation of violations) {
      if (violation.severity === 'error') {
        score -= 20;
      } else {
        score -= 10;
      }
    }

    // Bonus points for good metrics
    if (metrics.lcp && metrics.lcp < 1000) score += 5;
    if (metrics.fid && metrics.fid < 50) score += 5;
    if (metrics.cls && metrics.cls < 0.05) score += 5;
    if (metrics.ttfb && metrics.ttfb < 400) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get grade from score
   */
  private getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return this.metrics;
  }

  /**
   * Get latest metrics
   */
  getLatestMetrics(): PerformanceMetrics | undefined {
    return this.metrics[this.metrics.length - 1];
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.customMarks.clear();
  }

  /**
   * Destroy observers
   */
  destroy(): void {
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();
    this.isInitialized = false;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const performanceCollector = new PerformanceMetricsCollector();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Initialize performance monitoring
 */
export function initializePerformanceMonitoring(
  callback?: (report: PerformanceReport) => void
): void {
  performanceCollector.initialize(callback);
}

/**
 * Mark performance point
 */
export function performanceMark(name: string): void {
  performanceCollector.mark(name);
}

/**
 * Measure performance between marks
 */
export function performanceMeasure(
  name: string,
  startMark: string,
  endMark?: string
): number {
  return performanceCollector.measure(name, startMark, endMark);
}

/**
 * Track custom metric
 */
export function trackMetric(name: string, value: number): void {
  performanceCollector.trackCustomMetric(name, value);
}

/**
 * Set performance budget
 */
export function setPerformanceBudget(
  metric: string,
  threshold: number,
  severity?: 'warning' | 'error'
): void {
  performanceCollector.setBudget(metric, threshold, severity);
}

export default performanceCollector;