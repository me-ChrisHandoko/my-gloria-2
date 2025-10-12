# EditDepartmentModal Layout Analysis & Recommendations

**Date**: 2025-10-12
**Focus**: Perbaiki layout EditDepartmentModal agar konsisten dengan CreateDepartmentModal
**Status**: Analysis Complete - Ready for Implementation

---

## Executive Summary

EditDepartmentModal memiliki **5 major layout inconsistencies** dengan CreateDepartmentModal yang perlu diperbaiki untuk memberikan user experience yang konsisten.

**Impact**:
- 🔴 **Critical**: Layout tidak konsisten menurunkan UX quality
- 🟡 **Important**: Missing visual indicators mengurangi usability
- 🟢 **Enhancement**: Styling improvements untuk consistency

---

## Layout Comparison

### Current State

#### **CreateDepartmentModal** ✅ (Reference/Target)
```
┌─────────────────────────────────────────────────────┐
│ [Name Field        ] [Code Field           ]        │  Row 1: 2 columns
├─────────────────────────────────────────────────────┤
│ [School Combobox   ] [Parent Combobox      ]        │  Row 2: 2 columns
├─────────────────────────────────────────────────────┤
│ [Description Textarea - Full Width          ]        │  Row 3: Full width
├─────────────────────────────────────────────────────┤
│ Active Status               [Switch] →              │  Row 4: Justify-between
│ Set position as active...                           │
└─────────────────────────────────────────────────────┘
```

#### **EditDepartmentModal** ❌ (Current/Needs Fix)
```
┌─────────────────────────────────────────────────────┐
│ [Name Field        ] [Code Field           ]        │  Row 1: 2 columns ✅
├─────────────────────────────────────────────────────┤
│ [School Field - Full Width - Disabled      ]        │  Row 2: Full width ❌
│ School cannot be changed...                         │
├─────────────────────────────────────────────────────┤
│ [Parent Select     ] [EMPTY SPACE          ]        │  Row 3: Wasted space ❌
├─────────────────────────────────────────────────────┤
│ [Description Textarea - Full Width          ]        │  Row 4: Full width ✅
├─────────────────────────────────────────────────────┤
│ [Switch] Active Department                          │  Row 5: Simple flex ❌
└─────────────────────────────────────────────────────┘
```

---

## Issue #1: School Field Layout ❌ CRITICAL

**Location**: EditDepartmentModal.tsx lines 201-217

**Current Code**:
```tsx
<div className="space-y-2">
  <Label>School</Label>
  <Input
    value={
      department.school
        ? `${department.school.name} (${department.school.code})`
        : 'Foundation Level (No School)'
    }
    disabled
    className="bg-muted"
  />
  <p className="text-xs text-muted-foreground">
    {department.schoolId
      ? 'School cannot be changed after creation'
      : 'This is a foundation-level department'}
  </p>
</div>
```

**Problem**: Takes **full width** instead of being in grid with Parent Department

**Impact**:
- Wastes horizontal space
- Creates visual inconsistency with CreateDepartmentModal
- Parent Department appears isolated in next row

**Recommended Fix**: Move into `grid-cols-2` with Parent Department

---

## Issue #2: Parent Department Component ❌ CRITICAL

**Location**: EditDepartmentModal.tsx lines 219-244

**Current Code**:
```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label htmlFor="parent">Parent Department (Optional)</Label>
    <Select
      value={formData.parentId || 'none'}
      onValueChange={(value) =>
        setFormData({ ...formData, parentId: value === 'none' ? undefined : value })
      }
      disabled={isLoadingDepartments}
    >
      <SelectTrigger>
        <SelectValue placeholder={isLoadingDepartments ? 'Loading...' : 'Select parent department'} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {departments.map((dept: Department) => (
          <SelectItem key={dept.id} value={dept.id}>
            {dept.name} ({dept.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
</div>
```

**Problems**:
1. ❌ Uses `Select` instead of `Combobox` (no search functionality)
2. ❌ No visual indicators (Building2/FolderTree icons)
3. ❌ No foundation vs school grouping
4. ❌ No color coding (blue for foundation)
5. ❌ No school name display for school departments
6. ❌ Only 1 field in `grid-cols-2` (wastes 50% space)

**Impact**:
- Poor usability for long department lists (no search)
- Users can't visually distinguish foundation vs school departments
- Inconsistent with CreateDepartmentModal UX

**Recommended Fix**: Use `Combobox` with same visual enhancements as CreateDepartmentModal

---

## Issue #3: Grid Layout Inefficiency ❌ IMPORTANT

**Location**: EditDepartmentModal.tsx lines 219-244

