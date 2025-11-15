# School Code Combobox - Complete Analysis & Troubleshooting

## 📊 Problem Statement
Data tidak tampil pada combobox "Code" di form Add School (`http://localhost:3001/organizations/schools`), walaupun raw SQL query berjalan dengan baik di database.

---

## 🔍 Data Flow Analysis

### Complete Data Pipeline

```
Database (PostgreSQL)
  └─ gloria_master.data_karyawan
      └─ bagian_kerja column
          ↓
Backend Service (NestJS)
  └─ SchoolsService.getBagianKerjaJenjangList()
      └─ Raw SQL Query dengan Prisma
          ↓
Backend Controller (NestJS)
  └─ SchoolsController.getBagianKerjaJenjangList()
      └─ GET /v1/organizations/schools/bagian-kerja-jenjang
          ↓
Transform Interceptor (NestJS)
  └─ Wraps response dengan format standard
      └─ { success: true, data: [...], timestamp, path, requestId }
          ↓
Frontend API Layer (RTK Query)
  └─ schoolApi.getBagianKerjaJenjangList
      └─ Transform response.data → string[]
          ↓
React Component (CreateSchoolModal)
  └─ useGetBagianKerjaJenjangListQuery()
      └─ Maps to codeOptions: { value, label, searchLabel }[]
          ↓
UI Component (Combobox)
  └─ Renders dropdown dengan searchable options
```

---

## 📂 File Locations

| Layer | File | Lines |
|-------|------|-------|
| **Database** | PostgreSQL | `gloria_master.data_karyawan` |
| **Backend Service** | `/backend/src/modules/organizations/services/schools.service.ts` | 435-457 |
| **Backend Controller** | `/backend/src/modules/organizations/controllers/schools.controller.ts` | 112-130 |
| **Transform Interceptor** | `/backend/src/core/interceptors/transform.interceptor.ts` | 20-102 |
| **Frontend API** | `/frontend/src/store/api/schoolApi.ts` | 138-161 |
| **React Component** | `/frontend/src/components/features/organizations/schools/CreateSchoolModal.tsx` | 50-82, 167-185 |

---

## 🗄️ SQL Query

### Production Query
```sql
SELECT bagian_kerja
FROM gloria_master.data_karyawan
WHERE bagian_kerja NOT IN ('YAYASAN', 'SATPAM', 'UMUM')
  AND status_aktif = 'Aktif'
GROUP BY bagian_kerja
ORDER BY bagian_kerja ASC;
```

### Query Logic
- **Table**: `gloria_master.data_karyawan`
- **Column**: `bagian_kerja` (school department/level code)
- **Filters**:
  - Exclude: 'YAYASAN', 'SATPAM', 'UMUM' (foundation, security, general)
  - Only active employees: `status_aktif = 'Aktif'`
- **Grouping**: `GROUP BY` to get distinct values
- **Sorting**: Alphabetical ascending order

### Expected Results Example
```
bagian_kerja
-----------------
GURU SD
GURU SMP
GURU SMA
KEPALA SEKOLAH SD
KEPALA SEKOLAH SMP
KEPALA SEKOLAH SMA
STAFF ADMINISTRASI
...
```

---

## 🔧 Backend Implementation

### Service Layer
**File**: `schools.service.ts:435-457`

```typescript
async getBagianKerjaJenjangList(): Promise<string[]> {
  try {
    const result = await this.prisma.$queryRaw<Array<{ bagian_kerja: string }>>`
      SELECT bagian_kerja
      FROM gloria_master.data_karyawan
      WHERE bagian_kerja NOT IN ('YAYASAN', 'SATPAM', 'UMUM')
      AND status_aktif = 'Aktif'
      GROUP BY bagian_kerja
      ORDER BY bagian_kerja ASC
    `;

    return result.map((row) => row.bagian_kerja);
  } catch (error) {
    this.logger.error(`Failed to get bagian_kerja: ${error.message}`);
    return []; // Graceful fallback
  }
}
```

**Key Points**:
- ✅ Uses Prisma `$queryRaw` for raw SQL
- ✅ Error handling with logger
- ✅ Returns empty array on error (graceful degradation)

### Controller Layer
**File**: `schools.controller.ts:112-130`

```typescript
@Get('bagian-kerja-jenjang')
@RequiredPermissions({ resource: 'schools', action: PermissionAction.READ })
@ApiOperation({
  summary: 'Get bagian kerja jenjang list',
  description: 'Retrieves list of distinct bagian_kerja for school code options.',
})
async getBagianKerjaJenjangList(): Promise<string[]> {
  return this.schoolsService.getBagianKerjaJenjangList();
}
```

