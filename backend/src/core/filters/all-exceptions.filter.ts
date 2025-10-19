import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyReply, FastifyRequest } from 'fastify';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
  stack?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private readonly isDevelopment: boolean;
  private readonly enableDebug: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isDevelopment =
      this.configService.get('app.environment') === 'development';
    this.enableDebug = this.configService.get('logging.enableDebug', false);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    // Debug logging
    this.logger.debug(
      '⚠️ AllExceptionsFilter CAUGHT exception',
      exception instanceof Error ? exception.constructor.name : typeof exception,
    );

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log the error
    this.logError(exception, errorResponse, request);

    // Send response
    response.status(errorResponse.statusCode).send(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    request: FastifyRequest,
  ): ErrorResponse {
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';
    let stack: string | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        error = responseObj.error || error;
      }

      stack = exception.stack;
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
      stack = exception.stack;

      // Map specific error types to appropriate status codes
      if (exception.name === 'ValidationError') {
        statusCode = HttpStatus.BAD_REQUEST;
        error = 'Validation Error';
      } else if (exception.name === 'UnauthorizedError') {
        statusCode = HttpStatus.UNAUTHORIZED;
        error = 'Unauthorized';
      } else if (exception.name === 'ForbiddenError') {
        statusCode = HttpStatus.FORBIDDEN;
        error = 'Forbidden';
      } else if (exception.message.includes('not found')) {
        statusCode = HttpStatus.NOT_FOUND;
        error = 'Not Found';
      }
    }

    const errorResponse: ErrorResponse = {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      requestId: request.id,
    };

    // Preserve validation errors if present
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as any;
        if (responseObj.errors) {
          (errorResponse as any).errors = responseObj.errors;
        }
      }
    }

    // Include stack trace in development mode
    if (this.isDevelopment && this.enableDebug && stack) {
      errorResponse.stack = stack;
    }

    return errorResponse;
  }

  private logError(
    exception: unknown,
    errorResponse: ErrorResponse,
    request: FastifyRequest,
  ): void {
    const logContext = {
      statusCode: errorResponse.statusCode,
      path: errorResponse.path,
      method: errorResponse.method,
      requestId: errorResponse.requestId,
      userId: (request as any).user?.id,
    };

    if (errorResponse.statusCode >= 500) {
      this.logger.error(
        `[${errorResponse.statusCode}] ${errorResponse.error}: ${errorResponse.message}`,
        exception instanceof Error ? exception.stack : undefined,
        logContext,
      );
    } else if (errorResponse.statusCode >= 400) {
      this.logger.warn(
        `[${errorResponse.statusCode}] ${errorResponse.error}: ${errorResponse.message}`,
        logContext,
      );
    } else {
      this.logger.log(
        `[${errorResponse.statusCode}] ${errorResponse.error}: ${errorResponse.message}`,
        logContext,
      );
    }
  }
}