**Current Structure**:
```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    {/* Parent Department - Only 1 field */}
  </div>
  {/* Empty second column - 50% wasted space */}
</div>
```

**Problem**: Grid dengan 2 kolom tapi hanya 1 field, membuang 50% horizontal space

**Recommended Structure**:
```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    {/* School Field (read-only) */}
  </div>
  <div className="space-y-2">
    {/* Parent Department Combobox */}
  </div>
</div>
```

---

## Issue #4: Active Status Styling ❌ IMPORTANT

**Location**: EditDepartmentModal.tsx lines 257-264

**Current Code**:
```tsx
<div className="flex items-center space-x-2">
  <Switch
    id="isActive"
    checked={formData.isActive}
    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
  />
  <Label htmlFor="isActive">Active Department</Label>
</div>
```

**CreateDepartmentModal Code** (Target):
```tsx
<div className="flex items-center justify-between">
  <div className="space-y-0.5">
    <Label htmlFor="isActive">Active Status</Label>
    <p className="text-sm text-muted-foreground">
      Set position as active or inactive
    </p>
  </div>
  <Switch
    id="isActive"
    checked={formData.isActive}
    onCheckedChange={(checked) =>
      setFormData({ ...formData, isActive: checked })
    }
  />
</div>
```

**Problems**:
1. ❌ No `justify-between` - label and switch are left-aligned
2. ❌ Missing description text
3. ❌ Label text different ("Active Department" vs "Active Status")
4. ❌ Visual hierarchy tidak clear

**Impact**: Inconsistent styling dan kurang informative

---

## Issue #5: Missing Visual Indicators ❌ IMPORTANT

**CreateDepartmentModal Imports**:
```tsx
import { Loader2, Building2, FolderTree, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
```

**EditDepartmentModal Imports**:
```tsx
import { Loader2 } from 'lucide-react';
// ❌ Missing: Building2, FolderTree, Check
// ❌ Missing: cn utility
```

**Missing Features**:
1. ❌ Building2 icon for foundation departments (blue)
2. ❌ FolderTree icon for school departments (gray)
3. ❌ Check icon for selected state in Combobox
4. ❌ cn() utility for conditional styling
5. ❌ Color-coded icons (foundation = blue)

**Impact**: Users cannot visually distinguish department types

---

## Detailed Comparison Matrix

| Feature | CreateDepartmentModal | EditDepartmentModal | Status |
|---------|----------------------|---------------------|--------|
| **Layout Structure** |
| Name + Code grid | `grid-cols-2` | `grid-cols-2` | ✅ Match |
| School + Parent grid | `grid-cols-2` | School full width | ❌ Different |
| Description | Full width | Full width | ✅ Match |
| Active Status | `justify-between` | Simple flex | ❌ Different |
| **Component Usage** |
| School selector | Combobox | Disabled Input | ⚠️ Intentional |
| Parent selector | Combobox | Select | ❌ Different |
| Code selector | Combobox | Combobox | ✅ Match |
| **Visual Indicators** |
| Foundation icon | Building2 (blue) | None | ❌ Missing |
| School icon | FolderTree (gray) | None | ❌ Missing |
| Selected check | Check icon | None | ❌ Missing |
| **Functionality** |
| Parent search | Yes (Combobox) | No (Select) | ❌ Missing |
| Parent grouping | Foundation + Schools | Flat list | ❌ Missing |
| School display | With code | With code | ⚠️ Different context |
| **Styling** |
| Active Status label | With description | No description | ❌ Missing |
| Active Status layout | Justified | Left-aligned | ❌ Different |

---

## Implementation Roadmap

### Phase 1: Update Imports ✅ (5 min)

**File**: `EditDepartmentModal.tsx` lines 1-35

**Add Missing Imports**:
```tsx
import { Loader2, Building2, FolderTree, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type UpdateDepartmentDto,
  type Department,
} from '@/lib/api/services/departments.service';
```

**Also import DepartmentExtended for type casting**:
```tsx
import {
  type UpdateDepartmentDto,
  type Department,
  type Department as DepartmentExtended, // For departments with relations
} from '@/lib/api/services/departments.service';
```

---

### Phase 2: Add Department Grouping Logic (10 min)

**File**: `EditDepartmentModal.tsx` after line 85

**Add Missing Import**:
```tsx
import { useGetOrganizationsQuery } from '@/store/api/organizationApi';
```

**Add Schools Query** (after line 59):
```tsx
const { data: organizationsData, isLoading: isLoadingSchools } =
  useGetOrganizationsQuery({ limit: 100 }, { skip: !open });
const schools = organizationsData?.data || [];
```

