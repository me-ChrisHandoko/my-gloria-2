import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

/**
 * Simple permission decorator that accepts a single permission string
 * This is a simplified version for backward compatibility
 * @param permission - The permission string (e.g., 'MANAGE_FEATURE_FLAGS')
 */
export const RequirePermission = (permission: string) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permission);
