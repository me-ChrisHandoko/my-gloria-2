/**
 * Dashboard Usage Example
 * Phase 6: Analytics & Bulk Operations
 *
 * Example implementation showing how to use the PermissionDashboard component
 * in a Next.js page or parent component.
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 6
 */

'use client';

import { PermissionDashboard } from './PermissionDashboard';
import type { ActivityItem } from './RecentActivities';

// ============================================================================
// Mock Data (Replace with real data from your backend)
// ============================================================================

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'ROLE_ASSIGNED',
    user: 'John Admin',
    target: 'Manager Role',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    metadata: {
      department: 'Sales',
    },
  },
  {
    id: '2',
    type: 'PERMISSION_GRANTED',
    user: 'Jane Smith',
    target: 'users.delete',
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
  },
  {
    id: '3',
    type: 'ROLE_CREATED',
    user: 'System Admin',
    target: 'Senior Developer',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    metadata: {
      hierarchyLevel: '3',
    },
  },
  {
    id: '4',
    type: 'PERMISSION_REVOKED',
    user: 'Security Team',
    target: 'system.config.write',
    timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
  },
  {
    id: '5',
    type: 'ROLE_REVOKED',
    user: 'HR Department',
    target: 'Temporary Access Role',
    timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
  },
  {
    id: '6',
    type: 'PERMISSION_UPDATED',
    user: 'System',
    target: 'api.users.read',
    timestamp: new Date(Date.now() - 1000 * 60 * 90), // 1.5 hours ago
  },
];

// ============================================================================
// Example Component
// ============================================================================

/**
 * Example implementation of the PermissionDashboard
 *
 * Usage in a Next.js page:
 * ```tsx
 * // app/(dashboard)/permissions/analytics/page.tsx
 * import { DashboardExample } from '@/components/features/permissions/dashboard/DashboardExample';
 *
 * export default function AnalyticsPage() {
 *   return (
 *     <div className="container mx-auto py-6">
 *       <div className="mb-6">
 *         <h1 className="text-3xl font-bold tracking-tight">Permission Analytics</h1>
 *         <p className="text-muted-foreground">
 *           Overview of permission and role usage statistics
 *         </p>
 *       </div>
 *       <DashboardExample />
 *     </div>
 *   );
 * }
 * ```
 */
export function DashboardExample() {
  // In a real implementation, you would fetch activities from your backend
  // For example:
  // const { data: activities, isLoading } = useGetRecentActivitiesQuery();

  return (
    <PermissionDashboard
      activities={mockActivities}
      activitiesLoading={false}
    />
  );
}

// ============================================================================
// Alternative: Direct Usage Without Wrapper
// ============================================================================

/**
 * Direct usage example (recommended for production)
 *
 * ```tsx
 * 'use client';
 *
 * import { PermissionDashboard } from '@/components/features/permissions/dashboard';
 * import { useGetRecentActivitiesQuery } from '@/store/api/analyticsApi';
 *
 * export default function AnalyticsPage() {
 *   // Fetch real activity data from your backend
 *   const { data: activities = [], isLoading } = useGetRecentActivitiesQuery();
 *
 *   return (
 *     <div className="container mx-auto py-6">
 *       <div className="mb-6">
 *         <h1 className="text-3xl font-bold tracking-tight">
 *           Permission Analytics
 *         </h1>
 *         <p className="text-muted-foreground">
 *           Overview of permission and role usage statistics
 *         </p>
 *       </div>
 *
 *       <PermissionDashboard
 *         activities={activities}
 *         activitiesLoading={isLoading}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
