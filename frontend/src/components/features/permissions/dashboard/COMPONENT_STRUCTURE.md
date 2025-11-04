# Dashboard Component Structure

## Visual Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PermissionDashboard                            │
│                     (Main Container)                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    StatisticsCards                            │ │
│  │            (4-Column Responsive Grid)                         │ │
│  ├───────────────┬───────────────┬───────────────┬─────────────┤ │
│  │ Total         │ Total         │ Most Used     │ Most Used   │ │
│  │ Permissions   │ Roles         │ Permission    │ Role        │ │
│  │ [Key Icon]    │ [Users Icon]  │ [Trend Icon]  │[Shield Icon]│ │
│  │               │               │               │             │ │
│  │ 250           │ 45            │ 1,250         │ 85          │ │
│  │ 240 active    │ 42 active     │ users.read    │ Manager     │ │
│  │ (96%)         │ (93%)         │               │             │ │
│  └───────────────┴───────────────┴───────────────┴─────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                     Charts Section                            │ │
│  │              (2-Column Responsive Grid)                       │ │
│  ├──────────────────────────────┬────────────────────────────────┤ │
│  │ Permission Usage by Category │ Role Distribution by Hierarchy │ │
│  │      (Bar Chart)             │        (Bar Chart)             │ │
│  │  ┌─────┐                     │   ┌─────┐                     │ │
│  │  │████ │  Category A         │   │████ │ Level 1             │ │
│  │  │███  │  Category B         │   │██   │ Level 2             │ │
│  │  │██   │  Category C         │   │███  │ Level 3             │ │
│  │  └─────┘                     │   └─────┘                     │ │
│  ├──────────────────────────────┼────────────────────────────────┤ │
│  │ Permission Type Distribution │ Role Type Distribution         │ │
│  │      (Pie Chart)             │      (Pie Chart)               │ │
│  │      ╱───────╲               │      ╱───────╲                │ │
│  │     ╱ System  ╲              │     ╱ System  ╲               │ │
│  │    │    60%    │             │    │    75%    │              │ │
│  │     ╲ Custom  ╱              │     ╲ Custom  ╱               │ │
│  │      ╲───────╱               │      ╲───────╱                │ │
│  └──────────────────────────────┴────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    RecentActivities                           │ │
│  │              (Scrollable Activity Feed)                       │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │ [Icon] John Admin assigned role Manager Role     5 mins ago  │ │
│  │        └─ department: Sales                                  │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │ [Icon] Jane Smith granted permission users.delete 15 mins ago│ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │ [Icon] System Admin created role Senior Developer 30 mins ago│ │
│  │        └─ hierarchyLevel: 3                                  │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │ [Icon] Security Team revoked permission... 45 mins ago       │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │ [Icon] HR Department revoked role Temporary Access 1 hour ago│ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Data Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Data Flow Diagram                            │
└──────────────────────────────────────────────────────────────────────┘

Backend API
    │
    ├─► GET /permissions/usage-statistics
    │        │
    │        ▼
    │   useGetPermissionUsageStatisticsQuery()
    │        │
    │        ▼
    │   PermissionUsageStatistics
    │        │
    │        ├─► StatisticsCards (permission data)
    │        │       │
    │        │       └─► Total Permissions Card
    │        │       └─► Most Used Permission Card
    │        │
    │        └─► PermissionDashboard (charts)
    │                │
    │                └─► Permission Category Chart
    │                └─► Permission Type Pie Chart
    │
    ├─► GET /permissions/roles/usage-statistics
    │        │
    │        ▼
    │   useGetRoleUsageStatisticsQuery()
    │        │
    │        ▼
    │   RoleUsageStatistics
    │        │
    │        ├─► StatisticsCards (role data)
    │        │       │
    │        │       └─► Total Roles Card
    │        │       └─► Most Used Role Card
    │        │
    │        └─► PermissionDashboard (charts)
    │                │
    │                └─► Role Hierarchy Chart
    │                └─► Role Type Pie Chart
    │
    └─► GET /permissions/activities (optional)
             │
             ▼
        useGetRecentActivitiesQuery()
             │
             ▼
        ActivityItem[]
             │
             └─► RecentActivities
                     │
                     └─► Activity Feed Items
