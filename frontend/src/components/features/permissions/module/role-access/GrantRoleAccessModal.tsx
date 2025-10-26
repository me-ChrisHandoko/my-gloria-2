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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useGrantRoleModuleAccessMutation } from "@/store/api/roleModuleAccessApi";
import { useGetRolesQuery } from "@/store/api/rolesApi";
import { useGetModulesQuery } from "@/store/api/modulesApi";
import { GrantRoleAccessDto } from "@/lib/api/services/role-module-access.service";

interface GrantRoleAccessModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedRoleId?: string;
  preSelectedModuleId?: string;
}

export default function GrantRoleAccessModal({
  open,
  onClose,
  onSuccess,
  preSelectedRoleId,
  preSelectedModuleId,
}: GrantRoleAccessModalProps) {
  const [formData, setFormData] = useState<GrantRoleAccessDto>({
    roleId: preSelectedRoleId || "",
    moduleId: preSelectedModuleId || "",
    canRead: false,
    canWrite: false,
    canDelete: false,
    canShare: false,
    validUntil: undefined,
  });

  const [grantRoleAccess, { isLoading: isGranting }] = useGrantRoleModuleAccessMutation();

  // Fetch roles
  const {
    data: rolesData,
    isLoading: isLoadingRoles,
  } = useGetRolesQuery({
    page: 1,
    limit: 100,
    isActive: true,
  });

  // Fetch modules
  const {
    data: modulesData,
    isLoading: isLoadingModules,
  } = useGetModulesQuery({
    page: 1,
    limit: 100,
    isActive: true,
  });

  const rolesList = rolesData?.data || [];
  const modulesList = modulesData?.data || [];

  // Update form when pre-selected values change
  useEffect(() => {
    if (preSelectedRoleId) {
      setFormData((prev) => ({ ...prev, roleId: preSelectedRoleId }));
    }
  }, [preSelectedRoleId]);

  useEffect(() => {
    if (preSelectedModuleId) {
      setFormData((prev) => ({ ...prev, moduleId: preSelectedModuleId }));
    }
  }, [preSelectedModuleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.roleId) {
      toast.error("Please select a role");
      return;
    }

    if (!formData.moduleId) {
      toast.error("Please select a module");
      return;
    }

    if (!formData.canRead && !formData.canWrite && !formData.canDelete && !formData.canShare) {
      toast.error("Please select at least one permission");
      return;
    }

    try {
      // Clean up validUntil if empty
      const submitData = {
        ...formData,
        validUntil: formData.validUntil || undefined,
      };

      await grantRoleAccess(submitData).unwrap();
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Failed to grant role access:", error);
      toast.error(error?.data?.message || "Failed to grant role access");
    }
  };

  const handleClose = () => {
    setFormData({
      roleId: preSelectedRoleId || "",
      moduleId: preSelectedModuleId || "",
      canRead: false,
      canWrite: false,
      canDelete: false,
      canShare: false,
      validUntil: undefined,
    });
    onClose();
  };

  const handlePermissionChange = (permission: keyof GrantRoleAccessDto, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [permission]: checked,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Grant Role Module Access</DialogTitle>
          <DialogDescription>
            Grant module access permissions to a role. Select the role, module, and desired permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Role Selection */}
            <div className="grid gap-2">
              <Label htmlFor="roleId">Role *</Label>
              <Select
                value={formData.roleId}
                onValueChange={(value) => setFormData({ ...formData, roleId: value })}
                disabled={!!preSelectedRoleId || isLoadingRoles}
              >
                <SelectTrigger id="roleId">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {rolesList.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                      {role.description && (
                        <span className="text-xs text-gray-500 ml-2">
                          ({role.description})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Module Selection */}
            <div className="grid gap-2">
              <Label htmlFor="moduleId">Module *</Label>
              <Select
                value={formData.moduleId}
                onValueChange={(value) => setFormData({ ...formData, moduleId: value })}
                disabled={!!preSelectedModuleId || isLoadingModules}
              >
                <SelectTrigger id="moduleId">
                  <SelectValue placeholder="Select a module" />
                </SelectTrigger>
                <SelectContent>
                  {modulesList.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      <div className="flex items-center gap-2">
                        {module.icon && <span>{module.icon}</span>}
                        <span>{module.name}</span>
                        <span className="text-xs text-gray-500">({module.code})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Permissions */}
            <div className="grid gap-3">
              <Label>Permissions *</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canRead"
                    checked={formData.canRead}
                    onCheckedChange={(checked) =>
                      handlePermissionChange("canRead", checked as boolean)
                    }
                  />
                  <label
                    htmlFor="canRead"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Read - View module content and data
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canWrite"
                    checked={formData.canWrite}
                    onCheckedChange={(checked) =>
                      handlePermissionChange("canWrite", checked as boolean)
                    }
                  />
                  <label
                    htmlFor="canWrite"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Write - Create and modify module content
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canDelete"
                    checked={formData.canDelete}
                    onCheckedChange={(checked) =>
                      handlePermissionChange("canDelete", checked as boolean)
                    }
                  />
                  <label
                    htmlFor="canDelete"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Delete - Remove module content
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canShare"
                    checked={formData.canShare}
                    onCheckedChange={(checked) =>
                      handlePermissionChange("canShare", checked as boolean)
                    }
                  />
                  <label
                    htmlFor="canShare"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Share - Share module content with others
                  </label>
                </div>
              </div>
            </div>

            {/* Valid Until (Optional) */}
            <div className="grid gap-2">
              <Label htmlFor="validUntil">
                Valid Until (Optional)
              </Label>
              <Input
                id="validUntil"
                type="date"
                value={formData.validUntil || ""}
                onChange={(e) =>
                  setFormData({ ...formData, validUntil: e.target.value || undefined })
                }
                min={new Date().toISOString().split("T")[0]}
              />
              <p className="text-xs text-gray-500">
                Leave empty for permanent access
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isGranting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isGranting}>
              {isGranting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Grant Access
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
