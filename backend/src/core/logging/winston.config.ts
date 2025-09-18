import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { ConfigService } from '@nestjs/config';

export class WinstonConfig {
  static createLoggerOptions(
    configService: ConfigService,
  ): winston.LoggerOptions {
    const logLevel = configService.get<string>('LOG_LEVEL', 'info');
    const prettyLogs = configService.get<boolean>('PRETTY_LOGS', true);
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');
    const appName = configService.get<string>('APP_NAME', 'gloria-backend');

    // Custom log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS',
      }),
      winston.format.errors({ stack: true }),
      winston.format.metadata({
        fillExcept: ['message', 'level', 'timestamp', 'label', 'context'],
      }),
    );

    // Console format for development
    const consoleFormat = prettyLogs
      ? winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(
            ({ timestamp, level, message, context, ...meta }) => {
              const metaStr = Object.keys(meta.metadata || {}).length
                ? JSON.stringify(meta.metadata, null, 2)
                : '';
              const contextStr = context ? `[${context}]` : '';
              return `${timestamp} ${level} ${contextStr}: ${message} ${metaStr}`;
            },
          ),
        )
      : winston.format.json();

    // File format (always JSON for structured logging)
    const fileFormat = winston.format.combine(
      winston.format.uncolorize(),
      winston.format.json(),
    );

    const transports: winston.transport[] = [];

    // Console transport
    transports.push(
      new winston.transports.Console({
        level: logLevel,
        format: winston.format.combine(logFormat, consoleFormat),
      }),
    );

    // File transports for production
    if (nodeEnv === 'production') {
      // Error log file
      transports.push(
        new DailyRotateFile({
          level: 'error',
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxFiles: '30d',
          maxSize: '20m',
          format: winston.format.combine(logFormat, fileFormat),
        }),
      );

      // Combined log file
      transports.push(
        new DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxFiles: '14d',
          maxSize: '20m',
          format: winston.format.combine(logFormat, fileFormat),
        }),
      );

      // Application-specific log file
      transports.push(
        new DailyRotateFile({
          filename: `logs/${appName}-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxFiles: '7d',
          maxSize: '20m',
          format: winston.format.combine(logFormat, fileFormat),
        }),
      );
    }

    // Development file logging (optional)
    if (
      nodeEnv === 'development' &&
      configService.get<boolean>('ENABLE_DEBUG_MODE', false)
    ) {
      transports.push(
        new winston.transports.File({
          filename: 'logs/debug.log',
          level: 'debug',
          format: winston.format.combine(logFormat, fileFormat),
        }),
      );
    }

    return {
      level: logLevel,
      format: logFormat,
      defaultMeta: {
        service: appName,
        environment: nodeEnv,
      },
      transports,
      exitOnError: false,
      handleExceptions: true,
      handleRejections: true,
    };
  }

  static createLogLevels() {
    return {
      levels: {
        fatal: 0,
        error: 1,
        warn: 2,
        info: 3,
        debug: 4,
        verbose: 5,
        silly: 6,
      },
      colors: {
        fatal: 'red',
        error: 'red',
        warn: 'yellow',
        info: 'green',
        debug: 'blue',
        verbose: 'cyan',
        silly: 'magenta',
      },
    };
  }
}
