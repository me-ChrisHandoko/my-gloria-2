"use client";

/**
 * UserPermissionAudit Component
 * Phase 6: Analytics & Audit
 *
 * Comprehensive audit view of user's permissions.
 * Features:
 * - Direct roles display
 * - Direct permissions display
 * - Inherited permissions from roles
 * - Effective permissions (resolved)
 * - Module accesses
 * - Statistics summary
 * - Export functionality
 * - Loading and error states
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 6
 */

import React from 'react';
import { useGetUserPermissionAuditQuery } from '@/store/api/analyticsApi';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, FileText, Shield, Key, Package, Download, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface UserPermissionAuditProps {
  userId: string;
}

export default function UserPermissionAudit({ userId }: UserPermissionAuditProps) {
  const { toast } = useToast();
  const { data: audit, isLoading, error, refetch } = useGetUserPermissionAuditQuery(userId);

  const handleExport = () => {
    if (!audit) return;

    try {
      const exportData = {
        user: {
          id: audit.userId,
          name: audit.userName,
          email: audit.userEmail,
        },
        roles: audit.directRoles,
        directPermissions: audit.directPermissions,
        inheritedPermissions: audit.inheritedPermissions,
        effectivePermissions: audit.allEffectivePermissions,
        moduleAccesses: audit.moduleAccesses,
        statistics: {
          totalRoles: audit.totalRoles,
          totalPermissions: audit.totalPermissions,
          totalModuleAccesses: audit.totalModuleAccesses,
        },
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `user-permissions-audit-${audit.userId}-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Audit exported',
        description: 'Permission audit has been exported successfully.',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: 'An error occurred while exporting the audit.',
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading permission audit...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !audit) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Failed to load audit</p>
            <p className="text-sm text-muted-foreground mt-1">
              {(error as any)?.data?.message || 'An error occurred'}
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Permission Audit</h3>
          <p className="text-sm text-muted-foreground">
            Last updated: {format(new Date(audit.lastUpdatedAt), 'PPP p')}
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Audit
        </Button>
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              Total Roles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{audit.totalRoles}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Key className="h-4 w-4 text-green-500" />
              Total Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{audit.totalPermissions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-500" />
              Module Accesses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{audit.totalModuleAccesses}</div>
          </CardContent>
        </Card>
      </div>

      {/* Direct Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Direct Roles ({audit.directRoles.length})
          </CardTitle>
          <CardDescription>Roles directly assigned to this user</CardDescription>
        </CardHeader>
        <CardContent>
          {audit.directRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No direct roles assigned</p>
          ) : (
            <div className="space-y-2">
              {audit.directRoles.map((role) => (
                <div
                  key={role.roleId}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{role.roleName}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {role.roleCode}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {role.isActive ? (
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : role.isExpired ? (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Expired
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Scheduled
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Direct Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Direct Permissions ({audit.directPermissions.length})
          </CardTitle>
          <CardDescription>Permissions directly assigned to this user</CardDescription>
        </CardHeader>
        <CardContent>
          {audit.directPermissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No direct permissions assigned</p>
          ) : (
            <div className="space-y-2">
              {audit.directPermissions.map((permission, index) => (
                <div
                  key={`${permission.permissionId}-${index}`}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{permission.permissionName}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {permission.permissionCode}
                    </div>
                  </div>
                  <Badge variant={permission.isGranted ? 'default' : 'destructive'}>
                    {permission.isGranted ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Granted
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Denied
                      </>
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inherited Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-500" />
            Inherited Permissions ({audit.inheritedPermissions.length})
          </CardTitle>
          <CardDescription>Permissions inherited from assigned roles</CardDescription>
        </CardHeader>
        <CardContent>
          {audit.inheritedPermissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No inherited permissions</p>
          ) : (
            <div className="space-y-2">
              {audit.inheritedPermissions.map((permission, index) => (
                <div
                  key={`${permission.permissionId}-${index}`}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div className="space-y-1 flex-1">
                    <div className="font-medium">{permission.permissionName}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        {permission.permissionCode}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        From: {permission.roleName}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Effective Permissions Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            All Effective Permissions ({audit.allEffectivePermissions.length})
          </CardTitle>
          <CardDescription>
            Resolved permissions after combining direct and inherited permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {audit.allEffectivePermissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No effective permissions</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {audit.allEffectivePermissions.map((permission, index) => (
                <div
                  key={`${permission.permissionId}-${index}`}
                  className="p-2 border rounded text-xs"
                >
                  <div className="font-medium truncate" title={permission.permissionName}>
                    {permission.permissionName}
                  </div>
                  <div className="text-muted-foreground font-mono truncate" title={permission.permissionCode}>
                    {permission.permissionCode}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Module Accesses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-500" />
            Module Accesses ({audit.moduleAccesses.length})
          </CardTitle>
          <CardDescription>Modules accessible by this user</CardDescription>
        </CardHeader>
        <CardContent>
          {audit.moduleAccesses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No module accesses</p>
          ) : (
            <div className="space-y-2">
              {audit.moduleAccesses.map((moduleAccess, index) => (
                <div
                  key={`${moduleAccess.moduleId}-${index}`}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{moduleAccess.moduleName}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {moduleAccess.moduleCode}
                    </div>
                  </div>
                  <Badge variant="outline">{moduleAccess.accessLevel}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
