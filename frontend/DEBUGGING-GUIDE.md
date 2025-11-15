# Debugging Guide: School Code Combobox Empty Issue

## Problem
School code combobox tidak menampilkan data walaupun raw SQL query berjalan dengan baik.

## Debugging Steps

### 1. Check Browser Console
1. Buka http://localhost:3000/organizations/schools
2. Klik tombol "Add School"
3. Buka Browser DevTools (F12) → Console tab
4. Lihat log berikut:

```
🔍 [CreateSchoolModal] Bagian Kerja Data: {...}
📡 [schoolApi] getBagianKerjaJenjangList Raw Response: {...}
✅ [schoolApi] Using wrapped response.data: [...]
🎨 [CreateSchoolModal] Code Options: {...}
```

### 2. Check Network Tab
1. Buka DevTools → Network tab
2. Filter: "bagian-kerja-jenjang"
3. Klik request tersebut
4. Check:
   - Status: Should be 200
   - Response tab: Should show JSON with data array
   - Headers tab: Check Authorization token

### 3. Expected Response Format

**Backend Response (Wrapped by TransformInterceptor):**
```json
{
  "success": true,
  "data": [
    "GURU SD",
    "GURU SMP",
    "GURU SMA",
    "KEPALA SEKOLAH SD",
    ...
  ],
  "timestamp": "2025-01-14T...",
  "path": "/organizations/schools/bagian-kerja-jenjang",
  "requestId": "..."
}
```

**Frontend After Transform:**
```javascript
[
  "GURU SD",
  "GURU SMP",
  "GURU SMA",
  ...
]
```

**Combobox Options:**
```javascript
[
  { value: "GURU SD", label: "GURU SD", searchLabel: "GURU SD" },
  { value: "GURU SMP", label: "GURU SMP", searchLabel: "GURU SMP" },
  ...
]
```

## Common Issues & Solutions

### Issue 1: 401 Unauthorized
**Symptom:** Network tab shows 401 status
**Cause:** Token expired atau tidak ada
**Solution:**
1. Check localStorage: `localStorage.getItem('token')`
2. Login ulang jika token tidak ada/expired
3. Verify token di backend dengan jwt.io

### Issue 2: Empty Array Response
**Symptom:** Response data: []
**Cause:** Database query tidak mengembalikan hasil
**Solution:**
1. Check database directly dengan query SQL
2. Verify table `gloria_master.data_karyawan` exists
3. Check filters: status_aktif = 'Aktif' dan bagian_kerja exclusions
4. Run: `SELECT COUNT(*) FROM gloria_master.data_karyawan WHERE status_aktif = 'Aktif'`

### Issue 3: Transform Logic Error
**Symptom:** Console shows "Using direct array or fallback: []"
**Cause:** Response format tidak match expected structure
**Solution:**
1. Check console log: "📡 [schoolApi] Raw Response"
2. Verify response structure matches TransformInterceptor format
3. Check if response double-wrapped

### Issue 4: Combobox Component Issue
**Symptom:** Data ada di console tapi tidak tampil di UI
**Cause:** Combobox props atau rendering issue
**Solution:**
1. Check console: "🎨 [CreateSchoolModal] Code Options"
2. Verify options array tidak kosong
3. Check Combobox component props
4. Verify isLoadingBagianKerja state

### Issue 5: CORS or Network Error
**Symptom:** Network request failed
**Cause:** Backend tidak running atau CORS issue
**Solution:**
1. Verify backend running: `curl http://localhost:3001/v1/health`
2. Check backend console for errors
3. Verify CORS config di backend main.ts

## Manual Testing

### Test API Directly
```bash
# Get your token
TOKEN=$(node -pe "localStorage.getItem('token')")

# Test endpoint
curl -X GET \
  http://localhost:3001/v1/organizations/schools/bagian-kerja-jenjang \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Test with Node Script
```bash
# 1. Get token from browser localStorage
# 2. Run test script
node test-bagian-kerja-api.js YOUR_TOKEN_HERE
```

## Debug Logs Location

All debug logs added to:
1. `/frontend/src/store/api/schoolApi.ts:142-160` - API transform logic
2. `/frontend/src/components/features/organizations/schools/CreateSchoolModal.tsx:54-62` - Data fetch
3. `/frontend/src/components/features/organizations/schools/CreateSchoolModal.tsx:76-82` - Options transform

## Expected Console Output (Success Case)

```
📡 [schoolApi] getBagianKerjaJenjangList Raw Response: {
  response: { success: true, data: ['GURU SD', 'GURU SMP', ...], timestamp: ..., path: ..., requestId: ... },
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
    { value: 'GURU SMP', label: 'GURU SMP', searchLabel: 'GURU SMP' },
    ...
  ],
  optionsLength: 15
}
```

## Next Steps

1. **Collect Console Logs**: Copy semua log dari browser console
2. **Check Network Response**: Screenshot atau copy response dari Network tab
3. **Verify Database**: Jalankan SQL query langsung di database
4. **Share Findings**: Paste logs untuk analisis lebih lanjut

## Remove Debug Logs (After Fixed)

Once issue resolved, remove debug console.log statements from:
- `schoolApi.ts` lines 142-160
- `CreateSchoolModal.tsx` lines 54-62, 76-82
