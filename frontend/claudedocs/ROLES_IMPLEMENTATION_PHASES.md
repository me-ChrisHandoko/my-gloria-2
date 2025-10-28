# Roles Backend-Frontend Alignment - Implementation Phases

**Generated:** 2025-10-27
**Scope:** Phased implementation plan untuk menyelaraskan frontend dengan backend roles controller
**Total Estimated Time:** 7-9 hours (excluding UI components)

---

## 📋 Implementation Overview

### Total Changes Required:
- ✅ **1 DTO Removal** (critical fix)
- ✅ **3 New DTOs** (interfaces)
- ✅ **2 DTO Improvements** (type safety)
- ✅ **7 Service Methods** (API client)
- ✅ **7 RTK Query Endpoints** (4 queries + 3 mutations)
- ✅ **7 New Hooks** (exports)

### Files to Modify:
1. `src/lib/api/services/roles.service.ts` - DTOs + Service Methods
2. `src/store/api/rolesApi.ts` - RTK Query Endpoints + Hooks

---

## 🚀 PHASE 0: Preparation & Setup

**Duration:** 15 minutes
**Priority:** P0 - MANDATORY
**Risk Level:** 🟢 Low

### Tasks:

#### 1. Create Feature Branch
```bash
git checkout -b feature/roles-backend-alignment
git status
```

#### 2. Backup Current Files
```bash
cp src/lib/api/services/roles.service.ts src/lib/api/services/roles.service.ts.backup
cp src/store/api/rolesApi.ts src/store/api/rolesApi.ts.backup
```

#### 3. Verify Backend Endpoints (Optional but Recommended)
Test key endpoints dengan curl atau Postman:
```bash
# Test template endpoints
GET /api/v1/roles/templates
GET /api/v1/roles/templates/{id}

# Test user endpoints
GET /api/v1/roles/{roleId}/users
GET /api/v1/roles/{roleId}/modules

# Test temporal update
PUT /api/v1/roles/users/{userProfileId}/roles/{roleId}
```

#### 4. Create Test Environment
- Setup local backend running
- Prepare test data (roles, users, templates)
- Configure API client for local testing

### Success Criteria:
- ✅ Git branch created
- ✅ Backup files exist
- ✅ Backend endpoints verified (optional)
- ✅ Test environment ready

---

## 🔴 PHASE 1: Critical Fixes

**Duration:** 30-45 minutes
**Priority:** P0 - CRITICAL
**Risk Level:** 🟢 Low (removal only)
**File:** `src/lib/api/services/roles.service.ts`

### Why Critical:
Frontend saat ini mengirim field `code` yang **ditolak** oleh backend karena immutable. Ini menyebabkan update role gagal.

### Task 1.1: Remove `code` from UpdateRoleDto

**Location:** `roles.service.ts` line ~55-60

**Current Code:**
```typescript
export interface UpdateRoleDto {
  name?: string;
  code?: string;  // ❌ REMOVE THIS LINE
  hierarchyLevel?: number;
  description?: string;
  isSystemRole?: boolean;
  isActive?: boolean;
}
```

**Corrected Code:**
```typescript
export interface UpdateRoleDto {
  name?: string;
  // code is immutable - cannot be updated
  hierarchyLevel?: number;
  description?: string;
  isSystemRole?: boolean;
  isActive?: boolean;
}
```

### Verification:
```bash
# TypeScript should compile without errors
npm run typecheck

# Test update role without code field
# The request should NOT include "code" in payload
```

### Commit:
```bash
git add src/lib/api/services/roles.service.ts
git commit -m "fix(roles): remove immutable code field from UpdateRoleDto

- Backend explicitly rejects code field updates
- Field is commented out in backend DTO
- Prevents 400 Bad Request on role updates"
```

### Success Criteria:
- ✅ `code` field removed from `UpdateRoleDto`
- ✅ TypeScript compiles successfully
- ✅ No breaking changes to existing code
- ✅ Update role requests don't send `code` field

---

## 📐 PHASE 2: DTO Foundation

**Duration:** 45-60 minutes
**Priority:** P1 - HIGH
**Risk Level:** 🟢 Low (type definitions only)
**File:** `src/lib/api/services/roles.service.ts`
**Dependencies:** None

### Why This Phase:
DTOs adalah foundation untuk semua service methods dan RTK Query endpoints. Harus selesai sebelum Phase 3-4.

---

### Task 2.1: Add UpdateUserRoleTemporalDto

**Location:** After `AssignRoleDto` (~line 67)

```typescript
export interface UpdateUserRoleTemporalDto {
  validFrom?: string;
  validUntil?: string;
}
```

**Backend Reference:** `backend/src/modules/permissions/dto/role.dto.ts:120-134`

---

### Task 2.2: Add RoleTemplate Interface

**Location:** After `UserRole` interface (~line 42)

