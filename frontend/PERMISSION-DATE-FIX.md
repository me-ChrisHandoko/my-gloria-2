# Permission API Date Handling Fix

## Issue
`RangeError: Invalid time value` terjadi di `permissionApi.ts:55` ketika mencoba mengkonversi date values yang invalid ke ISO string.

## Root Cause
Backend API mengirim data dengan `createdAt` atau `updatedAt` yang bernilai:
- `null`
- `undefined`
- String kosong `""`
- Format date yang tidak valid

Ketika `new Date(invalidValue).toISOString()` dipanggil, JavaScript throws `RangeError` karena Invalid Date object.

## Solution
Tambahkan helper function `toSafeISOString()` yang:
1. Memeriksa apakah value ada (not null/undefined)
2. Membuat Date object
3. Validasi menggunakan `isNaN(date.getTime())`
4. Return ISO string jika valid, atau `null` jika invalid

## Code Changes

### Before (Error)
```typescript
transformResponse: (response: any) => {
  return {
    ...response,
    data: response.data.map((perm: any) => ({
      ...perm,
      createdAt: new Date(perm.createdAt).toISOString(), // ❌ Throws RangeError
      updatedAt: new Date(perm.updatedAt).toISOString(), // ❌ Throws RangeError
    })),
  };
}
```

### After (Fixed)
```typescript
transformResponse: (response: any) => {
  // Helper function to safely convert date strings
  const toSafeISOString = (dateValue: any): string | null => {
    if (!dateValue) return null;
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date.toISOString();
  };

  return {
    ...response,
    data: response.data.map((perm: any) => ({
      ...perm,
      createdAt: toSafeISOString(perm.createdAt), // ✅ Safe conversion
      updatedAt: toSafeISOString(perm.updatedAt), // ✅ Safe conversion
    })),
  };
}
```

## Testing
1. Visit: http://localhost:3000/permissions/permissions
2. Verify permissions load without errors
3. Check browser console - no more RangeError
4. Verify date display works correctly for valid dates
5. Verify graceful handling for null/invalid dates

## Type Safety
✅ TypeScript compilation passes with no errors

## Related Issues
This fix complements the RTK Query error logging fix implemented earlier.
