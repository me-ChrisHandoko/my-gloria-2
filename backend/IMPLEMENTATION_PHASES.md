# Permission Module - Implementation Phases

## Overview
Implementasi backend untuk sistem permissions yang kompleks dengan 10 model saling terkait. Total estimasi: **10-14 hari kerja**.

---

## 📊 Architecture Overview

```
Layer 1: Core Entities
├── permissions (resources, actions, scopes)
├── roles (role definitions)
└── modules (system modules)

Layer 2: Basic Relationships
├── role_permissions (assign permissions to roles)
├── user_roles (assign roles to users)
└── module_permissions (module-level permissions)

Layer 3: Granular Control
├── user_permissions (direct user permissions)
├── role_module_access (role access to modules)
└── user_module_access (user access to modules)

Layer 4: Advanced Features
└── role_hierarchy (role inheritance)
```

---

## Phase 0: Foundation ✅ (COMPLETED)

**Status**: DONE

**Deliverables**:
- ✅ All DTOs created (7 files)
- ✅ Permissions Service completed
- ❌ Database seeding script

**Remaining**:
```bash
# Create seeding script
src/modules/permissions/seeds/
├── initial-permissions.seed.ts
├── initial-roles.seed.ts
└── initial-modules.seed.ts
```

---

## Phase 1: Core CRUD Operations

**Duration**: 2-3 hari
**Dependencies**: Phase 0
**Priority**: HIGH

### Deliverables

#### 1.1 Roles Management
- [ ] `services/roles.service.ts`
  - CRUD operations
  - Hierarchy level validation
  - System role protection
  - Caching strategy
- [ ] `controllers/roles.controller.ts`
  - GET /roles (list with pagination)
  - GET /roles/:id
  - POST /roles
  - PATCH /roles/:id
  - DELETE /roles/:id (soft delete)
  - POST /roles/:id/restore

#### 1.2 Modules Management
- [ ] `services/modules.service.ts`
  - CRUD operations
  - Parent-child relationship handling
  - Soft delete with version control
  - Tree structure retrieval
- [ ] `controllers/modules.controller.ts`
  - GET /modules (list with pagination)
  - GET /modules/:id
  - GET /modules/tree (hierarchical structure)
  - POST /modules
  - PATCH /modules/:id
  - DELETE /modules/:id (soft delete with version)
  - POST /modules/:id/restore

#### 1.3 Permissions Controller
- [ ] `controllers/permissions.controller.ts`
  - GET /permissions (list with pagination)
  - GET /permissions/:id
  - GET /permissions/by-code/:code
  - POST /permissions
  - PATCH /permissions/:id
  - DELETE /permissions/:id
  - POST /permissions/:id/restore
  - GET /permissions/grouped (group by resource/category)

#### 1.4 Module Configuration
- [ ] `permission.module.ts`
  - Import PrismaModule, CacheModule
  - Register all services
  - Register all controllers
  - Export services for other modules

### Testing Requirements
```typescript
// Unit Tests
- permissions.service.spec.ts
- roles.service.spec.ts
- modules.service.spec.ts

// Integration Tests
- permissions.controller.spec.ts
- roles.controller.spec.ts
- modules.controller.spec.ts

// E2E Tests
- permissions-crud.e2e-spec.ts
```

### Acceptance Criteria
- ✅ Semua CRUD endpoints berfungsi
- ✅ Validation berjalan dengan benar
- ✅ Soft delete working
- ✅ Caching implemented
- ✅ Error handling comprehensive
- ✅ Swagger documentation complete
- ✅ Unit tests pass (>80% coverage)

### API Examples
```bash
# Create permission
POST /api/v1/permissions
{
  "code": "users:create",
  "name": "Create Users",
  "resource": "users",
  "action": "CREATE",
  "scope": "DEPARTMENT"
}

# Create role
POST /api/v1/roles
{
  "code": "TEACHER",
  "name": "Teacher",
  "hierarchyLevel": 5
}

# Create module
POST /api/v1/modules
{
  "code": "user-management",
  "name": "User Management",
  "category": "SYSTEM"
}
```

---

## Phase 2: Basic Authorization ⚡ CRITICAL

**Duration**: 2-3 hari
**Dependencies**: Phase 1
**Priority**: CRITICAL

### Deliverables

#### 2.1 Role-Permission Assignment
- [ ] `services/role-permissions.service.ts`
  - Assign permission to role
  - Bulk assign permissions
  - Revoke permission from role
  - List role's permissions
  - Effective date handling
- [ ] Add endpoints to `controllers/roles.controller.ts`
  - POST /roles/:id/permissions
  - POST /roles/:id/permissions/bulk
  - DELETE /roles/:id/permissions/:permissionId
  - GET /roles/:id/permissions

#### 2.2 User-Role Assignment
- [ ] `services/user-roles.service.ts`
  - Assign role to user
  - Bulk assign roles
  - Revoke role from user
  - List user's roles
  - Effective date handling
