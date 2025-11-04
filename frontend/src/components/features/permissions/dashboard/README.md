# Permission Dashboard Components

Phase 6: Analytics & Bulk Operations - Dashboard implementation for permission analytics overview.

## Overview

The Permission Dashboard provides a comprehensive analytics interface for monitoring permission and role usage across your application. It includes statistics cards, interactive charts, and a real-time activity feed.

## Components

### 1. PermissionDashboard (Main Container)

The primary dashboard component that orchestrates the entire analytics view.

**Features:**
- Automatic data fetching using RTK Query hooks
- Responsive grid layout (mobile-first)
- Interactive charts with Recharts
- Error handling with fallback UI
- Loading states with skeletons
- Accessibility support (ARIA labels)

**Usage:**

```tsx
import { PermissionDashboard } from '@/components/features/permissions/dashboard';

export default function AnalyticsPage() {
  return (
    <div className="container py-6">
      <PermissionDashboard />
    </div>
  );
}
```

**With Custom Activities:**

```tsx
import { PermissionDashboard } from '@/components/features/permissions/dashboard';
import { useGetRecentActivitiesQuery } from '@/store/api/analyticsApi';

export default function AnalyticsPage() {
  const { data: activities = [], isLoading } = useGetRecentActivitiesQuery();

  return (
    <PermissionDashboard
      activities={activities}
      activitiesLoading={isLoading}
    />
  );
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `activities` | `ActivityItem[]` | `[]` | Array of recent activity items |
| `activitiesLoading` | `boolean` | `false` | Loading state for activities |

---

### 2. StatisticsCards

Displays key metrics in card format with icons and percentages.

**Features:**
- 4 metric cards: Total Permissions, Total Roles, Most Used Permission, Most Used Role
- Active/Inactive breakdown with percentages
- System vs Custom classification
- Loading skeletons
- Responsive grid layout

**Usage:**

```tsx
import { StatisticsCards } from '@/components/features/permissions/dashboard';
import {
  useGetPermissionUsageStatisticsQuery,
  useGetRoleUsageStatisticsQuery,
} from '@/store/api/analyticsApi';

export function MyComponent() {
  const { data: permissionStats, isLoading: permLoading } =
    useGetPermissionUsageStatisticsQuery();
  const { data: roleStats, isLoading: roleLoading } =
    useGetRoleUsageStatisticsQuery();

  return (
    <StatisticsCards
      permissionStats={permissionStats}
      roleStats={roleStats}
      isLoading={permLoading || roleLoading}
    />
  );
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `permissionStats` | `PermissionUsageStatistics` | `undefined` | Permission usage data |
| `roleStats` | `RoleUsageStatistics` | `undefined` | Role usage data |
| `isLoading` | `boolean` | `false` | Loading state |

---

### 3. RecentActivities

Activity feed displaying recent permission and role changes.

**Features:**
- Scrollable activity list
- Activity type icons with color coding
- Relative timestamps (e.g., "5 minutes ago")
- Metadata badges
- Empty state with icon
- Customizable height

**Usage:**

```tsx
import { RecentActivities, type ActivityItem } from '@/components/features/permissions/dashboard';

const activities: ActivityItem[] = [
  {
    id: '1',
    type: 'ROLE_ASSIGNED',
    user: 'John Doe',
    target: 'Manager Role',
    timestamp: new Date(),
    metadata: { department: 'Sales' },
  },
  // ... more activities
];

export function MyComponent() {
  return (
    <RecentActivities
      activities={activities}
      isLoading={false}
      maxHeight="500px"
    />
  );
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `activities` | `ActivityItem[]` | Required | Array of activity items |
| `isLoading` | `boolean` | `false` | Loading state |
| `maxHeight` | `string` | `'400px'` | Maximum height for scroll area |

**ActivityItem Type:**

```typescript
interface ActivityItem {
  id: string;
  type:
    | 'ROLE_ASSIGNED'
    | 'ROLE_REVOKED'
    | 'PERMISSION_GRANTED'
    | 'PERMISSION_REVOKED'
    | 'ROLE_CREATED'
    | 'ROLE_UPDATED'
    | 'PERMISSION_CREATED'
    | 'PERMISSION_UPDATED';
  user: string;           // User who performed the action
  target: string;         // Target role/permission name
  timestamp: Date | string;
  metadata?: Record<string, any>;
}
```

## Charts

The dashboard includes 4 interactive charts powered by Recharts:

1. **Permission Usage by Category** (Bar Chart)
   - Shows top 6 permission categories
   - Displays permission count and usage count
   - Responsive and interactive tooltips

2. **Role Distribution by Hierarchy** (Bar Chart)
   - Displays roles and users at each hierarchy level
   - Helps visualize organizational structure

3. **Permission Type Distribution** (Pie Chart)
   - System vs Custom permissions breakdown
   - Percentage labels for easy understanding

4. **Role Type Distribution** (Pie Chart)
   - System vs Custom roles breakdown
   - Percentage labels for easy understanding

## API Integration

The dashboard automatically fetches data using these RTK Query hooks:

```typescript
import {
  useGetPermissionUsageStatisticsQuery,
  useGetRoleUsageStatisticsQuery,
} from '@/store/api/analyticsApi';
```

**Backend Endpoints:**
- `GET /api/v1/permissions/usage-statistics` - Permission statistics
- `GET /api/v1/permissions/roles/usage-statistics` - Role statistics

**Cache Settings:**
- Statistics cached for 5 minutes
- Automatic revalidation on relevant mutations

## Styling & Theming

All components use Tailwind CSS and shadcn/ui design system:

- Fully responsive (mobile-first approach)
- Dark mode support via CSS variables
- Consistent spacing and typography
- Accessible color contrast ratios

**Color Palette:**

```typescript
const COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  purple: '#a855f7',
  indigo: '#6366f1',
};
```

## Accessibility

All components follow WCAG 2.1 AA standards:

- Semantic HTML structure
- ARIA labels for sections
- Keyboard navigation support
- Screen reader compatible
- Sufficient color contrast
- Focus indicators
- Alternative text for icons

**Testing:**
```bash
# Run accessibility audit
npm run a11y-check

