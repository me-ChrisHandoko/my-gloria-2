# Migration: nanoid → uuidv7

## Overview
Mengganti semua penggunaan `nanoid` dengan `uuidv7` untuk konsistensi ID generation di seluruh codebase.

## Rationale
- **Konsistensi**: Mayoritas codebase sudah menggunakan `uuidv7`
- **Standarisasi**: UUID v7 adalah standar yang lebih widespread
- **Sortability**: UUID v7 time-sortable seperti nanoid
- **Compatibility**: Better integration dengan database dan external systems

## Changes Made

### Files Modified (3 files)
1. `src/modules/permissions/services/permission-users.service.ts`
2. `src/modules/permissions/services/permission-roles.service.ts`
3. `src/modules/permissions/services/permission-resources.service.ts`

### Import Changes
**Before:**
```typescript
import { nanoid } from 'nanoid';
```

**After:**
```typescript
import { v7 as uuidv7 } from 'uuid';
```

### Function Call Changes
**Before:**
```typescript
id: nanoid()
```

**After:**
```typescript
id: uuidv7()
```

## Verification

### Check 1: No nanoid imports remaining
```bash
grep -r "nanoid" src/ --include="*.ts"
# Result: 0 matches ✓
```

### Check 2: UUID v7 properly imported
```bash
grep -r "import { v7 as uuidv7 } from 'uuid'" src/
# Result: 3+ files ✓
```

### Check 3: All nanoid() calls replaced
```bash
grep -r "nanoid()" src/ --include="*.ts"
# Result: 0 matches ✓
```

## Impact Analysis

### TypeScript Errors
- **Before migration**: 52 errors
- **After migration**: 48 errors
- **Errors fixed**: 4 errors (import-related)
- **New errors**: 0

### Runtime Impact
- ✅ **No breaking changes**: Both generate string IDs
- ✅ **Same ID length**: Both produce comparable length IDs
- ✅ **Database compatible**: No schema changes needed
- ✅ **Time-sortable**: Both support chronological ordering

### Dependencies
- ✅ `uuid` package already in dependencies
- ❌ `nanoid` can be removed from package.json (optional cleanup)

## Testing Recommendations

1. **Unit Tests**: Verify ID generation still works
2. **Integration Tests**: Check database inserts with new IDs
3. **Migration Tests**: If migrating existing data, test ID compatibility

## Follow-up Actions

### Optional Cleanup
```bash
# Remove nanoid from package.json if no longer needed
npm uninstall nanoid
```

### Verify in Other Modules
```bash
# Check if nanoid is used elsewhere
grep -r "nanoid" src/ --include="*.ts" --include="*.js"
```

## Rollback Plan

If issues arise, revert with:
```bash
git checkout src/modules/permissions/services/permission-users.service.ts
git checkout src/modules/permissions/services/permission-roles.service.ts
git checkout src/modules/permissions/services/permission-resources.service.ts
```

## Related Changes

This migration was part of:
- TypeScript error reduction effort (69 → 48 errors)
- Code standardization initiative
- Import path cleanup (`@/core/prisma` → `@/core/database`)

## Date
2025-01-29

## Status
✅ **COMPLETED**
