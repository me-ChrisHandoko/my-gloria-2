-- Migration Script: Convert PermissionTemplates to Roles
-- This script safely migrates existing PermissionTemplate data before deletion
-- Run this ONLY if permission_templates table has data

-- ============================================
-- PART 1: PRE-MIGRATION CHECKS
-- ============================================

-- Check current data counts
SELECT
    'permission_templates' as table_name,
    COUNT(*) as row_count
FROM "gloria_ops"."permission_templates"
UNION ALL
SELECT
    'permission_template_applications',
    COUNT(*)
FROM "gloria_ops"."permission_template_applications"
UNION ALL
SELECT
    'permission_dependencies',
    COUNT(*)
FROM "gloria_ops"."permission_dependencies";

-- ============================================
-- PART 2: DATA MIGRATION (if data exists)
-- ============================================

-- 2.1 Migrate PermissionTemplates to Roles
-- Only run if permission_templates has data

INSERT INTO "gloria_ops"."roles" (
    id,
    code,
    name,
    description,
    "hierarchy_level",
    "is_system_role",
    "is_active",
    "created_at",
    "updated_at",
    "created_by"
)
SELECT
    id,
    code,
    name,
    description,
    5 as hierarchy_level,  -- Default middle level
    "is_system" as is_system_role,
    "is_active",
    "created_at",
    "updated_at",
    "created_by"
FROM "gloria_ops"."permission_templates"
WHERE NOT EXISTS (
    SELECT 1 FROM "gloria_ops"."roles" r WHERE r.code = "gloria_ops"."permission_templates".code
);

-- 2.2 Migrate PermissionTemplateApplications to UserRoles
-- For templates applied to users

INSERT INTO "gloria_ops"."user_roles" (
    id,
    "user_profile_id",
    "role_id",
    "assigned_at",
    "assigned_by",
    "valid_from",
    "valid_until",
    "is_active"
)
SELECT
    pta.id,
    pta."target_id" as user_profile_id,
    pta."template_id" as role_id,
    pta."applied_at" as assigned_at,
    pta."applied_by" as assigned_by,
    pta."applied_at" as valid_from,
    CASE
        WHEN pta."revoked_at" IS NOT NULL THEN pta."revoked_at"
        ELSE NULL
    END as valid_until,
    pta."is_active"
FROM "gloria_ops"."permission_template_applications" pta
WHERE pta."target_type" = 'user'
AND NOT EXISTS (
    SELECT 1 FROM "gloria_ops"."user_roles" ur
    WHERE ur."user_profile_id" = pta."target_id"
    AND ur."role_id" = pta."template_id"
);

-- 2.3 Create audit log for migration
INSERT INTO "gloria_ops"."audit_logs" (
    id,
    "actor_id",
    action,
    module,
    "entity_type",
    "entity_id",
    "entity_display",
    metadata,
    "created_at"
)
SELECT
    gen_random_uuid(),
    'system-migration',
    'MIGRATION',
    'permissions',
    'permission_template',
    id,
    name,
    jsonb_build_object(
        'migration_type', 'permission_template_to_role',
        'original_code', code,
        'migrated_at', NOW()
    ),
    NOW()
FROM "gloria_ops"."permission_templates";

-- ============================================
-- PART 3: VERIFICATION QUERIES
-- ============================================

-- Verify migration success
SELECT
    'Roles created from templates' as check_type,
    COUNT(*) as count
FROM "gloria_ops"."roles"
WHERE code IN (SELECT code FROM "gloria_ops"."permission_templates")
UNION ALL
SELECT
    'User roles created from template applications',
    COUNT(*)
FROM "gloria_ops"."user_roles" ur
WHERE ur.role_id IN (SELECT id FROM "gloria_ops"."permission_templates");

-- ============================================
-- PART 4: CLEANUP (run AFTER verification)
-- ============================================

-- WARNING: Only run these after confirming migration success

-- Drop foreign keys first
ALTER TABLE "gloria_ops"."permission_template_applications"
    DROP CONSTRAINT IF EXISTS "permission_template_applications_template_id_fkey";

-- Drop tables
DROP TABLE IF EXISTS "gloria_ops"."permission_template_applications";
DROP TABLE IF EXISTS "gloria_ops"."permission_templates";
DROP TABLE IF EXISTS "gloria_ops"."permission_dependencies";
DROP TABLE IF EXISTS "gloria_ops"."role_templates";
DROP TABLE IF EXISTS "gloria_ops"."permission_analytics";
DROP TABLE IF EXISTS "gloria_ops"."permission_policies";
DROP TABLE IF EXISTS "gloria_ops"."policy_assignments";

-- Verify cleanup
SELECT
    tablename
FROM pg_tables
WHERE schemaname = 'gloria_ops'
    AND tablename LIKE '%template%'
    OR tablename LIKE '%dependency%'
    OR tablename LIKE '%policy%'
    OR tablename LIKE '%analytics%';
-- Should return empty if cleanup successful
