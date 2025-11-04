/**
 * BulkAssignPermissionsDialog Component
 * Phase 6: Analytics & Bulk Operations
 *
 * Dialog for bulk assigning permissions to multiple roles.
 * Uses useBulkAssignPermissionsMutation for backend integration.
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
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useBulkAssignPermissionsMutation } from '@/store/api/analyticsApi';
import type { BulkAssignPermissionsDto } from '@/types/permissions/analytics.types';

// ============================================================================
// Types
// ============================================================================

export interface BulkAssignPermissionsDialogProps {
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
  roleIds: string;
  permissionIds: string;
}

// ============================================================================
// Component
// ============================================================================

export function BulkAssignPermissionsDialog({
  open,
  onOpenChange,
}: BulkAssignPermissionsDialogProps) {
  const [operationResult, setOperationResult] = useState<{
    success: boolean;
    successful: number;
    failed: number;
  } | null>(null);

  const [bulkAssignPermissions, { isLoading }] =
    useBulkAssignPermissionsMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      roleIds: '',
      permissionIds: '',
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
      const roleIds = data.roleIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      const permissionIds = data.permissionIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

      // Validate inputs
      if (roleIds.length === 0) {
        toast.error('Please enter at least one role ID');
        return;
      }

      if (permissionIds.length === 0) {
        toast.error('Please enter at least one permission ID');
        return;
      }

      // Execute bulk operation
      const dto: BulkAssignPermissionsDto = {
        roleIds,
        permissionIds,
      };

      const result = await bulkAssignPermissions(dto).unwrap();

      // Set operation result
      setOperationResult({
        success: result.success,
        successful: result.successful,
        failed: result.failed,
      });

      if (result.success) {
        toast.success(
          `Successfully assigned permissions to ${result.successful} role(s)`
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
      console.error('Bulk assign permissions error:', error);
      toast.error(
        error?.data?.message ||
          'Failed to assign permissions. Please try again.'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Assign Permissions</DialogTitle>
          <DialogDescription>
            Assign multiple permissions to multiple roles in a single operation.
            Enter comma-separated IDs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

          {/* Permission IDs Input */}
          <div className="space-y-2">
            <Label htmlFor="permissionIds">
              Permission IDs <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="permissionIds"
              {...register('permissionIds', {
                required: 'Permission IDs are required',
              })}
              placeholder="permission-id-1, permission-id-2, permission-id-3"
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
            />
            {errors.permissionIds && (
              <p className="text-sm text-destructive">
                {errors.permissionIds.message}
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
                      Successfully assigned: {operationResult.successful}
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Permissions'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
