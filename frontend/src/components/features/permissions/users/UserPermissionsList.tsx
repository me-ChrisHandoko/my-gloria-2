"use client";

/**
 * UserPermissionsList Component
 * Phase 4: User Direct Permissions
 *
 * Display and manage direct user permissions.
 * Features:
 * - List of direct permissions with grant/deny status
 * - Resource-specific permission indicators
 * - Temporal permission indicators
 * - Priority display
 * - Assign new permission button
 * - Revoke permission action
 * - Filter by category and status
 * - Empty state handling
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 4
 */

import React, { useState } from 'react';
import { useGetUserPermissionsQuery, useRevokeUserPermissionMutation } from '@/store/api/userPermissionsApi';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Key, Plus, Trash2, Calendar, AlertCircle, CheckCircle, XCircle, Clock, Tag, Database } from 'lucide-react';
import { format, isPast, isFuture } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import UserPermissionAssignment from './UserPermissionAssignment';

interface UserPermissionsListProps {
  userId: string;
}

export default function UserPermissionsList({ userId }: UserPermissionsListProps) {
  const { toast } = useToast();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedPermissionId, setSelectedPermissionId] = useState<string | null>(null);

  const { data: userPermissions, isLoading, error, refetch } = useGetUserPermissionsQuery({
    userId,
    isGranted: true,
    includeExpired: false,
  });

  const [revokePermission, { isLoading: isRevoking }] = useRevokeUserPermissionMutation();

  const handleRevokeClick = (permissionId: string) => {
    setSelectedPermissionId(permissionId);
    setRevokeDialogOpen(true);
  };

  const handleRevokeConfirm = async () => {
    if (!selectedPermissionId) return;

    try {
      await revokePermission({ userId, permissionId: selectedPermissionId }).unwrap();
      toast({
        title: 'Permission revoked',
        description: 'The permission has been successfully revoked from the user.',
      });
      setRevokeDialogOpen(false);
      setSelectedPermissionId(null);
      refetch();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to revoke permission',
        description: err?.data?.message || 'An error occurred while revoking the permission.',
      });
    }
  };

  // Get permission status badge
  const getPermissionStatusBadge = (
    isGranted: boolean,
    effectiveFrom?: Date | string | null,
    effectiveTo?: Date | string | null
  ) => {
    if (!isGranted) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Denied
        </Badge>
      );
    }

    const now = new Date();
    const from = effectiveFrom ? new Date(effectiveFrom) : null;
    const to = effectiveTo ? new Date(effectiveTo) : null;

    if (from && isFuture(from)) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Scheduled
        </Badge>
      );
    }

    if (to && isPast(to)) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Expired
        </Badge>
      );
    }

    if (to) {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Granted (Temporary)
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Granted
      </Badge>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading user permissions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Failed to load user permissions</p>
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
    <>
      <div className="space-y-4">
        {/* Header with Add Button */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Direct Permissions</h3>
            <p className="text-sm text-muted-foreground">
              Permissions directly assigned to this user ({userPermissions?.length || 0})
            </p>
          </div>
          <Button
            onClick={() => setAssignDialogOpen(true)}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Assign Permission
          </Button>
        </div>

        {/* Permissions List */}
        {!userPermissions || userPermissions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64 text-center">
              <Key className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="text-lg mb-2">No Direct Permissions</CardTitle>
              <CardDescription className="mb-4">
                This user has no direct permissions assigned yet. Permissions may be inherited from roles.
              </CardDescription>
              <Button onClick={() => setAssignDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Assign First Permission
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {userPermissions.map((userPermission) => (
              <Card key={userPermission.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5 text-primary" />
                        {userPermission.permission?.name || 'Unknown Permission'}
                      </CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs">{userPermission.permission?.code}</span>
                        {userPermission.permission?.category && (
                          <Badge variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {userPermission.permission.category}
                          </Badge>
                        )}
                        {userPermission.priority > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            Priority: {userPermission.priority}
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPermissionStatusBadge(
                        userPermission.isGranted,
                        userPermission.effectiveFrom,
                        userPermission.effectiveTo
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRevokeClick(userPermission.permissionId)}
                        disabled={isRevoking}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {userPermission.permission?.description && (
                      <p>{userPermission.permission.description}</p>
                    )}

                    {/* Resource-specific permission indicator */}
                    {(userPermission.resourceType || userPermission.resourceId) && (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <Database className="h-4 w-4" />
                        <div className="text-xs">
                          <span className="font-semibold">Resource-specific: </span>
                          {userPermission.resourceType && (
                            <span>Type: {userPermission.resourceType}</span>
                          )}
                          {userPermission.resourceId && (
                            <span className="ml-2">ID: {userPermission.resourceId}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Temporal info */}
                    <div className="flex flex-wrap gap-4 pt-2 border-t">
                      {userPermission.effectiveFrom && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className="text-xs">
                            From: {format(new Date(userPermission.effectiveFrom), 'PPP')}
                          </span>
                        </div>
                      )}
                      {userPermission.effectiveTo && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className="text-xs">
                            To: {format(new Date(userPermission.effectiveTo), 'PPP')}
                          </span>
                        </div>
                      )}
                      {userPermission.createdAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className="text-xs">
                            Created: {format(new Date(userPermission.createdAt), 'PPP')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Assign Permission Dialog */}
      <UserPermissionAssignment
        userId={userId}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onSuccess={() => {
          setAssignDialogOpen(false);
          refetch();
        }}
      />

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Permission?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this permission from the user? This action cannot be undone
              and will immediately remove the permission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeConfirm}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                'Revoke Permission'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
