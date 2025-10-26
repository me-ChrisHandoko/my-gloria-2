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
import { Separator } from "@/components/ui/separator";
import { Edit, Trash2 } from "lucide-react";
import { type Module, ModuleCategory } from "@/lib/api/services/modules.service";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

interface ViewModuleModalProps {
  open: boolean;
  module: Module;
  onClose: () => void;
  onEdit: (module: Module) => void;
  onDelete: (module: Module) => void;
}

const getCategoryBadgeColor = (category: ModuleCategory) => {
  const colors = {
    SERVICE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    PERFORMANCE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    QUALITY: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    FEEDBACK: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    TRAINING: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    SYSTEM: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  };
  return colors[category] || colors.SYSTEM;
};

export default function ViewModuleModal({
  open,
  module,
  onClose,
  onEdit,
  onDelete,
}: ViewModuleModalProps) {
  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex flex-col space-y-1">
      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-900 dark:text-gray-100">{value || "-"}</dd>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {module.icon && <span className="text-2xl">{module.icon}</span>}
            Module Details
          </DialogTitle>
          <DialogDescription>
            View complete information for {module.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
            <dl className="grid grid-cols-2 gap-4">
              <InfoRow label="Module Code" value={
                <span className="font-mono font-medium">{module.code}</span>
              } />
              <InfoRow label="Module Name" value={module.name} />
              <InfoRow label="Category" value={
                <Badge className={cn('font-medium', getCategoryBadgeColor(module.category))}>
                  {module.category}
                </Badge>
              } />
              <InfoRow label="Sort Order" value={module.sortOrder} />
            </dl>
          </div>

          <Separator />

          {/* Description */}
          {module.description && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {module.description}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Configuration */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Configuration</h3>
            <dl className="grid grid-cols-2 gap-4">
              <InfoRow label="Icon" value={
                module.icon ? (
                  <span className="flex items-center gap-2">
                    <span className="text-2xl">{module.icon}</span>
                    <span className="text-xs text-gray-500">{module.icon}</span>
                  </span>
                ) : "-"
              } />
              <InfoRow label="Path" value={
                module.path ? (
                  <span className="font-mono text-xs">{module.path}</span>
                ) : "-"
              } />
              <InfoRow label="Parent Module" value={
                module.parentId || "None (Root Level)"
              } />
            </dl>
          </div>

          <Separator />

          {/* Status */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Status</h3>
            <dl className="grid grid-cols-2 gap-4">
              <InfoRow label="Active Status" value={
                <Badge
                  variant={module.isActive ? 'default' : 'secondary'}
                  className={cn(
                    module.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                  )}
                >
                  {module.isActive ? 'Active' : 'Inactive'}
                </Badge>
              } />
              <InfoRow label="Visibility" value={
                <Badge
                  variant={module.isVisible ? 'default' : 'secondary'}
                  className={cn(
                    module.isVisible
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                  )}
                >
                  {module.isVisible ? 'Visible' : 'Hidden'}
                </Badge>
              } />
            </dl>
          </div>

          <Separator />

          {/* Metadata */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Metadata</h3>
            <dl className="grid grid-cols-2 gap-4">
              <InfoRow label="Version" value={module.version} />
              <InfoRow label="Module ID" value={
                <span className="font-mono text-xs text-gray-500">{module.id}</span>
              } />
              <InfoRow label="Created At" value={
                <span className="text-xs">
                  {format(new Date(module.createdAt), 'PPpp')}
                  <br />
                  <span className="text-gray-500">
                    ({formatDistanceToNow(new Date(module.createdAt), { addSuffix: true })})
                  </span>
                </span>
              } />
              <InfoRow label="Last Updated" value={
                <span className="text-xs">
                  {format(new Date(module.updatedAt), 'PPpp')}
                  <br />
                  <span className="text-gray-500">
                    ({formatDistanceToNow(new Date(module.updatedAt), { addSuffix: true })})
                  </span>
                </span>
              } />
              {module.createdBy && (
                <InfoRow label="Created By" value={module.createdBy} />
              )}
              {module.updatedBy && (
                <InfoRow label="Updated By" value={module.updatedBy} />
              )}
            </dl>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="default"
            onClick={() => {
              onClose();
              onEdit(module);
            }}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onClose();
              onDelete(module);
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
