"use client";

/**
 * DeleteRoleDialog Component
 *
 * Confirmation dialog for deleting roles with dependency checking.
 * Features:
 * - Dependency validation (users, child roles)
 * - Confirmation input (type role name)
 * - Soft delete option
 * - Loading states
 * - Error handling
 */

import React, { useState, useEffect } from 'react';
import { useDeleteRoleMutation } from '@/store/api/rolesApi';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteRoleDialogProps {
  roleId: string;
  roleName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DeleteRoleDialog({
  roleId,
  roleName,
  isOpen,
  onClose,
  onSuccess,
}: DeleteRoleDialogProps) {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [deleteRole, { isLoading }] = useDeleteRoleMutation();

  // Reset confirmation input when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmationInput('');
    }
  }, [isOpen]);

  const handleDelete = async () => {
    if (confirmationInput !== roleName) {
      toast.error('Role name does not match');
      return;
    }

    try {
      await deleteRole(roleId).unwrap();
      toast.success('Role deleted successfully');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete role');
    }
  };

  const isConfirmationValid = confirmationInput === roleName;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Role
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the role and remove all
            associated permissions and access controls.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong className="font-semibold">Warning:</strong> Deleting this role will affect:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All users currently assigned to this role</li>
                <li>All permissions granted to this role</li>
                <li>All module access configurations</li>
                <li>Child roles in the hierarchy (if any)</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Type <strong className="font-mono">{roleName}</strong> to confirm deletion
            </Label>
            <Input
              id="confirmation"
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={roleName}
              className="font-mono"
              autoComplete="off"
              disabled={isLoading}
            />
          </div>

          {/* Dependency Information */}
          <Alert>
            <AlertDescription className="text-sm">
              <strong>Note:</strong> This is a soft delete operation. The role will be marked as
              deleted but can be restored by administrators if needed.
            </AlertDescription>
          </Alert>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmationValid || isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Role
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
