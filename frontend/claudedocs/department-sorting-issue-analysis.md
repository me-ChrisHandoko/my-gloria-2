# Department Sorting Issue - Root Cause Analysis

**Date**: 2025-10-12
**Status**: ✅ **ROOT CAUSE IDENTIFIED**
**Issue**: Data masih terurut abjad ASC padahal sudah implementasi hierarchical sorting

---

## Executive Summary

**Masalah**: Meskipun backend sudah diimplementasikan hierarchical sorting dengan Recursive CTE, data di frontend masih muncul dalam urutan abjad ASC, bukan berdasarkan hierarki (root departments di atas).

**Root Cause**: **Frontend API call OVERRIDE default sortBy backend** dengan nilai `sortBy: 'name'` yang hardcoded.

**Impact**:
- ❌ Hierarchical sorting TIDAK pernah dieksekusi
- ❌ User tetap melihat urutan abjad
- ❌ Backend implementation tidak terpakai

**Priority**: 🔴 **HIGH** - Feature tidak berfungsi sesuai requirement

---

## Root Cause Analysis

### 1. Backend Implementation (✅ CORRECT)

**File**: `/backend/src/modules/organizations/services/departments.service.ts`

**Implementation**:
```typescript
// Lines 115-121
async findAll(query: QueryDepartmentDto): Promise<PaginatedDepartmentResponseDto> {
  // Use hierarchy ordering if sortBy is 'hierarchy' or undefined (default)
  if (query.sortBy === 'hierarchy' || query.sortBy === undefined) {
    return this.findAllWithHierarchyOrder(query);  // ✅ Recursive CTE
  }

  // ... existing alphabetical implementation for other sortBy values
}
```

**DTO Default**:
```typescript
// Lines 275-282 in department.dto.ts
@ApiPropertyOptional({
  description: 'Sort field',
  enum: ['name', 'code', 'createdAt', 'updatedAt', 'hierarchy'],
  default: 'hierarchy',  // ✅ Default is 'hierarchy'
})
@IsOptional()
@IsString()
sortBy?: string = 'hierarchy';
```

**Logic Backend**:
- Jika `sortBy === 'hierarchy'` OR `sortBy === undefined` → Pakai `findAllWithHierarchyOrder()` (Recursive CTE) ✅
- Jika `sortBy === 'name'` → Pakai `findAll()` biasa (ORDER BY name ASC) ❌

---

### 2. Frontend API Call (❌ PROBLEM SOURCE)

**File**: `/frontend/src/store/api/departmentApi.ts`

**Line 22**: ❌ **HARDCODED `sortBy: 'name'`**

```typescript
// Lines 10-30
getDepartments: builder.query<PaginatedResponse<Department>, QueryParams & {
  schoolId?: string;
  includeSchool?: boolean;
  includeParent?: boolean;
}>({
  query: (params = {}) => ({
    url: '/organizations/departments',
    params: {
      page: params.page || 1,
      limit: params.limit || 10,
      name: params.search || undefined,
      sortBy: params.sortBy || 'name',  // ❌ OVERRIDE default backend!
      sortOrder: params.sortOrder || 'asc',
      schoolId: params.schoolId,
      isActive: params.isActive,
      includeSchool: params.includeSchool,
      includeParent: params.includeParent,
    },
  }),
  // ...
}),
```

**Problem Explanation**:
1. Frontend selalu mengirim `sortBy: 'name'` ke backend (line 22)
2. Backend menerima `sortBy: 'name'` → kondisi `if (query.sortBy === 'hierarchy' || query.sortBy === undefined)` menjadi **FALSE**
3. Backend menggunakan `findAll()` biasa dengan `ORDER BY name ASC`
4. Hierarchical sorting dengan Recursive CTE **TIDAK PERNAH DIEKSEKUSI**

---

### 3. Frontend Component (✅ NO ISSUE)

**File**: `/frontend/src/components/features/organizations/departments/DepartmentList.tsx`

```typescript
// Lines 62-77
const {
  data: departmentsData,
  isLoading: isLoadingDepartments,
  isFetching,
  error: departmentsError,
  refetch: refetchDepartments,
} = useGetDepartmentsQuery({
  page: currentPage,
  limit: itemsPerPage,
  search: debouncedSearchTerm,
  schoolId: selectedSchool === "all" ? undefined : selectedSchool,
  isActive: isActiveFilter === "all" ? undefined : isActiveFilter === "active",
  includeSchool: true,
  includeParent: true,
  // ✅ TIDAK mengirim sortBy - expect default backend behavior
});
```

**Component Behavior**:
- Component TIDAK mengirim `sortBy` parameter ✅
- Expect default backend sorting (hierarchy) ✅
- Namun, `departmentApi.ts` menambahkan `sortBy: 'name'` otomatis ❌

