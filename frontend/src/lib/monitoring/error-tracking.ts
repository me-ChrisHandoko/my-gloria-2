/**
 * Production-ready Error Tracking and Alerting System
 *
 * Comprehensive error tracking with:
 * - Error categorization and severity levels
 * - Stack trace analysis
 * - Error grouping and deduplication
 * - Alert management
 * - Integration with Sentry
 * - Custom error handlers
 */

import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/errors/errorLogger';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ErrorEvent {
  id: string;
  fingerprint: string;
  message: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal';
  timestamp: number;
  error?: Error;
  stackTrace?: string;
  context: ErrorContext;
  metadata: ErrorMetadata;
  breadcrumbs: Breadcrumb[];
  groupId?: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
}

export interface ErrorContext {
  url?: string;
  method?: string;
  statusCode?: number;
  userId?: string;
  sessionId?: string;
  browser?: string;
  os?: string;
  device?: string;
  release?: string;
  environment?: string;
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

export interface ErrorMetadata {
  type: ErrorType;
  category: ErrorCategory;
  severity: ErrorSeverity;
  isHandled: boolean;
  isRetryable: boolean;
  affectedUsers: number;
  occurrences: number;
  resolved: boolean;
  resolvedAt?: number;
  assignee?: string;
  notes?: string[];
}

export enum ErrorType {
  JAVASCRIPT = 'javascript',
  API = 'api',
  NETWORK = 'network',
  PERMISSION = 'permission',
  VALIDATION = 'validation',
  BUSINESS = 'business',
  UNKNOWN = 'unknown',
}

export enum ErrorCategory {
  FRONTEND = 'frontend',
  BACKEND = 'backend',
  INTEGRATION = 'integration',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  USER = 'user',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface Breadcrumb {
  timestamp: number;
  type: 'navigation' | 'http' | 'console' | 'user' | 'error';
  category?: string;
  message?: string;
  level?: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

export interface ErrorAlert {
  id: string;
  errorId: string;
  fingerprint: string;
  severity: ErrorSeverity;
  threshold: number;
  currentCount: number;
  triggered: boolean;
  triggeredAt?: number;
  resolvedAt?: number;
  channels: AlertChannel[];
  message: string;
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: Record<string, any>;
  enabled: boolean;
}

export interface ErrorTrackingConfig {
  enabled: boolean;
  environment: string;
  release?: string;
  sampleRate: number;
  attachStackTrace: boolean;
  maxBreadcrumbs: number;
  beforeSend?: (event: any) => any;
  integrations: string[];
  alertThresholds: {
    [key in ErrorSeverity]: number;
  };
  groupingRules: GroupingRule[];
  ignoreErrors: RegExp[];
}

export interface GroupingRule {
  id: string;
  name: string;
  matcher: (error: ErrorEvent) => boolean;
  groupKey: (error: ErrorEvent) => string;
}

export interface ErrorStats {
  total: number;
  byType: Record<ErrorType, number>;
  byCategory: Record<ErrorCategory, number>;
  bySeverity: Record<ErrorSeverity, number>;
  resolved: number;
  unresolved: number;
  affectedUsers: number;
  errorRate: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

// ============================================================================
// Error Tracking Class
// ============================================================================

export class ErrorTracking {
  private config: ErrorTrackingConfig;
  private errors: Map<string, ErrorEvent> = new Map();
  private alerts: Map<string, ErrorAlert> = new Map();
  private breadcrumbs: Breadcrumb[] = [];
  private groupingRules: GroupingRule[] = [];
  private isInitialized = false;

  constructor(config: Partial<ErrorTrackingConfig> = {}) {
    this.config = {
      enabled: true,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.NEXT_PUBLIC_APP_VERSION,
      sampleRate: 1.0,
      attachStackTrace: true,
      maxBreadcrumbs: 50,
      integrations: ['sentry'],
      alertThresholds: {
        [ErrorSeverity.LOW]: 10,
        [ErrorSeverity.MEDIUM]: 5,
        [ErrorSeverity.HIGH]: 2,
        [ErrorSeverity.CRITICAL]: 1,
      },
      groupingRules: [],
      ignoreErrors: [
        /ResizeObserver loop limit exceeded/,
        /Non-Error promise rejection captured/,
        /Network request failed/,
      ],
      ...config,
    };

    this.initializeDefaultGroupingRules();
  }

  /**
   * Initialize error tracking
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled || this.isInitialized) return;

    // Initialize Sentry if enabled
    if (this.config.integrations.includes('sentry')) {
      this.initializeSentry();
    }

    // Set up global error handlers
    this.setupGlobalErrorHandlers();

    // Set up breadcrumb tracking
    this.setupBreadcrumbTracking();

    this.isInitialized = true;
    logger.info('Error tracking initialized');
  }

  /**
   * Initialize Sentry
   */
  private initializeSentry(): void {
    if (typeof window === 'undefined') return;

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: this.config.environment,
      release: this.config.release,
      sampleRate: this.config.sampleRate,
      attachStacktrace: this.config.attachStackTrace,
      maxBreadcrumbs: this.config.maxBreadcrumbs,
      beforeSend: this.config.beforeSend || ((event) => {
        // Filter out ignored errors
        if (event.exception?.values?.[0]?.value) {
          const errorMessage = event.exception.values[0].value;
          if (this.config.ignoreErrors.some(regex => regex.test(errorMessage))) {
            return null;
          }
        }
        return event;
      }),
      integrations: [
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
    });

    // Set user context if available
    const userId = localStorage.getItem('userId');
    if (userId) {
      Sentry.setUser({ id: userId });
    }
  }

  /**
   * Initialize default grouping rules
   */
  private initializeDefaultGroupingRules(): void {
    this.groupingRules = [
      {
        id: 'api-errors',
        name: 'API Errors',
        matcher: (error) => error.metadata.type === ErrorType.API,
        groupKey: (error) => `api-${error.context.statusCode}-${error.context.url}`,
      },
      {
        id: 'network-errors',
        name: 'Network Errors',
        matcher: (error) => error.metadata.type === ErrorType.NETWORK,
        groupKey: (error) => `network-${error.message}`,
      },
      {
        id: 'validation-errors',
        name: 'Validation Errors',
        matcher: (error) => error.metadata.type === ErrorType.VALIDATION,
        groupKey: (error) => `validation-${error.context.url}`,
      },
      ...this.config.groupingRules,
    ];
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    // Handle unhandled errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        context: {
          url: event.filename,
          extra: {
            lineno: event.lineno,
            colno: event.colno,
          },
        },
        metadata: {
          type: ErrorType.JAVASCRIPT,
          category: ErrorCategory.FRONTEND,
          isHandled: false,
        },
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        {
          context: {
            extra: { reason: event.reason },
          },
          metadata: {
            type: ErrorType.JAVASCRIPT,
            category: ErrorCategory.FRONTEND,
            isHandled: false,
          },
        }
      );
    });
  }

  /**
   * Set up breadcrumb tracking
   */
  private setupBreadcrumbTracking(): void {
    if (typeof window === 'undefined') return;

    // Track navigation
    const originalPushState = history.pushState;
    history.pushState = (...args) => {
      this.addBreadcrumb({
        type: 'navigation',
        category: 'navigation',
        message: `Navigated to ${args[2]}`,
        data: { to: args[2] },
      });
      return originalPushState.apply(history, args);
    };

    // Track console logs
    ['log', 'warn', 'error'].forEach((level) => {
      const original = (console as any)[level];
      (console as any)[level] = (...args: any[]) => {
        this.addBreadcrumb({
          type: 'console',
          level: level as any,
          message: args.join(' '),
        });
        return original.apply(console, args);
      };
    });

    // Track user interactions
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      this.addBreadcrumb({
        type: 'user',
        category: 'ui.click',
        message: `Clicked on ${target.tagName}`,
        data: {
          tagName: target.tagName,
          id: target.id,
          className: target.className,
        },
      });
    });
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    const fullBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: Date.now(),
    };

    this.breadcrumbs.push(fullBreadcrumb);

    // Limit breadcrumbs
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    // Also add to Sentry
    if (this.config.integrations.includes('sentry')) {
      Sentry.addBreadcrumb(breadcrumb as any);
    }
  }

  /**
   * Capture error
   */
  captureError(
    error: Error | string,
    options: {
      context?: Partial<ErrorContext>;
      metadata?: Partial<ErrorMetadata>;
      level?: ErrorEvent['level'];
    } = {}
  ): string {
    // Create error object if string
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    // Check if should ignore
    if (this.shouldIgnoreError(errorObj)) {
      return '';
    }

    // Generate fingerprint
    const fingerprint = this.generateFingerprint(errorObj, options.context);

    // Check if error already exists
    let errorEvent = this.errors.get(fingerprint);

    if (errorEvent) {
      // Update existing error
      errorEvent.count++;
      errorEvent.lastSeen = Date.now();
      errorEvent.metadata.occurrences++;
    } else {
      // Create new error event
      errorEvent = this.createErrorEvent(errorObj, fingerprint, options);
      this.errors.set(fingerprint, errorEvent);

      // Group error if applicable
      this.groupError(errorEvent);
    }

    // Determine severity
    const severity = this.determineSeverity(errorEvent);
    errorEvent.metadata.severity = severity;

    // Check for alerts
    this.checkAlerts(errorEvent);

    // Send to Sentry
    if (this.config.integrations.includes('sentry')) {
      this.sendToSentry(errorEvent);
    }

    // Log error
    this.logError(errorEvent);

    return errorEvent.id;
  }

  /**
   * Check if should ignore error
   */
  private shouldIgnoreError(error: Error): boolean {
    return this.config.ignoreErrors.some(regex =>
      regex.test(error.message || error.toString())
    );
  }

  /**
   * Generate error fingerprint
   */
  private generateFingerprint(error: Error, context?: Partial<ErrorContext>): string {
    const parts = [
      error.name,
      error.message,
      context?.url,
      context?.statusCode,
    ].filter(Boolean);

    return parts.join('-');
  }

  /**
   * Create error event
   */
  private createErrorEvent(
    error: Error,
    fingerprint: string,
    options: any
  ): ErrorEvent {
    const id = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id,
      fingerprint,
      message: error.message || error.toString(),
      level: options.level || 'error',
      timestamp: Date.now(),
      error,
      stackTrace: error.stack,
      context: {
        url: window?.location?.href,
        userId: localStorage.getItem('userId') || undefined,
        sessionId: sessionStorage.getItem('sessionId') || undefined,
        browser: navigator?.userAgent,
        environment: this.config.environment,
        release: this.config.release,
        ...options.context,
      },
      metadata: {
        type: ErrorType.UNKNOWN,
        category: ErrorCategory.FRONTEND,
        severity: ErrorSeverity.MEDIUM,
        isHandled: true,
        isRetryable: false,
        affectedUsers: 1,
        occurrences: 1,
        resolved: false,
        ...options.metadata,
      },
      breadcrumbs: [...this.breadcrumbs],
      count: 1,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
    };
  }

  /**
   * Group error
   */
  private groupError(error: ErrorEvent): void {
    for (const rule of this.groupingRules) {
      if (rule.matcher(error)) {
        error.groupId = rule.groupKey(error);
        break;
      }
    }
  }

  /**
   * Determine severity
   */
  private determineSeverity(error: ErrorEvent): ErrorSeverity {
    // Critical: Unhandled errors, security issues, data loss
    if (!error.metadata.isHandled ||
        error.metadata.category === ErrorCategory.SECURITY ||
        error.level === 'fatal') {
      return ErrorSeverity.CRITICAL;
    }

    // High: API errors, business logic errors
    if (error.metadata.type === ErrorType.API ||
        error.metadata.type === ErrorType.BUSINESS ||
        error.context.statusCode === 500) {
      return ErrorSeverity.HIGH;
    }

    // Medium: Validation errors, permission errors
    if (error.metadata.type === ErrorType.VALIDATION ||
        error.metadata.type === ErrorType.PERMISSION) {
      return ErrorSeverity.MEDIUM;
    }

    // Low: Everything else
    return ErrorSeverity.LOW;
  }

  /**
   * Check for alerts
   */
  private checkAlerts(error: ErrorEvent): void {
    const severity = error.metadata.severity;
    const threshold = this.config.alertThresholds[severity];

    if (error.count >= threshold) {
      const alertId = `alert-${error.fingerprint}`;
      let alert = this.alerts.get(alertId);

      if (!alert || alert.resolvedAt) {
        alert = {
          id: alertId,
          errorId: error.id,
          fingerprint: error.fingerprint,
          severity,
          threshold,
          currentCount: error.count,
          triggered: true,
          triggeredAt: Date.now(),
          channels: this.getAlertChannels(severity),
          message: `Error threshold exceeded: ${error.message}`,
        };

        this.alerts.set(alertId, alert);
        this.sendAlert(alert);
      }
    }
  }

  /**
   * Get alert channels based on severity
   */
  private getAlertChannels(severity: ErrorSeverity): AlertChannel[] {
    const channels: AlertChannel[] = [];

    // Add channels based on severity
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        channels.push(
          { type: 'email', config: {}, enabled: true },
          { type: 'slack', config: {}, enabled: true },
          { type: 'sms', config: {}, enabled: true }
        );
        break;
      case ErrorSeverity.HIGH:
        channels.push(
          { type: 'email', config: {}, enabled: true },
          { type: 'slack', config: {}, enabled: true }
        );
        break;
      case ErrorSeverity.MEDIUM:
        channels.push({ type: 'slack', config: {}, enabled: true });
        break;
      case ErrorSeverity.LOW:
        // No alerts for low severity
        break;
    }

    return channels;
  }

  /**
   * Send alert
   */
  private sendAlert(alert: ErrorAlert): void {
    for (const channel of alert.channels) {
      if (!channel.enabled) continue;

      switch (channel.type) {
        case 'email':
          // Send email alert
          logger.warn('Email alert:', alert.message);
          break;
        case 'slack':
          // Send Slack alert
          logger.warn('Slack alert:', alert.message);
          break;
        case 'webhook':
          // Send webhook
          logger.warn('Webhook alert:', alert.message);
          break;
        case 'sms':
          // Send SMS
          logger.warn('SMS alert:', alert.message);
          break;
      }
    }
  }

  /**
   * Send to Sentry
   */
  private sendToSentry(error: ErrorEvent): void {
    if (typeof window === 'undefined') return;

    Sentry.withScope((scope) => {
      // Set context
      scope.setLevel(error.level as any);
      scope.setContext('custom', error.context as Record<string, any>);
      scope.setTags(error.context.tags || {});
      scope.setExtras(error.context.extra || {});
      scope.setFingerprint([error.fingerprint]);

      // Add breadcrumbs
      error.breadcrumbs.forEach(breadcrumb => {
        scope.addBreadcrumb(breadcrumb as any);
      });

      // Capture exception
      if (error.error) {
        Sentry.captureException(error.error);
      } else {
        Sentry.captureMessage(error.message, error.level as any);
      }
    });
  }

  /**
   * Log error
   */
  private logError(error: ErrorEvent): void {
    const logData = {
      id: error.id,
      message: error.message,
      severity: error.metadata.severity,
      type: error.metadata.type,
      occurrences: error.metadata.occurrences,
      context: error.context,
    };

    switch (error.level) {
      case 'debug':
        logger.debug('Error tracked:', logData);
        break;
      case 'info':
        logger.info('Error tracked:', logData);
        break;
      case 'warning':
        logger.warn('Error tracked:', logData);
        break;
      case 'error': {
        const errorObj = error.error instanceof Error ? error.error : new Error(error.message);
        logger.error('Error tracked:', errorObj, logData);
        break;
      }
      case 'fatal': {
        const fatalErrorObj = error.error instanceof Error ? error.error : new Error(error.message);
        logger.fatal('Fatal error tracked:', fatalErrorObj, logData);
        break;
      }
    }
  }

  /**
   * Get error statistics
   */
  getStats(): ErrorStats {
    const errors = Array.from(this.errors.values());

    const stats: ErrorStats = {
      total: errors.length,
      byType: {} as any,
      byCategory: {} as any,
      bySeverity: {} as any,
      resolved: errors.filter(e => e.metadata.resolved).length,
      unresolved: errors.filter(e => !e.metadata.resolved).length,
      affectedUsers: new Set(errors.map(e => e.context.userId).filter(Boolean)).size,
      errorRate: 0,
      trend: 'stable',
    };

    // Count by type
    for (const type of Object.values(ErrorType)) {
      stats.byType[type] = errors.filter(e => e.metadata.type === type).length;
    }

    // Count by category
    for (const category of Object.values(ErrorCategory)) {
      stats.byCategory[category] = errors.filter(e => e.metadata.category === category).length;
    }

    // Count by severity
    for (const severity of Object.values(ErrorSeverity)) {
      stats.bySeverity[severity] = errors.filter(e => e.metadata.severity === severity).length;
    }

    // Calculate error rate (errors per hour)
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const recentErrors = errors.filter(e => e.lastSeen > hourAgo);
    stats.errorRate = recentErrors.length;

    // Determine trend
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const previousHourErrors = errors.filter(
      e => e.lastSeen > twoHoursAgo && e.lastSeen <= hourAgo
    );

    if (recentErrors.length > previousHourErrors.length * 1.2) {
      stats.trend = 'increasing';
    } else if (recentErrors.length < previousHourErrors.length * 0.8) {
      stats.trend = 'decreasing';
    }

    return stats;
  }

  /**
   * Get errors
   */
  getErrors(filters?: {
    severity?: ErrorSeverity;
    type?: ErrorType;
    category?: ErrorCategory;
    resolved?: boolean;
    limit?: number;
  }): ErrorEvent[] {
    let errors = Array.from(this.errors.values());

    // Apply filters
    if (filters) {
      if (filters.severity !== undefined) {
        errors = errors.filter(e => e.metadata.severity === filters.severity);
      }
      if (filters.type !== undefined) {
        errors = errors.filter(e => e.metadata.type === filters.type);
      }
      if (filters.category !== undefined) {
        errors = errors.filter(e => e.metadata.category === filters.category);
      }
      if (filters.resolved !== undefined) {
        errors = errors.filter(e => e.metadata.resolved === filters.resolved);
      }
    }

    // Sort by last seen (most recent first)
    errors.sort((a, b) => b.lastSeen - a.lastSeen);

    // Apply limit
    if (filters?.limit) {
      errors = errors.slice(0, filters.limit);
    }

    return errors;
  }

  /**
   * Resolve error
   */
  resolveError(errorId: string): void {
    const error = Array.from(this.errors.values()).find(e => e.id === errorId);
    if (error) {
      error.metadata.resolved = true;
      error.metadata.resolvedAt = Date.now();

      // Resolve associated alerts
      const alerts = Array.from(this.alerts.values()).filter(
        a => a.fingerprint === error.fingerprint
      );
      alerts.forEach(alert => {
        alert.resolvedAt = Date.now();
      });
    }
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors.clear();
    this.alerts.clear();
    this.breadcrumbs = [];
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const errorTracking = new ErrorTracking({
  enabled: process.env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING === 'true',
  environment: process.env.NODE_ENV || 'development',
  release: process.env.NEXT_PUBLIC_APP_VERSION,
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Capture error
 */
export function captureError(
  error: Error | string,
  options?: Parameters<ErrorTracking['captureError']>[1]
): string {
  return errorTracking.captureError(error, options);
}

/**
 * Add breadcrumb
 */
export function addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
  errorTracking.addBreadcrumb(breadcrumb);
}

/**
 * Get error statistics
 */
export function getErrorStats(): ErrorStats {
  return errorTracking.getStats();
}

export default errorTracking;