import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string | string[] = 'Validation failed';
    let errors: any = null;

    if (typeof exceptionResponse === 'object') {
      const responseObj = exceptionResponse as any;

      // Handle class-validator errors
      if (Array.isArray(responseObj.message)) {
        message = 'Validation failed';
        errors = this.formatValidationErrors(responseObj.message);
      } else {
        message = responseObj.message || message;
      }
    }

    const errorResponse = {
      statusCode: status,
      message,
      error: 'Bad Request',
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      requestId: request.id,
    };

    this.logger.warn(
      `Validation error [${status}]: ${JSON.stringify(errors || message)}`,
      {
        path: request.url,
        method: request.method,
        requestId: request.id,
      },
    );

    response.status(status).send(errorResponse);
  }

  private formatValidationErrors(messages: string[]): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    messages.forEach((message) => {
      // Try to extract field name from validation message
      // Example: "email must be an email" -> field: "email"
      const match = message.match(/^(\w+)\s/);
      const field = match ? match[1] : 'general';

      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(message);
    });

    return errors;
  }
}
