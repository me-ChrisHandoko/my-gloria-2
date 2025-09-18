/**
 * API Key Authentication Decorator
 * Production-ready decorator for API key-based authentication
 *
 * @module core/auth/decorators
 */

import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiKeyAuth as ApiKeyAuthInfo } from '../types/auth.types';

/**
 * Metadata key for API key authentication
 */
export const API_KEY_AUTH_KEY = 'apiKeyAuth';

/**
 * API key authentication options
 */
export interface ApiKeyAuthOptions {
  /** Required scopes for the API key */
  scopes?: string[];
  /** Whether to allow service accounts only */
  serviceAccountOnly?: boolean;
  /** Custom header name for API key (default: 'X-API-Key') */
  headerName?: string;
  /** Whether to check key expiration */
  checkExpiration?: boolean;
  /** Whether to update last used timestamp */
  updateLastUsed?: boolean;
}

/**
 * Requires API key authentication for the route
 *
 * @example
 * // Simple API key authentication
 * @ApiKeyAuth()
 * @Post('webhook')
 * handleWebhook(@Body() data: any) {
 *   return this.service.processWebhook(data);
 * }
 *
 * @example
 * // API key with required scopes
 * @ApiKeyAuth({ scopes: ['write:data', 'read:users'] })
 * @Post('import')
 * importData(@Body() data: any) {
 *   return this.service.importData(data);
 * }
 *
 * @example
 * // Service account only
 * @ApiKeyAuth({ serviceAccountOnly: true })
 * @Post('system-task')
 * runSystemTask() {
 *   return this.service.runSystemTask();
 * }
 *
 * @param options - API key authentication options
 * @returns Decorator function
 */
export const ApiKeyAuth = (options?: ApiKeyAuthOptions): CustomDecorator => {
  return SetMetadata(API_KEY_AUTH_KEY, {
    required: true,
    headerName: options?.headerName || 'X-API-Key',
    ...options,
  });
};

/**
 * Decorator to extract API key information from the request
 *
 * @example
 * @ApiKeyAuth()
 * @Get('api-info')
 * getApiInfo(@ApiKey() apiKey: ApiKeyAuthInfo) {
 *   return {
 *     keyId: apiKey.keyId,
 *     owner: apiKey.owner,
 *     scopes: apiKey.scopes
 *   };
 * }
 */
export const ApiKey = createParamDecorator(
  (
    data: keyof ApiKeyAuthInfo | undefined,
    ctx: ExecutionContext,
  ): ApiKeyAuthInfo | any => {
    const request = ctx.switchToHttp().getRequest();
    const apiKey = request.apiKey as ApiKeyAuthInfo;

    if (data) {
      return apiKey?.[data];
    }

    return apiKey;
  },
);

/**
 * Decorator to get API key scopes
 *
 * @example
 * @ApiKeyAuth()
 * @Get('scopes')
 * getScopes(@ApiKeyScopes() scopes: string[]) {
 *   return { availableScopes: scopes };
 * }
 */
export const ApiKeyScopes = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string[] => {
    const request = ctx.switchToHttp().getRequest();
    const apiKey = request.apiKey as ApiKeyAuthInfo;
    return apiKey?.scopes || [];
  },
);

/**
 * Decorator to get API key owner
 *
 * @example
 * @ApiKeyAuth()
 * @Get('owner')
 * getOwner(@ApiKeyOwner() owner: string) {
 *   return { owner };
 * }
 */
export const ApiKeyOwner = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const apiKey = request.apiKey as ApiKeyAuthInfo;
    return apiKey?.owner;
  },
);
