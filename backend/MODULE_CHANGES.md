# Permission Module Changes Required

## File: `src/modules/permissions/permission.module.ts`

### Imports to REMOVE

Remove the following import statements:

```typescript
// Line 20 - REMOVE
import { PermissionDependencyService } from './services/permission-dependency.service';

// Line 22 - REMOVE
import { PermissionTemplateService } from './services/permission-template.service';

// Line 37 - REMOVE
import { PermissionDependencyController } from './controllers/permission-dependency.controller';

// Line 39 - REMOVE
import { PermissionTemplateController } from './controllers/permission-template.controller';
```

### Controllers Array - Remove entries

In the `@Module` decorator, controllers array (lines 52-68):

```typescript
controllers: [
  PermissionsController,
  RolesController,
  RolePermissionsController,
  UserPermissionsController,
  ResourcePermissionsController,
  // PermissionDependencyController,  // ❌ REMOVE this line
  PermissionDelegationController,
  // PermissionTemplateController,    // ❌ REMOVE this line
  PermissionHistoryController,
  PermissionCheckLogController,
  PermissionAdminController,
  ModuleCrudController,
  ModulePermissionController,
  ModuleRoleAccessController,
  ModuleUserAccessController,
],
```

### Providers Array - Remove entries

In the `@Module` decorator, providers array (lines 69-87):

```typescript
providers: [
  PermissionsService,
  RolesService,
  RolePermissionsService,
  UserPermissionsService,
  ResourcePermissionsService,
  // PermissionDependencyService,  // ❌ REMOVE this line
  PermissionDelegationService,
  // PermissionTemplateService,    // ❌ REMOVE this line
  PermissionHistoryService,
  PermissionCheckLogService,
  PermissionAdminService,
  PermissionCalculationService,
  PermissionCacheService,
  ModuleService,
  ModuleCrudService,
  RoleHierarchyService,
  PermissionValidationService,
],
```

### Exports Array - Remove entries

In the `@Module` decorator, exports array (lines 88-106):

```typescript
exports: [
  PermissionsService,
  RolesService,
  RolePermissionsService,
  UserPermissionsService,
  ResourcePermissionsService,
  // PermissionDependencyService,  // ❌ REMOVE this line
  PermissionDelegationService,
  // PermissionTemplateService,    // ❌ REMOVE this line
  PermissionHistoryService,
  PermissionCheckLogService,
  PermissionAdminService,
  PermissionCalculationService,
  PermissionCacheService,
  ModuleService,
  ModuleCrudService,
  RoleHierarchyService,
  PermissionValidationService,
],
```

---

## Complete Updated File

Here's how the file should look after all changes:

```typescript
import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@/core/database/prisma.module';
import { CacheModule } from '@/core/cache/cache.module';
import { AuditModule } from '@/core/audit/audit.module';
import { UsersModule } from '../users/users.module';
import { OrganizationsModule } from '../organizations/organizations.module';

// Services
import { PermissionsService } from './services/permission.service';
import { RolesService } from './services/role.service';
import { PermissionCalculationService } from './services/permission-calculation.service';
import { PermissionCacheService } from './services/permission-cache.service';
import { ModuleService } from './services/module.service';
import { ModuleCrudService } from './services/module-crud.service';
import { RoleHierarchyService } from './services/role-hierarchy.service';
import { PermissionValidationService } from './services/permission-validation.service';
import { RolePermissionsService } from './services/permission-roles.service';
import { UserPermissionsService } from './services/permission-users.service';
import { ResourcePermissionsService } from './services/permission-resources.service';
import { PermissionDelegationService } from './services/permission-delegation.service';
import { PermissionHistoryService } from './services/permission-history.service';
import { PermissionCheckLogService } from './services/permission-check-log.service';
import { PermissionAdminService } from './services/permission-admin.service';

// Controllers
import { PermissionsController } from './controllers/permission.controller';
import { RolesController } from './controllers/role.controller';
import { ModuleCrudController } from './controllers/module-crud.controller';
import { ModulePermissionController } from './controllers/module-permission.controller';
import { ModuleRoleAccessController } from './controllers/module-role-access.controller';
import { ModuleUserAccessController } from './controllers/module-user-access.controller';
import { RolePermissionsController } from './controllers/permission-roles.controller';
import { UserPermissionsController } from './controllers/permission-users.controller';
import { ResourcePermissionsController } from './controllers/permission-resources.controller';
import { PermissionDelegationController } from './controllers/permission-delegation.controller';
import { PermissionHistoryController } from './controllers/permission-history.controller';
import { PermissionCheckLogController } from './controllers/permission-check-log.controller';
import { PermissionAdminController } from './controllers/permission-admin.controller';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    AuditModule,
    forwardRef(() => UsersModule),
    forwardRef(() => OrganizationsModule),
  ],
  controllers: [
    PermissionsController,
    RolesController,
    RolePermissionsController,
    UserPermissionsController,
    ResourcePermissionsController,
    PermissionDelegationController,
    PermissionHistoryController,
    PermissionCheckLogController,
    PermissionAdminController,
    ModuleCrudController,
    ModulePermissionController,
    ModuleRoleAccessController,
    ModuleUserAccessController,
  ],
  providers: [
    PermissionsService,
    RolesService,
    RolePermissionsService,
    UserPermissionsService,
    ResourcePermissionsService,
    PermissionDelegationService,
    PermissionHistoryService,
    PermissionCheckLogService,
    PermissionAdminService,
    PermissionCalculationService,
    PermissionCacheService,
    ModuleService,
    ModuleCrudService,
    RoleHierarchyService,
    PermissionValidationService,
  ],
  exports: [
    PermissionsService,
    RolesService,
    RolePermissionsService,
    UserPermissionsService,
    ResourcePermissionsService,
    PermissionDelegationService,
    PermissionHistoryService,
    PermissionCheckLogService,
    PermissionAdminService,
    PermissionCalculationService,
    PermissionCacheService,
    ModuleService,
    ModuleCrudService,
    RoleHierarchyService,
    PermissionValidationService,
  ],
})
export class PermissionModule {}
```

---

## Verification Steps

After making these changes:

1. **Check for syntax errors**:
   ```bash
   npx tsc --noEmit
   ```

2. **Check for unused imports**:
   ```bash
   npx eslint src/modules/permissions/permission.module.ts
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

4. **Verify module loads correctly**:
   ```bash
   npm run start:dev
   # Check console for any module loading errors
   ```

---

## Common Issues & Fixes

### Issue: "Cannot find module './services/permission-dependency.service'"
**Fix**: Make sure you removed the import statement at line 20

### Issue: "PermissionDependencyController is not defined"
**Fix**: Make sure you removed the import statement at line 37

### Issue: Build fails with "Module has no exported member 'PermissionTemplateService'"
**Fix**: Check if any other files are still importing these removed services

### Finding other dependencies:
```bash
# Search for any remaining imports of removed services
grep -r "PermissionDependencyService\|PermissionTemplateService" src/

# Search for any remaining imports of removed controllers
grep -r "PermissionDependencyController\|PermissionTemplateController" src/
```

---

## Testing After Changes

Run these commands in sequence:

```bash
# 1. Clean build artifacts
rm -rf dist/

# 2. Verify TypeScript compilation
npx tsc --noEmit

# 3. Build project
npm run build

# 4. Run linter
npm run lint

# 5. Run tests
npm run test

# 6. Start dev server
npm run start:dev
```

All should pass with no errors related to removed dependencies.
