"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Shield, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Permission } from "@/lib/api/services/permissions.service";
import { format } from "date-fns";

interface ViewPermissionModalProps {
  open: boolean;
  permission: Permission;
  onClose: () => void;
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  READ: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  UPDATE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  APPROVE: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  EXPORT: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  IMPORT: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  PRINT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  ASSIGN: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  CLOSE: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

const scopeColors: Record<string, string> = {
  OWN: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  DEPARTMENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  SCHOOL: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  ALL: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
};

export default function ViewPermissionModal({
  open,
  permission,
  onClose,
}: ViewPermissionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Permission Details
            {permission.isSystemPermission && (
              <Shield className="h-4 w-4 text-amber-500" />
            )}
          </DialogTitle>
          <DialogDescription>
            View detailed information about this permission
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Basic Information</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="font-medium text-muted-foreground">Code:</span>
                <code className="col-span-2 text-xs bg-muted px-2 py-1 rounded">
                  {permission.code}
                </code>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="font-medium text-muted-foreground">Name:</span>
                <span className="col-span-2">{permission.name}</span>
              </div>
              {permission.description && (
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="font-medium text-muted-foreground">Description:</span>
                  <span className="col-span-2">{permission.description}</span>
                </div>
              )}
            </div>
          </div>

          {/* Permission Details */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Permission Details</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm items-center">
                <span className="font-medium text-muted-foreground">Resource:</span>
                <span className="col-span-2">{permission.resource}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm items-center">
                <span className="font-medium text-muted-foreground">Action:</span>
                <div className="col-span-2">
                  <Badge className={cn(actionColors[permission.action] || 'bg-gray-100')}>
                    {permission.action}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm items-center">
                <span className="font-medium text-muted-foreground">Scope:</span>
                <div className="col-span-2">
                  {permission.scope ? (
                    <Badge className={cn(scopeColors[permission.scope] || 'bg-gray-100')}>
                      {permission.scope}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Categorization */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Categorization</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="font-medium text-muted-foreground">Group:</span>
                <span className="col-span-2">
                  {permission.group?.name || <span className="text-muted-foreground">No group</span>}
                </span>
              </div>
              {permission.group?.category && (
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="font-medium text-muted-foreground">Category:</span>
                  <span className="col-span-2">{permission.group.category}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Status</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm items-center">
                <span className="font-medium text-muted-foreground">Active:</span>
                <div className="col-span-2">
                  <Badge
                    variant={permission.isActive ? 'success' : 'secondary'}
                    className={cn(
                      permission.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : ''
                    )}
                  >
                    {permission.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm items-center">
                <span className="font-medium text-muted-foreground">System Permission:</span>
                <div className="col-span-2">
                  <Badge variant={permission.isSystemPermission ? 'default' : 'outline'}>
                    {permission.isSystemPermission ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Metadata</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created:
                </span>
                <span className="col-span-2">
                  {format(new Date(permission.createdAt), 'PPp')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Updated:
                </span>
                <span className="col-span-2">
                  {format(new Date(permission.updatedAt), 'PPp')}
                </span>
              </div>
            </div>
          </div>

          {/* Advanced (if conditions or metadata exist) */}
          {(permission.conditions || permission.metadata) && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Advanced</h3>
              <div className="space-y-3">
                {permission.conditions && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-muted-foreground">Conditions:</span>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                      {JSON.stringify(permission.conditions, null, 2)}
                    </pre>
                  </div>
                )}
                {permission.metadata && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-muted-foreground">Metadata:</span>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                      {JSON.stringify(permission.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
