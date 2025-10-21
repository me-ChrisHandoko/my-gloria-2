# PermissionList Troubleshooting Guide

## Issue: Records tidak muncul di PermissionList

### 🔍 Diagnostic Checklist

#### ✅ Step 1: Verify Database Has Data

**Check via Prisma Studio:**
```bash
cd backend
npx prisma studio
```

**Or via Database Client:**
```sql
-- Check if permissions table has data
SELECT COUNT(*) FROM "permission";

-- Check active permissions
SELECT id, code, name, resource, action, "isActive"
FROM "permission"
WHERE "isActive" = true
LIMIT 10;
```

**Expected Result:**
- Should see at least 1 record
- Some records should have `isActive = true`

**If NO data:**
- Need to seed database or create permissions manually
- Check migration status: `npx prisma migrate status`

---

#### ✅ Step 2: Check Backend is Running

```bash
# Check if backend is running on port 3001
curl http://localhost:3001/health

# Or check process
lsof -i :3001
```

**Expected Result:**
- Backend should respond (200 OK or 404 Not Found is fine)
- Process should be running

**If NOT running:**
```bash
cd backend
npm run start:dev
```

---

#### ✅ Step 3: Test Endpoint Directly

```bash
# Run the diagnostic script
cd backend
./test-permissions-endpoint.sh
```

**Or test manually:**
```bash
# Without authentication (should return 401)
curl -v http://localhost:3001/permissions

# With authentication (replace TOKEN)
curl -v -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/permissions
```

**Expected Results:**
- Without token: `401 Unauthorized`
- With valid token but no permission: `403 Forbidden`
- With valid token and permission: `200 OK` with data

---

#### ✅ Step 4: Check User Permissions

**Required Permission:**
- Resource: `permissions`
- Action: `READ`
- Full code: `permissions.READ`

**Check in database:**
```sql
-- Get current user's ID (replace with actual clerkUserId)
SELECT id FROM "userProfile" WHERE "clerkUserId" = 'user_xxx';

-- Check user's roles
SELECT r.code, r.name
FROM "userRole" ur
JOIN "role" r ON ur."roleId" = r.id
WHERE ur."userProfileId" = 'USER_PROFILE_ID'
  AND ur."isActive" = true;

-- Check if user has permissions.READ
SELECT p.code, p.name, p.resource, p.action
FROM "rolePermission" rp
JOIN "permission" p ON rp."permissionId" = p.id
WHERE rp."roleId" IN (
    SELECT "roleId" FROM "userRole"
    WHERE "userProfileId" = 'USER_PROFILE_ID'
    AND "isActive" = true
)
AND p.resource = 'permissions'
AND p.action = 'READ'
AND rp."isGranted" = true;
```

**If user doesn't have permission:**
- Assign role with permissions.READ
- Or grant direct permission to user

---

#### ✅ Step 5: Check Browser Console

**Open DevTools → Console:**

Look for these logs:
```
[API] Preparing headers - Token exists: true
[API] Authorization header set
[API] Making request to: {url: '/permissions', params: {...}}
[API] Response received: {data: {...}, error: null, meta: {...}}
```

**Common Issues:**

**No token:**
```
[API] No authentication token available
```
**Solution:** User not logged in or Clerk not initialized

**401 Error:**
```
[API] Response received: {error: {status: 401}}
```
**Solution:** Token expired or invalid

**403 Error:**
```
Permission denied: {status: 403}
```
**Solution:** User doesn't have required permission

**Empty data:**
```
[API] Response received: {data: {data: [], meta: {total: 0}}}
```
**Solution:** Database empty or filters too restrictive

---

#### ✅ Step 6: Check Network Tab

**Open DevTools → Network:**

1. Filter by: `permissions`
2. Find request: `GET /permissions?page=1&limit=10...`
3. Click on request
4. Check:
   - **Status:** Should be `200 OK`
   - **Headers → Authorization:** Should have `Bearer token...`
   - **Response:** Should have `{data: [...], meta: {...}}`

---

#### ✅ Step 7: Verify Frontend Code

**Check PermissionList.tsx:**

```typescript
// Line 67-68: Should extract data correctly
const permissions = permissionsData?.data || [];
const totalItems = permissionsData?.meta?.total || 0;

// Line 204: Should pass correct data
<DataTable
  columns={columns}
  data={permissions}  // Should be array
  ...
/>
```

**Check permissionApi.ts:**

```typescript
// Line 35: Should have defensive check
providesTags: (result) =>
  result && Array.isArray(result.data)  // ← This must be present
    ? [...]
    : [...]
```

---

#### ✅ Step 8: Clear Cache & Rebuild

**Frontend:**
```bash
cd frontend
rm -rf .next
npm run dev
```

**Backend:**
```bash
cd backend
rm -rf dist
npm run build
npm run start:dev
```

**Browser:**
- Hard reload: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
- Or clear cache in DevTools → Network → Disable cache

---

### 🐛 Common Issues & Solutions

#### Issue 1: "TypeError: result.data.map is not a function"
**Cause:** Frontend defensive check missing
**Solution:** Already fixed in `permissionApi.ts:35`

#### Issue 2: Empty list (no data)
**Cause:** Database empty or no active permissions
**Solution:**
- Seed database
- Check `isActive = true` on permissions
- Verify filters not too restrictive

#### Issue 3: 401 Unauthorized
**Cause:** Not authenticated
**Solution:**
- Check Clerk integration
- Verify token in localStorage
- Re-login

#### Issue 4: 403 Forbidden
**Cause:** No permission
**Solution:**
- Grant `permissions.READ` permission to user's role
- Check `@RequiredPermission` decorator on endpoint

#### Issue 5: Search returns no results
**Cause:** Search functionality implemented but no matches
**Solution:**
- Remove search term
- Check search is case-insensitive
- Verify search logic in backend

---

### 📋 Quick Diagnostic Commands

```bash
# 1. Check database
npx prisma studio

# 2. Check backend running
lsof -i :3001

# 3. Test endpoint
curl -v http://localhost:3001/permissions

# 4. Check backend logs
# (Look at terminal where backend is running)

# 5. Rebuild frontend
cd frontend && rm -rf .next && npm run dev

# 6. Rebuild backend
cd backend && rm -rf dist && npm run build && npm run start:dev
```

---

### 🎯 Most Likely Causes (in order)

1. **User doesn't have `permissions.READ` permission** (403)
2. **Database is empty** (returns empty array)
3. **Backend not restarted after code changes**
4. **Frontend not rebuilt after API changes**
5. **Authentication issue** (no token, expired token)

---

### 💡 Next Steps

1. Run diagnostic script: `./backend/test-permissions-endpoint.sh`
2. Check Prisma Studio for data
3. Check browser console and network tab
4. Verify user has correct permissions
5. Restart backend and frontend if needed

**If still not working, share:**
- Browser console logs (especially `[API]` logs)
- Network tab screenshot of `/permissions` request
- Backend logs/errors
- Database query results