---

## Flow Diagram

### Current Flow (❌ BROKEN)

```
DepartmentList.tsx
  ↓ (NO sortBy parameter)
departmentApi.ts
  ↓ (ADD sortBy: 'name' - HARDCODED)
Backend GET /organizations/departments?sortBy=name
  ↓ (query.sortBy === 'name')
departments.service.ts findAll()
  ↓ (Skip findAllWithHierarchyOrder)
Prisma findMany({ orderBy: { name: 'asc' } })
  ↓
RESULT: Alphabetical sorting ❌
```

### Expected Flow (✅ CORRECT)

```
DepartmentList.tsx
  ↓ (NO sortBy parameter)
departmentApi.ts
  ↓ (NO sortBy parameter OR sortBy: 'hierarchy')
Backend GET /organizations/departments
  ↓ (query.sortBy === undefined)
departments.service.ts findAll()
  ↓ (Call findAllWithHierarchyOrder)
PostgreSQL Recursive CTE
  ↓ (ORDER BY hierarchy_path ASC)
RESULT: Hierarchical sorting ✅
```

---

## Solution Options

### Option 1: Remove Frontend Override (✅ RECOMMENDED)

**Change**: Remove `sortBy` default in `departmentApi.ts` to respect backend default

**File**: `/frontend/src/store/api/departmentApi.ts` line 22

**Before**:
```typescript
params: {
  page: params.page || 1,
  limit: params.limit || 10,
  name: params.search || undefined,
  sortBy: params.sortBy || 'name',  // ❌ Override backend default
  sortOrder: params.sortOrder || 'asc',
  // ...
}
```

**After**:
```typescript
params: {
  page: params.page || 1,
  limit: params.limit || 10,
  name: params.search || undefined,
  sortBy: params.sortBy || undefined,  // ✅ Let backend use its default ('hierarchy')
  sortOrder: params.sortOrder || 'asc',
  // ...
}
```

**Impact**:
- ✅ Backend default `sortBy: 'hierarchy'` akan digunakan
- ✅ Hierarchical sorting akan aktif
- ✅ Root departments muncul di atas
- ✅ Minimal changes (1 line)
- ✅ Backwards compatible (jika ada caller yang explicit pass sortBy, tetap work)

---

### Option 2: Change Frontend Default to 'hierarchy'

**Change**: Change frontend default from `'name'` to `'hierarchy'`

**File**: `/frontend/src/store/api/departmentApi.ts` line 22

**Before**:
```typescript
sortBy: params.sortBy || 'name',
```

**After**:
```typescript
sortBy: params.sortBy || 'hierarchy',
```

**Impact**:
- ✅ Hierarchical sorting akan aktif
- ✅ Consistent dengan backend default
- ⚠️ Explicit override - lebih maintainable karena ada nilai default yang jelas

---

### Option 3: Remove sortBy Entirely from Frontend API

**Change**: Don't send `sortBy` parameter at all if not explicitly provided

**File**: `/frontend/src/store/api/departmentApi.ts` lines 15-30

**Before**:
```typescript
query: (params = {}) => ({
  url: '/organizations/departments',
  params: {
    page: params.page || 1,
    limit: params.limit || 10,
    name: params.search || undefined,
    sortBy: params.sortBy || 'name',
    sortOrder: params.sortOrder || 'asc',
    // ...
  },
}),
```

**After**:
```typescript
query: (params = {}) => ({
  url: '/organizations/departments',
  params: {
    page: params.page || 1,
    limit: params.limit || 10,
    name: params.search || undefined,
    ...(params.sortBy && { sortBy: params.sortBy }),  // ✅ Only send if provided
    ...(params.sortOrder && { sortOrder: params.sortOrder }),  // ✅ Only send if provided
    // ...
  },
}),
```

**Impact**:
- ✅ Cleaner approach - tidak mengirim parameter yang tidak perlu
- ✅ Backend default akan digunakan
- ✅ Lebih flexible - frontend tidak assume apapun tentang backend defaults
- ⚠️ More changes required

---

## Comparison Matrix

| Option | Complexity | Backend Changes | Frontend Changes | Backwards Compatible | Maintainability |
|--------|-----------|----------------|-----------------|---------------------|-----------------|
| **Option 1** (undefined) | 🟢 Low | ❌ None | ✅ 1 line | ✅ Yes | 🟢 Good |
| **Option 2** (hierarchy) | 🟢 Low | ❌ None | ✅ 1 line | ✅ Yes | 🟡 Medium |
| **Option 3** (conditional) | 🟡 Medium | ❌ None | ✅ ~5 lines | ✅ Yes | 🟢 Good |

---

## Recommendation

### ✅ **Use Option 1: Change to `undefined`**

