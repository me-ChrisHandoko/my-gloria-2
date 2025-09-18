# Gloria Backend API Endpoints & Service Patterns

## 🌐 API Design Principles

### RESTful Standards

- Use HTTP methods appropriately (GET, POST, PATCH, DELETE)
- Resource-based URLs with consistent naming
- Proper HTTP status codes
- Stateless communication
- HATEOAS where applicable

### API Versioning

```
Base URL: https://api.gloria.org/api/v1
```

### Standard Response Format

```typescript
// Success Response
{
  "success": true,
  "data": T,
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "1.0.0"
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {},
    "timestamp": "2024-01-01T00:00:00Z"
  }
}

// Paginated Response
{
  "success": true,
  "data": T[],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## 📡 Complete API Endpoints

### Authentication & Authorization

```typescript
// Authentication
POST   /api/v1/auth/login              // Login with Clerk
POST   /api/v1/auth/logout             // Logout
POST   /api/v1/auth/refresh            // Refresh token
GET    /api/v1/auth/me                 // Get current user
PATCH  /api/v1/auth/me                 // Update current user profile

// Session Management
GET    /api/v1/auth/sessions           // Get active sessions
DELETE /api/v1/auth/sessions/:id       // Revoke session
```

### User Management

```typescript
// User Profiles
GET    /api/v1/users                   // List users (paginated, filtered)
GET    /api/v1/users/:id               // Get user details
POST   /api/v1/users                   // Create user
PATCH  /api/v1/users/:id               // Update user
DELETE /api/v1/users/:id               // Soft delete user

// User Preferences
GET    /api/v1/users/:id/preferences   // Get user preferences
PATCH  /api/v1/users/:id/preferences   // Update preferences

// User Positions
GET    /api/v1/users/:id/positions     // Get user positions
POST   /api/v1/users/:id/positions     // Assign position
DELETE /api/v1/users/:id/positions/:positionId // Remove position

// User Roles
GET    /api/v1/users/:id/roles         // Get user roles
POST   /api/v1/users/:id/roles         // Assign role
DELETE /api/v1/users/:id/roles/:roleId // Remove role

// User Permissions
GET    /api/v1/users/:id/permissions   // Get effective permissions
POST   /api/v1/users/:id/permissions   // Grant direct permission
DELETE /api/v1/users/:id/permissions/:permissionId // Revoke permission
```

### Organization Management

```typescript
// Schools
GET    /api/v1/schools                 // List schools
GET    /api/v1/schools/:id             // Get school details
POST   /api/v1/schools                 // Create school
PATCH  /api/v1/schools/:id             // Update school
DELETE /api/v1/schools/:id             // Deactivate school

// Departments
GET    /api/v1/departments             // List departments
GET    /api/v1/departments/:id         // Get department details
POST   /api/v1/departments             // Create department
PATCH  /api/v1/departments/:id         // Update department
DELETE /api/v1/departments/:id         // Deactivate department
GET    /api/v1/departments/:id/hierarchy // Get department hierarchy

// Positions
GET    /api/v1/positions               // List positions
GET    /api/v1/positions/:id           // Get position details
POST   /api/v1/positions               // Create position
PATCH  /api/v1/positions/:id           // Update position
DELETE /api/v1/positions/:id           // Deactivate position
GET    /api/v1/positions/:id/holders   // Get position holders
```

### Permission System

```typescript
// Permissions
GET    /api/v1/permissions             // List permissions
GET    /api/v1/permissions/:id         // Get permission details
POST   /api/v1/permissions             // Create permission
PATCH  /api/v1/permissions/:id         // Update permission
DELETE /api/v1/permissions/:id         // Delete permission

// Permission Groups
GET    /api/v1/permission-groups       // List groups
POST   /api/v1/permission-groups       // Create group
PATCH  /api/v1/permission-groups/:id   // Update group
DELETE /api/v1/permission-groups/:id   // Delete group

// Permission Templates
GET    /api/v1/permission-templates    // List templates
POST   /api/v1/permission-templates    // Create template
POST   /api/v1/permission-templates/:id/apply // Apply template

// Permission Policies
GET    /api/v1/permission-policies     // List policies
POST   /api/v1/permission-policies     // Create policy
PATCH  /api/v1/permission-policies/:id // Update policy
DELETE /api/v1/permission-policies/:id // Delete policy