- [ ] Create `controllers/user-roles.controller.ts`
  - POST /users/:userId/roles
  - POST /users/:userId/roles/bulk
  - DELETE /users/:userId/roles/:roleId
  - GET /users/:userId/roles

#### 2.3 Permission Checker Service ⚡ CORE
- [ ] `services/permission-checker.service.ts`
  ```typescript
  // Core methods
  - checkPermission(userId, resource, action, scope?, resourceId?)
  - checkMultiplePermissions(userId, permissions[])
  - getUserPermissions(userId)
  - getUserEffectiveScope(userId, resource, action)

  // Permission resolution logic
  1. Direct user permissions (highest priority)
  2. Role permissions (via user roles)
  3. Position permissions (via user positions)
  4. Default deny

  // Caching strategy
  - Cache user permissions for 5 minutes
  - Invalidate on permission/role changes
  - LRU cache for hot paths
  ```

- [ ] Add to `controllers/permissions.controller.ts`
  - POST /permissions/check
  - POST /permissions/check/bulk
  - GET /permissions/user/:userId

#### 2.4 Integration with Existing Auth
- [ ] Update `RequiredPermission` decorator
- [ ] Create `PermissionGuard`
- [ ] Update existing guards to use PermissionChecker

### Testing Requirements
```typescript
// Unit Tests
- role-permissions.service.spec.ts
- user-roles.service.spec.ts
- permission-checker.service.spec.ts (EXTENSIVE)

// Integration Tests
- permission-checker-integration.spec.ts
- guard-integration.spec.ts

// E2E Tests
- authorization-flows.e2e-spec.ts

// Performance Tests
- permission-checker.perf.spec.ts (target: <10ms per check)
```

### Acceptance Criteria
- ✅ User dengan role bisa di-authorize
- ✅ Permission check < 10ms (with cache)
- ✅ Multiple permission sources resolved correctly
- ✅ Scope hierarchy working (OWN < DEPARTMENT < SCHOOL < ALL)
- ✅ Effective date handling working
- ✅ Cache invalidation working
- ✅ Guards integrated dengan controller
- ✅ Load test: 1000 permission checks/sec

### API Examples
```bash
# Assign permission to role
POST /api/v1/roles/{roleId}/permissions
{
  "permissionId": "uuid",
  "isGranted": true,
  "effectiveFrom": "2024-01-01"
}

# Assign role to user
POST /api/v1/users/{userId}/roles
{
  "roleId": "uuid",
  "isActive": true
}

# Check permission
POST /api/v1/permissions/check
{
  "userProfileId": "uuid",
  "resource": "users",
  "action": "CREATE",
  "scope": "DEPARTMENT"
}
```

---

## Phase 3: Direct User Permissions

**Duration**: 1-2 hari
**Dependencies**: Phase 2
**Priority**: MEDIUM

### Deliverables

#### 3.1 User Permissions Service
- [ ] `services/user-permissions.service.ts`
  - Grant permission to user
  - Bulk grant permissions
  - Revoke permission from user
  - List user's direct permissions
  - Resource-specific permissions
  - Temporary permissions
  - Priority handling

- [ ] Create `controllers/user-permissions.controller.ts`
  - POST /users/:userId/permissions
  - POST /users/:userId/permissions/bulk
  - DELETE /users/:userId/permissions/:permissionId
  - GET /users/:userId/permissions
  - GET /users/:userId/permissions/effective (combined view)

#### 3.2 Update Permission Checker
- [ ] Add direct permission resolution
- [ ] Priority-based override logic
- [ ] Resource-specific permission handling

### Testing Requirements
```typescript
// Unit Tests
- user-permissions.service.spec.ts

// Integration Tests
- user-permission-override.spec.ts
- resource-specific-permissions.spec.ts
```

### Acceptance Criteria
- ✅ Direct permissions override role permissions berdasarkan priority
- ✅ Resource-specific permissions working
- ✅ Temporary permissions auto-expire
- ✅ Effective date ranges validated

### API Examples
```bash
# Grant direct permission
POST /api/v1/users/{userId}/permissions
{
  "permissionId": "uuid",
  "isGranted": true,
  "grantReason": "Special project access",
  "priority": 200,
  "resourceType": "school",
  "resourceId": "school-uuid",
  "effectiveUntil": "2024-12-31"
}
```

---

## Phase 4: Module Access Control

**Duration**: 2-3 hari
**Dependencies**: Phase 1, Phase 2
**Priority**: MEDIUM

### Deliverables

#### 4.1 Module Permissions
- [ ] `services/module-permissions.service.ts`
  - Define permissions for modules
  - CRUD for module permissions
  - Permission templates

#### 4.2 Role Module Access
- [ ] `services/role-module-access.service.ts`
  - Grant module access to role
  - Define module-specific permissions for role
  - Position-based module access

- [ ] Add to `controllers/roles.controller.ts`
  - POST /roles/:id/modules
  - GET /roles/:id/modules
  - DELETE /roles/:id/modules/:moduleId

#### 4.3 User Module Access
- [ ] `services/user-module-access.service.ts`
  - Grant module access to user
  - Override role module access
  - Temporary module access

