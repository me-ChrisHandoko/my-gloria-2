"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Shield, Users, Lock, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { Role } from "@/lib/api/services/roles.service";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ViewRoleModalProps {
  open: boolean;
  role: Role;
  onClose: () => void;
  onEdit?: () => void;
}

export default function ViewRoleModal({
  open,
  role,
  onClose,
  onEdit,
}: ViewRoleModalProps) {
  const userCount = role._count?.userRoles || 0;
  const permissionCount = role._count?.rolePermissions || 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {role.isSystemRole && (
              <Shield className="h-5 w-5 text-blue-500" />
            )}
            Role Details
          </DialogTitle>
          <DialogDescription>
            View complete information about this role
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Role Name</p>
                <p className="font-medium">{role.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Role Code</p>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  {role.code}
                </code>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Hierarchy Level
                </p>
                <Badge variant="outline" className="font-mono">
                  Level {role.hierarchyLevel}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <Badge
                  variant={role.isActive ? "success" : "secondary"}
                  className={cn(
                    "flex items-center gap-1 w-fit",
                    role.isActive
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                      : ""
                  )}
                >
                  {role.isActive ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {role.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>

            {role.description && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{role.description}</p>
              </div>
            )}
          </div>

          {/* System Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">System Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">System Role</p>
                <Badge variant={role.isSystemRole ? "default" : "secondary"}>
                  {role.isSystemRole ? (
                    <>
                      <Shield className="h-3 w-3 mr-1" />
                      System Role
                    </>
                  ) : (
                    "Custom Role"
                  )}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Role ID</p>
                <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                  {role.id}
                </code>
              </div>
            </div>
          </div>

          {/* Usage Statistics */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Usage Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userCount}</p>
                  <p className="text-sm text-muted-foreground">
                    User{userCount !== 1 ? "s" : ""} Assigned
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{permissionCount}</p>
                  <p className="text-sm text-muted-foreground">
                    Permission{permissionCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Timestamps</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">
                    {format(new Date(role.createdAt), "PPp")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="text-sm font-medium">
                    {format(new Date(role.updatedAt), "PPp")}
                  </p>
                </div>
              </div>
            </div>
            {role.createdBy && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Created By</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {role.createdBy}
                </code>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          {onEdit && !role.isSystemRole && (
            <Button
              type="button"
              onClick={() => {
                onEdit();
                onClose();
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Role
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
