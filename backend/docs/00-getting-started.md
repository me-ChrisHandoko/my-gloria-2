# Gloria Backend - Getting Started Guide

## 🚀 Quick Start

This guide will help you set up the Gloria backend development environment and start implementing the system modules.

## 📋 Prerequisites

### Required Software
- Node.js 20+ and npm 10+
- PostgreSQL 15+
- Redis 7+
- Git
- Docker & Docker Compose (optional but recommended)

### Required Accounts
- [Clerk](https://clerk.dev) account for authentication
- [Postmark](https://postmarkapp.com) account for email service
- PostgreSQL database with appropriate schemas

## 🛠️ Initial Setup

### 1. Environment Setup

```bash
# Clone the repository (if not already done)
cd /Users/christianhandoko/Development/work/my-gloria-2/backend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env.development  # For development template
cp .env.development .env          # Use development config as active environment

# Generate Prisma client
npx prisma generate

# Verify environment setup
npm run env:validate  # Check all required variables are set
```

### 2. Configure Environment Variables

We provide three environment configuration files:

- **`.env.example`** - Template with all available configuration options
- **`.env.development`** - Pre-configured for local development
- **`.env`** - Your active configuration (copy from .env.development)

#### Required Configuration

```bash
# ===== REQUIRED: Core Settings =====
NODE_ENV=development
PORT=3001                                    # Backend port (frontend uses 3000)
DATABASE_URL="postgresql://postgres:mydevelopment@localhost:3479/new_gloria_db"

# ===== REQUIRED: Authentication (Clerk) =====
CLERK_PUBLISHABLE_KEY=pk_test_your_key      # From dashboard.clerk.dev
CLERK_SECRET_KEY=sk_test_your_secret        # From dashboard.clerk.dev

# ===== REQUIRED: Security =====
JWT_SECRET=your-32-char-secret              # Generate: openssl rand -hex 32
ENCRYPTION_KEY=your-32-char-key-exactly     # Must be exactly 32 characters
```

#### Optional Services

```bash
# ===== OPTIONAL: Caching (Redis) =====
REDIS_URL=redis://localhost:6379            # If Redis is installed
CACHE_TTL=3600                              # Cache lifetime in seconds

# ===== OPTIONAL: Email (Postmark) =====
POSTMARK_API_KEY=your_api_key              # From account.postmarkapp.com
POSTMARK_FROM_EMAIL=noreply@gloria.local   # Verified sender email

# ===== OPTIONAL: Monitoring =====
SENTRY_DSN=https://xxx@sentry.io/xxx       # Error tracking
APM_ENABLED=false                           # Performance monitoring
```

#### Development Settings

```bash
# ===== Development Tools =====
LOG_LEVEL=debug                            # Verbose logging
PRETTY_LOGS=true                           # Formatted logs
SWAGGER_ENABLED=true                       # API documentation at /api/docs
ENABLE_DEBUG_MODE=true                     # Additional debug output

# ===== CORS Configuration =====
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=true
```

#### Security Best Practices

⚠️ **Important Security Notes:**

1. **Never commit `.env` files** with real credentials to version control
2. **Use strong secrets** - Generate with: `openssl rand -hex 32`
3. **Different credentials per environment** - Don't reuse production secrets
4. **Rotate secrets regularly** - Especially after team member changes
5. **Use environment-specific files** - `.env.development`, `.env.staging`, `.env.production`

### 3. Database Setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE gloria_dev;"

# Create schemas
psql -U postgres -d gloria_dev -c "CREATE SCHEMA IF NOT EXISTS gloria_master;"
psql -U postgres -d gloria_dev -c "CREATE SCHEMA IF NOT EXISTS gloria_ops;"

# Run migrations (when available)
npx prisma migrate dev

# Seed initial data (create seed file first)
npx prisma db seed
```

### 4. Docker Setup (Alternative)

```bash
# Start all services with Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Verify services are running
docker-compose ps
```

## 🏗️ Core Implementation Steps

### Step 1: Create Core Module Structure

```bash
# Create core directories
mkdir -p src/core/{config,database,auth,exceptions,interceptors,decorators,pipes,utils}
```

### Step 2: Implement PrismaService

```typescript
// src/core/database/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDatabase is not allowed in production');
    }
    const models = Reflect.ownKeys(this).filter(key => key[0] !== '_' && key[0] !== '$');
    return Promise.all(models.map(modelKey => this[modelKey]?.deleteMany?.()));
  }
}
```

```typescript
// src/core/database/prisma.module.ts
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### Step 3: Setup Clerk Authentication

```typescript
// src/core/auth/guards/clerk-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { clerkClient } from '@clerk/clerk-sdk-node';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      const session = await clerkClient.sessions.verifySession('', token);
      const user = await clerkClient.users.getUser(session.userId);
      
      request.user = {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

### Step 4: Create Base Decorators

```typescript
// src/core/auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

```typescript
// src/core/auth/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### Step 5: Configure Main Application

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  // Security
  await app.register(helmet);
  await app.register(compress);

  // CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],  // Frontend on port 3000
    credentials: true,
  });

  // Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Gloria API')
      .setDescription('Gloria Backend API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Start server
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Application is running on: http://localhost:${port}`);
}