// Permission Validation
POST   /api/v1/permissions/check       // Check permission
POST   /api/v1/permissions/validate    // Validate multiple permissions
GET    /api/v1/permissions/my-permissions // Get current user permissions
```

### Role Management

```typescript
// Roles
GET    /api/v1/roles                   // List roles
GET    /api/v1/roles/:id               // Get role details
POST   /api/v1/roles                   // Create role
PATCH  /api/v1/roles/:id               // Update role
DELETE /api/v1/roles/:id               // Delete role

// Role Permissions
GET    /api/v1/roles/:id/permissions   // Get role permissions
POST   /api/v1/roles/:id/permissions   // Add permission to role
DELETE /api/v1/roles/:id/permissions/:permissionId // Remove permission

// Role Hierarchy
GET    /api/v1/roles/:id/hierarchy     // Get role hierarchy
POST   /api/v1/roles/:id/parent        // Set parent role
DELETE /api/v1/roles/:id/parent        // Remove parent role
```

### Module Access Control

```typescript
// Modules
GET    /api/v1/modules                 // List modules
GET    /api/v1/modules/:id             // Get module details
POST   /api/v1/modules                 // Register module
PATCH  /api/v1/modules/:id             // Update module
DELETE /api/v1/modules/:id             // Deactivate module

// Module Access
GET    /api/v1/modules/:id/access      // Get module access list
POST   /api/v1/modules/:id/access      // Grant module access
DELETE /api/v1/modules/:id/access/:userId // Revoke access

// Module Permissions
GET    /api/v1/modules/:id/permissions // Get module permissions
POST   /api/v1/modules/:id/permissions // Define module permission
```

### Workflow Management

```typescript
// Workflows
GET    /api/v1/workflows               // List workflows
GET    /api/v1/workflows/:id           // Get workflow details
POST   /api/v1/workflows               // Create workflow
PATCH  /api/v1/workflows/:id           // Update workflow
DELETE /api/v1/workflows/:id           // Delete workflow

// Workflow Instances
GET    /api/v1/workflow-instances      // List instances
GET    /api/v1/workflow-instances/:id  // Get instance details
POST   /api/v1/workflow-instances      // Start workflow
PATCH  /api/v1/workflow-instances/:id  // Update instance

// Workflow Actions
POST   /api/v1/workflow-instances/:id/approve   // Approve step
POST   /api/v1/workflow-instances/:id/reject    // Reject step
POST   /api/v1/workflow-instances/:id/delegate  // Delegate step
POST   /api/v1/workflow-instances/:id/escalate  // Escalate step
POST   /api/v1/workflow-instances/:id/cancel    // Cancel workflow

// Workflow Templates
GET    /api/v1/workflow-templates      // List templates
POST   /api/v1/workflow-templates      // Create template
POST   /api/v1/workflow-templates/:id/use // Use template
```

### Notification System

```typescript
// Notifications
GET    /api/v1/notifications           // List notifications
GET    /api/v1/notifications/:id       // Get notification details
POST   /api/v1/notifications           // Send notification
PATCH  /api/v1/notifications/:id/read  // Mark as read
DELETE /api/v1/notifications/:id       // Delete notification

// Notification Preferences
GET    /api/v1/notification-preferences // Get preferences
PATCH  /api/v1/notification-preferences // Update preferences

// Channel Preferences
GET    /api/v1/notification-preferences/channels // Get channel settings
PATCH  /api/v1/notification-preferences/channels // Update channels

// Unsubscribe
POST   /api/v1/notifications/unsubscribe // Unsubscribe from notifications
GET    /api/v1/notifications/unsubscribe/:token // Verify unsubscribe token
```

### Audit & Compliance

```typescript
// Audit Logs
GET    /api/v1/audit-logs              // List audit logs
GET    /api/v1/audit-logs/:id          // Get audit log details
GET    /api/v1/audit-logs/export       // Export audit logs

// Permission Check Logs
GET    /api/v1/permission-check-logs   // List permission checks
GET    /api/v1/permission-check-logs/stats // Get statistics

// Change History
GET    /api/v1/change-history          // List changes
GET    /api/v1/change-history/:id      // Get change details
POST   /api/v1/change-history/:id/rollback // Rollback change
```

### System Management

```typescript
// System Configuration
GET    /api/v1/system/config           // Get configuration
PATCH  /api/v1/system/config           // Update configuration