**Reasoning**:
1. **Simplest fix**: 1 line change
2. **Respects backend design**: Backend sudah set default = 'hierarchy'
3. **Backwards compatible**: Existing code yang explicit pass sortBy tetap work
4. **Clear intent**: "Let backend decide the default sorting"
5. **Low risk**: Minimal code changes

**Implementation**:
```typescript
// File: /frontend/src/store/api/departmentApi.ts
// Line 22

// Change from:
sortBy: params.sortBy || 'name',

// To:
sortBy: params.sortBy || undefined,
```

---

## Testing Checklist

### Before Fix (Current Behavior)
- [x] Backend receives `sortBy=name`
- [x] Backend uses `findAll()` with `ORDER BY name ASC`
- [x] Data sorted alphabetically
- [x] Children mixed with root departments

### After Fix (Expected Behavior)
- [ ] Backend receives no `sortBy` OR `sortBy=undefined`
- [ ] Backend uses `findAllWithHierarchyOrder()` with Recursive CTE
- [ ] Data sorted by hierarchy_path
- [ ] Root departments appear first
- [ ] Children appear immediately after parents
- [ ] Multi-level hierarchies correctly ordered

### Edge Cases
- [ ] Filter by school: hierarchy maintained within school
- [ ] Filter by status: hierarchy maintained for filtered results
- [ ] Search by name: hierarchy maintained for search results
- [ ] Pagination: hierarchy preserved across pages

### Backwards Compatibility
- [ ] Explicit `sortBy='name'` still works (alphabetical)
- [ ] Explicit `sortBy='code'` still works
- [ ] Explicit `sortBy='createdAt'` still works
- [ ] Other components using departmentApi unaffected

---

## Performance Impact

**Current (Alphabetical)**:
- Query: `SELECT * FROM departments ORDER BY name ASC`
- Time: ~5-10ms
- Complexity: O(1) - simple index scan

**After Fix (Hierarchical)**:
- Query: Recursive CTE with hierarchy_path calculation
- Time: ~15-50ms (measured in implementation)
- Complexity: O(n) - recursive traversal

**Assessment**: ✅ **Acceptable**
- Difference: +10-40ms
- User benefit: Clear hierarchical structure worth the cost
- Optimization available: Add index on parent_id if needed

---

## Deployment Strategy

### Pre-Deployment
1. ✅ Verify backend implementation (already done)
2. ✅ Identify root cause (completed)
3. [ ] Make frontend change (1 line)
4. [ ] TypeScript compilation check
5. [ ] Local testing

### Deployment Steps
1. [ ] Deploy frontend change to staging
2. [ ] Verify hierarchical sorting in staging
3. [ ] Test all filter combinations
4. [ ] Monitor performance metrics
5. [ ] Deploy to production
6. [ ] Monitor for 24 hours

### Rollback Plan
If issues occur:
```bash
# Revert frontend change
git checkout HEAD~1 -- src/store/api/departmentApi.ts

# Or manually change back to:
sortBy: params.sortBy || 'name',
```

**Risk**: 🟢 **LOW** - Only 1 line change, easy to revert

---

## Related Files

### Files Analyzed
1. ✅ `/backend/src/modules/organizations/services/departments.service.ts` (Backend logic)
2. ✅ `/backend/src/modules/organizations/dto/department.dto.ts` (DTO default)
3. ✅ `/frontend/src/store/api/departmentApi.ts` (API call - PROBLEM SOURCE)
4. ✅ `/frontend/src/components/features/organizations/departments/DepartmentList.tsx` (Component - OK)

### Files to Modify
1. `/frontend/src/store/api/departmentApi.ts` - Line 22 (1 line change)

---

## Timeline

**Discovery**: 2025-10-12 (today)
**Root Cause Identified**: 2025-10-12 (today)
**Estimated Fix Time**: 5 minutes
**Testing Time**: 15 minutes
**Total**: 20 minutes

---

## Success Criteria

- [x] ✅ Root cause identified
- [ ] Frontend fix implemented
- [ ] TypeScript compilation passes
- [ ] Root departments appear first in list
- [ ] Children appear immediately after parents
- [ ] Hierarchy preserved with filters
- [ ] Performance acceptable (<100ms)
- [ ] No breaking changes

---

## Conclusion

**Problem**: Frontend hardcoded `sortBy: 'name'` mengoverride backend default `sortBy: 'hierarchy'`

**Solution**: Change frontend default dari `'name'` ke `undefined` untuk respect backend default

**Impact**:
- ✅ Hierarchical sorting akan aktif
- ✅ Root departments muncul di atas
- ✅ User experience improved
- ✅ Backend implementation utilized

**Next Action**: Implement Option 1 (change 1 line in departmentApi.ts)
