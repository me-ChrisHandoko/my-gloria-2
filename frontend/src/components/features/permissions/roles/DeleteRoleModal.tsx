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
import { Role } from "@/lib/api/services/roles.service";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDeleteRoleMutation } from "@/store/api/rolesApi";

interface DeleteRoleModalProps {
  open: boolean;
  role: Role;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteRoleModal({
  open,
  role,
  onClose,
  onSuccess,
}: DeleteRoleModalProps) {
  const [deleteRole, { isLoading: isDeleting }] = useDeleteRoleMutation();

  const handleDelete = async () => {
    try {
      await deleteRole(role.id).unwrap();
      toast.success("Role deleted successfully");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Failed to delete role:", error);
      const errorMessage =
        error?.data?.message || error?.error || "Failed to delete role";
      toast.error(errorMessage);
    }
  };

  const userCount = role._count?.userRoles || 0;
  const permissionCount = role._count?.rolePermissions || 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Role</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this role? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {role.isSystemRole && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This is a system role. Deleting it may
                cause application functionality issues.
              </AlertDescription>
            </Alert>
          )}

          {(userCount > 0 || permissionCount > 0) && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This role is currently assigned to:
                <ul className="mt-2 ml-4 list-disc text-sm">
                  {userCount > 0 && <li>{userCount} user(s)</li>}
                  {permissionCount > 0 && <li>{permissionCount} permission(s)</li>}
                </ul>
                Deleting this role will remove these associations.
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-start gap-2">
              {role.isSystemRole && (
                <Shield className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className="font-semibold">{role.name}</h4>
                <p className="text-sm text-muted-foreground">
                  Code: <code className="text-xs bg-muted px-1 py-0.5 rounded">{role.code}</code>
                </p>
                <p className="text-sm text-muted-foreground">
                  Hierarchy Level: {role.hierarchyLevel}
                </p>
                {role.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {role.description}
                  </p>
                )}
              </div>
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
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
