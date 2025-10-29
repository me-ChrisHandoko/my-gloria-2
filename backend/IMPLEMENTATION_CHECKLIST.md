# Permission System Cleanup - Implementation Checklist

## Executive Summary

**Status**: ✅ All preparation complete, awaiting approval for execution

**Files Created**:
- ✅ CLEANUP_PLAN.md - 7-phase comprehensive plan
- ✅ scripts/cleanup-permission-system.sh - Automated file removal
- ✅ scripts/migrate-permission-templates.sql - Data migration
- ✅ SCHEMA_CHANGES.md - Database schema modifications
- ✅ MODULE_CHANGES.md - Module configuration updates

**Impact**:
- Remove: 6 source files (controllers, services, DTOs)
- Drop: 7 database models/tables
- Update: 1 module configuration file
- Update: 1 schema.prisma file
- Estimated time: 6-7 hours total
- Risk level: Medium

---

## Pre-Execution Checklist

### 1. Database Backup (CRITICAL)
```bash
# Option 1: Using pg_dump
pg_dump $DATABASE_URL > backup_before_cleanup_$(date +%Y%m%d_%H%M%S).sql

# Option 2: Using Prisma
npx prisma db push --skip-generate
```

**Verification**:
- [ ] Backup file created successfully
- [ ] Backup file size is reasonable (>1KB)
- [ ] Backup location documented and accessible

### 2. Data Verification
```sql
-- Run this query to check if deprecated tables have data
SELECT COUNT(*) as count, 'permission_templates' as table FROM "gloria_ops"."permission_templates"
UNION ALL
SELECT COUNT(*), 'permission_template_applications' FROM "gloria_ops"."permission_template_applications"
UNION ALL
SELECT COUNT(*), 'permission_dependencies' FROM "gloria_ops"."permission_dependencies"
UNION ALL
SELECT COUNT(*), 'role_templates' FROM "gloria_ops"."role_templates"
UNION ALL
SELECT COUNT(*), 'permission_analytics' FROM "gloria_ops"."permission_analytics"
UNION ALL
SELECT COUNT(*), 'permission_policies' FROM "gloria_ops"."permission_policies";
```

**Verification**:
- [ ] Query executed successfully
- [ ] Data counts documented
- [ ] If ANY table has data > 0, run migration script first
- [ ] If all tables empty, can skip migration and proceed to deletion

### 3. Git Status Check
```bash
git status
git branch
```

**Verification**:
- [ ] On feature branch (NOT main/master)
- [ ] Working directory clean or changes committed
- [ ] Branch name documented: _________________

### 4. Development Environment Check
```bash
# Verify TypeScript compilation
npx tsc --noEmit

# Verify current build works
npm run build

# Verify tests pass
npm run test
```

**Verification**:
- [ ] TypeScript compilation successful
- [ ] Build completes without errors
- [ ] All tests passing

---

## Execution Sequence

### Phase 1: File Removal (Automated)

**Command**:
```bash
cd /Users/christianhandoko/Development/work/my-gloria-2/backend
chmod +x scripts/cleanup-permission-system.sh
./scripts/cleanup-permission-system.sh
```

**What This Does**:
- Creates backup of files to be removed
- Deletes 6 source files:
  - `permission-template.controller.ts`
  - `permission-template.service.ts`
  - `permission-template.dto.ts`
  - `permission-dependency.controller.ts`
  - `permission-dependency.service.ts`
  - `permission-dependency.dto.ts`
- Verifies TypeScript compilation
- Runs build to check for errors

**Expected Output**:
```
========================================
Permission System Cleanup Script
========================================

[1/8] Pre-flight checks...
[2/8] Checking files to be removed...
✓ Found: src/modules/permissions/controllers/permission-template.controller.ts
...
[3/8] Creating backup of files to be removed...
✓ Backed up: ...
Backup created in: backup_cleanup_YYYYMMDD_HHMMSS
[4/8] Removing deprecated controllers...
✓ Removed: permission-template.controller.ts
...
[7/8] Verifying TypeScript compilation...
✓ Build succeeded
[8/8] Cleanup Summary

========================================
Cleanup Complete!
========================================
```

**Verification**:
- [ ] Script completed successfully
- [ ] Backup directory created
- [ ] All 6 files removed
- [ ] Build succeeded
- [ ] No TypeScript errors

**Rollback if Failed**:
```bash
# If script fails, restore from backup
cp -r backup_cleanup_YYYYMMDD_HHMMSS/src/* src/
```

### Phase 2: Module Configuration Update (Manual)

**File**: `src/modules/permissions/permission.module.ts`

**Reference**: See `MODULE_CHANGES.md` for complete before/after comparison

**Changes Required**:

1. **Remove Import Statements** (lines 20, 22, 37, 39):
```typescript
// REMOVE these lines:
import { PermissionDependencyService } from './services/permission-dependency.service';
import { PermissionTemplateService } from './services/permission-template.service';
import { PermissionDependencyController } from './controllers/permission-dependency.controller';
import { PermissionTemplateController } from './controllers/permission-template.controller';
```

2. **Update Controllers Array** (remove 2 entries)
3. **Update Providers Array** (remove 2 entries)
4. **Update Exports Array** (remove 2 entries)

