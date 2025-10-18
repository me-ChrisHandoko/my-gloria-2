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
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type CreatePermissionDto,
  type PermissionAction,
  type PermissionScope,
} from "@/lib/api/services/permissions.service";
import {
  useCreatePermissionMutation,
  useGetPermissionGroupsQuery,
} from "@/store/api/permissionApi";

interface CreatePermissionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PERMISSION_ACTIONS: PermissionAction[] = [
  'CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE',
  'EXPORT', 'IMPORT', 'PRINT', 'ASSIGN', 'CLOSE'
];

const PERMISSION_SCOPES: PermissionScope[] = ['OWN', 'DEPARTMENT', 'SCHOOL', 'ALL'];

const SCOPE_DESCRIPTIONS: Record<PermissionScope, string> = {
  OWN: "User can only access their own data",
  DEPARTMENT: "User can access department-level data",
  SCHOOL: "User can access school-wide data",
  ALL: "User can access all data system-wide"
};

export default function CreatePermissionModal({
  open,
  onClose,
  onSuccess,
}: CreatePermissionModalProps) {
  const [formData, setFormData] = useState<CreatePermissionDto>({
    code: "",
    name: "",
    description: "",
    resource: "",
    action: "READ",
    scope: undefined,
    groupId: undefined,
    isSystemPermission: false,
  });

  const [createPermission, { isLoading: isCreating }] = useCreatePermissionMutation();
  const { data: permissionGroups, isLoading: isLoadingGroups } = useGetPermissionGroupsQuery(
    { includeInactive: false },
    { skip: !open }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim()) {
      toast.error("Permission code is required");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Permission name is required");
      return;
    }

    if (!formData.resource.trim()) {
      toast.error("Resource is required");
      return;
    }

    try {
      await createPermission(formData).unwrap();
      onSuccess();
      handleReset();
    } catch (error: any) {
      console.error("Failed to create permission:", error);
      const errorMessage =
        error?.data?.message || error?.error || "Failed to create permission";
      
      if (errorMessage.includes("already exists") || errorMessage.includes("unique")) {
        toast.error("Permission with this code or resource/action/scope combination already exists");
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleReset = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      resource: "",
      action: "READ",
      scope: undefined,
      groupId: undefined,
      isSystemPermission: false,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Permission</DialogTitle>
            <DialogDescription>
              Add a new permission to the system
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">
                  Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g., USERS_CREATE"
                  maxLength={100}
                  required
                />
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
                <Label htmlFor="resource">
                  Resource <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="resource"
                  value={formData.resource}
                  onChange={(e) =>
                    setFormData({ ...formData, resource: e.target.value })
                  }
                  placeholder="e.g., users, schools, departments"
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="action">
                  Action <span className="text-red-500">*</span>
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
                    {PERMISSION_ACTIONS.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                value={formData.description}
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
                <Label htmlFor="isSystemPermission">System Permission</Label>
                <p className="text-sm text-muted-foreground">
                  Mark as system-level permission (restricted modification)
                </p>
              </div>
              <Switch
                id="isSystemPermission"
                checked={formData.isSystemPermission}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isSystemPermission: checked })
                }
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
              Create Permission
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
