"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Calendar, User2, Box } from "lucide-react";
import {
  type UserModuleAccess,
} from "@/lib/api/services/module-access.service";
import { useUpdateModuleAccessMutation } from "@/store/api/moduleAccessApi";
import { format } from "date-fns";

interface EditModuleAccessModalProps {
  open: boolean;
  access: UserModuleAccess;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditModuleAccessModal({
  open,
  access,
  onClose,
  onSuccess,
}: EditModuleAccessModalProps) {
  const [formData, setFormData] = useState({
    canRead: access.permissions.canRead,
    canWrite: access.permissions.canWrite,
    canDelete: access.permissions.canDelete,
    canShare: access.permissions.canShare,
    validUntil: access.validUntil,
    reason: "",
  });

  const [validUntilDate, setValidUntilDate] = useState<string>("");

  const [updateAccess, { isLoading: isUpdating }] = useUpdateModuleAccessMutation();

  // Initialize form data when access changes
  useEffect(() => {
    if (access) {
      setFormData({
        canRead: access.permissions.canRead,
        canWrite: access.permissions.canWrite,
        canDelete: access.permissions.canDelete,
        canShare: access.permissions.canShare,
        validUntil: access.validUntil,
        reason: "",
      });

      if (access.validUntil) {
        const date = new Date(access.validUntil);
        setValidUntilDate(format(date, "yyyy-MM-dd"));
      } else {
        setValidUntilDate("");
      }
    }
  }, [access]);

  const validatePermissions = (): boolean => {
    if (!formData.canRead && !formData.canWrite && !formData.canDelete && !formData.canShare) {
      toast.error("At least one permission must be granted");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePermissions()) {
      return;
    }

    // Validate validUntil date
    if (validUntilDate) {
      const selectedDate = new Date(validUntilDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate <= today) {
        toast.error("Expiry date must be in the future");
        return;
      }
    }

    try {
      await updateAccess({
        userProfileId: access.userProfileId,
        moduleId: access.moduleId,
        data: {
          ...formData,
          validUntil: validUntilDate || undefined,
        },
      }).unwrap();

      onSuccess();
    } catch (error: any) {
      console.error("Failed to update module access:", error);
      const errorMessage =
        error?.data?.message || error?.error || "Failed to update module access";
      toast.error(errorMessage);
    }
  };

  const handleClose = () => {
    if (!isUpdating) {
      onClose();
    }
  };

  const userName = access.userProfile?.dataKaryawan?.nama || access.userProfile?.nip || "Unknown";
  const moduleName = access.module?.name || "Unknown";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Module Access</DialogTitle>
            <DialogDescription>
              Update permissions and access settings for this user
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* User Info (Read-only) */}
            <div className="space-y-2">
              <Label>User</Label>
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted">
                <User2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{userName}</div>
                  {access.userProfile?.nip && (
                    <div className="text-xs text-muted-foreground">
                      {access.userProfile.nip}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Module Info (Read-only) */}
            <div className="space-y-2">
              <Label>Module</Label>
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted">
                <Box className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">{moduleName}</div>
                  {access.module && (
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-background px-1.5 py-0.5 rounded">
                        {access.module.code}
                      </code>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-background">
                        {access.module.category}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Granted Info (Read-only) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Granted By</Label>
                <div className="text-sm p-2 border rounded-lg bg-muted">
                  {access.grantedByUser?.dataKaryawan?.nama || "System"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Granted Date</Label>
                <div className="text-sm p-2 border rounded-lg bg-muted">
                  {new Date(access.validFrom).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-3">
              <Label>
                Permissions <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="canRead" className="text-sm font-medium">
                      Can Read
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      View module content
                    </p>
                  </div>
                  <Switch
                    id="canRead"
                    checked={formData.canRead}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, canRead: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="canWrite" className="text-sm font-medium">
                      Can Write
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Modify module data
                    </p>
                  </div>
                  <Switch
                    id="canWrite"
                    checked={formData.canWrite}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, canWrite: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="canDelete" className="text-sm font-medium">
                      Can Delete
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Remove module data
                    </p>
                  </div>
                  <Switch
                    id="canDelete"
                    checked={formData.canDelete}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, canDelete: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="canShare" className="text-sm font-medium">
                      Can Share
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Share with others
                    </p>
                  </div>
                  <Switch
                    id="canShare"
                    checked={formData.canShare}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, canShare: checked })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Valid Until Date */}
            <div className="space-y-2">
              <Label htmlFor="validUntil">Access Expiry</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  id="validUntil"
                  value={validUntilDate}
                  onChange={(e) => setValidUntilDate(e.target.value)}
                  min={format(new Date(Date.now() + 86400000), "yyyy-MM-dd")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                {validUntilDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setValidUntilDate("")}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty for permanent access
              </p>
            </div>

            {/* Update Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Update Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                placeholder="Enter reason for updating access..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.reason?.length || 0}/500
              </p>
            </div>

            {/* Previous Reason (if exists) */}
            {access.reason && (
              <div className="space-y-2">
                <Label>Previous Reason</Label>
                <div className="text-sm p-3 border rounded-lg bg-muted">
                  {access.reason}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Access
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
