/**
 * Rate Limiting Decorator
 * Production-ready decorator for rate limiting API endpoints
 *
 * @module core/auth/decorators
 */

import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { RateLimitConfig } from '../types/auth.types';

/**
 * Metadata key for rate limiting
 */
export const RATE_LIMIT_KEY = 'rateLimit';

/**
 * Rate limit options extending the base config
 */
export interface RateLimitOptions extends RateLimitConfig {
  /** Name identifier for this rate limit rule */
  name?: string;
  /** Message to return when rate limit is exceeded */
  message?: string;
  /** HTTP status code to return (default: 429) */
  statusCode?: number;
  /** Headers to include in response */
  headers?: boolean;
  /** Whether to skip if user is authenticated */
  skipIfAuthenticated?: boolean;
  /** Whether to use global rate limit */
  global?: boolean;
  /** Cost of this operation (for weighted rate limiting) */
  cost?: number;
}

/**
 * Applies rate limiting to an endpoint
 *
 * @example
 * // Simple rate limiting
 * @RateLimit({ limit: 10, windowMs: 60000 })
 * @Post('send-email')
 * sendEmail(@Body() dto: EmailDto) {
 *   return this.service.sendEmail(dto);
 * }
 *
 * @example
 * // Rate limiting with custom message
 * @RateLimit({
 *   limit: 5,
 *   windowMs: 60000,
 *   message: 'Too many requests. Please try again later.'
 * })
 * @Post('reset-password')
 * resetPassword(@Body() dto: ResetPasswordDto) {
 *   return this.service.resetPassword(dto);
 * }
 *
 * @example
 * // Skip rate limiting for authenticated users
 * @RateLimit({
 *   limit: 100,
 *   windowMs: 60000,
 *   skipIfAuthenticated: true
 * })
 * @Get('search')
 * search(@Query() query: SearchDto) {
 *   return this.service.search(query);
 * }
 *
 * @example
 * // Weighted rate limiting
 * @RateLimit({
 *   limit: 1000,
 *   windowMs: 60000,
 *   cost: 10 // This operation costs 10 points
 * })
 * @Post('expensive-operation')
 * expensiveOperation() {
 *   return this.service.runExpensiveTask();
 * }
 *
 * @param options - Rate limiting options
 * @returns Decorator function
 */
export const RateLimit = (options: RateLimitOptions): CustomDecorator => {
  return SetMetadata(RATE_LIMIT_KEY, {
    ...options,
    statusCode: options.statusCode || 429,
    headers: options.headers !== false,
  });
};

/**
 * Applies strict rate limiting (1 request per minute)
 * Useful for sensitive operations like password reset
 *
 * @example
 * @StrictRateLimit()
 * @Post('verify-identity')
 * verifyIdentity(@Body() dto: VerifyDto) {
 *   return this.service.verifyIdentity(dto);
 * }
 */
export const StrictRateLimit = (): CustomDecorator => {
  return RateLimit({
    limit: 1,
    windowMs: 60000,
    message: 'This operation can only be performed once per minute',
    name: 'strict',
  });
};

/**
 * Applies moderate rate limiting (10 requests per minute)
 * Suitable for standard API operations
 *
 * @example
 * @ModerateRateLimit()
 * @Get('user-data')
 * getUserData(@CurrentUser() user: User) {
 *   return this.service.getUserData(user.id);
 * }
 */
export const ModerateRateLimit = (): CustomDecorator => {
  return RateLimit({
    limit: 10,
    windowMs: 60000,
    message: 'Please slow down your requests',
    name: 'moderate',
  });
};

/**
 * Applies lenient rate limiting (100 requests per minute)
 * Suitable for frequently accessed endpoints
 *
 * @example
 * @LenientRateLimit()
 * @Get('status')
 * getStatus() {
 *   return { status: 'active' };
 * }
 */
export const LenientRateLimit = (): CustomDecorator => {
  return RateLimit({
    limit: 100,
    windowMs: 60000,
    name: 'lenient',
  });
};

/**
 * Applies burst rate limiting
 * Allows burst of requests followed by cooldown
 *
 * @example
 * @BurstRateLimit(5, 10000) // 5 requests per 10 seconds
 * @Post('bulk-action')
 * bulkAction(@Body() items: any[]) {
 *   return this.service.processBulk(items);
 * }
 *
 * @param burst - Number of requests allowed in burst
 * @param cooldownMs - Cooldown period in milliseconds
 * @returns Decorator function
 */
export const BurstRateLimit = (
  burst: number,
  cooldownMs: number,
): CustomDecorator => {
  return RateLimit({
    limit: burst,
    windowMs: cooldownMs,
    message: `Maximum ${burst} requests per ${cooldownMs / 1000} seconds`,
    name: 'burst',
  });
};