**Add Grouping Logic** (after line 85):
```tsx
// Group departments by foundation level and school
const groupedDepartments = React.useMemo(() => {
  const foundation = departments.filter((d) => !d.schoolId);
  const schoolDepts = departments.filter((d) => d.schoolId);

  return {
    foundation,
    bySchool: schools.reduce((acc, school) => {
      acc[school.id] = schoolDepts.filter((d) => d.schoolId === school.id);
      return acc;
    }, {} as Record<string, DepartmentExtended[]>),
  };
}, [departments, schools]);
```

---

### Phase 3: Fix Layout Structure (15 min)

**Replace Lines 201-244** with:

```tsx
<div className="grid grid-cols-2 gap-4">
  {/* School Field - Left Column */}
  <div className="space-y-2">
    <Label>School</Label>
    <Input
      value={
        department.school
          ? `${department.school.name} (${department.school.code})`
          : 'Foundation Level (No School)'
      }
      disabled
      className="bg-muted"
    />
    <p className="text-xs text-muted-foreground">
      {department.schoolId
        ? 'School cannot be changed after creation'
        : 'This is a foundation-level department'}
    </p>
  </div>

  {/* Parent Department - Right Column */}
  <div className="space-y-2">
    <Label htmlFor="parent">Parent Department (Optional)</Label>
    <Combobox
      options={[
        { value: "none", label: "None", searchLabel: "none" },
        // Foundation level departments
        ...groupedDepartments.foundation.map((dept) => ({
          value: dept.id,
          label: `🏢 ${dept.name}`,
          searchLabel: `${dept.name} ${dept.code} foundation`,
          group: "Foundation Level",
        })),
        // School-specific departments grouped by school
        ...Object.entries(groupedDepartments.bySchool).flatMap(
          ([schoolId, depts]) => {
            const school = schools.find((s) => s.id === schoolId);
            return depts.map((dept) => ({
              value: dept.id,
              label: dept.name,
              searchLabel: `${dept.name} ${dept.code} ${school?.name || ""}`,
              group: school?.name || "Unknown School",
            }));
          }
        ),
      ]}
      value={formData.parentId || "none"}
      onValueChange={(value) =>
        setFormData({
          ...formData,
          parentId: value === "none" ? undefined : value,
        })
      }
      placeholder={
        isLoadingDepartments
          ? "Loading departments..."
          : "Select parent department"
      }
      searchPlaceholder="Search departments..."
      emptyMessage="No departments found."
      disabled={isLoadingDepartments}
      renderOption={(option, isSelected) => {
        if (option.value === "none") {
          return (
            <>
              <Check
                className={cn(
                  "mr-2 h-4 w-4 shrink-0",
                  isSelected ? "opacity-100" : "opacity-0"
                )}
              />
              <span className="text-muted-foreground italic">
                None
              </span>
            </>
          );
        }
        const dept = departments.find((d) => d.id === option.value) as DepartmentExtended | undefined;
        if (!dept) return null;
        const isFoundation = !dept.schoolId;
        return (
          <>
            <Check
              className={cn(
                "mr-2 h-4 w-4 shrink-0",
                isSelected ? "opacity-100" : "opacity-0"
              )}
            />
            <div className="flex items-start gap-2 w-full min-w-0">
              {isFoundation ? (
                <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
              ) : (
                <FolderTree className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              )}
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span
                  className="font-medium truncate"
                  title={dept.name}
                >
                  {dept.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {dept.code}
                  {isFoundation
                    ? " • Foundation Level"
                    : dept.school
                    ? ` • ${dept.school.name}`
                    : ""}
                </span>
              </div>
            </div>
          </>
        );
      }}
      renderTrigger={(selectedOption) => {
        if (!selectedOption) return null;
        if (selectedOption.value === "none") {
          return (
            <span className="text-muted-foreground italic">
              None
            </span>
          );
        }
        const dept = departments.find(
          (d) => d.id === selectedOption.value
        );
        if (!dept) return <span>{selectedOption.label}</span>;
        const isFoundation = !dept.schoolId;
        return (
          <div className="flex items-center gap-2 w-full min-w-0">
            {isFoundation ? (
              <Building2 className="h-4 w-4 shrink-0 text-blue-500" />
            ) : (
              <FolderTree className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate">{dept.name}</span>
          </div>
        );
      }}
    />
  </div>
</div>
```

---

### Phase 4: Fix Active Status Styling (5 min)

**Replace Lines 257-264** with:

