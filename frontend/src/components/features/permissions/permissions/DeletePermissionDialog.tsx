"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { useDeletePermissionMutation } from "@/store/api/permissionApi";
import type { Permission } from "@/lib/api/services/permissions.service";

interface DeletePermissionDialogProps {
  open: boolean;
  permission: Permission;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeletePermissionDialog({
  open,
  permission,
  onClose,
  onSuccess,
}: DeletePermissionDialogProps) {
  const [deletePermission, { isLoading }] = useDeletePermissionMutation();

  const isSystemPermission = permission.isSystemPermission;

  const handleDelete = async () => {
    try {
      await deletePermission(permission.id).unwrap();
      onSuccess();
    } catch (error: any) {
      console.error("Failed to delete permission:", error);
      const errorMessage =
        error?.data?.message ||
        error?.error ||
        "Failed to delete permission. It may be in use by roles or users.";
      toast.error(errorMessage);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Permission
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this permission?
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Permission Details */}
        <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
          <div>
            <div className="text-sm font-medium">Name</div>
            <div className="text-sm text-muted-foreground">{permission.name}</div>
          </div>
          <div>
            <div className="text-sm font-medium">Code</div>
            <div className="text-sm font-mono text-muted-foreground">
              {permission.code}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">Properties:</div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {permission.resource}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {permission.action}
              </Badge>
              {permission.scope && (
                <Badge variant="secondary" className="text-xs">
                  {permission.scope}
                </Badge>
              )}
              {isSystemPermission && (
                <Badge variant="outline" className="text-xs">
                  System
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Warning Messages */}
        <div className="space-y-2">
          {isSystemPermission && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-sm text-destructive">
                <strong>Warning:</strong> This is a system permission. Deleting it may
                affect core functionality.
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground rounded-lg border p-3">
            <strong>Important:</strong> This action cannot be undone. The permission
            will be permanently deleted from the system. Any roles or users currently
            assigned this permission will lose this access.
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Permission
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
