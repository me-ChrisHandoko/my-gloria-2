/**
 * Analytics Components Barrel Export
 * Phase 6: Analytics & Bulk Operations
 *
 * Centralized exports for all analytics and bulk operation components.
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 6
 */

// Main Dashboard
export { AnalyticsDashboard } from './AnalyticsDashboard';
export type { AnalyticsDashboardProps } from './AnalyticsDashboard';

// Statistics Components
export { UsageStatistics } from './UsageStatistics';
export type { UsageStatisticsProps } from './UsageStatistics';

// Chart Components
export { RoleUsageChart } from './RoleUsageChart';
export type { RoleUsageChartProps } from './RoleUsageChart';

export { PermissionUsageChart } from './PermissionUsageChart';
export type { PermissionUsageChartProps } from './PermissionUsageChart';

// Bulk Operation Dialogs
export { BulkAssignRolesDialog } from './BulkAssignRolesDialog';
export type { BulkAssignRolesDialogProps } from './BulkAssignRolesDialog';

export { BulkAssignPermissionsDialog } from './BulkAssignPermissionsDialog';
export type { BulkAssignPermissionsDialogProps } from './BulkAssignPermissionsDialog';

export { BulkRevokeRolesDialog } from './BulkRevokeRolesDialog';
export type { BulkRevokeRolesDialogProps } from './BulkRevokeRolesDialog';
