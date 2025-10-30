# Phase 1 Migration Scripts

Data migration scripts for Phase 1: Quick Wins simplification.

## Overview

These scripts migrate data from over-engineered tables to simplified consolidated models:

1. **01-consolidate-delegations.ts** - Merges 3 delegation tables into 1
2. **02-simplify-notifications.ts** - Simplifies 4 notification tables to 1

## Prerequisites

✅ **Before running migrations:**

1. **Backup database**:
   ```bash
   pg_dump $DATABASE_URL > backup_pre_phase1_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Verify backup**:
   ```bash
   pg_restore --list backup_pre_phase1_*.sql | head -20
   ```

3. **Run on staging first**:
   ```bash
   # Set staging database URL
   export DATABASE_URL="postgresql://..."
   npm run migrate:phase1:staging
   ```

4. **Apply Prisma schema changes**:
   ```bash
   # After updating schema.prisma with new models
   npx prisma generate
   npx prisma migrate dev --name phase1-schema-changes
   ```

## Usage

### Step 1: Create new tables (via Prisma)

```bash
# Apply schema changes that create:
# - delegations table
# - notification_preferences_simplified table
npx prisma migrate dev --name phase1-add-new-tables
```

### Step 2: Run data migrations

```bash
# Consolidate delegation tables
npm run ts-node scripts/migrations/01-consolidate-delegations.ts

# Simplify notification preferences
npm run ts-node scripts/migrations/02-simplify-notifications.ts
```

### Step 3: Verify migrations

```sql
-- Verify delegation consolidation
SELECT type, COUNT(*) as count, COUNT(DISTINCT delegator_id) as unique_delegators
FROM gloria_ops.delegations
GROUP BY type;

-- Compare with old tables
SELECT 'approval' as type, COUNT(*) FROM gloria_ops.approval_delegations
UNION ALL
SELECT 'permission', COUNT(*) FROM gloria_ops.permission_delegations
UNION ALL
SELECT 'workflow', COUNT(*) FROM gloria_ops.workflow_delegations;

-- Verify notification simplification
SELECT COUNT(*) as simplified_count
FROM gloria_ops.notification_preferences_simplified;

SELECT COUNT(*) as original_count
FROM gloria_ops.notification_preferences;
```

### Step 4: Update application code

Update services to use new tables:
- `src/common/services/delegation.service.ts`
- `src/modules/notifications/services/preference.service.ts`

Deploy updated code to staging and test thoroughly.

### Step 5: Drop old tables (after 1 week verification)

```sql
-- Only run after verifying new tables work correctly!

-- Drop old delegation tables
DROP TABLE IF EXISTS gloria_ops.approval_delegations CASCADE;
DROP TABLE IF EXISTS gloria_ops.permission_delegations CASCADE;
DROP TABLE IF EXISTS gloria_ops.workflow_delegations CASCADE;

-- Drop old notification tables
DROP TABLE IF EXISTS gloria_ops.notification_channel_preferences CASCADE;
DROP TABLE IF EXISTS gloria_ops.notification_unsubscribes CASCADE;
DROP TABLE IF EXISTS gloria_ops.notification_frequency_tracking CASCADE;
DROP TABLE IF EXISTS gloria_ops.notification_preferences CASCADE;

-- Rename simplified table
ALTER TABLE gloria_ops.notification_preferences_simplified
  RENAME TO notification_preferences;
```

## Rollback Procedures

### Rollback Delegation Consolidation

```sql
-- Restore from backup
psql $DATABASE_URL < backup_pre_phase1_*.sql

-- Or drop new table if no code changes deployed
DROP TABLE gloria_ops.delegations;
```

### Rollback Notification Simplification

```sql
-- Restore from backup
psql $DATABASE_URL < backup_pre_phase1_*.sql

-- Or drop new table if no code changes deployed
DROP TABLE gloria_ops.notification_preferences_simplified;
```

## Migration Output

Expected console output:

```
╔═══════════════════════════════════════════════════════════╗
║  Phase 1 Migration: Consolidate Delegation Tables        ║
╚═══════════════════════════════════════════════════════════╝

🚀 Starting delegation consolidation migration...

📋 Step 1/3: Migrating ApprovalDelegation...
   Found 25 approval delegations
   ✅ Migrated 25/25 approval delegations

📋 Step 2/3: Migrating PermissionDelegation...
   Found 10 permission delegations
   ✅ Migrated 10/10 permission delegations

📋 Step 3/3: Migrating WorkflowDelegation...
   Found 5 workflow delegations
   ✅ Migrated 5/5 workflow delegations

🔍 Verification:
   Database has 40 delegations
   Expected 40 delegations
   ✅ Verification passed!

╔═══════════════════════════════════════════════════════════╗
║  Migration Summary                                        ║
╚═══════════════════════════════════════════════════════════╝
📊 Approval Delegations:   25
📊 Permission Delegations: 10
📊 Workflow Delegations:   5
📊 Total Migrated:         40
❌ Errors:                 0

✅ Migration completed successfully!
```

## Troubleshooting

### Error: "relation does not exist"

**Cause**: New tables not created yet
**Solution**: Run `npx prisma migrate dev` first

### Error: "duplicate key value violates unique constraint"

**Cause**: Migration script run twice
**Solution**: Drop new tables and re-run:
```sql
TRUNCATE gloria_ops.delegations;
-- Re-run migration script
```

### Error: "column does not exist"

**Cause**: Schema mismatch between Prisma and database
**Solution**:
```bash
npx prisma migrate reset
npx prisma migrate dev
```

## Performance Monitoring

Monitor query performance before/after migration:

```sql
-- Enable pg_stat_statements (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Reset statistics
SELECT pg_stat_statements_reset();

-- After running application for 24 hours
SELECT
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
WHERE query LIKE '%delegation%' OR query LIKE '%notification_preference%'
ORDER BY mean_exec_time DESC
LIMIT 20;
```

## Success Metrics

✅ **Phase 1 migrations successful when:**

- All delegation data migrated (0 errors)
- All notification preferences preserved
- Zero data loss verified
- Query performance maintained or improved
- All application functionality working
- Storage reduced by 100-200MB

## Contact

For issues or questions:
- Review detailed implementation plan: `docs/phase1-implementation.md`
- Check schema analysis: `docs/schema-over-engineering-analysis.md`
