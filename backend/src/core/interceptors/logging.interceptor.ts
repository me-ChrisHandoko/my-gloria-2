import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { FastifyRequest, FastifyReply } from 'fastify';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);
  private readonly enableDebug: boolean;
  private readonly logLevel: string;

  constructor(private readonly configService: ConfigService) {
    this.enableDebug = this.configService.get('logging.enableDebug', false);
    this.logLevel = this.configService.get('logging.level', 'info');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const response = ctx.getResponse<FastifyReply>();

    const requestInfo = this.getRequestInfo(request);

    // Log incoming request
    this.logRequest(requestInfo);

    return next.handle().pipe(
      tap((data) => {
        const responseTime = Date.now() - startTime;
        const responseInfo = {
          ...requestInfo,
          statusCode: response.statusCode,
          responseTime,
        };

        // Log successful response
        this.logResponse(responseInfo, data);
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;
        const errorInfo = {
          ...requestInfo,
          statusCode: error.status || 500,
          responseTime,
          error: error.message || 'Unknown error',
        };

        // Log error response
        this.logError(errorInfo);

        throw error;
      }),
    );
  }

  private getRequestInfo(request: FastifyRequest) {
    return {
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'] || 'Unknown',
      requestId: request.id,
      userId: (request as any).user?.id || 'anonymous',
      timestamp: new Date().toISOString(),
    };
  }

  private logRequest(requestInfo: any): void {
    if (
      this.enableDebug ||
      this.logLevel === 'debug' ||
      this.logLevel === 'verbose'
    ) {
      this.logger.log(`→ ${requestInfo.method} ${requestInfo.url}`, {
        ...requestInfo,
        type: 'REQUEST',
      });
    }
  }

  private logResponse(responseInfo: any, data?: any): void {
    const message = `← ${responseInfo.method} ${responseInfo.url} ${responseInfo.statusCode} (${responseInfo.responseTime}ms)`;

    if (responseInfo.responseTime > 1000) {
      this.logger.warn(message, {
        ...responseInfo,
        type: 'SLOW_RESPONSE',
      });
    } else if (this.enableDebug || this.logLevel === 'debug') {
      this.logger.log(message, {
        ...responseInfo,
        type: 'RESPONSE',
      });
    }

    // Log response data in verbose mode only
    if (this.logLevel === 'verbose' && data) {
      this.logger.verbose('Response data:', data);
    }
  }

  private logError(errorInfo: any): void {
    const message = `✗ ${errorInfo.method} ${errorInfo.url} ${errorInfo.statusCode} (${errorInfo.responseTime}ms)`;

    if (errorInfo.statusCode >= 500) {
      this.logger.error(message, {
        ...errorInfo,
        type: 'ERROR_RESPONSE',
      });
    } else {
      this.logger.warn(message, {
        ...errorInfo,
        type: 'CLIENT_ERROR',
      });
    }
  }
}
