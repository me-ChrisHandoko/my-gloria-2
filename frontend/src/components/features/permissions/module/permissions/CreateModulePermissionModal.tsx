"use client";

import React, { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  type CreateModulePermissionDto,
  PermissionAction,
  PermissionScope,
  modulePermissionsService,
} from "@/lib/api/services/module-permissions.service";
import { useCreateModulePermissionMutation } from "@/store/api/modulePermissionsApi";

interface CreateModulePermissionModalProps {
  open: boolean;
  moduleId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateModulePermissionModal({
  open,
  moduleId,
  onClose,
  onSuccess,
}: CreateModulePermissionModalProps) {
  const [formData, setFormData] = useState<CreateModulePermissionDto>({
    action: PermissionAction.READ,
    scope: PermissionScope.SELF,
    description: "",
  });

  const [createPermission, { isLoading: isCreating }] = useCreateModulePermissionMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const submitData: CreateModulePermissionDto = {
        action: formData.action,
        scope: formData.scope,
        description: formData.description?.trim() || undefined,
      };

      await createPermission({ moduleId, data: submitData }).unwrap();
      toast.success("Permission added successfully");
      onSuccess();
      resetForm();
    } catch (error: any) {
      console.error("Failed to create permission:", error);
      toast.error(error?.data?.message || "Failed to create permission");
    }
  };

  const resetForm = () => {
    setFormData({
      action: PermissionAction.READ,
      scope: PermissionScope.SELF,
      description: "",
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Module Permission</DialogTitle>
          <DialogDescription>
            Define a new permission action and scope for this module
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="action">
              Permission Action <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.action}
              onValueChange={(value) =>
                setFormData({ ...formData, action: value as PermissionAction })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modulePermissionsService.getAvailableActions().map((action) => (
                  <SelectItem key={action} value={action}>
                    {modulePermissionsService.formatAction(action)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              The type of action that can be performed
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scope">
              Permission Scope <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.scope}
              onValueChange={(value) =>
                setFormData({ ...formData, scope: value as PermissionScope })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modulePermissionsService.getAvailableScopes().map((scope) => (
                  <SelectItem key={scope} value={scope}>
                    {modulePermissionsService.formatScope(scope)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              The scope or reach of this permission
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe when and how this permission should be used..."
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Permission
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
