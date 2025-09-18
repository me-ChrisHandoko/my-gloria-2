# Gloria Backend Project Structure

## 📁 Complete Folder Structure

```
backend/
├── src/
│   ├── core/                              # Core functionality and infrastructure
│   │   ├── config/
│   │   │   ├── app.config.ts             # Application configuration
│   │   │   ├── database.config.ts        # Database configuration
│   │   │   ├── clerk.config.ts           # Clerk auth configuration
│   │   │   ├── redis.config.ts           # Redis cache configuration
│   │   │   └── config.module.ts
│   │   │
│   │   ├── database/
│   │   │   ├── prisma.service.ts         # Prisma client service
│   │   │   ├── prisma.module.ts
│   │   │   └── migrations/                # Database migrations
│   │   │
│   │   ├── auth/
│   │   │   ├── guards/
│   │   │   │   ├── clerk-auth.guard.ts   # Clerk JWT validation
│   │   │   │   ├── permission.guard.ts   # Permission checking
│   │   │   │   └── roles.guard.ts        # Role-based access
│   │   │   ├── decorators/
│   │   │   │   ├── current-user.decorator.ts
│   │   │   │   ├── require-permission.decorator.ts
│   │   │   │   └── public.decorator.ts
│   │   │   ├── strategies/
│   │   │   │   └── clerk.strategy.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.ts
│   │   │   └── auth.module.ts
│   │   │
│   │   ├── exceptions/
│   │   │   ├── filters/
│   │   │   │   ├── all-exceptions.filter.ts
│   │   │   │   ├── http-exception.filter.ts
│   │   │   │   └── prisma-exception.filter.ts
│   │   │   ├── business-exception.ts
│   │   │   └── validation-exception.ts
│   │   │
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts
│   │   │   ├── transform.interceptor.ts
│   │   │   ├── timeout.interceptor.ts
│   │   │   └── cache.interceptor.ts
│   │   │
│   │   ├── pipes/
│   │   │   ├── validation.pipe.ts
│   │   │   ├── parse-uuid.pipe.ts
│   │   │   └── sanitization.pipe.ts
│   │   │
│   │   └── utils/
│   │       ├── pagination.util.ts
│   │       ├── hash.util.ts
│   │       ├── date.util.ts
│   │       └── response.util.ts
│   │
│   ├── modules/                           # Feature modules
│   │   ├── users/
│   │   │   ├── dto/
│   │   │   │   ├── create-user.dto.ts
│   │   │   │   ├── update-user.dto.ts
│   │   │   │   ├── user-response.dto.ts
│   │   │   │   └── user-filter.dto.ts
│   │   │   ├── entities/
│   │   │   │   ├── user-profile.entity.ts
│   │   │   │   └── data-karyawan.entity.ts
│   │   │   ├── repositories/
│   │   │   │   ├── user.repository.ts
│   │   │   │   └── user.repository.interface.ts
│   │   │   ├── services/
│   │   │   │   ├── user.service.ts
│   │   │   │   ├── user-sync.service.ts
│   │   │   │   └── user.service.interface.ts
│   │   │   ├── controllers/
│   │   │   │   ├── user.controller.ts
│   │   │   │   └── user-profile.controller.ts
│   │   │   ├── guards/
│   │   │   │   └── user-owner.guard.ts
│   │   │   └── users.module.ts
│   │   │
│   │   ├── organizations/
│   │   │   ├── schools/
│   │   │   │   ├── dto/
│   │   │   │   ├── entities/
│   │   │   │   ├── school.repository.ts
│   │   │   │   ├── school.service.ts
│   │   │   │   └── school.controller.ts
│   │   │   ├── departments/
│   │   │   │   ├── dto/
│   │   │   │   ├── entities/
│   │   │   │   ├── department.repository.ts
│   │   │   │   ├── department.service.ts
│   │   │   │   └── department.controller.ts
│   │   │   ├── positions/
│   │   │   │   ├── dto/
│   │   │   │   ├── entities/
│   │   │   │   ├── position.repository.ts
│   │   │   │   ├── position.service.ts
│   │   │   │   └── position.controller.ts
│   │   │   └── organizations.module.ts
│   │   │
│   │   ├── permissions/
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── repositories/
│   │   │   ├── services/
│   │   │   │   ├── permission.service.ts
│   │   │   │   ├── permission-calculator.service.ts
│   │   │   │   ├── permission-cache.service.ts
│   │   │   │   └── permission-validator.service.ts
│   │   │   ├── controllers/
│   │   │   └── permissions.module.ts
│   │   │
│   │   ├── roles/
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── repositories/
│   │   │   ├── services/
│   │   │   ├── controllers/
│   │   │   └── roles.module.ts
│   │   │
│   │   ├── workflows/
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── repositories/
│   │   │   ├── services/
│   │   │   │   ├── workflow.service.ts
│   │   │   │   ├── workflow-executor.service.ts
│   │   │   │   ├── workflow-step.service.ts
│   │   │   │   └── workflow-transition.service.ts
│   │   │   ├── controllers/
│   │   │   └── workflows.module.ts
│   │   │
│   │   ├── notifications/
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── repositories/
│   │   │   ├── services/
│   │   │   │   ├── notification.service.ts
│   │   │   │   ├── notification-channel.service.ts
│   │   │   │   ├── notification-preference.service.ts
│   │   │   │   └── notification-sender.service.ts
│   │   │   ├── channels/
│   │   │   │   ├── email.channel.ts
│   │   │   │   ├── in-app.channel.ts
│   │   │   │   ├── push.channel.ts
│   │   │   │   └── sms.channel.ts
│   │   │   ├── controllers/
│   │   │   └── notifications.module.ts
│   │   │
│   │   ├── audit/
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── repositories/
│   │   │   ├── services/
│   │   │   │   ├── audit-log.service.ts
│   │   │   │   └── audit-tracker.service.ts
│   │   │   ├── decorators/
│   │   │   │   └── auditable.decorator.ts
│   │   │   ├── controllers/
│   │   │   └── audit.module.ts
│   │   │
│   │   └── system/
│   │       ├── config/
│   │       │   ├── system-config.service.ts
│   │       │   └── system-config.controller.ts
│   │       ├── feature-flags/
│   │       │   ├── feature-flag.service.ts
│   │       │   └── feature-flag.controller.ts
│   │       ├── backup/
│   │       │   ├── backup.service.ts
│   │       │   └── backup.controller.ts
│   │       └── system.module.ts
│   │
│   ├── common/                            # Shared resources
│   │   ├── dto/
│   │   │   ├── pagination.dto.ts
│   │   │   ├── response.dto.ts
│   │   │   └── filter.dto.ts
│   │   ├── interfaces/
│   │   │   ├── repository.interface.ts
│   │   │   ├── service.interface.ts
│   │   │   └── controller.interface.ts
│   │   ├── enums/
│   │   │   ├── permission.enum.ts
│   │   │   ├── module-category.enum.ts
│   │   │   └── workflow-state.enum.ts
│   │   ├── types/
│   │   │   ├── user.type.ts
│   │   │   └── permission.type.ts
│   │   └── constants/
│   │       ├── error-messages.ts
│   │       ├── success-messages.ts
│   │       └── system.constants.ts
│   │
│   ├── infrastructure/                    # External services
│   │   ├── clerk/
│   │   │   ├── clerk.service.ts
│   │   │   ├── clerk.module.ts
│   │   │   └── interfaces/
│   │   ├── postmark/
│   │   │   ├── postmark.service.ts
│   │   │   ├── postmark.module.ts
│   │   │   └── templates/
│   │   ├── redis/
│   │   │   ├── redis.service.ts
│   │   │   ├── redis.module.ts
│   │   │   └── redis.provider.ts
│   │   └── storage/
│   │       ├── storage.service.ts
│   │       └── storage.module.ts
│   │
│   ├── app.module.ts                     # Root module
│   ├── app.controller.ts                 # Health check
│   ├── app.service.ts
│   └── main.ts                           # Application entry point
│
├── prisma/
│   ├── schema.prisma                     # Database schema
│   ├── migrations/                       # Migration files
│   ├── seed.ts                          # Database seeding
│   └── seed-data/                       # Seed data files
│
├── test/
│   ├── unit/                            # Unit tests
│   ├── integration/                     # Integration tests
│   ├── e2e/                            # End-to-end tests
│   └── fixtures/                        # Test fixtures
│
├── docs/                                # Documentation
│   ├── api/                            # API documentation
│   ├── guides/                         # Developer guides
│   └── architecture/                   # Architecture docs
│
├── scripts/                            # Utility scripts
│   ├── generate-module.sh              # Module generator
│   ├── seed-database.ts               # Database seeding
│   └── backup-database.sh              # Backup script
│
├── docker/                             # Docker configuration
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── docker-compose.dev.yml
│
├── .github/                            # GitHub configuration
│   ├── workflows/                     # CI/CD workflows
│   └── PULL_REQUEST_TEMPLATE.md
│
├── config/                             # Configuration files
│   ├── default.json                   # Default config
│   ├── development.json               # Dev config
│   ├── staging.json                   # Staging config
│   └── production.json                # Production config
│
├── .env.example                        # Environment variables example
├── .eslintrc.js                       # ESLint configuration
├── .prettierrc                        # Prettier configuration
├── jest.config.js                     # Jest configuration
├── nest-cli.json                      # NestJS CLI configuration
├── package.json
├── tsconfig.json                      # TypeScript configuration
└── README.md
```

