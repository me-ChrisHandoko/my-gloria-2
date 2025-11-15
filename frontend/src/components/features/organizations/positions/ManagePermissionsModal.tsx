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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useGetPositionPermissionsQuery,
  useUpdatePositionPermissionsMutation,
} from "@/store/api/positionApi";
import { Position } from "@/lib/api/services/positions.service";
import { Shield, Search, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logRTKError } from "@/lib/utils/errorLogger";

interface ManagePermissionsModalProps {
  open: boolean;
  position: Position;
  onClose: () => void;
}

// Available permissions - this should ideally come from backend
const AVAILABLE_PERMISSIONS = [
  // User Management
  { id: "users.view", name: "View Users", category: "User Management" },
  { id: "users.create", name: "Create Users", category: "User Management" },
  { id: "users.edit", name: "Edit Users", category: "User Management" },
  { id: "users.delete", name: "Delete Users", category: "User Management" },

  // Position Management
  { id: "positions.view", name: "View Positions", category: "Position Management" },
  { id: "positions.create", name: "Create Positions", category: "Position Management" },
  { id: "positions.edit", name: "Edit Positions", category: "Position Management" },
  { id: "positions.delete", name: "Delete Positions", category: "Position Management" },

  // Department Management
  { id: "departments.view", name: "View Departments", category: "Department Management" },
  { id: "departments.create", name: "Create Departments", category: "Department Management" },
  { id: "departments.edit", name: "Edit Departments", category: "Department Management" },
  { id: "departments.delete", name: "Delete Departments", category: "Department Management" },

  // Organization Management
  { id: "organizations.view", name: "View Organizations", category: "Organization Management" },
  { id: "organizations.create", name: "Create Organizations", category: "Organization Management" },
  { id: "organizations.edit", name: "Edit Organizations", category: "Organization Management" },
  { id: "organizations.delete", name: "Delete Organizations", category: "Organization Management" },

  // Reports
  { id: "reports.view", name: "View Reports", category: "Reports" },
  { id: "reports.export", name: "Export Reports", category: "Reports" },

  // Settings
  { id: "settings.view", name: "View Settings", category: "Settings" },
  { id: "settings.edit", name: "Edit Settings", category: "Settings" },
];

export default function ManagePermissionsModal({
  open,
  position,
  onClose,
}: ManagePermissionsModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Fetch current permissions
  const { data: currentPermissions, isLoading } = useGetPositionPermissionsQuery(
    position.id,
    {
      skip: !open,
    }
  );

  // Update permissions mutation
  const [updatePermissions, { isLoading: isUpdating }] =
    useUpdatePositionPermissionsMutation();

  // Initialize selected permissions
  useEffect(() => {
    if (currentPermissions) {
      setSelectedPermissions(currentPermissions);
    }
  }, [currentPermissions]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setSearchTerm("");
    }
  }, [open]);

  // Filter permissions by search
  const filteredPermissions = AVAILABLE_PERMISSIONS.filter(
    (perm) =>
      perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      perm.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group permissions by category
  const groupedPermissions = filteredPermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

  const handleTogglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSelectAll = () => {
    setSelectedPermissions(AVAILABLE_PERMISSIONS.map((p) => p.id));
  };

  const handleDeselectAll = () => {
    setSelectedPermissions([]);
  };

  const handleSave = async () => {
    try {
      await updatePermissions({
        id: position.id,
        permissions: selectedPermissions,
      }).unwrap();

      toast.success("Permissions updated successfully");
      onClose();
    } catch (error: any) {
      logRTKError("Failed to update permissions", error);
      toast.error(error?.data?.message || "Failed to update permissions");
    }
  };

  const hasChanges =
    JSON.stringify([...selectedPermissions].sort()) !==
    JSON.stringify([...(currentPermissions || [])].sort());

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manage Permissions
          </DialogTitle>
          <DialogDescription>
            Configure permissions for <strong>{position.name}</strong> ({position.code})
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search permissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={isLoading}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                disabled={isLoading}
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* Selected Count */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {selectedPermissions.length} of {AVAILABLE_PERMISSIONS.length} permissions selected
            </span>
          </div>

          {/* Permissions List */}
          <ScrollArea className="flex-1 h-[400px] pr-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([category, permissions]) => (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{category}</Badge>
                      <div className="text-xs text-muted-foreground">
                        {permissions.filter((p) => selectedPermissions.includes(p.id)).length} /{" "}
                        {permissions.length}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {permissions.map((permission) => (
                        <div
                          key={permission.id}
                          className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                        >
                          <Checkbox
                            id={permission.id}
                            checked={selectedPermissions.includes(permission.id)}
                            onCheckedChange={() => handleTogglePermission(permission.id)}
                          />
                          <Label
                            htmlFor={permission.id}
                            className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {permission.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isUpdating || !hasChanges}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
