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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { useRevokeRoleModuleAccessMutation } from "@/store/api/roleModuleAccessApi";
import { RoleModuleAccess } from "@/lib/api/services/role-module-access.service";

interface RevokeRoleAccessModalProps {
  open: boolean;
  access: RoleModuleAccess;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RevokeRoleAccessModal({
  open,
  access,
  onClose,
  onSuccess,
}: RevokeRoleAccessModalProps) {
  const [revokeRoleAccess, { isLoading: isRevoking }] = useRevokeRoleModuleAccessMutation();

  const handleRevoke = async () => {
    try {
      await revokeRoleAccess({
        roleId: access.roleId,
        moduleId: access.moduleId,
      }).unwrap();

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Failed to revoke role access:", error);
      toast.error(error?.data?.message || "Failed to revoke role access");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Revoke Role Module Access
          </DialogTitle>
          <DialogDescription>
            This action will remove all module access permissions for this role. Users with this role will no longer be able to access this module.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Role Information */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div>
              <Label>Role</Label>
              <div className="mt-1 font-medium">
                {access.role?.name || "Unknown Role"}
              </div>
              {access.role?.description && (
                <div className="text-sm text-gray-600 mt-1">
                  {access.role.description}
                </div>
              )}
            </div>

            <div>
              <Label>Module</Label>
              <div className="mt-1 flex items-center gap-2">
                {access.module?.icon && (
                  <span className="text-lg">{access.module.icon}</span>
                )}
                <div>
                  <div className="font-medium">
                    {access.module?.name || "Unknown Module"}
                  </div>
                  <div className="text-xs font-mono text-gray-500">
                    {access.module?.code}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label>Current Permissions</Label>
              <div className="mt-2 flex flex-wrap gap-1">
                {access.canRead && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Read
                  </Badge>
                )}
                {access.canWrite && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Write
                  </Badge>
                )}
                {access.canDelete && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    Delete
                  </Badge>
                )}
                {access.canShare && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    Share
                  </Badge>
                )}
              </div>
            </div>

            {access.validUntil && (
              <div>
                <Label>Valid Until</Label>
                <div className="mt-1 text-sm text-gray-600">
                  {new Date(access.validUntil).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>

          {/* Warning Message */}
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 dark:text-red-200">
                <p className="font-medium mb-1">Warning</p>
                <p>
                  Revoking access will immediately remove all permissions for users with this role. They will lose access to:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {access.canRead && <li>Viewing module content</li>}
                  {access.canWrite && <li>Creating and modifying content</li>}
                  {access.canDelete && <li>Deleting content</li>}
                  {access.canShare && <li>Sharing content with others</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isRevoking}
          >
            Cancel
          </Button>
          <Button
            type="button"
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {children}
    </div>
  );
}
