# Gloria Permission System - Quick Reference Guide

**For Developers**: Fast lookup guide for common operations

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Start development server
npm run start:dev

# Run tests
npm run test
```

---

## 📋 Common Operations

### Check User Permission

```typescript
// In your service
import { PermissionCalculationService } from '@/modules/permissions/services/permission-calculation.service';

constructor(private permCalc: PermissionCalculationService) {}

async checkAccess(userId: string, resource: string, action: string) {
  const result = await this.permCalc.checkPermission({
    userProfileId: userId,
    resource,
    action,
    resourceId: 'optional-resource-id', // For resource-specific checks
    contextData: { /* optional context */ }
  });

  return result.isAllowed;
}
```

### API Examples

#### Assign Permission to User
```bash
curl -X POST http://localhost:3000/users/USER_ID/permissions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissionId": "PERMISSION_ID",
    "isGranted": true,
    "scope": "OWN",
    "grantReason": "Manager approval"
  }'
```

#### Check Permission
```bash
curl -X POST http://localhost:3000/users/USER_ID/permissions/check \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resource": "project",
    "action": "update",
    "resourceId": "project-123"
  }'
```

#### Create Delegation
```bash
curl -X POST http://localhost:3000/delegations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fromUserId": "USER_1",
    "toUserId": "USER_2",
    "permissionId": "PERMISSION_ID",
    "reason": "Vacation coverage",
    "validFrom": "2025-01-01T00:00:00Z",
    "validUntil": "2025-01-15T23:59:59Z"
  }'
```

#### Apply Permission Template
```bash
curl -X POST http://localhost:3000/templates/TEMPLATE_ID/apply \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetId": "USER_ID",
    "targetType": "USER",
    "appliedBy": "ADMIN_ID",
    "applyReason": "New employee onboarding",
    "effectiveDate": "2025-01-01T00:00:00Z"
  }'
```

---

## 🔐 Permission Scopes

| Scope | Description | Example |
|-------|-------------|---------|
| `OWN` | User's own resources only | Edit own profile |
| `DEPARTMENT` | Department-level access | View department reports |
| `SCHOOL` | School-level access | Manage school settings |
| `ALL` | System-wide access | System administration |

---

## 📊 Admin Operations

### System Health Check
```bash
curl -X POST http://localhost:3000/admin/permissions/health-check \
  -H "Authorization: Bearer $TOKEN"
```

### Detect Conflicts
```bash
curl http://localhost:3000/admin/permissions/conflicts \
  -H "Authorization: Bearer $TOKEN"
```

### Find Orphaned Permissions
```bash
curl http://localhost:3000/admin/permissions/orphaned \
  -H "Authorization: Bearer $TOKEN"
```

### Optimize Cache
```bash
curl -X POST http://localhost:3000/admin/permissions/optimize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clearAll": true, "rebuildAll": true}'
```

---

## 📜 Audit Operations

### View Change History
```bash
curl http://localhost:3000/history?entityType=USER&entityId=USER_ID&page=1&limit=20 \
  -H "Authorization: Bearer $TOKEN"
```

### Rollback Change
```bash
curl -X POST http://localhost:3000/history/CHANGE_ID/rollback \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Incorrect assignment",
    "confirmedBy": "ADMIN_ID"
  }'
```

### View Denied Access Attempts
```bash
curl http://localhost:3000/check-logs/denied?limit=50 \
  -H "Authorization: Bearer $TOKEN"
```

### Export Compliance Data
```bash
curl -X POST http://localhost:3000/history/export \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-01-31T23:59:59Z",
    "format": "csv",
    "includeRollbacks": true
  }'
