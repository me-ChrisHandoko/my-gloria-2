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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Check, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type Permission,
  type UpdatePermissionDto,
  type PermissionScope,
} from "@/lib/api/services/permissions.service";
import {
  useUpdatePermissionMutation,
  useGetPermissionGroupsQuery,
} from "@/store/api/permissionApi";

interface EditPermissionModalProps {
  open: boolean;
  permission: Permission;
  onClose: () => void;
  onSuccess: () => void;
}

const PERMISSION_SCOPES: PermissionScope[] = ['OWN', 'DEPARTMENT', 'SCHOOL', 'ALL'];

const SCOPE_DESCRIPTIONS: Record<PermissionScope, string> = {
  OWN: "User can only access their own data",
  DEPARTMENT: "User can access department-level data",
  SCHOOL: "User can access school-wide data",
  ALL: "User can access all data system-wide"
};

export default function EditPermissionModal({
  open,
  permission,
  onClose,
  onSuccess,
}: EditPermissionModalProps) {
  const [formData, setFormData] = useState<UpdatePermissionDto>({
    name: permission.name,
    description: permission.description,
    scope: permission.scope,
    groupId: permission.groupId,
    isActive: permission.isActive,
  });

  const [updatePermission, { isLoading: isUpdating }] = useUpdatePermissionMutation();
  const { data: permissionGroups, isLoading: isLoadingGroups } = useGetPermissionGroupsQuery(
    { includeInactive: false },
    { skip: !open }
  );

  useEffect(() => {
    if (open) {
      setFormData({
        name: permission.name,
        description: permission.description,
        scope: permission.scope,
        groupId: permission.groupId,
        isActive: permission.isActive,
      });
    }
  }, [open, permission]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      toast.error("Permission name is required");
      return;
    }

    try {
      await updatePermission({ id: permission.id, data: formData }).unwrap();
      onSuccess();
    } catch (error: any) {
      console.error("Failed to update permission:", error);
      const errorMessage =
        error?.data?.message || error?.error || "Failed to update permission";
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Permission</DialogTitle>
            <DialogDescription>
              Update permission details
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {permission.isSystemPermission && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                <Shield className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  This is a system permission. Some fields cannot be modified.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={permission.code}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Code cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resource">Resource</Label>
                <Input
                  id="resource"
                  value={permission.resource}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Resource cannot be changed</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="action">Action</Label>
                <Input
                  id="action"
                  value={permission.action}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Action cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Create Users"
                  maxLength={255}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scope">Scope (Optional)</Label>
                <Select
                  value={formData.scope || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      scope: value === "none" ? undefined : (value as PermissionScope),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground italic">None</span>
                    </SelectItem>
                    {PERMISSION_SCOPES.map((scope) => (
                      <SelectItem key={scope} value={scope}>
                        {scope}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.scope && (
                  <p className="text-xs text-muted-foreground">
                    {SCOPE_DESCRIPTIONS[formData.scope]}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="group">Permission Group (Optional)</Label>
                <Combobox
                  options={[
                    { value: "none", label: "None", searchLabel: "none" },
                    ...(permissionGroups || []).map((group) => ({
                      value: group.id,
                      label: group.name,
                      searchLabel: `${group.name} ${group.code}`,
                    })),
                  ]}
                  value={formData.groupId || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      groupId: value === "none" ? undefined : value,
                    })
                  }
                  placeholder={
                    isLoadingGroups ? "Loading groups..." : "Select a group"
                  }
                  searchPlaceholder="Search groups..."
                  emptyMessage="No groups found."
                  disabled={isLoadingGroups}
                  renderOption={(option, isSelected) => {
                    if (option.value === "none") {
                      return (
                        <>
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="text-muted-foreground italic">None</span>
                        </>
                      );
                    }
                    return (
                      <>
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span>{option.label}</span>
                      </>
                    );
                  }}
                  renderTrigger={(selectedOption) => {
                    if (!selectedOption || selectedOption.value === "none") {
                      return <span className="text-muted-foreground italic">None</span>;
                    }
                    return <span>{selectedOption.label}</span>;
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter permission description..."
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Set permission as active or inactive
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Permission
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
