import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Security Logging Interceptor
 * Sanitizes sensitive data from logs to prevent exposure of:
 * - API keys
 * - Password hashes
 * - Tokens
 * - Other sensitive information
 */
@Injectable()
export class SecurityLoggingInterceptor implements NestInterceptor {
  // Fields that should never be logged
  private readonly SENSITIVE_FIELDS = [
    'password',
    'passwordHash',
    'hash',
    'apiKey',
    'api_key',
    'keyHash',
    'key_hash',
    'token',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'secret',
    'secretKey',
    'secret_key',
    'privateKey',
    'private_key',
    'salt',
    'otp',
    'otpCode',
    'otp_code',
    'authorizationHeader',
    'authorization',
    'x-api-key',
  ];

  // Fields that should be partially masked (show first/last few chars)
  private readonly PARTIAL_MASK_FIELDS = [
    'email',
    'phone',
    'phoneNumber',
    'phone_number',
    'nip',
    'ssn',
    'creditCard',
    'credit_card',
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();

    // Sanitize request data before it reaches the handler
    this.sanitizeRequest(request);

    return next.handle().pipe(
      map((data) => {
        // Sanitize response data before sending
        return this.sanitizeData(data);
      }),
    );
  }

  /**
   * Sanitize request object to remove sensitive data from logs
   */
  private sanitizeRequest(request: FastifyRequest): void {
    // Sanitize headers
    if (request.headers) {
      const sanitizedHeaders = { ...request.headers };
      this.SENSITIVE_FIELDS.forEach((field) => {
        const lowerField = field.toLowerCase();
        if (sanitizedHeaders[lowerField]) {
          sanitizedHeaders[lowerField] = '[REDACTED]';
        }
      });

      // Override the headers getter for logging purposes
      Object.defineProperty(request, 'sanitizedHeaders', {
        value: sanitizedHeaders,
        writable: false,
        enumerable: false,
      });
    }

    // Sanitize body
    if (request.body && typeof request.body === 'object') {
      request.body = this.sanitizeData(request.body);
    }

    // Sanitize query parameters
    if (request.query && typeof request.query === 'object') {
      request.query = this.sanitizeData(request.query);
    }
  }

  /**
   * Recursively sanitize data object
   */
  private sanitizeData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    // Handle objects
    if (typeof data === 'object') {
      const sanitized: any = {};

      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();

        // Check if field should be completely redacted
        if (this.isSensitiveField(lowerKey)) {
          sanitized[key] = '[REDACTED]';
        }
        // Check if field should be partially masked
        else if (this.isPartialMaskField(lowerKey)) {
          sanitized[key] = this.partialMask(value);
        }
        // Recursively sanitize nested objects
        else if (typeof value === 'object') {
          sanitized[key] = this.sanitizeData(value);
        }
        // Keep non-sensitive primitive values as-is
        else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    }

    // Return primitive values as-is
    return data;
  }

  /**
   * Check if a field name is sensitive
   */
  private isSensitiveField(fieldName: string): boolean {
    return this.SENSITIVE_FIELDS.some((sensitive) =>
      fieldName.includes(sensitive.toLowerCase()),
    );
  }

  /**
   * Check if a field should be partially masked
   */
  private isPartialMaskField(fieldName: string): boolean {
    return this.PARTIAL_MASK_FIELDS.some((field) =>
      fieldName.includes(field.toLowerCase()),
    );
  }

  /**
   * Partially mask a value (show first and last few characters)
   */
  private partialMask(value: any): string {
    if (value === null || value === undefined) {
      return value;
    }

    const str = String(value);

    if (str.length <= 4) {
      return '****';
    }

    if (str.length <= 8) {
      return str[0] + '****' + str[str.length - 1];
    }

    // For longer strings, show first 2 and last 2 characters
    return str.substring(0, 2) + '****' + str.substring(str.length - 2);
  }

  /**
   * Create a safe log entry for API key usage
   */
  static createApiKeyLogEntry(
    apiKeyId: string,
    action: string,
    metadata?: Record<string, any>,
  ): Record<string, any> {
    return {
      timestamp: new Date().toISOString(),
      apiKeyId: apiKeyId, // Only log the ID, never the actual key
      action: action,
      metadata: metadata || {},
      // Never include the actual API key or hash in logs
    };
  }

  /**
   * Create a safe log entry for authentication events
   */
  static createAuthLogEntry(
    userId: string,
    event: string,
    success: boolean,
    metadata?: Record<string, any>,
  ): Record<string, any> {
    return {
      timestamp: new Date().toISOString(),
      userId: userId,
      event: event,
      success: success,
      metadata: metadata || {},
      // Never include passwords, tokens, or hashes
    };
  }
}
