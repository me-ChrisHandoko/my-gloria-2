/**
 * AnalyticsDashboard Component
 * Phase 6: Analytics & Bulk Operations
 *
 * Main analytics dashboard container that displays permission statistics,
 * usage charts, and bulk operation actions.
 *
 * Reuses PermissionDashboard from dashboard/ for consistent UI.
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 6
 */

'use client';

import { useState } from 'react';
import { PermissionDashboard } from '../dashboard/PermissionDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Shield, Key } from 'lucide-react';
import { BulkAssignRolesDialog } from './BulkAssignRolesDialog';
import { BulkAssignPermissionsDialog } from './BulkAssignPermissionsDialog';
import { BulkRevokeRolesDialog } from './BulkRevokeRolesDialog';

// ============================================================================
// Types
// ============================================================================

export interface AnalyticsDashboardProps {
  /**
   * Optional CSS class name
   */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function AnalyticsDashboard({ className }: AnalyticsDashboardProps) {
  const [bulkAssignRolesOpen, setBulkAssignRolesOpen] = useState(false);
  const [bulkAssignPermissionsOpen, setBulkAssignPermissionsOpen] =
    useState(false);
  const [bulkRevokeRolesOpen, setBulkRevokeRolesOpen] = useState(false);

  return (
    <div className={className}>
      {/* Bulk Operations Section */}
      <section aria-label="Bulk Operations" className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Bulk Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setBulkAssignRolesOpen(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Bulk Assign Roles
              </Button>

              <Button
                onClick={() => setBulkAssignPermissionsOpen(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Key className="h-4 w-4" />
                Bulk Assign Permissions
              </Button>

              <Button
                onClick={() => setBulkRevokeRolesOpen(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Bulk Revoke Roles
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Analytics Dashboard Section */}
      <section aria-label="Analytics Dashboard">
        <PermissionDashboard />
      </section>

      {/* Bulk Operation Dialogs */}
      <BulkAssignRolesDialog
        open={bulkAssignRolesOpen}
        onOpenChange={setBulkAssignRolesOpen}
      />

      <BulkAssignPermissionsDialog
        open={bulkAssignPermissionsOpen}
        onOpenChange={setBulkAssignPermissionsOpen}
      />

      <BulkRevokeRolesDialog
        open={bulkRevokeRolesOpen}
        onOpenChange={setBulkRevokeRolesOpen}
      />
    </div>
  );
}
