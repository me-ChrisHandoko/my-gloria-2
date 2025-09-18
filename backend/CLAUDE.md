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

### Authentication Flow
1. Clerk handles user authentication externally
2. ClerkGuard validates JWT tokens from Clerk
3. UserProfile is created/linked on first login via clerkUserId
4. Permissions are computed based on roles, positions, and overrides

### Permission System
Multi-layer permission resolution:
1. Role-based permissions (via UserRole → Role → RolePermission)
2. Position-based permissions (via UserPosition → Position hierarchy)
3. Direct user permissions (UserPermission)
4. Resource-specific permissions (ResourcePermission)
5. Module access control (UserModuleAccess)
6. Override system for exceptions (UserOverride)

Scopes: OWN → DEPARTMENT → SCHOOL → ALL

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
- AuditLog tracks all sensitive operations
- PermissionCheckLog monitors access attempts
- Soft deletes preserve data integrity

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