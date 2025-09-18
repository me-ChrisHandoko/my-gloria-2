import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimeoutInterceptor.name);
  private readonly timeoutDuration: number;

  constructor(private readonly configService: ConfigService) {
    // Default timeout: 30 seconds
    this.timeoutDuration = this.configService.get('app.requestTimeout', 30000);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const url = request.url;
    const method = request.method;

    return next.handle().pipe(
      timeout(this.timeoutDuration),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          this.logger.error(
            `Request timeout: ${method} ${url} exceeded ${this.timeoutDuration}ms`,
            {
              method,
              url,
              requestId: request.id,
              userId: request.user?.id,
            },
          );

          return throwError(
            () =>
              new RequestTimeoutException({
                statusCode: 408,
                message: `Request timeout after ${this.timeoutDuration}ms`,
                error: 'Request Timeout',
              }),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