```typescript
export interface RoleTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  permissions: string[]; // Array of permission IDs
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
```

**Backend Reference:** Prisma schema `RoleTemplate` model

---

### Task 2.3: Add RoleUser Interface

**Location:** After `UserRole` interface (~line 42)

```typescript
export interface RoleUser extends UserRole {
  userProfile?: {
    id: string;
    dataKaryawan?: any; // Based on your employee data structure
  };
}
```

**Purpose:** For `getRoleUsers()` endpoint that includes user profile data

---

### Task 2.4: Fix ApplyRoleTemplateDto

**Location:** ~line 93-96

**Current Code:**
```typescript
export interface ApplyRoleTemplateDto {
  templateId: string;
  roleId: string;
}
```

**Corrected Code:**
```typescript
export interface ApplyRoleTemplateDto {
  templateId: string;
  roleId: string;
  overrideExisting?: boolean; // ✅ ADD THIS
}
```

**Backend Reference:** `backend/src/modules/permissions/dto/role.dto.ts:222-238`

---

### Task 2.5: Fix CreateRoleTemplateDto (Type Safety)

**Location:** ~line 85-91

**Current Code:**
```typescript
export interface CreateRoleTemplateDto {
  code: string;
  name: string;
  description?: string;
  category: string;
  permissions: any; // ❌ Too permissive
}
```

**Corrected Code:**
```typescript
export interface CreateRoleTemplateDto {
  code: string;
  name: string;
  description?: string;
  category: string;
  permissionIds: string[]; // ✅ Type-safe array of UUIDs
}
```

**Backend Reference:** `backend/src/modules/permissions/dto/role.dto.ts:191-220`

---

### Verification:
```bash
npm run typecheck
# Should pass with no errors

# Verify interfaces are exported
grep -n "export interface" src/lib/api/services/roles.service.ts
```

### Commit:
```bash
git add src/lib/api/services/roles.service.ts
git commit -m "feat(roles): add missing DTOs and improve type safety

- Add UpdateUserRoleTemporalDto for temporal updates
- Add RoleTemplate interface for template CRUD
- Add RoleUser interface with profile relations
- Add overrideExisting to ApplyRoleTemplateDto
- Change CreateRoleTemplateDto.permissions to permissionIds (type-safe)"
```

### Success Criteria:
- ✅ 3 new interfaces added
- ✅ 2 existing DTOs improved
- ✅ TypeScript compiles successfully
- ✅ All interfaces properly exported
- ✅ No breaking changes to existing code

---

## 🔧 PHASE 3: Service Layer Methods

**Duration:** 2-2.5 hours
**Priority:** P1-P2
**Risk Level:** 🟡 Medium (API calls)
**File:** `src/lib/api/services/roles.service.ts`
**Dependencies:** Phase 2 (DTOs must exist)

---

### Task 3.1: Update User Role Temporal (30 mins)

**Priority:** P1 - HIGH
**Backend:** `PUT /roles/users/:userProfileId/roles/:roleId`
**Controller:** `roles.controller.ts:247-288`

**Location:** After `removeRole()` method (~line 156)

```typescript
/**
 * Update role assignment temporal fields (validFrom, validUntil)
 * Allows updating assignment validity dates without reassigning role
 */
async updateUserRoleTemporal(
  userProfileId: string,
  roleId: string,
  data: UpdateUserRoleTemporalDto
): Promise<UserRole> {
  const response = await apiClient.put(
    `/api/v1/roles/users/${userProfileId}/roles/${roleId}`,
    data
  );
  return response.data;
}
```

---

### Task 3.2: Delete Role Hierarchy (20 mins)

**Priority:** P2 - HIGH
**Backend:** `DELETE /roles/:roleId/hierarchy/:parentRoleId`
**Controller:** `roles.controller.ts:419-440`

**Location:** After `getRoleHierarchy()` method (~line 220)

```typescript
/**
 * Delete role hierarchy relationship
 * Removes parent-child relationship between roles
 */
async deleteRoleHierarchy(
  roleId: string,
  parentRoleId: string
): Promise<void> {
  await apiClient.delete(
    `/api/v1/roles/${roleId}/hierarchy/${parentRoleId}`
  );
}
```

---

### Task 3.3: Get Role Templates (20 mins)

**Priority:** P2 - HIGH
**Backend:** `GET /roles/templates`
**Controller:** `roles.controller.ts:442-451`

**Location:** After `applyRoleTemplate()` method (~line 235)

```typescript
/**
 * Get all role templates
 * @param includeInactive - Include inactive templates (default: false)
 */
async getRoleTemplates(includeInactive = false): Promise<RoleTemplate[]> {
  const response = await apiClient.get('/api/v1/roles/templates', {
    params: { includeInactive }
  });
  return response.data;
}
```

---

### Task 3.4: Get Role Template By ID (15 mins)

