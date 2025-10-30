# Schema Simplification - Implementation Guide

> **Panduan Teknis Detail untuk Tim Developer**
> Referensi: `schema-over-engineering-analysis.md`

---

## 📑 Table of Contents

1. [Quick Start](#quick-start)
2. [Phase 1: Quick Wins (Weeks 1-2)](#phase-1-quick-wins)
3. [Phase 2: Permission System (Weeks 3-7)](#phase-2-permission-system)
4. [Phase 3: Workflow System (Weeks 8-15)](#phase-3-workflow-system)
5. [Phase 4: Data Normalization (Weeks 16-20)](#phase-4-data-normalization)
6. [Scripts & Commands](#scripts--commands)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

```bash
# Node.js version
node --version  # v18+ required

# Database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Install dependencies
npm install

# Run tests
npm run test
```

### Environment Setup

```bash
# .env.example additions

# Redis (for Phase 2)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password

# Temporal (for Phase 3 - Option A)
TEMPORAL_ADDRESS=localhost:7233

# Feature Flags
ENABLE_NEW_PERMISSION_SYSTEM=false
ENABLE_TEMPORAL_WORKFLOWS=false
```

---

## Phase 1: Quick Wins

### Day 1-2: Index Cleanup

#### Step 1: Analyze Current Indexes

```bash
# Generate index report
npm run db:analyze-indexes
```

Create script: `scripts/analyze-indexes.sql`

```sql
-- scripts/analyze-indexes.sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'gloria_ops'
ORDER BY idx_scan ASC;
```

#### Step 2: Remove Duplicate Indexes

Edit `prisma/schema.prisma`:

```prisma
model UserProfile {
  // REMOVE THIS LINE (duplicate)
  // @@index([clerkUserId], map: "idx_user_profiles_clerk_user_id")

  // KEEP THIS LINE
  @@index([clerkUserId])
}

model Department {
  // REMOVE THIS LINE (duplicate)
  // @@index([schoolId], map: "idx_departments_school_id")

  // KEEP THIS LINE
  @@index([schoolId])
}

model Position {
  // BEFORE: 8 indexes
  // AFTER: Consolidate to 3 composite indexes
  @@index([schoolId, departmentId, hierarchyLevel])
  @@index([departmentId, isActive])
  @@index([schoolId, isActive])
}

model UserPosition {
  // BEFORE: 6 indexes with duplicates
  // AFTER: 3 strategic indexes
  @@index([userProfileId, isActive, startDate])
  @@index([positionId, isActive])
  @@index([startDate, endDate])
}
```

#### Step 3: Create Migration

```bash
npx prisma migrate dev --name remove-duplicate-indexes
```

#### Step 4: Test & Deploy

```bash
# Test in development
npm run test

# Deploy to staging
DATABASE_URL=$STAGING_DB npx prisma migrate deploy

# Monitor performance (should improve)
npm run db:analyze-performance

# Deploy to production
DATABASE_URL=$PROD_DB npx prisma migrate deploy
```

---

### Day 3-5: Consolidate Delegation Tables

#### Step 1: Create New Delegation Model

Add to `prisma/schema.prisma`:

```prisma
model Delegation {
  id              String          @id @default(cuid())
  type            DelegationType
  delegatorId     String          @map("delegator_id")
  delegateId      String          @map("delegate_id")

  // Context based on type
  context         Json?

  // Common fields
  reason          String?
  validFrom       DateTime        @default(now()) @map("valid_from")
  validUntil      DateTime?       @map("valid_until")
  isActive        Boolean         @default(true) @map("is_active")

  // Revocation
  isRevoked       Boolean         @default(false) @map("is_revoked")
  revokedBy       String?         @map("revoked_by")
  revokedAt       DateTime?       @map("revoked_at")
  revokedReason   String?         @map("revoked_reason")

  // Audit
  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")
  createdBy       String?         @map("created_by")

  // Relations
  delegator       UserProfile     @relation("DelegatorRelation", fields: [delegatorId], references: [id])
  delegate        UserProfile     @relation("DelegateRelation", fields: [delegateId], references: [id])

  @@index([delegatorId, isActive, type])
  @@index([delegateId, isActive, type])
  @@index([validFrom, validUntil])
  @@map("delegations")
  @@schema("gloria_ops")
}

enum DelegationType {
  APPROVAL
  PERMISSION
  WORKFLOW

  @@schema("gloria_ops")
}
```

#### Step 2: Create Migration (Don't Drop Old Tables Yet)

```bash
npx prisma migrate dev --name add-unified-delegation
```

#### Step 3: Data Migration Script

Create `scripts/migrations/consolidate-delegations.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function consolidateDelegations() {
  console.log('🔄 Starting delegation consolidation...');

  try {
    // 1. Migrate ApprovalDelegation
    const approvalDelegations = await prisma.approvalDelegation.findMany();
    console.log(`📋 Found ${approvalDelegations.length} approval delegations`);

    for (const ad of approvalDelegations) {
      await prisma.delegation.create({
        data: {
          type: 'APPROVAL',
          delegatorId: ad.delegatorProfileId,
          delegateId: ad.delegateProfileId,
          context: { module: ad.module },
          reason: ad.reason,
          validFrom: ad.startDate,
          validUntil: ad.endDate,
          isActive: ad.isActive,
          createdAt: ad.createdAt,
          updatedAt: ad.updatedAt,
          createdBy: ad.createdBy,
        },
      });
    }
    console.log('✅ Approval delegations migrated');

    // 2. Migrate PermissionDelegation
    const permissionDelegations = await prisma.permissionDelegation.findMany();
    console.log(`📋 Found ${permissionDelegations.length} permission delegations`);

    for (const pd of permissionDelegations) {
      await prisma.delegation.create({
        data: {
          type: 'PERMISSION',
          delegatorId: pd.delegatorId,
          delegateId: pd.delegateId,
          context: { permissions: pd.permissions },
          reason: pd.reason,
          validFrom: pd.validFrom,
          validUntil: pd.validUntil,
          isActive: !pd.isRevoked,
          isRevoked: pd.isRevoked,
          revokedBy: pd.revokedBy,
          revokedAt: pd.revokedAt,
          revokedReason: pd.revokedReason,
          createdAt: pd.createdAt,
          updatedAt: pd.updatedAt,
        },
      });
    }
    console.log('✅ Permission delegations migrated');

    // 3. Migrate WorkflowDelegation
    const workflowDelegations = await prisma.workflowDelegation.findMany();
    console.log(`📋 Found ${workflowDelegations.length} workflow delegations`);

    for (const wd of workflowDelegations) {
      await prisma.delegation.create({
        data: {
          type: 'WORKFLOW',
          delegatorId: wd.delegatedFromId,
          delegateId: wd.delegatedToId,
          context: {
            instanceId: wd.instanceId,
            stepInstanceId: wd.stepInstanceId,
            expiresAt: wd.expiresAt,
          },
          reason: wd.reason,
          validFrom: wd.createdAt,
          isActive: wd.isActive,
          revokedBy: wd.revokedBy,
          revokedAt: wd.revokedAt,
          createdAt: wd.createdAt,
          updatedAt: wd.updatedAt,
        },
      });
    }
    console.log('✅ Workflow delegations migrated');

    // 4. Verification
    const totalNew = await prisma.delegation.count();
    const expectedTotal =
      approvalDelegations.length +
      permissionDelegations.length +
      workflowDelegations.length;

    console.log(`\n📊 Verification:`);
    console.log(`   Expected: ${expectedTotal}`);
    console.log(`   Migrated: ${totalNew}`);

    if (totalNew !== expectedTotal) {
      throw new Error('❌ Migration count mismatch!');
    }

    console.log('✅ All delegations migrated successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

consolidateDelegations();
```

#### Step 4: Run Migration

```bash
# Backup first!
pg_dump $DATABASE_URL > backup_before_delegation_migration.sql

# Run migration
npx ts-node scripts/migrations/consolidate-delegations.ts

# Verify
npx ts-node scripts/verification/verify-delegations.ts
```

#### Step 5: Update Application Code

Update `src/modules/delegations/delegation.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DelegationService {
  constructor(private prisma: PrismaService) {}

  async createDelegation(dto: CreateDelegationDto) {
    return this.prisma.delegation.create({
      data: {
        type: dto.type, // 'APPROVAL' | 'PERMISSION' | 'WORKFLOW'
        delegatorId: dto.delegatorId,
        delegateId: dto.delegateId,
        context: dto.context,
        reason: dto.reason,
        validFrom: dto.validFrom || new Date(),
        validUntil: dto.validUntil,
      },
    });
  }

  async getActiveDelegations(userId: string, type?: DelegationType) {
    return this.prisma.delegation.findMany({
      where: {
        delegateId: userId,
        type: type || undefined,
        isActive: true,
        isRevoked: false,
        validFrom: { lte: new Date() },
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } },
        ],
      },
      include: {
        delegator: {
          select: {
            id: true,
            nip: true,
            dataKaryawan: {
              select: { nama: true },
            },
          },
        },
      },
    });
  }

  async revokeDelegation(delegationId: string, revokedBy: string, reason: string) {
    return this.prisma.delegation.update({
      where: { id: delegationId },
      data: {
        isRevoked: true,
        revokedBy,
        revokedAt: new Date(),
        revokedReason: reason,
        isActive: false,
      },
    });
  }
}
```

#### Step 6: Drop Old Tables (After 1 Week of Monitoring)

```bash
# Create migration to drop old tables
npx prisma migrate dev --name drop-old-delegation-tables
```

Edit migration file to add:

```sql
DROP TABLE IF EXISTS gloria_ops.approval_delegations CASCADE;
DROP TABLE IF EXISTS gloria_ops.permission_delegations CASCADE;
DROP TABLE IF EXISTS gloria_ops.workflow_delegations CASCADE;
```

---

## Phase 2: Permission System

### Week 3: Setup Redis

#### Step 1: Install Dependencies

```bash
npm install @nestjs/cache-manager cache-manager-redis-yet redis
```

#### Step 2: Configure Redis

Create `src/common/config/cache.config.ts`:

```typescript
import { CacheModuleOptions } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

export const cacheConfig: CacheModuleOptions = {
  isGlobal: true,
  store: redisStore as any,
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  password: process.env.REDIS_PASSWORD,
  ttl: 300000, // 5 minutes
};

export const CACHE_KEYS = {
  userPermissions: (userId: string) => `perm:user:${userId}`,
  rolePermissions: (roleId: string) => `perm:role:${roleId}`,
  effectivePermissions: (userId: string, resource: string) =>
    `perm:effective:${userId}:${resource}`,
};
```

#### Step 3: Update App Module

```typescript
// src/app.module.ts
import { CacheModule } from '@nestjs/cache-manager';
import { cacheConfig } from './common/config/cache.config';

@Module({
  imports: [
    CacheModule.register(cacheConfig),
    // ... other modules
  ],
})
export class AppModule {}
```

#### Step 4: Update Permission Service

```typescript
// src/modules/permissions/permissions.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class PermissionsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async checkPermission(
    userId: string,
    resource: string,
    action: string,
    context?: { resourceType?: string; resourceId?: string },
  ): Promise<boolean> {
    // 1. Check cache
    const cacheKey = CACHE_KEYS.effectivePermissions(userId, resource);
    const cached = await this.cacheManager.get<any>(cacheKey);

    if (cached) {
      return cached[action] || false;
    }

    // 2. Compute permissions
    const permissions = await this.computePermissions(userId, resource, context);

    // 3. Cache for 5 minutes
    await this.cacheManager.set(cacheKey, permissions, 300000);

    return permissions[action] || false;
  }

  async invalidateUserPermissions(userId: string) {
    // Clear all permission caches for this user
    await this.cacheManager.del(`perm:user:${userId}`);
    // Use pattern matching to clear all related keys
    // Implementation depends on Redis client
  }

  private async computePermissions(
    userId: string,
    resource: string,
    context?: any,
  ) {
    // 1. Get user's direct permissions
    const directPermissions = await this.prisma.userPermission.findMany({
      where: {
        userProfileId: userId,
        permission: { resource },
        isGranted: true,
        validFrom: { lte: new Date() },
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } },
        ],
      },
      include: { permission: true },
    });

    // 2. Get role-based permissions
    const rolePermissions = await this.getUserRolePermissions(userId, resource);

    // 3. Merge and compute effective permissions
    const effectivePermissions = this.mergePermissions(
      directPermissions,
      rolePermissions,
      context,
    );

    return effectivePermissions;
  }

  private mergePermissions(direct: any[], role: any[], context?: any) {
    const permissions: Record<string, boolean> = {};

    // Merge logic here
    // Priority: User permissions > Role permissions
    // Check resource-specific permissions if context provided

    return permissions;
  }
}
```

### Week 4-5: Consolidate Permission Tables

#### Step 1: Update Schema

```prisma
// Simplified Permission model
model Permission {
  id                  String               @id
  code                String               @unique
  name                String
  description         String?
  resource            String
  action              PermissionAction
  scope               PermissionScope?

  // Denormalized from PermissionGroup
  category            ModuleCategory?
  groupName           String?              @map("group_name")
  groupIcon           String?              @map("group_icon")
  sortOrder           Int                  @default(0) @map("sort_order")

  conditions          Json?
  metadata            Json?
  isSystemPermission  Boolean              @default(false) @map("is_system_permission")
  isActive            Boolean              @default(true) @map("is_active")
  createdAt           DateTime             @default(now()) @map("created_at")
  updatedAt           DateTime             @updatedAt @map("updated_at")
  createdBy           String?              @map("created_by")

  rolePermissions     RolePermission[]
  userPermissions     UserPermission[]

  @@unique([resource, action, scope])
  @@index([resource, action])
  @@index([category, isActive])
  @@map("permissions")
  @@schema("gloria_ops")
}

// Merged UserPermission
model UserPermission {
  id            String      @id
  userProfileId String      @map("user_profile_id")
  permissionId  String      @map("permission_id")

  // Merged from ResourcePermission
  resourceType  String?     @map("resource_type")
  resourceId    String?     @map("resource_id")

  isGranted     Boolean     @default(true) @map("is_granted")
  conditions    Json?
  validFrom     DateTime    @default(now()) @map("valid_from")
  validUntil    DateTime?   @map("valid_until")
  grantedBy     String      @map("granted_by")
  grantReason   String      @map("grant_reason")
  priority      Int         @default(100) @map("priority")
  isTemporary   Boolean     @default(false) @map("is_temporary")
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  permission    Permission  @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  userProfile   UserProfile @relation(fields: [userProfileId], references: [id], onDelete: Cascade)

  @@unique([userProfileId, permissionId, resourceType, resourceId])
  @@index([userProfileId, isGranted])
  @@index([userProfileId, resourceType, resourceId])
  @@map("user_permissions")
  @@schema("gloria_ops")
}
```

#### Step 2: Create Migration Scripts

```bash
# Create migration for new schema
npx prisma migrate dev --name consolidate-permission-system
```

#### Step 3: Data Migration

Create `scripts/migrations/consolidate-permissions.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function consolidatePermissions() {
  console.log('🔄 Starting permission consolidation...');

  try {
    // 1. Merge PermissionGroup into Permission
    const groups = await prisma.permissionGroup.findMany({
      include: { permissions: true },
    });

    for (const group of groups) {
      await prisma.permission.updateMany({
        where: { groupId: group.id },
        data: {
          category: group.category,
          groupName: group.name,
          groupIcon: group.icon,
          sortOrder: group.sortOrder,
        },
      });
    }
    console.log('✅ Permission groups merged');

    // 2. Merge ResourcePermission into UserPermission
    const resourcePerms = await prisma.resourcePermission.findMany();

    for (const rp of resourcePerms) {
      const existing = await prisma.userPermission.findFirst({
        where: {
          userProfileId: rp.userProfileId,
          permissionId: rp.permissionId,
          resourceType: null,
        },
      });

      if (existing) {
        await prisma.userPermission.update({
          where: { id: existing.id },
          data: {
            resourceType: rp.resourceType,
            resourceId: rp.resourceId,
          },
        });
      } else {
        await prisma.userPermission.create({
          data: {
            userProfileId: rp.userProfileId,
            permissionId: rp.permissionId,
            resourceType: rp.resourceType,
            resourceId: rp.resourceId,
            isGranted: rp.isGranted,
            validFrom: rp.validFrom,
            validUntil: rp.validUntil,
            grantedBy: rp.grantedBy,
            grantReason: rp.grantReason || 'Migrated from ResourcePermission',
          },
        });
      }
    }
    console.log('✅ Resource permissions merged');

    console.log('✅ Permission consolidation complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

consolidatePermissions();
```

### Week 6-7: Testing & Gradual Rollout

#### Feature Flag Setup

```typescript
// src/common/config/feature-flags.ts
export enum FeatureFlag {
  USE_NEW_PERMISSION_SYSTEM = 'use_new_permission_system',
}

// src/modules/permissions/permissions.service.ts
async checkPermission(userId: string, resource: string, action: string) {
  const useNewSystem = await this.featureFlagService.isEnabled(
    FeatureFlag.USE_NEW_PERMISSION_SYSTEM,
    userId,
  );

  if (useNewSystem) {
    return this.checkPermissionNew(userId, resource, action);
  } else {
    return this.checkPermissionOld(userId, resource, action);
  }
}
```

#### Gradual Rollout Schedule

```bash
# Day 1: Internal testing (0%)
npm run feature-flag:set USE_NEW_PERMISSION_SYSTEM 0

# Day 2: Canary (10%)
npm run feature-flag:set USE_NEW_PERMISSION_SYSTEM 10

# Day 3: 25%
npm run feature-flag:set USE_NEW_PERMISSION_SYSTEM 25

# Day 4: 50%
npm run feature-flag:set USE_NEW_PERMISSION_SYSTEM 50

# Day 5: Full rollout (100%)
npm run feature-flag:set USE_NEW_PERMISSION_SYSTEM 100
```

---

## Phase 3: Workflow System (Temporal.io)

### Week 8-9: Temporal Setup

#### Step 1: Install Temporal

```bash
# Install Temporal CLI
brew install temporal

# Or using Docker
docker-compose up -d
```

`docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgresql:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: temporal
      POSTGRES_USER: temporal
    ports:
      - 5432:5432

  temporal:
    image: temporalio/auto-setup:latest
    depends_on:
      - postgresql
    environment:
      - DB=postgresql
      - DB_PORT=5432
      - POSTGRES_USER=temporal
      - POSTGRES_PWD=temporal
      - POSTGRES_SEEDS=postgresql
    ports:
      - 7233:7233 # gRPC
      - 8233:8233 # Temporal UI

  temporal-ui:
    image: temporalio/ui:latest
    depends_on:
      - temporal
    environment:
      - TEMPORAL_ADDRESS=temporal:7233
    ports:
      - 8080:8080
```

#### Step 2: Install Client Libraries

```bash
npm install @temporalio/client @temporalio/worker @temporalio/workflow @temporalio/activity
```

#### Step 3: Create Workflow

Create `src/workflows/approval-workflow.ts`:

```typescript
import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from './approval-activities';

const { sendNotification, checkApprovalStatus, escalateApproval } =
  proxyActivities<typeof activities>({
    startToCloseTimeout: '1 minute',
  });

export interface ApprovalRequest {
  id: string;
  approverId: string;
  title: string;
  escalationTarget?: string;
}

export interface ApprovalResult {
  status: 'APPROVED' | 'REJECTED' | 'TIMEOUT';
  reason?: string;
}

export async function approvalWorkflow(
  request: ApprovalRequest,
): Promise<ApprovalResult> {
  // Step 1: Send notification
  await sendNotification({
    userId: request.approverId,
    type: 'APPROVAL_REQUEST',
    message: `Please review: ${request.title}`,
  });

  // Step 2: Wait for approval (with timeout)
  let approved = false;
  let attempts = 0;
  const maxAttempts = 3;

  while (!approved && attempts < maxAttempts) {
    // Check every hour
    await sleep('1 hour');

    const status = await checkApprovalStatus(request.id);

    if (status === 'APPROVED') {
      approved = true;
    } else if (status === 'REJECTED') {
      return { status: 'REJECTED', reason: 'Rejected by approver' };
    }

    attempts++;

    // Escalate after 24 hours
    if (attempts === maxAttempts && !approved && request.escalationTarget) {
      await escalateApproval({
        requestId: request.id,
        from: request.approverId,
        to: request.escalationTarget,
        reason: 'Timeout',
      });
    }
  }

  return { status: approved ? 'APPROVED' : 'TIMEOUT' };
}
```

#### Step 4: Create Activities

Create `src/workflows/approval-activities.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function sendNotification(params: {
  userId: string;
  type: string;
  message: string;
}) {
  await prisma.notification.create({
    data: {
      userProfileId: params.userId,
      type: params.type as any,
      title: 'Approval Request',
      message: params.message,
      priority: 'HIGH',
    },
  });
}

export async function checkApprovalStatus(requestId: string): Promise<string> {
  const instance = await prisma.workflowInstance.findUnique({
    where: { requestId },
  });

  return instance?.status || 'PENDING';
}

export async function escalateApproval(params: {
  requestId: string;
  from: string;
  to: string;
  reason: string;
}) {
  await prisma.workflowEscalation.create({
    data: {
      instanceId: params.requestId,
      stepInstanceId: params.requestId, // Simplified
      escalatedFromId: params.from,
      escalatedToId: params.to,
      reason: params.reason,
      escalatedBy: 'SYSTEM',
    },
  });
}
```

#### Step 5: Create Worker

Create `src/workflows/worker.ts`:

```typescript
import { Worker } from '@temporalio/worker';
import * as activities from './approval-activities';

async function run() {
  const worker = await Worker.create({
    workflowsPath: require.resolve('./approval-workflow'),
    activities,
    taskQueue: 'approval-queue',
  });

  console.log('🚀 Temporal worker started');
  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Add to `package.json`:

```json
{
  "scripts": {
    "temporal:worker": "ts-node src/workflows/worker.ts"
  }
}
```

---

## Phase 4: Data Normalization

### Standardize Temporal Patterns

#### Step 1: Rename Columns

Create migration script:

```sql
-- Standardize temporal columns
ALTER TABLE gloria_ops.user_permissions
  RENAME COLUMN valid_from TO effective_from;

ALTER TABLE gloria_ops.user_permissions
  RENAME COLUMN valid_until TO effective_until;

ALTER TABLE gloria_ops.role_permissions
  RENAME COLUMN valid_from TO effective_from;

ALTER TABLE gloria_ops.role_permissions
  RENAME COLUMN valid_until TO effective_until;
```

#### Step 2: Create Helper Function

```typescript
// src/common/utils/temporal.utils.ts
export function buildTemporalWhereClause(asOf: Date = new Date()) {
  return {
    isActive: true,
    deletedAt: null,
    effectiveFrom: { lte: asOf },
    OR: [
      { effectiveUntil: null },
      { effectiveUntil: { gte: asOf } },
    ],
  };
}

// Usage
const activePermissions = await prisma.userPermission.findMany({
  where: {
    userProfileId: userId,
    ...buildTemporalWhereClause(),
  },
});
```

### Consolidate Audit Logs

```prisma
model AuditLog {
  id             String       @id
  actorId        String       @map("actor_id")
  action         AuditAction
  category       AuditCategory // NEW

  entityType     String       @map("entity_type")
  entityId       String       @map("entity_id")
  oldValues      Json?        @map("old_values")
  newValues      Json?        @map("new_values")
  changedFields  String[]     @map("changed_fields") // NEW

  metadata       Json?
  ipAddress      String?      @map("ip_address")
  createdAt      DateTime     @default(now()) @map("created_at")

  @@index([category, entityType, createdAt(sort: Desc)])
  @@map("audit_logs")
  @@schema("gloria_ops")
}

enum AuditCategory {
  PERMISSION
  MODULE
  WORKFLOW
  SYSTEM_CONFIG
  USER_MANAGEMENT
  DATA_CHANGE

  @@schema("gloria_ops")
}
```

---

## Scripts & Commands

### Useful Scripts

```bash
# Database operations
npm run db:backup          # Create backup
npm run db:restore         # Restore backup
npm run db:analyze         # Analyze performance
npm run db:verify          # Verify data integrity

# Migration operations
npm run migrate:delegations    # Consolidate delegations
npm run migrate:permissions    # Consolidate permissions
npm run migrate:workflows      # Migrate to Temporal

# Testing
npm run test:unit              # Unit tests
npm run test:integration       # Integration tests
npm run test:e2e              # E2E tests
npm run test:performance       # Performance benchmarks

# Monitoring
npm run monitor:permissions    # Monitor permission system
npm run monitor:cache          # Monitor Redis cache
npm run monitor:temporal       # Monitor Temporal workflows
```

---

## Troubleshooting

### Common Issues

#### Issue: Migration fails with foreign key constraint

```bash
# Solution: Disable constraints temporarily
SET session_replication_role = replica;
-- run migration
SET session_replication_role = DEFAULT;
```

#### Issue: Redis connection timeout

```bash
# Check Redis status
redis-cli ping

# Clear Redis cache
redis-cli FLUSHALL

# Restart Redis
brew services restart redis
```

#### Issue: Temporal worker not starting

```bash
# Check Temporal server
temporal server start-dev

# View Temporal UI
open http://localhost:8080

# Check worker logs
npm run temporal:worker
```

---

## Next Steps

1. Review Phase 1 checklist
2. Setup development environment
3. Create database backup
4. Begin implementation

**Questions?** Refer to `schema-over-engineering-analysis.md` for detailed analysis.
