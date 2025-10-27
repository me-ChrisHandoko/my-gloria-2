"use client";

import { useState, useEffect } from "react";
import { useUpdateUserRoleTemporalMutation } from "@/store/api/rolesApi";
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
import { toast } from "sonner";
import { Loader2, Calendar } from "lucide-react";
import type { UserRole, UpdateUserRoleTemporalDto } from "@/lib/api/services/roles.service";
import TemporalDatePicker from "./TemporalDatePicker";

interface UserRoleTemporalModalProps {
  userRole: UserRole;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserRoleTemporalModal({
  userRole,
  open,
  onClose,
  onSuccess,
}: UserRoleTemporalModalProps) {
  const [formData, setFormData] = useState<UpdateUserRoleTemporalDto>({
    validFrom: userRole.validFrom,
    validUntil: userRole.validUntil || undefined,
  });

  const [updateTemporal, { isLoading }] = useUpdateUserRoleTemporalMutation();

  // Reset form when userRole changes
  useEffect(() => {
    setFormData({
      validFrom: userRole.validFrom,
      validUntil: userRole.validUntil || undefined,
    });
  }, [userRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.validFrom) {
      toast.error("Valid From date is required");
      return;
    }

    if (formData.validUntil && formData.validFrom > formData.validUntil) {
      toast.error("Valid Until must be after Valid From");
      return;
    }

    try {
      await updateTemporal({
        userProfileId: userRole.userProfileId,
        roleId: userRole.roleId,
        data: formData,
      }).unwrap();

      toast.success("Temporal settings updated successfully");
      onSuccess();
    } catch (error: any) {
      console.error("Failed to update temporal settings:", error);
      toast.error(error?.data?.message || "Failed to update temporal settings");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Update Temporal Settings</DialogTitle>
            <DialogDescription>
              Set the validity period for this role assignment
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Valid From */}
            <div className="space-y-2">
              <Label htmlFor="validFrom">
                Valid From <span className="text-red-500">*</span>
              </Label>
              <TemporalDatePicker
                value={formData.validFrom}
                onChange={(date) =>
                  setFormData({ ...formData, validFrom: date! })
                }
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Role becomes active from this date
              </p>
            </div>

            {/* Valid Until */}
            <div className="space-y-2">
              <Label htmlFor="validUntil">Valid Until (Optional)</Label>
              <TemporalDatePicker
                value={formData.validUntil}
                onChange={(date) =>
                  setFormData({ ...formData, validUntil: date })
                }
                disabled={isLoading}
                clearable
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for permanent assignment
              </p>
            </div>

            {/* Preview */}
            <div className="bg-muted p-3 rounded-md space-y-1">
              <p className="text-sm font-medium">Assignment Period:</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formData.validFrom ? (
                  <>
                    {new Date(formData.validFrom).toLocaleDateString()}
                    {" → "}
                    {formData.validUntil
                      ? new Date(formData.validUntil).toLocaleDateString()
                      : "Permanent"}
                  </>
                ) : (
                  "Not set"
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Settings
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