```

## Component State Management

```
┌──────────────────────────────────────────────────────────────────────┐
│                      State Management Flow                           │
└──────────────────────────────────────────────────────────────────────┘

PermissionDashboard
    │
    ├─► Local State (useMemo)
    │   ├─► permissionCategoryData (computed from permissionStats)
    │   ├─► roleHierarchyData (computed from roleStats)
    │   ├─► permissionTypeData (computed from permissionStats)
    │   └─► roleTypeData (computed from roleStats)
    │
    ├─► RTK Query State
    │   ├─► permissionStats (cached 5 min)
    │   │   ├─► isLoading
    │   │   ├─► error
    │   │   └─► data
    │   │
    │   └─► roleStats (cached 5 min)
    │       ├─► isLoading
    │       ├─► error
    │       └─► data
    │
    └─► Props State
        ├─► activities (from parent or mock)
        └─► activitiesLoading (from parent)

StatisticsCards
    │
    └─► Props (read-only)
        ├─► permissionStats (from parent)
        ├─► roleStats (from parent)
        └─► isLoading (from parent)

RecentActivities
    │
    └─► Props (read-only)
        ├─► activities (from parent)
        ├─► isLoading (from parent)
        └─► maxHeight (optional)
```

## Responsive Breakpoints

```
Mobile (< 768px)
┌─────────────────┐
│ [Statistics]    │ ← Single column
│ [Card 1]        │
│ [Card 2]        │
│ [Card 3]        │
│ [Card 4]        │
│ [Chart 1]       │ ← Single column
│ [Chart 2]       │
│ [Chart 3]       │
│ [Chart 4]       │
│ [Activities]    │
└─────────────────┘

Tablet (768px - 1024px)
┌─────────────────────────────────┐
│ [Statistics]                    │
│ [Card 1]    [Card 2]            │ ← 2 columns
│ [Card 3]    [Card 4]            │
│ [Chart 1]   [Chart 2]           │ ← 2 columns
│ [Chart 3]   [Chart 4]           │
│ [Activities]                    │
└─────────────────────────────────┘

Desktop (> 1024px)
┌─────────────────────────────────────────────────┐
│ [Statistics]                                    │
│ [Card 1] [Card 2] [Card 3] [Card 4]            │ ← 4 columns
│ [Chart 1]          [Chart 2]                    │ ← 2 columns
│ [Chart 3]          [Chart 4]                    │
│ [Activities]                                    │
└─────────────────────────────────────────────────┘
```

## Error & Loading States

```
┌──────────────────────────────────────────────────────────────────────┐
│                    State Transitions Diagram                         │
└──────────────────────────────────────────────────────────────────────┘

Initial Load
    │
    ├─► isLoading = true
    │       │
    │       └─► Display Skeleton Loaders
    │           ├─► StatisticsCards: 4 skeleton cards
    │           ├─► Charts: 4 skeleton rectangles
    │           └─► Activities: 5 skeleton items
    │
    ├─► Success
    │   │
    │   └─► isLoading = false, data exists
    │       │
    │       └─► Display Full Dashboard
    │           ├─► StatisticsCards with data
    │           ├─► Charts with visualizations
    │           └─► Activities list
    │
    └─► Error
        │
        └─► error exists
            │
            └─► Display Error Alert
                ├─► AlertCircle icon
                ├─► Error title
                └─► Error description

Empty States
    │
    ├─► No Activities
    │   │
    │   └─► Display Empty State
    │       ├─► Activity icon
    │       ├─► "No activities yet"
    │       └─► Helpful message
    │
    └─► No Chart Data
        │
        └─► Display Empty Message
            └─► "No data available"
```

## Component Communication

```
Parent Component (Page)
    │
    │ creates
    ▼
PermissionDashboard
    │
    │ renders
    ├──────────────┬──────────────────┬──────────────────┐
    ▼              ▼                  ▼                  ▼
