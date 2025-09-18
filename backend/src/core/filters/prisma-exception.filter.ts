import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FastifyReply, FastifyRequest } from 'fastify';

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientValidationError,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const errorResponse = this.handlePrismaError(exception, request);

    this.logger.warn(
      `Prisma error [${errorResponse.statusCode}]: ${errorResponse.message}`,
      {
        path: request.url,
        method: request.method,
        requestId: request.id,
      },
    );

    response.status(errorResponse.statusCode).send(errorResponse);
  }

  private handlePrismaError(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientValidationError,
    request: FastifyRequest,
  ) {
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database operation failed';
    let error = 'Database Error';

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2000':
          statusCode = HttpStatus.BAD_REQUEST;
          message = 'The provided value is too long for the column';
          error = 'Validation Error';
          break;
        case 'P2002':
          statusCode = HttpStatus.CONFLICT;
          const field =
            (exception.meta?.target as string[])?.join(', ') || 'field';
          message = `Unique constraint violation on ${field}`;
          error = 'Conflict';
          break;
        case 'P2003':
          statusCode = HttpStatus.BAD_REQUEST;
          message = 'Foreign key constraint violation';
          error = 'Validation Error';
          break;
        case 'P2025':
          statusCode = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          error = 'Not Found';
          break;
        case 'P2014':
          statusCode = HttpStatus.BAD_REQUEST;
          message =
            'The change you are trying to make would violate a required relation';
          error = 'Validation Error';
          break;
        case 'P2015':
          statusCode = HttpStatus.NOT_FOUND;
          message = 'Related record not found';
          error = 'Not Found';
          break;
        case 'P2016':
          statusCode = HttpStatus.BAD_REQUEST;
          message = 'Query interpretation error';
          error = 'Bad Request';
          break;
        case 'P2017':
          statusCode = HttpStatus.BAD_REQUEST;
          message = 'The records for the relation are not connected';
          error = 'Validation Error';
          break;
        case 'P2018':
          statusCode = HttpStatus.NOT_FOUND;
          message = 'The required connected records were not found';
          error = 'Not Found';
          break;
        case 'P2019':
          statusCode = HttpStatus.BAD_REQUEST;
          message = 'Input error';
          error = 'Validation Error';
          break;
        case 'P2020':
          statusCode = HttpStatus.BAD_REQUEST;
          message = 'Value out of range';
          error = 'Validation Error';
          break;
        case 'P2021':
          statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
          message = 'The table does not exist';
          error = 'Database Error';
          break;
        case 'P2022':
          statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
          message = 'The column does not exist';
          error = 'Database Error';
          break;
        case 'P2023':
          statusCode = HttpStatus.BAD_REQUEST;
          message = 'Inconsistent column data';
          error = 'Validation Error';
          break;
        case 'P2024':
          statusCode = HttpStatus.REQUEST_TIMEOUT;
          message = 'Operation timed out';
          error = 'Timeout';
          break;
        case 'P2034':
          statusCode = HttpStatus.CONFLICT;
          message = 'Transaction failed due to write conflict';
          error = 'Transaction Conflict';
          break;
        default:
          this.logger.error(
            `Unhandled Prisma error code: ${exception.code}`,
            exception,
          );
          message = `Database error: ${exception.message}`;
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided';
      error = 'Validation Error';

      // Try to extract more specific error message
      const lines = exception.message.split('\n');
      const relevantLine = lines.find(
        (line) => line.includes('Argument') || line.includes('Invalid'),
      );
      if (relevantLine) {
        message = relevantLine.trim();
      }
    }

    return {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      requestId: request.id,
    };
  }
}
