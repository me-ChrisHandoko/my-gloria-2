import { HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export class DatabaseException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super(message, statusCode);
  }
}

export class DatabaseConnectionException extends DatabaseException {
  constructor(message = 'Failed to connect to database') {
    super(message, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

export class DatabaseTimeoutException extends DatabaseException {
  constructor(message = 'Database operation timed out') {
    super(message, HttpStatus.REQUEST_TIMEOUT);
  }
}

export class DatabaseConstraintException extends DatabaseException {
  constructor(message = 'Database constraint violation') {
    super(message, HttpStatus.CONFLICT);
  }
}

export class RecordNotFoundException extends DatabaseException {
  constructor(message = 'Record not found') {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class DuplicateRecordException extends DatabaseException {
  constructor(message = 'Duplicate record found') {
    super(message, HttpStatus.CONFLICT);
  }
}

export class DatabaseTransactionException extends DatabaseException {
  constructor(message = 'Transaction failed') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export class DatabaseErrorHandler {
  static handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2000':
          throw new DatabaseException(
            'Value too long for column',
            HttpStatus.BAD_REQUEST,
          );
        case 'P2001':
          throw new RecordNotFoundException('Record not found');
        case 'P2002':
          throw new DuplicateRecordException(
            `Unique constraint violation: ${error.meta?.target}`,
          );
        case 'P2003':
          throw new DatabaseConstraintException(
            `Foreign key constraint violation: ${error.meta?.field_name}`,
          );
        case 'P2006':
          throw new DatabaseException(
            'Invalid value provided',
            HttpStatus.BAD_REQUEST,
          );
        case 'P2011':
          throw new DatabaseConstraintException('Null constraint violation');
        case 'P2012':
          throw new DatabaseException(
            'Missing required value',
            HttpStatus.BAD_REQUEST,
          );
        case 'P2013':
          throw new DatabaseException(
            'Missing required argument',
            HttpStatus.BAD_REQUEST,
          );
        case 'P2014':
          throw new DatabaseConstraintException('Relation violation');
        case 'P2015':
          throw new RecordNotFoundException('Related record not found');
        case 'P2016':
          throw new DatabaseException(
            'Query interpretation error',
            HttpStatus.BAD_REQUEST,
          );
        case 'P2017':
          throw new DatabaseConstraintException('Records relation violation');
        case 'P2018':
          throw new RecordNotFoundException(
            'Required connected records not found',
          );
        case 'P2019':
          throw new DatabaseException('Input error', HttpStatus.BAD_REQUEST);
        case 'P2020':
          throw new DatabaseException(
            'Value out of range',
            HttpStatus.BAD_REQUEST,
          );
        case 'P2021':
          throw new DatabaseException(
            'Table does not exist',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        case 'P2022':
          throw new DatabaseException(
            'Column does not exist',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        case 'P2023':
          throw new DatabaseException(
            'Inconsistent column data',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        case 'P2024':
          throw new DatabaseTimeoutException('Connection pool timeout');
        case 'P2025':
          throw new RecordNotFoundException('Record to update not found');
        case 'P2026':
          throw new DatabaseException(
            'Unsupported database feature',
            HttpStatus.NOT_IMPLEMENTED,
          );
        case 'P2027':
          throw new DatabaseException(
            'Multiple database errors occurred',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        case 'P2028':
          throw new DatabaseTransactionException('Transaction API error');
        case 'P2030':
          throw new DatabaseException(
            'Cannot find fulltext index',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        case 'P2033':
          throw new DatabaseException(
            'Number out of range',
            HttpStatus.BAD_REQUEST,
          );
        case 'P2034':
          throw new DatabaseTransactionException(
            'Transaction conflict or deadlock',
          );
        default:
          throw new DatabaseException(
            `Database error: ${error.message}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
      }
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      throw new DatabaseException(
        'Unknown database error occurred',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (error instanceof Prisma.PrismaClientRustPanicError) {
      throw new DatabaseException(
        'Database client crashed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      throw new DatabaseConnectionException(
        'Failed to initialize database client',
      );
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      throw new DatabaseException(
        'Invalid database query',
        HttpStatus.BAD_REQUEST,
      );
    }

    throw error;
  }
}
