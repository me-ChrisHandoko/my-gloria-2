# Roles Backend-Frontend Alignment Analysis

## Overview

Analysis of backend `/permissions/controllers/roles.controller.ts` to identify frontend adjustments needed for proper alignment.

**Backend Controller**: `backend/src/modules/permissions/controllers/roles.controller.ts`
**Frontend Files**:
- RTK Query API: `src/store/api/rolesApi.ts`
- Service Class: `src/lib/api/services/roles.service.ts`
- Type Definitions: `src/lib/api/services/roles.service.ts`

---

## Endpoint Comparison Matrix

| Endpoint | Backend Path | Frontend rolesApi.ts | Frontend roles.service.ts | Status |
|----------|--------------|---------------------|---------------------------|---------|
| Create Role | `POST /roles` | ✅ `/roles` | ✅ `/api/v1/roles` | ALIGNED |
| List Roles | `GET /roles` | ✅ `/roles` | ✅ `/api/v1/roles` | ALIGNED |
| Get Statistics | `GET /roles/statistics` | ✅ `/roles/statistics` | ✅ `/api/v1/roles/statistics` | ALIGNED |
| Get by ID | `GET /roles/:id` | ✅ `/roles/:id` | ✅ `/api/v1/roles/:id` | ALIGNED |
| Get by Code | `GET /roles/code/:code` | ✅ `/roles/code/:code` | ✅ `/api/v1/roles/code/:code` | ALIGNED |
| Update Role | `PUT /roles/:id` | ✅ `/roles/:id` | ✅ `/api/v1/roles/:id` | ALIGNED |
| Assign Role | `POST /roles/assign` | ✅ `/roles/assign` | ✅ `/api/v1/roles/assign` | ALIGNED |
| **Delete Role** | `DELETE /roles/:id` | ✅ `/roles/:id` | ❌ **MISSING** | **MISALIGNED** |
| **Remove Role from User** | `DELETE /roles/users/:userProfileId/roles/:roleId` | ❌ `/roles/remove/:userProfileId/:roleId` | ❌ `/api/v1/roles/remove/:userProfileId/:roleId` | **CRITICAL MISMATCH** |
| Assign Permission | `POST /roles/:roleId/permissions` | ✅ `/roles/:roleId/permissions` | ✅ `/api/v1/roles/:roleId/permissions` | ALIGNED |
| Bulk Assign Permissions | `POST /roles/:roleId/permissions/bulk` | ✅ `/roles/:roleId/permissions/bulk` | ✅ `/api/v1/roles/:roleId/permissions/bulk` | ALIGNED |
| Remove Permission | `DELETE /roles/:roleId/permissions/:permissionId` | ✅ `/roles/:roleId/permissions/:permissionId` | ✅ `/api/v1/roles/:roleId/permissions/:permissionId` | ALIGNED |
| Create Hierarchy | `POST /roles/:roleId/hierarchy` | ✅ `/roles/:roleId/hierarchy` | ✅ `/api/v1/roles/:roleId/hierarchy` | ALIGNED |
| Get Hierarchy | `GET /roles/:roleId/hierarchy` | ✅ `/roles/:roleId/hierarchy` | ✅ `/api/v1/roles/:roleId/hierarchy` | ALIGNED |
| Create Template | `POST /roles/templates` | ✅ `/roles/templates` | ✅ `/api/v1/roles/templates` | ALIGNED |
| Apply Template | `POST /roles/templates/apply` | ✅ `/roles/templates/apply` | ✅ `/api/v1/roles/templates/apply` | ALIGNED |
| Get User Roles | `GET /roles/user/:userProfileId` | ✅ `/roles/user/:userProfileId` | ✅ `/api/v1/roles/user/:userProfileId` | ALIGNED |

---

## Issues Found

### 🔴 CRITICAL - Remove Role Path Mismatch

**Issue**: Frontend using completely different path for removing role from user

**Backend Controller** (`roles.controller.ts:215-236`):
```typescript
@Delete('users/:userProfileId/roles/:roleId')
async removeRoleFromUser(
  @Param('userProfileId') userProfileId: string,
  @Param('roleId') roleId: string,
  @CurrentUser() user: any,
) {
  await this.rolesService.removeRole(userProfileId, roleId, user.id);
}
```
- **Path**: `DELETE /roles/users/:userProfileId/roles/:roleId`

**Frontend rolesApi.ts** (`rolesApi.ts:183-196`):
```typescript
removeRole: builder.mutation<
  void,
  { userProfileId: string; roleId: string }
>({
  query: ({ userProfileId, roleId }) => ({
    url: `/roles/remove/${userProfileId}/${roleId}`,  // ❌ WRONG PATH
    method: 'DELETE',
  }),
  // ...
}),
```
- **Path**: `DELETE /roles/remove/:userProfileId/:roleId` ❌

