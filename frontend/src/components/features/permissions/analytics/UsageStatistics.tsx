/**
 * UsageStatistics Component
 * Phase 6: Analytics & Bulk Operations
 *
 * Displays comprehensive usage statistics for permissions and roles.
 * Shows total counts, active/inactive, system/custom breakdowns.
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 6
 */

'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Shield, Key, Users, TrendingUp } from 'lucide-react';
import {
  useGetPermissionUsageStatisticsQuery,
  useGetRoleUsageStatisticsQuery,
} from '@/store/api/analyticsApi';

// ============================================================================
// Types
// ============================================================================

interface StatCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ReactNode;
  isLoading?: boolean;
}

export interface UsageStatisticsProps {
  /**
   * Optional CSS class name
   */
  className?: string;
}

// ============================================================================
// Sub-Components
// ============================================================================

function StatCard({
  title,
  value,
  description,
  icon,
  isLoading,
}: StatCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-[60px] mb-1" />
          <Skeleton className="h-3 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Component
// ============================================================================

export function UsageStatistics({ className }: UsageStatisticsProps) {
  // Fetch statistics data
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

  // Calculate derived metrics
  const permissionActivePercent = useMemo(() => {
    if (!permissionStats?.totalPermissions) return 0;
    return Math.round(
      (permissionStats.activePermissions / permissionStats.totalPermissions) *
        100
    );
  }, [permissionStats]);

  const roleActivePercent = useMemo(() => {
    if (!roleStats?.totalRoles) return 0;
    return Math.round(
      (roleStats.activeRoles / roleStats.totalRoles) * 100
    );
  }, [roleStats]);

  const isLoading = permissionLoading || roleLoading;

  // Handle error state
  if (permissionError || roleError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Statistics</AlertTitle>
        <AlertDescription>
          {permissionError ? 'Failed to load permission statistics. ' : ''}
          {roleError ? 'Failed to load role statistics. ' : ''}
          Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={className}>
      {/* Permission Statistics */}
      <section aria-label="Permission Statistics" className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Permission Statistics</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Permissions"
            value={permissionStats?.totalPermissions ?? 0}
            description={`${permissionStats?.activePermissions ?? 0} active`}
            icon={<Key className="h-4 w-4 text-muted-foreground" />}
            isLoading={isLoading}
          />

          <StatCard
            title="System Permissions"
            value={permissionStats?.systemPermissions ?? 0}
            description="Built-in permissions"
            icon={<Shield className="h-4 w-4 text-muted-foreground" />}
            isLoading={isLoading}
          />

          <StatCard
            title="Custom Permissions"
            value={permissionStats?.customPermissions ?? 0}
            description="Organization-specific"
            icon={<Key className="h-4 w-4 text-muted-foreground" />}
            isLoading={isLoading}
          />

          <StatCard
            title="Active Rate"
            value={`${permissionActivePercent}%`}
            description={`${permissionStats?.activePermissions ?? 0} of ${permissionStats?.totalPermissions ?? 0}`}
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* Role Statistics */}
      <section aria-label="Role Statistics">
        <h3 className="text-lg font-semibold mb-4">Role Statistics</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Roles"
            value={roleStats?.totalRoles ?? 0}
            description={`${roleStats?.activeRoles ?? 0} active`}
            icon={<Shield className="h-4 w-4 text-muted-foreground" />}
            isLoading={isLoading}
          />

          <StatCard
            title="System Roles"
            value={roleStats?.systemRoles ?? 0}
            description="Built-in roles"
            icon={<Shield className="h-4 w-4 text-muted-foreground" />}
            isLoading={isLoading}
          />

          <StatCard
            title="Custom Roles"
            value={roleStats?.customRoles ?? 0}
            description="Organization-specific"
            icon={<Shield className="h-4 w-4 text-muted-foreground" />}
            isLoading={isLoading}
          />

          <StatCard
            title="Roles with Users"
            value={roleStats?.rolesWithUsers ?? 0}
            description={`Avg ${roleStats?.averageUsersPerRole?.toFixed(1) ?? 0} users/role`}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* Additional Metrics */}
      <section aria-label="Additional Metrics" className="mt-6">
        <h3 className="text-lg font-semibold mb-4">Additional Metrics</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Avg Permissions/Role"
            value={roleStats?.averagePermissionsPerRole?.toFixed(1) ?? 0}
            description="Permission density"
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            isLoading={isLoading}
          />

          <StatCard
            title="Roles with Permissions"
            value={roleStats?.rolesWithPermissions ?? 0}
            description="Configured roles"
            icon={<Shield className="h-4 w-4 text-muted-foreground" />}
            isLoading={isLoading}
          />

          <StatCard
            title="Roles with Module Access"
            value={roleStats?.rolesWithModuleAccess ?? 0}
            description="Module-enabled roles"
            icon={<Shield className="h-4 w-4 text-muted-foreground" />}
            isLoading={isLoading}
          />
        </div>
      </section>
    </div>
  );
}