**Priority:** P2 - HIGH
**Backend:** `GET /roles/templates/:id`
**Controller:** `roles.controller.ts:453-467`

**Location:** After `getRoleTemplates()` method

```typescript
/**
 * Get role template by ID
 */
async getRoleTemplateById(id: string): Promise<RoleTemplate> {
  const response = await apiClient.get(`/api/v1/roles/templates/${id}`);
  return response.data;
}
```

---

### Task 3.5: Delete Role Template (15 mins)

**Priority:** P2 - HIGH
**Backend:** `DELETE /roles/templates/:id`
**Controller:** `roles.controller.ts:499-525`

**Location:** After `getRoleTemplateById()` method

```typescript
/**
 * Delete role template (soft delete)
 * Marks template as inactive
 */
async deleteRoleTemplate(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/roles/templates/${id}`);
}
```

---

### Task 3.6: Get Role Users (20 mins)

**Priority:** P2 - HIGH
**Backend:** `GET /roles/:roleId/users`
**Controller:** `roles.controller.ts:558-572`

**Location:** After `getUserRoles()` method (~line 162)

```typescript
/**
 * Get users assigned to a role
 * Returns list of users with their profile information
 */
async getRoleUsers(roleId: string): Promise<RoleUser[]> {
  const response = await apiClient.get(`/api/v1/roles/${roleId}/users`);
  return response.data;
}
```

---

### Task 3.7: Get Role Modules (15 mins)

**Priority:** P3 - MEDIUM
**Backend:** `GET /roles/:roleId/modules`
**Controller:** `roles.controller.ts:539-556`

**Location:** After `getRoleUsers()` method

```typescript
/**
 * Get modules accessible by role (convenience endpoint)
 * Read-only convenience method - full CRUD in roleModuleAccessApi
 */
async getRoleModules(roleId: string): Promise<any[]> {
  const response = await apiClient.get(`/api/v1/roles/${roleId}/modules`);
  return response.data;
}
```

**Note:** Ini convenience endpoint. Full CRUD untuk role-module access ada di `roleModuleAccessApi.ts`

---

### Verification:
```bash
# TypeScript compilation
npm run typecheck

# Verify all methods exist
grep -n "async.*Role" src/lib/api/services/roles.service.ts

# Count methods (should be 7 new methods)
grep -c "async.*Role.*(" src/lib/api/services/roles.service.ts
```

### Commit:
```bash
git add src/lib/api/services/roles.service.ts
git commit -m "feat(roles): add 7 missing service methods

Service methods added:
- updateUserRoleTemporal: Update role assignment dates
- deleteRoleHierarchy: Remove hierarchy relationships
- getRoleTemplates: List all templates
- getRoleTemplateById: Get single template
- deleteRoleTemplate: Soft delete template
- getRoleUsers: Get users assigned to role
- getRoleModules: Get accessible modules (convenience)

All methods match backend controller endpoints"
```

### Success Criteria:
- ✅ 7 new service methods implemented
- ✅ All methods have JSDoc comments
- ✅ Correct HTTP methods used (GET/PUT/DELETE)
- ✅ Correct endpoint paths matching backend
- ✅ TypeScript compiles successfully
- ✅ Return types match DTOs

---

## 🏪 PHASE 4: RTK Query Endpoints

**Duration:** 2-2.5 hours
**Priority:** P1-P2
**Risk Level:** 🟡 Medium (cache invalidation logic)
**File:** `src/store/api/rolesApi.ts`
**Dependencies:** Phase 3 (service methods must exist)

---

### Part A: Query Endpoints (90 mins)

---

#### Task 4A.1: Get Role Templates Query (20 mins)

**Location:** After `getRoleHierarchy` query (~line 131)

```typescript
// Get all role templates
getRoleTemplates: builder.query<RoleTemplate[], boolean | void>({
  query: (includeInactive = false) => ({
    url: '/roles/templates',
    params: { includeInactive },
  }),
  transformResponse: (response: any) => {
    // Handle wrapped response from backend TransformInterceptor
    if (response && response.success && response.data) {
      return response.data;
    }
    return response || [];
  },
  providesTags: [{ type: 'Role', id: 'TEMPLATES' }],
  keepUnusedDataFor: 60, // Cache for 60 seconds
}),
```

---

#### Task 4A.2: Get Role Template By ID Query (15 mins)

**Location:** After `getRoleTemplates` query

```typescript
// Get role template by ID
getRoleTemplateById: builder.query<RoleTemplate, string>({
  query: (id) => `/roles/templates/${id}`,
  transformResponse: (response: any) => {
    if (response && response.success && response.data) {
      return response.data;
    }
    return response;
  },
  providesTags: (_result, _error, id) => [
    { type: 'Role', id: `template-${id}` },
  ],
}),
```

---

#### Task 4A.3: Get Role Users Query (20 mins)

**Location:** After `getUserRoles` query (~line 117)

```typescript
// Get users assigned to a role
getRoleUsers: builder.query<RoleUser[], string>({
  query: (roleId) => `/roles/${roleId}/users`,
  transformResponse: (response: any) => {
    if (response && response.success && response.data) {
      return response.data;
    }
    return response || [];
  },
  providesTags: (_result, _error, roleId) => [
    { type: 'Role', id: `users-${roleId}` },
  ],
}),
```

---

#### Task 4A.4: Get Role Modules Query (15 mins)

**Location:** After `getRoleUsers` query

```typescript
// Get modules accessible by role (convenience endpoint)
getRoleModules: builder.query<any[], string>({
  query: (roleId) => `/roles/${roleId}/modules`,
  transformResponse: (response: any) => {
    if (response && response.success && response.data) {
      return response.data;
    }
    return response || [];
  },
  providesTags: (_result, _error, roleId) => [
    { type: 'Role', id: `modules-${roleId}` },
  ],
}),
```

---

### Part B: Mutation Endpoints (60 mins)

---

#### Task 4B.1: Update User Role Temporal Mutation (25 mins)

**Location:** After `removeRole` mutation (~line 196)

```typescript
// Update user role temporal fields (validFrom, validUntil)
updateUserRoleTemporal: builder.mutation<
  UserRole,
  {
    userProfileId: string;
    roleId: string;
    data: UpdateUserRoleTemporalDto;
  }