## 📦 Module Structure Pattern

Each feature module follows this consistent structure:

```typescript
// Example: users.module.ts
@Module({
  imports: [
    PrismaModule,
    CacheModule,
    // other dependencies
  ],
  controllers: [
    UserController,
    UserProfileController,
  ],
  providers: [
    UserService,
    UserSyncService,
    UserRepository,
    // Guards, interceptors specific to this module
  ],
  exports: [
    UserService, // Export services needed by other modules
  ],
})
export class UsersModule {}
```

## 🏗️ Layer Architecture

### 1. Controller Layer
- Handles HTTP requests/responses
- Input validation using DTOs
- Delegates business logic to services
- Returns standardized responses

```typescript
@Controller('users')
@UseGuards(ClerkAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @RequirePermission('users:read')
  async findAll(@Query() filter: UserFilterDto): Promise<PaginatedResponse<UserDto>> {
    return this.userService.findAll(filter);
  }
}
```

### 2. Service Layer
- Contains business logic
- Orchestrates repository calls
- Handles transactions
- Implements caching strategies

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly cacheService: CacheService,
  ) {}

  async findAll(filter: UserFilterDto): Promise<PaginatedResponse<UserDto>> {
    // Business logic here
    return this.userRepository.findAll(filter);
  }
}
```

### 3. Repository Layer
- Data access abstraction
- Prisma queries
- Database transactions
- Query optimization

```typescript
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: UserFilterDto): Promise<User[]> {
    return this.prisma.userProfile.findMany({
      where: filter.toWhereClause(),
      include: {
        dataKaryawan: true,
        roles: true,
      },
    });
  }
}
```

## 🔌 Dependency Management

### Module Dependencies Graph
```
AppModule
├── CoreModule
│   ├── ConfigModule
│   ├── DatabaseModule
│   └── AuthModule
├── UsersModule
├── OrganizationsModule
│   ├── SchoolsModule
│   ├── DepartmentsModule
│   └── PositionsModule
├── PermissionsModule
├── RolesModule
├── WorkflowsModule
├── NotificationsModule
├── AuditModule
└── SystemModule
```

### Shared Dependencies
- **PrismaModule**: Imported by all modules needing database access
- **CacheModule**: Imported by modules requiring caching
- **AuthModule**: Provides guards and decorators globally
- **ConfigModule**: Provides configuration to all modules

## 📝 File Naming Conventions

### Files
- **Controllers**: `*.controller.ts`
- **Services**: `*.service.ts`
- **Repositories**: `*.repository.ts`
- **DTOs**: `*-[action].dto.ts` (e.g., `create-user.dto.ts`)
- **Entities**: `*.entity.ts`
- **Interfaces**: `*.interface.ts`
- **Guards**: `*.guard.ts`
- **Interceptors**: `*.interceptor.ts`
- **Decorators**: `*.decorator.ts`
- **Tests**: `*.spec.ts` for unit, `*.e2e-spec.ts` for e2e

### Classes
- **PascalCase**: Classes, interfaces, types, enums
- **camelCase**: Variables, functions, methods
- **UPPER_SNAKE_CASE**: Constants
- **kebab-case**: File names

## 🎯 Best Practices

### 1. Module Organization
- Keep modules focused and cohesive
- Follow single responsibility principle
- Export only what's needed by other modules
- Use barrel exports (index.ts) for clean imports

### 2. Service Design
- One service per domain entity
- Services should be stateless
- Use dependency injection
- Implement interfaces for testability

### 3. Repository Pattern
- Abstract database operations
- Enable easy testing with mocks
- Centralize query logic
- Optimize database calls

### 4. DTO Usage
- Validate all inputs
- Transform responses
- Document with class-validator decorators
- Use mapped types for variations

### 5. Error Handling
- Use appropriate HTTP status codes
- Provide meaningful error messages
- Log errors with context
- Handle Prisma errors gracefully

### 6. Testing Structure
- Unit tests next to source files
- Integration tests in test/integration
- E2E tests in test/e2e
- Maintain test fixtures separately

## 🔧 Module Generator Script

Create new modules quickly with this template:

```bash
#!/bin/bash
# scripts/generate-module.sh

MODULE_NAME=$1
MODULE_PATH="src/modules/$MODULE_NAME"

mkdir -p $MODULE_PATH/{dto,entities,repositories,services,controllers,guards}

# Generate module file
cat > $MODULE_PATH/$MODULE_NAME.module.ts << EOF
import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class ${MODULE_NAME^}Module {}
EOF

echo "Module $MODULE_NAME created at $MODULE_PATH"
```

## 📚 Import Aliases

Configure TypeScript path aliases in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"],
      "@core/*": ["src/core/*"],
      "@modules/*": ["src/modules/*"],
      "@common/*": ["src/common/*"],
      "@infrastructure/*": ["src/infrastructure/*"]
    }
  }
}
```

This allows clean imports:
```typescript
import { PrismaService } from '@core/database/prisma.service';
import { UserService } from '@modules/users/services/user.service';
```

---

*This structure ensures maintainability, scalability, and follows NestJS best practices for enterprise applications.*