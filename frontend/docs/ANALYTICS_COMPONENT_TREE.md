# Analytics Component Tree

Visual representation of the analytics component structure and relationships.

```
AnalyticsDashboard (Container)
├── Bulk Operations Section
│   ├── Card (shadcn/ui)
│   │   ├── CardHeader → CardTitle
│   │   └── CardContent
│   │       ├── Button → BulkAssignRolesDialog
│   │       ├── Button → BulkAssignPermissionsDialog
│   │       └── Button → BulkRevokeRolesDialog
│   │
│   ├── BulkAssignRolesDialog
│   │   ├── Dialog (shadcn/ui)
│   │   ├── Form (react-hook-form)
│   │   │   ├── Label + textarea (userIds)
│   │   │   └── Label + textarea (roleIds)
│   │   ├── Alert (operation result)
│   │   └── useBulkAssignRolesMutation
│   │
│   ├── BulkAssignPermissionsDialog
│   │   ├── Dialog (shadcn/ui)
│   │   ├── Form (react-hook-form)
│   │   │   ├── Label + textarea (roleIds)
│   │   │   └── Label + textarea (permissionIds)
│   │   ├── Alert (operation result)
│   │   └── useBulkAssignPermissionsMutation
│   │
│   └── BulkRevokeRolesDialog
│       ├── Dialog (shadcn/ui)
│       ├── Alert (warning - destructive)
│       ├── Form (react-hook-form)
│       │   ├── Label + textarea (userIds)
│       │   └── Label + textarea (roleIds)
│       ├── Alert (operation result)
│       └── useBulkRevokeRolesMutation
│
└── Analytics Section
    └── PermissionDashboard (Reused from dashboard/)
        ├── StatisticsCards
        ├── Permission Category Chart (BarChart)
        ├── Role Hierarchy Chart (BarChart)
        ├── Permission Type Chart (PieChart)
        ├── Role Type Chart (PieChart)
        └── RecentActivities

UsageStatistics (Standalone)
├── Permission Statistics Section
│   └── Grid (2-4 columns)
│       ├── StatCard (Total Permissions)
│       ├── StatCard (System Permissions)
│       ├── StatCard (Custom Permissions)
│       └── StatCard (Active Rate)
│
├── Role Statistics Section
│   └── Grid (2-4 columns)
│       ├── StatCard (Total Roles)
│       ├── StatCard (System Roles)
│       ├── StatCard (Custom Roles)
│       └── StatCard (Roles with Users)
│
└── Additional Metrics Section
    └── Grid (2-3 columns)
        ├── StatCard (Avg Permissions/Role)
        ├── StatCard (Roles with Permissions)
        └── StatCard (Roles with Module Access)

RoleUsageChart (Standalone)
├── Card (shadcn/ui)
│   ├── CardHeader → CardTitle + CardDescription
│   └── CardContent
│       └── ResponsiveContainer
│           ├── BarChart (most-used, least-used, hierarchy)
│           │   ├── CartesianGrid
│           │   ├── XAxis
│           │   ├── YAxis
│           │   ├── Tooltip
│           │   ├── Legend
│           │   └── Bar (multiple)
│           │
│           └── PieChart (type-distribution)
│               ├── Pie
│               │   └── Cell (colored)
│               └── Tooltip
│
└── useGetRoleUsageStatisticsQuery

PermissionUsageChart (Standalone)
├── Card (shadcn/ui)
│   ├── CardHeader → CardTitle + CardDescription
│   └── CardContent
│       └── ResponsiveContainer
│           ├── BarChart (most-used, least-used, by-category)
│           │   ├── CartesianGrid
│           │   ├── XAxis
│           │   ├── YAxis
│           │   ├── Tooltip
│           │   ├── Legend
│           │   └── Bar (multiple)
│           │
│           └── PieChart (type-distribution)
│               ├── Pie
│               │   └── Cell (colored)
│               └── Tooltip
│
└── useGetPermissionUsageStatisticsQuery
```

## Data Flow

```
Backend API
    ↓
analyticsApi (RTK Query)
    ├── useGetPermissionUsageStatisticsQuery → PermissionUsageChart
    ├── useGetRoleUsageStatisticsQuery → RoleUsageChart
    ├── useBulkAssignRolesMutation → BulkAssignRolesDialog
    ├── useBulkAssignPermissionsMutation → BulkAssignPermissionsDialog
    └── useBulkRevokeRolesMutation → BulkRevokeRolesDialog
```

## State Management

```
AnalyticsDashboard
    ├── bulkAssignRolesOpen (local state)
    ├── bulkAssignPermissionsOpen (local state)
    └── bulkRevokeRolesOpen (local state)

Bulk Operation Dialogs
    ├── form state (react-hook-form)
    └── operationResult (local state)

Charts
    └── chartData (useMemo - derived from API data)
```

## Props Flow

```
AnalyticsDashboard
    ├── className?: string
    │
    ├── → BulkAssignRolesDialog
    │   ├── open: boolean
    │   └── onOpenChange: (open: boolean) => void
    │
    ├── → BulkAssignPermissionsDialog
    │   ├── open: boolean
    │   └── onOpenChange: (open: boolean) => void
    │
    └── → BulkRevokeRolesDialog
        ├── open: boolean
        └── onOpenChange: (open: boolean) => void

RoleUsageChart
    ├── type?: 'most-used' | 'least-used' | 'hierarchy' | 'type-distribution'
    ├── className?: string
    └── height?: number

PermissionUsageChart
    ├── type?: 'most-used' | 'least-used' | 'by-category' | 'type-distribution'
    ├── className?: string
    └── height?: number
```

## Component Composition Patterns

### 1. Container Pattern
`AnalyticsDashboard` acts as a container that composes:
- Bulk operation buttons
- Analytics display (PermissionDashboard)
- Dialog management

### 2. Compound Pattern
Dialogs use compound components:
- Dialog + DialogContent + DialogHeader + DialogFooter
- Card + CardHeader + CardContent

### 3. Render Props Pattern
Charts use render props for customization:
- ResponsiveContainer wraps charts
- Tooltip and Legend components

### 4. Hook Pattern
All components use custom hooks:
- API hooks for data fetching
- Form hooks for validation
- State hooks for local state

## Reusability

Components are designed for maximum reusability:

1. **Standalone Charts**: Can be used independently
2. **Configurable Dialogs**: Props-based configuration
3. **Flexible Container**: AnalyticsDashboard can be extended
4. **Barrel Exports**: Clean import paths

## Example Compositions

### Full Dashboard
```tsx
<AnalyticsDashboard />
```

### Statistics Only
```tsx
<UsageStatistics />
```

### Custom Chart Layout
```tsx
<div className="grid gap-4 md:grid-cols-2">
  <RoleUsageChart type="most-used" />
  <RoleUsageChart type="hierarchy" />
  <PermissionUsageChart type="by-category" />
  <PermissionUsageChart type="type-distribution" />
</div>
```

### Standalone Bulk Operations
```tsx
<div>
  <Button onClick={() => setOpen(true)}>Bulk Assign</Button>
  <BulkAssignRolesDialog open={open} onOpenChange={setOpen} />
</div>
```