>({
  query: ({ userProfileId, roleId, data }) => ({
    url: `/roles/users/${userProfileId}/roles/${roleId}`,
    method: 'PUT',
    body: data,
  }),
  // Invalidate both user roles and specific role caches
  invalidatesTags: (_result, _error, { userProfileId, roleId }) => [
    { type: 'Role', id: `user-${userProfileId}` },
    { type: 'Role', id: roleId },
    { type: 'Role', id: 'LIST' },
  ],
}),
```

---

#### Task 4B.2: Delete Role Hierarchy Mutation (20 mins)

**Location:** After `createRoleHierarchy` mutation (~line 256)

```typescript
// Delete role hierarchy relationship
deleteRoleHierarchy: builder.mutation<
  void,
  { roleId: string; parentRoleId: string }
>({
  query: ({ roleId, parentRoleId }) => ({
    url: `/roles/${roleId}/hierarchy/${parentRoleId}`,
    method: 'DELETE',
  }),
  invalidatesTags: (_result, _error, { roleId }) => [
    { type: 'Role', id: `hierarchy-${roleId}` },
    { type: 'Role', id: roleId },
    { type: 'Role', id: 'LIST' },
  ],
}),
```

---

#### Task 4B.3: Delete Role Template Mutation (15 mins)

**Location:** After `applyRoleTemplate` mutation (~line 279)

```typescript
// Delete role template (soft delete)
deleteRoleTemplate: builder.mutation<void, string>({
  query: (id) => ({
    url: `/roles/templates/${id}`,
    method: 'DELETE',
  }),
  invalidatesTags: (_result, _error, id) => [
    { type: 'Role', id: `template-${id}` },
    { type: 'Role', id: 'TEMPLATES' },
  ],
}),
```

---

### Part C: Export Hooks (15 mins)

**Location:** Update export block (~line 285-307)

**Current Exports:**
```typescript
export const {
  // Queries
  useGetRolesQuery,
  useLazyGetRolesQuery,
  useGetRoleByIdQuery,
  useLazyGetRoleByIdQuery,
  useGetRoleByCodeQuery,
  useGetUserRolesQuery,
  useGetRoleStatisticsQuery,
  useGetRoleHierarchyQuery,
  // Mutations
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useAssignRoleMutation,
  useRemoveRoleMutation,
  useAssignPermissionToRoleMutation,
  useBulkAssignPermissionsToRoleMutation,
  useRemovePermissionFromRoleMutation,
  useCreateRoleHierarchyMutation,
  useCreateRoleTemplateMutation,
  useApplyRoleTemplateMutation,
} = rolesApi;
```

**Updated Exports (add these lines):**
```typescript
export const {
  // Existing queries...
  useGetRolesQuery,
  useLazyGetRolesQuery,
  useGetRoleByIdQuery,
  useLazyGetRoleByIdQuery,
  useGetRoleByCodeQuery,
  useGetUserRolesQuery,
  useGetRoleStatisticsQuery,
  useGetRoleHierarchyQuery,

  // ✅ NEW QUERIES - ADD THESE:
  useGetRoleTemplatesQuery,
  useLazyGetRoleTemplatesQuery,
  useGetRoleTemplateByIdQuery,
  useLazyGetRoleTemplateByIdQuery,
  useGetRoleUsersQuery,
  useLazyGetRoleUsersQuery,
  useGetRoleModulesQuery,
  useLazyGetRoleModulesQuery,

  // Existing mutations...
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useAssignRoleMutation,
  useRemoveRoleMutation,
  useAssignPermissionToRoleMutation,
  useBulkAssignPermissionsToRoleMutation,
  useRemovePermissionFromRoleMutation,
  useCreateRoleHierarchyMutation,
  useCreateRoleTemplateMutation,
  useApplyRoleTemplateMutation,

  // ✅ NEW MUTATIONS - ADD THESE:
  useUpdateUserRoleTemporalMutation,
  useDeleteRoleHierarchyMutation,
  useDeleteRoleTemplateMutation,
} = rolesApi;
```

---

### Verification:
```bash
# TypeScript compilation
npm run typecheck

