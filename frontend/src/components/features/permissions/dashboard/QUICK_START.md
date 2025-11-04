# Quick Start Guide

Get the Permission Dashboard running in your application in 5 minutes.

## Step 1: Create Analytics Page (2 minutes)

Create a new page file:

```bash
# If using app router (Next.js 13+)
touch app/(dashboard)/permissions/analytics/page.tsx

# Or for pages router
touch pages/permissions/analytics.tsx
```

Add the following code:

```typescript
'use client'; // Add this for app router

import { PermissionDashboard } from '@/components/features/permissions/dashboard';

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Permission Analytics
        </h1>
        <p className="text-muted-foreground">
          Overview of permission and role usage statistics
        </p>
      </div>

      {/* Dashboard */}
      <PermissionDashboard />
    </div>
  );
}
```

## Step 2: Add Navigation Link (1 minute)

Add a link to your navigation menu:

```tsx
import { BarChart } from 'lucide-react';
import Link from 'next/link';

<Link
  href="/permissions/analytics"
  className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent"
>
  <BarChart className="h-4 w-4" />
  <span>Analytics</span>
</Link>
```

## Step 3: Verify Backend Endpoints (1 minute)

Ensure your backend has these endpoints running:

```
GET /api/v1/permissions/usage-statistics
GET /api/v1/permissions/roles/usage-statistics
```

Test them:

```bash
curl http://localhost:8000/api/v1/permissions/usage-statistics
curl http://localhost:8000/api/v1/permissions/roles/usage-statistics
```

## Step 4: Run Your App (1 minute)

```bash
npm run dev
```

Navigate to: `http://localhost:3000/permissions/analytics`

## Done! 🎉

You should now see:
- ✅ 4 statistics cards at the top
- ✅ 4 interactive charts in the middle
- ✅ Recent activities feed at the bottom

## Optional: Add Custom Activities

If you want to show real activities, add this to your page:

```typescript
'use client';

import { PermissionDashboard } from '@/components/features/permissions/dashboard';
import { useGetRecentActivitiesQuery } from '@/store/api/analyticsApi';

export default function AnalyticsPage() {
  // Fetch real activities from your backend
  const { data: activities = [], isLoading } = useGetRecentActivitiesQuery();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Permission Analytics</h1>
        <p className="text-muted-foreground">
          Overview of permission and role usage statistics
        </p>
      </div>

      <PermissionDashboard
        activities={activities}
        activitiesLoading={isLoading}
      />
    </div>
  );
}
```

## Troubleshooting

### Dashboard shows loading forever
**Issue:** Backend endpoints not responding

**Fix:**
1. Check backend is running: `curl http://localhost:8000/api/v1/health`
2. Check endpoint paths match your backend API
3. Check CORS is configured correctly

### Charts not displaying
**Issue:** No data or malformed data

**Fix:**
1. Check browser console for errors
2. Verify data structure matches TypeScript types
3. Check backend returns data in correct format

### Statistics cards show 0
**Issue:** Empty database or no permissions/roles

**Fix:**
1. Seed database with test data
2. Check backend query returns data
3. Verify API hook is fetching correctly

### Type errors
**Issue:** TypeScript compilation errors

**Fix:**
```bash
npm run type-check
```

If errors persist:
1. Ensure all dependencies are installed: `npm install`
2. Check `tsconfig.json` includes src directory
3. Restart TypeScript server in your IDE

## Next Steps

### 1. Customize Styling

```typescript
<PermissionDashboard className="custom-dashboard" />
```

### 2. Add Page Permissions

```typescript
import { withAuth } from '@/lib/auth';

export default withAuth(AnalyticsPage, {
  requiredPermissions: ['analytics.view'],
});
```

### 3. Add Export Functionality

```typescript
import { useExportPermissionsQuery } from '@/store/api/analyticsApi';

function ExportButton() {
  const [export] = useLazyExportPermissionsQuery();

  const handleExport = async () => {
    const result = await export({ format: 'json' });
    // Handle export
  };

  return <Button onClick={handleExport}>Export Data</Button>;
}
```

### 4. Real-time Updates (Optional)

For real-time activity updates, consider:
- WebSocket integration
- Server-Sent Events (SSE)
- Polling with `refetchInterval`

```typescript
const { data } = useGetRecentActivitiesQuery(undefined, {
  pollingInterval: 30000, // Refresh every 30 seconds
});
```

## Full Example with Everything

```typescript
'use client';

import { useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PermissionDashboard } from '@/components/features/permissions/dashboard';
import {
  useGetRecentActivitiesQuery,
  useLazyExportPermissionsQuery,
} from '@/store/api/analyticsApi';
import { toast } from '@/components/ui/use-toast';

export default function AnalyticsPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: activities = [],
    isLoading,
    refetch
  } = useGetRecentActivitiesQuery();

  const [exportData] = useLazyExportPermissionsQuery();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({ title: 'Dashboard refreshed' });
    } catch (error) {
      toast({
        title: 'Refresh failed',
        variant: 'destructive'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExport = async () => {
    try {
      const result = await exportData({ format: 'json' }).unwrap();
      const blob = new Blob([JSON.stringify(result, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${Date.now()}.json`;
      a.click();
      toast({ title: 'Export successful' });
    } catch (error) {
      toast({
        title: 'Export failed',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Permission Analytics
          </h1>
          <p className="text-muted-foreground">
            Overview of permission and role usage statistics
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Dashboard */}
      <PermissionDashboard
        activities={activities}
        activitiesLoading={isLoading}
      />
    </div>
  );
}
```

## Testing Your Implementation

### Manual Testing Checklist

```bash
# 1. Load page
✓ Page loads without errors
✓ Statistics cards display
✓ Charts render correctly
✓ Activities show (or empty state)

# 2. Responsive design
✓ Mobile view (< 768px)
✓ Tablet view (768px - 1024px)
✓ Desktop view (> 1024px)

# 3. Interactions
✓ Scroll activities feed
✓ Hover chart tooltips
✓ Click chart legends
✓ Refresh data

# 4. Error handling
✓ Backend offline shows error
✓ Empty data shows empty state
✓ Loading shows skeletons
```

### Automated Testing

```bash
# Run all tests
npm test

# Run specific tests
npm test -- dashboard

# Coverage report
npm test -- --coverage
```

## Support & Documentation

- **Full Documentation:** [README.md](./README.md)
- **Component Structure:** [COMPONENT_STRUCTURE.md](./COMPONENT_STRUCTURE.md)
- **Implementation Summary:** [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **Phase 6 Plan:** [PERMISSION_IMPLEMENTATION_PLAN.md](../../../../docs/PERMISSION_IMPLEMENTATION_PLAN.md)

---

**Need Help?** Check the troubleshooting section above or review the full documentation.

**Ready to customize?** See the advanced examples in [DashboardExample.tsx](./DashboardExample.tsx)
