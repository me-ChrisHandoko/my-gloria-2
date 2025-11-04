/**
 * BulkRevokeRolesDialog Component
 * Phase 6: Analytics & Bulk Operations
 *
 * Dialog for bulk revoking roles from multiple users.
 * Uses useBulkRevokeRolesMutation for backend integration.
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 6
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { useBulkRevokeRolesMutation } from '@/store/api/analyticsApi';
import type { BulkRevokeRolesDto } from '@/types/permissions/analytics.types';

// ============================================================================
// Types
// ============================================================================

export interface BulkRevokeRolesDialogProps {
  /**
   * Dialog open state
   */
  open: boolean;
  /**
   * Callback when dialog open state changes
   */
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  userIds: string;
  roleIds: string;
}

// ============================================================================
// Component
// ============================================================================

export function BulkRevokeRolesDialog({
  open,
  onOpenChange,
}: BulkRevokeRolesDialogProps) {
  const [operationResult, setOperationResult] = useState<{
    success: boolean;
    successful: number;
    failed: number;
  } | null>(null);

  const [bulkRevokeRoles, { isLoading }] = useBulkRevokeRolesMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      userIds: '',
      roleIds: '',
    },
  });

  const handleClose = () => {
    reset();
    setOperationResult(null);
    onOpenChange(false);
  };

  const onSubmit = async (data: FormData) => {
    try {
      // Parse comma-separated IDs
      const userIds = data.userIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      const roleIds = data.roleIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

      // Validate inputs
      if (userIds.length === 0) {
        toast.error('Please enter at least one user ID');
        return;
      }

      if (roleIds.length === 0) {
        toast.error('Please enter at least one role ID');
        return;
      }

      // Execute bulk operation
      const dto: BulkRevokeRolesDto = {
        userIds,
        roleIds,
      };

      const result = await bulkRevokeRoles(dto).unwrap();

      // Set operation result
      setOperationResult({
        success: result.success,
        successful: result.successful,
        failed: result.failed,
      });

      if (result.success) {
        toast.success(
          `Successfully revoked roles from ${result.successful} user(s)`
        );

        // Close after showing success
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        toast.error(
          `Bulk operation completed with ${result.failed} failure(s)`
        );
      }
    } catch (error: any) {
      console.error('Bulk revoke roles error:', error);
      toast.error(
        error?.data?.message || 'Failed to revoke roles. Please try again.'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Revoke Roles</DialogTitle>
          <DialogDescription>
            Revoke multiple roles from multiple users in a single operation.
            Enter comma-separated IDs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold">Warning: Destructive Operation</p>
              <p className="text-sm mt-1">
                This will remove access for all specified users. This action
                cannot be undone. Please verify the user and role IDs before
                proceeding.
              </p>
            </AlertDescription>
          </Alert>

          {/* User IDs Input */}
          <div className="space-y-2">
            <Label htmlFor="userIds">
              User IDs <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="userIds"
              {...register('userIds', {
                required: 'User IDs are required',
              })}
              placeholder="user-id-1, user-id-2, user-id-3"
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
            />
            {errors.userIds && (
              <p className="text-sm text-destructive">
                {errors.userIds.message}
              </p>
            )}
          </div>

          {/* Role IDs Input */}
          <div className="space-y-2">
            <Label htmlFor="roleIds">
              Role IDs <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="roleIds"
              {...register('roleIds', {
                required: 'Role IDs are required',
              })}
              placeholder="role-id-1, role-id-2, role-id-3"
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
            />
            {errors.roleIds && (
              <p className="text-sm text-destructive">
                {errors.roleIds.message}
              </p>
            )}
          </div>

          {/* Operation Result */}
          {operationResult && (
            <Alert
              variant={operationResult.success ? 'default' : 'destructive'}
            >
              {operationResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {operationResult.success ? (
                  <div>
                    <p className="font-semibold">Operation Completed</p>
                    <p className="text-sm mt-1">
                      Successfully revoked: {operationResult.successful}
                    </p>
                    {operationResult.failed > 0 && (
                      <p className="text-sm text-destructive">
                        Failed: {operationResult.failed}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold">Operation Failed</p>
                    <p className="text-sm mt-1">
                      Successful: {operationResult.successful}
                    </p>
                    <p className="text-sm text-destructive">
                      Failed: {operationResult.failed}
                    </p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                'Revoke Roles'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