**Frontend roles.service.ts** (`roles.service.ts:148-151`):
```typescript
async removeRole(userProfileId: string, roleId: string): Promise<void> {
  await apiClient.delete(`/api/v1/roles/remove/${userProfileId}/${roleId}`);  // ❌ WRONG PATH
}
```
- **Path**: `DELETE /api/v1/roles/remove/:userProfileId/:roleId` ❌

**Impact**:
- ⚠️ **404 Not Found** errors when attempting to remove role from user
- Feature is completely broken - cannot remove roles from users
- Any UI components using `useRemoveRoleMutation` will fail

**Files to Fix**:
1. `src/store/api/rolesApi.ts` - line 189
2. `src/lib/api/services/roles.service.ts` - line 150

---

### 🟡 MINOR - Missing deleteRole Method

**Issue**: deleteRole method missing from vanilla service class

**Backend Controller** (`roles.controller.ts:188-213`):
```typescript
@Delete(':id')
@RequiredPermission('roles', PermissionAction.DELETE)
async deleteRole(@Param('id') id: string, @CurrentUser() user: any) {
  return this.rolesService.deleteRole(id, user.id);
}
```
- **Path**: `DELETE /roles/:id` ✅

**Frontend rolesApi.ts** (`rolesApi.ts:158-168`):
```typescript
deleteRole: builder.mutation<void, string>({
  query: (id) => ({
    url: `/roles/${id}`,
    method: 'DELETE',
  }),
  // ...
}),
```
- **Path**: `DELETE /roles/:id` ✅ CORRECT

**Frontend roles.service.ts**:
- ❌ **Missing** deleteRole method

**Impact**:
- Low - Most components use RTK Query hooks
- Inconsistent API surface between service class and RTK Query
- Future components using vanilla service won't have access to deleteRole

**Files to Fix**:
1. `src/lib/api/services/roles.service.ts` - add deleteRole method

---

## Required Frontend Adjustments

### Fix 1: Update removeRole Path (CRITICAL)

**File**: `src/store/api/rolesApi.ts`

**Current** (line 188-191):
```typescript
query: ({ userProfileId, roleId }) => ({
  url: `/roles/remove/${userProfileId}/${roleId}`,  // ❌ WRONG
  method: 'DELETE',
}),
```

**Corrected**:
```typescript
query: ({ userProfileId, roleId }) => ({
  url: `/roles/users/${userProfileId}/roles/${roleId}`,  // ✅ CORRECT
  method: 'DELETE',
}),
```

---

**File**: `src/lib/api/services/roles.service.ts`

**Current** (line 149-151):
```typescript
async removeRole(userProfileId: string, roleId: string): Promise<void> {
  await apiClient.delete(`/api/v1/roles/remove/${userProfileId}/${roleId}`);  // ❌ WRONG
}
```

**Corrected**:
```typescript
async removeRole(userProfileId: string, roleId: string): Promise<void> {
  await apiClient.delete(`/api/v1/roles/users/${userProfileId}/roles/${roleId}`);  // ✅ CORRECT
}
```

---

### Fix 2: Add deleteRole Method (MINOR)

**File**: `src/lib/api/services/roles.service.ts`

**Add after updateRole method** (after line 140):
```typescript
// Delete role (soft delete)
async deleteRole(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/roles/${id}`);
}
```

---

## Type Definitions - Already Aligned ✅

All DTOs and interfaces in `roles.service.ts` match backend expectations:

- ✅ `Role` interface
- ✅ `RoleHierarchy` interface
- ✅ `UserRole` interface
- ✅ `CreateRoleDto`
- ✅ `UpdateRoleDto`
- ✅ `AssignRoleDto`
- ✅ `AssignRolePermissionDto`
- ✅ `BulkAssignRolePermissionsDto`
- ✅ `CreateRoleTemplateDto`
- ✅ `ApplyRoleTemplateDto`
- ✅ `CreateRoleHierarchyDto`
- ✅ `QueryRoleParams`

---

## Testing Recommendations

After applying fixes, test the following scenarios:

### Critical - Remove Role from User
1. Navigate to user roles management
2. Attempt to remove a role from a user
3. Verify success (currently will fail with 404)

### Minor - Delete Role
1. Navigate to roles list
2. Attempt to delete a role
3. Verify deletion works (should already work via RTK Query)

---

## Summary

**Total Issues**: 2
- **Critical**: 1 (removeRole path mismatch causing 404 errors)
- **Minor**: 1 (deleteRole missing from vanilla service)

**Files Requiring Changes**: 2
1. `src/store/api/rolesApi.ts` - Fix removeRole path
2. `src/lib/api/services/roles.service.ts` - Fix removeRole path + add deleteRole method

**Impact**:
- High - Remove role feature is currently broken and unusable
- Low - deleteRole inconsistency (RTK Query works, vanilla service incomplete)

**Recommendation**: Apply fixes immediately, especially the critical removeRole path correction.
