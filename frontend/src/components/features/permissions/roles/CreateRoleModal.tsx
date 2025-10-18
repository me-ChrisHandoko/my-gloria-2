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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Shield, AlertTriangle } from "lucide-react";
import { CreateRoleDto } from "@/lib/api/services/roles.service";
import { useCreateRoleMutation } from "@/store/api/rolesApi";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreateRoleModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateRoleModal({
  open,
  onClose,
  onSuccess,
}: CreateRoleModalProps) {
  const [formData, setFormData] = useState<CreateRoleDto>({
    name: "",
    code: "",
    hierarchyLevel: 0,
    description: "",
    isSystemRole: false,
    isActive: true,
  });

  const [createRole, { isLoading: isCreating }] = useCreateRoleMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error("Role name is required");
      return;
    }

    if (!formData.code.trim()) {
      toast.error("Role code is required");
      return;
    }

    if (formData.hierarchyLevel < 0) {
      toast.error("Hierarchy level must be 0 or greater");
      return;
    }

    try {
      await createRole(formData).unwrap();
      onSuccess();
      handleReset();
      toast.success("Role created successfully");
    } catch (error: any) {
      console.error("Failed to create role:", error);
      const errorMessage =
        error?.data?.message || error?.error || "Failed to create role";

      if (errorMessage.toLowerCase().includes("already exists") ||
          errorMessage.toLowerCase().includes("unique")) {
        toast.error("Role code already exists. Please use a different code.");
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleReset = () => {
    setFormData({
      name: "",
      code: "",
      hierarchyLevel: 0,
      description: "",
      isSystemRole: false,
      isActive: true,
    });
  };

  const handleClose = () => {
    if (!isCreating) {
      handleReset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Add a new role to the permission system
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {formData.isSystemRole && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  System roles are managed by the application and may have
                  special restrictions.
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
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">
                  Role Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g., ADMIN"
                  required
                  disabled={isCreating}
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier for this role (will be converted to uppercase)
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
                disabled={isCreating}
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
                disabled={isCreating}
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
                disabled={isCreating}
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
                disabled={isCreating}
              />
            </div>
          </div>

          <DialogFooter>
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
              Create Role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
