/**
 * Authentication Decorators
 * Production-ready decorators for authentication, authorization, and API management
 *
 * @module core/auth/decorators
 */

// User Context Decorators
export {
  CurrentUser,
  CurrentUserId,
  CurrentUserEmail,
  CurrentUserRoles,
  CurrentUserPermissions,
  CurrentUserOptions,
} from './current-user.decorator';

// Authentication Decorators
export {
  Public,
  NoAuth,
  OptionalAuth,
  PublicWithRateLimit,
  PublicRouteOptions,
  IS_PUBLIC_KEY,
} from './public.decorator';

// Authorization Decorators
export { Roles, ROLES_KEY } from './roles.decorator';

export {
  RequiredPermissions,
  RequiredPermission,
  RequiredPermissionData,
  PermissionAction,
  PermissionScope,
  PERMISSIONS_KEY,
} from './permissions.decorator';

// API Key Authentication
export {
  ApiKeyAuth,
  ApiKey,
  ApiKeyScopes,
  ApiKeyOwner,
  ApiKeyAuthOptions,
  API_KEY_AUTH_KEY,
} from './api-key.decorator';

// Rate Limiting
export {
  RateLimit,
  StrictRateLimit,
  ModerateRateLimit,
  LenientRateLimit,
  BurstRateLimit,
  RateLimitOptions,
  RATE_LIMIT_KEY,
} from './rate-limit.decorator';

// Audit Logging
export {
  AuditLog,
  CriticalAudit,
  SecurityAudit,
  ComplianceAudit,
  DataModificationAudit,
  AuditLogOptions,
  AuditSeverity,
  AuditCategory,
  AUDIT_LOG_KEY,
} from './audit-log.decorator';

// Caching
export {
  Cache,
  NoCache,
  ShortCache,
  MediumCache,
  LongCache,
  CDNCache,
  InvalidateCache,
  CacheOptions,
  CacheStore,
  CacheInvalidation,
  CACHE_KEY,
} from './cache.decorator';

// Skip Auth (backward compatibility)
export * from './skip-auth.decorator';
