/**
 * Public Route Decorator
 * Production-ready decorator for marking routes as publicly accessible
 *
 * @module core/auth/decorators
 */

import { SetMetadata, CustomDecorator } from '@nestjs/common';

/**
 * Metadata key for identifying public routes
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Options for public route configuration
 */
export interface PublicRouteOptions {
  /** Whether to allow anonymous access */
  allowAnonymous?: boolean;
  /** Whether to still load user if authenticated */
  loadUserIfAuthenticated?: boolean;
  /** Rate limit configuration for public endpoints */
  rateLimit?: {
    limit: number;
    windowMs: number;
  };
  /** Whether to log access to public endpoints */
  logAccess?: boolean;
}

/**
 * Marks a route as publicly accessible without authentication
 *
 * @example
 * // Simple public route
 * @Public()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 *
 * @example
 * // Public route with options
 * @Public({
 *   loadUserIfAuthenticated: true,
 *   rateLimit: { limit: 10, windowMs: 60000 }
 * })
 * @Get('public-data')
 * getPublicData(@CurrentUser() user?: AuthenticatedUser) {
 *   // User will be available if authenticated, but not required
 *   return this.service.getPublicData(user?.id);
 * }
 *
 * @param options - Optional configuration for public route behavior
 * @returns Decorator function
 */
export const Public = (options?: PublicRouteOptions): CustomDecorator => {
  const metadata = {
    isPublic: true,
    ...options,
  };
  return SetMetadata(IS_PUBLIC_KEY, metadata);
};

/**
 * Alias for Public decorator for better semantics
 * Use when you want to explicitly indicate no authentication required
 *
 * @example
 * @NoAuth()
 * @Get('open-endpoint')
 * openEndpoint() {
 *   return { message: 'No authentication required' };
 * }
 */
export const NoAuth = () => Public({ allowAnonymous: true });

/**
 * Marks a route as allowing optional authentication
 * User will be loaded if token is present, but not required
 *
 * @example
 * @OptionalAuth()
 * @Get('content')
 * getContent(@CurrentUser() user?: AuthenticatedUser) {
 *   if (user) {
 *     return this.service.getPersonalizedContent(user.id);
 *   }
 *   return this.service.getPublicContent();
 * }
 */
export const OptionalAuth = () =>
  Public({
    loadUserIfAuthenticated: true,
    allowAnonymous: true,
  });

/**
 * Marks a route as public but with strict rate limiting
 * Useful for preventing abuse of public endpoints
 *
 * @example
 * @PublicWithRateLimit(5, 60000) // 5 requests per minute
 * @Post('contact')
 * sendContactForm(@Body() dto: ContactDto) {
 *   return this.service.sendContact(dto);
 * }
 *
 * @param limit - Maximum number of requests
 * @param windowMs - Time window in milliseconds
 * @returns Decorator function
 */
export const PublicWithRateLimit = (
  limit: number,
  windowMs: number,
): CustomDecorator => {
  return Public({
    rateLimit: { limit, windowMs },
    logAccess: true,
  });
};
