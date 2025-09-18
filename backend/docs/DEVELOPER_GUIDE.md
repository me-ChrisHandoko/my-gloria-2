# Gloria Backend Developer Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Development Workflow](#development-workflow)
4. [Testing Strategy](#testing-strategy)
5. [API Documentation](#api-documentation)
6. [Security Guidelines](#security-guidelines)
7. [Performance Optimization](#performance-optimization)
8. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites
- Node.js v20+ (LTS recommended)
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)
- Git

### Initial Setup

1. **Clone the repository**
```bash
git clone https://github.com/your-org/gloria-backend.git
cd gloria-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Setup database**
```bash
# Create database
createdb gloria_dev

# Run migrations
npx prisma migrate dev

# Seed initial data (optional)
npx prisma db seed
```

5. **Start Redis**
```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or using local Redis
redis-server
```

6. **Start development server**
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`

### Quick Commands

```bash
# Development
npm run start:dev         # Start with hot reload
npm run start:debug       # Start with debugger

# Building
npm run build            # Build for production
npm run start:prod       # Run production build

# Testing
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:cov         # Generate coverage report
npm run test:e2e         # Run E2E tests

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format with Prettier

# Database
npx prisma studio        # Open Prisma Studio
npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Run migrations
```

## Architecture Overview

### Technology Stack
- **Framework**: NestJS 11 with Fastify adapter
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis with ioredis
- **Authentication**: Clerk
- **Email**: Postmark
- **Queue**: Bull with Redis
- **Documentation**: Swagger/OpenAPI

### Project Structure

```
src/
├── app.module.ts           # Root module
├── main.ts                 # Application entry point
├── core/                   # Core functionality
│   ├── auth/              # Authentication
│   ├── cache/             # Caching layer
│   ├── database/          # Database configuration
│   ├── decorators/        # Custom decorators
│   ├── filters/           # Exception filters
│   ├── guards/            # Auth guards
│   ├── interceptors/      # Request interceptors
│   └── security/          # Security utilities
├── modules/               # Feature modules
│   ├── users/            # User management
│   ├── organizations/    # Organization hierarchy
│   ├── permissions/      # Permission system
│   ├── workflows/        # Workflow engine
│   ├── notifications/    # Notification system
│   └── audit/           # Audit logging
└── common/               # Shared utilities
    ├── dto/             # Common DTOs
    ├── interfaces/      # Type definitions
    └── utils/           # Helper functions
```

### Key Design Patterns

#### 1. Module Pattern
Each feature is organized as a NestJS module with:
- Controller: HTTP request handling
- Service: Business logic
- Repository: Data access (optional)
- DTOs: Request/response validation
- Entities: Database models

#### 2. Dependency Injection
```typescript
@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private clerk: ClerkAuthService,
  ) {}
}
```

#### 3. Decorator Pattern
```typescript
@Controller('users')
@ApiTags('Users')
@UseGuards(ClerkAuthGuard)
export class UserController {
  @Get(':id')
  @RequirePermission('USERS', 'READ')
  async findOne(@Param('id') id: string) {
    // ...
  }
}
```

## Development Workflow

### 1. Feature Development

#### Creating a New Module
```bash
nest g module modules/feature-name
nest g controller modules/feature-name
nest g service modules/feature-name
```

#### Module Structure
```typescript
// feature.module.ts
@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService],
})
export class FeatureModule {}
```

### 2. Database Changes

#### Create Migration
```bash
# Modify schema.prisma
npx prisma migrate dev --name describe_change
```

#### Schema Best Practices
```prisma
model Entity {
  id        String   @id @default(dbgenerated("gen_random_uuid()"))
  code      String   @unique
  name      String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  @@index([code])
  @@index([createdAt])
  @@map("entities")
}
```

### 3. API Development

#### DTO Validation
```typescript
import { IsString, IsEmail, IsOptional, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John', minLength: 2, maxLength: 50 })
  @IsString()
  @Length(2, 50)
  firstName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
```

#### Service Implementation
```typescript
@Injectable()
export class UserService {
  async create(dto: CreateUserDto): Promise<User> {
    // Validate business rules
    await this.validateUniqueEmail(dto.email);

    // Start transaction
    return this.prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.userProfile.create({
        data: dto,
      });

      // Clear cache
      await this.cache.delPattern('users:*');

      // Audit log
      await this.auditService.log({
        action: 'CREATE',
        entityType: 'USER',
        entityId: user.id,
      });

      return user;
    });
  }
}
```

### 4. Error Handling

```typescript
// Custom exceptions
export class UserNotFoundException extends NotFoundException {
  constructor(userId: string) {
    super(`User with ID ${userId} not found`);
  }
}

// Usage
const user = await this.prisma.userProfile.findUnique({ where: { id } });
if (!user) {
  throw new UserNotFoundException(id);
}
```

## Testing Strategy

### 1. Unit Tests
Located in `*.spec.ts` files next to source files.

```typescript
describe('UserService', () => {
  let service: UserService;
  let mockPrisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(UserService);
  });

  it('should create user', async () => {
    const dto = { email: 'test@example.com' };
    mockPrisma.userProfile.create.mockResolvedValue(mockUser);

    const result = await service.create(dto);
    expect(result).toEqual(mockUser);
  });
});
```

### 2. Integration Tests
Located in `test/integration/`.

```typescript
describe('Auth Integration', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication(new FastifyAdapter());
    await app.init();
  });

  it('should authenticate user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { Authorization: 'Bearer token' },
    });

    expect(response.statusCode).toBe(200);
  });
});
```

### 3. E2E Tests
Located in `test/e2e/`.

Tests complete user workflows across multiple endpoints.

### 4. Performance Tests
Located in `test/performance/`.

```bash
# Install k6
brew install k6

# Run load test
k6 run test/performance/load-test.js

# Run stress test
k6 run test/performance/stress-test.js
```

### Test Coverage Goals
- Unit tests: >80% coverage
- Integration tests: All critical paths
- E2E tests: Main user workflows
- Performance: <200ms p95 response time

## API Documentation

### Swagger UI
Available at `http://localhost:3000/docs` in development.

### API Versioning
All endpoints use URI versioning: `/api/v1/...`

### Standard Response Format

#### Success Response
```json
{
  "data": { /* resource data */ },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "1.0.0"
  }
}
```

#### Error Response
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "errors": ["Email is invalid"]
    }
  ]
}
```

#### Paginated Response
```json
{
  "data": [ /* array of resources */ ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### Authentication
All endpoints require authentication except:
- `GET /health`
- `GET /health/live`
- `GET /health/ready`

Use Bearer token in Authorization header:
```
Authorization: Bearer <jwt-token>
```

Or API key:
```
x-api-key: <api-key>
```

## Security Guidelines

### 1. Input Validation
- Always use DTOs with class-validator
- Sanitize user input
- Validate against SQL injection
- Check file uploads

### 2. Authentication & Authorization
- Use ClerkAuthGuard for all protected routes
- Implement permission checks with @RequirePermission
- Validate JWT tokens
- Implement rate limiting

### 3. Data Protection
- Encrypt sensitive data at rest
- Use HTTPS in production
- Implement CORS properly
- Never log sensitive information

### 4. Security Headers
Automatically configured via Helmet:
- X-Frame-Options
- X-Content-Type-Options
- Content-Security-Policy
- Strict-Transport-Security

### 5. Environment Variables
Never commit:
- API keys
- Database credentials
- JWT secrets
- Encryption keys

## Performance Optimization

### 1. Database Optimization
```typescript
// Use select to limit fields
await this.prisma.user.findMany({
  select: {
    id: true,
    email: true,
    firstName: true,
  },
});

// Use pagination
await this.prisma.user.findMany({
  skip: (page - 1) * limit,
  take: limit,
});

// Add indexes for frequently queried fields
@@index([email])
@@index([createdAt])
```

### 2. Caching Strategy
```typescript
// Cache frequently accessed data
const cacheKey = `user:${id}`;
const cached = await this.cache.get(cacheKey);
if (cached) return cached;

const user = await this.prisma.user.findUnique({ where: { id } });
await this.cache.set(cacheKey, user, 3600); // 1 hour TTL
return user;
```

### 3. Query Optimization
- Use database views for complex queries
- Implement cursor-based pagination for large datasets
- Use raw SQL for complex aggregations
- Monitor slow queries with Prisma logging

### 4. Resource Management
- Connection pooling (configured in Prisma)
- Redis connection reuse
- Proper error handling to prevent memory leaks
- Graceful shutdown handling

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors
```bash
# Check PostgreSQL is running
pg_isready

# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL
```

#### 2. Redis Connection Errors
```bash
# Check Redis is running
redis-cli ping

# Check Redis connection
redis-cli -h localhost -p 6379
```

#### 3. Permission Denied Errors
```bash
# Clear permission cache
npm run cache:clear

# Verify user permissions in database
npx prisma studio
```

#### 4. Build Errors
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run start:dev

# Debug specific module
DEBUG=app:* npm run start:dev

# Debug Prisma queries
DEBUG=prisma:query npm run start:dev
```

### Health Checks
```bash
# Check application health
curl http://localhost:3000/health

# Check readiness
curl http://localhost:3000/health/ready

# Check liveness
curl http://localhost:3000/health/live
```

### Monitoring

#### Application Metrics
Available at `/metrics` endpoint (Prometheus format).

#### Logging
- Development: Console output
- Production: Structured JSON logs
- Log levels: ERROR, WARN, INFO, DEBUG, VERBOSE

#### Performance Monitoring
- Use APM tools (New Relic, DataDog, etc.)
- Monitor database query performance
- Track API response times
- Monitor memory and CPU usage

## Best Practices

### 1. Code Style
- Follow ESLint configuration
- Use Prettier for formatting
- Write self-documenting code
- Add JSDoc comments for complex logic

### 2. Git Workflow
```bash
# Feature branch
git checkout -b feature/description

# Commit with conventional commits
git commit -m "feat(users): add user search"

# Push and create PR
git push origin feature/description
```

### 3. Code Review Checklist
- [ ] Tests passing
- [ ] Coverage maintained
- [ ] Documentation updated
- [ ] Security considerations
- [ ] Performance impact
- [ ] Database migrations tested

### 4. Production Readiness
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Redis configured
- [ ] Rate limiting enabled
- [ ] Monitoring setup
- [ ] Error tracking configured
- [ ] Backup strategy implemented

## Resources

### Documentation
- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Clerk Documentation](https://clerk.dev/docs)
- [Fastify Documentation](https://www.fastify.io/docs)

### Tools
- [Prisma Studio](https://www.prisma.io/studio) - Database GUI
- [Postman](https://www.postman.com) - API testing
- [k6](https://k6.io) - Load testing
- [Redis Commander](https://github.com/joeferner/redis-commander) - Redis GUI

### Support
- GitHub Issues: Report bugs and request features
- Slack: #gloria-backend channel
- Wiki: Internal documentation and guides