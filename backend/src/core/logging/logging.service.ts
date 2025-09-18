import {
  Injectable,
  LoggerService as NestLoggerService,
  Scope,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import { WinstonConfig } from './winston.config';

export interface LogContext {
  context?: string;
  userId?: string;
  requestId?: string;
  method?: string;
  url?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

@Injectable({ scope: Scope.TRANSIENT })
export class LoggingService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor(private readonly configService: ConfigService) {
    const loggerOptions = WinstonConfig.createLoggerOptions(this.configService);
    this.logger = winston.createLogger(loggerOptions);

    // Add custom levels
    winston.addColors(WinstonConfig.createLogLevels().colors);
  }

  setContext(context: string) {
    this.context = context;
  }

  // NestJS LoggerService implementation
  log(message: any, context?: string) {
    this.info(message, { context: context || this.context });
  }

  error(message: any, trace?: string, context?: string) {
    const meta: LogContext = { context: context || this.context };
    if (trace) {
      meta.trace = trace;
    }
    this.logger.error(message, meta);
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, { context: context || this.context });
  }

  debug(message: any, context?: string) {
    this.logger.debug(message, { context: context || this.context });
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(message, { context: context || this.context });
  }

  // Extended logging methods
  fatal(message: string, meta?: LogContext) {
    this.logger.log('fatal', message, {
      ...meta,
      context: meta?.context || this.context,
    });
  }

  info(message: string, meta?: LogContext) {
    this.logger.info(message, {
      ...meta,
      context: meta?.context || this.context,
    });
  }

  silly(message: string, meta?: LogContext) {
    this.logger.silly(message, {
      ...meta,
      context: meta?.context || this.context,
    });
  }

  // Structured logging methods
  logRequest(message: string, request: any, meta?: LogContext) {
    this.logger.info(message, {
      ...meta,
      context: meta?.context || this.context,
      request: {
        method: request.method,
        url: request.url,
        headers: this.sanitizeHeaders(request.headers),
        body: this.sanitizeBody(request.body),
        query: request.query,
        params: request.params,
      },
    });
  }

  logResponse(message: string, response: any, meta?: LogContext) {
    this.logger.info(message, {
      ...meta,
      context: meta?.context || this.context,
      response: {
        statusCode: response.statusCode,
        duration: response.duration,
      },
    });
  }

  logError(error: Error, meta?: LogContext) {
    this.logger.error(error.message, {
      ...meta,
      context: meta?.context || this.context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
  }

  logPerformance(operation: string, duration: number, meta?: LogContext) {
    const level = duration > 1000 ? 'warn' : 'info';
    this.logger.log(level, `Performance: ${operation} took ${duration}ms`, {
      ...meta,
      context: meta?.context || this.context,
      performance: {
        operation,
        duration,
      },
    });
  }

  logDatabase(query: string, duration: number, meta?: LogContext) {
    const level = duration > 500 ? 'warn' : 'debug';
    this.logger.log(level, `Database query executed in ${duration}ms`, {
      ...meta,
      context: meta?.context || this.context,
      database: {
        query: this.sanitizeQuery(query),
        duration,
      },
    });
  }

  logSecurity(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    meta?: LogContext,
  ) {
    const level =
      severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    this.logger.log(level, `Security event: ${event}`, {
      ...meta,
      context: meta?.context || this.context,
      security: {
        event,
        severity,
      },
    });
  }

  logAudit(
    action: string,
    entity: string,
    entityId: string,
    userId: string,
    meta?: LogContext,
  ) {
    this.logger.info(`Audit: ${action} on ${entity}`, {
      ...meta,
      context: meta?.context || this.context,
      audit: {
        action,
        entity,
        entityId,
        userId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  logMetric(name: string, value: number, unit: string, meta?: LogContext) {
    this.logger.info(`Metric: ${name}`, {
      ...meta,
      context: meta?.context || this.context,
      metric: {
        name,
        value,
        unit,
      },
    });
  }

  // Utility methods
  private sanitizeHeaders(headers: any): any {
    if (!headers) return {};

    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body) return {};

    const sanitized = { ...body };
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'creditCard',
    ];

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      const result = Array.isArray(obj) ? [...obj] : { ...obj };

      Object.keys(result).forEach((key) => {
        if (
          sensitiveFields.some((field) =>
            key.toLowerCase().includes(field.toLowerCase()),
          )
        ) {
          result[key] = '[REDACTED]';
        } else if (typeof result[key] === 'object' && result[key] !== null) {
          result[key] = sanitizeObject(result[key]);
        }
      });

      return result;
    };

    return sanitizeObject(sanitized);
  }

  private sanitizeQuery(query: string): string {
    if (!query) return '';

    // Sanitize sensitive data in SQL queries
    let sanitized = query;

    // Redact password values
    sanitized = sanitized.replace(
      /password\s*=\s*'[^']*'/gi,
      "password='[REDACTED]'",
    );
    sanitized = sanitized.replace(
      /password\s*=\s*"[^"]*"/gi,
      'password="[REDACTED]"',
    );

    // Redact token values
    sanitized = sanitized.replace(
      /token\s*=\s*'[^']*'/gi,
      "token='[REDACTED]'",
    );
    sanitized = sanitized.replace(
      /token\s*=\s*"[^"]*"/gi,
      'token="[REDACTED]"',
    );

    return sanitized;
  }

  // Query builder for log searching
  static buildLogQuery(filters: {
    level?: string;
    context?: string;
    userId?: string;
    from?: Date;
    to?: Date;
    search?: string;
  }): any {
    const query: any = {};

    if (filters.level) query.level = filters.level;
    if (filters.context) query.context = filters.context;
    if (filters.userId) query.userId = filters.userId;

    if (filters.from || filters.to) {
      query.timestamp = {};
      if (filters.from) query.timestamp.$gte = filters.from;
      if (filters.to) query.timestamp.$lte = filters.to;
    }

    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    return query;
  }

  // Get logger instance for advanced use cases
  getLogger(): winston.Logger;
  getLogger(context: string): LoggingService;
  getLogger(context?: string): winston.Logger | LoggingService {
    if (context) {
      const childLogger = Object.create(this);
      childLogger.context = context;
      return childLogger;
    }
    return this.logger;
  }

  // Stream for Morgan HTTP logger
  stream() {
    return {
      write: (message: string) => {
        this.logger.info(message.trim());
      },
    };
  }
}
