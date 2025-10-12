# DepartmentList "All Status" Filter - Troubleshooting Guide

## Status: Code Fix Applied ✅

The code fix has been successfully applied to `departmentApi.ts`. If the filter is still not working, this is likely a **caching issue** rather than a code problem.

## Code Verification

### ✅ API Layer Fixed (departmentApi.ts:15-39)
```typescript
query: (params = {}) => {
  const queryParams: Record<string, any> = {
    page: params.page || 1,
    limit: params.limit || 10,
    sortOrder: params.sortOrder || 'asc',
  };

  // Critical fix: Only add isActive when defined
  if (params.isActive !== undefined) queryParams.isActive = params.isActive;

  return {
    url: '/organizations/departments',
    params: queryParams,
  };
},
```

### ✅ Component Logic Correct (DepartmentList.tsx:60-61)
```typescript
isActive: isActiveFilter === "all" ? undefined : isActiveFilter === "active"
```

**Evaluation:**
- "all" → `undefined` → Parameter omitted from query → Backend shows all departments ✓
- "active" → `true` → Backend filters for active departments ✓
- "inactive" → `false` → Backend filters for inactive departments ✓

## Troubleshooting Steps

### Step 1: Restart Development Server

The dev server may not have picked up the changes to `departmentApi.ts`.

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 2: Hard Refresh Browser

Clear browser cache and force reload the page.

**Chrome/Edge/Firefox:**
- Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**Safari:**
- Mac: `Cmd + Option + E` (clear cache) then `Cmd + R` (reload)

### Step 3: Clear RTK Query Cache

If the issue persists, RTK Query might be serving cached responses.

**Option A: Use Redux DevTools**
1. Open Redux DevTools in browser
2. Find the `api` slice
3. Look for `departmentApi` queries
4. Clear or invalidate the cached queries

**Option B: Add Manual Cache Invalidation**

Add this to your DepartmentList component after the filter changes:

```typescript
import { useDispatch } from 'react-redux';
import { departmentApi } from '@/store/api/departmentApi';

// Inside component:
const dispatch = useDispatch();

// In the useEffect that resets the page:
useEffect(() => {
  setCurrentPage(1);
  // Force cache invalidation when filter changes
  dispatch(departmentApi.util.invalidateTags([{ type: 'Department', id: 'LIST' }]));
}, [debouncedSearchTerm, isActiveFilter, dispatch]);
```

### Step 4: Verify Network Requests

Use browser DevTools to inspect the actual HTTP requests being sent.

1. Open **DevTools** (F12)
2. Go to **Network** tab
3. Filter by **Fetch/XHR**
4. Change the "All Status" filter
5. Look for the request to `/organizations/departments`

**What to check:**
- When "All Status" is selected: `isActive` parameter should **NOT** be present in the URL
- When "Active" is selected: URL should contain `isActive=true`
- When "Inactive" is selected: URL should contain `isActive=false`

**Example URLs:**
```
✅ All Status:    /organizations/departments?page=1&limit=10&sortOrder=asc&includeSchool=true&includeParent=true
✅ Active:        /organizations/departments?page=1&limit=10&sortOrder=asc&isActive=true&includeSchool=true&includeParent=true
✅ Inactive:      /organizations/departments?page=1&limit=10&sortOrder=asc&isActive=false&includeSchool=true&includeParent=true
```

### Step 5: Check Service Worker

If your app uses service workers, they might be serving cached assets.

**Clear Service Worker Cache:**
1. Open DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Find **Service Workers** section
4. Click **Unregister** for your app's service worker
5. Hard refresh the page (Ctrl+Shift+R)

### Step 6: Verify Backend Response

If the query parameter is correct but data is still wrong, check the backend.

**Check backend logs** to verify:
1. Backend is receiving the correct `isActive` parameter (or no parameter for "All Status")
2. Backend is applying the filter correctly in the database query
3. Backend is returning the expected data

Look at `backend/src/modules/organizations/services/departments.service.ts:152-154`:
```typescript
if (query.isActive !== undefined) {
  where.isActive = query.isActive;
}
```

This should only filter when `isActive` is defined.

## Expected Behavior

| Filter Selection | isActive Value | Query Parameter | Backend Filter | Result |
|-----------------|----------------|-----------------|----------------|--------|
| All Status | `undefined` | **Omitted** | No filter applied | All departments (active + inactive) |
| Active | `true` | `isActive=true` | `where.isActive = true` | Only active departments |
| Inactive | `false` | `isActive=false` | `where.isActive = false` | Only inactive departments |

## Common Issues & Solutions

### Issue: "All Status" still shows only active/inactive departments

**Cause**: Browser or dev server cache
**Solution**:
1. Restart dev server
2. Hard refresh browser (Ctrl+Shift+R)
3. Clear service worker cache if applicable

### Issue: Network request shows wrong parameter

**Cause**: Old JavaScript bundle still loaded
**Solution**:
1. Stop dev server completely
2. Delete `.next` or build cache directory
3. Restart dev server
4. Hard refresh browser

### Issue: Network request is correct but data is wrong

**Cause**: Backend issue or backend cache
**Solution**:
1. Check backend logs
2. Verify backend database query
3. Clear backend cache if using Redis/memory cache
4. Restart backend server

### Issue: RTK Query not refetching

**Cause**: Aggressive caching in RTK Query
**Solution**: Add manual cache invalidation (see Step 3, Option B above)

## Verification Checklist

- [ ] Dev server restarted
- [ ] Browser hard refreshed (Ctrl+Shift+R)
- [ ] Network tab inspected - correct query parameters being sent
- [ ] Service worker unregistered (if applicable)
- [ ] RTK Query cache cleared/invalidated
- [ ] Backend logs checked (parameters received correctly)
- [ ] Backend response verified (correct data returned)

## If Issue Persists

If after following all steps the issue persists, please provide:

1. **Network request screenshot** from DevTools showing the URL and parameters
2. **Backend logs** showing what parameters the backend received
3. **Backend response** showing what data was returned
4. **Console logs** showing any errors or warnings

This will help identify if the issue is:
- Frontend (parameter construction)
- Network layer (parameter serialization)
- Backend (parameter processing or database query)

---

**Last Updated**: 2025-10-12
**Fix Applied**: Yes ✓
**Most Likely Issue**: Browser/dev server cache
**Quick Fix**: Restart dev server + Hard refresh browser
