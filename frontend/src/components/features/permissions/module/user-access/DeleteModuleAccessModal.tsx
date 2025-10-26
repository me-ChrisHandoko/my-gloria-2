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
import { Loader2, AlertTriangle, User2, Box } from "lucide-react";
import { type UserModuleAccess } from "@/lib/api/services/module-access.service";
import { useRevokeModuleAccessMutation } from "@/store/api/moduleAccessApi";

interface DeleteModuleAccessModalProps {
  open: boolean;
  access: UserModuleAccess;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteModuleAccessModal({
  open,
  access,
  onClose,
  onSuccess,
}: DeleteModuleAccessModalProps) {
  const [revokeAccess, { isLoading: isRevoking }] = useRevokeModuleAccessMutation();

  const handleRevoke = async () => {
    try {
      await revokeAccess({
        userProfileId: access.userProfileId,
        moduleId: access.moduleId,
      }).unwrap();

      onSuccess();
    } catch (error: any) {
      console.error("Failed to revoke module access:", error);
      const errorMessage =
        error?.data?.message || error?.error || "Failed to revoke module access";
      toast.error(errorMessage);
    }
  };

  const handleClose = () => {
    if (!isRevoking) {
      onClose();
    }
  };

  const userName = access.userProfile?.dataKaryawan?.nama || access.userProfile?.nip || "Unknown";
  const moduleName = access.module?.name || "Unknown";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Revoke Module Access
          </DialogTitle>
          <DialogDescription>
            This action will immediately revoke the user's access to this module.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User and Module Info */}
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 border rounded-lg">
              <User2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">User</div>
                <div className="font-medium">{userName}</div>
                {access.userProfile?.nip && (
                  <div className="text-xs text-muted-foreground">{access.userProfile.nip}</div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 border rounded-lg">
              <Box className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">Module</div>
                <div className="font-medium">{moduleName}</div>
                {access.module?.code && (
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {access.module.code}
                  </code>
                )}
              </div>
            </div>
          </div>

          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> The user will immediately lose all access to this module,
              including:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Read access to view module content</li>
                <li>Write access to modify data</li>
                <li>Delete access to remove content</li>
                <li>Share access to grant permissions to others</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Confirmation Message */}
          <div className="p-3 border rounded-lg bg-muted">
            <p className="text-sm">
              Are you sure you want to revoke <strong>{moduleName}</strong> access for{" "}
              <strong>{userName}</strong>?
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isRevoking}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRevoke}
            disabled={isRevoking}
          >
            {isRevoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Revoke Access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