```

---

## 🛡️ Required Permissions by Operation

| Operation | Required Permission |
|-----------|---------------------|
| View permissions | `PERMISSION_VIEW` |
| Create permissions | `PERMISSION_CREATE` |
| Update permissions | `PERMISSION_UPDATE` |
| Delete permissions | `PERMISSION_DELETE` |
| Assign permissions | `PERMISSION_ASSIGN` |
| Delegate permissions | `PERMISSION_DELEGATE` |
| Manage templates | `PERMISSION_TEMPLATE_MANAGE` |
| View history | `PERMISSION_HISTORY_VIEW` |
| Rollback changes | `PERMISSION_HISTORY_ROLLBACK` |
| View access logs | `PERMISSION_LOG_VIEW` |
| Export compliance data | `PERMISSION_LOG_EXPORT` |
| View admin data | `PERMISSION_ADMIN_VIEW` |
| System optimization | `PERMISSION_ADMIN_MANAGE` |

---

## 🔄 Permission Resolution Order

The system resolves permissions in this order (first match wins):

1. **Direct User Permission** (highest priority)
   - Explicit grant or deny for specific user

2. **Resource Permission**
   - Permission on specific resource instance

3. **Active Delegation**
   - Temporarily delegated permission

4. **Role Permission**
   - Permission from assigned roles (with hierarchy inheritance)

5. **Position Permission**
   - Permission from organizational position

6. **Default**: Deny (lowest priority)

### Priority Scoring
- User permissions can have priority values (0-100)
- Higher priority wins in conflict resolution
- Default priority: 50

---

## 🧪 Testing Patterns

### Unit Test Example
```typescript
import { Test } from '@nestjs/testing';
import { PermissionCalculationService } from './permission-calculation.service';

describe('PermissionCalculationService', () => {
  let service: PermissionCalculationService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PermissionCalculationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService, // Your mock
        },
      ],
    }).compile();

    service = module.get<PermissionCalculationService>(PermissionCalculationService);
  });

  it('should allow access with direct user permission', async () => {
    // Mock data setup
    mockPrismaService.userPermission.findMany.mockResolvedValue([
      { permissionId: 'perm-1', isGranted: true, scope: 'OWN' }
    ]);

    const result = await service.checkPermission({
      userProfileId: 'user-1',
      resource: 'project',
      action: 'read',
    });

    expect(result.isAllowed).toBe(true);
  });
});
```

### Integration Test Example
```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('PermissionsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('POST /users/:userId/permissions/check', () => {
    return request(app.getHttpServer())
      .post('/users/user-123/permissions/check')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ resource: 'project', action: 'read' })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('isAllowed');
        expect(res.body).toHaveProperty('reason');
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

---

## 🐛 Troubleshooting

### Permission Check Always Returns False

**Check**:
1. User has active account (isActive = true)
2. Permission is active (isActive = true)
3. Role assignments are active (isActive = true)
4. Check permission calculation logs: `GET /check-logs/user/:userId`

### Slow Permission Checks

**Solutions**:
1. Check cache hit rate: `GET /admin/permissions/statistics/detailed`
2. Optimize cache: `POST /admin/permissions/optimize`
3. Review slow checks: `GET /check-logs/slow?thresholdMs=500`
4. Check database indexes

### Delegation Not Working

**Check**:
1. Delegation is active (isActive = true)
2. Current date is between validFrom and validUntil
3. Source user still has the permission
4. Delegation was activated: `POST /delegations/:id/activate`

### Rollback Fails

**Check**:
1. Change is marked as rollbackable (isRollbackable = true)
2. Change is not already a rollback operation
3. Entity still exists in database
4. User has PERMISSION_HISTORY_ROLLBACK permission

---

## 📚 Additional Resources

- **Complete Documentation**: See `PERMISSION_SYSTEM_COMPLETE.md`
- **Phase 1 Details**: See `phase1-complete-summary.md`
- **Phase 2 Details**: See `phase2-complete-summary.md`
- **Phase 3 Details**: See `phase3-complete-summary.md`
- **Phase 5 Details**: See `phase5-complete-summary.md`
- **Phase 6 Details**: See `phase6-complete-summary.md`
- **API Documentation**: Available at `http://localhost:3000/api` (Swagger)

---

## 🆘 Emergency Contacts

### Performance Issues
```bash
# Check system health
curl -X POST http://localhost:3000/admin/permissions/health-check

# Optimize cache immediately
curl -X POST http://localhost:3000/admin/permissions/optimize \
  -d '{"clearAll": true, "rebuildAll": true}'
```

### Incorrect Permission Assignment
```bash
# Find recent changes
curl http://localhost:3000/history?limit=50

# Rollback specific change
curl -X POST http://localhost:3000/history/CHANGE_ID/rollback \
  -d '{"reason": "Emergency correction", "confirmedBy": "ADMIN_ID"}'
```

### Audit Required
```bash
# Export all recent changes
curl -X POST http://localhost:3000/history/export \
  -d '{"startDate": "2025-01-01", "format": "csv"}'

# Export denied access attempts
curl -X POST http://localhost:3000/check-logs/export \
  -d '{"onlyDenied": true, "format": "csv"}'
```

---

**Last Updated**: 2025-10-28
**Version**: 1.0
