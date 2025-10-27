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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Shield, AlertTriangle } from "lucide-react";
import { Role, UpdateRoleDto } from "@/lib/api/services/roles.service";
import { useUpdateRoleMutation } from "@/store/api/rolesApi";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EditRoleModalProps {
  open: boolean;
  role: Role;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditRoleModal({
  open,
  role,
  onClose,
  onSuccess,
}: EditRoleModalProps) {
  const [formData, setFormData] = useState<UpdateRoleDto>({
    name: role.name,
    // code is immutable - not included in update payload
    hierarchyLevel: role.hierarchyLevel,
    description: role.description || "",
    isSystemRole: role.isSystemRole,
    isActive: role.isActive,
  });

  const [updateRole, { isLoading: isUpdating }] = useUpdateRoleMutation();

  // Update form data when role changes
  useEffect(() => {
    setFormData({
      name: role.name,
      // code is immutable - not included in update payload
      hierarchyLevel: role.hierarchyLevel,
      description: role.description || "",
      isSystemRole: role.isSystemRole,
      isActive: role.isActive,
    });
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name?.trim()) {
      toast.error("Role name is required");
      return;
    }

    // Note: code validation removed - code is immutable and cannot be updated

    if (formData.hierarchyLevel !== undefined && formData.hierarchyLevel < 0) {
      toast.error("Hierarchy level must be 0 or greater");
      return;
    }

    try {
      await updateRole({ id: role.id, data: formData }).unwrap();
      onSuccess();
      toast.success("Role updated successfully");
    } catch (error: any) {
      console.error("Failed to update role:", error);
      const errorMessage =
        error?.data?.message || error?.error || "Failed to update role";

      if (errorMessage.toLowerCase().includes("already exists") ||
          errorMessage.toLowerCase().includes("unique")) {
        toast.error("Role code already exists. Please use a different code.");
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleClose = () => {
    if (!isUpdating) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role information and settings
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {role.isSystemRole && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> This is a system role. Modifying system roles
                  may affect application functionality.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Role Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Administrator"
                  required
                  disabled={isUpdating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">
                  Role Code
                </Label>
                <Input
                  id="code"
                  value={role.code}
                  placeholder="e.g., ADMIN"
                  disabled
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Role code is immutable and cannot be changed
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hierarchyLevel">
                Hierarchy Level <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hierarchyLevel"
                type="number"
                min="0"
                value={formData.hierarchyLevel}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hierarchyLevel: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="0"
                required
                disabled={isUpdating}
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers indicate higher authority (0 = highest)
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
                placeholder="Enter role description..."
                rows={3}
                disabled={isUpdating}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="isSystemRole">System Role</Label>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Mark as system-managed role
                </p>
              </div>
              <Switch
                id="isSystemRole"
                checked={formData.isSystemRole}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isSystemRole: checked })
                }
                disabled={isUpdating || role.isSystemRole}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Set role as active or inactive
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
                disabled={isUpdating}
              />
            </div>
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
              Update Role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
