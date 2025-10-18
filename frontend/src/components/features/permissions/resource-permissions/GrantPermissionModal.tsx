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
import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Calendar as CalendarIcon, Check, User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  type GrantResourcePermissionDto,
  RESOURCE_TYPES,
} from "@/lib/api/services/resource-permissions.service";
import { useGrantResourcePermissionMutation } from "@/store/api/resourcePermissionApi";
import { useGetPermissionsQuery } from "@/store/api/permissionApi";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface GrantPermissionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // Optional pre-filled values
  initialUserId?: string;
  initialResourceType?: string;
  initialResourceId?: string;
}

export default function GrantPermissionModal({
  open,
  onClose,
  onSuccess,
  initialUserId,
  initialResourceType,
  initialResourceId,
}: GrantPermissionModalProps) {
  const [formData, setFormData] = useState<GrantResourcePermissionDto & { validUntilDate?: Date }>({
    userProfileId: initialUserId || "",
    permissionId: "",
    resourceType: initialResourceType || "",
    resourceId: initialResourceId || "",
    grantReason: "",
    validUntil: undefined,
    validUntilDate: undefined,
  });

  const [grantPermission, { isLoading: isGranting }] = useGrantResourcePermissionMutation();

  // Fetch permissions for dropdown
  const { data: permissionsData, isLoading: isLoadingPermissions } = useGetPermissionsQuery(
    { limit: 100, isActive: true },
    { skip: !open }
  );
  const permissions = permissionsData?.data || [];

  // Group permissions by resource
  const groupedPermissions = React.useMemo(() => {
    return permissions.reduce((acc, perm) => {
      const resource = perm.resource;
      if (!acc[resource]) {
        acc[resource] = [];
      }
      acc[resource].push(perm);
      return acc;
    }, {} as Record<string, typeof permissions>);
  }, [permissions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.userProfileId.trim()) {
      toast.error("Please select a user");
      return;
    }

    if (!formData.permissionId.trim()) {
      toast.error("Please select a permission");
      return;
    }

    if (!formData.resourceType.trim()) {
      toast.error("Please select a resource type");
      return;
    }

    if (!formData.resourceId.trim()) {
      toast.error("Please specify the resource ID");
      return;
    }

    // Validate expiry date if provided
    if (formData.validUntilDate) {
      if (formData.validUntilDate <= new Date()) {
        toast.error("Expiry date must be in the future");
        return;
      }
    }

    // Validate grant reason length
    if (formData.grantReason && formData.grantReason.length > 500) {
      toast.error("Grant reason must be 500 characters or less");
      return;
    }

    try {
      const submitData: GrantResourcePermissionDto = {
        userProfileId: formData.userProfileId,
        permissionId: formData.permissionId,
        resourceType: formData.resourceType,
        resourceId: formData.resourceId,
        grantReason: formData.grantReason || undefined,
        validUntil: formData.validUntilDate ? formData.validUntilDate.toISOString() : undefined,
      };

      await grantPermission(submitData).unwrap();
      onSuccess();
      handleReset();
      toast.success("Permission granted successfully");
    } catch (error: any) {
      console.error("Failed to grant permission:", error);
      const errorMessage =
        error?.data?.message || error?.error || "Failed to grant permission";
      toast.error(errorMessage);
    }
  };

  const handleReset = () => {
    setFormData({
      userProfileId: initialUserId || "",
      permissionId: "",
      resourceType: initialResourceType || "",
      resourceId: initialResourceId || "",
      grantReason: "",
      validUntil: undefined,
      validUntilDate: undefined,
    });
  };

  const handleClose = () => {
    if (!isGranting) {
      handleReset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Grant Resource Permission</DialogTitle>
            <DialogDescription>
              Grant a user specific permission on a resource
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userId">
                  User <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="userId"
                  value={formData.userProfileId}
                  onChange={(e) =>
                    setFormData({ ...formData, userProfileId: e.target.value })
                  }
                  placeholder="Enter user profile ID"
                  required
                  disabled={!!initialUserId}
                />
                <p className="text-xs text-muted-foreground">
                  User profile ID (NIP or system ID)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="permission">
                  Permission <span className="text-red-500">*</span>
                </Label>
                <Combobox
                  options={Object.entries(groupedPermissions).flatMap(
                    ([resource, perms]) =>
                      perms.map((perm) => ({
                        value: perm.id,
                        label: perm.name,
                        searchLabel: `${perm.name} ${perm.code} ${perm.action} ${resource}`,
                        group: resource,
                      }))
                  )}
                  value={formData.permissionId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, permissionId: value })
                  }
                  placeholder={
                    isLoadingPermissions
                      ? "Loading permissions..."
                      : "Select permission"
                  }
                  searchPlaceholder="Search permissions..."
                  emptyMessage="No permissions found."
                  disabled={isLoadingPermissions}
                  renderOption={(option, isSelected) => {
                    const perm = permissions.find((p) => p.id === option.value);
                    if (!perm) return null;
                    return (
                      <>
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                          <span className="font-medium truncate" title={perm.name}>
                            {perm.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {perm.action} • {perm.scope || 'N/A'}
                          </span>
                        </div>
                      </>
                    );
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="resourceType">
                  Resource Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.resourceType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, resourceType: value })
                  }
                  disabled={!!initialResourceType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select resource type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resourceId">
                  Resource ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="resourceId"
                  value={formData.resourceId}
                  onChange={(e) =>
                    setFormData({ ...formData, resourceId: e.target.value })
                  }
                  placeholder="Enter resource ID"
                  required
                  disabled={!!initialResourceId}
                />
                <p className="text-xs text-muted-foreground">
                  ID of the specific {formData.resourceType || 'resource'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="validUntil">Valid Until (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="validUntil"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.validUntilDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.validUntilDate ? (
                      format(formData.validUntilDate, "PPP")
                    ) : (
                      <span>Pick expiry date (permanent if not set)</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.validUntilDate}
                    onSelect={(date) =>
                      setFormData({ ...formData, validUntilDate: date })
                    }
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Leave empty for permanent permission
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grantReason">Grant Reason (Optional)</Label>
              <Textarea
                id="grantReason"
                value={formData.grantReason}
                onChange={(e) =>
                  setFormData({ ...formData, grantReason: e.target.value })
                }
                placeholder="Enter reason for granting this permission..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.grantReason?.length || 0} / 500
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
              Grant Permission
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