- [ ] Add to `controllers/user-roles.controller.ts`
  - POST /users/:userId/modules
  - GET /users/:userId/modules
  - DELETE /users/:userId/modules/:moduleId

#### 4.4 Module Navigation API
- [ ] GET /modules/accessible (modules accessible by current user)
- [ ] GET /modules/:id/permissions (available permissions for module)

### Testing Requirements
```typescript
// Integration Tests
- module-access-control.spec.ts
- module-navigation.spec.ts
```

### Acceptance Criteria
- ✅ Module visibility based on access control
- ✅ Module permissions correctly enforced
- ✅ Navigation menu filtered by access
- ✅ Version control for module access

---

## Phase 5: Advanced Features

**Duration**: 2-3 hari
**Dependencies**: All previous phases
**Priority**: LOW

### Deliverables

#### 5.1 Role Hierarchy
- [ ] `services/role-hierarchy.service.ts`
  - Create parent-child relationships
  - Permission inheritance logic
  - Prevent circular dependencies
  - Traverse hierarchy

- [ ] Add to `controllers/roles.controller.ts`
  - POST /roles/:id/hierarchy
  - GET /roles/:id/hierarchy/tree
  - GET /roles/:id/hierarchy/inherited-permissions

#### 5.2 Bulk Operations
- [ ] Bulk permission assignment
- [ ] Bulk user role assignment
- [ ] Bulk import/export

#### 5.3 Analytics & Reporting
- [ ] GET /permissions/usage-statistics
- [ ] GET /roles/usage-statistics
- [ ] GET /users/permission-audit/:userId

#### 5.4 Audit Integration
- [ ] Integrate with existing audit_logs
- [ ] Track permission changes
- [ ] Track role assignments
- [ ] Permission check logging (optional)

### Testing Requirements
```typescript
// Integration Tests
- role-hierarchy.spec.ts
- bulk-operations.spec.ts
- audit-logging.spec.ts
```

### Acceptance Criteria
- ✅ Role hierarchy prevents circular references
- ✅ Permission inheritance working correctly
- ✅ Bulk operations efficient (>100 items/sec)
- ✅ Audit logs complete and accurate
- ✅ Analytics provide useful insights

---

## 🚀 Deployment Checklist

### Per Phase Deployment

```bash
# 1. Run migrations (if any)
npx prisma migrate dev

# 2. Generate Prisma client
npx prisma generate

# 3. Run tests
npm run test
npm run test:e2e

# 4. Run linter
npm run lint

# 5. Build
npm run build

# 6. Deploy to staging
# Test all endpoints

# 7. Deploy to production
# Monitor logs and metrics
```

### Database Seeding

```bash
# Create initial data
npm run seed:permissions
npm run seed:roles
npm run seed:modules

# Or combined
npm run seed:all
```

### Monitoring

- [ ] Setup metrics for permission checker performance
- [ ] Monitor cache hit rate
- [ ] Track authorization failures
- [ ] Alert on high error rates

---

## 📚 Documentation Requirements

Per Phase:
- [ ] API documentation (Swagger)
- [ ] Service documentation (JSDoc)
- [ ] Integration guide
- [ ] Migration guide (if replacing old system)

Final Documentation:
- [ ] Architecture overview
- [ ] Permission model explanation
- [ ] Best practices guide
- [ ] Troubleshooting guide

---

## 🔄 Rollback Plan

Per Phase:
1. Feature flag to disable new permission system
2. Database migration rollback script
3. Fallback to old system (if exists)
4. Data preservation strategy

---

## 📈 Success Metrics

### Performance
- Permission check: < 10ms (p95)
- Cache hit rate: > 90%
- API response time: < 100ms (p95)

### Quality
- Test coverage: > 80%
- Zero critical bugs in production
- All acceptance criteria met

### Adoption
- All modules migrated to new permission system
- Documentation complete
- Team trained on new system

---

## 🎯 Quick Start Guide

### For Phase 1 (Next Step):
```bash
# 1. Create roles service
cp src/modules/permissions/services/permissions.service.ts \
   src/modules/permissions/services/roles.service.ts
# Edit and adapt for roles

# 2. Create modules service
cp src/modules/permissions/services/permissions.service.ts \
   src/modules/permissions/services/modules.service.ts
# Edit and adapt for modules

# 3. Create controllers
# Follow pattern from schools.controller.ts

# 4. Wire in permission.module.ts

# 5. Test
npm run test src/modules/permissions
```

---

## 📞 Support

Questions or issues during implementation:
1. Check schema.prisma for model relationships
2. Reference existing patterns (schools, organizations modules)
3. Review CLAUDE.md for project guidelines
4. Check git history for deleted files (may have useful code)

---

**Total Timeline**: 10-14 hari kerja
**Critical Path**: Phase 0 → Phase 1 → Phase 2 (PermissionChecker)
**Recommended Team Size**: 1-2 developers
**Risk Level**: Medium (many interdependencies, critical for auth)
