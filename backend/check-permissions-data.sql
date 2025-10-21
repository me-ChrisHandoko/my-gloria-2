-- Quick Diagnostic SQL Queries for PermissionList Issue
-- Run these queries in your database client to diagnose the issue

-- ========================================
-- 1. CHECK IF PERMISSIONS TABLE HAS DATA
-- ========================================
SELECT
    COUNT(*) as total_permissions,
    COUNT(CASE WHEN "isActive" = true THEN 1 END) as active_permissions,
    COUNT(CASE WHEN "isActive" = false THEN 1 END) as inactive_permissions
FROM "permission";

-- ========================================
-- 2. VIEW SAMPLE PERMISSIONS
-- ========================================
SELECT
    id,
    code,
    name,
    resource,
    action,
    "isActive",
    "isSystemPermission",
    "createdAt"
FROM "permission"
ORDER BY "createdAt" DESC
LIMIT 10;

-- ========================================
-- 3. CHECK SPECIFIC PERMISSION: permissions.READ
-- ========================================
SELECT
    id,
    code,
    name,
    resource,
    action,
    "isActive"
FROM "permission"
WHERE resource = 'permissions'
  AND action = 'READ';

-- ========================================
-- 4. CHECK USER PROFILES (find your user)
-- ========================================
SELECT
    id,
    "clerkUserId",
    nip,
    "isSuperadmin",
    "isActive",
    "createdAt"
FROM "userProfile"
ORDER BY "createdAt" DESC
LIMIT 5;

-- ========================================
-- 5. CHECK USER ROLES (replace USER_PROFILE_ID)
-- ========================================
-- STEP 1: Get your userProfile.id from query #4
-- STEP 2: Replace 'YOUR_USER_PROFILE_ID' below

SELECT
    ur.id,
    r.code as role_code,
    r.name as role_name,
    r."hierarchyLevel",
    ur."isActive" as assignment_active,
    ur."assignedAt",
    ur."validFrom",
    ur."validUntil"
FROM "userRole" ur
JOIN "role" r ON ur."roleId" = r.id
WHERE ur."userProfileId" = 'YOUR_USER_PROFILE_ID'
  AND ur."isActive" = true;

-- ========================================
-- 6. CHECK ROLE PERMISSIONS (replace ROLE_ID)
-- ========================================
-- STEP 1: Get role.id from query #5
-- STEP 2: Replace 'YOUR_ROLE_ID' below

SELECT
    p.code as permission_code,
    p.name as permission_name,
    p.resource,
    p.action,
    rp."isGranted",
    rp."createdAt"
FROM "rolePermission" rp
JOIN "permission" p ON rp."permissionId" = p.id
WHERE rp."roleId" = 'YOUR_ROLE_ID'
  AND rp."isGranted" = true
  AND p."isActive" = true
ORDER BY p.resource, p.action;

-- ========================================
-- 7. CHECK IF USER HAS permissions.READ
-- ========================================
-- Replace 'YOUR_USER_PROFILE_ID' with actual ID

SELECT DISTINCT
    p.code,
    p.name,
    p.resource,
    p.action,
    'role: ' || r.name as granted_via
FROM "userRole" ur
JOIN "rolePermission" rp ON ur."roleId" = rp."roleId"
JOIN "permission" p ON rp."permissionId" = p.id
JOIN "role" r ON ur."roleId" = r.id
WHERE ur."userProfileId" = 'YOUR_USER_PROFILE_ID'
  AND ur."isActive" = true
  AND rp."isGranted" = true
  AND p.resource = 'permissions'
  AND p.action = 'READ';

-- ========================================
-- 8. GRANT permissions.READ TO SPECIFIC ROLE
-- ========================================
-- Use this if user doesn't have the permission
-- Replace ROLE_ID and PERMISSION_ID

/*
INSERT INTO "rolePermission" (
    id,
    "roleId",
    "permissionId",
    "isGranted",
    "createdAt",
    "updatedAt"
)
VALUES (
    gen_random_uuid(),
    'YOUR_ROLE_ID',
    (SELECT id FROM "permission" WHERE resource = 'permissions' AND action = 'READ'),
    true,
    NOW(),
    NOW()
);
*/

-- ========================================
-- 9. CREATE SAMPLE PERMISSIONS (if table is empty)
-- ========================================
/*
INSERT INTO "permission" (
    id,
    code,
    name,
    description,
    resource,
    action,
    "isSystemPermission",
    "isActive",
    "createdAt",
    "updatedAt"
)
VALUES
    (gen_random_uuid(), 'permissions.READ', 'Read Permissions', 'View permission list', 'permissions', 'READ', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'permissions.CREATE', 'Create Permission', 'Create new permission', 'permissions', 'CREATE', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'permissions.UPDATE', 'Update Permission', 'Modify existing permission', 'permissions', 'UPDATE', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'permissions.DELETE', 'Delete Permission', 'Remove permission', 'permissions', 'DELETE', true, true, NOW(), NOW());
*/

-- ========================================
-- QUICK DIAGNOSTIC SUMMARY
-- ========================================
SELECT
    'Permissions in database' as check_item,
    COUNT(*)::text as result
FROM "permission"
UNION ALL
SELECT
    'Active permissions',
    COUNT(*)::text
FROM "permission"
WHERE "isActive" = true
UNION ALL
SELECT
    'User profiles',
    COUNT(*)::text
FROM "userProfile"
UNION ALL
SELECT
    'Active roles',
    COUNT(*)::text
FROM "role"
WHERE "isActive" = true;
