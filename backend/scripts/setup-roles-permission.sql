-- ========================================
-- Permission Setup Script for roles:READ
-- ========================================
-- This script helps diagnose and fix the "Insufficient permissions: No permission for roles:READ" error
-- Run these queries step by step and note which ones return empty results

-- ========================================
-- STEP 1: Verify Permission Exists
-- ========================================
SELECT
  id,
  code,
  name,
  resource,
  action,
  "isActive",
  "createdAt"
FROM gloria_ops.permissions
WHERE resource = 'roles'
  AND action = 'READ'
  AND "isActive" = true;

-- If empty, create the permission:
-- INSERT INTO gloria_ops.permissions (
--   id, code, name, description, resource, action, scope, "isActive", "createdAt", "updatedAt"
-- ) VALUES (
--   gen_random_uuid(),
--   'roles:read',
--   'Read Roles',
--   'Permission to view and list roles',
--   'roles',
--   'READ',
--   'ALL',
--   true,
--   NOW(),
--   NOW()
-- );

-- ========================================
-- STEP 2: Check User's Active Roles
-- ========================================
-- Replace <YOUR_USER_ID> with actual userProfileId from your session
SELECT
  ur.id as user_role_id,
  ur."userProfileId",
  ur."roleId",
  r.code as role_code,
  r.name as role_name,
  r."isActive" as role_active,
  ur."isActive" as user_role_active,
  ur."validFrom",
  ur."validUntil",
  CASE
    WHEN ur."validUntil" IS NULL THEN true
    WHEN ur."validUntil" > NOW() THEN true
    ELSE false
  END as is_still_valid
FROM gloria_ops.user_roles ur
JOIN gloria_ops.roles r ON ur."roleId" = r.id
WHERE ur."userProfileId" = '<YOUR_USER_ID>'  -- Replace with actual user ID
  AND ur."isActive" = true;

-- If empty, user has no roles assigned. You need to:
-- 1. Find or create a role
-- 2. Assign it to the user (see STEP 5)

-- ========================================
-- STEP 3: Verify RolePermission Links
-- ========================================
-- This checks if the user's role(s) are linked to the roles:READ permission
SELECT
  rp.id as role_permission_id,
  rp."roleId",
  r.code as role_code,
  r.name as role_name,
  rp."permissionId",
  p.code as permission_code,
  p.resource,
  p.action,
  rp."isGranted",
  rp."validFrom",
  rp."validUntil"
FROM gloria_ops.role_permissions rp
JOIN gloria_ops.roles r ON rp."roleId" = r.id
JOIN gloria_ops.permissions p ON rp."permissionId" = p.id
WHERE rp."roleId" IN (
    SELECT "roleId"
    FROM gloria_ops.user_roles
    WHERE "userProfileId" = '<YOUR_USER_ID>'
      AND "isActive" = true
  )
  AND p.resource = 'roles'
  AND p.action = 'READ'
  AND rp."isGranted" = true;

-- If empty, the role is not linked to the permission (see STEP 6)

-- ========================================
-- STEP 4: Complete Permission Chain Check
-- ========================================
-- This verifies the entire permission chain from user to permission
SELECT
  up.id as user_id,
  up."clerkUserId",
  ur."roleId",
  r.code as role_code,
  r.name as role_name,
  r."isActive" as role_active,
  ur."isActive" as user_role_active,
  ur."validFrom" as role_valid_from,
  ur."validUntil" as role_valid_until,
  rp."permissionId",
  p.code as permission_code,
  p.resource,
  p.action,
  p.scope,
  p."isActive" as permission_active,
  rp."isGranted"
FROM gloria_ops.user_profiles up
JOIN gloria_ops.user_roles ur ON up.id = ur."userProfileId"
JOIN gloria_ops.roles r ON ur."roleId" = r.id
JOIN gloria_ops.role_permissions rp ON r.id = rp."roleId"
JOIN gloria_ops.permissions p ON rp."permissionId" = p.id
WHERE up.id = '<YOUR_USER_ID>'  -- Replace with actual user ID
  AND p.resource = 'roles'
  AND p.action = 'READ'
  AND ur."isActive" = true
  AND r."isActive" = true
  AND p."isActive" = true
  AND rp."isGranted" = true;

-- Expected: At least 1 row
-- If empty: Permission chain is broken (check which STEP returned empty)

