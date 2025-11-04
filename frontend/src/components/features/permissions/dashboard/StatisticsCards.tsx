/**
 * StatisticsCards Component
 * Phase 6: Analytics & Bulk Operations
 *
 * Displays key statistics cards for permission and role usage overview.
 * Shows totals, active/inactive breakdown, and most used items.
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 6
 */

'use client';

import { Key, Users, TrendingUp, Shield } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  PermissionUsageStatistics,
  RoleUsageStatistics,
} from '@/types/permissions/analytics.types';

// ============================================================================
// Types
// ============================================================================

interface StatisticsCardsProps {
  permissionStats?: PermissionUsageStatistics;
  roleStats?: RoleUsageStatistics;
  isLoading?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function StatisticsCards({
  permissionStats,
  roleStats,
  isLoading = false,
}: StatisticsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-[60px] mb-1" />
              <Skeleton className="h-3 w-[120px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate percentages
  const activePermissionPercentage = permissionStats
    ? Math.round(
        (permissionStats.activePermissions / permissionStats.totalPermissions) *
          100
      )
    : 0;

  const activeRolePercentage = roleStats
    ? Math.round((roleStats.activeRoles / roleStats.totalRoles) * 100)
    : 0;

  // Get most used items
  const mostUsedPermission = permissionStats?.mostUsedPermissions?.[0];
  const mostUsedRole = roleStats?.mostUsedRoles?.[0];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Permissions Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Permissions
          </CardTitle>
          <Key className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {permissionStats?.totalPermissions ?? 0}
          </div>
          <p className="text-xs text-muted-foreground">
            {permissionStats?.activePermissions ?? 0} active (
            {activePermissionPercentage}%),{' '}
            {permissionStats?.inactivePermissions ?? 0} inactive
          </p>
          {permissionStats && (
            <p className="text-xs text-muted-foreground mt-1">
              {permissionStats.systemPermissions} system,{' '}
              {permissionStats.customPermissions} custom
            </p>
          )}
        </CardContent>
      </Card>

      {/* Total Roles Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {roleStats?.totalRoles ?? 0}
          </div>
          <p className="text-xs text-muted-foreground">
            {roleStats?.activeRoles ?? 0} active ({activeRolePercentage}%),{' '}
            {roleStats?.inactiveRoles ?? 0} inactive
          </p>
          {roleStats && (
            <p className="text-xs text-muted-foreground mt-1">
              {roleStats.systemRoles} system, {roleStats.customRoles} custom
            </p>
          )}
        </CardContent>
      </Card>

      {/* Most Used Permission Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Most Used Permission
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {mostUsedPermission ? (
            <>
              <div className="text-2xl font-bold">
                {mostUsedPermission.usageCount}
              </div>
              <p className="text-xs text-muted-foreground truncate" title={mostUsedPermission.permissionName}>
                {mostUsedPermission.permissionName}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {mostUsedPermission.assignedToRoles} roles,{' '}
                {mostUsedPermission.assignedToUsers} users
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">No data available</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Most Used Role Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Most Used Role</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {mostUsedRole ? (
            <>
              <div className="text-2xl font-bold">{mostUsedRole.userCount}</div>
              <p className="text-xs text-muted-foreground truncate" title={mostUsedRole.roleName}>
                {mostUsedRole.roleName}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {mostUsedRole.permissionCount} permissions, level{' '}
                {mostUsedRole.hierarchyLevel}
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">No data available</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
