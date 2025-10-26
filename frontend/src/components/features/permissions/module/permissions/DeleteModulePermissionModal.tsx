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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  type ModulePermission,
  modulePermissionsService,
} from "@/lib/api/services/module-permissions.service";
import { useDeleteModulePermissionMutation } from "@/store/api/modulePermissionsApi";

interface DeleteModulePermissionModalProps {
  open: boolean;
  moduleId: string;
  permission: ModulePermission;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteModulePermissionModal({
  open,
  moduleId,
  permission,
  onClose,
  onSuccess,
}: DeleteModulePermissionModalProps) {
  const [deletePermission, { isLoading: isDeleting }] = useDeleteModulePermissionMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await deletePermission({
        moduleId,
        permissionId: permission.id,
      }).unwrap();
      toast.success("Permission removed successfully");
      onSuccess();
    } catch (error: any) {
      console.error("Failed to delete permission:", error);
      toast.error(error?.data?.message || "Failed to delete permission");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Permission
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to remove this permission from the module?
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You are about to delete the following permission:
              <div className="mt-2 space-y-1">
                <div><strong>Action:</strong> {modulePermissionsService.formatAction(permission.action)}</div>
                <div><strong>Scope:</strong> {modulePermissionsService.formatScope(permission.scope)}</div>
                {permission.description && (
                  <div><strong>Description:</strong> {permission.description}</div>
                )}
              </div>
            </AlertDescription>
          </Alert>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>Warning:</strong> Removing this permission may affect users or roles
              that have been granted access based on this permission configuration.
            </AlertDescription>
          </Alert>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Permission
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
