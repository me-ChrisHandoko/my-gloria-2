/**
 * PermissionDashboard Component
 * Phase 6: Analytics & Bulk Operations
 *
 * Main dashboard container for permission analytics overview.
 * Displays statistics cards, usage charts, and recent activities.
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 6
 */

'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useGetPermissionUsageStatisticsQuery,
  useGetRoleUsageStatisticsQuery,
} from '@/store/api/analyticsApi';
import { StatisticsCards } from './StatisticsCards';
import { RecentActivities, type ActivityItem } from './RecentActivities';

// ============================================================================
// Constants
// ============================================================================

/**
 * Chart colors for data visualization
 */
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

const PIE_COLORS = [
  COLORS.primary,
  COLORS.info,
  COLORS.success,
  COLORS.warning,
  COLORS.purple,
  COLORS.indigo,
];

// ============================================================================
// Types
// ============================================================================

interface PermissionDashboardProps {
  /**
   * Optional activities data (will use mock data if not provided)
   */
  activities?: ActivityItem[];
  /**
   * Optional loading state for activities
   */
  activitiesLoading?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function PermissionDashboard({
  activities = [],
  activitiesLoading = false,
}: PermissionDashboardProps) {
  // Fetch analytics data
  const {
    data: permissionStats,
    isLoading: permissionLoading,
    error: permissionError,
  } = useGetPermissionUsageStatisticsQuery();

  const {
    data: roleStats,
    isLoading: roleLoading,
    error: roleError,
  } = useGetRoleUsageStatisticsQuery();

  // Prepare chart data
  const permissionCategoryData = useMemo(() => {
    if (!permissionStats?.permissionsByCategory) return [];
    return permissionStats.permissionsByCategory.slice(0, 6).map((cat) => ({
      name: cat.category,
      count: cat.permissionCount,
      usage: cat.usageCount,
    }));
  }, [permissionStats]);

  const roleHierarchyData = useMemo(() => {
    if (!roleStats?.rolesByHierarchyLevel) return [];
    return roleStats.rolesByHierarchyLevel.map((level) => ({
      name: `Level ${level.level}`,
      roles: level.roleCount,
      users: level.userCount,
    }));
  }, [roleStats]);

  const permissionTypeData = useMemo(() => {
    if (!permissionStats) return [];
    return [
      {
        name: 'System',
        value: permissionStats.systemPermissions,
      },
      {
        name: 'Custom',
        value: permissionStats.customPermissions,
      },
    ];
  }, [permissionStats]);

  const roleTypeData = useMemo(() => {
    if (!roleStats) return [];
    return [
      {
        name: 'System',
        value: roleStats.systemRoles,
      },
      {
        name: 'Custom',
        value: roleStats.customRoles,
      },
    ];
  }, [roleStats]);

  // Handle loading state
  const isLoading = permissionLoading || roleLoading;

  // Handle error state
  if (permissionError || roleError) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          <AlertDescription>
            {permissionError
              ? 'Failed to load permission statistics. '
              : ''}
            {roleError ? 'Failed to load role statistics. ' : ''}
            Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards Section */}
      <section aria-label="Statistics Overview">
        <StatisticsCards
          permissionStats={permissionStats}
          roleStats={roleStats}
          isLoading={isLoading}
        />
      </section>

      {/* Charts Section */}
      <section aria-label="Usage Charts" className="grid gap-4 md:grid-cols-2">
        {/* Permission Category Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Permission Usage by Category</CardTitle>
            <CardDescription>
              Top permission categories and their usage counts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : permissionCategoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={permissionCategoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="count"
                    name="Permissions"
                    fill={COLORS.primary}
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    dataKey="usage"
                    name="Usage Count"
                    fill={COLORS.info}
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No permission category data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role Hierarchy Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Role Distribution by Hierarchy</CardTitle>
            <CardDescription>
              Number of roles and users at each hierarchy level
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : roleHierarchyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={roleHierarchyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="roles"
                    name="Roles"
                    fill={COLORS.purple}
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    dataKey="users"
                    name="Users"
                    fill={COLORS.success}
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No role hierarchy data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permission Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Permission Type Distribution</CardTitle>
            <CardDescription>
              System vs Custom permissions breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : permissionTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={permissionTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {permissionTypeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No permission type data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Role Type Distribution</CardTitle>
            <CardDescription>System vs Custom roles breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : roleTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={roleTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {roleTypeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No role type data available
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Recent Activities Section */}
      <section aria-label="Recent Activities">
        <RecentActivities
          activities={activities}
          isLoading={activitiesLoading}
        />
      </section>
    </div>
  );
}