# Verify all endpoints registered
grep "builder.query\|builder.mutation" src/store/api/rolesApi.ts | wc -l
# Should show 7 more than before

# Verify hooks exported
grep "use.*Query\|use.*Mutation" src/store/api/rolesApi.ts | wc -l
```

### Commit:
```bash
git add src/store/api/rolesApi.ts
git commit -m "feat(roles): add 7 RTK Query endpoints and hooks

Queries added (4):
- getRoleTemplates: List all role templates
- getRoleTemplateById: Get template details
- getRoleUsers: Get users assigned to role
- getRoleModules: Get accessible modules

Mutations added (3):
- updateUserRoleTemporal: Update assignment dates
- deleteRoleHierarchy: Remove hierarchy relationship
- deleteRoleTemplate: Soft delete template

Hooks exported (7):
- useGetRoleTemplatesQuery (+ lazy variant)
- useGetRoleTemplateByIdQuery (+ lazy variant)
- useGetRoleUsersQuery (+ lazy variant)
- useGetRoleModulesQuery (+ lazy variant)
- useUpdateUserRoleTemporalMutation
- useDeleteRoleHierarchyMutation
- useDeleteRoleTemplateMutation

All endpoints include proper cache invalidation tags"
```

### Success Criteria:
- ✅ 4 new query endpoints added
- ✅ 3 new mutation endpoints added
- ✅ 7 new hooks exported (+ lazy variants)
- ✅ Proper cache tags configured
- ✅ Transform responses handle backend wrapper
- ✅ TypeScript compiles successfully
- ✅ No duplicate endpoint names

---

## ✅ PHASE 5: Testing & Validation

**Duration:** 1.5-2 hours
**Priority:** P0 - MANDATORY
**Risk Level:** 🟢 Low (validation only)
**Dependencies:** All previous phases complete

---

### Part A: Unit Testing (45 mins)

#### Task 5A.1: DTO Type Checking (15 mins)

**Create:** `src/lib/api/services/__tests__/roles.types.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import type {
  UpdateRoleDto,
  UpdateUserRoleTemporalDto,
  RoleTemplate,
  RoleUser,
  ApplyRoleTemplateDto,
  CreateRoleTemplateDto,
} from '../roles.service';

describe('Roles DTOs', () => {
  it('UpdateRoleDto should not have code field', () => {
    const dto: UpdateRoleDto = {
      name: 'Test',
      hierarchyLevel: 5,
    };

    // TypeScript should prevent this:
    // @ts-expect-error - code should not exist
    dto.code = 'test';
  });

  it('UpdateUserRoleTemporalDto should have optional dates', () => {
    const dto: UpdateUserRoleTemporalDto = {
      validFrom: '2024-01-01',
    };
    expect(dto).toBeDefined();
  });

  it('ApplyRoleTemplateDto should have overrideExisting', () => {
    const dto: ApplyRoleTemplateDto = {
      templateId: 'uuid',
      roleId: 'uuid',
      overrideExisting: true,
    };
    expect(dto.overrideExisting).toBe(true);
  });

  it('CreateRoleTemplateDto should use permissionIds array', () => {
    const dto: CreateRoleTemplateDto = {
      code: 'ADMIN_TEMPLATE',
      name: 'Admin Template',
      category: 'admin',
      permissionIds: ['uuid1', 'uuid2'],
    };
    expect(Array.isArray(dto.permissionIds)).toBe(true);
  });
});
```

---

#### Task 5A.2: Service Method Testing (30 mins)

**Create:** `src/lib/api/services/__tests__/roles.service.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { rolesService } from '../roles.service';
import apiClient from '../../client';

vi.mock('../../client');