# Test with screen reader (VoiceOver on Mac)
# Navigate through dashboard with keyboard only
```

## Error Handling

The dashboard includes comprehensive error handling:

1. **API Errors**: Displays error alert with retry option
2. **Empty States**: Shows helpful messages when no data
3. **Loading States**: Skeleton loaders for smooth UX
4. **Type Safety**: Full TypeScript support

**Error Display:**

```tsx
// Automatic error handling in PermissionDashboard
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error Loading Dashboard</AlertTitle>
  <AlertDescription>
    Failed to load statistics. Please try again later.
  </AlertDescription>
</Alert>
```

## Performance Optimization

- **Data Caching**: 5-minute cache for analytics queries
- **Lazy Loading**: Charts render only when visible
- **Memoization**: Chart data computed with useMemo
- **Responsive Images**: Optimized icon sizes
- **Bundle Size**: Tree-shakeable imports

## Examples

See `DashboardExample.tsx` for complete implementation examples including:

- Basic usage
- Custom activity integration
- Page layout examples
- Mock data for testing

## Dependencies

Required packages (already installed):

```json
{
  "recharts": "^3.2.0",      // Charts
  "date-fns": "^4.1.0",      // Date formatting
  "lucide-react": "^0.544.0" // Icons
}
```

## File Structure

```
dashboard/
├── PermissionDashboard.tsx    # Main container
├── StatisticsCards.tsx        # Metric cards
├── RecentActivities.tsx       # Activity feed
├── DashboardExample.tsx       # Usage examples
├── index.ts                   # Public exports
└── README.md                  # This file
```

## Next Steps

To implement the dashboard in your application:

1. **Create Analytics Page:**
   ```tsx
   // app/(dashboard)/permissions/analytics/page.tsx
   import { PermissionDashboard } from '@/components/features/permissions/dashboard';

   export default function AnalyticsPage() {
     return (
       <div className="container py-6">
         <h1 className="text-3xl font-bold mb-6">Permission Analytics</h1>
         <PermissionDashboard />
       </div>
     );
   }
   ```

2. **Add Navigation Link:**
   ```tsx
   <Link href="/permissions/analytics">
     <BarChart className="mr-2 h-4 w-4" />
     Analytics
   </Link>
   ```

3. **Backend Implementation:**
   - Ensure backend endpoints return data matching TypeScript types
   - Implement activity logging system
   - Add pagination for large datasets

4. **Testing:**
   ```bash
   npm run test -- dashboard
   npm run lint
   npm run type-check
   ```

## Support

For issues or questions:

1. Check TypeScript types in `@/types/permissions/analytics.types`
2. Review API documentation in `@/store/api/analyticsApi`
3. See implementation plan: `docs/PERMISSION_IMPLEMENTATION_PLAN.md`

---

**Phase 6: Analytics & Bulk Operations** | [Implementation Plan](../../../../docs/PERMISSION_IMPLEMENTATION_PLAN.md)