// Feature Flags
GET    /api/v1/system/feature-flags    // List feature flags
GET    /api/v1/system/feature-flags/:id // Get flag details
PATCH  /api/v1/system/feature-flags/:id // Toggle flag

// System Backup
GET    /api/v1/system/backups          // List backups
POST   /api/v1/system/backups          // Create backup
POST   /api/v1/system/backups/:id/restore // Restore backup

// Health & Metrics
GET    /api/v1/health                  // Health check
GET    /api/v1/health/ready            // Readiness check
GET    /api/v1/health/live             // Liveness check
GET    /api/v1/metrics                 // System metrics
```

## 🎨 Service Patterns

### 1. Repository Pattern

```typescript
// Base Repository Interface
export interface IRepository<T> {
  findAll(filter?: FilterDto): Promise<T[]>;
  findOne(id: string): Promise<T | null>;
  create(data: CreateDto): Promise<T>;
  update(id: string, data: UpdateDto): Promise<T>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
}

// Implementation
@Injectable()
export class UserRepository implements IRepository<UserProfile> {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter?: UserFilterDto): Promise<UserProfile[]> {
    return this.prisma.userProfile.findMany({
      where: this.buildWhereClause(filter),
      include: this.getDefaultIncludes(),
      orderBy: { createdAt: 'desc' },
    });
  }

  private getDefaultIncludes() {
    return {
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
    };
  }
}
```

### 2. Service Layer Pattern

```typescript
// Base Service
export abstract class BaseService<T> {
  constructor(protected readonly repository: IRepository<T>) {}

  async findAll(filter?: FilterDto): Promise<PaginatedResponse<T>> {
    const [data, total] = await Promise.all([
      this.repository.findAll(filter),
      this.repository.count(filter),
    ]);

    return {
      data,
      pagination: {
        page: filter?.page || 1,
        limit: filter?.limit || 20,
        total,
        totalPages: Math.ceil(total / (filter?.limit || 20)),
      },
    };
  }
}

// Domain Service
@Injectable()
export class UserService extends BaseService<UserProfile> {
  constructor(
    userRepository: UserRepository,
    private readonly clerkService: ClerkService,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(userRepository);
  }

  async createUser(dto: CreateUserDto): Promise<UserProfile> {
    // Business logic
    const clerkUser = await this.clerkService.createUser(dto);

    // Create in database
    const user = await this.repository.create({
      ...dto,
      clerkUserId: clerkUser.id,
    });

    // Clear cache
    await this.cacheService.del(`users:*`);

    // Emit event
    this.eventEmitter.emit('user.created', user);

    return user;
  }
}
```

### 3. Permission Calculation Service

```typescript
@Injectable()
export class PermissionCalculatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async calculateEffectivePermissions(userId: string): Promise<Permission[]> {
    const cacheKey = `permissions:${userId}`;

    // Check cache
    const cached = await this.cacheService.get<Permission[]>(cacheKey);
    if (cached) return cached;

    // Calculate permissions
    const permissions = await this.computePermissions(userId);

    // Cache with TTL
    await this.cacheService.set(cacheKey, permissions, 300);

    return permissions;
  }

  private async computePermissions(userId: string): Promise<Permission[]> {
    // Get all permission sources
    const [
      rolePermissions,
      directPermissions,
      positionPermissions,
      delegatedPermissions,
    ] = await Promise.all([
      this.getRolePermissions(userId),
      this.getDirectPermissions(userId),
      this.getPositionPermissions(userId),
      this.getDelegatedPermissions(userId),
    ]);

    // Merge and resolve conflicts
    return this.mergePermissions([
      ...rolePermissions,
      ...directPermissions,
      ...positionPermissions,
      ...delegatedPermissions,
    ]);
  }
}
```

### 4. Workflow Execution Pattern

```typescript
@Injectable()
export class WorkflowExecutorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async executeStep(instanceId: string, stepIndex: number): Promise<void> {
    const instance = await this.getWorkflowInstance(instanceId);
    const step = instance.workflow.steps[stepIndex];