StatisticsCards  Charts         RecentActivities    Error/Loading
    │              │                  │
    │ receives     │ computes         │ receives
    │ props        │ data             │ props
    │              │                  │
    ▼              ▼                  ▼
Card Components  Recharts          ScrollArea
    │              │                  │
    │              │                  ▼
    │              │              Activity Items
    │              │                  │
    ▼              ▼                  ▼
shadcn/ui      Visualizations    Icons & Text
```

## File Dependencies

```
PermissionDashboard.tsx
    ├── imports
    │   ├── React (useMemo)
    │   ├── Recharts (BarChart, PieChart, etc.)
    │   ├── lucide-react (AlertCircle)
    │   ├── @/components/ui (Alert, Card, Skeleton)
    │   ├── @/store/api/analyticsApi (hooks)
    │   ├── ./StatisticsCards
    │   └── ./RecentActivities
    │
    └── exports
        └── PermissionDashboard

StatisticsCards.tsx
    ├── imports
    │   ├── lucide-react (Key, Users, TrendingUp, Shield)
    │   ├── @/components/ui (Card, Skeleton)
    │   └── @/types/permissions/analytics.types
    │
    └── exports
        └── StatisticsCards

RecentActivities.tsx
    ├── imports
    │   ├── date-fns (formatDistanceToNow)
    │   ├── lucide-react (multiple icons)
    │   ├── @/components/ui (ScrollArea, Card, Skeleton)
    │   └── local types (ActivityItem)
    │
    └── exports
        ├── RecentActivities
        └── ActivityItem (type)

index.ts
    └── exports
        ├── PermissionDashboard
        ├── StatisticsCards
        ├── RecentActivities
        └── ActivityItem (type)
```

## Performance Optimization Points

```
PermissionDashboard
    │
    ├─► useMemo for chart data
    │   ├─► permissionCategoryData (recomputes only when permissionStats changes)
    │   ├─► roleHierarchyData (recomputes only when roleStats changes)
    │   ├─► permissionTypeData (recomputes only when permissionStats changes)
    │   └─► roleTypeData (recomputes only when roleStats changes)
    │
    ├─► RTK Query Caching
    │   ├─► 5-minute cache for statistics
    │   └─► Automatic request deduplication
    │
    └─► Component Memoization
        └─► Child components re-render only when props change

StatisticsCards
    │
    └─► Conditional Rendering
        ├─► Early return for loading state
        └─► Computed values cached in component

RecentActivities
    │
    ├─► ScrollArea Virtualization
    │   └─► Only visible items rendered
    │
    └─► Formatted Timestamps
        └─► Computed once per render
```

## Accessibility Tree

```
PermissionDashboard (container)
    │
    ├─► section[aria-label="Statistics Overview"]
    │   └─► StatisticsCards
    │       ├─► Card
    │       │   ├─► CardHeader
    │       │   │   ├─► CardTitle
    │       │   │   └─► Icon[aria-hidden]
    │       │   └─► CardContent
    │       │       ├─► Heading (statistics)
    │       │       └─► Paragraph (details)
    │       └─► [3 more cards...]
    │
    ├─► section[aria-label="Usage Charts"]
    │   └─► Grid
    │       ├─► Card (Chart 1)
    │       │   ├─► CardHeader
    │       │   │   ├─► CardTitle
    │       │   │   └─► CardDescription
    │       │   └─► CardContent
    │       │       └─► ResponsiveContainer
    │       │           └─► BarChart[role="img"]
    │       └─► [3 more chart cards...]
    │
    └─► section[aria-label="Recent Activities"]
        └─► RecentActivities
            └─► Card
                ├─► CardHeader
                │   ├─► CardTitle
                │   └─► CardDescription
                └─► CardContent
                    └─► ScrollArea
                        └─► List
                            ├─► Activity Item
                            │   ├─► Icon[aria-hidden]
                            │   ├─► Text (action)
                            │   └─► Time[aria-label="timestamp"]
                            └─► [more items...]
```

---

This structure provides a clear understanding of how the dashboard components are organized, communicate, and render data in a responsive and accessible manner.
