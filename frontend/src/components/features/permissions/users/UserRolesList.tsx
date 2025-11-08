"use client";

/**
 * UserRolesList Component
 * Phase 3: User Role Management
 *
 * Display and manage user's role assignments.
 * Features:
 * - List of assigned roles with hierarchy info
 * - Temporal role indicators (effectiveFrom/To)
 * - Assign new role button
 * - Revoke role action
 * - Empty state handling
 * - Loading and error states
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 3
 */

import React, { useState } from 'react';
import { useGetUserRolesQuery, useRevokeUserRoleMutation } from '@/store/api/userRolesApi';
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
import { Loader2, Shield, Plus, Trash2, Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { format, isPast, isFuture, isToday } from 'date-fns';
import { toast } from 'sonner';
import UserRoleAssignment from './UserRoleAssignment';

interface UserRolesListProps {
  userId: string;
}

export default function UserRolesList({ userId }: UserRolesListProps) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const { data: userRolesData, isLoading, error, refetch } = useGetUserRolesQuery({
    userId,
    includeExpired: false,
    includeInactive: false,
  });

  // Handle different response formats
  const userRoles = React.useMemo(() => {
    if (!userRolesData) return [];

    // If it's already an array, return it
    if (Array.isArray(userRolesData)) {
      return userRolesData;
    }

    // If it's wrapped in a data property
    if (userRolesData && typeof userRolesData === 'object' && 'data' in userRolesData) {
      const data = (userRolesData as any).data;
      return Array.isArray(data) ? data : [];
    }

    // Otherwise return empty array
    return [];
  }, [userRolesData]);

  const [revokeRole, { isLoading: isRevoking }] = useRevokeUserRoleMutation();

  const handleRevokeClick = (roleId: string) => {
    setSelectedRoleId(roleId);
    setRevokeDialogOpen(true);
  };

  const handleRevokeConfirm = async () => {
    if (!selectedRoleId) return;

    try {
      await revokeRole({ userId, roleId: selectedRoleId }).unwrap();
      toast.success('Role revoked', {
        description: 'The role has been successfully revoked from the user.',
      });
      setRevokeDialogOpen(false);
      setSelectedRoleId(null);
      refetch();
    } catch (err: any) {
      toast.error('Failed to revoke role', {
        description: err?.data?.message || 'An error occurred while revoking the role.',
      });
    }
  };

  // Check if role is currently effective
  const isRoleEffective = (effectiveFrom?: Date | string | null, effectiveTo?: Date | string | null) => {
    const now = new Date();
    const from = effectiveFrom ? new Date(effectiveFrom) : null;
    const to = effectiveTo ? new Date(effectiveTo) : null;

    if (from && isFuture(from)) return false;
    if (to && isPast(to)) return false;
    return true;
  };

  // Get role status badge
  const getRoleStatusBadge = (effectiveFrom?: Date | string | null, effectiveTo?: Date | string | null) => {
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
          Active (Temporary)
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Active
      </Badge>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading user roles...</p>
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
            <p className="font-medium text-destructive">Failed to load user roles</p>
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
            <h3 className="text-lg font-semibold">Assigned Roles</h3>
            <p className="text-sm text-muted-foreground">
              Roles assigned to this user ({userRoles?.length || 0})
            </p>
          </div>
          <Button
            onClick={() => setAssignDialogOpen(true)}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Assign Role
          </Button>
        </div>

        {/* Roles List */}
        {!userRoles || userRoles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="text-lg mb-2">No Roles Assigned</CardTitle>
              <CardDescription className="mb-4">
                This user has no roles assigned yet.
              </CardDescription>
              <Button onClick={() => setAssignDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Assign First Role
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {userRoles.map((userRole) => (
              <Card key={userRole.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        {userRole.role?.name || 'Unknown Role'}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <span className="font-mono text-xs">{userRole.role?.code}</span>
                        {userRole.role?.hierarchyLevel !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            Level {userRole.role.hierarchyLevel}
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRoleStatusBadge(userRole.effectiveFrom, userRole.effectiveTo)}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRevokeClick(userRole.roleId)}
                        disabled={isRevoking}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {userRole.role?.description && (
                      <p>{userRole.role.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 pt-2 border-t">
                      {userRole.effectiveFrom && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className="text-xs">
                            From: {format(new Date(userRole.effectiveFrom), 'PPP')}
                          </span>
                        </div>
                      )}
                      {userRole.effectiveTo && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className="text-xs">
                            To: {format(new Date(userRole.effectiveTo), 'PPP')}
                          </span>
                        </div>
                      )}
                      {userRole.assignedAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className="text-xs">
                            Assigned: {format(new Date(userRole.assignedAt), 'PPP')}
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

      {/* Assign Role Dialog */}
      <UserRoleAssignment
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
            <AlertDialogTitle>Revoke Role?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this role from the user? This action cannot be undone
              and will remove all permissions associated with this role.
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
                'Revoke Role'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