bootstrap();
```

### Step 6: Update App Module

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './core/database/prisma.module';
import { ClerkAuthGuard } from './core/auth/guards/clerk-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    PrismaModule,
    // Add your modules here as you create them
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

## 📦 First Module Implementation

### Create User Module

```bash
# Create user module structure
mkdir -p src/modules/users/{dto,entities,services,controllers,repositories}
```

```typescript
// src/modules/users/dto/create-user.dto.ts
import { IsEmail, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  nip: string;

  @ApiProperty()
  @IsString()
  clerkUserId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;
}
```

```typescript
// src/modules/users/services/user.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    return this.prisma.userProfile.create({
      data: {
        id: crypto.randomUUID(),
        ...createUserDto,
      },
      include: {
        dataKaryawan: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.userProfile.findMany({
        skip,
        take: limit,
        include: {
          dataKaryawan: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.userProfile.count(),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.userProfile.findUnique({
      where: { id },
      include: {
        dataKaryawan: true,
        roles: {
          include: {
            role: true,
          },
        },
        positions: {
          include: {
            position: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id); // Check if exists

    return this.prisma.userProfile.update({
      where: { id },
      data: updateUserDto,
      include: {
        dataKaryawan: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    return this.prisma.userProfile.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }

  async findByClerkId(clerkUserId: string) {
    return this.prisma.userProfile.findUnique({
      where: { clerkUserId },
      include: {
        dataKaryawan: true,
      },
    });
  }
}
```

```typescript
// src/modules/users/controllers/user.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { CurrentUser } from '@/core/auth/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.userService.findAll(+page, +limit);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getCurrentUser(@CurrentUser() user: any) {
    return this.userService.findByClerkId(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete user' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
```

```typescript
// src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';

@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UsersModule {}
```

## 🧪 Testing Setup

### Create Test Files

```typescript
// src/modules/users/services/user.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '@/core/database/prisma.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            userProfile: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const mockUsers = [{ id: '1', nip: '12345' }];
      jest.spyOn(prisma.userProfile, 'findMany').mockResolvedValue(mockUsers as any);
      jest.spyOn(prisma.userProfile, 'count').mockResolvedValue(1);

      const result = await service.findAll(1, 20);

      expect(result).toEqual({
        data: mockUsers,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      });
    });
  });
});
```

## 🚦 Running the Application

### Development Mode

```bash
# Start in watch mode
npm run start:dev

# The backend application will be available at:
# http://localhost:3001

# API Documentation (Swagger):
# http://localhost:3001/api/docs

# Health check:
# http://localhost:3001/health

# Frontend will be available at:
# http://localhost:3000
```

### Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run test coverage
npm run test:cov

# Run e2e tests
npm run test:e2e
```

### Debugging

```bash
# Start in debug mode
npm run start:debug

# Attach debugger in VS Code:
# 1. Set breakpoints in your code
# 2. Press F5 or go to Run > Start Debugging
# 3. Select "Attach to Node Process"
```

## 📝 Development Workflow

### 1. Create New Module

```bash
# Use the module generator script
./scripts/generate-module.sh module-name

# Or manually create structure
mkdir -p src/modules/module-name/{dto,services,controllers}
```

### 2. Implement Service Logic

1. Create DTOs for validation
2. Implement service with business logic
3. Create controller with endpoints
4. Add module to AppModule imports

### 3. Test Your Code

```bash
# Run tests for specific module
npm run test -- users

# Run with coverage
npm run test:cov
```

### 4. Document Your API

- Add Swagger decorators to DTOs and controllers
- Access documentation at `/api/docs`

## 🔍 Common Development Tasks

### Add New Dependency

```bash
# Production dependency
npm install package-name

# Development dependency
npm install -D package-name

# Regenerate Prisma client after schema changes
npx prisma generate
```

### Database Operations

```bash
# Create new migration
npx prisma migrate dev --name migration-name

# Reset database
npx prisma migrate reset

# View database in Prisma Studio
npx prisma studio
```

### Environment Variables

Always update `.env.example` when adding new environment variables:

```bash
# Add to .env.example
NEW_VARIABLE=example-value

# Document in README or configuration guide
```

## 🐛 Troubleshooting

### Common Issues and Solutions

1. **Database Connection Error**
   - Check DATABASE_URL in .env
   - Ensure PostgreSQL is running
   - Verify schemas exist

2. **Clerk Authentication Error**
   - Verify CLERK_SECRET_KEY is correct
   - Check Clerk dashboard for proper configuration
   - Ensure frontend is sending correct tokens

3. **Prisma Client Not Generated**
   ```bash
   npx prisma generate
   ```

4. **Port Already in Use**
   ```bash
   # Find process using port 3001 (backend)
   lsof -i :3001
   # Kill the process
   kill -9 <PID>
   
   # Or for frontend port 3000
   lsof -i :3000
   kill -9 <PID>
   ```

5. **Module Not Found Errors**
   - Check tsconfig.json paths configuration
   - Restart TypeScript server in VS Code
   - Clear node_modules and reinstall

## 📚 Next Steps

1. **Complete Core Modules**: Implement remaining core infrastructure
2. **Add Authentication Flow**: Complete Clerk integration with user sync
3. **Implement Permission System**: Build the permission calculation engine
4. **Create API Tests**: Add comprehensive test coverage
5. **Setup CI/CD**: Configure GitHub Actions for automated testing
6. **Add Monitoring**: Integrate Sentry and application monitoring

---

*Follow this guide to get started with Gloria backend development. For detailed implementation, refer to other documentation files in the docs/ folder.*