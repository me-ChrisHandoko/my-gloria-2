# Authentication Decorators

Production-ready decorators for authentication, authorization, and API management in the Gloria backend system.

## Overview

This module provides a comprehensive set of decorators for handling various aspects of authentication, authorization, rate limiting, caching, and audit logging in a NestJS application.

## Available Decorators

### User Context Decorators

#### `@CurrentUser()`
Extracts the authenticated user from the request.

```typescript
@Get('profile')
getProfile(@CurrentUser() user: AuthenticatedUser) {
  return user;
}

// Get specific property
@Get('email')
getEmail(@CurrentUser('email') email: string) {
  return { email };
}

// Require user to be present
@Get('secure')
getSecure(@CurrentUser({ required: true }) user: AuthenticatedUser) {
  return user;
}
```

#### Convenience Decorators
- `@CurrentUserId()` - Get user ID directly
- `@CurrentUserEmail()` - Get user email directly
- `@CurrentUserRoles()` - Get user roles array
- `@CurrentUserPermissions()` - Get user permissions array

### Authentication Decorators

#### `@Public()`
Marks an endpoint as publicly accessible without authentication.

```typescript
@Public()
@Get('health')
healthCheck() {
  return { status: 'ok' };
}

// With options
@Public({ 
  loadUserIfAuthenticated: true,
  rateLimit: { limit: 10, windowMs: 60000 }
})
@Get('public-data')
getPublicData(@CurrentUser() user?: AuthenticatedUser) {
  return this.service.getData(user?.id);
}
```

#### Variants
- `@NoAuth()` - Explicitly no authentication required
- `@OptionalAuth()` - Authentication optional, user loaded if present
- `@PublicWithRateLimit(limit, windowMs)` - Public with rate limiting

### Authorization Decorators

#### `@Roles()`
Requires specific roles for access.

```typescript
@Roles('ADMIN', 'MANAGER')
@Post('create')
create(@Body() dto: CreateDto) {
  return this.service.create(dto);
}
```

#### `@RequirePermissions()`
Requires specific permissions for access.

```typescript
@RequirePermissions({
  resource: 'users',
  action: PermissionAction.UPDATE,
  scope: PermissionScope.DEPARTMENT
})
@Patch(':id')
update(@Param('id') id: string, @Body() dto: UpdateDto) {
  return this.service.update(id, dto);
}
```

### API Key Authentication

#### `@ApiKeyAuth()`
Requires API key authentication.

```typescript
@ApiKeyAuth({ scopes: ['write:data'] })
@Post('webhook')
handleWebhook(@Body() data: any, @ApiKey() apiKey: ApiKeyAuth) {
  return this.service.processWebhook(data, apiKey.owner);
}
```

#### Related Decorators
- `@ApiKey()` - Extract API key information
- `@ApiKeyScopes()` - Get API key scopes
- `@ApiKeyOwner()` - Get API key owner

### Rate Limiting

#### `@RateLimit()`
Apply rate limiting to endpoints.

```typescript
@RateLimit({ limit: 10, windowMs: 60000 })
@Post('send-email')
sendEmail(@Body() dto: EmailDto) {
  return this.service.sendEmail(dto);
}
```

#### Preset Rate Limits
- `@StrictRateLimit()` - 1 request per minute
- `@ModerateRateLimit()` - 10 requests per minute
- `@LenientRateLimit()` - 100 requests per minute
- `@BurstRateLimit(burst, cooldownMs)` - Custom burst limiting

### Audit Logging

#### `@AuditLog()`
Enable audit logging for sensitive operations.

```typescript
@AuditLog({
  action: 'user.delete',
  resource: 'user',
  category: AuditCategory.DATA_MODIFICATION,
  severity: AuditSeverity.HIGH
})
@Delete(':id')
deleteUser(@Param('id') id: string) {
  return this.service.deleteUser(id);
}
```

#### Specialized Audit Decorators
- `@CriticalAudit(action)` - For critical operations
- `@SecurityAudit(action)` - For security-related operations
- `@ComplianceAudit(action, standards)` - For compliance-related operations
- `@DataModificationAudit(action, resource)` - For data modifications

### Caching

#### `@Cache()`
Enable response caching.

```typescript
@Cache({ ttl: 300, perUser: true })
@Get('dashboard')
getDashboard(@CurrentUser() user: User) {
  return this.service.getUserDashboard(user.id);
}
```

#### Cache Presets
- `@NoCache()` - Disable caching
- `@ShortCache()` - 1 minute cache
- `@MediumCache()` - 5 minutes cache
- `@LongCache()` - 1 hour cache
- `@CDNCache(maxAge)` - CDN-friendly caching
- `@InvalidateCache(tags)` - Invalidate cached data

## Best Practices

1. **Layer Security**: Combine multiple decorators for defense in depth
   ```typescript
   @Roles('ADMIN')
   @RequirePermissions({ resource: 'users', action: 'delete' })
   @AuditLog({ action: 'user.delete', severity: 'high' })
   @RateLimit({ limit: 5, windowMs: 60000 })
   @Delete(':id')
   deleteUser(@Param('id') id: string) {
     return this.service.deleteUser(id);
   }
   ```

2. **Use Appropriate Rate Limits**: Match rate limits to operation sensitivity
   - Authentication: Use `@StrictRateLimit()`
   - Data modification: Use `@ModerateRateLimit()`
   - Read operations: Use `@LenientRateLimit()`

3. **Cache Strategically**: Cache based on data volatility
   - Static data: Use `@LongCache()`
   - User-specific: Use `@Cache({ perUser: true })`
   - Real-time: Use `@NoCache()`

4. **Audit Critical Operations**: Always audit sensitive operations
   - User management: Use `@SecurityAudit()`
   - Data exports: Use `@ComplianceAudit()`
   - System changes: Use `@CriticalAudit()`

## Testing

All decorators include comprehensive unit tests. Run tests with:

```bash
npm test src/core/auth/decorators/decorators.spec.ts
```

## Type Safety

All decorators are fully typed with TypeScript interfaces. Import types from:

```typescript
import { 
  AuthenticatedUser,
  PermissionAction,
  PermissionScope,
  AuditSeverity,
  AuditCategory,
  CacheStore
} from '@/core/auth/types/auth.types';
```

## Integration with Guards

These decorators work seamlessly with NestJS guards:
- `ClerkAuthGuard` - Checks authentication
- `RolesGuard` - Validates roles
- `PermissionsGuard` - Validates permissions
- `RateLimitGuard` - Enforces rate limits
- `ApiKeyGuard` - Validates API keys

## Error Handling

All decorators include proper error handling:
- Authentication failures: `UnauthorizedException`
- Authorization failures: `ForbiddenException`
- Rate limit exceeded: `TooManyRequestsException`
- Invalid API key: `UnauthorizedException`

## Performance Considerations

- Decorators are evaluated once at startup
- Metadata is cached for performance
- Use caching decorators to reduce database load
- Rate limiting prevents resource exhaustion
- Audit logging is asynchronous to avoid blocking

## Security Notes

- Never expose sensitive user data through decorators
- Always validate permissions at the service level too
- Use audit logging for all sensitive operations
- Implement rate limiting on all public endpoints
- Regularly rotate API keys and review access logs