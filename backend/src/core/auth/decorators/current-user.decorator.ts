/**
 * Current User Decorator
 * Production-ready decorator for accessing authenticated user information
 *
 * @module core/auth/decorators
 */

import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../types/auth.types';

/**
 * Options for the CurrentUser decorator
 */
export interface CurrentUserOptions {
  /** Whether to throw an error if user is not found */
  required?: boolean;
  /** Custom error message when user is not found */
  errorMessage?: string;
  /** Whether to include full user details */
  includeDetails?: boolean;
}

/**
 * Extracts the current authenticated user from the request
 *
 * @example
 * // Get the entire user object
 * @Get('profile')
 * getProfile(@CurrentUser() user: AuthenticatedUser) {
 *   return user;
 * }
 *
 * @example
 * // Get a specific user property
 * @Get('email')
 * getEmail(@CurrentUser('email') email: string) {
 *   return { email };
 * }
 *
 * @example
 * // With options for required user
 * @Get('secure')
 * getSecure(@CurrentUser({ required: true }) user: AuthenticatedUser) {
 *   return user;
 * }
 *
 * @param data - Optional property name or options object
 * @returns The user object, user property, or throws error if required and not found
 */
export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | CurrentUserOptions | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | any => {
    try {
      const request = ctx.switchToHttp().getRequest();
      const user = request.user as AuthenticatedUser;

      // Handle options object
      if (data && typeof data === 'object' && 'required' in data) {
        const options = data;

        if (options.required && !user) {
          throw new InternalServerErrorException(
            options.errorMessage ||
              'User authentication required but not found',
          );
        }

        if (!options.includeDetails && user) {
          // Return minimal user info if details not requested
          return {
            id: user.id,
            email: user.email,
            clerkUserId: user.clerkUserId,
          };
        }

        return user;
      }

      // Handle property extraction
      if (data && typeof data === 'string') {
        return user?.[data];
      }

      // Return full user object
      return user;
    } catch (error) {
      // Re-throw known errors
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      // Log unexpected errors and throw generic error
      console.error('Error in CurrentUser decorator:', error);
      throw new InternalServerErrorException(
        'Failed to extract user from request',
      );
    }
  },
);

/**
 * Decorator to get the current user's ID
 * Convenience decorator for commonly accessed user ID
 *
 * @example
 * @Get('my-posts')
 * getMyPosts(@CurrentUserId() userId: string) {
 *   return this.postService.findByUserId(userId);
 * }
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.id;
  },
);

/**
 * Decorator to get the current user's email
 * Convenience decorator for commonly accessed user email
 *
 * @example
 * @Get('my-email')
 * getMyEmail(@CurrentUserEmail() email: string) {
 *   return { email };
 * }
 */
export const CurrentUserEmail = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.email;
  },
);

/**
 * Decorator to get the current user's roles
 * Convenience decorator for accessing user roles
 *
 * @example
 * @Get('my-roles')
 * getMyRoles(@CurrentUserRoles() roles: string[]) {
 *   return { roles };
 * }
 */
export const CurrentUserRoles = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string[] => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;
    return user?.roles?.map((role) => role.roleCode) || [];
  },
);

/**
 * Decorator to get the current user's permissions
 * Convenience decorator for accessing user permissions
 *
 * @example
 * @Get('my-permissions')
 * getMyPermissions(@CurrentUserPermissions() permissions: UserPermission[]) {
 *   return { permissions };
 * }
 */
export const CurrentUserPermissions = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;
    return user?.permissions || [];
  },
);