**Verification Commands**:
```bash
# Check for any remaining references
grep -r "PermissionDependencyService\|PermissionTemplateService" src/
grep -r "PermissionDependencyController\|PermissionTemplateController" src/

# Verify TypeScript compilation
npx tsc --noEmit

# Verify build
npm run build
```

**Verification**:
- [ ] 4 import statements removed
- [ ] 2 controller references removed
- [ ] 2 provider references removed
- [ ] 2 export references removed
- [ ] No grep matches for removed services/controllers
- [ ] TypeScript compilation successful
- [ ] Build successful

### Phase 3: Database Schema Update (Manual)

**File**: `prisma/schema.prisma`

**Reference**: See `SCHEMA_CHANGES.md` for detailed line numbers and complete models

**Changes Required**:

1. **Remove 7 Model Definitions**:
   - PermissionDependency (lines ~383-394)
   - RoleTemplate (lines ~419-433)
   - PermissionTemplate (lines ~435-455)
   - PermissionTemplateApplication (lines ~457-474)
   - PermissionAnalytics (lines ~522-541)
   - PermissionPolicy (lines ~543-560)
   - PolicyAssignment (lines ~562-579)

2. **Update Permission Model** (remove dependency relations)

**Verification Commands**:
```bash
# Format schema
npx prisma format

# Validate schema
npx prisma validate
```

**Verification**:
- [ ] All 7 models removed from schema
- [ ] Permission model updated (dependency relations removed)
- [ ] Schema formatted successfully
- [ ] Schema validation passes

### Phase 4: Database Migration

#### 4A: Data Migration (if needed)
```bash
# If data exists in deprecated tables, run migration script first
psql $DATABASE_URL -f scripts/migrate-permission-templates.sql
```

**Verification**:
- [ ] Migration SQL executed successfully (if needed)
- [ ] Verification queries show correct counts
- [ ] Audit log entries created

#### 4B: Generate and Apply Prisma Migration
```bash
# Generate migration
npx prisma migrate dev --name remove_over_engineered_permission_features --create-only

# Review migration file in prisma/migrations/

# Apply migration
npx prisma migrate dev

# Regenerate Prisma client
npx prisma generate
```

**Verification**:
- [ ] Migration file created and reviewed
- [ ] Migration applied successfully
- [ ] Prisma client regenerated
- [ ] No TypeScript errors

### Phase 5: Build & Test Verification

```bash
# Clean build
rm -rf dist/

# Verify compilation
npx tsc --noEmit

# Build
npm run build

# Lint
npm run lint

# Test
npm run test

# Start dev server (brief check)
timeout 5 npm run start:dev || true
```

**Verification**:
- [ ] TypeScript compilation successful
- [ ] Build successful
- [ ] Linter passes
- [ ] All tests pass
- [ ] Dev server starts without errors

### Phase 6: Manual API Testing

Test remaining permission endpoints to ensure core functionality intact.

**Verification**:
- [ ] User permission endpoints working
- [ ] Role permission endpoints working
- [ ] Resource permissions working
- [ ] Delegation endpoints working
- [ ] Admin endpoints working
- [ ] Audit endpoints working

### Phase 7: Git Commit

```bash
git add -A
git commit -m "refactor: remove over-engineered permission features

- Remove PermissionTemplate system (duplicates Role functionality)
- Remove PermissionDependency system (implicit handling sufficient)
- Remove orphaned models: RoleTemplate, PermissionAnalytics, PermissionPolicy
- Update permission.module.ts to remove deprecated imports
- Migrate existing PermissionTemplate data to Roles
- Drop 7 unused database tables

BREAKING CHANGE: Removes /permission-templates and /permission-dependencies endpoints"

git push origin <branch-name>
```

**Verification**:
- [ ] All changes committed
- [ ] Commit message is descriptive
- [ ] Changes pushed to remote

---

## Success Criteria

### Technical Success
- ✅ All 6 source files removed
- ✅ All 7 database models dropped
- ✅ Module configuration updated
- ✅ TypeScript compilation successful
- ✅ Build successful
- ✅ All tests passing

### Functional Success
- ✅ Core permission APIs functional
- ✅ Role management working
- ✅ User permissions working
- ✅ Audit logs intact

---

## Rollback Procedures

### Emergency Rollback (Database)
```bash
# Restore from backup
psql $DATABASE_URL < backup_before_cleanup_YYYYMMDD_HHMMSS.sql
```

### Code Rollback (Files)
```bash
# Restore from script backup
cp -r backup_cleanup_YYYYMMDD_HHMMSS/src/* src/

# Or restore from git
git checkout HEAD~1 -- src/modules/permissions/
git checkout HEAD~1 -- prisma/schema.prisma
npx prisma generate
npm run build
```

---

## Final Approval Checklist

Before proceeding with execution:

- [ ] All preparation files reviewed
- [ ] Backup strategy confirmed
- [ ] Data migration plan understood
- [ ] Rollback procedures documented
- [ ] Ready to proceed with execution

---

## Execution Status Tracking

**Start Date**: _________________
**Completion Date**: _________________

**Phase Completion**:
- [ ] Phase 1: File Removal
- [ ] Phase 2: Module Update
- [ ] Phase 3: Schema Update
- [ ] Phase 4: Database Migration
- [ ] Phase 5: Build & Test
- [ ] Phase 6: Manual Testing
- [ ] Phase 7: Git Commit

**Final Status**: ⬜ Pending / ⬜ In Progress / ⬜ Completed / ⬜ Rolled Back