**Key Points**:
- ✅ Endpoint: `GET /v1/organizations/schools/bagian-kerja-jenjang`
- ✅ Requires permission: `schools:read`
- ✅ Returns string[] directly
- ✅ Wrapped by TransformInterceptor automatically

### Transform Interceptor
**File**: `transform.interceptor.ts:20-102`

Automatically wraps all responses:

```typescript
{
  success: true,
  data: <controller return value>,
  timestamp: "2025-01-14T...",
  path: "/organizations/schools/bagian-kerja-jenjang",
  requestId: "uuid-..."
}
```

---

## 🎨 Frontend Implementation

### API Layer
**File**: `schoolApi.ts:138-161`

```typescript
getBagianKerjaJenjangList: builder.query<string[], void>({
  query: () => '/organizations/schools/bagian-kerja-jenjang',
  keepUnusedDataFor: 3600, // Cache for 1 hour
  transformResponse: (response: any) => {
    console.log('📡 [schoolApi] Raw Response:', { response, ... });

    // Unwrap backend TransformInterceptor format
    if (response && response.success && response.data) {
      console.log('✅ Using wrapped response.data:', response.data);
      return response.data;
    }

    // Fallback to direct array or empty array
    const result = Array.isArray(response) ? response : [];
    console.log('✅ Using direct array or fallback:', result);
    return result;
  },
}),
```

**Key Points**:
- ✅ 1-hour cache: `keepUnusedDataFor: 3600`
- ✅ Unwraps backend response format
- ✅ Handles both wrapped and direct array responses
- ✅ Graceful fallback to empty array
- 🆕 Debug logging added

### React Component
**File**: `CreateSchoolModal.tsx:50-82, 167-185`

```typescript
// Fetch data
const { data: bagianKerjaJenjangList = [], isLoading: isLoadingBagianKerja } =
  useGetBagianKerjaJenjangListQuery();

// Debug logging
React.useEffect(() => {
  console.log('🔍 [CreateSchoolModal] Bagian Kerja Data:', {
    isLoading: isLoadingBagianKerja,
    data: bagianKerjaJenjangList,
    dataType: typeof bagianKerjaJenjangList,
    isArray: Array.isArray(bagianKerjaJenjangList),
    length: bagianKerjaJenjangList?.length,
  });
}, [bagianKerjaJenjangList, isLoadingBagianKerja]);

// Transform to combobox options
const codeOptions = bagianKerjaJenjangList.map((bagian) => ({
  value: bagian,
  label: bagian,
  searchLabel: bagian,
}));

// Render combobox
<Combobox
  options={codeOptions}
  value={formData.code}
  onValueChange={(value) => setFormData({ ...formData, code: value })}
  placeholder={isLoadingBagianKerja ? "Loading codes..." : "Select school code..."}
  searchPlaceholder="Search code..."
  emptyMessage="No code found."
  disabled={isLoadingBagianKerja}
/>
```

---

## 🐛 Debugging Added

### Debug Locations

1. **API Transform Layer** (`schoolApi.ts:142-160`)
   - Logs raw response from backend
   - Shows response structure analysis
   - Logs transformed result

2. **Component Data Fetch** (`CreateSchoolModal.tsx:54-62`)
   - Logs fetched data from RTK Query
   - Shows data type and array status
   - Displays data length

3. **Options Transform** (`CreateSchoolModal.tsx:76-82`)
   - Logs raw data before mapping
   - Shows transformed combobox options
   - Displays options count

### Expected Console Output

**Success Case:**
```javascript
📡 [schoolApi] getBagianKerjaJenjangList Raw Response: {
  response: {
    success: true,
    data: ['GURU SD', 'GURU SMP', 'GURU SMA', ...],
    timestamp: '2025-01-14T...',
    path: '/organizations/schools/bagian-kerja-jenjang',
    requestId: '...'
  },
  responseType: 'object',
  hasSuccess: true,
  hasData: true,
  isArray: false
}

✅ [schoolApi] Using wrapped response.data: ['GURU SD', 'GURU SMP', ...]

🔍 [CreateSchoolModal] Bagian Kerja Data: {
  isLoading: false,
  data: ['GURU SD', 'GURU SMP', ...],
  dataType: 'object',
  isArray: true,
  length: 15
}

🎨 [CreateSchoolModal] Code Options: {
  rawData: ['GURU SD', 'GURU SMP', ...],
  transformedOptions: [
    { value: 'GURU SD', label: 'GURU SD', searchLabel: 'GURU SD' },
    ...
  ],
  optionsLength: 15
}
```

---

## 🧪 Testing Steps

