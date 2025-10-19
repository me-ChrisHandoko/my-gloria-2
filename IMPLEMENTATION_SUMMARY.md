# Implementation Summary: Permission Error Fix

## Overview
Fixed two critical issues causing 403 "Insufficient permissions: No permission for roles:READ" error when accessing RoleList.

## Changes Implemented

### 1. Frontend API Path Duplication Fix ✅

**File**: `frontend/src/store/api/rolesApi.ts`

**Problem**: All endpoints were hardcoded with `/api/v1/` prefix, but the base URL already contained it, resulting in `/api/v1/api/v1/roles`.

**Solution**: Removed `/api/v1/` prefix from all 16 endpoints.

**Changes**:
- Line 28: `/api/v1/roles` → `/roles`
- Line 52: `/api/v1/roles/${id}` → `/roles/${id}`
- Line 58: `/api/v1/roles/code/${code}` → `/roles/code/${code}`
- Line 66: `/api/v1/roles/user/${userProfileId}` → `/roles/user/${userProfileId}`
- Line 74: `/api/v1/roles/statistics` → `/roles/statistics`
- Line 80: `/api/v1/roles/${roleId}/hierarchy` → `/roles/${roleId}/hierarchy`
- Line 91: `/api/v1/roles` → `/roles` (POST create)
- Line 101: `/api/v1/roles/${id}` → `/roles/${id}` (PUT update)
- Line 114: `/api/v1/roles/assign` → `/roles/assign`
- Line 130: `/api/v1/roles/remove/${userProfileId}/${roleId}` → `/roles/remove/${userProfileId}/${roleId}`
- Line 145: `/api/v1/roles/${roleId}/permissions` → `/roles/${roleId}/permissions`
- Line 160: `/api/v1/roles/${roleId}/permissions/bulk` → `/roles/${roleId}/permissions/bulk`
- Line 175: `/api/v1/roles/${roleId}/permissions/${permissionId}` → `/roles/${roleId}/permissions/${permissionId}`
- Line 189: `/api/v1/roles/${roleId}/hierarchy` → `/roles/${roleId}/hierarchy`
- Line 202: `/api/v1/roles/templates` → `/roles/templates`
- Line 212: `/api/v1/roles/templates/apply` → `/roles/templates/apply`

**Impact**: All API calls now correctly resolve to `http://localhost:3001/api/v1/roles` instead of the duplicated path.

---

### 2. Permission Diagnostic Tools ✅

#### A. SQL Diagnostic Script

**File**: `backend/scripts/setup-roles-permission.sql`

**Features**:
- **STEP 1**: Verify Permission record exists (`resource='roles'`, `action='READ'`)
- **STEP 2**: Check user's active roles via UserRole table
- **STEP 3**: Verify RolePermission links role to roles:READ permission
- **STEP 4**: Complete permission chain verification (User → UserRole → Role → RolePermission → Permission)
- **STEP 5**: SQL to assign role to user
- **STEP 6**: SQL to link role to permission
- **STEP 7**: Query permission check logs for debugging
- **STEP 8**: Find user ID from Clerk or email
- **Quick Fix**: Direct user permission bypass (temporary)
- **Cache Invalidation**: Instructions for clearing stale cache

**Usage**:
1. Open the SQL file
2. Replace `<YOUR_USER_ID>` with actual user profile ID
3. Run queries step by step
4. Note which queries return empty results
5. Use the provided INSERT statements to fix missing data

---

#### B. Cache Invalidation API Endpoint

**File**: `backend/src/modules/permissions/controllers/permissions.controller.ts`

**New Endpoint**: `POST /api/v1/permissions/cache/invalidate`

**Request Body**:
```json
{
  "userProfileId": "user-id-here"  // Optional: omit to clear all caches
}
```

**Response**:
```json
{
  "success": true,
  "message": "Permission cache invalidated for user {userId}"
}
```

**Usage**:
```bash
curl -X POST http://localhost:3001/api/v1/permissions/cache/invalidate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userProfileId": "YOUR_USER_ID"}'
```

---

#### C. Permission Debug API Endpoint

**File**: `backend/src/modules/permissions/controllers/permissions.controller.ts` + `services/permissions.service.ts`

**New Endpoint**: `GET /api/v1/permissions/debug/:userProfileId`

**Query Parameters**:
- `resource` (optional): Filter by specific resource (e.g., "roles")
- `action` (optional): Filter by specific action (e.g., "READ")

**Response Example**:
```json
{
  "user": {
    "id": "user-id",
    "clerkUserId": "clerk-id",
    "nip": "12345",
    "isSuperadmin": false,
    "isActive": true
  },
  "roles": [
    {
      "id": "role-id",
      "code": "admin",
      "name": "Administrator",
      "isActive": true,
      "assignedAt": "2025-01-01T00:00:00Z",
      "validFrom": "2025-01-01T00:00:00Z",
      "validUntil": null
    }
  ],
  "directPermissionsCount": 0,
  "rolePermissionsCount": 25,
  "permissionAccess": [
    {
      "permission": {
        "id": "perm-id",
        "code": "roles:read",
        "resource": "roles",
        "action": "READ",
        "scope": "ALL"
      },
      "hasAccess": true,
      "grantedBy": {
        "directPermission": false,
        "roles": ["Administrator"]
      }
    }
  ],
  "summary": {
    "totalPermissionsChecked": 1,
    "permissionsGranted": 1,
    "permissionsDenied": 0,
    "rolesCount": 1
  }
}
```

