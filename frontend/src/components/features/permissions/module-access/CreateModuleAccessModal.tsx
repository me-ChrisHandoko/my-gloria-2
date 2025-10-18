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
import { Combobox } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, User2, Box, Calendar, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type GrantModuleAccessDto,
  type ModuleCategory,
} from "@/lib/api/services/module-access.service";
import {
  useGrantModuleAccessMutation,
  useGetActiveModulesQuery,
} from "@/store/api/moduleAccessApi";
import { useGetUsersQuery } from "@/store/api/userApi";
import { format } from "date-fns";

interface CreateModuleAccessModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateModuleAccessModal({
  open,
  onClose,
  onSuccess,
}: CreateModuleAccessModalProps) {
  const [formData, setFormData] = useState<GrantModuleAccessDto>({
    userProfileId: "",
    moduleId: "",
    canRead: true,
    canWrite: false,
    canDelete: false,
    canShare: false,
    validUntil: undefined,
    reason: "",
  });

  const [validUntilDate, setValidUntilDate] = useState<string>("");

  // RTK Query hooks
  const [grantAccess, { isLoading: isGranting }] = useGrantModuleAccessMutation();

  const { data: usersData, isLoading: isLoadingUsers } = useGetUsersQuery(
    { limit: 100 },
    { skip: !open }
  );
  const users = usersData?.data || [];

  const { data: modulesData, isLoading: isLoadingModules } = useGetActiveModulesQuery(
    { limit: 100 },
    { skip: !open }
  );
  const modules = modulesData?.data || [];

  // Group modules by category
  const groupedModules = React.useMemo(() => {
    const grouped: Record<ModuleCategory, typeof modules> = {} as any;

    modules.forEach((module) => {
      if (!grouped[module.category]) {
        grouped[module.category] = [];
      }
      grouped[module.category].push(module);
    });

    return grouped;
  }, [modules]);

  // Validate permissions (at least one permission must be true)
  const validatePermissions = (): boolean => {
    if (!formData.canRead && !formData.canWrite && !formData.canDelete && !formData.canShare) {
      toast.error("At least one permission must be granted");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.userProfileId) {
      toast.error("Please select a user");
      return;
    }

    if (!formData.moduleId) {
      toast.error("Please select a module");
      return;
    }

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
      await grantAccess({
        ...formData,
        validUntil: validUntilDate || undefined,
      }).unwrap();

      onSuccess();
      handleReset();
    } catch (error: any) {
      console.error("Failed to grant module access:", error);
      const errorMessage =
        error?.data?.message || error?.error || "Failed to grant module access";

      if (errorMessage.includes("already exists") || errorMessage.includes("duplicate")) {
        toast.error("This user already has access to this module");
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleReset = () => {
    setFormData({
      userProfileId: "",
      moduleId: "",
      canRead: true,
      canWrite: false,
      canDelete: false,
      canShare: false,
      validUntil: undefined,
      reason: "",
    });
    setValidUntilDate("");
  };

  const handleClose = () => {
    if (!isGranting) {
      handleReset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Grant Module Access</DialogTitle>
            <DialogDescription>
              Grant user access to a specific module with custom permissions
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* User Selection */}
            <div className="space-y-2">
              <Label htmlFor="user">
                User <span className="text-red-500">*</span>
              </Label>
              <Combobox
                options={users.map((user) => ({
                  value: user.id,
                  label: user.dataKaryawan?.nama || user.nip || user.id,
                  searchLabel: `${user.dataKaryawan?.nama || ""} ${user.nip || ""} ${user.dataKaryawan?.email || ""}`,
                }))}
                value={formData.userProfileId}
                onValueChange={(value) =>
                  setFormData({ ...formData, userProfileId: value })
                }
                placeholder={isLoadingUsers ? "Loading users..." : "Select user"}
                searchPlaceholder="Search users..."
                emptyMessage="No users found."
                disabled={isLoadingUsers}
                renderOption={(option, isSelected) => {
                  const user = users.find((u) => u.id === option.value);
                  if (!user) return null;

                  return (
                    <>
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-start gap-2 w-full min-w-0">
                        <User2 className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                          <span className="font-medium truncate" title={user.dataKaryawan?.nama}>
                            {user.dataKaryawan?.nama || user.nip}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{user.nip}</span>
                            {user.dataKaryawan?.email && (
                              <span className="text-xs text-muted-foreground truncate" title={user.dataKaryawan.email}>
                                {user.dataKaryawan.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                }}
                renderTrigger={(selectedOption) => {
                  if (!selectedOption) return null;
                  const user = users.find((u) => u.id === selectedOption.value);
                  if (!user) return <span>{selectedOption.label}</span>;

                  return (
                    <div className="flex items-center gap-2 w-full min-w-0">
                      <User2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{user.dataKaryawan?.nama || user.nip}</span>
                    </div>
                  );
                }}
              />
            </div>

            {/* Module Selection */}
            <div className="space-y-2">
              <Label htmlFor="module">
                Module <span className="text-red-500">*</span>
              </Label>
              <Combobox
                options={Object.entries(groupedModules).flatMap(([category, mods]) =>
                  mods.map((mod) => ({
                    value: mod.id,
                    label: mod.name,
                    searchLabel: `${mod.name} ${mod.code} ${category}`,
                    group: category,
                  }))
                )}
                value={formData.moduleId}
                onValueChange={(value) =>
                  setFormData({ ...formData, moduleId: value })
                }
                placeholder={isLoadingModules ? "Loading modules..." : "Select module"}
                searchPlaceholder="Search modules..."
                emptyMessage="No modules found."
                disabled={isLoadingModules}
                renderOption={(option, isSelected) => {
                  const module = modules.find((m) => m.id === option.value);
                  if (!module) return null;

                  return (
                    <>
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-start gap-2 w-full min-w-0">
                        <Box className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                          <span className="font-medium truncate" title={module.name}>
                            {module.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{module.code}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                              {module.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                }}
                renderTrigger={(selectedOption) => {
                  if (!selectedOption) return null;
                  const module = modules.find((m) => m.id === selectedOption.value);
                  if (!module) return <span>{selectedOption.label}</span>;

                  return (
                    <div className="flex items-center gap-2 w-full min-w-0">
                      <Box className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{module.name}</span>
                    </div>
                  );
                }}
              />
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
              <Label htmlFor="validUntil">
                Access Expiry (Optional)
              </Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  id="validUntil"
                  value={validUntilDate}
                  onChange={(e) => setValidUntilDate(e.target.value)}
                  min={format(new Date(Date.now() + 86400000), "yyyy-MM-dd")} // Tomorrow
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

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                placeholder="Enter reason for granting access..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.reason?.length || 0}/500
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