-- ========================================
-- STEP 5: Assign Role to User (if needed)
-- ========================================
-- First, find available roles:
-- SELECT id, code, name, "isActive" FROM gloria_ops.roles WHERE "isActive" = true;

-- Then assign role to user:
-- INSERT INTO gloria_ops.user_roles (
--   id, "userProfileId", "roleId", "isActive", "validFrom", "assignedAt", "assignedBy"
-- ) VALUES (
--   gen_random_uuid(),
--   '<YOUR_USER_ID>',  -- Replace with actual user ID
--   '<ROLE_ID>',       -- Replace with role ID from query above
--   true,
--   NOW(),
--   NOW(),
--   '<ADMIN_USER_ID>'  -- Replace with admin/system user ID
-- );

-- ========================================
-- STEP 6: Link Role to Permission (if needed)
-- ========================================
-- First get the permission ID:
-- SELECT id FROM gloria_ops.permissions WHERE resource = 'roles' AND action = 'READ';

-- Then link role to permission:
-- INSERT INTO gloria_ops.role_permissions (
--   id, "roleId", "permissionId", "isGranted", "validFrom", "grantedBy", "createdAt", "updatedAt"
-- ) VALUES (
--   gen_random_uuid(),
--   '<ROLE_ID>',        -- Replace with your role ID
--   '<PERMISSION_ID>',  -- Replace with permission ID from query above
--   true,
--   NOW(),
--   '<ADMIN_USER_ID>',  -- Replace with admin/system user ID
--   NOW(),
--   NOW()
-- );

-- ========================================
-- STEP 7: Check Permission Logs (Optional)
-- ========================================
-- View recent permission check failures with detailed metadata
SELECT
  id,
  "userProfileId",
  resource,
  action,
  "isAllowed",
  "deniedReason",
  metadata,
  "createdAt"
FROM gloria_ops.permission_check_logs
WHERE "userProfileId" = '<YOUR_USER_ID>'  -- Replace with actual user ID
  AND resource = 'roles'
  AND action = 'READ'
ORDER BY "createdAt" DESC
LIMIT 5;

-- ========================================
-- STEP 8: Find Your User ID (if unknown)
-- ========================================
-- Use your Clerk User ID from the session:
-- SELECT id, "clerkUserId", nip, "isActive"
-- FROM gloria_ops.user_profiles
-- WHERE "clerkUserId" = '<YOUR_CLERK_USER_ID>';

-- Or search by email from data_karyawan:
-- SELECT up.id, up."clerkUserId", dk.nama, dk.email
-- FROM gloria_ops.user_profiles up
-- JOIN gloria_master.data_karyawan dk ON up.nip = dk.nip
-- WHERE dk.email = 'your.email@example.com';

-- ========================================
-- QUICK FIX: Direct User Permission (Temporary)
-- ========================================
-- Bypass role system and grant permission directly to user
-- USE ONLY FOR TESTING/DEBUGGING
-- INSERT INTO gloria_ops.user_permissions (
--   id, "userProfileId", "permissionId", "isGranted",
--   "validFrom", "grantedBy", "grantReason", "createdAt", "updatedAt"
-- ) VALUES (
--   gen_random_uuid(),
--   '<YOUR_USER_ID>',
--   (SELECT id FROM gloria_ops.permissions WHERE resource = 'roles' AND action = 'READ'),
--   true,
--   NOW(),
--   '<ADMIN_USER_ID>',
--   'Temporary direct permission for debugging',
--   NOW(),
--   NOW()
-- );

-- ========================================
-- CACHE INVALIDATION
-- ========================================
-- After making any permission changes, you MUST invalidate the cache
-- Option 1: Via API endpoint (recommended)
--   POST /api/v1/permissions/cache/invalidate
--   Body: { "userProfileId": "<YOUR_USER_ID>" }

-- Option 2: Via database (if using database cache)
-- DELETE FROM gloria_ops.permission_cache WHERE "userProfileId" = '<YOUR_USER_ID>';

-- Option 3: Via Redis (if using Redis cache)
-- Run in Redis CLI:
-- KEYS permission:check:<YOUR_USER_ID>:*
-- DEL permission:check:<YOUR_USER_ID>:*

-- ========================================
-- VERIFICATION
-- ========================================
-- After setup, run STEP 4 again to verify complete chain
-- Then test by accessing /api/v1/roles endpoint
