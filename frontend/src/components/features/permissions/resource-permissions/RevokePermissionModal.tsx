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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { type ResourcePermission } from "@/lib/api/services/resource-permissions.service";
import { useRevokeResourcePermissionMutation } from "@/store/api/resourcePermissionApi";
import { isPast } from "date-fns";

interface RevokePermissionModalProps {
  open: boolean;
  permission: ResourcePermission;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RevokePermissionModal({
  open,
  permission,
  onClose,
  onSuccess,
}: RevokePermissionModalProps) {
  const [revokePermission, { isLoading }] = useRevokeResourcePermissionMutation();

  const isActive = !permission.validUntil || !isPast(new Date(permission.validUntil));

  const handleRevoke = async () => {
    try {
      await revokePermission({
        userProfileId: permission.userProfileId,
        permissionId: permission.permissionId,
        resourceType: permission.resourceType,
        resourceId: permission.resourceId,
      }).unwrap();
      onSuccess();
      toast.success("Permission revoked successfully");
    } catch (error: any) {
      console.error("Failed to revoke permission:", error);
      const errorMessage =
        error?.data?.message ||
        error?.error ||
        "Failed to revoke permission";
      toast.error(errorMessage);
    }
  };

  const userName = permission.userProfile?.dataKaryawan?.nama || permission.userProfile?.nip || "Unknown User";
  const permissionName = permission.permission?.name || "Unknown Permission";

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke Permission</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to revoke <strong>{permissionName}</strong> permission
            for <strong>{userName}</strong> on resource{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">
              {permission.resourceType}/{permission.resourceId}
            </code>?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          {isActive ? (
            <div className="text-amber-600 dark:text-amber-500 text-sm">
              ⚠️ This will immediately revoke access to the specified resource.
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">
              ℹ️ Note: This permission has already expired.
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            This action cannot be undone. The user will lose access immediately.
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRevoke}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Revoke Permission
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