describe('Roles Service - New Methods', () => {
  it('updateUserRoleTemporal should call correct endpoint', async () => {
    const mockResponse = { data: { id: 'role-id' } };
    vi.mocked(apiClient.put).mockResolvedValue(mockResponse);

    await rolesService.updateUserRoleTemporal('user-id', 'role-id', {
      validFrom: '2024-01-01',
    });

    expect(apiClient.put).toHaveBeenCalledWith(
      '/api/v1/roles/users/user-id/roles/role-id',
      { validFrom: '2024-01-01' }
    );
  });

  it('deleteRoleHierarchy should call correct endpoint', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({});

    await rolesService.deleteRoleHierarchy('role-id', 'parent-id');

    expect(apiClient.delete).toHaveBeenCalledWith(
      '/api/v1/roles/role-id/hierarchy/parent-id'
    );
  });

  it('getRoleTemplates should pass includeInactive param', async () => {
    const mockResponse = { data: [] };
    vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

    await rolesService.getRoleTemplates(true);

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/roles/templates', {
      params: { includeInactive: true }
    });
  });

  // Add tests for other methods...
});
```

**Run Tests:**
```bash
npm run test -- roles.service.test
npm run test -- roles.types.test
```

---

### Part B: Integration Testing (45 mins)

#### Task 5B.1: RTK Query Endpoint Testing (30 mins)

**Create:** `src/store/api/__tests__/rolesApi.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { setupApiStore } from './test-utils';
import { rolesApi } from '../rolesApi';

describe('Roles API - New Endpoints', () => {
  it('getRoleTemplates should fetch templates', async () => {
    const storeRef = setupApiStore(rolesApi);

    await storeRef.store.dispatch(
      rolesApi.endpoints.getRoleTemplates.initiate(false)
    );

    expect(storeRef.api.queries).toHaveProperty('getRoleTemplates(false)');
  });

  it('updateUserRoleTemporal should invalidate correct tags', async () => {
    const storeRef = setupApiStore(rolesApi);
    const mutation = rolesApi.endpoints.updateUserRoleTemporal;

    const tags = mutation.invalidatesTags?.(
      {} as any,
      null as any,
      { userProfileId: 'user-1', roleId: 'role-1', data: {} }
    );

    expect(tags).toContainEqual({ type: 'Role', id: 'user-user-1' });
    expect(tags).toContainEqual({ type: 'Role', id: 'role-1' });
  });

  // Add tests for cache invalidation logic...
});
```

---

#### Task 5B.2: Cache Behavior Testing (15 mins)

Test cache invalidation:
```typescript
it('deleteRoleTemplate should invalidate template cache', async () => {
  const storeRef = setupApiStore(rolesApi);

  // First, populate cache
  await storeRef.store.dispatch(
    rolesApi.endpoints.getRoleTemplates.initiate(false)
  );

  // Delete template
  await storeRef.store.dispatch(
    rolesApi.endpoints.deleteRoleTemplate.initiate('template-1')
  );

  // Cache should be invalidated
  const state = storeRef.store.getState();
  expect(state.api.queries).not.toHaveProperty('getRoleTemplates');
});
```

**Run Tests:**
```bash
npm run test -- rolesApi.test
```

---

### Part C: Manual Testing (30 mins)

#### Task 5C.1: API Endpoint Testing with Postman/Thunder Client

**Test Checklist:**

1. **Update User Role Temporal** ✅
   ```
   PUT /api/v1/roles/users/{userProfileId}/roles/{roleId}
   Body: {
     "validFrom": "2024-01-01T00:00:00Z",
     "validUntil": "2024-12-31T23:59:59Z"
   }
   Expected: 200 OK with updated UserRole
   ```

2. **Delete Role Hierarchy** ✅
   ```
   DELETE /api/v1/roles/{roleId}/hierarchy/{parentRoleId}
   Expected: 204 No Content
   ```

3. **Get Role Templates** ✅
   ```
   GET /api/v1/roles/templates?includeInactive=false
   Expected: 200 OK with RoleTemplate[]
   ```

4. **Get Role Template By ID** ✅
   ```
   GET /api/v1/roles/templates/{id}
   Expected: 200 OK with RoleTemplate
   ```

5. **Delete Role Template** ✅
   ```
   DELETE /api/v1/roles/templates/{id}
   Expected: 204 No Content
   ```

6. **Get Role Users** ✅
   ```
   GET /api/v1/roles/{roleId}/users
   Expected: 200 OK with RoleUser[]
   ```

7. **Get Role Modules** ✅
   ```
   GET /api/v1/roles/{roleId}/modules
   Expected: 200 OK with Module[]
   ```

---

#### Task 5C.2: Frontend Integration Testing

**Test in Browser DevTools:**

```typescript
// Open browser console in your app
import { store } from '@/store';

// Test getRoleTemplates
const result = await store.dispatch(
  rolesApi.endpoints.getRoleTemplates.initiate(false)
);
console.log('Templates:', result.data);

// Test updateUserRoleTemporal
const updateResult = await store.dispatch(
  rolesApi.endpoints.updateUserRoleTemporal.initiate({
    userProfileId: 'test-user-id',
    roleId: 'test-role-id',
    data: { validFrom: '2024-01-01' }
  })
);
console.log('Update result:', updateResult);