    try {
      // Execute based on step type
      switch (step.type) {
        case StepType.APPROVAL:
          await this.executeApprovalStep(instance, step);
          break;
        case StepType.NOTIFICATION:
          await this.executeNotificationStep(instance, step);
          break;
        case StepType.ACTION:
          await this.executeActionStep(instance, step);
          break;
        case StepType.CONDITION:
          await this.executeConditionStep(instance, step);
          break;
      }

      // Update step status
      await this.updateStepStatus(instanceId, stepIndex, StepStatus.COMPLETED);

      // Transition to next step
      await this.transitionToNextStep(instance, stepIndex);
    } catch (error) {
      await this.handleStepError(instanceId, stepIndex, error);
    }
  }
}
```

### 5. Notification Channel Strategy Pattern

```typescript
// Channel Interface
export interface INotificationChannel {
  send(notification: Notification, recipient: User): Promise<void>;
  isAvailable(): Promise<boolean>;
}

// Channel Implementations
@Injectable()
export class EmailChannel implements INotificationChannel {
  constructor(private readonly postmarkService: PostmarkService) {}

  async send(notification: Notification, recipient: User): Promise<void> {
    await this.postmarkService.sendEmail({
      to: recipient.email,
      subject: notification.title,
      body: notification.message,
    });
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

// Channel Factory
@Injectable()
export class NotificationChannelFactory {
  constructor(
    private readonly emailChannel: EmailChannel,
    private readonly inAppChannel: InAppChannel,
    private readonly pushChannel: PushChannel,
    private readonly smsChannel: SmsChannel,
  ) {}

  getChannel(type: NotificationChannel): INotificationChannel {
    switch (type) {
      case NotificationChannel.EMAIL:
        return this.emailChannel;
      case NotificationChannel.IN_APP:
        return this.inAppChannel;
      case NotificationChannel.PUSH:
        return this.pushChannel;
      case NotificationChannel.SMS:
        return this.smsChannel;
      default:
        throw new Error(`Unknown channel type: ${type}`);
    }
  }
}
```

### 6. Caching Strategy

```typescript
@Injectable()
export class CacheService {
  private readonly defaultTTL = 300; // 5 minutes

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    return await this.cacheManager.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl || this.defaultTTL);
  }

  async del(pattern: string): Promise<void> {
    const keys = await this.cacheManager.store.keys(pattern);
    await Promise.all(keys.map((key) => this.cacheManager.del(key)));
  }

  // Decorator for method caching
  @Cacheable({ ttl: 300 })
  async expensiveOperation(): Promise<any> {
    // This will be cached
  }
}
```

### 7. Transaction Management

```typescript
@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async executeInTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return await this.prisma.$transaction(async (tx) => {
      try {
        return await callback(tx);
      } catch (error) {
        // Log error
        throw error;
      }
    });
  }

  // Usage example
  async complexOperation(): Promise<void> {
    await this.executeInTransaction(async (tx) => {
      // Multiple operations in transaction
      const user = await tx.userProfile.create({ ... });
      await tx.auditLog.create({ ... });
      await tx.notification.create({ ... });
    });
  }
}
```

## 🔒 Security Patterns

### Authentication Guard

```typescript
@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly clerkService: ClerkService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const session = await this.clerkService.verifySession(token);
      request.user = session.user;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

### Permission Guard

```typescript
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      'permissions',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const hasPermission = await this.permissionService.checkPermissions(
      user.id,
      requiredPermissions,
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
```

## 📊 Performance Optimization

### Query Optimization

```typescript
// Bad - N+1 problem
const users = await prisma.userProfile.findMany();
for (const user of users) {
  const roles = await prisma.userRole.findMany({
    where: { userProfileId: user.id },
  });
}

// Good - Single query with includes
const users = await prisma.userProfile.findMany({
  include: {
    roles: {
      include: {
        role: true,
      },
    },
  },
});
```

### Pagination

```typescript
@Injectable()
export class PaginationService {
  paginate<T>(data: T[], page: number, limit: number): PaginatedResponse<T> {
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    return {
      data: data.slice(startIndex, endIndex),
      pagination: {
        page,
        limit,
        total: data.length,
        totalPages: Math.ceil(data.length / limit),
        hasNext: endIndex < data.length,
        hasPrev: startIndex > 0,
      },
    };
  }
}
```

### Rate Limiting

```typescript
// Controller level
@Controller('api/v1/auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  @Post('login')
  @RateLimit({ points: 5, duration: 60 }) // 5 attempts per minute
  async login(@Body() dto: LoginDto) {
    // Login logic
  }
}
```

---

_This document provides comprehensive API design and service patterns for the Gloria backend system._
