import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

/**
 * Sanitization options
 */
export interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: string[];
  stripTags?: boolean;
  stripAttributes?: boolean;
  maxLength?: number;
  trimWhitespace?: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult<T = any> {
  valid: boolean;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

/**
 * Input sanitizer class
 */
class InputSanitizer {
  private readonly defaultOptions: SanitizeOptions = {
    allowedTags: [],
    allowedAttributes: [],
    stripTags: true,
    stripAttributes: true,
    trimWhitespace: true,
  };

  /**
   * Sanitize HTML input
   */
  sanitizeHtml(input: string, options?: SanitizeOptions): string {
    const opts = { ...this.defaultOptions, ...options };

    if (!input || typeof input !== 'string') {
      return '';
    }

    // Trim whitespace if needed
    let sanitized = opts.trimWhitespace ? input.trim() : input;

    // Apply max length
    if (opts.maxLength && sanitized.length > opts.maxLength) {
      sanitized = sanitized.substring(0, opts.maxLength);
    }

    // Sanitize with DOMPurify
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: opts.allowedTags || [],
      ALLOWED_ATTR: opts.allowedAttributes || [],
      KEEP_CONTENT: opts.stripTags,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false,
    }) as string;

    return sanitized;
  }

  /**
   * Sanitize plain text (remove all HTML)
   */
  sanitizeText(input: string, maxLength?: number): string {
    return this.sanitizeHtml(input, {
      allowedTags: [],
      allowedAttributes: [],
      stripTags: true,
      maxLength,
      trimWhitespace: true,
    });
  }

  /**
   * Sanitize email
   */
  sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      return '';
    }

    // Remove any HTML tags
    const sanitized = this.sanitizeText(email, 254); // Max email length per RFC

    // Basic email validation pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(sanitized)) {
      return '';
    }

    return sanitized.toLowerCase().trim();
  }

  /**
   * Sanitize URL
   */
  sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      return '';
    }

    // Remove any HTML
    const sanitized = this.sanitizeText(url, 2048); // Reasonable max URL length

    try {
      const urlObj = new URL(sanitized);

      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return '';
      }

      // Prevent javascript: and data: URLs
      if (urlObj.protocol === 'javascript:' || urlObj.protocol === 'data:') {
        return '';
      }

      return urlObj.toString();
    } catch {
      // If it's not a valid URL, return empty string
      return '';
    }
  }

  /**
   * Sanitize phone number
   */
  sanitizePhone(phone: string): string {
    if (!phone || typeof phone !== 'string') {
      return '';
    }

    // Remove all non-numeric characters except +, -, (, ), and spaces
    return phone.replace(/[^0-9+\-() ]/g, '').substring(0, 20);
  }

  /**
   * Sanitize numeric input
   */
  sanitizeNumber(input: any, min?: number, max?: number): number | null {
    const num = Number(input);

    if (isNaN(num)) {
      return null;
    }

    if (min !== undefined && num < min) {
      return min;
    }

    if (max !== undefined && num > max) {
      return max;
    }

    return num;
  }

  /**
   * Sanitize boolean input
   */
  sanitizeBoolean(input: any): boolean {
    if (typeof input === 'boolean') {
      return input;
    }

    if (typeof input === 'string') {
      return ['true', '1', 'yes', 'on'].includes(input.toLowerCase());
    }

    return Boolean(input);
  }

  /**
   * Sanitize date input
   */
  sanitizeDate(input: any): Date | null {
    if (!input) {
      return null;
    }

    const date = new Date(input);

    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  /**
   * Sanitize array
   */
  sanitizeArray<T>(
    input: any[],
    itemSanitizer: (item: any) => T,
    maxLength?: number
  ): T[] {
    if (!Array.isArray(input)) {
      return [];
    }

    let sanitized = input.map(itemSanitizer).filter(item => item !== null && item !== undefined);

    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.slice(0, maxLength);
    }

    return sanitized;
  }

  /**
   * Sanitize object recursively
   */
  sanitizeObject(obj: any, schema?: Record<string, any>): any {
    if (!obj || typeof obj !== 'object') {
      return {};
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      // Skip prototype properties
      if (!obj.hasOwnProperty(key)) {
        continue;
      }

      // Sanitize key
      const sanitizedKey = this.sanitizeText(key, 100);

      // Skip if key is empty after sanitization
      if (!sanitizedKey) {
        continue;
      }

      // Sanitize value based on type or schema
      if (schema && schema[key]) {
        // Use schema definition if available
        sanitized[sanitizedKey] = this.sanitizeBySchema(value, schema[key]);
      } else {
        // Auto-detect type and sanitize
        sanitized[sanitizedKey] = this.sanitizeAny(value);
      }
    }

    return sanitized;
  }

  /**
   * Sanitize any input based on its type
   */
  sanitizeAny(input: any): any {
    if (input === null || input === undefined) {
      return null;
    }

    if (typeof input === 'string') {
      return this.sanitizeText(input);
    }

    if (typeof input === 'number') {
      return this.sanitizeNumber(input);
    }

    if (typeof input === 'boolean') {
      return input;
    }

    if (Array.isArray(input)) {
      return this.sanitizeArray(input, item => this.sanitizeAny(item));
    }

    if (typeof input === 'object') {
      if (input instanceof Date) {
        return this.sanitizeDate(input);
      }
      return this.sanitizeObject(input);
    }

    return null;
  }

  /**
   * Sanitize based on schema definition
   */
  private sanitizeBySchema(value: any, schemaType: string | object): any {
    if (typeof schemaType === 'string') {
      switch (schemaType) {
        case 'string':
          return this.sanitizeText(value);
        case 'email':
          return this.sanitizeEmail(value);
        case 'url':
          return this.sanitizeUrl(value);
        case 'phone':
          return this.sanitizePhone(value);
        case 'number':
          return this.sanitizeNumber(value);
        case 'boolean':
          return this.sanitizeBoolean(value);
        case 'date':
          return this.sanitizeDate(value);
        default:
          return this.sanitizeAny(value);
      }
    }

    if (typeof schemaType === 'object') {
      // Handle complex schema definitions
      return this.sanitizeObject(value, schemaType);
    }

    return this.sanitizeAny(value);
  }

  /**
   * Prevent SQL injection in strings
   */
  escapeSql(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Basic SQL escape - in production, use parameterized queries instead
    return input
      .replace(/'/g, "''")
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '""')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\x00/g, '\\x00')
      .replace(/\x1a/g, '\\x1a');
  }

  /**
   * Prevent NoSQL injection
   */
  sanitizeMongoQuery(query: any): any {
    if (!query || typeof query !== 'object') {
      return {};
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(query)) {
      // Remove MongoDB operators from keys
      if (key.startsWith('$')) {
        continue;
      }

      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMongoQuery(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Validate and sanitize using Zod schema
   */
  validateWithZod<T>(
    input: any,
    schema: z.ZodSchema<T>
  ): ValidationResult<T> {
    try {
      const data = schema.parse(input);
      return {
        valid: true,
        data,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            value: input,
          })),
        };
      }

      return {
        valid: false,
        errors: [
          {
            field: 'unknown',
            message: 'Validation failed',
            value: input,
          },
        ],
      };
    }
  }

  /**
   * Create a sanitized copy of request body
   */
  sanitizeRequestBody(body: any, schema?: z.ZodSchema): any {
    if (schema) {
      const result = this.validateWithZod(body, schema);
      if (result.valid) {
        return result.data;
      }
      throw new Error('Validation failed: ' + JSON.stringify(result.errors));
    }

    return this.sanitizeObject(body);
  }

  /**
   * Sanitize file upload metadata
   */
  sanitizeFileUpload(file: {
    name: string;
    type: string;
    size: number;
  }): {
    name: string;
    type: string;
    size: number;
    valid: boolean;
  } {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/json',
    ];

    const maxFileSize = 10 * 1024 * 1024; // 10MB

    const sanitized = {
      name: this.sanitizeText(file.name, 255),
      type: this.sanitizeText(file.type, 100),
      size: this.sanitizeNumber(file.size, 0, maxFileSize) || 0,
      valid: false,
    };

    // Validate file type
    if (!allowedMimeTypes.includes(sanitized.type)) {
      return sanitized;
    }

    // Validate file size
    if (sanitized.size > maxFileSize) {
      return sanitized;
    }

    // Check file extension matches MIME type
    const extension = sanitized.name.split('.').pop()?.toLowerCase();
    const expectedExtensions: Record<string, string[]> = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/gif': ['gif'],
      'image/webp': ['webp'],
      'application/pdf': ['pdf'],
      'text/plain': ['txt'],
      'text/csv': ['csv'],
      'application/json': ['json'],
    };

    const validExtensions = expectedExtensions[sanitized.type] || [];
    if (extension && validExtensions.includes(extension)) {
      sanitized.valid = true;
    }

    return sanitized;
  }
}

