# Shared Permission System Components

Reusable UI components for the permissions system in My Gloria 2.

## Components

### PermissionBadge

Display permission status with color-coded badges.

**Props:**
- `isGranted?: boolean` - Permission granted status (default: true)
- `isActive?: boolean` - Permission active status (default: true)
- `isExpired?: boolean` - Permission expired status (default: false)
- `className?: string` - Additional CSS classes

**Variants:**
- **Granted** (green) - Permission is granted and active
- **Denied** (red) - Permission is denied
- **Inactive** (orange) - Permission exists but is inactive
- **Expired** (gray) - Permission has expired

**Example:**
```tsx
import { PermissionBadge } from '@/components/features/permissions/shared';

<PermissionBadge isGranted={true} isActive={true} />
<PermissionBadge isGranted={false} />
<PermissionBadge isExpired={true} />
```

---

### RoleBadge

Display role status with icons and hierarchy level indicators.

**Props:**
- `isActive?: boolean` - Role active status (default: true)
- `isSystem?: boolean` - System role indicator (default: false)
- `hierarchyLevel?: number` - Role hierarchy level (0-10)
- `className?: string` - Additional CSS classes

**Variants:**
- **System** (blue with lock icon) - System-defined role
- **Active** (green with shield icon) - Active role with optional level
- **Inactive** (gray) - Inactive role

**Example:**
```tsx
import { RoleBadge } from '@/components/features/permissions/shared';

<RoleBadge isActive={true} hierarchyLevel={2} />
<RoleBadge isSystem={true} />
<RoleBadge isActive={false} />
```

---

### TemporalDatePicker

Date range picker for temporal permission/role assignments.

**Props:**
- `effectiveFrom?: Date | null` - Start date of permission validity
- `effectiveTo?: Date | null` - End date of permission validity
- `onChange: (from?: Date | null, to?: Date | null) => void` - Date change callback
- `disabled?: boolean` - Disable date selection
- `className?: string` - Additional CSS classes

**Features:**
- Date range validation (end date must be after start date)
- "Permanent" option when no dates are set
- Clear dates button
- Calendar popover for date selection
- Disabled dates (end date cannot be before start date)

**Example:**
```tsx
import { TemporalDatePicker } from '@/components/features/permissions/shared';

const [effectiveFrom, setEffectiveFrom] = useState<Date | null>(null);
const [effectiveTo, setEffectiveTo] = useState<Date | null>(null);

<TemporalDatePicker
  effectiveFrom={effectiveFrom}
  effectiveTo={effectiveTo}
  onChange={(from, to) => {
    setEffectiveFrom(from);
    setEffectiveTo(to);
  }}
/>
```

---

### HierarchyLevelIndicator

Visual indicator for role hierarchy levels with progress bar.

**Props:**
- `level: number` - Hierarchy level (0-10)
- `maxLevel?: number` - Maximum level (default: 10)
- `showLabel?: boolean` - Show level badge (default: true)
- `className?: string` - Additional CSS classes

**Features:**
- Color-coded progress bar (purple for level 0 to gray for level 10)
- Level badge with number
- Tooltip with level description
- Responsive design

**Hierarchy Levels:**
- **Level 0** - Foundation Level (Highest Authority)
- **Level 1-2** - Executive/Senior Management
- **Level 3-4** - Middle Management/Team Leadership
- **Level 5-6** - Senior/Regular Staff
- **Level 7-8** - Junior Staff/Intern
- **Level 9-10** - Temporary/Guest Access

**Example:**
```tsx
import { HierarchyLevelIndicator } from '@/components/features/permissions/shared';

<HierarchyLevelIndicator level={0} />
<HierarchyLevelIndicator level={5} showLabel={true} />
<HierarchyLevelIndicator level={10} maxLevel={10} />
```

---

### HierarchyLevelDots

Alternative dot-based visualization for hierarchy levels.

**Props:**
- `level: number` - Hierarchy level (0-10)
- `maxLevel?: number` - Maximum level (default: 10)
- `className?: string` - Additional CSS classes

**Features:**
- Dot-based visual representation
- Color-coded dots based on level
- Tooltip with level description
- Compact design for tables

**Example:**
```tsx
import { HierarchyLevelDots } from '@/components/features/permissions/shared';

<HierarchyLevelDots level={3} />
<HierarchyLevelDots level={7} maxLevel={10} />
```

---

## Usage in Tables

These components are designed to work seamlessly in data tables:

```tsx
import {
  PermissionBadge,
  RoleBadge,
  HierarchyLevelIndicator,
  HierarchyLevelDots
} from '@/components/features/permissions/shared';

// In your column definition
const columns = [
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <PermissionBadge
        isGranted={row.original.isGranted}
        isActive={row.original.isActive}
      />
    ),
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => (
      <RoleBadge
        isActive={row.original.role.isActive}
        isSystem={row.original.role.isSystem}
        hierarchyLevel={row.original.role.hierarchyLevel}
      />
    ),
  },
  {
    accessorKey: 'hierarchyLevel',
    header: 'Level',
    cell: ({ row }) => (
      <HierarchyLevelDots level={row.original.hierarchyLevel} />
    ),
  },
];
```

## Accessibility

All components follow WCAG 2.1 AA standards:

- Proper ARIA labels and roles
- Keyboard navigation support
- Color contrast compliance
- Screen reader compatibility
- Focus management

## Dependencies

- `@/components/ui/badge` - Badge component from shadcn/ui
- `@/components/ui/button` - Button component from shadcn/ui
- `@/components/ui/calendar` - Calendar component from shadcn/ui
- `@/components/ui/popover` - Popover component from shadcn/ui
- `@/components/ui/progress` - Progress component from shadcn/ui
- `@/components/ui/tooltip` - Tooltip component from shadcn/ui
- `date-fns` - Date formatting and manipulation
- `lucide-react` - Icon library
