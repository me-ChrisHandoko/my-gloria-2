# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NestJS backend API for the Gloria system - an enterprise resource management platform for educational institutions. The system manages user profiles, organizational hierarchies, permissions, workflows, and notifications across multiple schools and departments.

## Development Commands

### Build & Run
```bash
# Development with hot reload
npm run start:dev

# Production build
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

### Testing
```bash
# Run all unit tests
npm run test

# Run specific test file
npm run test src/path/to/file.spec.ts

# Watch mode for TDD
npm run test:watch

# Test coverage report
npm run test:cov

# E2E tests
npm run test:e2e
```

### Code Quality
```bash
# Format code with Prettier
npm run format

# Lint and fix issues
npm run lint
```

### Database
```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create and run migrations
npx prisma migrate dev --name migration_name

# View database in Prisma Studio
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

## Architecture & Patterns

### Framework Stack
- **NestJS 11**: Core framework with dependency injection
- **Fastify**: HTTP adapter for performance (replaces Express)
- **Prisma**: Type-safe ORM with PostgreSQL
- **Clerk**: Authentication and user management
- **Postmark**: Email service integration

### Database Architecture
The system uses PostgreSQL with two schemas:
- **gloria_master**: Employee master data (DataKaryawan)
- **gloria_ops**: Operational data (all other models)

Key relationships:
- UserProfile links to DataKaryawan via NIP (employee ID)
- Hierarchical structures: Schools → Departments → Positions → Users
- Permission system: Roles → Permissions with scope-based access control
- Workflow engine for approval processes

### Module Structure Pattern
Standard NestJS module organization:
```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── dto/
│   │   └── guards/
│   ├── users/
│   ├── permissions/
│   └── workflows/
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   └── interceptors/
└── main.ts
```

### Service Patterns
- Services handle business logic and Prisma queries
- Controllers handle HTTP requests/responses
- Use DTOs for request/response validation
- Implement guards for authentication/authorization
- Use interceptors for logging and transformation

### Authentication & Authorization Flow
1. **Authentication** (ClerkAuthGuard - runs first):
   - Clerk handles user authentication externally
   - ClerkAuthGuard validates JWT tokens from Clerk
   - UserProfile is created/linked on first login via clerkUserId
   - User roles and permissions are loaded into request context

2. **Authorization** (PermissionsGuard - runs second):
   - Checks @RequiredPermission decorators on controllers
   - Superadmin bypass: Users with hierarchyLevel = 0 skip all checks
   - Multi-layer permission resolution (see below)
   - Scope-based access control enforcement

### Permission System (RBAC)
**Status**: ✅ FULLY ACTIVE (as of latest update)

Multi-layer permission resolution (in priority order):
1. **Direct User Permissions** (highest priority) - UserPermission with priority field
2. **Role-based Permissions** - UserRole → Role → RolePermission with hierarchy inheritance
3. **Position-based Permissions** ✅ IMPLEMENTED - UserPosition → Position → RoleModuleAccess with hierarchy traversal
4. **Scope-based Access** - OWN → DEPARTMENT → SCHOOL → ALL (enforced at each layer)
5. **Module Access Control** - UserModuleAccess and RoleModuleAccess

**Position-based Permissions Details:**
- User positions link users to organizational positions via UserPosition
- Positions can have roles assigned via RoleModuleAccess.positionId
- Position hierarchy supports permission inheritance (child inherits from parent via reportsToId)
- UserPosition.permissionScope can override default permission scope
- Automatic traversal up position hierarchy until permission found or root reached

**Global Guards Registered** (src/core/auth/auth.module.ts):
- ClerkAuthGuard (authentication)
- PermissionsGuard (authorization)

**Using Decorators in Controllers**:
```typescript
import { RequiredPermission, PermissionAction } from '@core/auth/decorators/permissions.decorator';

@Post()
@RequiredPermission('users', PermissionAction.CREATE)
async create(@Body() dto: CreateUserDto) { ... }
```

**Scope Hierarchy**: OWN → DEPARTMENT → SCHOOL → ALL

### Error Handling
- Use NestJS built-in exceptions (BadRequestException, UnauthorizedException, etc.)
- Implement custom exception filters for consistent error responses
- Log errors with context for debugging

### Environment Configuration
Required environment variables:
- DATABASE_URL: PostgreSQL connection string
- CLERK_SECRET_KEY: Clerk authentication
- POSTMARK_API_KEY: Email service
- PORT: Server port (default: 3000)

## Important Considerations

### Multi-tenant Architecture
- System supports multiple schools/organizations
- Data isolation via school/department relationships
- Permission scopes enforce data boundaries

### Audit & Compliance
- **AuditLog** tracks all sensitive operations including permission checks
- **Permission Logging** (via AuditLog):
  - All denied permission attempts are logged
  - Successful access to sensitive resources is logged
  - Metadata includes permission details, user context, and access decision
  - Sensitive resources: permissions, roles, users, system-config, api-keys
- **Soft deletes** preserve data integrity
- **Query audit logs**:
  ```sql
  SELECT * FROM audit_logs
  WHERE category = 'PERMISSION'
  AND entity_type = 'PERMISSION_CHECK'
  ORDER BY created_at DESC;
  ```

### Performance Optimization
- Use Prisma's select/include carefully to avoid N+1 queries
- Implement caching for permission calculations (PermissionCache)
- Use database indexes (already defined in schema)
- Fastify provides better performance than Express

### Security Practices
- All endpoints require authentication (except health checks)
- Implement rate limiting on sensitive endpoints
- Validate all inputs with DTOs and class-validator
- Use parameterized queries (Prisma handles this)
- Encrypt sensitive configuration (SystemConfig.isEncrypted)

### Testing Strategy
- Unit test services with mocked Prisma client
- Integration test controllers with test database
- E2E test critical user flows
- Mock external services (Clerk, Postmark)