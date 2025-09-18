import { HttpException, HttpStatus } from '@nestjs/common';

export class UserNotFoundException extends HttpException {
  constructor(identifier: string) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        error: 'User Not Found',
        message: `User with identifier "${identifier}" was not found`,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class UserAlreadyExistsException extends HttpException {
  constructor(field: string, value: string) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        error: 'User Already Exists',
        message: `User with ${field} "${value}" already exists`,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class InvalidUserDataException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Invalid User Data',
        message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class UserNotActiveException extends HttpException {
  constructor(userId: string) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        error: 'User Not Active',
        message: `User with ID "${userId}" is not active`,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class UnauthorizedUserAccessException extends HttpException {
  constructor(action: string) {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        error: 'Unauthorized Access',
        message: `You are not authorized to ${action}`,
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}