// Create singleton instance
export const sanitizer = new InputSanitizer();

// Export class for testing
export { InputSanitizer };

/**
 * Express/Next.js middleware for input sanitization
 */
export function createSanitizationMiddleware(
  schema?: z.ZodSchema
) {
  return (req: any, res: any, next: any) => {
    try {
      // Sanitize query parameters
      if (req.query) {
        req.query = sanitizer.sanitizeObject(req.query);
      }

      // Sanitize body
      if (req.body) {
        req.body = sanitizer.sanitizeRequestBody(req.body, schema);
      }

      // Sanitize params
      if (req.params) {
        req.params = sanitizer.sanitizeObject(req.params);
      }

      next();
    } catch (error: any) {
      res.status(400).json({
        error: 'Invalid input',
        message: error.message,
      });
    }
  };
}

/**
 * React hook for input sanitization
 */
export function useSanitizer() {
  return {
    sanitizeHtml: (input: string, options?: SanitizeOptions) =>
      sanitizer.sanitizeHtml(input, options),
    sanitizeText: (input: string, maxLength?: number) =>
      sanitizer.sanitizeText(input, maxLength),
    sanitizeEmail: (email: string) => sanitizer.sanitizeEmail(email),
    sanitizeUrl: (url: string) => sanitizer.sanitizeUrl(url),
    sanitizePhone: (phone: string) => sanitizer.sanitizePhone(phone),
    sanitizeNumber: (input: any, min?: number, max?: number) =>
      sanitizer.sanitizeNumber(input, min, max),
    sanitizeObject: (obj: any, schema?: Record<string, any>) =>
      sanitizer.sanitizeObject(obj, schema),
    validateWithZod: <T>(input: any, schema: z.ZodSchema<T>) =>
      sanitizer.validateWithZod(input, schema),
  };
}