// Verify cache invalidation
console.log('Cache state:', store.getState().api);
```

---

#### Task 5C.3: Network Request Verification

**Check in Browser Network Tab:**

1. ✅ Requests use correct HTTP methods (GET/PUT/DELETE)
2. ✅ Request paths match backend routes exactly
3. ✅ Request bodies match DTO structures
4. ✅ Responses are properly transformed
5. ✅ Cache is populated and invalidated correctly
6. ✅ Error handling works (test with invalid IDs)

---

### Verification Checklist:

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual API tests successful for all 7 endpoints
- [ ] Frontend hooks work in browser
- [ ] Cache invalidation verified
- [ ] Network requests use correct paths
- [ ] Error handling works properly
- [ ] TypeScript compilation successful
- [ ] No console errors or warnings
- [ ] Performance acceptable (check Network timing)

---

### Commit:
```bash
git add src/**/__tests__/**
git commit -m "test(roles): add comprehensive tests for new endpoints

- Unit tests for DTOs and service methods
- Integration tests for RTK Query endpoints
- Cache invalidation validation
- Manual testing completed for all 7 endpoints

All tests passing ✅"
```

### Success Criteria:
- ✅ All automated tests pass
- ✅ Manual testing verified all endpoints
- ✅ Cache behavior validated
- ✅ Network requests confirmed correct
- ✅ Error handling tested
- ✅ No regressions in existing functionality

---

## 🎨 PHASE 6: UI Components (OPTIONAL)

**Duration:** 6-9 hours
**Priority:** P2-P3 - OPTIONAL
**Risk Level:** 🟢 Low (UI only)
**Dependencies:** Phase 4 (RTK Query hooks must exist)

**Note:** Phase ini OPSIONAL - tidak required untuk backend alignment. Hanya jika Anda ingin membuat UI untuk fitur-fitur baru.

---

### Part A: Role Templates UI (2-3 hours)

#### Component 6A.1: RoleTemplateList Component

**Create:** `src/components/features/permissions/roles/templates/RoleTemplateList.tsx`

**Features:**
- Display templates in DataTable
- Search and filter by category
- View/Delete actions per row
- Create new template button

**Hooks Used:**
- `useGetRoleTemplatesQuery(includeInactive)`
- `useDeleteRoleTemplateMutation()`

---

#### Component 6A.2: ViewRoleTemplateModal Component

**Features:**
- Display template details
- Show associated permissions list
- Apply template button (with override option)

**Hooks Used:**
- `useGetRoleTemplateByIdQuery(templateId)`
- `useApplyRoleTemplateMutation()`

---

#### Component 6A.3: DeleteRoleTemplateModal Component

**Features:**
- Confirmation dialog
- Show template usage count warning
- Soft delete confirmation

**Hooks Used:**
- `useDeleteRoleTemplateMutation()`

---

### Part B: Role Users UI (1-2 hours)

#### Component 6B.1: RoleUsersTab Component

**Create:** `src/components/features/permissions/roles/RoleUsersTab.tsx`

**Features:**
- Display users assigned to role
- Show user profile info
- Show assignment dates (validFrom/validUntil)
- Edit temporal fields button
- Remove user from role button

**Hooks Used:**
- `useGetRoleUsersQuery(roleId)`
- `useRemoveRoleMutation()`

---

### Part C: Temporal Updates UI (1-2 hours)

#### Component 6C.1: UpdateRoleTemporalModal Component

**Create:** `src/components/features/permissions/roles/UpdateRoleTemporalModal.tsx`

**Features:**
- Date pickers for validFrom/validUntil
- Validation (validFrom < validUntil)
- Save button

**Hooks Used:**
- `useUpdateUserRoleTemporalMutation()`

**Integration:**
Add button to `ViewRoleModal` or user roles list to open this modal.

---

### Part D: Hierarchy Management UI (1-2 hours)

#### Component 6D.1: RoleHierarchyTab Component

**Create:** `src/components/features/permissions/roles/RoleHierarchyTab.tsx`

**Features:**
- Display parent-child relationships
- Tree visualization (optional)
- Delete relationship button per item
- Confirmation dialog

**Hooks Used:**
- `useGetRoleHierarchyQuery(roleId)`
- `useDeleteRoleHierarchyMutation()`

---

### UI Testing Checklist:

- [ ] All components render without errors
- [ ] DataTables display data correctly
- [ ] Modals open and close properly
- [ ] Forms validate inputs
- [ ] Success toasts show on mutations
- [ ] Error toasts show on failures
- [ ] Loading states displayed correctly
- [ ] Empty states handled
- [ ] Responsive on mobile
- [ ] Accessibility (keyboard navigation, ARIA labels)

---

### Commit Pattern for UI:
```bash
git add src/components/features/permissions/roles/templates/*
git commit -m "feat(roles): add role templates UI components

- RoleTemplateList with search and filters
- ViewRoleTemplateModal with details
- DeleteRoleTemplateModal with confirmation
- Apply template with override option

Uses new RTK Query hooks for data fetching"
```

---

## 📊 Implementation Summary

### Total Phases: 6 (5 required + 1 optional)

| Phase | Duration | Priority | Risk | Status |
|-------|----------|----------|------|--------|
| 0 - Preparation | 15 mins | P0 | 🟢 Low | ⬜ Not Started |
| 1 - Critical Fixes | 30-45 mins | P0 | 🟢 Low | ⬜ Not Started |
| 2 - DTO Foundation | 45-60 mins | P1 | 🟢 Low | ⬜ Not Started |
| 3 - Service Methods | 2-2.5 hrs | P1-P2 | 🟡 Medium | ⬜ Not Started |
| 4 - RTK Query | 2-2.5 hrs | P1-P2 | 🟡 Medium | ⬜ Not Started |
| 5 - Testing | 1.5-2 hrs | P0 | 🟢 Low | ⬜ Not Started |
| 6 - UI Components | 6-9 hrs | P2-P3 | 🟢 Low | ⬜ Optional |

### Required Time: **7-9 hours** (Phases 0-5)
### Optional Time: **+6-9 hours** (Phase 6 UI)
### Total Time: **13-18 hours** (all phases)

---

## 🚀 Deployment Strategy

### Recommended: Phased Rollout (Option C)

#### Stage 1: Critical Fixes (After Phase 1-2)
```bash
git push origin feature/roles-backend-alignment
# Create PR: "fix(roles): critical DTO fixes"
# Deploy to staging → Test → Deploy to production
```

**Deployment Scope:**
- UpdateRoleDto.code removal
- All new DTOs

**Impact:** Minimal - fixes broken update functionality

---

#### Stage 2: API Alignment (After Phase 3-4)
```bash
# Create PR: "feat(roles): complete backend API alignment"
# Deploy to staging → Comprehensive testing → Deploy to production
```

**Deployment Scope:**
- All 7 service methods
- All 7 RTK Query endpoints
- All exported hooks

**Impact:** Medium - new features available but no UI yet

---

#### Stage 3: UI Features (After Phase 6)
```bash
# Create PR: "feat(roles): add UI for templates, users, temporal updates"
# Deploy to staging → User acceptance testing → Deploy to production
```

**Deployment Scope:**
- All new UI components
- User-facing features

**Impact:** High - visible changes to users

---

### Rollback Plan

**Per-Phase Commits:**
Each phase has its own commit. If issues arise:

```bash
# Rollback to specific phase
git revert <commit-hash>

# Or reset to before problematic phase
git reset --hard <safe-commit-hash>
```

**Production Rollback:**
```bash
# Feature flag approach (if implemented)
FEATURE_ROLE_TEMPLATES_ENABLED=false

# Or direct rollback
git revert <feature-branch-merge-commit>
git push origin main
```

---

## ✅ Final Checklist

### Before Starting:
- [ ] Backend is running and accessible
- [ ] Test data prepared (roles, users, templates)
- [ ] Git branch created
- [ ] Backup files created

### After Each Phase:
- [ ] Code compiles without errors
- [ ] Tests pass (if applicable)
- [ ] Changes committed with descriptive message
- [ ] Documentation updated

### Before Deployment:
- [ ] All tests pass (unit + integration)
- [ ] Manual testing complete
- [ ] Code review completed
- [ ] No console errors/warnings
- [ ] Performance verified
- [ ] Rollback plan documented

### After Deployment:
- [ ] Monitoring in place
- [ ] Error tracking active
- [ ] User feedback mechanism ready
- [ ] Documentation deployed

---

## 📞 Support & Questions

If you encounter issues during implementation:

1. **Check Backend First:** Verify endpoint is accessible and returns expected data
2. **Review Console:** Check browser console and network tab for errors
3. **Verify Types:** Ensure DTOs match backend exactly
4. **Test Isolation:** Test each endpoint individually before integration
5. **Cache Issues:** Clear RTK Query cache if data seems stale

---

## 🎯 Success Metrics

### Technical Metrics:
- ✅ 100% of backend endpoints implemented in frontend
- ✅ 0 TypeScript compilation errors
- ✅ 100% test coverage for new code
- ✅ <100ms additional overhead per request
- ✅ Proper cache invalidation (verified)

### Business Metrics:
- ✅ Users can manage role templates
- ✅ Users can update role assignment dates
- ✅ Users can manage role hierarchies
- ✅ Admins can view role assignments
- ✅ Reduced support tickets for role management

---

**Document Version:** 1.0
**Last Updated:** 2025-10-27
**Maintained By:** Development Team
