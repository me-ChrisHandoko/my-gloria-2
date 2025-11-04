/**
 * RoleUsageChart Component
 * Phase 6: Analytics & Bulk Operations
 *
 * Visualizes role usage data with recharts including:
 * - Most/least used roles (bar chart)
 * - Role hierarchy distribution (bar chart)
 * - Role type distribution (pie chart)
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useGetRoleUsageStatisticsQuery } from '@/store/api/analyticsApi';

// ============================================================================
// Constants
// ============================================================================

const CHART_COLORS = {
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
  CHART_COLORS.primary,
  CHART_COLORS.info,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.purple,
  CHART_COLORS.indigo,
];

// ============================================================================
// Types
// ============================================================================

export interface RoleUsageChartProps {
  /**
   * Chart type to display
   */
  type?: 'most-used' | 'least-used' | 'hierarchy' | 'type-distribution';
  /**
   * Optional CSS class name
   */
  className?: string;
  /**
   * Chart height in pixels
   */
  height?: number;
}

// ============================================================================
// Component
// ============================================================================

export function RoleUsageChart({
  type = 'most-used',
  className,
  height = 300,
}: RoleUsageChartProps) {
  const {
    data: roleStats,
    isLoading,
    error,
  } = useGetRoleUsageStatisticsQuery();

  // Prepare chart data based on type
  const chartData = useMemo(() => {
    if (!roleStats) return [];

    switch (type) {
      case 'most-used':
        return roleStats.mostUsedRoles.slice(0, 10).map((role) => ({
          name: role.roleName,
          users: role.userCount,
          permissions: role.permissionCount,
        }));

      case 'least-used':
        return roleStats.leastUsedRoles.slice(0, 10).map((role) => ({
          name: role.roleName,
          users: role.userCount,
          permissions: role.permissionCount,
        }));

      case 'hierarchy':
        return roleStats.rolesByHierarchyLevel.map((level) => ({
          name: `Level ${level.level}`,
          roles: level.roleCount,
          users: level.userCount,
          percentage: level.percentage,
        }));

      case 'type-distribution':
        return [
          {
            name: 'System Roles',
            value: roleStats.systemRoles,
          },
          {
            name: 'Custom Roles',
            value: roleStats.customRoles,
          },
        ];

      default:
        return [];
    }
  }, [roleStats, type]);

  // Get chart title and description
  const { title, description } = useMemo(() => {
    switch (type) {
      case 'most-used':
        return {
          title: 'Most Used Roles',
          description: 'Top 10 roles by user count and permissions',
        };
      case 'least-used':
        return {
          title: 'Least Used Roles',
          description: 'Bottom 10 roles by user count',
        };
      case 'hierarchy':
        return {
          title: 'Role Hierarchy Distribution',
          description: 'Roles and users by hierarchy level',
        };
      case 'type-distribution':
        return {
          title: 'Role Type Distribution',
          description: 'System vs Custom roles breakdown',
        };
      default:
        return { title: '', description: '' };
    }
  }, [type]);

  // Handle error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Chart</AlertTitle>
        <AlertDescription>
          Failed to load role usage data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="w-full" style={{ height }} />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={height}>
            {type === 'type-distribution' ? (
              <PieChart>
                <Pie
                  data={chartData}
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
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend />
                {type === 'hierarchy' ? (
                  <>
                    <Bar
                      dataKey="roles"
                      name="Roles"
                      fill={CHART_COLORS.purple}
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar
                      dataKey="users"
                      name="Users"
                      fill={CHART_COLORS.success}
                      radius={[8, 8, 0, 0]}
                    />
                  </>
                ) : (
                  <>
                    <Bar
                      dataKey="users"
                      name="Users"
                      fill={CHART_COLORS.primary}
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar
                      dataKey="permissions"
                      name="Permissions"
                      fill={CHART_COLORS.info}
                      radius={[8, 8, 0, 0]}
                    />
                  </>
                )}
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div
            className="flex items-center justify-center text-sm text-muted-foreground"
            style={{ height }}
          >
            No data available for {title.toLowerCase()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