**Usage**:
```bash
# Check specific permission
curl http://localhost:3001/api/v1/permissions/debug/YOUR_USER_ID?resource=roles&action=READ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check all permissions
curl http://localhost:3001/api/v1/permissions/debug/YOUR_USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## How to Diagnose Permission Issues

### Quick Diagnostic Flow

1. **Get your User ID**:
   ```sql
   SELECT id FROM gloria_ops.user_profiles WHERE "clerkUserId" = 'YOUR_CLERK_ID';
   ```

2. **Use Debug Endpoint**:
   ```bash
   GET /api/v1/permissions/debug/:userProfileId?resource=roles&action=READ
   ```

3. **Analyze Response**:
   - `hasAccess: false` → Permission not granted
   - `roles: []` → User has no roles
   - `permissionsGranted: 0` → No permissions found

4. **Run SQL Diagnostic Script**:
   - Execute queries in `backend/scripts/setup-roles-permission.sql`
   - Find which step returns empty results

5. **Fix Missing Data**:
   - Permission missing → Run STEP 1 INSERT
   - Role missing → Run STEP 5 INSERT
   - RolePermission missing → Run STEP 6 INSERT

6. **Clear Cache**:
   ```bash
   POST /api/v1/permissions/cache/invalidate
   Body: { "userProfileId": "YOUR_USER_ID" }
   ```

7. **Test**:
   - Reload RoleList page
   - Should now work without 403 error

---

## Testing Checklist

### Frontend Changes
- [ ] RoleList page loads without 403 error
- [ ] API calls use correct path (no duplicate `/api/v1`)
- [ ] Role CRUD operations work correctly
- [ ] Role assignment operations work
- [ ] Role hierarchy operations work

### Backend Changes
- [ ] Cache invalidation endpoint works
- [ ] Debug endpoint returns correct permission chain data
- [ ] Debug endpoint filters by resource and action
- [ ] Cache clears successfully after invalidation
- [ ] Permission checks work after cache clear

### Permission Setup
- [ ] Permission record exists: `resource='roles'`, `action='READ'`
- [ ] User has active role
- [ ] Role is linked to permission via RolePermission
- [ ] Complete permission chain verified via SQL STEP 4
- [ ] Cache invalidated after permission changes

---

## Common Issues & Solutions

### Issue 1: Still Getting 403 After Fixes

**Diagnosis**:
```bash
GET /api/v1/permissions/debug/:userProfileId?resource=roles&action=READ
```

**Solutions**:
1. Check `hasAccess: false` in response
2. Look at `grantedBy` - should show role or direct permission
3. If empty, run SQL diagnostic (STEP 4 of SQL script)
4. Create missing permission/role/link using SQL script
5. **IMPORTANT**: Clear cache after making changes

### Issue 2: Debug Endpoint Returns "Permission not found"

**Diagnosis**: Permission record doesn't exist in database

**Solution**:
```sql
INSERT INTO gloria_ops.permissions (
  id, code, name, description, resource, action, scope, "isActive", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'roles:read',
  'Read Roles',
  'Permission to view and list roles',
  'roles',
  'READ',
  'ALL',
  true,
  NOW(),
  NOW()
);
```

### Issue 3: User Has Role But Still No Access

**Diagnosis**: RolePermission link missing

**Solution**:
```sql
-- Get permission ID
SELECT id FROM gloria_ops.permissions WHERE resource = 'roles' AND action = 'READ';

-- Link role to permission
INSERT INTO gloria_ops.role_permissions (
  id, "roleId", "permissionId", "isGranted", "validFrom", "grantedBy", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'YOUR_ROLE_ID',
  'PERMISSION_ID_FROM_ABOVE',
  true,
  NOW(),
  'ADMIN_USER_ID',
  NOW(),
  NOW()
);
```

---

## Files Modified

### Frontend
1. `frontend/src/store/api/rolesApi.ts` - Fixed 16 API endpoint paths

### Backend
1. `backend/src/modules/permissions/controllers/permissions.controller.ts` - Added cache invalidation and debug endpoints
2. `backend/src/modules/permissions/services/permissions.service.ts` - Implemented `debugUserPermissions()` method
3. `backend/scripts/setup-roles-permission.sql` - New SQL diagnostic script

### Documentation
1. `IMPLEMENTATION_SUMMARY.md` - This file

---

## Next Steps

1. **Test the changes**:
   - Restart frontend dev server
   - Navigate to RoleList page
   - Should load without 403 error

2. **If still getting 403**:
   - Use debug endpoint to check permission chain
   - Run SQL diagnostic script to find missing data
   - Create missing permission/role/link
   - Clear cache via API endpoint
   - Test again

3. **Monitor permission check logs**:
   ```sql
   SELECT * FROM gloria_ops.permission_check_logs
   WHERE "userProfileId" = 'YOUR_USER_ID'
   ORDER BY "createdAt" DESC
   LIMIT 10;
   ```

---

## Support

If you continue to experience issues:

1. Run the debug endpoint and share the output
2. Run SQL STEP 4 (complete chain verification) and share results
3. Check permission check logs for detailed error information
4. Ensure cache was properly invalidated after making changes

The diagnostic tools should help identify exactly where the permission chain is broken.