```tsx
<div className="flex items-center justify-between">
  <div className="space-y-0.5">
    <Label htmlFor="isActive">Active Status</Label>
    <p className="text-sm text-muted-foreground">
      Set department as active or inactive
    </p>
  </div>
  <Switch
    id="isActive"
    checked={formData.isActive}
    onCheckedChange={(checked) =>
      setFormData({ ...formData, isActive: checked })
    }
  />
</div>
```

---

## Complete Updated Code

### Updated EditDepartmentModal.tsx

**Lines to Replace**: 1-35 (Imports)

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Building2, FolderTree, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type UpdateDepartmentDto,
  type Department,
  type Department as DepartmentExtended,
} from '@/lib/api/services/departments.service';
import {
  useUpdateDepartmentMutation,
  useGetDepartmentsQuery,
  useGetDepartmentCodeOptionsQuery
} from '@/store/api/departmentApi';
import { useGetOrganizationsQuery } from '@/store/api/organizationApi';
```

**Add After Line 59** (Schools Query):

```tsx
const { data: organizationsData, isLoading: isLoadingSchools } =
  useGetOrganizationsQuery({ limit: 100 }, { skip: !open });
const schools = organizationsData?.data || [];
```

**Add After Line 85** (Grouping Logic):

```tsx
// Group departments by foundation level and school
const groupedDepartments = React.useMemo(() => {
  const foundation = departments.filter((d) => !d.schoolId);
  const schoolDepts = departments.filter((d) => d.schoolId);

  return {
    foundation,
    bySchool: schools.reduce((acc, school) => {
      acc[school.id] = schoolDepts.filter((d) => d.schoolId === school.id);
      return acc;
    }, {} as Record<string, DepartmentExtended[]>),
  };
}, [departments, schools]);
```

**Replace Lines 201-264** (Layout Fix):
See Phase 3 and Phase 4 code above.

---

## Testing Checklist

### Visual Testing
- [ ] School field dan Parent field dalam 1 row (grid-cols-2)
- [ ] Parent Department menggunakan Combobox (bukan Select)
- [ ] Foundation departments tampil dengan Building2 icon (blue)
- [ ] School departments tampil dengan FolderTree icon (gray)
- [ ] Grouping terlihat: "Foundation Level" dan nama school
- [ ] Active Status dengan justify-between layout
- [ ] Description text muncul di bawah Active Status label

### Functional Testing
- [ ] Search parent department works (type to filter)
- [ ] Select foundation parent works
- [ ] Select school parent works
- [ ] Icons muncul di dropdown dan trigger
- [ ] School name muncul untuk school departments
- [ ] Active Status toggle works
- [ ] Form submission works

### Consistency Testing
- [ ] Layout match dengan CreateDepartmentModal
- [ ] Styling match dengan CreateDepartmentModal
- [ ] Icons dan colors match
- [ ] Spacing dan padding consistent

---

## Benefits After Implementation

### User Experience
- ✅ Consistent layout across Create and Edit modals
- ✅ Better space utilization (no wasted columns)
- ✅ Visual distinction between foundation and school departments
- ✅ Searchable parent department dropdown
- ✅ Grouped parent options for better organization

### Developer Experience
- ✅ Consistent code patterns
- ✅ Reusable component logic
- ✅ Easier maintenance
- ✅ Better code readability

### Business Impact
- ✅ Professional and polished UI
- ✅ Reduced user confusion
- ✅ Improved usability
- ✅ Higher user satisfaction

---

## Estimated Implementation Time

- **Phase 1** (Imports): 5 minutes
- **Phase 2** (Grouping Logic): 10 minutes
- **Phase 3** (Layout Fix): 15 minutes
- **Phase 4** (Active Status): 5 minutes
- **Testing**: 10 minutes

**Total**: ~45 minutes

---

## Risk Assessment

**Risk Level**: 🟢 **LOW**

**Risks**:
- Type errors if DepartmentExtended not properly imported ✅ Mitigated by explicit type casting
- Missing schools data if organizationApi not imported ✅ Mitigated by existing pattern from CreateDepartmentModal
- Layout breaking on small screens ✅ Mitigated by using responsive grid-cols-2

**Mitigation**:
- Copy exact code from CreateDepartmentModal (proven to work)
- Test after each phase
- Run TypeScript compilation check

---

## Conclusion

EditDepartmentModal perlu **4 phases of updates** untuk achieve consistency dengan CreateDepartmentModal:

1. ✅ Update imports (icons + utilities)
2. ✅ Add department grouping logic
3. ✅ Fix layout structure (School + Parent in grid-cols-2)
4. ✅ Fix Active Status styling (justify-between + description)

**Total effort**: ~45 minutes
**Impact**: High (consistency + UX improvement)
**Risk**: Low (copying proven patterns)

**Ready for Implementation!**
