import * as Sentry from '@sentry/nextjs';

/**
 * Log levels for application logging
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  enableConsole: boolean;
  enableSentry: boolean;
  minLevel: LogLevel;
  prefix?: string;
}

/**
 * Log entry structure
 */
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: any;
  error?: Error;
  context?: Record<string, any>;
}

/**
 * Application logger class
 */
class Logger {
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private maxBufferSize = 100;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      enableConsole: process.env.NODE_ENV === 'development',
      enableSentry: process.env.NODE_ENV === 'production',
      minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      prefix: '[Gloria]',
      ...config,
    };
  }

  /**
   * Check if log level should be processed
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    const minIndex = levels.indexOf(this.config.minLevel);
    const levelIndex = levels.indexOf(level);
    return levelIndex >= minIndex;
  }

  /**
   * Format log message
   */
  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const prefix = this.config.prefix || '';
    const level = entry.level.toUpperCase();
    return `${timestamp} ${prefix} [${level}] ${entry.message}`;
  }

  /**
   * Log to console
   */
  private logToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const formattedMessage = this.formatMessage(entry);
    const data = entry.data || entry.context;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, data);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, data);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, data);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formattedMessage, entry.error || data);
        break;
    }
  }

  /**
   * Log to Sentry
   */
  private logToSentry(entry: LogEntry): void {
    if (!this.config.enableSentry || !process.env.NEXT_PUBLIC_SENTRY_DSN) return;

    // Add breadcrumb for all log levels
    Sentry.addBreadcrumb({
      message: entry.message,
      level: this.mapToSentryLevel(entry.level),
      category: 'logger',
      data: entry.data,
      timestamp: entry.timestamp.getTime() / 1000,
    });

    // Capture errors and fatal logs
    if (entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL) {
      if (entry.error) {
        Sentry.captureException(entry.error, {
          level: this.mapToSentryLevel(entry.level),
          contexts: {
            logger: {
              message: entry.message,
              data: entry.data,
              context: entry.context,
            },
          },
        });
      } else {
        Sentry.captureMessage(entry.message, this.mapToSentryLevel(entry.level));
      }
    }
  }

  /**
   * Map log level to Sentry severity
   */
  private mapToSentryLevel(level: LogLevel): Sentry.SeverityLevel {
    switch (level) {
      case LogLevel.DEBUG:
        return 'debug';
      case LogLevel.INFO:
        return 'info';
      case LogLevel.WARN:
        return 'warning';
      case LogLevel.ERROR:
        return 'error';
      case LogLevel.FATAL:
        return 'fatal';
      default:
        return 'info';
    }
  }

  /**
   * Add entry to buffer
   */
  private addToBuffer(entry: LogEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }
  }

  /**
   * Main log method
   */
  private log(level: LogLevel, message: string, data?: any, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      data,
      error,
    };

    // Add to buffer
    this.addToBuffer(entry);

    // Log to various outputs
    this.logToConsole(entry);
    this.logToSentry(entry);
  }

  /**
   * Debug log
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Info log
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Warning log
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Error log
   */
  error(message: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  /**
   * Fatal log
   */
  fatal(message: string, error?: Error, data?: any): void {
    this.log(LogLevel.FATAL, message, data, error);
  }

  /**
   * Set user context for logging
   */
  setUser(user: { id: string; email?: string; name?: string }): void {
    if (this.config.enableSentry) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.name,
      });
    }
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    if (this.config.enableSentry) {
      Sentry.setUser(null);
    }
  }

  /**
   * Set additional context
   */
  setContext(key: string, context: Record<string, any>): void {
    if (this.config.enableSentry) {
      Sentry.setContext(key, context);
    }
  }

  /**
   * Set tags for categorization
   */
  setTags(tags: Record<string, string>): void {
    if (this.config.enableSentry) {
      Sentry.setTags(tags);
    }
  }

  /**
   * Get buffered logs
   */
  getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  /**
   * Clear buffer
   */
  clearBuffer(): void {
    this.buffer = [];
  }

  /**
   * Flush logs to Sentry
   */
  async flush(timeout?: number): Promise<boolean> {
    if (this.config.enableSentry) {
      return await Sentry.flush(timeout);
    }
    return true;
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create a child logger with specific configuration
 */
export function createLogger(config: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();

  /**
   * Start performance measurement
   */
  start(label: string): void {
    this.marks.set(label, performance.now());
    logger.debug(`Performance: Started measuring "${label}"`);
  }

  /**
   * End performance measurement and log result
   */
  end(label: string): number {
    const startTime = this.marks.get(label);
    if (!startTime) {
      logger.warn(`Performance: No start mark found for "${label}"`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.marks.delete(label);

    logger.info(`Performance: "${label}" took ${duration.toFixed(2)}ms`, {
      label,
      duration,
    });

    // Send to Sentry if it's a significant measurement
    if (duration > 1000) {
      // More than 1 second
      logger.warn(`Performance: Slow operation detected for "${label}"`, {
        label,
        duration,
      });
    }

    return duration;
  }

  /**
   * Measure async operation
   */
  async measure<T>(label: string, operation: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      const result = await operation();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }

  /**
   * Clear all marks
   */
  clear(): void {
    this.marks.clear();
  }
}

/**
 * Default performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Log API calls
 */
export function logApiCall(
  method: string,
  url: string,
  status: number,
  duration: number,
  error?: Error
): void {
  const logData = {
    method,
    url,
    status,
    duration,
  };

  if (error) {
    logger.error(`API call failed: ${method} ${url}`, error, logData);
  } else if (status >= 400) {
    logger.warn(`API call failed: ${method} ${url}`, logData);
  } else if (duration > 2000) {
    logger.warn(`Slow API call: ${method} ${url}`, logData);
  } else {
    logger.debug(`API call: ${method} ${url}`, logData);
  }
}

/**
 * Log user actions
 */
export function logUserAction(action: string, data?: any): void {
  logger.info(`User action: ${action}`, data);

  // Add as breadcrumb for Sentry
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message: action,
      category: 'user',
      level: 'info',
      data,
    });
  }
}