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
import { toast } from "sonner";
import { Loader2, User, Calendar, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CreateDelegationDto,
  DelegatedPermission,
} from "@/lib/api/services/permission-delegation.service";
import { useCreateDelegationMutation } from "@/store/api/permissionDelegationApi";
import { addDays, format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface CreateDelegationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Mock data - Replace with actual API calls
const mockUsers = [
  { id: "1", name: "John Doe", nip: "123456" },
  { id: "2", name: "Jane Smith", nip: "234567" },
  { id: "3", name: "Bob Johnson", nip: "345678" },
];

const mockPermissions: DelegatedPermission[] = [
  { resource: "users", action: "READ", scope: "DEPARTMENT" },
  { resource: "users", action: "UPDATE", scope: "DEPARTMENT" },
  { resource: "departments", action: "READ", scope: "ALL" },
  { resource: "positions", action: "CREATE", scope: "SCHOOL" },
  { resource: "positions", action: "UPDATE", scope: "SCHOOL" },
];

export default function CreateDelegationModal({
  open,
  onClose,
  onSuccess,
}: CreateDelegationModalProps) {
  const [formData, setFormData] = useState<Partial<CreateDelegationDto>>({
    delegateId: undefined,
    permissions: [],
    reason: "",
    validUntil: addDays(new Date(), 30), // Default 30 days
  });

  const [createDelegation, { isLoading: isCreating }] =
    useCreateDelegationMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.delegateId) {
      toast.error("Please select a user to delegate permissions to");
      return;
    }

    if (!formData.permissions || formData.permissions.length === 0) {
      toast.error("Please select at least one permission");
      return;
    }

    if (!formData.reason?.trim()) {
      toast.error("Please provide a reason for this delegation");
      return;
    }

    if (!formData.validUntil) {
      toast.error("Please select an expiration date");
      return;
    }

    // Check if validUntil is in the future
    if (formData.validUntil <= new Date()) {
      toast.error("Expiration date must be in the future");
      return;
    }

    try {
      await createDelegation(formData as CreateDelegationDto).unwrap();
      onSuccess();
      handleReset();
      toast.success("Permission delegation created successfully");
    } catch (error: any) {
      console.error("Failed to create delegation:", error);
      const errorMessage =
        error?.data?.message || error?.error || "Failed to create delegation";
      toast.error(errorMessage);
    }
  };

  const handleReset = () => {
    setFormData({
      delegateId: undefined,
      permissions: [],
      reason: "",
      validUntil: addDays(new Date(), 30),
    });
  };

  const handleClose = () => {
    if (!isCreating) {
      handleReset();
      onClose();
    }
  };

  const togglePermission = (permission: DelegatedPermission) => {
    const permissions = formData.permissions || [];
    const exists = permissions.some(
      (p) =>
        p.resource === permission.resource &&
        p.action === permission.action &&
        p.scope === permission.scope
    );

    if (exists) {
      setFormData({
        ...formData,
        permissions: permissions.filter(
          (p) =>
            !(
              p.resource === permission.resource &&
              p.action === permission.action &&
              p.scope === permission.scope
            )
        ),
      });
    } else {
      setFormData({
        ...formData,
        permissions: [...permissions, permission],
      });
    }
  };

  const isPermissionSelected = (permission: DelegatedPermission) => {
    return (formData.permissions || []).some(
      (p) =>
        p.resource === permission.resource &&
        p.action === permission.action &&
        p.scope === permission.scope
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Permission Delegation</DialogTitle>
            <DialogDescription>
              Temporarily delegate your permissions to another user
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Delegate User Selection */}
            <div className="space-y-2">
              <Label htmlFor="delegate">
                Delegate To <span className="text-red-500">*</span>
              </Label>
              <Combobox
                options={mockUsers.map((user) => ({
                  value: user.id,
                  label: user.name,
                  searchLabel: `${user.name} ${user.nip}`,
                }))}
                value={formData.delegateId || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, delegateId: value })
                }
                placeholder="Select a user"
                searchPlaceholder="Search users..."
                emptyMessage="No users found."
                renderOption={(option, isSelected) => {
                  const user = mockUsers.find((u) => u.id === option.value);
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
                        <User className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                          <span className="font-medium truncate" title={user.name}>
                            {user.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            NIP: {user.nip}
                          </span>
                        </div>
                      </div>
                    </>
                  );
                }}
                renderTrigger={(selectedOption) => {
                  if (!selectedOption) return null;
                  const user = mockUsers.find((u) => u.id === selectedOption.value);
                  if (!user) return <span>{selectedOption.label}</span>;
                  return (
                    <div className="flex items-center gap-2 w-full min-w-0">
                      <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{user.name}</span>
                    </div>
                  );
                }}
              />
            </div>

            {/* Permissions Selection */}
            <div className="space-y-2">
              <Label>
                Permissions <span className="text-red-500">*</span>
              </Label>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {mockPermissions.map((permission, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center p-2 rounded-md cursor-pointer hover:bg-accent",
                      isPermissionSelected(permission) && "bg-accent"
                    )}
                    onClick={() => togglePermission(permission)}
                  >
                    <input
                      type="checkbox"
                      checked={isPermissionSelected(permission)}
                      onChange={() => togglePermission(permission)}
                      className="mr-3 h-4 w-4"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {permission.resource}.{permission.action}
                      </div>
                      {permission.scope && (
                        <div className="text-xs text-muted-foreground">
                          Scope: {permission.scope}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Selected: {formData.permissions?.length || 0} permission(s)
              </p>
            </div>

            {/* Valid Until Date Picker */}
            <div className="space-y-2">
              <Label htmlFor="validUntil">
                Valid Until <span className="text-red-500">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.validUntil && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {formData.validUntil ? (
                      format(formData.validUntil, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={formData.validUntil}
                    onSelect={(date) =>
                      setFormData({ ...formData, validUntil: date })
                    }
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                placeholder="Provide a reason for this delegation..."
                rows={3}
                required
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
              Create Delegation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
