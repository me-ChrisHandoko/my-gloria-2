"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Shield } from "lucide-react";
import { type Permission } from "@/lib/api/services/permissions.service";
import { useDeletePermissionMutation } from "@/store/api/permissionApi";

interface DeletePermissionModalProps {
  open: boolean;
  permission: Permission;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeletePermissionModal({
  open,
  permission,
  onClose,
  onSuccess,
}: DeletePermissionModalProps) {
  const [deletePermission, { isLoading: isDeleting }] = useDeletePermissionMutation();

  const handleDelete = async () => {
    if (permission.isSystemPermission) {
      toast.error("System permissions cannot be deleted");
      return;
    }

    try {
      await deletePermission(permission.id).unwrap();
      onSuccess();
    } catch (error: any) {
      console.error("Failed to delete permission:", error);
      const errorMessage =
        error?.data?.message || error?.error || "Failed to delete permission";
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Permission</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this permission?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {permission.isSystemPermission && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
              <Shield className="h-4 w-4 text-amber-600" />
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                This is a system permission and cannot be deleted.
              </p>
            </div>
          )}

          {!permission.isSystemPermission && (
            <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Warning: This action cannot be undone
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Deleting this permission will remove it from all roles and users.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="font-medium">Code:</span>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{permission.code}</code>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="font-medium">Name:</span>
              <span>{permission.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="font-medium">Resource:</span>
              <span>{permission.resource}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="font-medium">Action:</span>
              <span>{permission.action}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || permission.isSystemPermission}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Permission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
