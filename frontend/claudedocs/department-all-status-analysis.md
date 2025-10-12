# DepartmentList "All Status" Filter Issue - Root Cause Analysis

## Executive Summary

The "All Status" filter in DepartmentList is not functioning correctly due to how `undefined` values are handled in the RTK Query parameter serialization. When `isActive: undefined` is included in the params object, it gets serialized into the URL query string incorrectly, causing the backend to misinterpret it as a filter value instead of "no filter".

## Root Cause

**Location**: `src/store/api/departmentApi.ts` (lines 15-32)

**Problem**: The API query builder always includes the `isActive` parameter in the params object, even when its value is `undefined`:

```typescript
query: (params = {}) => ({
  url: '/organizations/departments',
  params: {
    page: params.page || 1,
    limit: params.limit || 10,
    name: params.search || undefined,
    sortBy: params.sortBy || undefined,
    sortOrder: params.sortOrder || 'asc',
    schoolId: params.schoolId,
    isActive: params.isActive,  // ← ISSUE: undefined gets serialized
    includeSchool: params.includeSchool,
    includeParent: params.includeParent,
  },
}),
```

**Impact**: When serialized to a URL query string, `isActive: undefined` may be converted to:
- `?isActive=undefined` (string "undefined")
- `?isActive=` (empty string)
- `?isActive` (parameter present with no value)

The backend's `@Type(() => Boolean)` decorator then converts these malformed values to `false`, causing the filter to show only inactive departments instead of all departments.

## Comparison with Working Implementation

**SchoolList** (schoolApi.ts:12-29) uses a conditional approach that **works correctly**:

```typescript
const queryParams: Record<string, any> = {
  page: params.page || 1,
  limit: params.limit || 10,
  sortBy: params.sortBy || 'name',
  sortOrder: params.sortOrder || 'asc',
};

// Only add optional parameters if they have values
if (params.search) queryParams.search = params.search;
if (params.organizationId) queryParams.organizationId = params.organizationId;
if (params.lokasi) queryParams.lokasi = params.lokasi;
if (params.status) queryParams.status = params.status;  // ← Only added when present
if (params.type) queryParams.type = params.type;
```

This ensures that when a filter is set to "all", the parameter is **completely omitted** from the query string, which the backend correctly interprets as "no filter applied".

## Backend Expectations

**DTO Definition** (backend/src/modules/organizations/dto/department.dto.ts:220-227):

```typescript
@ApiPropertyOptional({
  description: 'Filter by active status',
  example: true,
})
@IsOptional()
@IsBoolean()
@Type(() => Boolean)  // ← Transforms query param to boolean
isActive?: boolean;
```

**Service Implementation** (backend/src/modules/organizations/services/departments.service.ts:152-154):

```typescript
if (query.isActive !== undefined) {
  where.isActive = query.isActive;
}
```

The backend correctly handles:
- `undefined` → No filter applied (shows all departments)
- `true` → Shows active departments only
- `false` → Shows inactive departments only

## Frontend Component Logic

**DepartmentList.tsx** (line 60-61) has **correct logic**:

```typescript
isActive: isActiveFilter === "all" ? undefined : isActiveFilter === "active"
```

This evaluates to:
- "all" → `undefined` ✓
- "active" → `true` ✓
- "inactive" → `false` ✓

The issue is NOT in the component logic, but in how the API layer serializes the `undefined` value.

## Solution

Modify `departmentApi.ts` to follow the SchoolList pattern by conditionally adding parameters only when they have actual values.

**Change from**:
```typescript
params: {
  page: params.page || 1,
  limit: params.limit || 10,
  name: params.search || undefined,
  sortBy: params.sortBy || undefined,
  sortOrder: params.sortOrder || 'asc',
  schoolId: params.schoolId,
  isActive: params.isActive,
  includeSchool: params.includeSchool,
  includeParent: params.includeParent,
}
```

**Change to**:
```typescript
const queryParams: Record<string, any> = {
  page: params.page || 1,
  limit: params.limit || 10,
  sortBy: params.sortBy || undefined,
  sortOrder: params.sortOrder || 'asc',
};

// Only add optional parameters if they have values
if (params.search) queryParams.name = params.search;
if (params.schoolId) queryParams.schoolId = params.schoolId;
if (params.isActive !== undefined) queryParams.isActive = params.isActive;
if (params.includeSchool) queryParams.includeSchool = params.includeSchool;
if (params.includeParent) queryParams.includeParent = params.includeParent;

return {
  url: '/organizations/departments',
  params: queryParams,
};
```

## Expected Behavior After Fix

- **"All Status"** selected → `isActive` parameter **omitted** from query → Backend shows **all departments** (active + inactive)
- **"Active"** selected → `isActive=true` → Backend shows **active departments only**
- **"Inactive"** selected → `isActive=false` → Backend shows **inactive departments only**

## Files Analyzed

1. **Frontend Component**: `src/components/features/organizations/departments/DepartmentList.tsx`
2. **Frontend API**: `src/store/api/departmentApi.ts`
3. **Working Reference**: `src/store/api/schoolApi.ts`
4. **Backend DTO**: `backend/src/modules/organizations/dto/department.dto.ts`
5. **Backend Service**: `backend/src/modules/organizations/services/departments.service.ts`

## Recommendation

Apply the fix to `departmentApi.ts` immediately. This is a **high-priority bug** that affects data visibility and user experience. The solution follows established patterns already proven to work in SchoolList.

---

**Analysis Date**: 2025-10-12
**Analyzed By**: Claude Code Sequential Thinking Analysis
**Priority**: High
**Complexity**: Low (simple parameter serialization fix)
**Risk**: Low (follows proven pattern from SchoolList)