### 1. Check Browser Console
```
1. Open http://localhost:3001/organizations/schools
2. Click "Add School" button
3. Open DevTools (F12) → Console tab
4. Look for debug logs with emojis (📡, ✅, 🔍, 🎨)
5. Copy all logs for analysis
```

### 2. Check Network Tab
```
1. DevTools → Network tab
2. Filter: "bagian-kerja-jenjang"
3. Click the request
4. Check:
   - Status: Should be 200 OK
   - Response: Should show JSON with success:true and data:[]
   - Headers: Verify Authorization token exists
```

### 3. Test SQL Query Directly
```sql
-- Connect to your database
psql -U your_user -d your_database

-- Run the query
SELECT bagian_kerja
FROM gloria_master.data_karyawan
WHERE bagian_kerja NOT IN ('YAYASAN', 'SATPAM', 'UMUM')
  AND status_aktif = 'Aktif'
GROUP BY bagian_kerja
ORDER BY bagian_kerja ASC;

-- Should return rows, not empty
```

### 4. Test API Endpoint Directly
```bash
# Get your token from browser localStorage
# Open DevTools Console and run:
# localStorage.getItem('token')

# Test the endpoint
curl -X GET \
  http://localhost:3001/v1/organizations/schools/bagian-kerja-jenjang \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### 5. Use Test Script
```bash
# Get token from browser, then run:
node test-bagian-kerja-api.js YOUR_TOKEN_HERE
```

---

## 🚨 Common Issues & Solutions

### Issue 1: Empty Response from Backend
**Symptoms:**
- Network tab shows: `{ success: true, data: [], ... }`
- Console shows empty array

**Possible Causes:**
1. No data in database matching query filters
2. Database connection issue
3. Query syntax error (silent failure)

**Solutions:**
```bash
# 1. Check if table has data
SELECT COUNT(*) FROM gloria_master.data_karyawan;

# 2. Check filtered data count
SELECT COUNT(*)
FROM gloria_master.data_karyawan
WHERE status_aktif = 'Aktif';

# 3. Check distinct bagian_kerja
SELECT DISTINCT bagian_kerja
FROM gloria_master.data_karyawan
WHERE status_aktif = 'Aktif';

# 4. Check with full filters
SELECT bagian_kerja
FROM gloria_master.data_karyawan
WHERE bagian_kerja NOT IN ('YAYASAN', 'SATPAM', 'UMUM')
  AND status_aktif = 'Aktif'
GROUP BY bagian_kerja;
```

### Issue 2: 401 Unauthorized
**Symptoms:**
- Network tab shows 401 status
- Console shows API error

**Solutions:**
1. Check localStorage for token
2. Login again to refresh token
3. Verify token not expired (check jwt.io)
4. Check backend auth middleware

### Issue 3: Transform Logic Error
**Symptoms:**
- Console shows "Using direct array or fallback: []"
- But Network tab shows data

**Solutions:**
1. Check response structure in Network tab
2. Verify TransformInterceptor wrapping format
3. Check for double-wrapping issue

### Issue 4: Frontend Cache Issue
**Symptoms:**
- Old/stale data showing
- Changes not reflecting

**Solutions:**
```javascript
// Clear RTK Query cache
dispatch(schoolApi.util.resetApiState());

// Or hard refresh browser
// Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
```

### Issue 5: Combobox Component Not Rendering
**Symptoms:**
- Data in console but not in UI
- Combobox looks empty

**Solutions:**
1. Check codeOptions array not empty
2. Verify Combobox component props
3. Check isLoadingBagianKerja state
4. Inspect DOM for combobox elements

---

## 📝 Next Steps

### Immediate Actions
1. ✅ Open browser to http://localhost:3001/organizations/schools
2. ✅ Click "Add School" button
3. ✅ Open DevTools Console
4. ✅ Copy all console logs
5. ✅ Open Network tab and check API response
6. ✅ Share findings for analysis

### If Issue Persists
1. Run SQL query directly in database
2. Test API endpoint with curl/Postman
3. Check backend logs for errors
4. Verify permissions configuration
5. Check database connection

---

## 🧹 Cleanup (After Issue Resolved)

Remove debug console.log statements from:

1. `/frontend/src/store/api/schoolApi.ts` lines 142-160
2. `/frontend/src/components/features/organizations/schools/CreateSchoolModal.tsx` lines 54-62, 76-82

---

## 📚 Additional Resources

- **SQL Query File**: `/frontend/claudedocs/school-code-query.sql`
- **Test Script**: `/frontend/test-bagian-kerja-api.js`
- **Debugging Guide**: `/frontend/DEBUGGING-GUIDE.md`
- **This Document**: `/frontend/claudedocs/SCHOOL-CODE-COMBOBOX-ANALYSIS.md`
